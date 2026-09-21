import { EXAMPLE_PROMPT, SUMMARY_STATS, SUMMARY_TITLE } from '../data/content'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Screen } from '../ui/Screen'
import styles from './Complete.module.css'

export function Complete() {
  const { go, prompt } = useApp()

  return (
    <Screen className={styles.complete}>
      <div className={styles.eyebrow}>Session complete</div>
      <div className={styles.title}>{SUMMARY_TITLE}</div>

      <div className={styles.stats}>
        {SUMMARY_STATS.map((stat) => (
          <div key={stat.label}>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.prompt}>{prompt.trim() || EXAMPLE_PROMPT}</div>

      <div className={styles.spacer} />

      <div className={styles.actions}>
        <Button
          variant="outline"
          height={54}
          fontSize={14}
          className={styles.action}
          onClick={() => go('nights')}
        >
          Save to My Nights
        </Button>
        <Button
          variant="solid"
          height={54}
          fontSize={14}
          className={styles.action}
          onClick={() => go('session')}
        >
          Replay
        </Button>
      </div>
    </Screen>
  )
}
