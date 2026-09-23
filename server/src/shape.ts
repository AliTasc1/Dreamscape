/**
 * Turning whatever a model said into the shape the app expects.
 *
 * Two narrators write these nights and they answer differently — one returns
 * a JSON block, the other returns JSON wrapped in whatever it felt like
 * saying first. Neither is trusted to have returned the right fields, so this
 * is where a reply becomes a `SessionPlan` or a `Reflection` or fails loudly.
 */

import type { PlanRequest, Reflection, SessionPlan } from './contracts.js'

/** Thrown when the model declined rather than failed. */
export class RefusedError extends Error {
  constructor(readonly category: string | null) {
    super(`model declined (${category ?? 'unspecified'})`)
    this.name = 'RefusedError'
  }
}

/**
 * Models are asked for bare JSON, but a stray sentence or code fence costs
 * nothing to survive — so pull the first balanced object out of the text.
 */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1]! : text
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

export function asStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max)
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

export function shapePlan(text: string, req: PlanRequest): SessionPlan {
  const raw = extractJson(text) as Record<string, unknown>
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

export function shapeReflection(text: string): Reflection {
  const raw = extractJson(text) as Record<string, unknown>
  return {
    themes: asStringArray(raw.themes, 3),
    feelings: asStringArray(raw.feelings, 3),
    personas: asStringArray(raw.personas, 2),
    moments: asStringArray(raw.moments, 2),
  }
}
