import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as ai from '../ai/client'
import type { Capabilities, Reflection, SessionPlan, ToneId } from '../ai/contracts'
import { EMPTY_MEMORY } from '../ai/contracts'
import {
  FREE_MAX_MINUTES,
  PREMIUM_MAX_MINUTES,
  maxMinutesFor,
  type OptionKey,
  type ThemeId,
} from '../domain/options'
import { describeSky, readSky, type SkyReading } from '../env/sky'
import { preferredLanguage, type LanguageId } from '../i18n'
import type { Screen } from '../types'
import { forget, isMemoryEmpty, rememberNight, type MemoryBucket } from './memory'
import { DEFAULT_PREFERENCES, type Preferences } from './preferences'
import {
  clearPersisted,
  INITIAL_PERSISTED,
  loadPersisted,
  savePersisted,
  type Persisted,
  type SavedNight,
} from './storage'

export const SPLASH_MS = 3000
export const DIM_MS = 5000
export const FADE_MS = 5200

/** Roughly three minutes of speech per generated segment. */
export const MINUTES_PER_SEGMENT = 3

const NAV_SCREENS: readonly Screen[] = [
  'home',
  'explore',
  'create',
  'nights',
  'profile',
  'companion',
  'privacy',
  'premium',
  'notif',
  'memory',
]

/** Screens shown before the app proper — no nav, no ambient chrome decisions. */
const GATE_SCREENS: readonly Screen[] = ['splash', 'language', 'consent']

interface Ephemeral {
  screen: Screen
  ob: number
  prompt: string
  minutes: number
  themes: ThemeId[]
  sheet: boolean
  paywall: boolean
  planning: boolean
  plan: SessionPlan | null
  planError: boolean
  ui: boolean
  talk: boolean
  playing: boolean
  muted: boolean
  fav: boolean
  nightsEmpty: boolean
  cat: string
  billing: 'monthly' | 'yearly'
  purchasing: boolean
  /** Seconds already spent inside the current session. */
  elapsed: number
  /** Ambient bed volume, 0–1, driven by the session's mix slider. */
  ambienceLevel: number
  reflection: Reflection | null
  transcript: string
  /** The last weather reading, when the listener asked for one. */
  sky: SkyReading | null
  toast: string | null
}

const INITIAL_EPHEMERAL: Ephemeral = {
  screen: 'splash',
  ob: 0,
  prompt: '',
  minutes: 10,
  themes: ['rain', 'campfire'],
  sheet: false,
  paywall: false,
  planning: false,
  plan: null,
  planError: false,
  ui: true,
  talk: false,
  playing: true,
  muted: false,
  fav: true,
  nightsEmpty: false,
  cat: 'rain',
  billing: 'yearly',
  purchasing: false,
  elapsed: 0,
  ambienceLevel: 0.62,
  reflection: null,
  transcript: '',
  sky: null,
  toast: null,
}

interface Store extends Ephemeral, Omit<Persisted, 'lang' | 'tone'> {
  lang: LanguageId
  tone: ToneId
  caps: Capabilities
  showNav: boolean
  maxMinutes: number
  memoryEmpty: boolean
  /** The real weather in one sentence, or undefined when it was never read. */
  skyLine: string | undefined

  go: (screen: Screen) => void
  chooseLanguage: (lang: LanguageId) => void
  /** Switches language without leaving the current screen. */
  chooseLanguageInPlace: (lang: LanguageId) => void
  acceptConsent: (input: { ageConfirmed: boolean; tone: ToneId }) => void
  nextOnboarding: () => void
  finishOnboarding: () => void

  setPrompt: (value: string) => void
  useExamplePrompt: (text: string) => void
  toggleTheme: (theme: ThemeId) => void
  setMinutes: (minutes: number) => void
  choose: (key: OptionKey, value: string) => void
  setTone: (tone: ToneId) => void

  openSheet: () => void
  closeSheet: () => void
  openPaywall: () => void
  closePaywall: () => void

  startNight: () => void
  retryPlan: () => void
  enterSession: () => void

  togglePlay: () => void
  toggleMuted: () => void
  openTalk: () => void
  closeTalk: () => void
  wakeUi: () => void
  tickElapsed: (seconds: number) => void
  setAmbienceLevel: (level: number) => void
  appendTranscript: (text: string) => void
  endNight: (to: Extract<Screen, 'fade' | 'complete'>) => void

