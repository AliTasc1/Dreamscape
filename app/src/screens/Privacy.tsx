import { PRIVACY_ROWS } from '../data/content'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Screen } from '../ui/Screen'
import styles from './Privacy.module.css'

export function Privacy() {
  const { go } = useApp()

  return (
    <Screen scroll>
      <Button variant="ghost" className={styles.back} onClick={() => go('profile')}>
        &lsaquo; Profile
      </Button>
      <div className={styles.title}>What you imagine stays yours.</div>
      <div className={styles.lede}>
        Your dreams can be personal. Here is exactly what happens to them.
      </div>

      <div className={styles.rows}>
        {PRIVACY_ROWS.map((row) => (
          <div key={row.title} className={styles.row}>
            <div className={styles.rowTitle}>{row.title}</div>
            <div className={styles.rowBody}>{row.body}</div>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <Button variant="outline" height={50} fontSize={13} className={styles.action}>
          Export my data
        </Button>
        <Button variant="danger" height={50} fontSize={13} className={styles.action}>
          Delete everything
        </Button>
      </div>
    </Screen>
  )
}
