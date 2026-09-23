import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'
import { Directory, File, Paths } from 'expo-file-system'
import type { AmbienceId } from '../shared/domain/options'

/**
 * Ambient sound, generated on the device.
 *
 * There is no Web Audio API on a phone, so the bed cannot be synthesised live
 * the way it is on the web. Instead a seamless loop is written as a WAV into
 * the cache the first time an ambience is used, and played on repeat. Still no
 * files shipped, no licensing, no API and no cost — the phone makes its own
 * rain.
 *
 * The loop is built to be seamless: the noise is generated one period longer
 * than the file and the overhang is cross-faded onto the beginning, so the
 * wrap point has no click and no audible repeat of a transient.
 */

const RATE = 22_050
const SECONDS = 8
const FADE = Math.floor(RATE * 0.35)

interface Recipe {
  /** 0 = brown (deep), 1 = pink, 2 = white (bright). */
  colour: number
  /** One-pole low-pass coefficient; lower is darker. */
  cutoff: number
  /** How much the cutoff drifts, and how slowly. */
  sweep: number
  sweepHz: number
  /** Chance per sample of a transient, and how fast it decays. */
  grainRate: number
  grainDecay: number
  gain: number
}

const RECIPES: Record<Exclude<AmbienceId, 'none'>, Recipe> = {
  rain: { colour: 1, cutoff: 0.5, sweep: 0.05, sweepHz: 0.08, grainRate: 0.004, grainDecay: 0.002, gain: 0.5 },
  ocean: { colour: 0, cutoff: 0.12, sweep: 0.08, sweepHz: 0.09, grainRate: 0, grainDecay: 0, gain: 0.62 },
  fireplace: { colour: 0, cutoff: 0.1, sweep: 0.03, sweepHz: 0.3, grainRate: 0.0016, grainDecay: 0.004, gain: 0.5 },
  wind: { colour: 1, cutoff: 0.22, sweep: 0.14, sweepHz: 0.11, grainRate: 0, grainDecay: 0, gain: 0.52 },
  forest: { colour: 1, cutoff: 0.3, sweep: 0.1, sweepHz: 0.07, grainRate: 0.0006, grainDecay: 0.0015, gain: 0.4 },
  night: { colour: 0, cutoff: 0.07, sweep: 0.02, sweepHz: 0.05, grainRate: 0.0009, grainDecay: 0.02, gain: 0.38 },
  cafe: { colour: 0, cutoff: 0.28, sweep: 0.06, sweepHz: 0.2, grainRate: 0.0005, grainDecay: 0.003, gain: 0.42 },
}

/** Deterministic noise, so the same ambience is the same file every time. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0
    return state / 0xffffffff
  }
}

function render(recipe: Recipe, seed: number): Float32Array {
  const total = RATE * SECONDS + FADE
  const out = new Float32Array(total)
  const random = makeRandom(seed)

  let brown = 0
  let pink = 0
  let low = 0
  let grain = 0
  let grainEnv = 0

  for (let i = 0; i < total; i++) {
    const white = random() * 2 - 1
    brown = (brown + 0.02 * white) / 1.02
    pink = 0.98 * pink + 0.02 * white * 4

    const source = recipe.colour === 0 ? brown * 3.5 : recipe.colour === 1 ? pink : white
    const drift = Math.sin((2 * Math.PI * recipe.sweepHz * i) / RATE) * recipe.sweep
    const cutoff = Math.min(0.95, Math.max(0.02, recipe.cutoff + drift))
    low += cutoff * (source - low)

    if (recipe.grainRate > 0) {
      if (random() < recipe.grainRate) {
        grainEnv = 1
        grain = 0
      }
      if (grainEnv > 0.0005) {
        grain += 0.4 * (random() * 2 - 1 - grain)
        grainEnv *= 1 - recipe.grainDecay
      } else {
        grainEnv = 0
      }
    }

    out[i] = low * recipe.gain + grain * grainEnv * 0.5
  }

  // Wrap the overhang onto the head so the loop point is inaudible.
  const looped = new Float32Array(RATE * SECONDS)
  looped.set(out.subarray(0, RATE * SECONDS))
  for (let i = 0; i < FADE; i++) {
    const t = i / FADE
    looped[i] = looped[i] * t + out[RATE * SECONDS + i] * (1 - t)
  }
  return looped
}

function toWav(samples: Float32Array): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2)
  const view = new DataView(bytes.buffer)
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i)
  }

  ascii(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM header size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, RATE, true)
  view.setUint32(28, RATE * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits
  ascii(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true)
  }
  return bytes
}

const SEEDS: Record<string, number> = {
  rain: 7, ocean: 19, fireplace: 31, wind: 43, forest: 57, night: 71, cafe: 89,
}

/** Writes the loop once and reuses it for every later night. */
function fileFor(ambience: Exclude<AmbienceId, 'none'>): string | null {
  try {
    const dir = new Directory(Paths.cache, 'ambience')
    if (!dir.exists) dir.create({ intermediates: true })

    const file = new File(dir, `${ambience}-v1.wav`)
    if (!file.exists) {
      file.create()
      file.write(toWav(render(RECIPES[ambience], SEEDS[ambience] ?? 3)))
    }
    return file.uri
  } catch {
    // No cache, no space, no permission — the night runs without a bed.
    return null
  }
}

export class Ambience {
  private player: AudioPlayer | null = null
  private current: AmbienceId | null = null
  private level = 0.62
  private muted = false

  /** Keeps playing with the screen off and does not silence the ringer switch. */
  static async configure(): Promise<void> {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'mixWithOthers',
      })
    } catch {
      // Older runtime; playback still works with the defaults.
    }
  }

  play(ambience: AmbienceId): void {
    if (ambience === this.current) return
    this.teardown()
    this.current = ambience
    if (ambience === 'none') return

    const uri = fileFor(ambience)
    if (!uri) return

    try {
      const player = createAudioPlayer(uri)
      player.loop = true
      player.volume = this.volume()
      player.play()
      this.player = player
    } catch {
      this.player = null
    }
  }

  setLevel(level: number): void {
    this.level = Math.min(1, Math.max(0, level))
    if (this.player) this.player.volume = this.volume()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.player) this.player.volume = this.volume()
  }

  stop(): void {
    this.teardown()
    this.current = null
  }

  /** Perceived loudness is closer to the square of the slider position. */
  private volume(): number {
    return this.muted ? 0 : this.level * this.level * 0.6
  }

  private teardown(): void {
    if (!this.player) return
    try {
      this.player.pause()
      this.player.remove()
    } catch {
      // Already gone.
    }
    this.player = null
  }
}
