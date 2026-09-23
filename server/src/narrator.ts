/**
 * Which narrator writes tonight.
 *
 * Two adapters, one interface. Anthropic writes the better night and bills for
 * it; Gemini has a free tier that covers a couple of nights a day on a key
 * anyone can make without a card. Whoever is configured is who writes, and if
 * both are, the preference is whichever `NARRATOR` names — Anthropic by
 * default, because a paid key is a deliberate act.
 *
 * The adapters are loaded only when they are chosen. A deployment running on
 * the free tier never loads the Anthropic SDK, and one running on Anthropic
 * never reaches for Google — so neither has to be installed to use the other.
 *
 * Nothing above this module knows which one answered. When neither is here,
 * the app writes the night on the device instead and the listener is told
 * nothing, because there is nothing they could do about it.
 */

import type {
  NarrateRequest,
  NarratorId,
  PlanRequest,
  Reflection,
  ReflectRequest,
  SessionPlan,
} from './contracts.js'

interface Adapter {
  MODEL: string
  plan(req: PlanRequest): Promise<SessionPlan>
  narrate(req: NarrateRequest): AsyncGenerator<string>
  reflect(req: ReflectRequest): Promise<Reflection>
}

/**
 * Read from the environment rather than from the adapters, so deciding who
 * would answer never loads anybody's SDK.
 */
function anthropicReady(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
}

function geminiReady(): boolean {
  return Boolean(process.env.GEMINI_API_KEY)
}

/** The id of whoever will write, or `none` when nobody can. */
export function provider(): NarratorId {
  const preferred = process.env.NARRATOR
  if (preferred === 'gemini' && geminiReady()) return 'gemini'
  if (preferred === 'claude' && anthropicReady()) return 'claude'
  if (anthropicReady()) return 'claude'
  if (geminiReady()) return 'gemini'
  return 'none'
}

export function hasCredentials(): boolean {
  return provider() !== 'none'
}

/** The model name for whoever is configured, without loading their adapter. */
export function model(): string | null {
  const id = provider()
  if (id === 'gemini') return process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  if (id === 'claude') return process.env.ANTHROPIC_MODEL || 'claude-opus-5'
  return null
}

const loaded = new Map<NarratorId, Promise<Adapter>>()

function current(): Promise<Adapter> {
  const id = provider()
  if (id === 'none') return Promise.reject(new Error('no narrator configured'))

  let adapter = loaded.get(id)
  if (!adapter) {
    adapter = id === 'gemini' ? import('./gemini.js') : import('./claude.js')
    loaded.set(id, adapter)
  }
  return adapter
}

export async function plan(req: PlanRequest): Promise<SessionPlan> {
  return (await current()).plan(req)
}

export async function* narrate(req: NarrateRequest): AsyncGenerator<string> {
  yield* (await current()).narrate(req)
}

export async function reflect(req: ReflectRequest): Promise<Reflection> {
  return (await current()).reflect(req)
}
