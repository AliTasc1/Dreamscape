import { COMPANION, COMPANION_GROUPS } from '../data/content'
import { ChoiceChips } from '../ui/Chip'
import { Screen } from '../ui/Screen'
import styles from './Companion.module.css'

export function Companion() {
  return (
    <Screen scroll>
      <div className={styles.header}>
        <div className={styles.orb} />
        <div className={styles.name}>{COMPANION.name}</div>
        <div className={styles.tenure}>{COMPANION.tenure}</div>
      </div>

      <div className={styles.groups}>
        {COMPANION_GROUPS.map((group) => (
          <ChoiceChips key={group.key} group={group} />
        ))}
      </div>
    </Screen>
  )
}
