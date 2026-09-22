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

export const MODEL = 'claude-opus-5'

let client: Anthropic | null = null

export function hasCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
}

function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

/**
 * Models are asked for bare JSON, but a stray sentence or code fence costs
 * nothing to survive — so pull the first balanced object out of the text.
 */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  if (start === -1) throw new Error('no JSON object in model response')

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < body.length; i++) {
    const ch = body[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') inString = !inString
    if (inString) continue
    if (ch === '{') depth++
    if (ch === '}' && --depth === 0) return JSON.parse(body.slice(start, i + 1))
  }
  throw new Error('unbalanced JSON in model response')
}

function asStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max)
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

/** Thrown when the model declined rather than failed. */
export class RefusedError extends Error {
  constructor(readonly category: string | null) {
    super(`model declined (${category ?? 'unspecified'})`)
    this.name = 'RefusedError'
  }
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

  const raw = extractJson(textOf(message)) as Record<string, unknown>
  const persona = (raw.persona ?? {}) as Record<string, unknown>

  return {
    title: asString(raw.title, req.prompt.slice(0, 40)),
    scene: asString(raw.scene),
    persona: {
      who: asString(persona.who),
      relationship: asString(persona.relationship),
      voiceDirection: asString(persona.voiceDirection),
    },
    arc: asStringArray(raw.arc, 16),
    ambience: asString(raw.ambience, req.prefs.amb) || req.prefs.amb,
    openingLine: asString(raw.openingLine),
    rememberedLine: asString(raw.rememberedLine),
  }
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

  const raw = extractJson(textOf(message)) as Record<string, unknown>
  return {
    themes: asStringArray(raw.themes, 3),
    feelings: asStringArray(raw.feelings, 3),
    personas: asStringArray(raw.personas, 2),
    moments: asStringArray(raw.moments, 2),
  }
}
