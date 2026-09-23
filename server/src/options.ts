/**
 * The vocabulary the app and this server share.
 *
 * Only the id lists, copied from `app/src/domain/options.ts`: the server needs
 * them to reject anything it was not offered, and it does not need the rest.
 * `tests/drift.test.ts` fails if these ever stop matching the app's.
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

export const TONE_IDS = ['gentle', 'romantic', 'mature'] as const
