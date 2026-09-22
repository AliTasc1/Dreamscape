import type { CSSProperties } from 'react'
import { PREMIUM_DURATIONS, THEME_IDS, maxMinutesFor } from '../domain/options'
import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { latestCallback } from '../state/memory'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Eyebrow } from '../ui/Eyebrow'
import { Pressable } from '../ui/Pressable'
import { Screen } from '../ui/Screen'
import { TalkOverlay } from './TalkOverlay'
import styles from './Create.module.css'

export function Create() {
  const { t, f, minutes } = useI18n()
  const app = useApp()

  const callback = latestCallback(app.memory)
  const allowed = maxMinutesFor(app.premium)
  const summary = [
    t.options.voice[app.prefs.voice],
    t.options.mood[app.prefs.mood],
    t.options.amb[app.prefs.amb],
    minutes(app.minutes),
  ].join(' · ')

  return (
    <>
      {/* Room to scroll clear of the CTA bar and the nav stacked beneath it. */}
      <Screen scroll style={{ '--screen-pb': 'calc(var(--nav-h) + 106px)' } as CSSProperties}>
        <div className={styles.heading}>{t.create.heading}</div>

        {callback && (
          <div className={styles.remembers}>{f(t.create.remembers, { memory: callback })}</div>
        )}

        <div className={styles.field}>
          <textarea
            className={styles.input}
            value={app.prompt}
            onChange={(event) => app.setPrompt(event.target.value)}
            placeholder={t.create.placeholder}
            aria-label={t.create.heading}
          />
          <div className={styles.fieldRow}>
            <Button
              variant="link"
              fontSize={12}
              onClick={() => app.useExamplePrompt(t.create.examplePrompt)}
            >
              {t.create.useExample}
            </Button>
            <Button
              variant="glass"
              className={styles.mic}
              onClick={app.openTalk}
              aria-label={t.create.micLabel}
            >
              {t.create.mic}
            </Button>
          </div>
        </div>

        <div className={styles.chips}>
          {THEME_IDS.map((theme) => (
            <Chip
              key={theme}
              label={t.options.theme[theme]}
              active={app.themes.includes(theme)}
              onClick={() => app.toggleTheme(theme)}
            />
          ))}
        </div>

        <Eyebrow style={{ display: 'block', marginTop: 26 }}>{t.create.durationTitle}</Eyebrow>
        <div className={styles.durations}>
          {PREMIUM_DURATIONS.map((option) => {
            const locked = option > allowed
            return (
              <Chip
                key={option}
                label={minutes(option)}
                active={app.minutes === option}
                disabled={locked}
                onClick={() => (locked ? app.openPaywall() : app.setMinutes(option))}
              />
            )
          })}
        </div>
        {!app.premium && <div className={styles.lockHint}>{t.create.durationLocked}</div>}

        <Pressable className={styles.settings} onClick={app.openSheet}>
          <div>
            <div className={styles.settingsTitle}>{t.create.settingsTitle}</div>
            <div className={styles.settingsSummary}>{summary}</div>
          </div>
          <div className={styles.chevron}>&rsaquo;</div>
        </Pressable>

        <div className={styles.footnote}>{t.create.footnote}</div>
      </Screen>

      <div className={styles.cta}>
        <Button
          variant="gradientEmber"
          block
          height={58}
          fontSize={15.5}
          hoverScale={1.015}
          onClick={app.startNight}
          disabled={!app.prompt.trim()}
          style={!app.prompt.trim() ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
        >
          {app.prompt.trim() ? t.create.cta : t.create.emptyPrompt}
        </Button>
      </div>

      {app.talk && <TalkOverlay dismissLabel={t.talk.backToWriting} onSay={app.setPrompt} />}
    </>
  )
}
