import * as Speech from 'expo-speech'
import type { LanguageId, ToneId } from '../shared/ai/contracts'
import { segment, stripMarkers } from '../shared/audio/pacing'
import { RemoteVoice } from './remoteVoice'

export { segment, stripMarkers }

/**
 * The voice, on the device.
 *
 * `expo-speech` is the phone's own text-to-speech: free, offline, no account,
 * no per-character cost, and available in Expo Go. Two things are done here to
 * make it sound less like a machine reading a sign, and it is worth being
 * honest that neither turns it into a person.
 *
 * The first is choosing the voice. Phones ship a small, flat voice and keep
 * the good one behind a download, and an app that does not ask gets the flat
 * one. `bestVoice` looks through everything installed and takes the highest
 * grade available for the language.
 *
 * The second is pacing. A device engine given a paragraph reads it as one
 * breathless run. Given a sentence at a time, with real silence in between,
 * the same engine sounds like someone speaking slowly — which is most of what
 * "calm" is. The narrator's markers become those silences: [breathes] is a
 * long one, [pause] a medium one. A device engine cannot laugh, and pretending
 * otherwise by leaving "[laughs]" in the text would have it read the word.
 */

/** Words per minute assumed when the engine gives no timing back. */
const WPM: Record<string, number> = { verySlow: 75, slow: 95, normal: 120 }
const RATE: Record<string, number> = { verySlow: 0.62, slow: 0.78, normal: 0.94 }

function readingMs(text: string, speed: string): number {
  const words = text.trim().split(/\s+/).length
  return Math.max(1200, (words / (WPM[speed] ?? WPM.slow)) * 60_000)
}

// ------------------------------------------------------------- picking a voice

/**
 * Apple grades its voices in the identifier and Google in the name. Higher is
 * better, and the difference between the bottom and the top of this list is
 * most of the difference between "robotic" and "acceptable".
 */
function grade(voice: Speech.Voice): number {
  const id = `${voice.identifier} ${voice.name}`.toLowerCase()
  if (id.includes('premium')) return 4
  if (id.includes('enhanced') || voice.quality === Speech.VoiceQuality.Enhanced) return 3
  if (id.includes('neural') || id.includes('siri')) return 3
  if (id.includes('network')) return 2
  if (id.includes('compact') || id.includes('eloquence')) return 0
  return 1
}

/** Names the platforms use for voices that read as female or male. */
const FEMININE = /yelda|samantha|karen|moira|tessa|fiona|serena|allison|ava|zoe|female|#f|-f-/i
const MASCULINE = /alex|daniel|fred|oliver|thomas|aaron|arthur|male|#m|-m-/i

function matchesPreference(voice: Speech.Voice, preference: string): boolean {
  const id = `${voice.identifier} ${voice.name}`
  if (preference === 'female') return FEMININE.test(id)
  if (preference === 'male' || preference === 'deep') return MASCULINE.test(id)
  return false
}

let cache: { key: string; identifier: string | undefined } | null = null

/**
 * The best voice installed for this language, preferring one that matches the
 * listener's choice when the grade is equal. Returns undefined when nothing
 * can be decided, which leaves the system default — the same as before.
 */
async function bestVoice(lang: LanguageId, preference: string): Promise<string | undefined> {
  const key = `${lang}:${preference}`
  if (cache?.key === key) return cache.identifier

  let identifier: string | undefined
  try {
    const all = await Speech.getAvailableVoicesAsync()
    const wanted = lang === 'tr' ? 'tr' : 'en'
    const candidates = all.filter((voice) => voice.language?.toLowerCase().startsWith(wanted))
    // An English listener is better served by en-US or en-GB than by en-IN.
    const preferred = candidates.filter((voice) =>
      lang === 'en' ? /^en[-_](us|gb)/i.test(voice.language) : true,
    )
    const pool = preferred.length > 0 ? preferred : candidates

    let best: Speech.Voice | undefined
    let bestScore = -1
    for (const voice of pool) {
      const score = grade(voice) * 2 + (matchesPreference(voice, preference) ? 1 : 0)
      if (score > bestScore) {
        bestScore = score
        best = voice
      }
    }
    identifier = best?.identifier
  } catch {
    // Some runtimes have no voice list at all; the default still speaks.
    identifier = undefined
  }

  cache = { key, identifier }
  return identifier
}

