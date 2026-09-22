/**
 * The wire contract between the app and this server.
 *
 * A copy of this file lives at `app/src/ai/contracts.ts`. They are two
 * deployables, so the shape is duplicated on purpose — change one, change both.
 */

export type LanguageId = 'tr' | 'en'
export type ToneId = 'gentle' | 'romantic' | 'mature'

export interface Preferences {
  voice: string
  mood: string
  amb: string
  personality: string
  style: string
  speed: string
  intensity: string
}

/** What the companion has learned, carried into every request. */
export interface MemorySnapshot {
  /** Worlds and subjects the listener keeps coming back to. */
  themes: string[]
  /** Feelings they have expressed or shown. */
  feelings: string[]
  /** Who they ask the companion to be — "father figure", "old friend". */
  personas: string[]
  /** Short, quotable moments worth calling back to. */
  moments: { text: string; at: string }[]
  /** How many nights this profile was built from. */
  nights: number
}

export const EMPTY_MEMORY: MemorySnapshot = {
  themes: [],
  feelings: [],
  personas: [],
  moments: [],
  nights: 0,
}

export interface PlanRequest {
  lang: LanguageId
  prompt: string
  minutes: number
  tone: ToneId
  prefs: Preferences
  memory: MemorySnapshot
}

/** The companion's reading of the prompt, before a word is spoken. */
export interface SessionPlan {
  /** Short title for the night. */
  title: string
  /** One line describing the place. */
  scene: string
  /** Who the companion becomes. */
  persona: {
    /** "your father", "an old friend", "a lover" — in the listener's language. */
    who: string
    /** The relationship in one phrase. */
    relationship: string
    /** Direction for the voice: pace, warmth, volume. */
    voiceDirection: string
  }
  /** Beats the night moves through, in order. */
  arc: string[]
  /** Ambience id the scene suggests. */
  ambience: string
  /** The first sentence, so the session can open instantly. */
  openingLine: string
  /** A callback to something remembered, or an empty string. */
  rememberedLine: string
}

export interface NarrateRequest {
  lang: LanguageId
  plan: SessionPlan
  minutes: number
  tone: ToneId
  prefs: Preferences
  memory: MemorySnapshot
  /** 0-based index of the segment being asked for. */
  segment: number
  /** How many segments the whole night is divided into. */
  segments: number
  /** What has been narrated already, condensed. */
  soFar: string
  /** Something the listener said out loud, if they interrupted. */
  userSaid?: string
}

export interface ReflectRequest {
  lang: LanguageId
  prompt: string
  plan: SessionPlan | null
  transcript: string
  memory: MemorySnapshot
}

/** What one night taught the companion. */
export interface Reflection {
  themes: string[]
  feelings: string[]
  personas: string[]
  moments: string[]
}

export interface TtsRequest {
  text: string
  lang: LanguageId
  /** Preference id — the adapter maps it to a provider voice. */
  voice: string
  intensity: string
  speed: string
  tone: ToneId
}

export interface Capabilities {
  /** Who writes the narration. */
  narrator: 'claude' | 'none'
  /** Who speaks it. `none` means the app falls back to the browser. */
  voice: 'elevenlabs' | 'openai' | 'none'
  model: string | null
}

export type NarrateEvent =
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
