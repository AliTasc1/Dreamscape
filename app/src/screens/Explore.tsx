import { EXPLORE_CARDS, EXPLORE_CATEGORIES } from '../data/content'
import { useApp } from '../state/appState'
import { Chip } from '../ui/Chip'
import { Pressable } from '../ui/Pressable'
import { Screen } from '../ui/Screen'
import styles from './Explore.module.css'

export function Explore() {
  const { cat, setCategory, go } = useApp()

  return (
    <Screen scroll>
      <div className={styles.title}>Worlds to wander</div>

      <div className={styles.categories}>
        {EXPLORE_CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={category}
            active={cat === category}
            onClick={() => setCategory(category)}
          />
        ))}
      </div>

      <div className={styles.cards}>
        {EXPLORE_CARDS.map((card) => (
          <Pressable
            key={card.title}
            className={styles.card}
            style={{ background: card.art }}
            onClick={() => go('detail')}
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
