import type { ScenePalette } from '../art/NightScene'

/**
 * Everything visual that has no words in it.
 *
 * All copy lives in `src/i18n`; this file keeps the gradients, the star field
 * and the numbers, so a translation can never break a layout.
 */

/** [left %, top %] — hand-placed so the field never reads as a grid. */
export const STAR_POSITIONS: readonly (readonly [number, number])[] = [
  [8, 14],
  [22, 9],
  [35, 22],
  [48, 7],
  [61, 18],
  [74, 11],
  [87, 25],
  [15, 31],
  [42, 35],
  [68, 33],
  [91, 8],
  [29, 17],
  [55, 28],
  [80, 19],
]

/** The scene is retinted and the moon moves, so five steps never repeat. */
export const ONBOARDING_PALETTES = [
  'indigo',
  'teal',
  'violet',
  'indigo',
  'ember',
] as const satisfies readonly ScenePalette[]

export const FAVOURITE_ART: readonly string[] = [
  'linear-gradient(165deg,#22344F,#0C1526)',
  'linear-gradient(165deg,#2C2E46,#101222)',
  'linear-gradient(165deg,#332845,#130F22)',
]

export const NIGHT_ART: readonly string[] = [
  'linear-gradient(160deg,#22344F,#0C1526)',
  'linear-gradient(160deg,#3A2E3F,#15101C)',
  'linear-gradient(160deg,#1F3A33,#0A1714)',
  'linear-gradient(160deg,#1C3550,#0A1420)',
]

export const EXPLORE_ART: readonly string[] = [
  'linear-gradient(90deg,#0B1020,#24344E)',
  'linear-gradient(90deg,#120E18,#4A3324)',
  'linear-gradient(90deg,#0E1020,#33284A)',
  'linear-gradient(90deg,#0C121C,#1F3A46)',
]

/** Art for a saved night, chosen from its ambience so it never looks random. */
const AMBIENCE_ART: Record<string, string> = {
  rain: 'linear-gradient(160deg,#22344F,#0C1526)',
  ocean: 'linear-gradient(160deg,#1C3550,#0A1420)',
  fireplace: 'linear-gradient(160deg,#3A2E3F,#15101C)',
  wind: 'linear-gradient(160deg,#243044,#0B1018)',
  forest: 'linear-gradient(160deg,#1F3A33,#0A1714)',
  night: 'linear-gradient(160deg,#232047,#0C0E20)',
  cafe: 'linear-gradient(160deg,#3A3229,#161110)',
  none: 'linear-gradient(160deg,#242838,#0C0E18)',
}

export function artForAmbience(ambience: string): string {
  return AMBIENCE_ART[ambience] ?? AMBIENCE_ART.none
}

export const VOICE_BAR_HEIGHTS: readonly number[] = [18, 34, 50, 28, 44, 22, 14]

export const PROFILE_STAT_VALUES = { relaxed: '21h', favourites: '6' } as const
