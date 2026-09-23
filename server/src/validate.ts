/**
 * Nothing that arrives over the wire is believed.
 *
 * This service holds someone's Anthropic and ElevenLabs keys, so a request
 * body is not just data — it is a bill. Without this file `minutes: 100000`
 * or a megabyte-long prompt is forwarded to a paid model verbatim, and an
 * `arc` of ten thousand strings becomes ten thousand lines of system prompt.
 *
 * Every field is therefore checked for shape and clamped to something a real
 * night could contain. Anything that cannot be repaired is a 400, and the
 * caller is told which field — never anything about the server.
 */

import {
  AMBIENCE_IDS,
  INTENSITY_IDS,
  MOOD_IDS,
  PERSONALITY_IDS,
  SPEED_IDS,
  STYLE_IDS,
  TONE_IDS,
  VOICE_IDS,
} from './options.js'
import type {
  LanguageId,
  MemorySnapshot,
  NarrateRequest,
  PlanRequest,
  Preferences,
  ReflectRequest,
  SessionPlan,
  ToneId,
  TtsRequest,
} from './contracts.js'

/** What one night can plausibly be. Anything past these is not a user. */
const LIMITS = {
  prompt: 4_000,
  minMinutes: 1,
  maxMinutes: 120,
  line: 600,
  title: 200,
  arc: 40,
  memoryList: 40,
  memoryMoments: 40,
  soFar: 20_000,
  userSaid: 1_000,
  transcript: 60_000,
  segments: 120,
  ttsText: 5_000,
  sky: 300,
} as const

export class BadRequestError extends Error {
  constructor(public readonly field: string) {
    super(`invalid field: ${field}`)
    this.name = 'BadRequestError'
  }
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestError(field)
  return value as Record<string, unknown>
}

/** A string, trimmed and truncated. Never null bytes, never control characters. */
function text(value: unknown, field: string, max: number, required = true): string {
  if (typeof value !== 'string') {
    if (required) throw new BadRequestError(field)
    return ''
  }
  // eslint-disable-next-line no-control-regex
  const clean = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim()
  if (required && !clean) throw new BadRequestError(field)
  return clean.slice(0, max)
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

function integer(value: unknown, field: string, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) throw new BadRequestError(field)
  return Math.min(max, Math.max(min, Math.round(n)))
}

function strings(value: unknown, max: number, each: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === 'string')
    .slice(0, max)
    .map((v) => text(v, 'list', each, false))
    .filter(Boolean)
}

function language(value: unknown): LanguageId {
  return value === 'tr' ? 'tr' : 'en'
}

function tone(value: unknown): ToneId {
  return oneOf(value, TONE_IDS, 'gentle')
}

/**
 * Preferences become env-var lookups and prompt lines downstream, so they are
 * narrowed to the ids the app actually offers rather than merely shortened.
 */
function preferences(value: unknown): Preferences {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    voice: oneOf(raw.voice, VOICE_IDS, 'warm'),
    mood: oneOf(raw.mood, MOOD_IDS, 'calm'),
    amb: oneOf(raw.amb, AMBIENCE_IDS, 'rain'),
    personality: oneOf(raw.personality, PERSONALITY_IDS, 'gentle'),
    style: oneOf(raw.style, STYLE_IDS, 'story'),
    speed: oneOf(raw.speed, SPEED_IDS, 'slow'),
    intensity: oneOf(raw.intensity, INTENSITY_IDS, 'soft'),
  }
}

function memory(value: unknown): MemorySnapshot {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const moments = Array.isArray(raw.moments) ? raw.moments : []
  return {
    themes: strings(raw.themes, LIMITS.memoryList, LIMITS.line),
    feelings: strings(raw.feelings, LIMITS.memoryList, LIMITS.line),
    personas: strings(raw.personas, LIMITS.memoryList, LIMITS.line),
    moments: moments
      .slice(0, LIMITS.memoryMoments)
      .map((entry) => {
        const row = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
        return {
          text: text(row.text, 'memory.moments', LIMITS.line, false),
          at: text(row.at, 'memory.moments', 40, false),
        }
      })
      .filter((m) => m.text),
    nights: integer(typeof raw.nights === 'number' ? raw.nights : 0, 'memory.nights', 0, 100_000),
  }
}

