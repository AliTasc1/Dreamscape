import { Pressable, StyleSheet, Switch, View } from 'react-native'
import { NightScene } from '../art/NightScene'
import { LOCALES, useI18n, type LanguageId } from '../i18n'
import { OPTION_SETS, type OptionKey } from '../shared/domain/options'
import type { MemoryBucket } from '../shared/state/memory'
import { useApp } from '../state/appState'
import { color } from '../theme'
import { Button, Card, Chip, Eyebrow, Row, Screen, UiText, VoiceText, Wrap } from '../ui'

const NAME = 'Ali'

/** A labelled row of single-choice chips bound to one preference. */
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

export function Profile() {
  const { t, f, minutes } = useI18n()
  const app = useApp()
  const next: LanguageId = app.lang === 'tr' ? 'en' : 'tr'

  const rows: { label: string; value: string; onPress: () => void }[] = [
    { label: t.profile.rows.companion, value: t.companion.name, onPress: () => app.go('companion') },
    { label: t.profile.rows.voice, value: t.options.voice[app.prefs.voice], onPress: () => app.go('companion') },
    { label: t.profile.rows.sleep, value: minutes(app.minutes), onPress: () => app.go('create') },
    { label: t.profile.rows.ambient, value: t.options.amb[app.prefs.amb], onPress: () => app.openSheet() },
    {
      label: t.profile.rows.memory,
      value: app.memoryEmpty ? '' : f(t.memory.sessionCount, { n: app.memory.nights }),
      onPress: () => app.go('memory'),
    },
    { label: t.profile.rows.tone, value: t.options.tone[app.tone], onPress: () => app.go('consent') },
    { label: t.profile.rows.notifications, value: '', onPress: () => app.go('notif') },
    {
      label: t.profile.rows.language,
      value: LOCALES[app.lang].meta.nativeName,
      onPress: () => app.chooseLanguageInPlace(next),
    },
    { label: t.profile.rows.privacy, value: '', onPress: () => app.go('privacy') },
    {
      label: t.profile.rows.subscription,
      value: app.premium ? t.profile.subscriptionPremium : t.profile.subscriptionFree,
      onPress: () => app.go('premium'),
    },
  ]

  return (
    <Screen scroll>
      <Row style={{ gap: 16 }}>
        <View style={styles.avatar} />
        <View>
          <VoiceText size={22} italic={false} tone={color.inkBright}>
            {f(t.profile.greeting, { name: NAME })}
          </VoiceText>
          <UiText size={11.5} tone="rgba(234,236,247,0.38)">
            {app.premium ? t.profile.planPremium : t.profile.planFree}
          </UiText>
        </View>
      </Row>

      <Row style={{ gap: 10, marginTop: 22 }}>
        {[
          { value: String(app.memory.nights + app.nights.length), label: t.profile.stats.dreams },
          { value: '21h', label: t.profile.stats.relaxed },
          { value: '6', label: t.profile.stats.favourites },
        ].map((stat) => (
          <Card key={stat.label} style={{ flex: 1 }}>
            <UiText size={22} tone={color.inkBright}>
              {stat.value}
            </UiText>
            <UiText size={10.5} tone="rgba(234,236,247,0.38)">
              {stat.label}
            </UiText>
          </Card>
        ))}
      </Row>

      <View style={{ marginTop: 22 }}>
        {rows.map((row) => (
          <Pressable
            key={row.label}
            onPress={row.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.surface }]}
          >
            <UiText size={14} tone="rgba(234,236,247,0.75)">
              {row.label}
            </UiText>
            <UiText size={12} tone="rgba(234,236,247,0.3)">
              {row.value}
            </UiText>
          </Pressable>
        ))}
      </View>

      {/* The one network call the app makes on its own behalf, and it is opt-in. */}
      <Card style={{ marginTop: 18 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <UiText size={13.5} weight="400" tone="rgba(234,236,247,0.85)">
              {t.sky.title}
            </UiText>
            <UiText size={12} tone={color.ink40}>
              {app.sky ? t.sky.onWithReading : t.sky.body}
            </UiText>
          </View>
          <Switch
            value={app.useRealSky}
            onValueChange={app.setUseRealSky}
            trackColor={{ true: 'rgba(169,176,255,0.55)', false: 'rgba(234,236,247,0.12)' }}
            thumbColor={color.inkBright}
          />
        </Row>
      </Card>
    </Screen>
  )
}

