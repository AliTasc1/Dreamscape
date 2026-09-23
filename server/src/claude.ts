import Anthropic from '@anthropic-ai/sdk'
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

export { RefusedError }

/**
 * Opus writes the best nights and costs the most. A night is many requests —
 * one plan plus a segment every three minutes — so this is the single lever
 * that moves the bill, and it belongs to whoever pays it rather than to us.
 */
export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5'

let client: Anthropic | null = null

export function hasCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
}

function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

function guardRefusal(message: Anthropic.Message): void {
  if (message.stop_reason === 'refusal') {
    throw new RefusedError(message.stop_details?.category ?? null)
  }
}

export async function plan(req: PlanRequest): Promise<SessionPlan> {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: 'low' },
    system: buildPlanSystem(req),
    messages: [{ role: 'user', content: buildPlanUser(req) }],
  })
  guardRefusal(message)

  return shapePlan(textOf(message), req)
}

/** Streams one segment of narration as plain text chunks. */
export async function* narrate(req: NarrateRequest): AsyncGenerator<string> {
  const stream = getClient().messages.stream({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: 'medium' },
    system: buildNarrateSystem(req),
    messages: [{ role: 'user', content: buildNarrateUser(req) }],
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }

  guardRefusal(await stream.finalMessage())
}

export async function reflect(req: ReflectRequest): Promise<Reflection> {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: 'low' },
    system: buildReflectSystem(req),
    messages: [{ role: 'user', content: buildReflectUser(req) }],
  })
  guardRefusal(message)

  return shapeReflection(textOf(message))
}
