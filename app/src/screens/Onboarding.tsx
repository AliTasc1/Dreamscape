import { ONBOARDING } from '../data/content'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Screen } from '../ui/Screen'
import styles from './Onboarding.module.css'

export function Onboarding() {
  const { ob, nextOnboarding, go } = useApp()
  const step = ONBOARDING[ob]

  return (
    <Screen className={styles.onboarding}>
      <div className={styles.dots}>
        {ONBOARDING.map((_, i) => (
          <div
            key={i}
            className={`${styles.dot}${i === ob ? ` ${styles.dotActive}` : ''}`}
          />
        ))}
      </div>

      <div className={styles.body}>
        <div className={styles.art} style={{ background: step.art }}>
          <div className={styles.artMoon} />
          <div className={styles.artScrim} />
        </div>
        <div className={styles.title}>{step.title}</div>
        <div className={styles.copy}>{step.body}</div>
        {step.quote && <div className={styles.quote}>{step.quote}</div>}
      </div>

      <div className={styles.footer}>
        <Button
          variant="gradientDusk"
          block
          height={56}
          fontSize={15}
          hoverScale={1.02}
          onClick={nextOnboarding}
        >
          {step.cta}
        </Button>
        <Button variant="ghost" block className={styles.skip} onClick={() => go('home')}>
          Skip
        </Button>
      </div>
    </Screen>
  )
}
