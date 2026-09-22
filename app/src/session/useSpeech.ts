import { useCallback, useEffect, useRef, useState } from 'react'
import type { LanguageId } from '../i18n'

/**
 * Continuous listening with turn-taking.
 *
 * Recognition stays open for the whole conversation. A turn ends when the
 * speaker has been quiet for a moment rather than when they press anything, so
 * talking back to the dream feels like talking, not like dictating.
 */

const SILENCE_MS = 1300

interface ResultLike {
  0: { transcript: string }
  isFinal: boolean
}

interface EventLike {
  resultIndex: number
  results: { length: number; [index: number]: ResultLike }
}

interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: EventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  onspeechstart: (() => void) | null
}

type Ctor = new () => RecognitionLike

function recognitionCtor(): Ctor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const speechSupported = (): boolean => recognitionCtor() !== null

export interface Speech {
  supported: boolean
  listening: boolean
  /** What is being heard right now, before the turn ends. */
  interim: string
  /** Set when the browser refused — usually a denied microphone. */
  error: string | null
  start: () => void
  stop: () => void
}

export function useSpeech(
  lang: LanguageId,
  onTurn: (text: string) => void,
  onSpeechStart?: () => void,
): Speech {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognition = useRef<RecognitionLike | null>(null)
  const pendingText = useRef('')
  const silence = useRef<number | null>(null)
  const wanted = useRef(false)

  const onTurnRef = useRef(onTurn)
  onTurnRef.current = onTurn
  const onStartRef = useRef(onSpeechStart)
  onStartRef.current = onSpeechStart

  const flush = useCallback(() => {
    const text = pendingText.current.trim()
    pendingText.current = ''
    setInterim('')
    if (text) onTurnRef.current(text)
  }, [])

  const stop = useCallback(() => {
    wanted.current = false
    if (silence.current !== null) {
      window.clearTimeout(silence.current)
      silence.current = null
    }
    try {
      recognition.current?.stop()
    } catch {
      // Not running.
    }
    setListening(false)
    // Anything half-said when the mic closes still counts as a turn.
    flush()
  }, [flush])

  const start = useCallback(() => {
    const Ctor = recognitionCtor()
    if (!Ctor) {
      setError('unsupported')
      return
    }
    if (recognition.current) return

    const instance = new Ctor()
    instance.lang = lang === 'tr' ? 'tr-TR' : 'en-US'
    instance.continuous = true
    instance.interimResults = true

    instance.onspeechstart = () => onStartRef.current?.()

    instance.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) finalText += result[0].transcript
        else interimText += result[0].transcript
      }
      if (finalText) pendingText.current += finalText
      setInterim(pendingText.current + interimText)

      if (silence.current !== null) window.clearTimeout(silence.current)
      silence.current = window.setTimeout(() => {
        silence.current = null
        flush()
      }, SILENCE_MS)
    }

    instance.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      setError(event.error ?? 'error')
      setListening(false)
    }

    // Chrome ends the stream on its own every so often; restart while wanted.
    instance.onend = () => {
      recognition.current = null
      if (!wanted.current) {
        setListening(false)
        return
      }
      try {
        const next = new Ctor()
        Object.assign(next, {
          lang: instance.lang,
          continuous: true,
          interimResults: true,
          onresult: instance.onresult,
          onerror: instance.onerror,
          onend: instance.onend,
          onspeechstart: instance.onspeechstart,
        })
        recognition.current = next
        next.start()
      } catch {
        setListening(false)
      }
    }

    recognition.current = instance
    wanted.current = true
    setError(null)
    try {
      instance.start()
      setListening(true)
    } catch {
      recognition.current = null
      setListening(false)
    }
  }, [flush, lang])

  useEffect(() => {
    return () => {
      wanted.current = false
      if (silence.current !== null) window.clearTimeout(silence.current)
      try {
        recognition.current?.abort()
      } catch {
        // Not running.
      }
      recognition.current = null
    }
  }, [])

  return { supported: speechSupported(), listening, interim, error, start, stop }
}
