import { useCallback, useEffect, useRef, useState } from 'react'
import { useKeepAwake } from 'expo-keep-awake'
import * as ai from '../ai/client'
import { Ambience } from '../audio/ambience'
import { Narrator, stripMarkers } from '../audio/narrator'
import { MINUTES_PER_SEGMENT, useApp } from '../state/appState'

/**
 * Runs one night on the phone.
 *
 * Same shape as the web session: narration arrives a segment at a time, each
 * paragraph is spoken as soon as it is whole, and the next segment is fetched
 * when the voice runs out of things to say. The clock underneath ends the
 * night at the chosen length.
 */

export interface Turn {
  id: number
  who: 'you' | 'companion'
  text: string
}

export interface NightSession {
  line: string
  turns: Turn[]
  elapsed: number
  remaining: number
  finished: boolean
  buffering: boolean
  say: (text: string) => void
}

export function useNightSession(): NightSession {
  // The screen may go dark, but the phone must not sleep mid-sentence.
  useKeepAwake()

  const app = useApp()
  const [line, setLine] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [buffering, setBuffering] = useState(true)
  const [finished, setFinished] = useState(false)

  const narrator = useRef<Narrator | null>(null)
  const ambience = useRef<Ambience | null>(null)
  const buffer = useRef('')
  const segment = useRef(0)
  const soFar = useRef('')
  const requesting = useRef(false)
  const startedAt = useRef(Date.now())
  const ended = useRef(false)
  const turnId = useRef(0)

  const totalSeconds = app.minutes * 60
  const segments = Math.max(2, Math.ceil(app.minutes / MINUTES_PER_SEGMENT))

  const appRef = useRef(app)
  appRef.current = app

  const pushTurn = useCallback((who: Turn['who'], text: string) => {
    setTurns((previous) => [...previous, { id: ++turnId.current, who, text }].slice(-20))
  }, [])

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
      if (!current.plan || requesting.current || ended.current) return
      if (segment.current >= segments && !userSaid) {
        setFinished(true)
        return
      }

      requesting.current = true
      setBuffering(true)
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
            sky: current.skyLine,
          },
          current.caps,
          (text) => {
            buffer.current += text
            setBuffering(false)
            drainBuffer(false)
          },
        )
        drainBuffer(true)
        if (!userSaid) segment.current += 1
      } catch {
        // A lost segment is not the end of the night.
      } finally {
        requesting.current = false
        setBuffering(false)
      }
    },
    [drainBuffer, segments],
  )

  useEffect(() => {
    const current = appRef.current
    void Ambience.configure()

    const instance = new Narrator(
      {
        lang: current.lang,
        speed: current.prefs.speed,
        intensity: current.prefs.intensity,
        tone: current.tone,
      },
      () => {
        if (ended.current) return
        if (segment.current < segments) void requestSegment()
        else setFinished(true)
      },
      (text) => {
        const clean = stripMarkers(text)
        setLine(clean)
        pushTurn('companion', clean)
      },
    )
    narrator.current = instance

    const bed = new Ambience()
    bed.play(current.plan?.ambience as never)
    bed.setLevel(current.ambienceLevel)
    ambience.current = bed

    startedAt.current = Date.now()
    ended.current = false
    segment.current = 0
    soFar.current = ''
    buffer.current = ''
    void requestSegment()

    return () => {
      ended.current = true
      instance.stop()
      bed.stop()
      narrator.current = null
      ambience.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    narrator.current?.setOptions({
      lang: app.lang,
      speed: app.prefs.speed,
      intensity: app.prefs.intensity,
      tone: app.tone,
    })
  }, [app.lang, app.prefs, app.tone])

  useEffect(() => {
    ambience.current?.setLevel(app.ambienceLevel)
  }, [app.ambienceLevel])

  useEffect(() => {
    if (app.playing) narrator.current?.resume()
    else narrator.current?.pause()
  }, [app.playing])

  useEffect(() => {
    narrator.current?.setMuted(app.muted)
    ambience.current?.setMuted(app.muted)
  }, [app.muted])

  useEffect(() => {
    const id = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt.current) / 1000)
      appRef.current.tickElapsed(seconds)
      if (seconds >= totalSeconds) {
        ended.current = true
        narrator.current?.stop()
        ambience.current?.setMuted(true)
        setFinished(true)
        clearInterval(id)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [totalSeconds])

  const say = useCallback(
    (text: string) => {
      const said = text.trim()
      if (!said) return
      pushTurn('you', said)
      appRef.current.appendTranscript(`\n[listener] ${said}\n\n`)
      narrator.current?.clearQueue()
      buffer.current = ''
      void requestSegment(said)
    },
    [pushTurn, requestSegment],
  )

  return {
    line,
    turns,
    elapsed: app.elapsed,
    remaining: Math.max(0, totalSeconds - app.elapsed),
    finished,
    buffering,
    say,
  }
}
