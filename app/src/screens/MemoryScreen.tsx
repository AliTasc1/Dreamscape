import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import type { MemoryBucket } from '../state/memory'
import { Button } from '../ui/Button'
import { Eyebrow } from '../ui/Eyebrow'
import { Screen } from '../ui/Screen'
import styles from './MemoryScreen.module.css'

/**
 * Everything the companion has picked up, in the listener's own words, with a
 * "forget" beside each line. The privacy promise is only real if it is here.
 */
export function MemoryScreen() {
  const { t, f } = useI18n()
  const app = useApp()
  const { memory } = app

  const groups: { bucket: MemoryBucket; label: string; entries: string[] }[] = [
    { bucket: 'themes', label: t.memory.themes, entries: memory.themes },
    { bucket: 'feelings', label: t.memory.feelings, entries: memory.feelings },
    { bucket: 'personas', label: t.memory.people, entries: memory.personas },
  ]

  return (
    <Screen scroll>
      <Button variant="ghost" className={styles.back} onClick={() => app.go('profile')}>
        &lsaquo; {t.profile.rows.companion}
      </Button>
      <div className={styles.title}>{t.memory.title}</div>
      <div className={styles.lede}>{t.memory.lede}</div>
      {memory.nights > 0 && (
        <div className={styles.count}>{f(t.memory.sessionCount, { n: memory.nights })}</div>
      )}

      {app.memoryEmpty ? (
        <div className={styles.empty}>{t.memory.empty}</div>
      ) : (
        <>
          {groups
            .filter((group) => group.entries.length > 0)
            .map((group) => (
              <div key={group.bucket} className={styles.group}>
                <Eyebrow>{group.label}</Eyebrow>
                <div className={styles.entries}>
                  {group.entries.map((entry) => (
                    <div key={entry} className={styles.entry}>
                      <div className={styles.entryText}>{entry}</div>
                      <Button
                        variant="link"
                        className={styles.forget}
                        onClick={() => app.forgetMemory(group.bucket, entry)}
                      >
                        {t.memory.forget}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {memory.moments.length > 0 && (
            <div className={styles.group}>
              <Eyebrow>{t.memory.moments}</Eyebrow>
              <div className={styles.entries}>
                {memory.moments.map((moment) => (
                  <div key={moment.text} className={styles.entry}>
                    <div>
                      <div className={styles.moment}>“{moment.text}”</div>
                      <div className={styles.entryDate}>{moment.at}</div>
                    </div>
                    <Button
                      variant="link"
                      className={styles.forget}
                      onClick={() => app.forgetMemory('moments', moment.text)}
                    >
                      {t.memory.forget}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            variant="danger"
            block
            height={50}
            fontSize={13}
            className={styles.forgetAll}
            onClick={app.forgetAllMemory}
          >
            {t.memory.forgetAll}
          </Button>
        </>
      )}
    </Screen>
  )
}
