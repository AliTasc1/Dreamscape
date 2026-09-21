import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Screen } from '../ui/Screen'
import styles from './ErrorScreen.module.css'

/** Nothing is broken, and the copy never says otherwise. */
export function ErrorScreen() {
  const { go } = useApp()

  return (
    <Screen className={styles.error}>
      <div className={styles.ring} />
      <div className={styles.line}>We lost the thread for a moment.</div>
      <div className={styles.sub}>Nothing is broken. Let&rsquo;s try again.</div>
      <Button
        variant="solid"
        height={52}
        paddingX={34}
        fontSize={14}
        className={styles.action}
        onClick={() => go('session')}
      >
        Return to the Dream
      </Button>
    </Screen>
  )
}
