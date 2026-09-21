import type {
  ChoiceGroup,
  ExploreRow,
  NightRow,
  OnboardingStep,
  Plan,
  PrivacyRow,
  Screen,
  Stat,
  WorldCard,
} from '../types'

export const EXAMPLE_PROMPT =
  "I'm sitting beside a small fire on a quiet beach.\n" +
  "It's raining softly.\n" +
  'The ocean is dark and calm.\n' +
  'Tell me something meaningful about humanity.'

export const SCREEN_TITLES: Record<Screen, string> = {
  splash: 'Splash',
  onboarding: 'Onboarding',
  home: 'Home',
  create: 'Create Dream',
  generating: 'AI Generation',
  session: 'Immersive Session',
  fade: 'Sleep Fade',
  complete: 'Session Complete',
  explore: 'Explore',
  nights: 'My Nights',
  detail: 'Dream Detail',
  companion: 'AI Companion',
  profile: 'Profile',
  privacy: 'Privacy',
  premium: 'Premium',
  notif: 'Notifications',
  error: 'Error State',
}

export const ONBOARDING: readonly OnboardingStep[] = [
  {
    title: 'Where do you want your mind to go tonight?',
    body: 'Not a playlist. Not a course. A place you describe, narrated only for you.',
    cta: 'Continue',
    art: 'linear-gradient(170deg,#25315A,#0F1530)',
  },
  {
    title: "Describe a world.\nWe'll bring it to life.",
    body: 'A sentence is enough. The more you give, the further we can take you.',
    quote:
      'A quiet beach at midnight.\nRain is falling.\nThere’s a small fire beside me.\nSomeone is telling me stories about humanity.',
    cta: 'Continue',
    art: 'linear-gradient(170deg,#1D2C4E,#0C1226)',
  },
  {
    title: 'Listen. Imagine. Let go.',
    body: 'The AI writes and speaks your night in real time, adapting its pace to the hour and to you.',
    cta: 'Continue',
    art: 'linear-gradient(170deg,#2A2544,#0E1024)',
  },
  {
    title: 'Your voice. Your pace. Your world.',
    body: 'Choose who speaks, how slowly, and what sound sits underneath. Or change nothing — the defaults are made for sleep.',
    cta: 'Continue',
    art: 'linear-gradient(170deg,#1B3048,#0A121F)',
  },
  {
    title: 'Ready for tonight?',
    body: 'It takes about twenty seconds from here to the inside of your imagination.',
    cta: 'Enter My Dream',
    art: 'linear-gradient(170deg,#2E2A4E,#0B0E1A)',
  },
]

export const GEN_PHRASES: readonly string[] = [
  'Creating your world…',
  'Setting the atmosphere…',
  'Finding the right rhythm…',
  'Preparing your voice…',
  'Your world is ready.',
]

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

export const HOME_EXAMPLES: readonly string[] = [
  'Rainy beach…',
  'Cabin in the mountains…',
  'Walking through Tokyo at night…',
  'A campfire under the stars…',
]

export const TONIGHT = {
  title: 'Moonlit Forest',
  desc: 'A slow journey through a quiet forest beneath the stars.',
  meta: '28 min · Rain + Forest',
}

export const FAVORITES: readonly WorldCard[] = [
  {
    title: 'Rainy Beach',
    meta: '32 min · Rain + Ocean',
    art: 'linear-gradient(165deg,#22344F,#0C1526)',
  },
  {
    title: 'Cabin in the Snow',
    meta: '45 min · Fireplace',
    art: 'linear-gradient(165deg,#2C2E46,#101222)',
  },
  {
    title: 'Midnight Tokyo',
    meta: '20 min · City rain',
    art: 'linear-gradient(165deg,#332845,#130F22)',
  },
]

export const CREATE_CHIPS: readonly string[] = [
  'Ocean',
  'Rain',
  'Campfire',
  'Forest',
  'Mountains',
  'Space',
  'Night City',
  'Cabin',
  'Fantasy',
]

export const SHEET_GROUPS: readonly ChoiceGroup[] = [
  {
    label: 'Voice',
    key: 'voice',
    options: ['Female', 'Male', 'Neutral', 'Warm', 'Deep', 'Whisper-like'],
  },
  {
    label: 'Voice mood',
    key: 'mood',
    options: ['Calm', 'Warm', 'Philosophical', 'Dreamy', 'Mysterious', 'Comforting'],
  },
  {
    label: 'Ambience',
    key: 'amb',
    options: ['Rain', 'Ocean', 'Fireplace', 'Wind', 'Forest', 'Night', 'Café', 'None'],
  },
  {
    label: 'Duration',
    key: 'dur',
    options: ['10 min', '20 min', '30 min', '45 min', '60 min', 'Until sleep'],
  },
]

export const COMPANION_GROUPS: readonly ChoiceGroup[] = [
  {
    label: 'Personality',
    key: 'personality',
    options: ['Gentle', 'Wise', 'Warm', 'Philosophical', 'Quiet', 'Storyteller'],
  },
  {
    label: 'Narration style',
    key: 'style',
    options: [
      'Story',
      'Meditation',
      'Philosophy',
      'Poetry',
      'Conversation',
      'Guided visualization',
    ],
  },
  { label: 'Speed', key: 'speed', options: ['Very slow', 'Slow', 'Normal'] },
  { label: 'Voice intensity', key: 'intensity', options: ['Whisper', 'Soft', 'Normal'] },
]

