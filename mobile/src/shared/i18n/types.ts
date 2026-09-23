import type { Dictionary } from './en'

/**
 * Widens the literal types `as const` gives the English dictionary, while
 * keeping its exact shape — including array lengths. A locale that forgets a
 * key, or an onboarding step, fails to compile.
 */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : { readonly [K in keyof T]: Widen<T[K]> }

export type Locale = Widen<Dictionary>

export const LANGUAGE_IDS = ['tr', 'en'] as const
export type LanguageId = (typeof LANGUAGE_IDS)[number]
