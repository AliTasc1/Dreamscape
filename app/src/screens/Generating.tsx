import { GEN_PHRASES } from '../data/content'
import { GEN_STEPS, useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Screen } from '../ui/Screen'
import styles from './Generating.module.css'

export function Generating() {
  const { gen, ready, go } = useApp()

  return (
    <Screen className={styles.generating}>
      <div className={styles.orbStack}>
        <div className={styles.halo} />
        <div data-decor className={styles.ring} />
        <div className={styles.core} />
      </div>

      <div className={styles.caption}>
        <div className={styles.phrase} role="status">
          {GEN_PHRASES[gen]}
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${(gen / GEN_STEPS) * 100}%` }} />
        </div>
      </div>

      {ready && (
        <Button
          variant="solid"
          height={56}
          paddingX={54}
          fontSize={15}
          hoverScale={1.04}
          className={styles.enter}
          onClick={() => go('session')}
        >
          Enter
        </Button>
      )}
    </Screen>
  )
}
