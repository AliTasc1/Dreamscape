import AsyncStorage from '@react-native-async-storage/async-storage'
import type { MemorySnapshot, ToneId } from '../shared/ai/contracts'
import { EMPTY_MEMORY } from '../shared/ai/contracts'
import type { Preferences } from '../shared/state/preferences'
import { DEFAULT_PREFERENCES, isPreferences } from '../shared/state/preferences'
import { isLanguageId, type LanguageId } from '../i18n'

const KEY = 'dreamscape.v1'

export interface SavedNight {
  id: string
  title: string
  prompt: string
  minutes: number
  at: string
  ambience: string
  personaWho: string
}

export interface Persisted {
  lang: LanguageId | null
  ageConfirmed: boolean
  tone: ToneId | null
  onboarded: boolean
  premium: boolean
  memory: MemorySnapshot
  prefs: Preferences
  nights: SavedNight[]
  notifOn: Record<string, boolean>
  /** Opt-in: match the night to the real weather where the listener is. */
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

/** Everything here came off disk, so nothing is trusted. */
export async function loadPersisted(): Promise<Persisted> {
  let raw: unknown
  try {
    const text = await AsyncStorage.getItem(KEY)
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

export async function savePersisted(value: Persisted): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    // Storage full or unavailable — the session still runs, it just will not
    // be here tomorrow.
  }
}

export async function clearPersisted(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY)
  } catch {
    // The caller clears the in-memory state either way.
  }
}