export function Companion() {
  const { t, f } = useI18n()
  const app = useApp()

  return (
    <Screen scroll>
      <View style={{ alignItems: 'center', gap: 14 }}>
        <View style={styles.orb} />
        <VoiceText size={24} italic={false} tone={color.inkBright}>
          {t.companion.name}
        </VoiceText>
        <UiText size={12.5} tone={color.ink40}>
          {f(t.companion.tenure, { n: app.memory.nights })}
        </UiText>
      </View>

      <View style={{ gap: 24, marginTop: 28 }}>
        <ChoiceChips optionKey="personality" label={t.companion.groups.personality} />
        <ChoiceChips optionKey="style" label={t.companion.groups.style} />
        <ChoiceChips optionKey="speed" label={t.companion.groups.speed} />
        <ChoiceChips optionKey="intensity" label={t.companion.groups.intensity} />
      </View>
    </Screen>
  )
}

export function MemoryScreen() {
  const { t, f } = useI18n()
  const app = useApp()

  const groups: { bucket: MemoryBucket; label: string; entries: string[] }[] = [
    { bucket: 'themes', label: t.memory.themes, entries: app.memory.themes },
    { bucket: 'feelings', label: t.memory.feelings, entries: app.memory.feelings },
    { bucket: 'personas', label: t.memory.people, entries: app.memory.personas },
  ]

  return (
    <Screen scroll>
      <VoiceText size={26} italic={false} tone={color.inkBright}>
        {t.memory.title}
      </VoiceText>
      <UiText size={13} style={{ marginTop: 10 }}>
        {t.memory.lede}
      </UiText>
      {app.memory.nights > 0 && (
        <UiText size={11.5} tone={color.ink35} style={{ marginTop: 8 }}>
          {f(t.memory.sessionCount, { n: app.memory.nights })}
        </UiText>
      )}

      {app.memoryEmpty ? (
        <VoiceText size={18} center style={{ marginTop: 50 }}>
          {t.memory.empty}
        </VoiceText>
      ) : (
        <>
          {groups
            .filter((group) => group.entries.length > 0)
            .map((group) => (
              <View key={group.bucket} style={{ marginTop: 24 }}>
                <Eyebrow>{group.label}</Eyebrow>
                <View style={{ gap: 8, marginTop: 10 }}>
                  {group.entries.map((entry) => (
                    <Card key={entry}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <UiText size={13} tone={color.ink70} style={{ flex: 1, paddingRight: 10 }}>
                          {entry}
                        </UiText>
                        <Button
                          label={t.memory.forget}
                          variant="ghost"
                          height={24}
                          fontSize={11.5}
                          onPress={() => app.forgetMemory(group.bucket, entry)}
                        />
                      </Row>
                    </Card>
                  ))}
                </View>
              </View>
            ))}

          {app.memory.moments.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Eyebrow>{t.memory.moments}</Eyebrow>
              <View style={{ gap: 8, marginTop: 10 }}>
                {app.memory.moments.map((moment) => (
                  <Card key={moment.text}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <VoiceText size={14}>“{moment.text}”</VoiceText>
                        <UiText size={11} tone={color.ink32}>
                          {moment.at}
                        </UiText>
                      </View>
                      <Button
                        label={t.memory.forget}
                        variant="ghost"
                        height={24}
                        fontSize={11.5}
                        onPress={() => app.forgetMemory('moments', moment.text)}
                      />
                    </Row>
                  </Card>
                ))}
              </View>
            </View>
          )}

          <Button
            label={t.memory.forgetAll}
            variant="danger"
            block
            height={50}
            fontSize={13}
            style={{ marginTop: 26 }}
            onPress={app.forgetAllMemory}
          />
        </>
      )}
    </Screen>
  )
}

export function Privacy() {
  const { t } = useI18n()
  const app = useApp()

  return (
    <Screen scroll>
      <VoiceText size={26} italic={false} tone={color.inkBright}>
        {t.privacy.title}
      </VoiceText>
      <UiText size={13.5} style={{ marginTop: 12 }}>
        {t.privacy.lede}
      </UiText>

      <View style={{ gap: 12, marginTop: 22 }}>
        {t.privacy.rows.map((row) => (
          <Card key={row.title}>
            <UiText size={13.5} weight="400" tone="rgba(234,236,247,0.85)">
              {row.title}
            </UiText>
            <UiText size={12.5} tone={color.ink45}>
              {row.body}
            </UiText>
          </Card>
        ))}
      </View>

      <Button
        label={t.privacy.deleteAll}
        variant="danger"
        block
        height={50}
        fontSize={13}
        style={{ marginTop: 22 }}
        onPress={app.deleteEverything}
      />
    </Screen>
  )
}