function plan(value: unknown, field: string): SessionPlan {
  const raw = object(value, field)
  const persona = raw.persona && typeof raw.persona === 'object'
    ? (raw.persona as Record<string, unknown>)
    : {}
  return {
    title: text(raw.title, `${field}.title`, LIMITS.title, false),
    scene: text(raw.scene, `${field}.scene`, LIMITS.line, false),
    persona: {
      who: text(persona.who, `${field}.persona.who`, LIMITS.line, false),
      relationship: text(persona.relationship, `${field}.persona.relationship`, LIMITS.line, false),
      voiceDirection: text(persona.voiceDirection, `${field}.persona.voiceDirection`, LIMITS.line, false),
    },
    arc: strings(raw.arc, LIMITS.arc, LIMITS.line),
    ambience: oneOf(raw.ambience, AMBIENCE_IDS, 'none'),
    openingLine: text(raw.openingLine, `${field}.openingLine`, LIMITS.line, false),
    rememberedLine: text(raw.rememberedLine, `${field}.rememberedLine`, LIMITS.line, false),
  }
}

function sky(value: unknown): string | undefined {
  const line = text(value, 'sky', LIMITS.sky, false)
  return line || undefined
}

export function planRequest(body: unknown): PlanRequest {
  const raw = object(body, 'body')
  return {
    lang: language(raw.lang),
    prompt: text(raw.prompt, 'prompt', LIMITS.prompt),
    minutes: integer(raw.minutes, 'minutes', LIMITS.minMinutes, LIMITS.maxMinutes),
    tone: tone(raw.tone),
    prefs: preferences(raw.prefs),
    memory: memory(raw.memory),
    sky: sky(raw.sky),
  }
}

export function narrateRequest(body: unknown): NarrateRequest {
  const raw = object(body, 'body')
  const segments = integer(raw.segments, 'segments', 1, LIMITS.segments)
  return {
    lang: language(raw.lang),
    plan: plan(raw.plan, 'plan'),
    minutes: integer(raw.minutes, 'minutes', LIMITS.minMinutes, LIMITS.maxMinutes),
    tone: tone(raw.tone),
    prefs: preferences(raw.prefs),
    memory: memory(raw.memory),
    // A segment past the end would ask the model to continue a finished night.
    segment: integer(raw.segment, 'segment', 0, segments - 1),
    segments,
    soFar: text(raw.soFar, 'soFar', LIMITS.soFar, false),
    userSaid: text(raw.userSaid, 'userSaid', LIMITS.userSaid, false) || undefined,
    sky: sky(raw.sky),
  }
}

export function reflectRequest(body: unknown): ReflectRequest {
  const raw = object(body, 'body')
  return {
    lang: language(raw.lang),
    prompt: text(raw.prompt, 'prompt', LIMITS.prompt, false),
    plan: raw.plan == null ? null : plan(raw.plan, 'plan'),
    transcript: text(raw.transcript, 'transcript', LIMITS.transcript, false),
    memory: memory(raw.memory),
  }
}

export function ttsRequest(body: unknown): TtsRequest {
  const raw = object(body, 'body')
  return {
    text: text(raw.text, 'text', LIMITS.ttsText),
    lang: language(raw.lang),
    voice: oneOf(raw.voice, VOICE_IDS, 'warm'),
    intensity: oneOf(raw.intensity, INTENSITY_IDS, 'soft'),
    speed: oneOf(raw.speed, SPEED_IDS, 'slow'),
    tone: tone(raw.tone),
  }
}
