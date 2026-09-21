import { SHEET_GROUPS } from '../data/content'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { ChoiceChips } from '../ui/Chip'
import styles from './SettingsSheet.module.css'

/**
 * Voice, ambience and length. Everything in here is optional — the defaults
 * are already the sleep-safe ones, so the sheet exists to be ignored.
 */
export function SettingsSheet() {
  const { closeSheet } = useApp()

  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        onClick={closeSheet}
        aria-label="Close settings"
      />
      <div className={styles.sheet} role="dialog" aria-label="Voice, ambience and length">
        <div className={styles.grabber} />
        <div className={styles.groups}>
          {SHEET_GROUPS.map((group) => (
            <ChoiceChips key={group.key} group={group} />
          ))}
        </div>
        <Button
          variant="solidSoft"
          block
          height={54}
          fontSize={14}
          className={styles.done}
          onClick={closeSheet}
        >
          Done
        </Button>
      </div>
    </>
  )
}
