import { useEffect, useRef, useState } from 'react'
import { VOICE_BAR_HEIGHTS } from '../data/content'
import { useI18n } from '../i18n'
import { useApp } from '../state/appState'
import { Button } from '../ui/Button'
import styles from './TalkOverlay.module.css'

/**
 * Voice input. Reached from the session (where it is a conversation) and from
 * Create (where it is dictation).
 *
 * Speech recognition is used where the browser has it and falls back to typing
 * everywhere else, so the affordance is never a dead end.
 */

interface RecognitionResultLike {
  0: { transcript: string }
  isFinal: boolean
}

interface RecognitionEventLike {
  resultIndex: number
  results: { length: number; [index: number]: RecognitionResultLike }
}

interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: RecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type RecognitionCtor = new () => RecognitionLike

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function TalkOverlay({
  dismissLabel,
  onSay,
}: {
  dismissLabel: string
  onSay: (text: string) => void
}) {
  const { t } = useI18n()
  const { closeTalk, lang } = useApp()
  const [heard, setHeard] = useState('')
  const [listening, setListening] = useState(false)
  const recognition = useRef<RecognitionLike | null>(null)

  useEffect(() => {
    const Ctor = recognitionCtor()
    if (!Ctor) return

    const instance = new Ctor()
    instance.lang = lang === 'tr' ? 'tr-TR' : 'en-US'
    instance.continuous = true
    instance.interimResults = true
    instance.onresult = (event) => {
      let text = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      setHeard((previous) => (event.results[event.resultIndex]?.isFinal ? previous + text : text))
    }
    instance.onerror = () => setListening(false)
    instance.onend = () => setListening(false)

    recognition.current = instance
    try {
      instance.start()
      setListening(true)
    } catch {
      setListening(false)
    }

    return () => {
      instance.onresult = null
      instance.onerror = null
      instance.onend = null
      try {
        instance.stop()
      } catch {
        // Already stopped.
      }
      recognition.current = null
    }
  }, [lang])

  const send = () => {
    const text = heard.trim()
    if (text) onSay(text)
    closeTalk()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.prompt}>{t.talk.tellMe}</div>

      <div className={styles.bars} aria-hidden="true">
        {VOICE_BAR_HEIGHTS.map((height, i) => (
          <div
            key={i}
            className={styles.bar}
            style={{
              height,
              animation: listening ? `breathe ${2 + i * 0.3}s ease-in-out infinite` : 'none',
              opacity: listening ? 1 : 0.35,
            }}
          />
        ))}
      </div>

      <textarea
        className={styles.input}
        value={heard}
        onChange={(event) => setHeard(event.target.value)}
        placeholder={recognition.current ? t.talk.hint : t.talk.placeholder}
        aria-label={t.talk.placeholder}
      />

      {!recognitionCtor() && <div className={styles.note}>{t.talk.unsupported}</div>}

      <div className={styles.actions}>
        <Button variant="outline" height={48} paddingX={30} fontSize={13} onClick={closeTalk}>
          {dismissLabel}
        </Button>
        <Button
          variant="solid"
          height={48}
          paddingX={30}
          fontSize={13}
          onClick={send}
          disabled={!heard.trim()}
          style={!heard.trim() ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
        >
          {t.talk.send}
        </Button>
      </div>
    </div>
  )
}
