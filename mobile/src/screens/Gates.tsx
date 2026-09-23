import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { NightScene } from '../art/NightScene'
import { LANGUAGE_IDS, LOCALES, useI18n, type LanguageId } from '../i18n'
import type { ToneId } from '../shared/ai/contracts'
import { TONE_IDS } from '../shared/domain/options'
import { ONBOARDING_PALETTES } from '../shared/palettes'
import { useApp } from '../state/appState'
import { color } from '../theme'
import { Button, Card, Row, Screen, UiText, VoiceText } from '../ui'

/** Splash, language, consent, onboarding — everything before the app proper. */

export function Splash() {
  const { t } = useI18n()
  return (
    <Screen style={styles.centred} padded={false}>
      <View style={styles.moon} />
      <UiText size={28} tone={color.inkBright} center style={styles.wordmark}>
        DREAMSCAPE
      </UiText>
      <VoiceText size={17} center style={{ marginTop: 14, paddingHorizontal: 40 }}>
        {t.splash.tagline}
      </VoiceText>
    </Screen>
  )
}

export function Language() {
  const app = useApp()
  const [selected, setSelected] = useState<LanguageId>(app.lang)
  const copy = LOCALES[selected].language

  return (
    <Screen style={styles.middle}>
      <View style={styles.moonSmall} />
      <VoiceText size={28} italic={false} tone={color.inkBright}>
        {copy.title}
      </VoiceText>
      <UiText size={14} style={{ marginTop: 12 }}>
        {copy.subtitle}
      </UiText>

      <View style={{ gap: 12, marginTop: 30 }}>
        {LANGUAGE_IDS.map((id) => {
          const meta = LOCALES[id].meta
          const active = selected === id
          return (
            <Card
              key={id}
              onPress={() => setSelected(id)}
              style={[styles.choice, active && styles.choiceActive]}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <View>
                  <VoiceText size={20} italic={false} tone={color.inkBright}>
                    {meta.nativeName}
                  </VoiceText>
                  <UiText size={11.5} tone={color.ink40}>
                    {meta.name}
                  </UiText>
                </View>
                <View style={[styles.tick, active && styles.tickOn]} />
              </Row>
            </Card>
          )
        })}
      </View>

      <Button
        label={copy.cta}
        variant="gradientDusk"
        block
        height={56}
        fontSize={15}
        style={{ marginTop: 28 }}
        onPress={() => app.chooseLanguage(selected)}
      />
      <UiText size={11.5} tone={color.ink35} center style={{ marginTop: 14 }}>
        {copy.note}
      </UiText>
    </Screen>
  )
}

export function Consent() {
  const { t } = useI18n()
  const app = useApp()
  const [age, setAge] = useState(app.ageConfirmed)
  const [tone, setTone] = useState<ToneId>(app.tone)
  const blocked = tone === 'mature' && !age

  const copy: Record<ToneId, { name: string; desc: string }> = {
    gentle: { name: t.consent.tones.gentle, desc: t.consent.tones.gentleDesc },
    romantic: { name: t.consent.tones.romantic, desc: t.consent.tones.romanticDesc },
    mature: { name: t.consent.tones.mature, desc: t.consent.tones.matureDesc },
  }

  return (
    <Screen scroll>
      <VoiceText size={28} italic={false} tone={color.inkBright}>
        {t.consent.title}
      </VoiceText>
      <UiText size={13.5} style={{ marginTop: 12 }}>
        {t.consent.body}
      </UiText>

      <Card onPress={() => setAge((v) => !v)} style={{ marginTop: 24 }}>
        <Row style={{ gap: 14 }}>
          <View style={[styles.box, age && styles.boxOn]} />
          <View style={{ flex: 1 }}>
            <UiText size={13.5} weight="400" tone="rgba(234,236,247,0.85)">
              {t.consent.ageTitle}
            </UiText>
            <UiText size={12} tone={color.ink40}>
              {t.consent.ageBody}
            </UiText>
          </View>
        </Row>
      </Card>

      <VoiceText size={18} italic={false} tone={color.inkBright} style={{ marginTop: 28 }}>
        {t.consent.toneTitle}
      </VoiceText>
      <UiText size={12.5} tone={color.ink40}>
        {t.consent.toneBody}
      </UiText>

      <View style={{ gap: 10, marginTop: 14 }}>
        {TONE_IDS.map((id) => (
          <Card
            key={id}
            onPress={() => setTone(id)}
            style={[
              styles.choice,
              tone === id && styles.choiceActive,
              id === 'mature' && !age && { opacity: 0.45 },
            ]}
          >
            <UiText size={14} weight="400" tone={color.inkBright}>
              {copy[id].name}
            </UiText>
            <UiText size={12.5} tone={color.ink45}>
              {copy[id].desc}
            </UiText>
          </Card>
        ))}
      </View>

      {blocked && (
        <UiText size={12} tone="rgba(240,168,104,0.8)" style={{ marginTop: 12 }}>
          {t.consent.needsAge}
        </UiText>
      )}

      <Button
        label={t.consent.cta}
        variant="gradientDusk"
        block
        height={56}
        fontSize={15}
        disabled={blocked}
        style={{ marginTop: 24 }}
        onPress={() => app.acceptConsent({ ageConfirmed: age, tone })}
      />
    </Screen>
  )
}

