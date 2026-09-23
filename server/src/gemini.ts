/**
 * Gemini, for the nights that have to be free.
 *
 * Google's free tier gives a few hundred requests a day on a key you can make
 * without a card. A night is one plan, a segment every few minutes and one
 * reflection — so a couple of nights a day fits inside it comfortably, and the
 * bill is nothing. That is the whole reason this adapter exists beside the
 * Anthropic one: it costs nothing to write a night, and nothing is a price
 * the app can offer everybody.
 *
 * The REST endpoint is used directly rather than the SDK. It is three calls,
 * the SDK is another dependency to keep current, and streaming over SSE is
 * the same work either way.
 *
 * https://ai.google.dev/gemini-api/docs/pricing — check the current free-tier
 * limits there before promising anybody a number.
 */

import type {
  NarrateRequest,
  PlanRequest,
  Reflection,
  ReflectRequest,
  SessionPlan,
} from './contracts.js'
import {
  buildNarrateSystem,
  buildNarrateUser,
  buildPlanSystem,
  buildPlanUser,
  buildReflectSystem,
  buildReflectUser,
} from './prompt.js'
import { RefusedError, shapePlan, shapeReflection } from './shape.js'

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Flash is the one with a free tier worth having. The others are available on
 * the same key for anyone who would rather pay for a better writer.
 */
export const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

export function hasCredentials(): boolean {
  return Boolean(process.env.GEMINI_API_KEY)
}

interface Body {
  systemInstruction: { parts: { text: string }[] }
  contents: { role: 'user'; parts: { text: string }[] }[]
  generationConfig: Record<string, unknown>
}

function body(system: string, user: string, config: Record<string, unknown>): Body {
  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: config,
  }
}

/**
 * A finish reason that is not `STOP` usually means the model stopped itself.
 * The app treats that the same way it treats Anthropic's refusal: it falls
 * back to writing the night on the device rather than showing an error.
 */
function guard(candidate: Record<string, unknown> | undefined, feedback: unknown): void {
  const blocked = (feedback as { blockReason?: string } | undefined)?.blockReason
  if (blocked) throw new RefusedError(blocked)

  const reason = candidate?.finishReason
  if (typeof reason === 'string' && reason !== 'STOP' && reason !== 'MAX_TOKENS') {
    throw new RefusedError(reason)
  }
}

async function call(path: string, payload: Body): Promise<Record<string, unknown>> {
  const response = await fetch(`${ENDPOINT}/${MODEL}:${path}`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY as string,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    // 429 here is the free tier's daily quota, and it is the most likely
    // failure of all — the caller falls back rather than showing an error.
    throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`)
  }
  return (await response.json()) as Record<string, unknown>
}

function textOf(payload: Record<string, unknown>): string {
  const candidates = payload.candidates as Record<string, unknown>[] | undefined
  const first = candidates?.[0]
  guard(first, payload.promptFeedback)

  const content = first?.content as { parts?: { text?: string }[] } | undefined
  return (content?.parts ?? []).map((part) => part.text ?? '').join('')
}

export async function plan(req: PlanRequest): Promise<SessionPlan> {
  const payload = await call(
    'generateContent',
    body(buildPlanSystem(req), buildPlanUser(req), {
      maxOutputTokens: 4000,
      temperature: 0.9,
      // Asking for JSON directly saves unwrapping a code fence afterwards.
      responseMimeType: 'application/json',
    }),
  )
  return shapePlan(textOf(payload), req)
}

/** Streams one segment of narration as plain text chunks. */
export async function* narrate(req: NarrateRequest): AsyncGenerator<string> {
  const response = await fetch(`${ENDPOINT}/${MODEL}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY as string,
      'content-type': 'application/json',
    },
    body: JSON.stringify(
      body(buildNarrateSystem(req), buildNarrateUser(req), {
        maxOutputTokens: 8000,
        temperature: 1,
      }),
    ),
  })
  if (!response.ok || !response.body) {
    throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffered = ''
  let refusal: RefusedError | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffered += decoder.decode(value, { stream: true })

    let boundary = buffered.indexOf('\n\n')
    while (boundary !== -1) {
      const frame = buffered.slice(0, boundary)
      buffered = buffered.slice(boundary + 2)
      boundary = buffered.indexOf('\n\n')

      const line = frame.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      const json = line.slice(5).trim()
      if (!json || json === '[DONE]') continue

      let chunk: Record<string, unknown>
      try {
        chunk = JSON.parse(json) as Record<string, unknown>
      } catch {
        // A frame split across two reads; the next pass completes it.
        continue
      }

      try {
        const text = textOf(chunk)
        if (text) yield text
      } catch (error) {
        // Keep reading so the stream closes cleanly, then report it.
        if (error instanceof RefusedError) refusal = error
        else throw error
      }
    }
  }

  if (refusal) throw refusal
}

export async function reflect(req: ReflectRequest): Promise<Reflection> {
  const payload = await call(
    'generateContent',
    body(buildReflectSystem(req), buildReflectUser(req), {
      maxOutputTokens: 2000,
      temperature: 0.6,
      responseMimeType: 'application/json',
    }),
  )
  return shapeReflection(textOf(payload))
}
