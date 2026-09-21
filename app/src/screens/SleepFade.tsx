import { Screen } from '../ui/Screen'
import styles from './SleepFade.module.css'

export function SleepFade() {
  return (
    <Screen className={styles.fade}>
      <div className={styles.inner}>
        <div className={styles.dot} />
        <div className={styles.goodnight}>Good night.</div>
      </div>
    </Screen>
  )
}
