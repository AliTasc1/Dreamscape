import * as Speech from 'expo-speech'
import type { LanguageId } from '../i18n'
import type { ToneId } from '../shared/ai/contracts'

/**
 * The voice, on the device.
 *
 * `expo-speech` is the phone's own text-to-speech: free, offline, no account,
 * no per-character cost, and available in Expo Go. It is plainer than a hosted
 * voice, and it is the only kind that can run for an hour a night at no charge.
 *
 * The performance markers the narrator writes — [breathes], [laughs] — are not
 * spoken by a device engine, so they are lifted out and their pauses kept as
 * punctuation.
 */

const MARKER = /\[([a-z ]+)\]/gi

export function stripMarkers(text: string): string {
  return text
    .replace(MARKER, (_m, name: string) =>
      name.trim().toLowerCase().includes('pause') ? '…' : '',
    )
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.!?…])/g, '$1')
    .trim()
}

/** Words per minute assumed when the engine gives no timing back. */
const WPM: Record<string, number> = { verySlow: 75, slow: 95, normal: 120 }
const RATE: Record<string, number> = { verySlow: 0.62, slow: 0.78, normal: 0.94 }

function readingMs(text: string, speed: string): number {
  const words = text.trim().split(/\s+/).length
  return Math.max(1500, (words / (WPM[speed] ?? WPM.slow)) * 60_000)
}

export interface VoiceOptions {
  lang: LanguageId
  speed: string
  intensity: string
  tone: ToneId
}

export class Narrator {
  private queue: string[] = []
  private speaking = false
  private stopped = false
  private muted = false
  private cancelWait: (() => void) | null = null

  constructor(
    private options: VoiceOptions,
    private onDrain: () => void,
    private onSpeak: (text: string) => void,
  ) {}

  setOptions(options: VoiceOptions): void {
    this.options = options
  }

  get idle(): boolean {
    return !this.speaking && this.queue.length === 0
  }

  enqueue(paragraph: string): void {
    const text = paragraph.trim()
    if (!text) return
    this.queue.push(text)
    void this.pump()
  }

  clearQueue(): void {
    this.queue = []
    void Speech.stop()
    this.cancelWait?.()
  }

  /** Silent, but the words keep moving at reading pace. */
  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) void Speech.stop()
  }

  pause(): void {
    // iOS supports pause/resume; Android stops instead, which the queue
    // recovers from on the next paragraph.
    void Speech.pause().catch(() => Speech.stop())
  }

  resume(): void {
    void Speech.resume().catch(() => undefined)
    void this.pump()
  }

  stop(): void {
    this.stopped = true
    this.queue = []
    void Speech.stop()
    this.cancelWait?.()
  }

  private async pump(): Promise<void> {
    if (this.speaking || this.stopped) return
    const next = this.queue.shift()
    if (next === undefined) {
      this.onDrain()
      return
    }

    this.speaking = true
    this.onSpeak(stripMarkers(next))
    try {
      await this.say(next)
    } catch {
      // One bad paragraph must never end the night.
    }
    this.speaking = false
    if (!this.stopped) void this.pump()
  }

  private say(paragraph: string): Promise<void> {
    const text = stripMarkers(paragraph)
    if (!text) return Promise.resolve()

    const minimum = readingMs(text, this.options.speed)

    if (this.muted) return this.wait(minimum)

    return new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        resolve()
      }

      // An engine that never calls back cannot hold the night open.
      const watchdog = setTimeout(finish, minimum * 2 + 12_000)
      const done = () => {
        clearTimeout(watchdog)
        finish()
      }

      try {
        Speech.speak(text, {
          language: this.options.lang === 'tr' ? 'tr-TR' : 'en-US',
          rate: RATE[this.options.speed] ?? RATE.slow,
          pitch: this.options.intensity === 'whisper' ? 0.85 : 0.95,
          onDone: done,
          onStopped: done,
          onError: done,
        })
      } catch {
        done()
      }
    })
  }

  /** A pause that ends early when the session does. */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const id = setTimeout(resolve, ms)
      this.cancelWait = () => {
        clearTimeout(id)
        resolve()
      }
    })
  }
}
