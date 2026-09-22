import { PREMIUM_DURATIONS, maxMinutesFor } from '../domain/options'
import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Chip, ChoiceChips } from '../ui/Chip'
import { Eyebrow } from '../ui/Eyebrow'
import styles from './SettingsSheet.module.css'

/**
 * Voice, ambience and length. Everything in here is optional — the defaults
 * are already the sleep-safe ones, so the sheet exists to be ignored.
 */
export function SettingsSheet() {
  const { t, minutes } = useI18n()
  const app = useApp()
  const allowed = maxMinutesFor(app.premium)

  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        onClick={app.closeSheet}
        aria-label={t.common.close}
      />
      <div className={styles.sheet} role="dialog" aria-label={t.create.settingsTitle}>
        <div className={styles.grabber} />
        <div className={styles.groups}>
          <ChoiceChips optionKey="voice" label={t.sheet.voice} />
          <ChoiceChips optionKey="mood" label={t.sheet.mood} />
          <ChoiceChips optionKey="amb" label={t.sheet.ambience} />

          <div>
            <Eyebrow style={{ letterSpacing: '0.2em' }}>{t.sheet.duration}</Eyebrow>
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
          </div>
        </div>

        <Button
          variant="solidSoft"
          block
          height={54}
          fontSize={14}
          className={styles.done}
          onClick={app.closeSheet}
        >
          {t.common.done}
        </Button>
      </div>
    </>
  )
}
