import { useCallback, useEffect, useRef, useState } from 'react'
import * as ai from '../ai/client'
import { Narrator, stripMarkers } from '../ai/voice'
import { MINUTES_PER_SEGMENT, useApp } from '../state/appState'

/**
 * Runs one night.
 *
 * The narration arrives a segment at a time — about three minutes of speech
 * each — so a sixty-minute session is never one enormous request. Paragraphs
 * are handed to the voice as soon as they are complete, and the next segment
 * is fetched when the voice runs out of things to say. The clock runs
 * underneath all of it and ends the night when the chosen length is up.
 */
export interface NightSession {
  /** The line currently being spoken. */
  line: string
  /** Everything spoken so far, newest last. */
  history: string[]
  elapsed: number
  remaining: number
  /** True once the chosen length has run out. */
  finished: boolean
  /** True while waiting on the first words of a segment. */
  buffering: boolean
  /** Sends something the listener said into the dream. */
  say: (text: string) => void
}

export function useNightSession(): NightSession {
  const app = useApp()
  const [line, setLine] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [buffering, setBuffering] = useState(true)
  const [finished, setFinished] = useState(false)

  const narrator = useRef<Narrator | null>(null)
  const controller = useRef<AbortController | null>(null)
  const buffer = useRef('')
  const segment = useRef(0)
  const soFar = useRef('')
  const requesting = useRef(false)
  const startedAt = useRef(Date.now())
  const endedRef = useRef(false)

  const totalSeconds = app.minutes * 60
  const segments = Math.max(2, Math.ceil(app.minutes / MINUTES_PER_SEGMENT))

  const appRef = useRef(app)
  appRef.current = app

  /** Splits whatever has streamed in on blank lines and speaks the whole ones. */
  const drainBuffer = useCallback((flush: boolean) => {
    const parts = buffer.current.split(/\n{2,}/)
    const trailing = flush ? '' : (parts.pop() ?? '')
    buffer.current = trailing
    for (const part of parts) {
      const paragraph = part.trim()
      if (!paragraph) continue
      soFar.current = `${soFar.current}\n\n${paragraph}`.slice(-4000)
      appRef.current.appendTranscript(`${paragraph}\n\n`)
      narrator.current?.enqueue(paragraph)
    }
  }, [])

  const requestSegment = useCallback(
    async (userSaid?: string) => {
      const current = appRef.current
      if (!current.plan || requesting.current || endedRef.current) return
      if (segment.current >= segments && !userSaid) {
        setFinished(true)
        return
      }

      requesting.current = true
      setBuffering(true)
      controller.current?.abort()
      const ctl = new AbortController()
      controller.current = ctl

      try {
        await ai.narrate(
          {
            lang: current.lang,
            plan: current.plan,
            minutes: current.minutes,
            tone: current.tone,
            prefs: current.prefs,
            memory: current.memory,
            segment: segment.current,
            segments,
            soFar: soFar.current,
            userSaid,
          },
          current.caps,
          (text) => {
            buffer.current += text
            setBuffering(false)
            drainBuffer(false)
          },
          ctl.signal,
        )
        drainBuffer(true)
        segment.current += 1
      } catch {
        // Losing a segment should not end the night; the drain handler will
        // ask for the next one.
      } finally {
        requesting.current = false
        setBuffering(false)
      }
    },
    [drainBuffer, segments],
  )

  /* The voice: created once per session, torn down on the way out. */
  useEffect(() => {
    const current = appRef.current
    const instance = new Narrator(
      current.caps,
      {
        lang: current.lang,
        voice: current.prefs.voice,
        intensity: current.prefs.intensity,
        speed: current.prefs.speed,
        tone: current.tone,
      },
      () => {
        // Queue empty: either fetch more, or the night is over.
        if (endedRef.current) return
        if (segment.current < segments) void requestSegment()
        else setFinished(true)
      },
      (text) => {
        const clean = stripMarkers(text)
        setLine(clean)
        setHistory((h) => [...h, clean].slice(-40))
      },
    )
    narrator.current = instance
    startedAt.current = Date.now()
    endedRef.current = false
    segment.current = 0
    soFar.current = ''
    buffer.current = ''
    void requestSegment()

    return () => {
      endedRef.current = true
      controller.current?.abort()
      instance.stop()
      narrator.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Preference changes mid-session reach the voice on the next paragraph. */
  useEffect(() => {
    narrator.current?.setCapabilities(app.caps)
    narrator.current?.setOptions({
      lang: app.lang,
      voice: app.prefs.voice,
      intensity: app.prefs.intensity,
      speed: app.prefs.speed,
      tone: app.tone,
    })
  }, [app.caps, app.lang, app.prefs, app.tone])

  useEffect(() => {
    if (app.playing) narrator.current?.resume()
    else narrator.current?.pause()
  }, [app.playing])

  useEffect(() => {
    narrator.current?.setMuted(app.muted)
  }, [app.muted])

  /* The clock. */
  useEffect(() => {
    const id = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt.current) / 1000)
      appRef.current.tickElapsed(seconds)
      if (seconds >= totalSeconds) {
        endedRef.current = true
        controller.current?.abort()
        narrator.current?.stop()
        setFinished(true)
        window.clearInterval(id)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [totalSeconds])

  const say = useCallback(
    (text: string) => {
      const said = text.trim()
      if (!said) return
      appRef.current.appendTranscript(`\n[listener] ${said}\n\n`)
      narrator.current?.clearQueue()
      buffer.current = ''
      void requestSegment(said)
    },
    [requestSegment],
  )

  return {
    line,
    history,
    elapsed: app.elapsed,
    remaining: Math.max(0, totalSeconds - app.elapsed),
    finished,
    buffering,
    say,
  }
}
