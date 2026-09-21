import { COMPANION, PROFILE_STATS } from '../data/content'
import { useApp } from '../state/appState'
import { Screen } from '../ui/Screen'
import type { Screen as ScreenName } from '../types'
import styles from './Profile.module.css'

export function Profile() {
  const app = useApp()

  const rows: { label: string; value: string; to?: ScreenName }[] = [
    { label: 'AI Companion', value: COMPANION.name, to: 'companion' },
    { label: 'Voice', value: app.voice, to: 'companion' },
    { label: 'Sleep preferences', value: app.dur, to: 'companion' },
    { label: 'Ambient sounds', value: app.amb, to: 'companion' },
    { label: 'Notifications', value: '', to: 'notif' },
    { label: 'Language', value: 'English' },
    { label: 'Privacy', value: '', to: 'privacy' },
    { label: 'Subscription', value: 'Premium', to: 'premium' },
  ]

  return (
    <Screen scroll>
      <div className={styles.header}>
        <div className={styles.avatar} />
        <div>
          <div className={styles.name}>Good evening, Ali.</div>
          <div className={styles.plan}>Dreamscape Premium</div>
        </div>
      </div>

      <div className={styles.stats}>
        {PROFILE_STATS.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.rows}>
        {rows.map((row) => (
          <button
            key={row.label}
            type="button"
            className={styles.row}
            onClick={row.to ? () => app.go(row.to as ScreenName) : undefined}
          >
            <span>{row.label}</span>
            <span className={styles.rowValue}>{row.value}</span>
          </button>
        ))}
      </div>
    </Screen>
  )
}
