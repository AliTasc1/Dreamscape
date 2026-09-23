import type { ScenePalette } from '../art/NightScene'

/** The scene is retinted and the moon moves, so five steps never repeat. */
export const ONBOARDING_PALETTES = [
  'indigo',
  'teal',
  'violet',
  'indigo',
  'ember',
] as const satisfies readonly ScenePalette[]

/** Art for a saved night, chosen from its ambience so it never looks random. */
const AMBIENCE_PALETTE: Record<string, ScenePalette> = {
  rain: 'indigo',
  ocean: 'teal',
  fireplace: 'ember',
  wind: 'indigo',
  forest: 'teal',
  night: 'violet',
  cafe: 'ember',
  none: 'indigo',
}

export function paletteForAmbience(ambience: string): ScenePalette {
  return AMBIENCE_PALETTE[ambience] ?? 'indigo'
}
