import { EXPLORE_ART } from '../data/content'
import { CATEGORY_IDS } from '../domain/options'
import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Chip } from '../ui/Chip'
import { Pressable } from '../ui/Pressable'
import { Screen } from '../ui/Screen'
import styles from './Explore.module.css'

export function Explore() {
  const { t } = useI18n()
  const { cat, setCategory, go, useExamplePrompt } = useApp()

  const open = (desc: string) => {
    useExamplePrompt(desc)
    go('create')
  }

  return (
    <Screen scroll>
      <div className={styles.title}>{t.explore.title}</div>

      <div className={styles.categories}>
        {CATEGORY_IDS.map((category) => (
          <Chip
            key={category}
            label={t.options.category[category]}
            active={cat === category}
            onClick={() => setCategory(category)}
          />
        ))}
      </div>

      <div className={styles.cards}>
        {t.explore.cards.map((card, i) => (
          <Pressable
            key={card.title}
            className={styles.card}
            style={{ background: EXPLORE_ART[i] }}
            onClick={() => open(`${card.title}. ${card.desc}`)}
          >
            <div className={styles.scrim} />
            <div className={styles.text}>
              <div className={styles.cardTitle}>{card.title}</div>
              <div className={styles.cardDesc}>{card.desc}</div>
              <div className={styles.cardMeta}>{card.meta}</div>
            </div>
            <div className={styles.play} aria-hidden="true">
              &#9654;
            </div>
          </Pressable>
        ))}
      </div>
    </Screen>
  )
}
