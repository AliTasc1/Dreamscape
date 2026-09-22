import type { Capabilities, LanguageId, ToneId } from './contracts'
import { fetchSpeech } from './client'

/**
 * Speaks the night out loud, one paragraph at a time.
 *
 * Preferred path is the service's voice (ElevenLabs reads the narrator's
 * inline [breathes] / [laughs] / [whispers] markers as real breath and
 * laughter). Where no voice is configured the browser's own synthesis takes
 * over, with the markers lifted out and their pauses kept as punctuation.
 */

export interface SpeakOptions {
  lang: LanguageId
  voice: string
  intensity: string
  speed: string
  tone: ToneId
}

const MARKER_PATTERN = /\[([a-z ]+)\]/gi

/** Readable text for engines that cannot perform the markers. */
export function stripMarkers(text: string): string {
  return text
    .replace(MARKER_PATTERN, (_m, name: string) =>
      name.trim().toLowerCase().includes('pause') ? '…' : '',
    )
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.!?…])/g, '$1')
    .trim()
}

const RATE: Record<string, number> = { verySlow: 0.62, slow: 0.78, normal: 0.94 }

/** Words per minute a paragraph is assumed to take when read aloud. */
const WPM: Record<string, number> = { verySlow: 75, slow: 95, normal: 120 }

/**
 * How long a paragraph should occupy, however it is voiced.
 *
 * Without this the night races: a muted session, a browser with no installed
 * voices, or a synthesis engine that returns instantly would drain the whole
 * queue in seconds and finish an hour-long dream before the first minute.
 */
function readingMs(text: string, speed: string): number {
  const words = text.trim().split(/\s+/).length
  return Math.max(1500, (words / (WPM[speed] ?? WPM.slow)) * 60_000)
}

function browserVoiceFor(lang: LanguageId): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null
  const voices = speechSynthesis.getVoices()
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null
}

export function browserSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

type Ended = () => void

/**
 * One queue, one voice. Feed it paragraphs; it plays them in order and calls
 * back when the queue drains, so the session can ask for the next segment.
 */
export class Narrator {
  private queue: string[] = []
  private audio: HTMLAudioElement | null = null
  private objectUrl: string | null = null
  private speaking = false
  private stopped = false
  private muted = false
  private controller: AbortController | null = null
  /** Cancels an in-flight reading pause. */
  private pending: (() => void) | null = null

  constructor(
    private caps: Capabilities,
    private options: SpeakOptions,
    private onDrain: Ended,
    /** Fires as each paragraph starts, so the screen can show what is spoken. */
    private onSpeak: (text: string) => void = () => undefined,
  ) {}

  /** Drops anything queued but keeps the narrator usable. */
  clearQueue(): void {
    this.queue = []
    this.silence()
  }

  setOptions(options: SpeakOptions): void {
    this.options = options
  }

  setCapabilities(caps: Capabilities): void {
    this.caps = caps
  }

  /** True when nothing is playing and nothing is waiting. */
  get idle(): boolean {
    return !this.speaking && this.queue.length === 0
  }

  enqueue(paragraph: string): void {
    const text = paragraph.trim()
    if (!text) return
    this.queue.push(text)
    void this.pump()
  }

  /** Silences the voice but keeps the words moving at reading pace. */
  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) {
      this.controller?.abort()
      this.audio?.pause()
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
    }
  }

  pause(): void {
    this.audio?.pause()
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking) speechSynthesis.pause()
  }

  resume(): void {
    void this.audio?.play().catch(() => undefined)
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.paused) speechSynthesis.resume()
    void this.pump()
  }

  stop(): void {
    this.stopped = true
    this.queue = []
    this.silence()
  }

  private silence(): void {
    this.controller?.abort()
    this.controller = null
    this.pending?.()
    this.pending = null
    if (this.audio) {
      this.audio.pause()
      this.audio.src = ''
      this.audio = null
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl)
      this.objectUrl = null
    }
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
    this.speaking = false
  }

  private async pump(): Promise<void> {
    if (this.speaking || this.stopped) return
    const next = this.queue.shift()
    if (next === undefined) {
      this.onDrain()
      return
    }

    this.speaking = true
    this.onSpeak(next)
    try {
      await this.say(next)
    } catch {
      // A failed paragraph must not stall the night.
    }
    this.speaking = false
    if (!this.stopped) void this.pump()
  }

  private async say(text: string): Promise<void> {
    const startedAt = Date.now()

    if (!this.muted) {
      this.controller = new AbortController()
      const blob = await fetchSpeech(
        {
          text,
          lang: this.options.lang,
          voice: this.options.voice,
          intensity: this.options.intensity,
          speed: this.options.speed,
          tone: this.options.tone,
        },
        this.caps,
        this.controller.signal,
      )

      if (this.stopped) return
      if (blob) await this.playBlob(blob)
      else await this.speakInBrowser(stripMarkers(text))
    }

    // Real audio usually outlasts the estimate and this waits for nothing.
    const outstanding = readingMs(text, this.options.speed) - (Date.now() - startedAt)
    if (outstanding > 0) await this.wait(outstanding)
  }

  /** A pause that ends early if the session does. */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const id = window.setTimeout(resolve, ms)
      this.pending = () => {
        window.clearTimeout(id)
        resolve()
      }
    })
  }

  private playBlob(blob: Blob): Promise<void> {
    return new Promise((resolve) => {
      this.objectUrl = URL.createObjectURL(blob)
      const audio = new Audio(this.objectUrl)
      this.audio = audio
      const finish = () => {
        if (this.objectUrl) {
          URL.revokeObjectURL(this.objectUrl)
          this.objectUrl = null
        }
        this.audio = null
        resolve()
      }
      audio.addEventListener('ended', finish, { once: true })
      audio.addEventListener('error', finish, { once: true })
      void audio.play().catch(finish)
    })
  }

  private speakInBrowser(text: string): Promise<void> {
    if (!browserSpeechAvailable() || !text) return Promise.resolve()

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = this.options.lang === 'tr' ? 'tr-TR' : 'en-US'
      utterance.rate = RATE[this.options.speed] ?? RATE.slow
      utterance.pitch = this.options.intensity === 'whisper' ? 0.85 : 0.95
      utterance.volume = this.options.intensity === 'whisper' ? 0.65 : 0.9
      const voice = browserVoiceFor(this.options.lang)
      if (voice) utterance.voice = voice

      const finish = () => resolve()
      utterance.addEventListener('end', finish, { once: true })
      utterance.addEventListener('error', finish, { once: true })
      speechSynthesis.speak(utterance)
    })
  }
}