  saveNight: () => void
  toggleFav: () => void
  toggleNightsEmpty: () => void
  setCategory: (value: string) => void
  setBilling: (value: 'monthly' | 'yearly') => void
  purchasePremium: () => void
  cancelPremium: () => void
  toggleNotif: (key: string) => void
  setUseRealSky: (on: boolean) => void
  forgetMemory: (bucket: MemoryBucket, text: string) => void
  forgetAllMemory: () => void
  deleteEverything: () => void
  exportData: () => void
  dismissToast: () => void
}

const AppContext = createContext<Store | null>(null)

function screenFromHash(): Screen | null {
  const slug = window.location.hash.replace(/^#\/?/, '')
  return SCREEN_SLUGS.has(slug) ? (slug as Screen) : null
}

const SCREEN_SLUGS = new Set<string>([
  'splash',
  'language',
  'consent',
  'onboarding',
  'home',
  'create',
  'generating',
  'session',
  'fade',
  'complete',
  'explore',
  'nights',
  'detail',
  'companion',
  'profile',
  'privacy',
  'premium',
  'notif',
  'memory',
  'error',
])

export function AppProvider({ children }: { children: ReactNode }) {
  const [persisted, setPersisted] = useState<Persisted>(loadPersisted)
  const [state, setState] = useState<Ephemeral>(() => {
    const fromHash = screenFromHash()
    return fromHash ? { ...INITIAL_EPHEMERAL, screen: fromHash } : INITIAL_EPHEMERAL
  })
  const [caps, setCaps] = useState<Capabilities>(ai.OFFLINE)

  const stateRef = useRef(state)
  stateRef.current = state
  const persistedRef = useRef(persisted)
  persistedRef.current = persisted
  const capsRef = useRef(caps)
  capsRef.current = caps

  const timers = useRef<number[]>([])
  const dimTimer = useRef<number | null>(null)
  const planRun = useRef(0)

  const lang: LanguageId = persisted.lang ?? preferredLanguage()
  const tone: ToneId = persisted.tone ?? 'gentle'

  useEffect(() => {
    void ai.fetchCapabilities().then(setCaps)
  }, [])

  useEffect(() => {
    savePersisted(persisted)
  }, [persisted])

  const after = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }, [])

  const clearTimers = useCallback(() => {
    timers.current.forEach(window.clearTimeout)
    timers.current = []
    if (dimTimer.current !== null) {
      window.clearTimeout(dimTimer.current)
      dimTimer.current = null
    }
  }, [])

  const go = useCallback(
    (screen: Screen) => {
      clearTimers()
      setState((s) => ({
        ...s,
        screen,
        sheet: false,
        paywall: false,
        talk: false,
        ui: true,
        ...(screen === 'session' ? {} : { elapsed: 0 }),
      }))
    },
    [clearTimers],
  )

  const scheduleDim = useCallback(() => {
    if (dimTimer.current !== null) window.clearTimeout(dimTimer.current)
    dimTimer.current = window.setTimeout(() => {
      dimTimer.current = null
      setState((s) => (s.talk ? s : { ...s, ui: false }))
    }, DIM_MS)
  }, [])

  /** Where the splash hands over depends on what this device already knows. */
  const firstScreen = useCallback((): Screen => {
    const p = persistedRef.current
    if (!p.lang) return 'language'
    if (!p.tone) return 'consent'
    if (!p.onboarded) return 'onboarding'
    return 'home'
  }, [])

  useEffect(() => {
    const screen = state.screen
    if (screen === 'splash') {
      after(() => go(firstScreen()), SPLASH_MS)
    } else if (screen === 'session') {
      scheduleDim()
    } else if (screen === 'fade') {
      after(() => go('complete'), FADE_MS)
    }
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.screen])

  useEffect(() => {
    const slug = `#/${state.screen}`
    if (window.location.hash !== slug) window.history.replaceState(null, '', slug)
  }, [state.screen])

  useEffect(() => {
    const onHashChange = () => {
      const next = screenFromHash()
      if (next && next !== stateRef.current.screen) go(next)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [go])

  useEffect(() => clearTimers, [clearTimers])

  /** Reads the prompt, then moves to the session as soon as a plan exists. */
  const runPlan = useCallback(async () => {
    const run = ++planRun.current
    const s = stateRef.current
    const p = persistedRef.current
    setState((prev) => ({ ...prev, planning: true, planError: false, plan: null }))

    try {
      const plan = await ai.plan(
        {
          lang: p.lang ?? preferredLanguage(),
          prompt: s.prompt.trim(),
          minutes: s.minutes,
          tone: p.tone ?? 'gentle',
          prefs: p.prefs,
          memory: p.memory,
          sky: s.sky ? describeSky(s.sky, p.lang ?? preferredLanguage()) : undefined,
        },
        capsRef.current,
      )
      if (run !== planRun.current) return
      setState((prev) => ({
        ...prev,
        planning: false,
        // A real sky, when the listener allowed one, beats a guessed one.
        plan: prev.sky ? { ...plan, ambience: prev.sky.ambience } : plan,
      }))
    } catch {
      if (run !== planRun.current) return
      setState((prev) => ({ ...prev, planning: false, planError: true }))
    }
  }, [])

  const actions = useMemo(
    () => ({
      go,

      chooseLanguage: (next: LanguageId) => {
        setPersisted((p) => ({ ...p, lang: next }))
        go(persistedRef.current.tone ? 'onboarding' : 'consent')
      },

      chooseLanguageInPlace: (next: LanguageId) =>
        setPersisted((p) => ({ ...p, lang: next })),

      acceptConsent: ({ ageConfirmed, tone: next }: { ageConfirmed: boolean; tone: ToneId }) => {
        setPersisted((p) => ({ ...p, ageConfirmed, tone: next }))
        go(persistedRef.current.onboarded ? 'home' : 'onboarding')
      },

      nextOnboarding: () => {
        if (stateRef.current.ob >= 4) {
          setPersisted((p) => ({ ...p, onboarded: true }))
          go('home')
        } else {
          setState((s) => ({ ...s, ob: s.ob + 1 }))
        }
      },

      finishOnboarding: () => {
        setPersisted((p) => ({ ...p, onboarded: true }))
        go('home')
      },

      setPrompt: (prompt: string) => setState((s) => ({ ...s, prompt })),
      useExamplePrompt: (text: string) => setState((s) => ({ ...s, prompt: text })),

      toggleTheme: (theme: ThemeId) =>
        setState((s) => ({
          ...s,
          themes: s.themes.includes(theme)
            ? s.themes.filter((t) => t !== theme)
            : [...s.themes, theme],
        })),

      setMinutes: (minutes: number) => {
        if (minutes > maxMinutesFor(persistedRef.current.premium)) {
          setState((s) => ({ ...s, paywall: true }))
          return
        }
        setState((s) => ({ ...s, minutes }))
      },

      choose: (key: OptionKey, value: string) =>
        setPersisted((p) => ({ ...p, prefs: { ...p.prefs, [key]: value } as Preferences })),

      setTone: (next: ToneId) => setPersisted((p) => ({ ...p, tone: next })),

      openSheet: () => setState((s) => ({ ...s, sheet: true })),
      closeSheet: () => setState((s) => ({ ...s, sheet: false })),
      openPaywall: () => setState((s) => ({ ...s, paywall: true })),
      closePaywall: () => setState((s) => ({ ...s, paywall: false })),

      startNight: () => {
        go('generating')
        void runPlan()
      },

      retryPlan: () => {
        void runPlan()
      },

      enterSession: () => {
        setState((s) => ({ ...s, elapsed: 0, transcript: '', playing: true }))
        go('session')
      },

      togglePlay: () => setState((s) => ({ ...s, playing: !s.playing })),
      toggleMuted: () => setState((s) => ({ ...s, muted: !s.muted })),

      openTalk: () => {
        if (dimTimer.current !== null) {
          window.clearTimeout(dimTimer.current)
          dimTimer.current = null
        }
        setState((s) => ({ ...s, talk: true, ui: true }))
      },

      closeTalk: () => {
        setState((s) => ({ ...s, talk: false, ui: true }))
        scheduleDim()
      },

      wakeUi: () => {
        const s = stateRef.current
        if (s.ui || s.talk) return
        setState((prev) => ({ ...prev, ui: true }))
        scheduleDim()
      },

      tickElapsed: (seconds: number) => setState((s) => ({ ...s, elapsed: seconds })),

      setAmbienceLevel: (level: number) =>
        setState((s) => ({ ...s, ambienceLevel: Math.min(1, Math.max(0, level)) })),

      appendTranscript: (text: string) =>
        setState((s) => ({ ...s, transcript: `${s.transcript}${text}` })),

      /** Closes the night out and learns from it. */
      endNight: (to: 'fade' | 'complete') => {
        const s = stateRef.current
        const p = persistedRef.current
        go(to)

        void ai
          .reflect(
            {
              lang: p.lang ?? preferredLanguage(),
              prompt: s.prompt.trim() || s.plan?.scene || '',
              plan: s.plan,
              transcript: s.transcript,
              memory: p.memory,
            },
            capsRef.current,
          )
          .then((reflection) => {
            setState((prev) => ({ ...prev, reflection }))
            setPersisted((prev) => ({
              ...prev,
              memory: rememberNight(prev.memory, reflection, new Date().toISOString().slice(0, 10)),
            }))
          })
          .catch(() => undefined)
      },

      saveNight: () => {
        const s = stateRef.current
        const night: SavedNight = {
          id: `${Date.now()}`,
          title: s.plan?.title ?? s.prompt.slice(0, 40),
          prompt: s.prompt,
          minutes: s.minutes,
          at: new Date().toISOString().slice(0, 10),
          ambience: s.plan?.ambience ?? persistedRef.current.prefs.amb,
          personaWho: s.plan?.persona.who ?? '',
        }
        setPersisted((p) => ({ ...p, nights: [night, ...p.nights].slice(0, 100) }))
        go('nights')
      },

      toggleFav: () => setState((s) => ({ ...s, fav: !s.fav })),
      toggleNightsEmpty: () => setState((s) => ({ ...s, nightsEmpty: !s.nightsEmpty })),
      setCategory: (cat: string) => setState((s) => ({ ...s, cat })),
      setBilling: (billing: 'monthly' | 'yearly') => setState((s) => ({ ...s, billing })),

      /**
       * Stands in for a real store purchase. Everything downstream of premium
       * reads the flag, so swapping this for StoreKit / Play Billing is a
       * change to this function only.
       */
      purchasePremium: () => {
        setState((s) => ({ ...s, purchasing: true }))
        window.setTimeout(() => {
          setPersisted((p) => ({ ...p, premium: true }))
          setState((s) => ({ ...s, purchasing: false, paywall: false, toast: 'premium.purchased' }))
        }, 900)
      },

      cancelPremium: () => {
        setPersisted((p) => ({ ...p, premium: false }))
        setState((s) => ({
          ...s,
          minutes: Math.min(s.minutes, FREE_MAX_MINUTES),
        }))
      },

      toggleNotif: (key: string) =>
        setPersisted((p) => ({ ...p, notifOn: { ...p.notifOn, [key]: !p.notifOn[key] } })),

      /**
       * Opt-in, and it stays off if the browser says no. Turning it off forgets
       * the reading immediately rather than waiting for the next night.
       */
      setUseRealSky: (on: boolean) => {
        setPersisted((p) => ({ ...p, useRealSky: on }))
        if (!on) {
          setState((s) => ({ ...s, sky: null }))
          return
        }
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          setPersisted((p) => ({ ...p, useRealSky: false }))
          return
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            void readSky(position.coords.latitude, position.coords.longitude).then((sky) => {
              if (sky) setState((s) => ({ ...s, sky }))
              else setPersisted((p) => ({ ...p, useRealSky: false }))
            })
          },
          () => setPersisted((p) => ({ ...p, useRealSky: false })),
          { enableHighAccuracy: false, maximumAge: 30 * 60 * 1000, timeout: 10_000 },
        )
      },

      forgetMemory: (bucket: MemoryBucket, text: string) =>
        setPersisted((p) => ({ ...p, memory: forget(p.memory, bucket, text) })),

      forgetAllMemory: () => {
        setPersisted((p) => ({ ...p, memory: EMPTY_MEMORY }))
        setState((s) => ({ ...s, toast: 'memory.forgotten' }))
      },

      deleteEverything: () => {
        clearPersisted()
        const language = persistedRef.current.lang
        setPersisted({ ...INITIAL_PERSISTED, lang: language, onboarded: true })
        setState((s) => ({ ...s, toast: 'privacy.deleted' }))
      },

      exportData: () => {
        const blob = new Blob([JSON.stringify(persistedRef.current, null, 2)], {
          type: 'application/json',
        })
        const href = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = href
        link.download = 'dreamscape-data.json'
        link.click()
        URL.revokeObjectURL(href)
      },

      dismissToast: () => setState((s) => ({ ...s, toast: null })),
    }),
    [go, runPlan, scheduleDim],
  )

  const value = useMemo<Store>(
    () => ({
      ...state,
      ...persisted,
      ...actions,
      lang,
      tone,
      caps,
      showNav:
        NAV_SCREENS.includes(state.screen) &&
        !state.sheet &&
        !state.paywall &&
        !GATE_SCREENS.includes(state.screen),
      maxMinutes: persisted.premium ? PREMIUM_MAX_MINUTES : FREE_MAX_MINUTES,
      memoryEmpty: isMemoryEmpty(persisted.memory),
      skyLine: state.sky ? describeSky(state.sky, lang) : undefined,
    }),
    [state, persisted, actions, lang, tone, caps],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): Store {
  const store = useContext(AppContext)
  if (!store) throw new Error('useApp must be used inside <AppProvider>')
  return store
}

export { DEFAULT_PREFERENCES }
