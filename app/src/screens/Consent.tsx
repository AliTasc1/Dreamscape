import { useState } from 'react'
import type { ToneId } from '../ai/contracts'
import { TONE_IDS } from '../domain/options'
import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import { Pressable } from '../ui/Pressable'
import { Screen } from '../ui/Screen'
import styles from './Consent.module.css'

/**
 * How far the companion may go, decided once and editable afterwards.
 *
 * The adult tone is gated behind an explicit age confirmation rather than
 * hidden — someone who wants it should be able to see that it exists and what
 * unlocks it.
 */
export function Consent() {
  const { t } = useI18n()
  const app = useApp()
  const [age, setAge] = useState(app.ageConfirmed)
  const [tone, setTone] = useState<ToneId>(app.tone ?? 'gentle')

  const locked = (id: ToneId) => id === 'mature' && !age
  const blocked = tone === 'mature' && !age

  const descriptions: Record<ToneId, { name: string; desc: string }> = {
    gentle: { name: t.consent.tones.gentle, desc: t.consent.tones.gentleDesc },
    romantic: { name: t.consent.tones.romantic, desc: t.consent.tones.romanticDesc },
    mature: { name: t.consent.tones.mature, desc: t.consent.tones.matureDesc },
  }

  return (
    <Screen className={styles.consent}>
      <div className={styles.title}>{t.consent.title}</div>
      <div className={styles.body}>{t.consent.body}</div>

      <Pressable
        className={styles.age}
        onClick={() => setAge((value) => !value)}
        pressed={age}
        label={t.consent.ageTitle}
      >
        <div className={`${styles.box}${age ? ` ${styles.boxOn}` : ''}`}>{age ? '✓' : ''}</div>
        <div>
          <div className={styles.ageTitle}>{t.consent.ageTitle}</div>
          <div className={styles.ageBody}>{t.consent.ageBody}</div>
        </div>
      </Pressable>

      <div className={styles.section}>{t.consent.toneTitle}</div>
      <div className={styles.sectionBody}>{t.consent.toneBody}</div>

      <div className={styles.tones} role="radiogroup" aria-label={t.consent.toneTitle}>
        {TONE_IDS.map((id) => {
          const classes = [styles.tone]
          if (tone === id) classes.push(styles.toneActive)
          if (locked(id)) classes.push(styles.toneLocked)
          return (
            <Pressable
              key={id}
              className={classes.join(' ')}
              onClick={() => setTone(id)}
              pressed={tone === id}
              label={descriptions[id].name}
            >
              <div className={styles.toneName}>{descriptions[id].name}</div>
              <div className={styles.toneDesc}>{descriptions[id].desc}</div>
            </Pressable>
          )
        })}
      </div>

      {blocked && <div className={styles.warning}>{t.consent.needsAge}</div>}

      <Button
        variant="gradientDusk"
        block
        height={56}
        fontSize={15}
        hoverScale={1.02}
        className={styles.cta}
        disabled={blocked}
        style={blocked ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
        onClick={() => {
          if (blocked) return
          app.acceptConsent({ ageConfirmed: age, tone })
        }}
      >
        {t.consent.cta}
      </Button>
    </Screen>
  )
}
