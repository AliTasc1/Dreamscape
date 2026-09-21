import type { CSSProperties } from 'react'
import { CREATE_CHIPS } from '../data/content'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Pressable } from '../ui/Pressable'
import { Screen } from '../ui/Screen'
import { TalkOverlay } from './TalkOverlay'
import styles from './Create.module.css'

export function Create() {
  const app = useApp()

  return (
    <>
      {/* Room to scroll clear of the CTA bar and the nav stacked beneath it. */}
      <Screen scroll style={{ '--screen-pb': 'calc(var(--nav-h) + 106px)' } as CSSProperties}>
        <div className={styles.heading}>Where should we go tonight?</div>

        <div className={styles.field}>
          <textarea
            className={styles.input}
            value={app.prompt}
            onChange={(event) => app.setPrompt(event.target.value)}
            placeholder="Describe the place, atmosphere or story you want to experience…"
            aria-label="Describe your dream"
          />
          <div className={styles.fieldRow}>
            <Button variant="link" fontSize={12} onClick={app.useExamplePrompt}>
              Use an example
            </Button>
            <Button
              variant="glass"
              className={styles.mic}
              onClick={app.openTalk}
              aria-label="Speak your dream"
            >
              mic
            </Button>
          </div>
        </div>

        <div className={styles.chips}>
          {CREATE_CHIPS.map((chip) => (
            <Chip
              key={chip}
              label={chip}
              active={app.chips.includes(chip)}
              onClick={() => app.toggleChip(chip)}
            />
          ))}
        </div>

        <Pressable className={styles.settings} onClick={app.openSheet}>
          <div>
            <div className={styles.settingsTitle}>Voice, ambience &amp; length</div>
            <div className={styles.settingsSummary}>{app.settingsSummary}</div>
          </div>
          <div className={styles.chevron}>&rsaquo;</div>
        </Pressable>

        <div className={styles.footnote}>
          One sentence is enough. Everything else is optional.
        </div>
      </Screen>

      <div className={styles.cta}>
        <Button
          variant="gradientEmber"
          block
          height={58}
          fontSize={15.5}
          hoverScale={1.015}
          onClick={() => app.go('generating')}
        >
          Take Me There
        </Button>
      </div>

      {app.talk && <TalkOverlay dismissLabel="Back to writing" />}
    </>
  )
}
