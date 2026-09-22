/**
 * English is the shape the other locales are typed against — adding a key here
 * makes it required everywhere else, so a locale can never drift out of date.
 */
export const en = {
  meta: { name: 'English', nativeName: 'English', htmlLang: 'en', locale: 'en-US' },

  common: {
    appName: 'Dreamscape',
    continue: 'Continue',
    skip: 'Skip',
    done: 'Done',
    back: 'Back',
    cancel: 'Cancel',
    close: 'Close',
    minutes: '{n} min',
    minutesShort: '{n}m',
    seconds: '{n}s',
    and: 'and',
  },

  language: {
    title: 'Choose your language',
    subtitle: 'Your dreams will be written and spoken in the language you pick.',
    note: 'You can change this any time in Profile.',
    cta: 'Continue',
  },

  consent: {
    title: 'Before we begin',
    body: 'Dreamscape narrates whatever you describe. Tell us how far your companion may go, so tonight sounds the way you want it to.',
    ageTitle: 'I am 18 or older',
    ageBody: 'Some tones are only available to adults.',
    toneTitle: 'How should your companion speak?',
    toneBody: 'You can change this any time in Profile.',
    tones: {
      gentle: 'Gentle',
      gentleDesc: 'Calm, comforting, made for sleep.',
      romantic: 'Romantic',
      romanticDesc: 'Warm, affectionate, flirtatious.',
      mature: 'Adult',
      matureDesc: 'Explicit themes for adults. Requires 18+.',
    },
    cta: 'Start dreaming',
    needsAge: 'Confirm you are 18 or older to choose this tone.',
  },

  splash: { tagline: "Close your eyes. We'll take you somewhere." },

  onboarding: {
    steps: [
      {
        title: 'Where do you want your mind to go tonight?',
        body: 'Not a playlist. Not a course. A place you describe, narrated only for you.',
        quote: '',
        cta: 'Continue',
      },
      {
        title: "Describe a world.\nWe'll bring it to life.",
        body: 'A sentence is enough. The more you give, the further we can take you.',
        quote:
          'A quiet beach at midnight.\nRain is falling.\nThere’s a small fire beside me.\nSomeone is telling me stories about humanity.',
        cta: 'Continue',
      },
      {
        title: 'Listen. Imagine. Let go.',
        body: 'The AI writes and speaks your night in real time, adapting its pace to the hour and to you.',
        quote: '',
        cta: 'Continue',
      },
      {
        title: 'Your voice. Your pace. Your world.',
        body: 'Choose who speaks, how slowly, and what sound sits underneath. Or change nothing — the defaults are made for sleep.',
        quote: '',
        cta: 'Continue',
      },
      {
        title: 'Ready for tonight?',
        body: 'It takes about twenty seconds from here to the inside of your imagination.',
        quote: '',
        cta: 'Enter My Dream',
      },
    ],
  },

  home: {
    greeting: 'Good night, {name}',
    question: 'What would you like to imagine tonight?',
    tonightBadge: "Tonight's dream",
    tonightTitle: 'Moonlit Forest',
    tonightDesc: 'A slow journey through a quiet forest beneath the stars.',
    tonightMeta: '28 min · Rain + Forest',
    begin: 'Begin',
    createSection: 'Create your own world',
    composerPlaceholder: 'Describe what you want to imagine…',
    examples: [
      'Rainy beach…',
      'Cabin in the mountains…',
      'Walking through Tokyo at night…',
      'A campfire under the stars…',
    ],
    returnSection: 'Return to a world',
    myNights: 'My nights',
    favourites: [
      { title: 'Rainy Beach', meta: '32 min · Rain + Ocean' },
      { title: 'Cabin in the Snow', meta: '45 min · Fireplace' },
      { title: 'Midnight Tokyo', meta: '20 min · City rain' },
    ],
  },

  create: {
    heading: 'Where should we go tonight?',
    placeholder: 'Describe the place, atmosphere or story you want to experience…',
    useExample: 'Use an example',
    mic: 'mic',
    micLabel: 'Speak your dream',
    examplePrompt:
      "I'm sitting beside a small fire on a quiet beach.\nIt's raining softly.\nThe ocean is dark and calm.\nTell me something meaningful about humanity.",
    durationTitle: 'How long should tonight last?',
    durationLocked: 'Premium',
    settingsTitle: 'Voice, ambience & length',
    footnote: 'One sentence is enough. Everything else is optional.',
    cta: 'Take Me There',
    emptyPrompt: 'Write a sentence first — anything at all.',
    remembers: 'I remember: {memory}',
  },

  generating: {
    phrases: [
      'Reading what you wrote…',
      'Setting the atmosphere…',
      'Finding the right voice…',
      'Writing your first minutes…',
      'Your world is ready.',
    ],
    enter: 'Enter',
    failed: 'Something interrupted the writing.',
    retry: 'Try again',
  },

  session: {
    speaking: 'Speaking',
    paused: 'Paused',
    listening: 'Listening',
    end: 'End',
    sleep: 'Sleep',
    talk: 'Talk',
    mix: 'Mix',
    play: 'Play',
    pause: 'Pause',
    remaining: '{time} left',
    timeUpFree: 'Your free night ends here.',
    timeUpFreeBody: 'Premium nights run up to an hour.',
    seePremium: 'See Premium',
    muted: 'Sound off',
    unmuted: 'Sound on',
    voiceUnavailable: 'Voice is unavailable on this device — the words keep going.',
  },

  talk: {
    tellMe: 'Tell me…',
    hint: '“Tell me something about love.”',
    backToDream: 'Back to the dream',
    backToWriting: 'Back to writing',
    micDenied: 'Microphone access is blocked. Allow it in your browser, or type instead.',
    unsupported: 'This browser cannot listen. Type instead.',
    send: 'Send',
    placeholder: 'Say something to your companion…',
  },

  fade: { goodnight: 'Good night.' },

  complete: {
    eyebrow: 'Session complete',
    stats: {
      timeInDream: 'Time in the dream',
      awake: 'Awake before sleep',
      ambience: 'Ambience',
    },
    save: 'Save to My Nights',
    replay: 'Replay',
    learned: 'What I noticed tonight',
  },

  explore: {
    title: 'Worlds to wander',
    cards: [
      {
        title: 'Rain on a Window',
        desc: 'A slow evening indoors while the city blurs outside.',
        meta: '25 min · Rain',
      },
      {
        title: 'Campfire at the Edge of the Ocean',
        desc: 'Salt, smoke, and a voice that never hurries.',
        meta: '40 min · Fire + Ocean',
      },
      {
        title: 'Midnight in Kyoto',
        desc: 'Wet stone streets, paper lanterns, no one else awake.',
        meta: '30 min · City',
      },
      {
        title: 'Conversation About Humanity',
        desc: 'A philosophical night told as if by an old friend.',
        meta: '60 min · Fireplace',
      },
    ],
  },

  nights: {
    title: 'My Nights',
    showEmpty: 'show empty state',
    showFilled: 'show filled state',
    emptyLine: 'Your first journey is waiting.',
    emptyCopy: 'Describe a place tonight and it will live here in the morning.',
    emptyCta: 'Create a Dream',
    rows: [
      {
        title: 'Rain on the Coast',
        meta: 'September 21 · 32 min · Warm voice',
        ambient: 'Rain + Ocean',
      },
      {
        title: 'Conversation About Humanity',
        meta: 'September 19 · 48 min · Deep voice',
        ambient: 'Fireplace',
      },
      {
        title: 'Silent Forest Walk',
        meta: 'September 17 · 26 min · Whisper',
        ambient: 'Forest + Wind',
      },
      {
        title: 'Under the Northern Lights',
        meta: 'September 14 · 60 min · Neutral',
        ambient: 'Wind',
      },
    ],
  },

  detail: {
    title: 'Rain on the Coast',
    meta: 'September 21 · 32 min · Warm voice · Rain + Ocean',
    desc: 'You returned to this one three times. It begins at the waterline, moves to the fire, and ends with the tide going out.',
    tags: ['Rain', 'Ocean', 'Campfire', 'Philosophy'],
    replay: 'Replay this night',
    backLabel: 'Back to My Nights',
    favAdd: 'Add to favourites',
    favRemove: 'Remove from favourites',
  },

  companion: {
    name: 'Selen',
    tenure: 'Your companion for {n} nights',
    groups: {
      personality: 'Personality',
      style: 'Narration style',
      speed: 'Speed',
      intensity: 'Voice intensity',
    },
  },

  profile: {
    greeting: 'Good evening, {name}.',
    planPremium: 'Dreamscape Premium',
    planFree: 'Dreamscape Free',
    stats: {
      dreams: 'Dreams explored',
      relaxed: 'Minutes relaxed',
      favourites: 'Favourite worlds',
    },
    rows: {
      companion: 'AI Companion',
      voice: 'Voice',
      sleep: 'Sleep preferences',
      ambient: 'Ambient sounds',
      memory: 'What I know about you',
      tone: 'Companion tone',
      notifications: 'Notifications',
      language: 'Language',
      privacy: 'Privacy',
      subscription: 'Subscription',
    },
    subscriptionPremium: 'Premium',
    subscriptionFree: 'Free',
  },

  memory: {
    title: 'What I know about you',
    lede: 'Everything here was learned from what you wrote. It stays on this device, and you can erase any of it.',
    empty: 'Nothing yet. Write a dream and I will start listening.',
    themes: 'What you keep returning to',
    feelings: 'How you tend to feel',
    people: 'Who you ask me to be',
    moments: 'Moments I remember',
    forget: 'Forget',
    forgetAll: 'Forget everything',
    forgotten: 'Forgotten.',
    sessionCount: 'Learned across {n} nights',
  },

  privacy: {
    title: 'What you imagine stays yours.',
    lede: 'Your dreams can be personal. Here is exactly what happens to them.',
    rows: [
      {
        title: 'Your prompts stay on your device',
        body: 'What you type is sent once to write the night, then kept locally unless you save it to My Nights.',
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
    ],
    exportData: 'Export my data',
    deleteAll: 'Delete everything',
    deleted: 'Everything has been deleted.',
  },

  premium: {
    title: 'Go deeper into your dreams.',
    features: [
      'Nights up to a full hour, instead of ten minutes',
      'Premium voices that breathe, laugh and whisper',
      'Voice conversations inside the dream',
      'A companion that remembers every world you built',
      'Every tone, including adult narration',
    ],
    plans: {
      monthly: { name: 'Monthly', price: '€9.99', note: 'billed monthly' },
      yearly: { name: 'Yearly', price: '€59', note: '2 months quiet, free' },
    },
    cta: 'Start 7 quiet nights free',
    ctaOwned: 'Premium is active',
    fine: 'Cancel any time. No reminders, ever.',
    purchasing: 'Opening checkout…',
    purchased: 'Premium is yours. Tonight can run an hour.',
    manage: 'Manage subscription',
    cancel: 'Cancel premium',
  },

  paywall: {
    title: 'That length needs Premium',
    body: 'Free nights run up to {free} minutes. Premium nights run up to {premium}.',
    cta: 'See Premium',
    later: 'Not tonight',
  },

  notif: {
    title: 'A gentle nudge',
    previews: [
      'Your night is waiting.',
      'Tonight, imagine somewhere peaceful.',
      'Your favourite rainy beach is waiting.',
    ],
    toggles: {
      bedtime: 'Bedtime invitation',
      weekly: 'New worlds weekly',
      finished: 'Session finished',
      quiet: 'Quiet hours',
    },
  },

  error: {
    line: 'We lost the thread for a moment.',
    sub: "Nothing is broken. Let's try again.",
    cta: 'Return to the Dream',
  },

  sheet: {
    voice: 'Voice',
    mood: 'Voice mood',
    ambience: 'Ambience',
    duration: 'Duration',
  },

  options: {
    voice: {
      female: 'Female',
      male: 'Male',
      neutral: 'Neutral',
      warm: 'Warm',
      deep: 'Deep',
      whisper: 'Whisper-like',
    },
    mood: {
      calm: 'Calm',
      warm: 'Warm',
      philosophical: 'Philosophical',
      dreamy: 'Dreamy',
      mysterious: 'Mysterious',
      comforting: 'Comforting',
    },
    amb: {
      rain: 'Rain',
      ocean: 'Ocean',
      fireplace: 'Fireplace',
      wind: 'Wind',
      forest: 'Forest',
      night: 'Night',
      cafe: 'Café',
      none: 'None',
    },
    personality: {
      gentle: 'Gentle',
      wise: 'Wise',
      warm: 'Warm',
      philosophical: 'Philosophical',
      quiet: 'Quiet',
      storyteller: 'Storyteller',
    },
    style: {
      story: 'Story',
      meditation: 'Meditation',
      philosophy: 'Philosophy',
      poetry: 'Poetry',
      conversation: 'Conversation',
      guided: 'Guided visualization',
    },
    speed: { verySlow: 'Very slow', slow: 'Slow', normal: 'Normal' },
    intensity: { whisper: 'Whisper', soft: 'Soft', normal: 'Normal' },
    theme: {
      ocean: 'Ocean',
      rain: 'Rain',
      campfire: 'Campfire',
      forest: 'Forest',
      mountains: 'Mountains',
      space: 'Space',
      nightCity: 'Night City',
      cabin: 'Cabin',
      fantasy: 'Fantasy',
    },
    category: {
      ocean: 'Ocean',
      rain: 'Rain',
      campfire: 'Campfire',
      forest: 'Forest',
      mountains: 'Mountains',
      space: 'Space',
      cities: 'Cities',
      meditation: 'Meditation',
      philosophy: 'Philosophy',
      love: 'Love',
      sleep: 'Sleep',
    },
    tone: { gentle: 'Gentle', romantic: 'Romantic', mature: 'Adult' },
  },

  nav: {
    home: 'Home',
    explore: 'Explore',
    create: 'Create',
    sessions: 'Sessions',
    profile: 'Profile',
  },
} as const

export type Dictionary = typeof en
