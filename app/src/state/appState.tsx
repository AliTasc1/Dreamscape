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
import { EXAMPLE_PROMPT, ONBOARDING, SCREEN_TITLES } from '../data/content'
import type { ChoiceKey, Screen } from '../types'

/* The prototype's pacing, kept exactly. Nothing here is a round number by
 * accident — the whole app is built to get quieter as sleep gets closer. */
export const SPLASH_MS = 3000
export const GEN_STEP_MS = 1200
export const GEN_STEPS = 4
export const DIM_MS = 5000
export const FADE_MS = 5200

/** Index of the last onboarding step. */
const ONBOARDING_LAST = ONBOARDING.length - 1

/** Screens that keep the bottom nav. Detail is a drill-down: it has its own
 * back button and a full-width CTA, so the nav steps aside there. */
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
]

export interface Preferences {
  voice: string
  mood: string
  amb: string
  dur: string
  personality: string
  style: string
  speed: string
  intensity: string
}

interface State extends Preferences {
  screen: Screen
  ob: number
  prompt: string
  chips: string[]
  sheet: boolean
  gen: number
  ready: boolean
  ui: boolean
  talk: boolean
  playing: boolean
  fav: boolean
  nightsEmpty: boolean
  cat: string
  plan: string
  notifOn: Record<string, boolean>
}

const INITIAL: State = {
  screen: 'splash',
  ob: 0,
  prompt: '',
  chips: ['Rain', 'Campfire'],
  voice: 'Warm',
  mood: 'Calm',
  amb: 'Rain',
  dur: 'Until sleep',
  personality: 'Gentle',
  style: 'Story',
  speed: 'Slow',
  intensity: 'Soft',
  sheet: false,
  gen: 0,
  ready: false,
  ui: true,
  talk: false,
  playing: true,
  fav: true,
  nightsEmpty: false,
  cat: 'Rain',
  plan: 'Yearly',
  notifOn: {
    'Bedtime invitation': true,
    'New worlds weekly': false,
    'Session finished': false,
    'Quiet hours': true,
  },
}

interface Actions {
  go: (screen: Screen) => void
  nextOnboarding: () => void
  setPrompt: (value: string) => void
  useExamplePrompt: () => void
  toggleChip: (chip: string) => void
  choose: (key: ChoiceKey, value: string) => void
  openSheet: () => void
  closeSheet: () => void
  togglePlay: () => void
  openTalk: () => void
  closeTalk: () => void
  wakeUi: () => void
  toggleFav: () => void
  toggleNightsEmpty: () => void
  setCategory: (value: string) => void
  setPlan: (value: string) => void
  toggleNotif: (label: string) => void
}

interface Store extends State, Actions {
  showNav: boolean
  settingsSummary: string
  screenTitle: string
}

const AppContext = createContext<Store | null>(null)

function screenFromHash(): Screen | null {
  const slug = window.location.hash.replace(/^#\/?/, '')
  return slug in SCREEN_TITLES ? (slug as Screen) : null
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => {
    const fromHash = screenFromHash()
    return fromHash ? { ...INITIAL, screen: fromHash } : INITIAL
  })

  /* Actions live outside the render closure, so they read the latest state
   * through a ref rather than a stale capture. */
  const stateRef = useRef(state)
  stateRef.current = state

  /* Every screen owns its timers; leaving the screen cancels them. */
  const timers = useRef<number[]>([])
  const interval = useRef<number | null>(null)
  const dimTimer = useRef<number | null>(null)

  const after = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }, [])

  const clearTimers = useCallback(() => {
    timers.current.forEach(window.clearTimeout)
    timers.current = []
    if (interval.current !== null) {
      window.clearInterval(interval.current)
      interval.current = null
    }
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
        talk: false,
        ui: true,
        gen: 0,
        ready: false,
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

  /* Screen-entry behaviour: the splash dissolves, generation advances on its
   * own, the session dims itself, the sleep fade hands over to the summary. */
  useEffect(() => {
    const screen = state.screen

    if (screen === 'splash') {
      after(() => go('onboarding'), SPLASH_MS)
    } else if (screen === 'generating') {
      interval.current = window.setInterval(() => {
        setState((s) => {
          const gen = s.gen + 1
          if (gen >= GEN_STEPS) {
            if (interval.current !== null) {
              window.clearInterval(interval.current)
              interval.current = null
            }
            return { ...s, gen: GEN_STEPS, ready: true }
          }
          return { ...s, gen }
        })
      }, GEN_STEP_MS)
    } else if (screen === 'session') {
      scheduleDim()
    } else if (screen === 'fade') {
      after(() => go('complete'), FADE_MS)
    }

    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.screen])

  /* The address bar mirrors the current screen, so any of the seventeen can be
   * opened directly (#/premium, #/error) without a screen-picker in the UI. */
  useEffect(() => {
    const slug = `#/${state.screen}`
    if (window.location.hash !== slug) {
      window.history.replaceState(null, '', slug)
    }
  }, [state.screen])

  useEffect(() => {
    const onHashChange = () => {
      const next = screenFromHash()
      if (next && next !== state.screen) go(next)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [go, state.screen])

  useEffect(() => clearTimers, [clearTimers])

  const actions = useMemo<Actions>(
    () => ({
      go,
      nextOnboarding: () => {
        if (stateRef.current.ob >= ONBOARDING_LAST) go('home')
        else setState((s) => ({ ...s, ob: s.ob + 1 }))
      },
      setPrompt: (prompt) => setState((s) => ({ ...s, prompt })),
      useExamplePrompt: () => setState((s) => ({ ...s, prompt: EXAMPLE_PROMPT })),
      toggleChip: (chip) =>
        setState((s) => ({
          ...s,
          chips: s.chips.includes(chip)
            ? s.chips.filter((c) => c !== chip)
            : [...s.chips, chip],
        })),
      choose: (key, value) => setState((s) => ({ ...s, [key]: value })),
      openSheet: () => setState((s) => ({ ...s, sheet: true })),
      closeSheet: () => setState((s) => ({ ...s, sheet: false })),
      togglePlay: () => setState((s) => ({ ...s, playing: !s.playing })),
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
        setState((st) => ({ ...st, ui: true }))
        scheduleDim()
      },
      toggleFav: () => setState((s) => ({ ...s, fav: !s.fav })),
      toggleNightsEmpty: () => setState((s) => ({ ...s, nightsEmpty: !s.nightsEmpty })),
      setCategory: (cat) => setState((s) => ({ ...s, cat })),
      setPlan: (plan) => setState((s) => ({ ...s, plan })),
      toggleNotif: (label) =>
        setState((s) => ({
          ...s,
          notifOn: { ...s.notifOn, [label]: !s.notifOn[label] },
        })),
    }),
    [go, scheduleDim],
  )

  const value = useMemo<Store>(
    () => ({
      ...state,
      ...actions,
      showNav: NAV_SCREENS.includes(state.screen) && !state.sheet,
      settingsSummary: `${state.voice} voice · ${state.mood} · ${state.amb} · ${state.dur}`,
      screenTitle: SCREEN_TITLES[state.screen],
    }),
    [state, actions],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): Store {
  const store = useContext(AppContext)
  if (!store) throw new Error('useApp must be used inside <AppProvider>')
  return store
}
