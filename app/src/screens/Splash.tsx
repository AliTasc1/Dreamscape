import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Screen } from '../ui/Screen'
import styles from './Splash.module.css'

export function Splash() {
  const { t } = useI18n()
  const { go, lang, tone, onboarded } = useApp()

  const skip = () => {
    if (!lang) go('language')
    else if (!tone) go('consent')
    else go(onboarded ? 'home' : 'onboarding')
  }

  return (
    <Screen className={styles.splash} onClick={skip}>
      <div className={styles.moon} />
      <div className={styles.words}>
        <div className={styles.wordmark}>DREAMSCAPE</div>
        <div className={styles.tagline}>{t.splash.tagline}</div>
      </div>
    </Screen>
  )
}
