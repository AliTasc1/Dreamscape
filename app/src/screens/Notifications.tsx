import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Pressable } from '../ui/Pressable'
import { Screen } from '../ui/Screen'
import styles from './Notifications.module.css'

const TOGGLE_KEYS = ['bedtime', 'weekly', 'finished', 'quiet'] as const

export function Notifications() {
  const { t } = useI18n()
  const app = useApp()

  return (
    <Screen scroll>
      <Button variant="ghost" className={styles.back} onClick={() => app.go('profile')}>
        &lsaquo; {t.nav.profile}
      </Button>
      <div className={styles.title}>{t.notif.title}</div>

      <div className={styles.previews}>
        {t.notif.previews.map((message) => (
          <div key={message} className={styles.preview}>
            <div className={styles.icon} />
            <div>
              <div className={styles.appName}>{t.common.appName}</div>
              <div className={styles.previewBody}>{message}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.toggles}>
        {TOGGLE_KEYS.map((key) => {
          const on = !!app.notifOn[key]
          const label = t.notif.toggles[key]
          return (
            <Pressable
              key={key}
              className={styles.toggle}
              onClick={() => app.toggleNotif(key)}
              label={label}
              pressed={on}
            >
              <div className={styles.toggleLabel}>{label}</div>
              <div className={`${styles.track}${on ? ` ${styles.trackOn}` : ''}`}>
                <div className={`${styles.knob}${on ? ` ${styles.knobOn}` : ''}`} />
              </div>
            </Pressable>
          )
        })}
      </div>
    </Screen>
  )
}
