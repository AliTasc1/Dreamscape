import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { ChoiceChips } from '../ui/Chip'
import { Screen } from '../ui/Screen'
import styles from './Companion.module.css'

export function Companion() {
  const { t, f } = useI18n()
  const { memory } = useApp()

  return (
    <Screen scroll>
      <div className={styles.header}>
        <div className={styles.orb} />
        <div className={styles.name}>{t.companion.name}</div>
        <div className={styles.tenure}>{f(t.companion.tenure, { n: memory.nights })}</div>
      </div>

      <div className={styles.groups}>
        <ChoiceChips optionKey="personality" label={t.companion.groups.personality} />
        <ChoiceChips optionKey="style" label={t.companion.groups.style} />
        <ChoiceChips optionKey="speed" label={t.companion.groups.speed} />
        <ChoiceChips optionKey="intensity" label={t.companion.groups.intensity} />
      </div>
    </Screen>
  )
}
