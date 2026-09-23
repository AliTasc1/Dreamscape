import { ScrollView, StyleSheet, View } from 'react-native'
import { NightScene } from '../art/NightScene'
import { useI18n } from '../i18n'
import { CATEGORY_IDS } from '../shared/domain/options'
import { paletteForAmbience } from '../shared/palettes'
import { useApp } from '../state/appState'
import { color } from '../theme'
import { Button, Card, Chip, CTA_RESERVE, FloatingCta, Row, Screen, UiText, VoiceText } from '../ui'

export function Explore() {
  const { t } = useI18n()
  const app = useApp()

  const open = (text: string) => {
    app.setPrompt(text)
    app.go('create')
  }

  return (
    <Screen scroll>
      <VoiceText size={26} italic={false} tone={color.inkBright}>
        {t.explore.title}
      </VoiceText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 16 }}
      >
        {CATEGORY_IDS.map((category) => (
          <Chip
            key={category}
            label={t.options.category[category]}
            active={app.cat === category}
            onPress={() => app.setCategory(category)}
          />
        ))}
      </ScrollView>

      <View style={{ gap: 14 }}>
        {t.explore.cards.map((card, i) => (
          <Card
            key={card.title}
            onPress={() => open(`${card.title}. ${card.desc}`)}
            style={styles.exploreCard}
          >
            <View style={StyleSheet.absoluteFill}>
              <NightScene
                palette={(['indigo', 'ember', 'violet', 'teal'] as const)[i]}
                moonX={0.78}
              />
            </View>
            <View style={styles.exploreText}>
              <UiText size={16} weight="400" tone={color.inkBright}>
                {card.title}
              </UiText>
              <UiText size={12} tone={color.ink45}>
                {card.desc}
              </UiText>
              <UiText size={11} tone={color.ink32} style={{ marginTop: 4 }}>
                {card.meta}
              </UiText>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  )
}

export function MyNights() {
  const { t, minutes } = useI18n()
  const app = useApp()

  const saved = app.nights.map((night) => ({
    key: night.id,
    title: night.title,
    meta: [night.at, minutes(night.minutes), night.personaWho].filter(Boolean).join(' · '),
    ambient: t.options.amb[night.ambience as keyof typeof t.options.amb] ?? night.ambience,
    ambience: night.ambience,
  }))
  const samples = t.nights.rows.map((row, i) => ({
    key: `sample-${i}`,
    title: row.title,
    meta: row.meta,
    ambient: row.ambient,
    ambience: ['rain', 'fireplace', 'forest', 'wind'][i],
  }))
  const rows = [...saved, ...samples]

  return (
    <Screen scroll>
      <VoiceText size={26} italic={false} tone={color.inkBright}>
        {t.nights.title}
      </VoiceText>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <VoiceText size={20} center tone={color.ink70}>
            {t.nights.emptyLine}
          </VoiceText>
          <UiText size={13} center style={{ marginTop: 12, maxWidth: 240 }}>
            {t.nights.emptyCopy}
          </UiText>
          <Button
            label={t.nights.emptyCta}
            height={50}
            fontSize={14}
            style={{ marginTop: 22 }}
            onPress={() => app.go('create')}
          />
        </View>
      ) : (
        <View style={{ gap: 12, marginTop: 18 }}>
          {rows.map((night) => (
            <Card key={night.key} onPress={() => app.go('detail')}>
              <Row style={{ gap: 14 }}>
                <View style={styles.thumb}>
                  <NightScene palette={paletteForAmbience(night.ambience)} moonX={0.6} />
                </View>
                <View style={{ flex: 1 }}>
                  <UiText size={14.5} weight="400" tone={color.inkBright}>
                    {night.title}
                  </UiText>
                  <UiText size={11.5} tone={color.ink40}>
                    {night.meta}
                  </UiText>
                  <UiText size={11.5} tone="rgba(240,168,104,0.6)">
                    {night.ambient}
                  </UiText>
                </View>
                <UiText size={16} tone="rgba(234,236,247,0.3)">
                  ›
                </UiText>
              </Row>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  )
}

export function DreamDetail() {
  const { t } = useI18n()
  const app = useApp()

  const night = app.nights[0]
  const title = night?.title ?? t.detail.title
  const meta = night ? [night.at, `${night.minutes}`, night.personaWho].join(' · ') : t.detail.meta
  const prompt = night?.prompt ?? t.create.examplePrompt

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll style={{ paddingBottom: CTA_RESERVE + 140 }}>
        <View style={styles.hero}>
          <NightScene palette={paletteForAmbience(night?.ambience ?? 'rain')} moonX={0.66} />
        </View>

        <VoiceText size={28} italic={false} tone={color.inkBrightest} style={{ marginTop: 18 }}>
          {title}
        </VoiceText>
        <UiText size={12} tone={color.ink40} style={{ marginTop: 6 }}>
          {meta}
        </UiText>
        <UiText size={14} style={{ marginTop: 16 }}>
          {t.detail.desc}
        </UiText>

        <View style={styles.promptCard}>
          <VoiceText size={14.5} tone={color.ink55}>
            {prompt}
          </VoiceText>
        </View>

        <Row style={{ gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          {t.detail.tags.map((tag) => (
            <Chip key={tag} label={tag} />
          ))}
        </Row>

        <Row style={{ gap: 10, marginTop: 22 }}>
          <Button
            label={t.detail.backLabel}
            variant="outline"
            height={50}
            fontSize={13}
            onPress={() => app.go('nights')}
          />
          <Button
            label={app.fav ? '♥' : '♡'}
            variant="glass"
            height={50}
            fontSize={16}
            onPress={app.toggleFav}
          />
        </Row>
      </Screen>

      <FloatingCta>
        <Button
          label={t.detail.replay}
          block
          height={56}
          fontSize={15}
          onPress={() => {
            app.setPrompt(prompt)
            app.startNight()
          }}
        />
      </FloatingCta>
    </View>
  )
}

const styles = StyleSheet.create({
  exploreCard: { height: 132, padding: 0, overflow: 'hidden', justifyContent: 'flex-end' },
  exploreText: { padding: 16, backgroundColor: 'rgba(5,7,15,0.6)' },
  empty: { marginTop: 80, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: 16, overflow: 'hidden' },
  hero: { height: 220, borderRadius: 24, overflow: 'hidden' },
  promptCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(139,147,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(234,236,247,0.07)',
  },
})
