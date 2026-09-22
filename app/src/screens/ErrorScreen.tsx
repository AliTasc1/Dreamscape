import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Screen } from '../ui/Screen'
import styles from './ErrorScreen.module.css'

/** Nothing is broken, and the copy never says otherwise. */
export function ErrorScreen() {
  const { t } = useI18n()
  const { go, plan } = useApp()

  return (
    <Screen className={styles.error}>
      <div className={styles.ring} />
      <div className={styles.line}>{t.error.line}</div>
      <div className={styles.sub}>{t.error.sub}</div>
      <Button
        variant="solid"
        height={52}
        paddingX={34}
        fontSize={14}
        className={styles.action}
        onClick={() => go(plan ? 'session' : 'home')}
      >
        {t.error.cta}
      </Button>
    </Screen>
  )
}
