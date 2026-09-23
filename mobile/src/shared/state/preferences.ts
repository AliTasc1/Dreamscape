import {
  OPTION_SETS,
  type AmbienceId,
  type IntensityId,
  type MoodId,
  type OptionKey,
  type PersonalityId,
  type SpeedId,
  type StyleId,
  type VoiceId,
} from '../domain/options'

export interface Preferences {
  voice: VoiceId
  mood: MoodId
  amb: AmbienceId
  personality: PersonalityId
  style: StyleId
  speed: SpeedId
  intensity: IntensityId
}

/** Chosen for sleep, so most people never open the sheet at all. */
export const DEFAULT_PREFERENCES: Preferences = {
  voice: 'warm',
  mood: 'calm',
  amb: 'rain',
  personality: 'gentle',
  style: 'story',
  speed: 'slow',
  intensity: 'soft',
}

export function isPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (Object.keys(OPTION_SETS) as OptionKey[]).every((key) => {
    const allowed = OPTION_SETS[key] as readonly string[]
    return typeof row[key] === 'string' && allowed.includes(row[key] as string)
  })
}
