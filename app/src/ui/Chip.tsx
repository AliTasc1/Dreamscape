import type { ReactNode } from 'react'
import { OPTION_SETS, type OptionKey } from '../domain/options'
import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Eyebrow } from './Eyebrow'
import styles from './Chip.module.css'

interface ChipProps {
  label: ReactNode
  active?: boolean
  onClick?: () => void
  /** Slightly roomier — used for the tags on Dream Detail. */
  wide?: boolean
  disabled?: boolean
}

export function Chip({ label, active, onClick, wide, disabled }: ChipProps) {
  const classes = [styles.chip]
  if (active) classes.push(styles.active)
  if (!onClick) classes.push(styles.static)
  if (wide) classes.push(styles.wide)
  if (disabled) classes.push(styles.disabled)

  if (!onClick) return <div className={classes.join(' ')}>{label}</div>

  return (
    <button
      type="button"
      className={classes.join(' ')}
      onClick={onClick}
      aria-pressed={!!active}
    >
      {label}
    </button>
  )
}

/** A labelled row of single-choice chips bound to one preference key. */
export function ChoiceChips({ optionKey, label }: { optionKey: OptionKey; label: string }) {
  const app = useApp()
  const { t } = useI18n()
  const current = app.prefs[optionKey]
  const labels = t.options[optionKey] as Record<string, string>

  return (
    <div>
      <Eyebrow style={{ letterSpacing: '0.2em' }}>{label}</Eyebrow>
      <div className={styles.group} role="group" aria-label={label}>
        {OPTION_SETS[optionKey].map((option) => (
          <Chip
            key={option}
            label={labels[option] ?? option}
            active={current === option}
            onClick={() => app.choose(optionKey, option)}
          />
        ))}
      </div>
    </div>
  )
}
