import { useEffect, type ComponentType } from 'react'
import { BottomNav } from './chrome/BottomNav'
import { SettingsSheet } from './chrome/SettingsSheet'
import { Sky } from './chrome/Sky'
import { Companion } from './screens/Companion'
import { Complete } from './screens/Complete'
import { Create } from './screens/Create'
import { DreamDetail } from './screens/DreamDetail'
import { ErrorScreen } from './screens/ErrorScreen'
import { Explore } from './screens/Explore'
import { Generating } from './screens/Generating'
import { Home } from './screens/Home'
import { MyNights } from './screens/MyNights'
import { Notifications } from './screens/Notifications'
import { Onboarding } from './screens/Onboarding'
import { Premium } from './screens/Premium'
import { Privacy } from './screens/Privacy'
import { Profile } from './screens/Profile'
import { Session } from './screens/Session'
import { SleepFade } from './screens/SleepFade'
import { Splash } from './screens/Splash'
import { useApp } from './state/appState'
import type { Screen } from './types'
import styles from './App.module.css'

const SCREENS: Record<Screen, ComponentType> = {
  splash: Splash,
  onboarding: Onboarding,
  home: Home,
  create: Create,
  generating: Generating,
  session: Session,
  fade: SleepFade,
  complete: Complete,
  explore: Explore,
  nights: MyNights,
  detail: DreamDetail,
  companion: Companion,
  profile: Profile,
  privacy: Privacy,
  premium: Premium,
  notif: Notifications,
  error: ErrorScreen,
}

export function App() {
  const { screen, sheet, showNav, screenTitle } = useApp()
  const Current = SCREENS[screen]

  useEffect(() => {
    document.title = `Dreamscape · ${screenTitle}`
  }, [screenTitle])

  return (
    <main className={styles.device}>
      <Sky />
      <Current />
      {sheet && <SettingsSheet />}
      {showNav && <BottomNav />}
    </main>
  )
}
