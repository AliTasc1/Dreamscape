import { NightScene } from '../art/NightScene'
import { ONBOARDING_PALETTES } from '../data/content'
import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Screen } from '../ui/Screen'
import styles from './Onboarding.module.css'

export function Onboarding() {
  const { t } = useI18n()
  const { ob, nextOnboarding, finishOnboarding } = useApp()
  const step = t.onboarding.steps[ob] ?? t.onboarding.steps[0]

  return (
    <Screen className={styles.onboarding}>
      <div className={styles.dots}>
        {t.onboarding.steps.map((_, i) => (
          <div key={i} className={`${styles.dot}${i === ob ? ` ${styles.dotActive}` : ''}`} />
        ))}
      </div>

      <div className={styles.body}>
        <div className={styles.art}>
          <NightScene palette={ONBOARDING_PALETTES[ob]} moonX={0.3 + ob * 0.12} />
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
        <Button variant="ghost" block className={styles.skip} onClick={finishOnboarding}>
          {t.common.skip}
        </Button>
      </div>
    </Screen>
  )
}
