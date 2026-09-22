import { FAVOURITE_ART } from '../data/content'
import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Eyebrow } from '../ui/Eyebrow'
import { Pressable } from '../ui/Pressable'
import { Screen } from '../ui/Screen'
import styles from './Home.module.css'

const NAME = 'Ali'

export function Home() {
  const { t, f } = useI18n()
  const { go, useExamplePrompt } = useApp()

  const openCreateWith = (text: string) => {
    useExamplePrompt(text)
    go('create')
  }

  return (
    <Screen scroll>
      <div className={styles.greeting}>{f(t.home.greeting, { name: NAME })}</div>
      <div className={styles.question}>{t.home.question}</div>

      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <div data-decor className={styles.heroMist} />
        <div className={styles.heroBody}>
          <div className={styles.badge}>{t.home.tonightBadge}</div>
          <div>
            <div className={styles.heroTitle}>{t.home.tonightTitle}</div>
            <div className={styles.heroDesc}>{t.home.tonightDesc}</div>
            <div className={styles.heroActions}>
              <Button
                variant="solid"
                height={46}
                paddingX={30}
                fontSize={14}
                hoverScale={1.04}
                onClick={() => openCreateWith(t.home.tonightDesc)}
              >
                {t.home.begin}
              </Button>
              <div className={styles.heroMeta}>{t.home.tonightMeta}</div>
            </div>
          </div>
        </div>
      </div>

      <Eyebrow style={{ display: 'block', marginTop: 30 }}>{t.home.createSection}</Eyebrow>
      <Pressable
        className={styles.composer}
        onClick={() => go('create')}
        label={t.home.composerPlaceholder}
      >
        <div className={styles.composerPlaceholder}>{t.home.composerPlaceholder}</div>
        <div className={styles.composerChips}>
          {t.home.examples.map((example) => (
            <Chip key={example} label={example} />
          ))}
        </div>
      </Pressable>

      <div className={styles.sectionRow}>
        <Eyebrow>{t.home.returnSection}</Eyebrow>
        <Button
          variant="link"
          fontSize={12}
          style={{ color: 'rgba(169,176,255,.7)' }}
          onClick={() => go('nights')}
        >
          {t.home.myNights}
        </Button>
      </div>
      <div className={styles.rail}>
        {t.home.favourites.map((world, i) => (
          <Pressable
            key={world.title}
            className={styles.card}
            style={{ background: FAVOURITE_ART[i] }}
            onClick={() => go('detail')}
          >
            <div className={styles.cardScrim} />
            <div className={styles.cardText}>
              <div className={styles.cardTitle}>{world.title}</div>
              <div className={styles.cardMeta}>{world.meta}</div>
            </div>
          </Pressable>
        ))}
      </div>
    </Screen>
  )
}
