import type { ComponentType } from 'react'
import { StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { BottomNav, Paywall, SettingsSheet, Toast } from './src/chrome'
import { I18nProvider } from './src/i18n'
import { Consent, Language, Onboarding, Splash } from './src/screens/Gates'
import { Create, Generating } from './src/screens/Create'
import { Home } from './src/screens/Home'
import { DreamDetail, Explore, MyNights } from './src/screens/Library'
import { Complete, Session, SleepFade } from './src/screens/Session'
import {
  Companion,
  MemoryScreen,
  Notifications,
  Premium,
  Privacy,
  Profile,
} from './src/screens/Settings'
import { AppProvider, useApp, type Screen } from './src/state/appState'
import { color } from './src/theme'

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
}

function Device() {
  const app = useApp()
  const Current = SCREENS[app.screen]

  return (
    <View style={styles.device}>
      <Current />
      {app.sheet && <SettingsSheet />}
      {app.paywall && <Paywall />}
      {app.showNav && <BottomNav />}
      <Toast />
    </View>
  )
}

function Shell() {
  const app = useApp()
  return (
    <I18nProvider lang={app.lang}>
      <Device />
    </I18nProvider>
  )
}

export function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  device: { flex: 1, backgroundColor: color.night },
})
