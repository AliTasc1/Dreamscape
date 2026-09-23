import { useRef, useState, type ComponentRef } from 'react'
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useI18n } from '../i18n'
import { useNightSession } from '../session/useNightSession'
import { useApp } from '../state/appState'
import { color } from '../theme'
import { Button, Row, Screen, UiText, VoiceText } from '../ui'

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function Session() {
  const { t, f } = useI18n()
  const app = useApp()
  const night = useNightSession()

  return (
    <Screen padded={false} style={styles.session}>
      <View style={styles.top}>
        <Button
          label={t.session.end}
          variant="glass"
          height={38}
          fontSize={12}
          onPress={() => app.endNight('complete')}
        />
        <View style={{ alignItems: 'center' }}>
          <UiText size={11} tone={color.ink40} upper>
            {night.buffering
              ? t.session.listening
              : app.playing
                ? t.session.speaking
                : t.session.paused}
          </UiText>
          <UiText size={10.5} tone={color.ink32}>
            {f(t.session.remaining, { time: clock(night.remaining) })}
          </UiText>
        </View>
        <Button
          label={t.session.sleep}
          variant="glass"
          height={38}
          fontSize={12}
          onPress={() => app.endNight('fade')}
        />
      </View>

      <View style={styles.orbWrap}>
        <View style={[styles.orb, { width: app.playing ? 112 : 88, height: app.playing ? 112 : 88 }]} />
        {!!app.plan?.persona.who && (
          <UiText size={10} tone={color.ink32} upper center style={{ marginTop: 26 }}>
            {app.plan.persona.who}
          </UiText>
        )}
      </View>

      <VoiceText size={19} center style={styles.narration}>
        {night.line}
      </VoiceText>

      <View style={styles.controls}>
        <Row style={{ gap: 14, justifyContent: 'center' }}>
          <Button
            label={app.muted ? t.session.muted : t.session.unmuted}
            variant="glass"
            height={44}
            fontSize={11}
            onPress={app.toggleMuted}
          />
          <Button
            label={app.playing ? t.session.pause : t.session.play}
            height={62}
            fontSize={13}
            onPress={app.togglePlay}
          />
          <Button
            label={t.session.talk}
            variant="glass"
            height={44}
            fontSize={11}
            onPress={app.openTalk}
          />
        </Row>
      </View>

      {app.talk && <Conversation night={night} />}

      {night.finished && (
        <View style={styles.timeUp}>
          <VoiceText size={22} center tone="rgba(234,236,247,0.8)">
            {app.premium ? t.fade.goodnight : t.session.timeUpFree}
          </VoiceText>
          {!app.premium && (
            <UiText size={13} center style={{ marginTop: 10 }}>
              {t.session.timeUpFreeBody}
            </UiText>
          )}
          <Row style={{ gap: 10, marginTop: 20 }}>
            <Button
              label={t.complete.eyebrow}
              variant="outline"
              height={50}
              fontSize={13}
              onPress={() => app.endNight('complete')}
            />
            {!app.premium && (
              <Button
                label={t.session.seePremium}
                height={50}
                fontSize={13}
                onPress={() => app.go('premium')}
              />
            )}
          </Row>
        </View>
      )}
    </Screen>
  )
}

/**
 * Talking back.
 *
 * Typed, not spoken: on-device speech recognition needs a native module that
 * Expo Go cannot load, so the microphone would be a button that does nothing.
 * Typing works everywhere and the companion answers in character either way.
 */
function Conversation({ night }: { night: ReturnType<typeof useNightSession> }) {
  const { t } = useI18n()
  const app = useApp()
  const [typed, setTyped] = useState('')
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null)

  const send = () => {
    const text = typed.trim()
    if (!text) return
    setTyped('')
    night.say(text)
  }

  return (
    <View style={styles.panel}>
      <View style={styles.grabber} />
      <ScrollView
        ref={scroller}
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
      >
        {night.turns.map((turn) =>
          turn.who === 'you' ? (
            <View key={turn.id} style={styles.you}>
              <UiText size={14} tone={color.inkBright}>
                {turn.text}
              </UiText>
            </View>
          ) : (
            <VoiceText key={turn.id} size={15} style={{ maxWidth: '86%' }}>
              {turn.text}
            </VoiceText>
          ),
        )}
      </ScrollView>

      <Row style={{ gap: 10, marginTop: 10 }}>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          onSubmitEditing={send}
          placeholder={t.talk.placeholder}
          placeholderTextColor={color.ink40}
          style={styles.reply}
          returnKeyType="send"
          maxLength={500}
          accessibilityLabel={t.talk.placeholder}
        />
        <Button label={t.talk.send} height={46} fontSize={13} disabled={!typed.trim()} onPress={send} />
      </Row>

      <Pressable onPress={app.closeTalk} accessibilityRole="button" style={{ paddingVertical: 10 }}>
        <UiText size={12} tone={color.ink35} center>
          {t.talk.backToDream}
        </UiText>
      </Pressable>
    </View>
  )
}

