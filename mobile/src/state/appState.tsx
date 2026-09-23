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
import { describeSky, readSky, type SkyReading } from '../shared/env/sky'
import type { Capabilities, Reflection, SessionPlan, ToneId } from '../shared/ai/contracts'
import { EMPTY_MEMORY } from '../shared/ai/contracts'
import {
  FREE_MAX_MINUTES,
  PREMIUM_MAX_MINUTES,
  maxMinutesFor,
  type OptionKey,
  type ThemeId,
} from '../shared/domain/options'
import { forget, isMemoryEmpty, rememberNight, type MemoryBucket } from '../shared/state/memory'
import type { Preferences } from '../shared/state/preferences'
import type { LanguageId } from '../i18n'
import {
  clearPersisted,
  INITIAL_PERSISTED,
  loadPersisted,
  savePersisted,
  type Persisted,
  type SavedNight,
} from './storage'

export const SPLASH_MS = 3000
export const FADE_MS = 5200
export const MINUTES_PER_SEGMENT = 3

export type Screen =
  | 'splash'
  | 'language'
  | 'consent'
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
  | 'memory'

const NAV_SCREENS: readonly Screen[] = [
  'home', 'explore', 'create', 'nights', 'profile',
  'companion', 'privacy', 'premium', 'notif', 'memory',
]

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
  talk: boolean
  playing: boolean
  muted: boolean
  fav: boolean
  cat: string
  billing: 'monthly' | 'yearly'
  purchasing: boolean
  elapsed: number
  ambienceLevel: number
  reflection: Reflection | null
  transcript: string
  sky: SkyReading | null
  toast: string | null
}

const INITIAL: Ephemeral = {
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
  talk: false,
  playing: true,
  muted: false,
  fav: true,
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
  ready: boolean
  showNav: boolean
  maxMinutes: number
  memoryEmpty: boolean
  /** The real weather in one sentence, or undefined when it was never read. */
  skyLine: string | undefined

  go: (screen: Screen) => void
  chooseLanguage: (lang: LanguageId) => void
  chooseLanguageInPlace: (lang: LanguageId) => void
  acceptConsent: (input: { ageConfirmed: boolean; tone: ToneId }) => void
  nextOnboarding: () => void
  finishOnboarding: () => void

  setPrompt: (value: string) => void
  toggleTheme: (theme: ThemeId) => void
  setMinutes: (minutes: number) => void
  choose: (key: OptionKey, value: string) => void

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
  tickElapsed: (seconds: number) => void
  setAmbienceLevel: (level: number) => void
  appendTranscript: (text: string) => void
  endNight: (to: 'fade' | 'complete') => void

  saveNight: () => void
  toggleFav: () => void
  setCategory: (value: string) => void
  setBilling: (value: 'monthly' | 'yearly') => void
  purchasePremium: () => void
  cancelPremium: () => void
  toggleNotif: (key: string) => void
  setUseRealSky: (on: boolean) => void
  forgetMemory: (bucket: MemoryBucket, text: string) => void
  forgetAllMemory: () => void
  deleteEverything: () => void
  dismissToast: () => void
}

