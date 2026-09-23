import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Pressable } from '../ui/Pressable'
import { Screen } from '../ui/Screen'
import styles from './Privacy.module.css'

export function Privacy() {
  const { t } = useI18n()
  const app = useApp()

  return (
    <Screen scroll>
      <Button variant="ghost" className={styles.back} onClick={() => app.go('profile')}>
        &lsaquo; {t.nav.profile}
      </Button>
      <div className={styles.title}>{t.privacy.title}</div>
      <div className={styles.lede}>{t.privacy.lede}</div>

      <div className={styles.rows}>
        {t.privacy.rows.map((row) => (
          <div key={row.title} className={styles.row}>
            <div className={styles.rowTitle}>{row.title}</div>
            <div className={styles.rowBody}>{row.body}</div>
          </div>
        ))}
      </div>

      {/* The one network call the app makes on its own behalf, and it is opt-in. */}
      <Pressable
        className={`${styles.row} ${styles.skyRow}`}
        onClick={() => app.setUseRealSky(!app.useRealSky)}
        label={t.sky.title}
        pressed={app.useRealSky}
      >
        <div>
          <div className={styles.rowTitle}>{t.sky.title}</div>
          <div className={styles.rowBody}>{app.sky ? t.sky.onWithReading : t.sky.body}</div>
        </div>
        <div className={`${styles.track}${app.useRealSky ? ` ${styles.trackOn}` : ''}`}>
          <div className={`${styles.knob}${app.useRealSky ? ` ${styles.knobOn}` : ''}`} />
        </div>
      </Pressable>

      <div className={styles.actions}>
        <Button
          variant="outline"
          height={50}
          fontSize={13}
          className={styles.action}
          onClick={app.exportData}
        >
          {t.privacy.exportData}
        </Button>
        <Button
          variant="danger"
          height={50}
          fontSize={13}
          className={styles.action}
          onClick={app.deleteEverything}
        >
          {t.privacy.deleteAll}
        </Button>
      </div>
    </Screen>
  )
}
