import { StyleSheet, View } from 'react-native'
import { NightScene } from '../art/NightScene'
import { useI18n } from '../i18n'
import { latestCallback } from '../shared/state/memory'
import { paletteForAmbience } from '../shared/palettes'
import { useApp } from '../state/appState'
import { color } from '../theme'
import { Button, Card, Chip, Eyebrow, Row, Screen, UiText, VoiceText, Wrap } from '../ui'

const NAME = 'Ali'

export function Home() {
  const { t, f } = useI18n()
  const app = useApp()
  const remembered = latestCallback(app.memory)

  const open = (text: string) => {
    app.setPrompt(text)
    app.go('create')
  }

  return (
    <Screen scroll>
      <UiText size={13} tone={color.ink35} upper>
        {f(t.home.greeting, { name: NAME })}
      </UiText>
      <VoiceText size={26} italic={false} tone={color.inkBright} style={{ marginTop: 12 }}>
        {t.home.question}
      </VoiceText>

      <View style={styles.hero}>
        <View style={StyleSheet.absoluteFill}>
          <NightScene palette="indigo" moonX={0.74} />
        </View>
        <View style={styles.heroBody}>
          <View style={styles.badge}>
            <UiText size={10} tone="rgba(234,236,247,0.72)" upper weight="400">
              {t.home.tonightBadge}
            </UiText>
          </View>
          <View>
            <VoiceText size={28} italic={false} tone={color.inkBrightest}>
              {t.home.tonightTitle}
            </VoiceText>
            <UiText size={13.5} style={{ marginTop: 6, maxWidth: 260 }}>
              {t.home.tonightDesc}
            </UiText>
            <Row style={{ gap: 12, marginTop: 16 }}>
              <Button
                label={t.home.begin}
                height={46}
                fontSize={14}
                onPress={() => open(t.home.tonightDesc)}
              />
              <UiText size={12} tone={color.ink40}>
                {t.home.tonightMeta}
              </UiText>
            </Row>
          </View>
        </View>
      </View>

      {!!remembered && (
        <View style={styles.remembers}>
          <VoiceText size={13} tone="rgba(234,236,247,0.6)">
            {f(t.create.remembers, { memory: remembered })}
          </VoiceText>
        </View>
      )}

      <View style={{ marginTop: 26 }}>
        <Eyebrow>{t.home.createSection}</Eyebrow>
      </View>
      <Card onPress={() => app.go('create')} style={styles.composer}>
        <UiText size={15} tone={color.ink45}>
          {t.home.composerPlaceholder}
        </UiText>
        <View style={{ marginTop: 14 }}>
          <Wrap>
            {t.home.examples.map((example) => (
              <Chip key={example} label={example} onPress={() => open(example)} />
            ))}
          </Wrap>
        </View>
      </Card>

      <Row style={{ justifyContent: 'space-between', marginTop: 26 }}>
        <Eyebrow>{t.home.returnSection}</Eyebrow>
        <Button
          label={t.home.myNights}
          variant="ghost"
          height={22}
          fontSize={12}
          onPress={() => app.go('nights')}
        />
      </Row>

      <View style={{ gap: 12, marginTop: 12 }}>
        {t.home.favourites.map((world, i) => (
          <Card key={world.title} onPress={() => app.go('detail')} style={styles.world}>
            <View style={StyleSheet.absoluteFill}>
              <NightScene palette={paletteForAmbience(['rain', 'fireplace', 'night'][i])} moonX={0.7} />
            </View>
            <View style={styles.worldText}>
              <UiText size={14} weight="400" tone={color.inkBright}>
                {world.title}
              </UiText>
              <UiText size={11} tone={color.ink45}>
                {world.meta}
              </UiText>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 22,
    height: 260,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#0A0D1C',
  },
  heroBody: { flex: 1, padding: 22, justifyContent: 'space-between' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(234,236,247,0.12)',
  },
  remembers: {
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: color.surfaceIndigo,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(169,176,255,0.45)',
  },
  composer: { marginTop: 10, backgroundColor: color.surfaceIndigo, padding: 20 },
  world: { height: 130, padding: 0, overflow: 'hidden', justifyContent: 'flex-end' },
  worldText: { padding: 14, backgroundColor: 'rgba(5,7,15,0.55)' },
})