export const COMPANION = { name: 'Selen', tenure: 'Your companion for 43 nights' }

export const NARRATION =
  'Somewhere beyond the horizon, thousands of people are falling asleep just like you…'

export const TALK_PROMPT = '“Tell me something about love.”'

export const VOICE_BAR_HEIGHTS: readonly number[] = [18, 34, 50, 28, 44, 22, 14]

export const SUMMARY_TITLE = 'Rain on the Coast'

export const SUMMARY_STATS: readonly Stat[] = [
  { value: '32m', label: 'Time in the dream' },
  { value: '11m', label: 'Awake before sleep' },
  { value: 'Rain', label: 'Ambience' },
]

export const EXPLORE_CATEGORIES: readonly string[] = [
  'Ocean',
  'Rain',
  'Campfire',
  'Forest',
  'Mountains',
  'Space',
  'Cities',
  'Meditation',
  'Philosophy',
  'Love',
  'Sleep',
]

export const EXPLORE_CARDS: readonly ExploreRow[] = [
  {
    title: 'Rain on a Window',
    desc: 'A slow evening indoors while the city blurs outside.',
    meta: '25 min · Rain',
    art: 'linear-gradient(90deg,#0B1020,#24344E)',
  },
  {
    title: 'Campfire at the Edge of the Ocean',
    desc: 'Salt, smoke, and a voice that never hurries.',
    meta: '40 min · Fire + Ocean',
    art: 'linear-gradient(90deg,#120E18,#4A3324)',
  },
  {
    title: 'Midnight in Kyoto',
    desc: 'Wet stone streets, paper lanterns, no one else awake.',
    meta: '30 min · City',
    art: 'linear-gradient(90deg,#0E1020,#33284A)',
  },
  {
    title: 'Conversation About Humanity',
    desc: 'A philosophical night told as if by an old friend.',
    meta: '60 min · Fireplace',
    art: 'linear-gradient(90deg,#0C121C,#1F3A46)',
  },
]

export const NIGHTS: readonly NightRow[] = [
  {
    title: 'Rain on the Coast',
    meta: 'September 21 · 32 min · Warm voice',
    ambient: 'Rain + Ocean',
    art: 'linear-gradient(160deg,#22344F,#0C1526)',
  },
  {
    title: 'Conversation About Humanity',
    meta: 'September 19 · 48 min · Deep voice',
    ambient: 'Fireplace',
    art: 'linear-gradient(160deg,#3A2E3F,#15101C)',
  },
  {
    title: 'Silent Forest Walk',
    meta: 'September 17 · 26 min · Whisper',
    ambient: 'Forest + Wind',
    art: 'linear-gradient(160deg,#1F3A33,#0A1714)',
  },
  {
    title: 'Under the Northern Lights',
    meta: 'September 14 · 60 min · Neutral',
    ambient: 'Wind',
    art: 'linear-gradient(160deg,#1C3550,#0A1420)',
  },
]

export const DETAIL = {
  title: 'Rain on the Coast',
  meta: 'September 21 · 32 min · Warm voice · Rain + Ocean',
  desc: 'You returned to this one three times. It begins at the waterline, moves to the fire, and ends with the tide going out.',
  prompt: EXAMPLE_PROMPT,
  tags: ['Rain', 'Ocean', 'Campfire', 'Philosophy'] as readonly string[],
}

export const PROFILE_STATS: readonly Stat[] = [
  { value: '43', label: 'Dreams explored' },
  { value: '21h', label: 'Minutes relaxed' },
  { value: '6', label: 'Favourite worlds' },
]

export const PRIVACY_ROWS: readonly PrivacyRow[] = [
  {
    title: 'Your prompts stay on your device',
    body: 'What you type is sent once to generate the night, then kept locally unless you save it to My Nights.',
  },
  {
    title: 'Voice is never stored',
    body: 'When you talk to your companion, audio is transcribed in the moment and discarded. Nothing is kept afterwards.',
  },
  {
    title: 'Nothing is used for training',
    body: 'Your dreams are not used to train models and are never shared with third parties.',
  },
  {
    title: 'Leave whenever you want',
    body: 'Delete every session, prompt and preference in one tap. Export a copy first if you want to keep it.',
  },
]

export const PREMIUM_FEATURES: readonly string[] = [
  'Unlimited AI nights, any length',
  'Premium voices and whisper narration',
  'Voice conversations inside the dream',
  'Adaptive storytelling that remembers your worlds',
  'Sleep routines and a personal dream library',
]

export const PLANS: readonly Plan[] = [
  { name: 'Monthly', price: '€9.99', note: 'billed monthly' },
  { name: 'Yearly', price: '€59', note: '2 months quiet, free' },
]

export const NOTIFS: readonly string[] = [
  'Your night is waiting.',
  'Tonight, imagine somewhere peaceful.',
  'Your favourite rainy beach is waiting.',
]

export const NOTIF_TOGGLES: readonly string[] = [
  'Bedtime invitation',
  'New worlds weekly',
  'Session finished',
  'Quiet hours',
]
