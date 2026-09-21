import type { ReactNode } from 'react'
import { useApp } from '../state/appState'
import type { ChoiceGroup } from '../types'
import { Eyebrow } from './Eyebrow'
import styles from './Chip.module.css'

interface ChipProps {
  label: ReactNode
  active?: boolean
  onClick?: () => void
  /** Slightly roomier — used for the tags on Dream Detail. */
  wide?: boolean
}

export function Chip({ label, active, onClick, wide }: ChipProps) {
  const classes = [styles.chip]
  if (active) classes.push(styles.active)
  if (!onClick) classes.push(styles.static)
  if (wide) classes.push(styles.wide)

  if (!onClick) return <div className={classes.join(' ')}>{label}</div>

  return (
    <button type="button" className={classes.join(' ')} onClick={onClick} aria-pressed={!!active}>
      {label}
    </button>
  )
}

/** A labelled row of single-choice chips bound to one preference key. */
export function ChoiceChips({ group }: { group: ChoiceGroup }) {
  const app = useApp()
  const current = app[group.key]

  return (
    <div>
      <Eyebrow style={{ letterSpacing: '0.2em' }}>{group.label}</Eyebrow>
      <div className={styles.group} role="group" aria-label={group.label}>
        {group.options.map((option) => (
          <Chip
            key={option}
            label={option}
            active={current === option}
            onClick={() => app.choose(group.key, option)}
          />
        ))}
      </div>
    </div>
  )
}
