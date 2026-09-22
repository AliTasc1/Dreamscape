import { NightScene } from '../art/NightScene'
import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import styles from './DreamDetail.module.css'

export function DreamDetail() {
  const { t } = useI18n()
  const app = useApp()

  /** The most recently saved night, or the sample when nothing is saved yet. */
  const night = app.nights[0]
  const title = night?.title ?? t.detail.title
  const meta = night ? [night.at, `${night.minutes}`, night.personaWho].join(' · ') : t.detail.meta
  const prompt = night?.prompt ?? t.create.examplePrompt

  const replay = () => {
    app.useExamplePrompt(prompt)
    app.startNight()
  }

  return (
    <>
      <div className={styles.scroll}>
        <div className={styles.hero}>
          <NightScene palette="indigo" moonX={0.66} />
          <div className={styles.heroGlow} />
          <div className={styles.heroScrim} />
          <button
            type="button"
            className={`${styles.heroButton} ${styles.back}`}
            onClick={() => app.go('nights')}
            aria-label={t.detail.backLabel}
          >
            &lsaquo;
          </button>
          <button
            type="button"
            className={`${styles.heroButton} ${styles.fav}`}
            onClick={app.toggleFav}
            aria-label={app.fav ? t.detail.favRemove : t.detail.favAdd}
            aria-pressed={app.fav}
          >
            {app.fav ? '♥' : '♡'}
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.title}>{title}</div>
          <div className={styles.meta}>{meta}</div>
          <div className={styles.desc}>{t.detail.desc}</div>
          <div className={styles.prompt}>{prompt}</div>
          <div className={styles.tags}>
            {t.detail.tags.map((tag) => (
              <Chip key={tag} label={tag} wide />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.cta}>
        <Button variant="solid" block height={56} fontSize={15} onClick={replay}>
          {t.detail.replay}
        </Button>
      </div>
    </>
  )
}
