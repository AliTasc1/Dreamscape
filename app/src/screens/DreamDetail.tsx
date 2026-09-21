import { DETAIL } from '../data/content'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import styles from './DreamDetail.module.css'

export function DreamDetail() {
  const { go, fav, toggleFav } = useApp()

  return (
    <>
      <div className={styles.scroll}>
        <div className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroScrim} />
          <button
            type="button"
            className={`${styles.heroButton} ${styles.back}`}
            onClick={() => go('nights')}
            aria-label="Back to My Nights"
          >
            &lsaquo;
          </button>
          <button
            type="button"
            className={`${styles.heroButton} ${styles.fav}`}
            onClick={toggleFav}
            aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
            aria-pressed={fav}
          >
            {fav ? '♥' : '♡'}
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.title}>{DETAIL.title}</div>
          <div className={styles.meta}>{DETAIL.meta}</div>
          <div className={styles.desc}>{DETAIL.desc}</div>
          <div className={styles.prompt}>{DETAIL.prompt}</div>
          <div className={styles.tags}>
            {DETAIL.tags.map((tag) => (
              <Chip key={tag} label={tag} wide />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.cta}>
        <Button variant="solid" block height={56} fontSize={15} onClick={() => go('generating')}>
          Replay this night
        </Button>
      </div>
    </>
  )
}