export function SleepFade() {
  const { t } = useI18n()
  return (
    <Screen padded={false} style={[styles.session, styles.centred, { backgroundColor: color.nightDeep }]}>
      <View style={styles.fadeDot} />
      <VoiceText size={26} center tone="rgba(234,236,247,0.42)">
        {t.fade.goodnight}
      </VoiceText>
    </Screen>
  )
}

export function Complete() {
  const { t, f, minutes } = useI18n()
  const app = useApp()
  const spent = Math.max(1, Math.round(app.elapsed / 60))

  const learned = [
    ...(app.reflection?.themes ?? []),
    ...(app.reflection?.feelings ?? []),
    ...(app.reflection?.personas ?? []),
  ].slice(0, 3)

  const stats = [
    { value: f(t.common.minutesShort, { n: spent }), label: t.complete.stats.timeInDream },
    {
      value: f(t.common.minutesShort, { n: Math.max(0, app.minutes - spent) }),
      label: t.complete.stats.awake,
    },
    { value: t.options.amb[app.prefs.amb], label: t.complete.stats.ambience },
  ]

  return (
    <Screen scroll>
      <UiText size={11} tone={color.ink35} upper>
        {t.complete.eyebrow}
      </UiText>
      <VoiceText size={28} italic={false} tone={color.inkBright} style={{ marginTop: 10 }}>
        {app.plan?.title ?? t.detail.title}
      </VoiceText>

      <Row style={{ gap: 24, marginTop: 26 }}>
        {stats.map((stat) => (
          <View key={stat.label}>
            <UiText size={24} tone={color.inkBright}>
              {stat.value}
            </UiText>
            <UiText size={11} tone="rgba(234,236,247,0.38)">
              {stat.label}
            </UiText>
          </View>
        ))}
      </Row>

      <View style={styles.promptCard}>
        <VoiceText size={15}>{app.prompt.trim() || t.create.examplePrompt}</VoiceText>
      </View>

      {learned.length > 0 && (
        <View style={{ marginTop: 22 }}>
          <UiText size={10} tone={color.ink32} upper weight="400">
            {t.complete.learned}
          </UiText>
          <Row style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {learned.map((entry) => (
              <View key={entry} style={styles.learned}>
                <UiText size={12} tone={color.ink70}>
                  {entry}
                </UiText>
              </View>
            ))}
          </Row>
        </View>
      )}

      <Row style={{ gap: 12, marginTop: 28 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={t.complete.save}
            variant="outline"
            block
            height={54}
            fontSize={14}
            onPress={app.saveNight}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={t.complete.replay}
            block
            height={54}
            fontSize={14}
            onPress={app.enterSession}
          />
        </View>
      </Row>
      <UiText size={11} tone={color.ink32} center style={{ marginTop: 12 }}>
        {minutes(app.minutes)}
      </UiText>
    </Screen>
  )
}

const styles = StyleSheet.create({
  session: { backgroundColor: '#080C1C' },
  centred: { alignItems: 'center', justifyContent: 'center' },
  top: {
    position: 'absolute',
    top: 62,
    left: 22,
    right: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  orbWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -60 },
  orb: {
    borderRadius: 60,
    backgroundColor: '#A3A7F2',
    shadowColor: '#8B93FF',
    shadowOpacity: 0.65,
    shadowRadius: 46,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  narration: { position: 'absolute', left: 26, right: 26, top: '56%' },
  controls: { position: 'absolute', left: 22, right: 22, bottom: 54 },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '72%',
    minHeight: 280,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: 'rgba(10,13,30,0.97)',
    borderTopWidth: 1,
    borderTopColor: color.lineHi,
    padding: 18,
    paddingBottom: 26,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(234,236,247,0.2)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  you: {
    alignSelf: 'flex-end',
    maxWidth: '86%',
    backgroundColor: 'rgba(169,176,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(169,176,255,0.28)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reply: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(234,236,247,0.12)',
    backgroundColor: 'rgba(234,236,247,0.05)',
    paddingHorizontal: 16,
    color: color.ink,
    fontSize: 14,
  },
  timeUp: {
    ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    backgroundColor: 'rgba(5,7,15,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  fadeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(234,236,247,0.45)',
    marginBottom: 24,
  },
  promptCard: {
    marginTop: 26,
    padding: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(139,147,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(234,236,247,0.07)',
  },
  learned: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(169,176,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(169,176,255,0.28)',
  },
})
