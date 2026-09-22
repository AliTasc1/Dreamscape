import { PROFILE_STAT_VALUES } from '../data/content'
import { LOCALES, useI18n, type LanguageId } from '../i18n'
import { useApp } from '../state/appState'
import { Screen } from '../ui/Screen'
import styles from './Profile.module.css'

const NAME = 'Ali'

export function Profile() {
  const { t, f, minutes } = useI18n()
  const app = useApp()

  const nextLanguage: LanguageId = app.lang === 'tr' ? 'en' : 'tr'

  const rows: { label: string; value: string; onClick: () => void }[] = [
    { label: t.profile.rows.companion, value: t.companion.name, onClick: () => app.go('companion') },
    {
      label: t.profile.rows.voice,
      value: t.options.voice[app.prefs.voice],
      onClick: () => app.go('companion'),
    },
    {
      label: t.profile.rows.sleep,
      value: minutes(app.minutes),
      onClick: () => app.go('create'),
    },
    {
      label: t.profile.rows.ambient,
      value: t.options.amb[app.prefs.amb],
      onClick: () => app.openSheet(),
    },
    {
      label: t.profile.rows.memory,
      value: app.memoryEmpty ? '' : f(t.memory.sessionCount, { n: app.memory.nights }),
      onClick: () => app.go('memory'),
    },
    {
      label: t.profile.rows.tone,
      value: t.options.tone[app.tone],
      onClick: () => app.go('consent'),
    },
    { label: t.profile.rows.notifications, value: '', onClick: () => app.go('notif') },
    {
      // Switching language is one tap, both ways, and it re-renders everything.
      label: t.profile.rows.language,
      value: LOCALES[app.lang].meta.nativeName,
      onClick: () => app.chooseLanguageInPlace(nextLanguage),
    },
    { label: t.profile.rows.privacy, value: '', onClick: () => app.go('privacy') },
    {
      label: t.profile.rows.subscription,
      value: app.premium ? t.profile.subscriptionPremium : t.profile.subscriptionFree,
      onClick: () => app.go('premium'),
    },
  ]

  const stats = [
    { value: String(app.memory.nights + app.nights.length), label: t.profile.stats.dreams },
    { value: PROFILE_STAT_VALUES.relaxed, label: t.profile.stats.relaxed },
    { value: PROFILE_STAT_VALUES.favourites, label: t.profile.stats.favourites },
  ]

  return (
    <Screen scroll>
      <div className={styles.header}>
        <div className={styles.avatar} />
        <div>
          <div className={styles.name}>{f(t.profile.greeting, { name: NAME })}</div>
          <div className={styles.plan}>
            {app.premium ? t.profile.planPremium : t.profile.planFree}
          </div>
        </div>
      </div>

      <div className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.rows}>
        {rows.map((row) => (
          <button key={row.label} type="button" className={styles.row} onClick={row.onClick}>
            <span>{row.label}</span>
            <span className={styles.rowValue}>{row.value}</span>
          </button>
        ))}
      </div>
    </Screen>
  )
}
