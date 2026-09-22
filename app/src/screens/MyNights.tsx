import { NIGHT_ART, artForAmbience } from '../data/content'
import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Pressable } from '../ui/Pressable'
import { Screen } from '../ui/Screen'
import styles from './MyNights.module.css'

export function MyNights() {
  const { t, minutes } = useI18n()
  const app = useApp()

  /** Nights the listener actually saved come first; the samples fill the rest. */
  const saved = app.nights.map((night) => ({
    key: night.id,
    title: night.title,
    meta: [night.at, minutes(night.minutes), night.personaWho].filter(Boolean).join(' · '),
    ambient: t.options.amb[night.ambience as keyof typeof t.options.amb] ?? night.ambience,
    art: artForAmbience(night.ambience),
  }))
  const samples = t.nights.rows.map((row, i) => ({
    key: `sample-${i}`,
    title: row.title,
    meta: row.meta,
    ambient: row.ambient,
    art: NIGHT_ART[i],
  }))
  const rows = [...saved, ...samples]

  return (
    <Screen scroll>
      <div className={styles.header}>
        <div className={styles.title}>{t.nights.title}</div>
        {/* Carried over from the prototype so the empty state stays reviewable. */}
        <Button variant="link" className={styles.stateToggle} onClick={app.toggleNightsEmpty}>
          {app.nightsEmpty ? t.nights.showFilled : t.nights.showEmpty}
        </Button>
      </div>

      {app.nightsEmpty ? (
        <div className={styles.empty}>
          <div className={styles.emptyRing}>
            <div className={styles.emptyMoon} />
          </div>
          <div className={styles.emptyLine}>{t.nights.emptyLine}</div>
          <div className={styles.emptyCopy}>{t.nights.emptyCopy}</div>
          <Button
            variant="solid"
            height={50}
            paddingX={32}
            fontSize={14}
            onClick={() => app.go('create')}
          >
            {t.nights.emptyCta}
          </Button>
        </div>
      ) : (
        <div className={styles.list}>
          {rows.map((night) => (
            <Pressable
              key={night.key}
              className={styles.row}
              onClick={() => app.go('detail')}
            >
              <div className={styles.thumb} style={{ background: night.art }} />
              <div className={styles.rowText}>
                <div className={styles.rowTitle}>{night.title}</div>
                <div className={styles.rowMeta}>{night.meta}</div>
                <div className={styles.rowAmbient}>{night.ambient}</div>
              </div>
              <div className={styles.chevron} aria-hidden="true">
                &rsaquo;
              </div>
            </Pressable>
          ))}
        </div>
      )}
    </Screen>
  )
}
