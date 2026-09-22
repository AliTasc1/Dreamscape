import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import type { NightSession } from '../session/useNightSession'
import { useSpeech } from '../session/useSpeech'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import styles from './Conversation.module.css'

/**
 * Talking with the companion during the night.
 *
 * The microphone stays open while this is on. Starting to speak pauses the
 * narration, a pause in speaking ends the turn, and the answer comes back in
 * character before the dream carries on. Typing does the same thing for anyone
 * who cannot or would rather not speak.
 */
export function Conversation({ night }: { night: NightSession }) {
  const { t } = useI18n()
  const app = useApp()
  const [typed, setTyped] = useState('')
  const scroller = useRef<HTMLDivElement>(null)

  const speech = useSpeech(
    app.lang,
    (text) => {
      night.say(text)
      night.endListening()
    },
    night.beginListening,
  )

  // Open the microphone as soon as the panel appears — this is a conversation,
  // not a form with a record button.
  useEffect(() => {
    if (speech.supported) speech.start()
    return () => speech.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [night.turns.length, speech.interim])

  const send = () => {
    const text = typed.trim()
    if (!text) return
    setTyped('')
    night.say(text)
  }

  const status = speech.listening
    ? t.session.listening
    : night.buffering
      ? t.session.speaking
      : t.talk.tellMe

  return (
    <div className={styles.panel} role="dialog" aria-label={t.session.talk}>
      <div className={styles.grabber} />

      <div className={styles.turns} ref={scroller}>
        {night.turns.map((turn) => (
          <div
            key={turn.id}
            className={`${styles.turn} ${turn.who === 'you' ? styles.you : styles.companion}`}
          >
            {turn.text}
          </div>
        ))}
        {speech.interim && <div className={styles.interim}>{speech.interim}</div>}
      </div>

      <div className={styles.composer}>
        <Button
          variant="glass"
          className={`${styles.mic}${speech.listening ? ` ${styles.micOn}` : ''}`}
          onClick={() => (speech.listening ? speech.stop() : speech.start())}
          aria-pressed={speech.listening}
          aria-label={t.create.micLabel}
          disabled={!speech.supported}
          style={!speech.supported ? { opacity: 0.4 } : undefined}
        >
          {t.create.mic}
        </Button>

        <input
          className={styles.input}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') send()
          }}
          placeholder={t.talk.placeholder}
          aria-label={t.talk.placeholder}
        />

        <Button
          variant="solidSoft"
          className={styles.send}
          onClick={send}
          aria-label={t.talk.send}
          disabled={!typed.trim()}
          style={!typed.trim() ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
        >
          &uarr;
        </Button>
      </div>

      <div className={styles.status}>{status}</div>
      {!speech.supported && <div className={styles.note}>{t.talk.unsupported}</div>}
      {speech.error === 'not-allowed' && <div className={styles.note}>{t.talk.micDenied}</div>}

      <Button variant="ghost" block className={styles.close} onClick={app.closeTalk}>
        {t.talk.backToDream}
      </Button>
    </div>
  )
}
