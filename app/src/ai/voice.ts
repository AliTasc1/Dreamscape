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
/** A silent frame, used only to satisfy autoplay during a real tap. */
const SILENCE =
  'data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tAFRZRVIAAAAGAAADMjAxMgBUREFUAAAABAAAADAwMDBUSU1FAAAABAAAADAwMDBQUklWAAAAJwAAA1hpbmcAAAAPAAAAAgAAAsAAgICAgICAgICAgICAgICAgICAgICAgIA='

export class Narrator {
  private queue: string[] = []
  /**
   * One element for the whole session, reused for every paragraph.
   *
   * A fresh `new Audio()` per paragraph is the thing browsers block: only the
   * first one inherits the tap that started the session, and every later one
   * is refused until the listener taps again. One element, unlocked once,
   * plays for the rest of the night untouched.
   */
  private audio: HTMLAudioElement | null = null
  private unlocked = false
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

  /**
   * Must be called from inside a real tap — the button that starts the night.
   * Playing a silent frame then leaves the element permanently allowed.
   */
  unlock(): void {
    if (this.unlocked) return
    this.unlocked = true
    const element = this.element()
    element.src = SILENCE
    void element
      .play()
      .then(() => {
        element.pause()
        element.currentTime = 0
      })
      .catch(() => undefined)
    // Safari also gates synthesis on a gesture; an empty utterance opens it.
    if (typeof speechSynthesis !== 'undefined') {
      try {
        speechSynthesis.speak(new SpeechSynthesisUtterance(''))
      } catch {
        // Not available; the audio path covers it.
      }
    }
  }

  private element(): HTMLAudioElement {
    if (!this.audio) {
      const element = new Audio()
      element.preload = 'auto'
      // Lets the night keep going with the screen off.
      element.setAttribute('playsinline', '')
      this.audio = element
    }
    return this.audio
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
    // The element is kept — it holds the autoplay permission for the session.
    if (this.audio) {
      this.audio.pause()
      this.audio.removeAttribute('src')
      this.audio.load()
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

  /**
   * A paragraph can never hold the night open.
   *
   * Playback that neither ends nor errors — a blocked element, a synthesis
   * engine that dies mid-sentence, a stream that stalls — would otherwise
   * leave the queue waiting forever on an event that is not coming. After
   * twice its expected length plus a margin, the night moves on regardless.
   */
  private guard<T>(work: Promise<T>, text: string): Promise<unknown> {
    const limit = readingMs(text, this.options.speed) * 2 + 12_000
    return Promise.race([
      work,
      new Promise((resolve) => {
        const id = window.setTimeout(() => {
          console.warn('[dreamscape] a paragraph never finished playing; continuing')
          resolve(undefined)
        }, limit)
        void work.finally(() => window.clearTimeout(id))
      }),
    ])
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
      await this.guard(
        blob ? this.playBlob(blob) : this.speakInBrowser(stripMarkers(text)),
        text,
      )
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
      const audio = this.element()
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl)
      this.objectUrl = URL.createObjectURL(blob)

      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        audio.removeEventListener('ended', finish)
        audio.removeEventListener('error', finish)
        resolve()
      }
      audio.addEventListener('ended', finish, { once: true })
      audio.addEventListener('error', finish, { once: true })

      audio.src = this.objectUrl
      void audio.play().catch(finish)
    })
  }

  private speakInBrowser(text: string): Promise<void> {
    if (!browserSpeechAvailable() || !text) return Promise.resolve()

    return new Promise((resolve) => {
      // Chrome stops synthesis part-way through anything long unless it is
      // nudged; the nudge is harmless everywhere else.
      const keepAlive = window.setInterval(() => {
        if (speechSynthesis.speaking && !speechSynthesis.paused) {
          speechSynthesis.pause()
          speechSynthesis.resume()
        }
      }, 5000)

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = this.options.lang === 'tr' ? 'tr-TR' : 'en-US'
      utterance.rate = RATE[this.options.speed] ?? RATE.slow
      utterance.pitch = this.options.intensity === 'whisper' ? 0.85 : 0.95
      utterance.volume = this.options.intensity === 'whisper' ? 0.65 : 0.9
      const voice = browserVoiceFor(this.options.lang)
      if (voice) utterance.voice = voice

      const finish = () => {
        window.clearInterval(keepAlive)
        resolve()
      }
      utterance.addEventListener('end', finish, { once: true })
      utterance.addEventListener('error', finish, { once: true })
      speechSynthesis.speak(utterance)
    })
  }
}