const AppContext = createContext<Store | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [persisted, setPersisted] = useState<Persisted>(INITIAL_PERSISTED)
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<Ephemeral>(INITIAL)
  const [caps, setCaps] = useState<Capabilities>(ai.OFFLINE)

  const stateRef = useRef(state)
  stateRef.current = state
  const persistedRef = useRef(persisted)
  persistedRef.current = persisted
  const capsRef = useRef(caps)
  capsRef.current = caps

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const planRun = useRef(0)

  const lang: LanguageId = persisted.lang ?? 'en'
  const tone: ToneId = persisted.tone ?? 'gentle'

  /* Storage is asynchronous here, so the splash waits for it rather than
   * flashing the language gate at somebody who chose one months ago. */
  useEffect(() => {
    let alive = true
    void loadPersisted().then((value) => {
      if (!alive) return
      setPersisted(value)
      setReady(true)
    })
    void ai.fetchCapabilities().then((value) => alive && setCaps(value))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (ready) void savePersisted(persisted)
  }, [persisted, ready])

  const after = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms)
    timers.current.push(id)
  }, [])

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
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
        ...(screen === 'session' ? {} : { elapsed: 0 }),
      }))
    },
    [clearTimers],
  )

  const firstScreen = useCallback((): Screen => {
    const p = persistedRef.current
    if (!p.lang) return 'language'
    if (!p.tone) return 'consent'
    if (!p.onboarded) return 'onboarding'
    return 'home'
  }, [])

  useEffect(() => {
    if (state.screen === 'splash') {
      if (ready) after(() => go(firstScreen()), SPLASH_MS)
    } else if (state.screen === 'fade') {
      after(() => go('complete'), FADE_MS)
    }
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.screen, ready])

  useEffect(() => clearTimers, [clearTimers])

  const runPlan = useCallback(async () => {
    const run = ++planRun.current
    const s = stateRef.current
    const p = persistedRef.current
    setState((prev) => ({ ...prev, planning: true, planError: false, plan: null }))

    try {
      const plan = await ai.plan(
        {
          lang: p.lang ?? 'en',
          prompt: s.prompt.trim(),
          minutes: s.minutes,
          tone: p.tone ?? 'gentle',
          prefs: p.prefs,
          memory: p.memory,
          sky: s.sky ? describeSky(s.sky, p.lang ?? 'en') : undefined,
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
      chooseLanguageInPlace: (next: LanguageId) => setPersisted((p) => ({ ...p, lang: next })),
      acceptConsent: ({ ageConfirmed, tone: next }: { ageConfirmed: boolean; tone: ToneId }) => {
        setPersisted((p) => ({ ...p, ageConfirmed, tone: next }))
        go(persistedRef.current.onboarded ? 'home' : 'onboarding')
      },
      nextOnboarding: () => {
        if (stateRef.current.ob >= 4) {
          setPersisted((p) => ({ ...p, onboarded: true }))
          go('home')
        } else setState((s) => ({ ...s, ob: s.ob + 1 }))
      },
      finishOnboarding: () => {
        setPersisted((p) => ({ ...p, onboarded: true }))
        go('home')
      },

      setPrompt: (prompt: string) => setState((s) => ({ ...s, prompt })),
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
      openTalk: () => setState((s) => ({ ...s, talk: true })),
      closeTalk: () => setState((s) => ({ ...s, talk: false })),
      tickElapsed: (seconds: number) => setState((s) => ({ ...s, elapsed: seconds })),
      setAmbienceLevel: (level: number) =>
        setState((s) => ({ ...s, ambienceLevel: Math.min(1, Math.max(0, level)) })),
      appendTranscript: (text: string) =>
        setState((s) => ({ ...s, transcript: `${s.transcript}${text}` })),

      endNight: (to: 'fade' | 'complete') => {
        const s = stateRef.current
        const p = persistedRef.current
        go(to)
        void ai
          .reflect(
            {
              lang: p.lang ?? 'en',
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
      setCategory: (cat: string) => setState((s) => ({ ...s, cat })),
      setBilling: (billing: 'monthly' | 'yearly') => setState((s) => ({ ...s, billing })),

      /** Stands in for a store purchase; everything downstream reads the flag. */
      purchasePremium: () => {
        setState((s) => ({ ...s, purchasing: true }))
        setTimeout(() => {
          setPersisted((p) => ({ ...p, premium: true }))
          setState((s) => ({ ...s, purchasing: false, paywall: false, toast: 'premium.purchased' }))
        }, 900)
      },
      cancelPremium: () => {
        setPersisted((p) => ({ ...p, premium: false }))
        setState((s) => ({ ...s, minutes: Math.min(s.minutes, FREE_MAX_MINUTES) }))
      },

      toggleNotif: (key: string) =>
        setPersisted((p) => ({ ...p, notifOn: { ...p.notifOn, [key]: !p.notifOn[key] } })),

      /**
       * Opt-in. Turning it on asks for location once and reads the weather;
       * turning it off forgets what was read.
       */
      setUseRealSky: (on: boolean) => {
        setPersisted((p) => ({ ...p, useRealSky: on }))
        if (!on) {
          setState((s) => ({ ...s, sky: null }))
          return
        }
        void (async () => {
          try {
            const Location = await import('expo-location')
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== 'granted') {
              setPersisted((p) => ({ ...p, useRealSky: false }))
              return
            }
            const position = await Location.getLastKnownPositionAsync()
            const point =
              position ??
              (await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Lowest,
              }))
            const sky = await readSky(point.coords.latitude, point.coords.longitude)
            setState((s) => ({ ...s, sky }))
          } catch {
            setPersisted((p) => ({ ...p, useRealSky: false }))
          }
        })()
      },

      forgetMemory: (bucket: MemoryBucket, text: string) =>
        setPersisted((p) => ({ ...p, memory: forget(p.memory, bucket, text) })),
      forgetAllMemory: () => {
        setPersisted((p) => ({ ...p, memory: EMPTY_MEMORY }))
        setState((s) => ({ ...s, toast: 'memory.forgotten' }))
      },
      deleteEverything: () => {
        void clearPersisted()
        const language = persistedRef.current.lang
        setPersisted({ ...INITIAL_PERSISTED, lang: language, onboarded: true })
        setState((s) => ({ ...s, toast: 'privacy.deleted' }))
      },
      dismissToast: () => setState((s) => ({ ...s, toast: null })),
    }),
    [go, runPlan],
  )

  const value = useMemo<Store>(
    () => ({
      ...state,
      ...persisted,
      ...actions,
      lang,
      tone,
      caps,
      ready,
      showNav: NAV_SCREENS.includes(state.screen) && !state.sheet && !state.paywall,
      maxMinutes: persisted.premium ? PREMIUM_MAX_MINUTES : FREE_MAX_MINUTES,
      memoryEmpty: isMemoryEmpty(persisted.memory),
      skyLine: state.sky ? describeSky(state.sky, lang) : undefined,
    }),
    [state, persisted, actions, lang, tone, caps, ready],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): Store {
  const store = useContext(AppContext)
  if (!store) throw new Error('useApp must be used inside <AppProvider>')
  return store
}