export function Onboarding() {
  const { t } = useI18n()
  const app = useApp()
  const step = t.onboarding.steps[app.ob] ?? t.onboarding.steps[0]

  return (
    <Screen style={{ justifyContent: 'space-between' }}>
      <Row style={{ gap: 6, justifyContent: 'center' }}>
        {t.onboarding.steps.map((_, i) => (
          <View key={i} style={[styles.dot, i === app.ob && styles.dotActive]} />
        ))}
      </Row>

      <View style={{ gap: 22 }}>
        <View style={styles.art}>
          <NightScene palette={ONBOARDING_PALETTES[app.ob]} moonX={0.3 + app.ob * 0.12} />
        </View>
        <UiText size={26} tone={color.inkBright} style={{ lineHeight: 35 }}>
          {step.title}
        </UiText>
        <UiText size={14.5}>{step.body}</UiText>
        {!!step.quote && (
          <View style={styles.quote}>
            <VoiceText size={15} tone="rgba(240,215,190,0.8)">
              {step.quote}
            </VoiceText>
          </View>
        )}
      </View>

      <View style={{ gap: 12 }}>
        <Button
          label={step.cta}
          variant="gradientDusk"
          block
          height={56}
          fontSize={15}
          onPress={app.nextOnboarding}
        />
        <Pressable onPress={app.finishOnboarding} accessibilityRole="button">
          <UiText size={12.5} tone={color.ink35} center>
            {t.common.skip}
          </UiText>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  centred: { alignItems: 'center', justifyContent: 'center' },
  middle: { justifyContent: 'center' },
  wordmark: { letterSpacing: 11, marginTop: 28, fontWeight: '300' },
  moon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#C6C9F2',
    shadowColor: '#96A0FF',
    shadowOpacity: 0.6,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  moonSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#C6C9F2',
    marginBottom: 28,
  },
  choice: { borderColor: 'rgba(234,236,247,0.08)' },
  choiceActive: {
    backgroundColor: 'rgba(169,176,255,0.14)',
    borderColor: 'rgba(169,176,255,0.5)',
  },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(234,236,247,0.2)',
  },
  tickOn: { backgroundColor: color.inkBright, borderColor: color.inkBright },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(234,236,247,0.22)',
  },
  boxOn: { backgroundColor: color.inkBright, borderColor: color.inkBright },
  dot: { width: 6, height: 3, borderRadius: 2, backgroundColor: 'rgba(234,236,247,0.18)' },
  dotActive: { width: 22, backgroundColor: 'rgba(234,236,247,0.75)' },
  art: { height: 200, borderRadius: 26, overflow: 'hidden' },
  quote: { borderLeftWidth: 1, borderLeftColor: 'rgba(240,168,104,0.5)', paddingLeft: 16 },
})
