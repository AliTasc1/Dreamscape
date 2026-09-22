import { useEffect, type ComponentType } from 'react'
import { BottomNav } from './chrome/BottomNav'
import { Paywall } from './chrome/Paywall'
import { SettingsSheet } from './chrome/SettingsSheet'
import { Sky } from './chrome/Sky'
import { Toast } from './chrome/Toast'
import { I18nProvider, useI18n } from './i18n'
import { Companion } from './screens/Companion'
import { Complete } from './screens/Complete'
import { Consent } from './screens/Consent'
import { Create } from './screens/Create'
import { DreamDetail } from './screens/DreamDetail'
import { ErrorScreen } from './screens/ErrorScreen'
import { Explore } from './screens/Explore'
import { Generating } from './screens/Generating'
import { Home } from './screens/Home'
import { Language } from './screens/Language'
import { MemoryScreen } from './screens/MemoryScreen'
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
  language: Language,
  consent: Consent,
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
  memory: MemoryScreen,
  error: ErrorScreen,
}

function Device() {
  const { screen, sheet, paywall, showNav } = useApp()
  const { t } = useI18n()
  const Current = SCREENS[screen]

  useEffect(() => {
    document.title = t.common.appName
  }, [t])

  return (
    <main className={styles.device}>
      <Sky />
      <Current />
      {sheet && <SettingsSheet />}
      {paywall && <Paywall />}
      {showNav && <BottomNav />}
      <Toast />
    </main>
  )
}

export function App() {
  const { lang } = useApp()
  return (
    <I18nProvider lang={lang}>
      <Device />
    </I18nProvider>
  )
}
