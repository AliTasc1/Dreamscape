import { FAVORITES, HOME_EXAMPLES, TONIGHT } from '../data/content'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Eyebrow } from '../ui/Eyebrow'
import { Pressable } from '../ui/Pressable'
import { Screen } from '../ui/Screen'
import styles from './Home.module.css'

export function Home() {
  const { go } = useApp()

  return (
    <Screen scroll>
      <div className={styles.greeting}>Good night, Ali</div>
      <div className={styles.question}>What would you like to imagine tonight?</div>

      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <div data-decor className={styles.heroMist} />
        <div className={styles.heroBody}>
          <div className={styles.badge}>Tonight&rsquo;s dream</div>
          <div>
            <div className={styles.heroTitle}>{TONIGHT.title}</div>
            <div className={styles.heroDesc}>{TONIGHT.desc}</div>
            <div className={styles.heroActions}>
              <Button
                variant="solid"
                height={46}
                paddingX={30}
                fontSize={14}
                hoverScale={1.04}
                onClick={() => go('generating')}
              >
                Begin
              </Button>
              <div className={styles.heroMeta}>{TONIGHT.meta}</div>
            </div>
          </div>
        </div>
      </div>

      <Eyebrow style={{ display: 'block', marginTop: 30 }}>Create your own world</Eyebrow>
      <Pressable
        className={styles.composer}
        onClick={() => go('create')}
        label="Describe what you want to imagine"
      >
        <div className={styles.composerPlaceholder}>
          Describe what you want to imagine&hellip;
        </div>
        <div className={styles.composerChips}>
          {HOME_EXAMPLES.map((example) => (
            <Chip key={example} label={example} />
          ))}
        </div>
      </Pressable>

      <div className={styles.sectionRow}>
        <Eyebrow>Return to a world</Eyebrow>
        <Button
          variant="link"
          fontSize={12}
          style={{ color: 'rgba(169,176,255,.7)' }}
          onClick={() => go('nights')}
        >
          My nights
        </Button>
      </div>
      <div className={styles.rail}>
        {FAVORITES.map((world) => (
          <Pressable
            key={world.title}
            className={styles.card}
            style={{ background: world.art }}
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
