import { useApp } from '../state/appState'
import { Screen } from '../ui/Screen'
import styles from './Splash.module.css'

export function Splash() {
  const { go } = useApp()

  return (
    <Screen className={styles.splash} onClick={() => go('onboarding')}>
      <div className={styles.moon} />
      <div className={styles.words}>
        <div className={styles.wordmark}>DREAMSCAPE</div>
        <div className={styles.tagline}>Close your eyes. We&rsquo;ll take you somewhere.</div>
      </div>
    </Screen>
  )
}
