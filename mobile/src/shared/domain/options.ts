/**
 * Every user choice is stored as a stable id, never as display text — so the
 * same session survives a language switch and the backend always receives the
 * same vocabulary regardless of what the user is reading.
 */

export const VOICE_IDS = ['female', 'male', 'neutral', 'warm', 'deep', 'whisper'] as const
export const MOOD_IDS = [
  'calm',
  'warm',
  'philosophical',
  'dreamy',
  'mysterious',
  'comforting',
] as const
export const AMBIENCE_IDS = [
  'rain',
  'ocean',
  'fireplace',
  'wind',
  'forest',
  'night',
  'cafe',
  'none',
] as const
export const PERSONALITY_IDS = [
  'gentle',
  'wise',
  'warm',
  'philosophical',
  'quiet',
  'storyteller',
] as const
export const STYLE_IDS = [
  'story',
  'meditation',
  'philosophy',
  'poetry',
  'conversation',
  'guided',
] as const
export const SPEED_IDS = ['verySlow', 'slow', 'normal'] as const
export const INTENSITY_IDS = ['whisper', 'soft', 'normal'] as const

/** Themes offered as chips on Create. */
export const THEME_IDS = [
  'ocean',
  'rain',
  'campfire',
  'forest',
  'mountains',
  'space',
  'nightCity',
  'cabin',
  'fantasy',
] as const

/** Browsing categories on Explore. */
export const CATEGORY_IDS = [
  'ocean',
  'rain',
  'campfire',
  'forest',
  'mountains',
  'space',
  'cities',
  'meditation',
  'philosophy',
  'love',
  'sleep',
] as const

/**
 * How far the companion may go. Chosen once behind the age gate and editable
 * afterwards; it travels with every request to the narrator.
 */
export const TONE_IDS = ['gentle', 'romantic', 'mature'] as const

export type VoiceId = (typeof VOICE_IDS)[number]
export type MoodId = (typeof MOOD_IDS)[number]
export type AmbienceId = (typeof AMBIENCE_IDS)[number]
export type PersonalityId = (typeof PERSONALITY_IDS)[number]
export type StyleId = (typeof STYLE_IDS)[number]
export type SpeedId = (typeof SPEED_IDS)[number]
export type IntensityId = (typeof INTENSITY_IDS)[number]
export type ThemeId = (typeof THEME_IDS)[number]
export type CategoryId = (typeof CATEGORY_IDS)[number]
export type ToneId = (typeof TONE_IDS)[number]

export type OptionKey =
  | 'voice'
  | 'mood'
  | 'amb'
  | 'personality'
  | 'style'
  | 'speed'
  | 'intensity'

export const OPTION_SETS = {
  voice: VOICE_IDS,
  mood: MOOD_IDS,
  amb: AMBIENCE_IDS,
  personality: PERSONALITY_IDS,
  style: STYLE_IDS,
  speed: SPEED_IDS,
  intensity: INTENSITY_IDS,
} as const satisfies Record<OptionKey, readonly string[]>

/** Minutes. Free accounts stop at 10; premium reaches an hour. */
export const FREE_DURATIONS = [5, 10] as const
export const PREMIUM_DURATIONS = [5, 10, 15, 30, 45, 60] as const
export const FREE_MAX_MINUTES = 10
export const PREMIUM_MAX_MINUTES = 60

export function durationsFor(premium: boolean): readonly number[] {
  return premium ? PREMIUM_DURATIONS : FREE_DURATIONS
}

export function maxMinutesFor(premium: boolean): number {
  return premium ? PREMIUM_MAX_MINUTES : FREE_MAX_MINUTES
}
