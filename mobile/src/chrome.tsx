import { useEffect } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useI18n } from './i18n'
import { FREE_MAX_MINUTES, PREMIUM_DURATIONS, PREMIUM_MAX_MINUTES, maxMinutesFor, type OptionKey } from './shared/domain/options'
import { OPTION_SETS } from './shared/domain/options'
import { useApp, type Screen } from './state/appState'
import { color, space } from './theme'
import { Button, Chip, Eyebrow, UiText, VoiceText, Wrap } from './ui'

/** The bar, the sheet, the paywall and the toast — everything that sits above a screen. */

interface Tab {
  id: Screen
  label: string
  owns?: readonly Screen[]
}

export function BottomNav() {
  const { t } = useI18n()
  const app = useApp()
  const insets = useSafeAreaInsets()

  const tabs: readonly Tab[] = [
    { id: 'home', label: t.nav.home },
    { id: 'explore', label: t.nav.explore },
    { id: 'create', label: t.nav.create },
    { id: 'nights', label: t.nav.sessions, owns: ['detail'] },
    {
      id: 'profile',
      label: t.nav.profile,
      owns: ['privacy', 'premium', 'notif', 'companion', 'memory'],
    },
  ]

  return (
    <View style={[styles.nav, { height: space.navHeight + insets.bottom, paddingBottom: insets.bottom + 18 }]}>
      {tabs.map((tab) => {
        const active = app.screen === tab.id || !!tab.owns?.includes(app.screen)
        const isCreate = tab.id === 'create'
        return (
          <Pressable
            key={tab.id}
            onPress={() => app.go(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            style={styles.tab}
          >
            <View
              style={
                isCreate
                  ? [styles.orb, active && styles.orbActive]
                  : [styles.dot, active && styles.dotActive]
              }
            />
            <UiText size={10.5} tone={active ? 'rgba(242,243,255,0.9)' : color.ink35}>
              {tab.label}
            </UiText>
          </Pressable>
        )
      })}
    </View>
  )
}

function ChoiceChips({ optionKey, label }: { optionKey: OptionKey; label: string }) {
  const { t } = useI18n()
  const app = useApp()
  const labels = t.options[optionKey] as Record<string, string>

  return (
    <View>
      <Eyebrow>{label}</Eyebrow>
      <View style={{ marginTop: 10 }}>
        <Wrap>
          {OPTION_SETS[optionKey].map((option) => (
            <Chip
              key={option}
              label={labels[option] ?? option}
              active={app.prefs[optionKey] === option}
              onPress={() => app.choose(optionKey, option)}
            />
          ))}
        </Wrap>
      </View>
    </View>
  )
}

export function SettingsSheet() {
  const { t, minutes } = useI18n()
  const app = useApp()
  const insets = useSafeAreaInsets()
  const allowed = maxMinutesFor(app.premium)

  return (
    <>
      <Pressable
        style={styles.backdrop}
        onPress={app.closeSheet}
        accessibilityRole="button"
        accessibilityLabel={t.common.close}
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 26 }]}>
        <View style={styles.grabber} />
        <ScrollView contentContainerStyle={{ gap: 22 }} showsVerticalScrollIndicator={false}>
          <ChoiceChips optionKey="voice" label={t.sheet.voice} />
          <ChoiceChips optionKey="mood" label={t.sheet.mood} />
          <ChoiceChips optionKey="amb" label={t.sheet.ambience} />
          <View>
            <Eyebrow>{t.sheet.duration}</Eyebrow>
            <View style={{ marginTop: 10 }}>
              <Wrap>
                {PREMIUM_DURATIONS.map((option) => {
                  const locked = option > allowed
                  return (
                    <Chip
                      key={option}
                      label={minutes(option)}
                      active={app.minutes === option}
                      disabled={locked}
                      onPress={() => (locked ? app.openPaywall() : app.setMinutes(option))}
                    />
                  )
                })}
              </Wrap>
            </View>
          </View>
        </ScrollView>
        <Button
          label={t.common.done}
          block
          height={54}
          fontSize={14}
          style={{ marginTop: 18 }}
          onPress={app.closeSheet}
        />
      </View>
    </>
  )
}

export function Paywall() {
  const { t, f } = useI18n()
  const app = useApp()
  const insets = useSafeAreaInsets()

  return (
    <>
      <Pressable
        style={styles.backdrop}
        onPress={app.closePaywall}
        accessibilityRole="button"
        accessibilityLabel={t.common.close}
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 26 }]}>
        <View style={styles.grabber} />
        <View style={styles.paywallMoon} />
        <VoiceText size={24} italic={false} center tone={color.inkBrightest}>
          {t.paywall.title}
        </VoiceText>
        <UiText size={13.5} center style={{ marginTop: 10 }}>
          {f(t.paywall.body, { free: FREE_MAX_MINUTES, premium: PREMIUM_MAX_MINUTES })}
        </UiText>
        <Button
          label={t.paywall.cta}
          variant="gradientEmber"
          block
          height={54}
          fontSize={15}
          style={{ marginTop: 20 }}
          onPress={() => {
            app.closePaywall()
            app.go('premium')
          }}
        />
        <Button
          label={t.paywall.later}
          variant="ghost"
          block
          height={44}
          fontSize={13}
          style={{ marginTop: 8 }}
          onPress={app.closePaywall}
        />
      </View>
    </>
  )
}

const TOAST_MS = 3200

function resolve(path: string, dictionary: Record<string, unknown>): string {
  let node: unknown = dictionary
  for (const key of path.split('.')) {
    if (!node || typeof node !== 'object') return ''
    node = (node as Record<string, unknown>)[key]
  }
  return typeof node === 'string' ? node : ''
}

export function Toast() {
  const { t } = useI18n()
  const app = useApp()
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (!app.toast) return
    const id = setTimeout(app.dismissToast, TOAST_MS)
    return () => clearTimeout(id)
  }, [app.toast, app.dismissToast])

  if (!app.toast) return null
  const message = resolve(app.toast, t as unknown as Record<string, unknown>)
  if (!message) return null

  return (
    <View style={[styles.toast, { bottom: space.navHeight + insets.bottom + 12 }]}>
      <UiText size={13} tone="rgba(234,236,247,0.8)" center>
        {message}
      </UiText>
    </View>
  )
}

const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(5,7,15,0.94)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
  tab: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(234,236,247,0.28)' },
  dotActive: { backgroundColor: 'rgba(234,236,247,0.9)', transform: [{ scale: 1.25 }] },
  orb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#9EA2F0',
    shadowColor: '#8B93FF',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  orbActive: { shadowOpacity: 0.85 },
  backdrop: { ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, backgroundColor: 'rgba(3,5,11,0.7)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#0F1430',
    borderTopWidth: 1,
    borderTopColor: color.lineHi,
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(234,236,247,0.2)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  paywallMoon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C3A9E8',
    alignSelf: 'center',
    marginBottom: 18,
  },
  toast: {
    position: 'absolute',
    left: 22,
    right: 22,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(18,23,50,0.96)',
    borderWidth: 1,
    borderColor: color.lineHi,
  },
})