export function Premium() {
  const { t } = useI18n()
  const app = useApp()

  const plans = [
    { id: 'monthly' as const, ...t.premium.plans.monthly },
    { id: 'yearly' as const, ...t.premium.plans.yearly },
  ]

  return (
    <Screen scroll>
      <View style={styles.premiumHero}>
        <NightScene palette="violet" moonX={0.5} />
      </View>

      <VoiceText size={28} italic={false} center tone={color.inkBrightest} style={{ marginTop: 18 }}>
        {t.premium.title}
      </VoiceText>

      <View style={{ gap: 12, marginTop: 24 }}>
        {t.premium.features.map((feature) => (
          <Row key={feature} style={{ gap: 12, alignItems: 'flex-start' }}>
            <View style={styles.bullet} />
            <UiText size={14} tone="rgba(234,236,247,0.65)" style={{ flex: 1 }}>
              {feature}
            </UiText>
          </Row>
        ))}
      </View>

      <Row style={{ gap: 10, marginTop: 24 }}>
        {plans.map((plan) => (
          <Card
            key={plan.id}
            onPress={() => app.setBilling(plan.id)}
            style={[{ flex: 1 }, app.billing === plan.id && styles.planActive]}
          >
            <UiText size={12.5} weight="400" tone={color.ink70}>
              {plan.name}
            </UiText>
            <UiText size={22} tone={color.inkBright}>
              {plan.price}
            </UiText>
            <UiText size={11} tone="rgba(234,236,247,0.38)">
              {plan.note}
            </UiText>
          </Card>
        ))}
      </Row>

      <Button
        label={app.premium ? t.premium.ctaOwned : app.purchasing ? t.premium.purchasing : t.premium.cta}
        variant="gradientEmber"
        block
        height={56}
        fontSize={15}
        disabled={app.premium || app.purchasing}
        style={{ marginTop: 20 }}
        onPress={app.purchasePremium}
      />
      <UiText size={11} tone="rgba(234,236,247,0.3)" center style={{ marginTop: 12 }}>
        {t.premium.fine}
      </UiText>
      {app.premium && (
        <Button
          label={t.premium.cancel}
          variant="ghost"
          block
          height={44}
          fontSize={12.5}
          style={{ marginTop: 14 }}
          onPress={app.cancelPremium}
        />
      )}
    </Screen>
  )
}

const TOGGLES = ['bedtime', 'weekly', 'finished', 'quiet'] as const

export function Notifications() {
  const { t } = useI18n()
  const app = useApp()

  return (
    <Screen scroll>
      <VoiceText size={26} italic={false} tone={color.inkBright}>
        {t.notif.title}
      </VoiceText>

      <View style={{ gap: 12, marginTop: 20 }}>
        {t.notif.previews.map((message) => (
          <Card key={message}>
            <Row style={{ gap: 13 }}>
              <View style={styles.notifIcon} />
              <View style={{ flex: 1 }}>
                <UiText size={12.5} weight="400" tone="rgba(234,236,247,0.85)">
                  {t.common.appName}
                </UiText>
                <UiText size={12.5} tone="rgba(234,236,247,0.5)">
                  {message}
                </UiText>
              </View>
            </Row>
          </Card>
        ))}
      </View>

      <View style={{ marginTop: 24 }}>
        {TOGGLES.map((key) => (
          <Row key={key} style={styles.row}>
            <UiText size={13.5} tone={color.ink70} style={{ flex: 1 }}>
              {t.notif.toggles[key]}
            </UiText>
            <Switch
              value={!!app.notifOn[key]}
              onValueChange={() => app.toggleNotif(key)}
              trackColor={{ true: 'rgba(169,176,255,0.55)', false: 'rgba(234,236,247,0.12)' }}
              thumbColor={color.inkBright}
            />
          </Row>
        ))}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#2A3155' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  orb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#9EA2F0',
    shadowColor: '#8B93FF',
    shadowOpacity: 0.6,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  premiumHero: { height: 190, borderRadius: 24, overflow: 'hidden' },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(240,168,104,0.8)',
    marginTop: 9,
  },
  planActive: {
    backgroundColor: 'rgba(169,176,255,0.14)',
    borderColor: 'rgba(169,176,255,0.5)',
  },
  notifIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#6E72C0' },
})
