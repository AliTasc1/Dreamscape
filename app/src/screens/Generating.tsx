import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Screen } from '../ui/Screen'
import styles from './Generating.module.css'

/**
 * The wait while the prompt is read and the night is planned.
 *
 * The phrases advance on their own so the screen keeps breathing, but the
 * Enter button is gated on the real plan arriving — the progress line stops
 * one step short until it does.
 */
const PHRASE_MS = 1400

export function Generating() {
  const { t } = useI18n()
  const { planning, plan, planError, retryPlan, enterSession } = useApp()
  const [step, setStep] = useState(0)

  const lastStep = t.generating.phrases.length - 1
  const ready = !planning && plan !== null

  useEffect(() => {
    if (ready) {
      setStep(lastStep)
      return
    }
    const id = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, lastStep - 1))
    }, PHRASE_MS)
    return () => window.clearInterval(id)
  }, [ready, lastStep])

  const progress = ready ? 100 : ((step + 1) / (lastStep + 1)) * 100

  return (
    <Screen className={styles.generating}>
      <div className={styles.orbStack}>
        <div className={styles.halo} />
        <div data-decor className={styles.ring} />
        <div className={styles.core} />
      </div>

      <div className={styles.caption}>
        <div className={styles.phrase} role="status">
          {planError ? t.generating.failed : t.generating.phrases[step]}
        </div>
        {ready && plan && <div className={styles.planTitle}>{plan.title}</div>}
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {planError && (
        <Button
          variant="outline"
          height={52}
          paddingX={34}
          fontSize={14}
          className={styles.enter}
          onClick={retryPlan}
        >
          {t.generating.retry}
        </Button>
      )}

      {ready && (
        <Button
          variant="solid"
          height={56}
          paddingX={54}
          fontSize={15}
          hoverScale={1.04}
          className={styles.enter}
          onClick={enterSession}
        >
          {t.generating.enter}
        </Button>
      )}
    </Screen>
  )
}
