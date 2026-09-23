import { createAudioPlayer } from 'expo-audio'
import { Directory, File, Paths } from 'expo-file-system'
import { apiHeaders } from '../ai/client'
import type { TtsRequest } from '../shared/ai/contracts'

/**
 * The hosted voice, when there is one.
 *
 * The phone's own engine reads words; it does not perform them. A hosted voice
 * does — ElevenLabs' v3 model reads the markers the narrator writes, so
 * [breathes] is a breath and [laughs] is a laugh rather than a silence where
 * one should have been. That is the whole reason this file exists, and it is
 * why the text goes out here with its markers intact instead of stripped.
 *
 * Everything about it is optional. No server, no key, no network, a refusal,
 * a timeout — each one falls back to the device voice, and the night carries
 * on without the listener being told anything went wrong.
 *
 * One paragraph is fetched while the one before it is still being spoken, so
 * the wait for the next is spent listening rather than in silence.
 */

/** Long enough for a paragraph of speech to be synthesised and sent. */
const FETCH_TIMEOUT_MS = 30_000
/** After this many failures in a row, stop asking and use the device. */
const GIVE_UP_AFTER = 3

function cacheDir(): Directory | null {
  try {
    const dir = new Directory(Paths.cache, 'voice')
    if (!dir.exists) dir.create({ intermediates: true })
    return dir
  } catch {
    return null
  }
}

/**
 * React Native's fetch can produce an ArrayBuffer, but by way of a blob and a
 * base64 round trip. XHR asks for the bytes directly and is what the streaming
 * client already uses, so it is what this uses too.
 */
function fetchAudio(url: string, body: TtsRequest): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    let settled = false
    const done = (value: ArrayBuffer | null) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    try {
      const request = new XMLHttpRequest()
      request.open('POST', url)
      request.responseType = 'arraybuffer'
      request.timeout = FETCH_TIMEOUT_MS
      for (const [name, value] of Object.entries(apiHeaders({ 'content-type': 'application/json' }))) {
        request.setRequestHeader(name, value)
      }
      request.onload = () => {
        const payload: unknown = request.response
        // A JSON error body arrives as bytes too, so the status decides.
        if (request.status !== 200 || !(payload instanceof ArrayBuffer) || payload.byteLength < 512) {
          done(null)
          return
        }
        done(payload)
      }
      request.onerror = () => done(null)
      request.ontimeout = () => done(null)
      request.onabort = () => done(null)
      request.send(JSON.stringify(body))
    } catch {
      done(null)
    }
  })
}

let counter = 0

export class RemoteVoice {
  private failures = 0
  /** Audio already being fetched, keyed by the paragraph that asked for it. */
  private pending = new Map<string, Promise<string | null>>()
  private player: ReturnType<typeof createAudioPlayer> | null = null

  constructor(private readonly base: string) {}

  get usable(): boolean {
    return Boolean(this.base) && this.failures < GIVE_UP_AFTER
  }

  /**
   * Starts fetching a paragraph's audio without waiting for it. Called as
   * narration arrives, so by the time the voice reaches a paragraph its audio
   * is usually already on the phone.
   */
  prefetch(paragraph: string, request: Omit<TtsRequest, 'text'>): void {
    if (!this.usable || this.pending.has(paragraph)) return
    // Don't queue the whole night at once; two ahead is plenty.
    if (this.pending.size > 2) return
    this.pending.set(paragraph, this.download(paragraph, request))
  }

  /** The local file for a paragraph, fetching it now if nobody did earlier. */
  async take(paragraph: string, request: Omit<TtsRequest, 'text'>): Promise<string | null> {
    if (!this.usable) return null
    const existing = this.pending.get(paragraph)
    const uri = await (existing ?? this.download(paragraph, request))
    this.pending.delete(paragraph)
    return uri
  }

  private async download(
    paragraph: string,
    request: Omit<TtsRequest, 'text'>,
  ): Promise<string | null> {
    const dir = cacheDir()
    if (!dir) return null

    // The markers go out as written: they are the point of a hosted voice.
    const audio = await fetchAudio(`${this.base}/api/tts`, { ...request, text: paragraph })
    if (!audio) {
      this.failures += 1
      return null
    }
    this.failures = 0

    try {
      const file = new File(dir, `line-${++counter}.mp3`)
      if (file.exists) file.delete()
      file.create()
      file.write(new Uint8Array(audio))
      return file.uri
    } catch {
      return null
    }
  }

  /** Plays one file through and resolves when it has finished. */
  speak(uri: string, volume: number): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false
      let watchdog: ReturnType<typeof setTimeout> | null = null

      const finish = (played: boolean) => {
        if (settled) return
        settled = true
        if (watchdog) clearTimeout(watchdog)
        this.release(uri)
        resolve(played)
      }

      try {
        const player = createAudioPlayer(uri)
        this.player = player
        player.volume = volume
        player.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish) finish(true)
        })
        player.play()
        // A player that never reports finishing cannot hold the night open.
        // Its duration is unknown until it loads, so this is re-armed once.
        watchdog = setTimeout(() => {
          const duration = player.duration
          if (duration > 0) {
            watchdog = setTimeout(() => finish(true), (duration + 3) * 1000)
          } else {
            finish(false)
          }
        }, 2000)
      } catch {
        finish(false)
      }
    })
  }

  /** Stops whatever is playing. The night is over or the listener spoke. */
  stop(): void {
    const player = this.player
    this.player = null
    if (!player) return
    try {
      player.pause()
      player.remove()
    } catch {
      // Already gone.
    }
  }

  /** Forgets everything queued — used when the listener interrupts. */
  clear(): void {
    this.stop()
    this.pending.clear()
  }

  private release(uri: string): void {
    this.stop()
    try {
      const file = new File(uri)
      if (file.exists) file.delete()
    } catch {
      // A leftover file in the cache is the operating system's problem.
    }
  }
}
