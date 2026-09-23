import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native'
import { useI18n } from '../i18n'
import { PREMIUM_DURATIONS, THEME_IDS, maxMinutesFor } from '../shared/domain/options'
import { useApp } from '../state/appState'
import { color } from '../theme'
import { Button, Card, Chip, CTA_RESERVE, Eyebrow, FloatingCta, Row, Screen, UiText, VoiceText, Wrap } from '../ui'

export function Create() {
  const { t, minutes } = useI18n()
  const app = useApp()
  const allowed = maxMinutesFor(app.premium)

  const summary = [
    t.options.voice[app.prefs.voice],
    t.options.mood[app.prefs.mood],
    t.options.amb[app.prefs.amb],
    minutes(app.minutes),
  ].join(' · ')

  return (
    <View style={{ flex: 1 }}>
      {/* The extra padding is the room the button below needs, or the last
          line of this screen ends up underneath it. */}
      <Screen scroll style={{ paddingBottom: CTA_RESERVE + 140 }}>
        <VoiceText size={26} italic={false} tone={color.inkBright}>
          {t.create.heading}
        </VoiceText>

        <View style={styles.field}>
          <TextInput
            value={app.prompt}
            onChangeText={app.setPrompt}
            placeholder={t.create.placeholder}
            placeholderTextColor={color.ink40}
            multiline
            textAlignVertical="top"
            style={styles.input}
            accessibilityLabel={t.create.heading}
            maxLength={2000}
          />
          <Button
            label={t.create.useExample}
            variant="ghost"
            height={26}
            fontSize={12}
            style={{ alignSelf: 'flex-start' }}
            onPress={() => app.setPrompt(t.create.examplePrompt)}
          />
        </View>

        <View style={{ marginTop: 18 }}>
          <Wrap>
            {THEME_IDS.map((theme) => (
              <Chip
                key={theme}
                label={t.options.theme[theme]}
                active={app.themes.includes(theme)}
                onPress={() => app.toggleTheme(theme)}
              />
            ))}
          </Wrap>
        </View>

        <View style={{ marginTop: 24 }}>
          <Eyebrow>{t.create.durationTitle}</Eyebrow>
        </View>
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
        {!app.premium && (
          <UiText size={11} tone="rgba(240,168,104,0.7)" style={{ marginTop: 8 }}>
            {t.create.durationLocked}
          </UiText>
        )}

        <Card onPress={app.openSheet} style={{ marginTop: 20 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <UiText size={13} weight="400" tone="rgba(234,236,247,0.8)">
                {t.create.settingsTitle}
              </UiText>
              <UiText size={11.5} tone={color.ink40}>
                {summary}
              </UiText>
            </View>
            <UiText size={18} tone={color.ink35}>
              ›
            </UiText>
          </Row>
        </Card>

        <VoiceText size={14} style={{ marginTop: 22 }}>
          {t.create.footnote}
        </VoiceText>
      </Screen>

      <FloatingCta>
        <Button
          label={app.prompt.trim() ? t.create.cta : t.create.emptyPrompt}
          variant="gradientEmber"
          block
          height={56}
          fontSize={15}
          disabled={!app.prompt.trim()}
          onPress={app.startNight}
        />
      </FloatingCta>
    </View>
  )
}

const PHRASE_MS = 1400

export function Generating() {
  const { t } = useI18n()
  const app = useApp()
  const [step, setStep] = useState(0)

  const last = t.generating.phrases.length - 1
  const ready = !app.planning && app.plan !== null

  useEffect(() => {
    if (ready) {
      setStep(last)
      return
    }
    const id = setInterval(() => setStep((s) => Math.min(s + 1, last - 1)), PHRASE_MS)
    return () => clearInterval(id)
  }, [ready, last])

  return (
    <Screen style={styles.centred}>
      <View style={styles.orb} />
      <UiText size={20} tone={color.inkBright} center style={{ marginTop: 44 }}>
        {app.planError ? t.generating.failed : t.generating.phrases[step]}
      </UiText>
      {ready && app.plan && (
        <VoiceText size={17} center style={{ marginTop: 10 }}>
          {app.plan.title}
        </VoiceText>
      )}
      {!ready && !app.planError && (
        <ActivityIndicator color={color.indigoSoft} style={{ marginTop: 22 }} />
      )}

      {app.planError && (
        <Button
          label={t.generating.retry}
          variant="outline"
          height={52}
          fontSize={14}
          style={{ marginTop: 28 }}
          onPress={app.retryPlan}
        />
      )}
      {ready && (
        <Button
          label={t.generating.enter}
          height={56}
          fontSize={15}
          style={{ marginTop: 28, paddingHorizontal: 54 }}
          onPress={app.enterSession}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  centred: { alignItems: 'center', justifyContent: 'center' },
  field: {
    marginTop: 18,
    borderRadius: 22,
    backgroundColor: color.surfaceIndigo,
    borderWidth: 1,
    borderColor: color.lineHi,
    padding: 16,
  },
  input: { minHeight: 120, fontSize: 15, lineHeight: 26, color: color.ink, fontWeight: '300' },
  orb: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#9EA2F0',
    shadowColor: '#8B93FF',
    shadowOpacity: 0.7,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
})