export interface VoiceOptions {
  lang: LanguageId
  speed: string
  intensity: string
  tone: ToneId
  /** The listener's voice preference, used to pick between equal voices. */
  voice: string
}

/** A hosted voice to prefer, when one is configured and reachable. */
export interface RemoteConfig {
  base: string
}

export class Narrator {
  private queue: string[] = []
  private speaking = false
  private stopped = false
  private muted = false
  private cancelWait: (() => void) | null = null
  private readonly remote: RemoteVoice | null

  constructor(
    private options: VoiceOptions,
    private onDrain: () => void,
    private onSpeak: (text: string) => void,
    remote?: RemoteConfig,
  ) {
    this.remote = remote?.base ? new RemoteVoice(remote.base) : null
  }

  /** What the hosted voice needs to know, apart from the words themselves. */
  private request() {
    return {
      lang: this.options.lang,
      voice: this.options.voice,
      intensity: this.options.intensity,
      speed: this.options.speed,
      tone: this.options.tone,
    }
  }

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
    // Start fetching its audio now, so the wait is spent listening to the
    // paragraph before it rather than in silence.
    if (!this.muted) this.remote?.prefetch(text, this.request())
    void this.pump()
  }

  clearQueue(): void {
    this.queue = []
    void Speech.stop()
    this.remote?.clear()
    this.cancelWait?.()
  }

  /** Silent, but the words keep moving at reading pace. */
  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) {
      void Speech.stop()
      this.remote?.stop()
    }
  }

  pause(): void {
    // iOS supports pause/resume; Android stops instead, which the queue
    // recovers from on the next paragraph.
    void Speech.pause().catch(() => Speech.stop())
    this.remote?.stop()
  }

  resume(): void {
    void Speech.resume().catch(() => undefined)
    void this.pump()
  }

  stop(): void {
    this.stopped = true
    this.queue = []
    void Speech.stop()
    this.remote?.clear()
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

  /**
   * Speaks a paragraph.
   *
   * A hosted voice gets the whole paragraph with its markers, because it can
   * perform them and because it phrases better with the context. The device
   * voice gets it a sentence at a time with silences in between, because that
   * is the only pacing it has.
   */
  private async say(paragraph: string): Promise<void> {
    const parts = segment(paragraph, this.options.speed)
    if (parts.length === 0) return

    if (this.muted) {
      await this.wait(readingMs(stripMarkers(paragraph), this.options.speed))
      return
    }

    if (this.remote?.usable) {
      const uri = await this.remote.take(paragraph, this.request())
      if (this.stopped) return
      if (uri) {
        const volume = this.options.intensity === 'whisper' ? 0.75 : 1
        if (await this.remote.speak(uri, volume)) return
      }
      // Anything else and the device reads it instead, without a word said.
    }
    if (this.stopped) return

    const voice = await bestVoice(this.options.lang, this.options.voice)

    for (const part of parts) {
      if (this.stopped) return
      if (part.text) await this.utter(part.text, voice)
      if (this.stopped) return
      if (part.restMs > 0) await this.wait(part.restMs)
    }
  }

  private utter(text: string, voice: string | undefined): Promise<void> {
    const minimum = readingMs(text, this.options.speed)

    return new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        resolve()
      }

      // An engine that never calls back cannot hold the night open.
      const watchdog = setTimeout(finish, minimum * 2 + 8_000)
      const done = () => {
        clearTimeout(watchdog)
        finish()
      }

      try {
        Speech.speak(text, {
          language: this.options.lang === 'tr' ? 'tr-TR' : 'en-US',
          voice,
          rate: RATE[this.options.speed] ?? RATE.slow,
          // A whisper is mostly quieter and a little lower, not a cartoon.
          pitch: this.options.intensity === 'whisper' ? 0.94 : 1,
          volume: this.options.intensity === 'whisper' ? 0.7 : 1,
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
