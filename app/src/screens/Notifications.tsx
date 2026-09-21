import { NOTIFS, NOTIF_TOGGLES } from '../data/content'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Pressable } from '../ui/Pressable'
import { Screen } from '../ui/Screen'
import styles from './Notifications.module.css'

export function Notifications() {
  const { go, notifOn, toggleNotif } = useApp()

  return (
    <Screen scroll>
      <Button variant="ghost" className={styles.back} onClick={() => go('profile')}>
        &lsaquo; Profile
      </Button>
      <div className={styles.title}>A gentle nudge</div>

      <div className={styles.previews}>
        {NOTIFS.map((message) => (
          <div key={message} className={styles.preview}>
            <div className={styles.icon} />
            <div>
              <div className={styles.appName}>Dreamscape</div>
              <div className={styles.previewBody}>{message}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.toggles}>
        {NOTIF_TOGGLES.map((label) => {
          const on = !!notifOn[label]
          return (
            <Pressable
              key={label}
              className={styles.toggle}
              onClick={() => toggleNotif(label)}
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
