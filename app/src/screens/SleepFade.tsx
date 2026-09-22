import { useI18n } from '../i18n'
import { Screen } from '../ui/Screen'
import styles from './SleepFade.module.css'

export function SleepFade() {
  const { t } = useI18n()
  return (
    <Screen className={styles.fade}>
      <div className={styles.inner}>
        <div className={styles.dot} />
        <div className={styles.goodnight}>{t.fade.goodnight}</div>
      </div>
    </Screen>
  )
}
