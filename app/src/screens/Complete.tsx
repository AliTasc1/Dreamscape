import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Eyebrow } from '../ui/Eyebrow'
import { Screen } from '../ui/Screen'
import styles from './Complete.module.css'

export function Complete() {
  const { t, f, minutes } = useI18n()
  const app = useApp()

  const spent = Math.max(1, Math.round(app.elapsed / 60))
  const learned = [
    ...(app.reflection?.themes ?? []),
    ...(app.reflection?.feelings ?? []),
    ...(app.reflection?.personas ?? []),
  ].slice(0, 3)

  const stats = [
    { value: f(t.common.minutesShort, { n: spent }), label: t.complete.stats.timeInDream },
    {
      value: f(t.common.minutesShort, { n: Math.max(0, app.minutes - spent) }),
      label: t.complete.stats.awake,
    },
    { value: t.options.amb[app.prefs.amb], label: t.complete.stats.ambience },
  ]

  return (
    <Screen className={styles.complete}>
      <div className={styles.eyebrow}>{t.complete.eyebrow}</div>
      <div className={styles.title}>{app.plan?.title ?? t.detail.title}</div>

      <div className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.prompt}>{app.prompt.trim() || t.create.examplePrompt}</div>

      {learned.length > 0 && (
        <div className={styles.learned}>
          <Eyebrow>{t.complete.learned}</Eyebrow>
          <div className={styles.learnedList}>
            {learned.map((entry) => (
              <div key={entry} className={styles.learnedItem}>
                {entry}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.spacer} />

      <div className={styles.actions}>
        <Button
          variant="outline"
          height={54}
          fontSize={14}
          className={styles.action}
          onClick={app.saveNight}
        >
          {t.complete.save}
        </Button>
        <Button
          variant="solid"
          height={54}
          fontSize={14}
          className={styles.action}
          onClick={app.enterSession}
        >
          {t.complete.replay}
        </Button>
      </div>
      <div className={styles.footnote}>{minutes(app.minutes)}</div>
    </Screen>
  )
}
