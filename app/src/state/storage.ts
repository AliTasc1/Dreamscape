import type { MemorySnapshot, ToneId } from '../ai/contracts'
import { EMPTY_MEMORY } from '../ai/contracts'
import type { LanguageId } from '../i18n'
import { isLanguageId } from '../i18n'
import type { Preferences } from './preferences'
import { DEFAULT_PREFERENCES, isPreferences } from './preferences'

const KEY = 'dreamscape.v1'

/** A night the listener chose to keep. */
export interface SavedNight {
  id: string
  title: string
  prompt: string
  minutes: number
  /** ISO date. */
  at: string
  ambience: string
  personaWho: string
}

export interface Persisted {
  lang: LanguageId | null
  ageConfirmed: boolean
  tone: ToneId | null
  /** True once the five onboarding steps have been seen or skipped. */
  onboarded: boolean
  premium: boolean
  memory: MemorySnapshot
  prefs: Preferences
  nights: SavedNight[]
  notifOn: Record<string, boolean>
  /** Opt-in: read the real weather where the listener is. Off until asked for. */
  useRealSky: boolean
}

export const INITIAL_PERSISTED: Persisted = {
  lang: null,
  ageConfirmed: false,
  tone: null,
  onboarded: false,
  premium: false,
  memory: EMPTY_MEMORY,
  prefs: DEFAULT_PREFERENCES,
  nights: [],
  notifOn: { bedtime: true, weekly: false, finished: false, quiet: true },
  useRealSky: false,
}

function isTone(value: unknown): value is ToneId {
  return value === 'gentle' || value === 'romantic' || value === 'mature'
}

function asStrings(value: unknown, max: number): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string').slice(0, max)
    : []
}

function readMemory(value: unknown): MemorySnapshot {
  if (!value || typeof value !== 'object') return EMPTY_MEMORY
  const raw = value as Record<string, unknown>
  const moments = Array.isArray(raw.moments)
    ? raw.moments
        .filter(
          (m): m is { text: string; at: string } =>
            !!m &&
            typeof m === 'object' &&
            typeof (m as { text?: unknown }).text === 'string' &&
            typeof (m as { at?: unknown }).at === 'string',
        )
        .slice(0, 12)
    : []
  return {
    themes: asStrings(raw.themes, 8),
    feelings: asStrings(raw.feelings, 8),
    personas: asStrings(raw.personas, 6),
    moments,
    nights: typeof raw.nights === 'number' && raw.nights >= 0 ? Math.floor(raw.nights) : 0,
  }
}

function readNights(value: unknown): SavedNight[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((n): n is SavedNight => {
      if (!n || typeof n !== 'object') return false
      const row = n as Record<string, unknown>
      return (
        typeof row.id === 'string' &&
        typeof row.title === 'string' &&
        typeof row.prompt === 'string' &&
        typeof row.minutes === 'number' &&
        typeof row.at === 'string'
      )
    })
    .slice(0, 100)
}

/**
 * Everything here came off disk, so nothing is trusted: each field is checked
 * and anything unrecognised falls back to its default.
 */
export function loadPersisted(): Persisted {
  if (typeof localStorage === 'undefined') return INITIAL_PERSISTED
  let raw: unknown
  try {
    const text = localStorage.getItem(KEY)
    if (!text) return INITIAL_PERSISTED
    raw = JSON.parse(text)
  } catch {
    return INITIAL_PERSISTED
  }
  if (!raw || typeof raw !== 'object') return INITIAL_PERSISTED
  const row = raw as Record<string, unknown>

  return {
    lang: isLanguageId(row.lang) ? row.lang : null,
    ageConfirmed: row.ageConfirmed === true,
    tone: isTone(row.tone) ? row.tone : null,
    onboarded: row.onboarded === true,
    premium: row.premium === true,
    memory: readMemory(row.memory),
    prefs: isPreferences(row.prefs) ? row.prefs : DEFAULT_PREFERENCES,
    nights: readNights(row.nights),
    notifOn:
      row.notifOn && typeof row.notifOn === 'object'
        ? { ...INITIAL_PERSISTED.notifOn, ...(row.notifOn as Record<string, boolean>) }
        : INITIAL_PERSISTED.notifOn,
    useRealSky: row.useRealSky === true,
  }
}

export function savePersisted(value: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    // Private browsing, blocked storage — the session still works, it just
    // will not be here tomorrow.
  }
}

export function clearPersisted(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to do; the in-memory state is cleared by the caller either way.
  }
}
