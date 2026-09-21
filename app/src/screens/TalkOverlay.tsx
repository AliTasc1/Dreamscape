import { TALK_PROMPT, VOICE_BAR_HEIGHTS } from '../data/content'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import styles from './TalkOverlay.module.css'

/**
 * Voice input. Reached from the session (where it is a conversation) and from
 * Create (where it is dictation) — only the way out is worded differently.
 */
export function TalkOverlay({ dismissLabel }: { dismissLabel: string }) {
  const { closeTalk } = useApp()

  return (
    <div className={styles.overlay}>
      <div className={styles.prompt}>Tell me&hellip;</div>
      <div className={styles.bars} aria-hidden="true">
        {VOICE_BAR_HEIGHTS.map((height, i) => (
          <div
            key={i}
            className={styles.bar}
            style={{
              height,
              animation: `breathe ${2 + i * 0.3}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
      <div className={styles.transcript}>{TALK_PROMPT}</div>
      <Button variant="outline" height={48} paddingX={34} fontSize={13} onClick={closeTalk}>
        {dismissLabel}
      </Button>
    </div>
  )
}
