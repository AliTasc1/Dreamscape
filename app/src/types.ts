export type Screen =
  | 'splash'
  | 'onboarding'
  | 'home'
  | 'create'
  | 'generating'
  | 'session'
  | 'fade'
  | 'complete'
  | 'explore'
  | 'nights'
  | 'detail'
  | 'companion'
  | 'profile'
  | 'privacy'
  | 'premium'
  | 'notif'
  | 'error'

/** Preference keys that are edited by a chip group. */
export type ChoiceKey =
  | 'voice'
  | 'mood'
  | 'amb'
  | 'dur'
  | 'personality'
  | 'style'
  | 'speed'
  | 'intensity'

export interface ChoiceGroup {
  label: string
  key: ChoiceKey
  options: readonly string[]
}

export interface OnboardingStep {
  title: string
  body: string
  quote?: string
  cta: string
  art: string
}

export interface WorldCard {
  title: string
  meta: string
  art: string
}

export interface NightRow {
  title: string
  meta: string
  ambient: string
  art: string
}

export interface ExploreRow {
  title: string
  desc: string
  meta: string
  art: string
}

export interface Stat {
  value: string
  label: string
}

export interface PrivacyRow {
  title: string
  body: string
}

export interface Plan {
  name: string
  price: string
  note: string
}
