/**
 * Ambient sound, synthesised in the browser.
 *
 * No files, no API, no licensing, and no loop point — which matters more here
 * than fidelity does. A sleep session runs for an hour, and a recorded loop
 * gives itself away in minutes; noise shaped in real time never repeats.
 *
 * Every bed is built from the same two ingredients: coloured noise through a
 * filter for the body of the sound, and sparse scheduled grains for the events
 * on top of it — droplets, crackles, birds, crickets, distant voices.
 */

import type { AmbienceId } from '../domain/options'

/** Six seconds of noise, looped — long enough that the seam is inaudible. */
const NOISE_SECONDS = 6

type NoiseColour = 'white' | 'pink' | 'brown'

function makeNoiseBuffer(ctx: AudioContext, colour: NoiseColour): AudioBuffer {
  const length = ctx.sampleRate * NOISE_SECONDS
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  if (colour === 'white') {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    return buffer
  }

  if (colour === 'brown') {
    let last = 0
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
    return buffer
  }

  // Pink: the Voss-McCartney approximation, cheap and close enough.
  let b0 = 0
  let b1 = 0
  let b2 = 0
  let b3 = 0
  let b4 = 0
  let b5 = 0
  let b6 = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }
  return buffer
}

interface Layer {
  colour: NoiseColour
  filter: BiquadFilterType
  frequency: number
  q: number
  gain: number
  /** Slow movement in the filter, so the bed never sits still. */
  sweep?: { depth: number; seconds: number }
}

interface Grain {
  /** Average seconds between events. */
  every: number
  /** Randomness around that interval, as a fraction. */
  jitter: number
  frequency: [number, number]
  decay: number
  gain: number
  type: OscillatorType | 'noise'
  /** Some events come in twos and threes — birdsong, a crackling log. */
  burst?: number
}

interface Recipe {
  layers: Layer[]
  grains: Grain[]
}

const RECIPES: Record<Exclude<AmbienceId, 'none'>, Recipe> = {
  rain: {
    layers: [
      { colour: 'pink', filter: 'bandpass', frequency: 1400, q: 0.5, gain: 0.5 },
      { colour: 'brown', filter: 'lowpass', frequency: 420, q: 0.7, gain: 0.22 },
    ],
    grains: [
      {
        every: 0.11,
        jitter: 0.9,
        frequency: [1800, 6500],
        decay: 0.035,
        gain: 0.05,
        type: 'noise',
      },
    ],
  },
  ocean: {
    layers: [
      {
        colour: 'brown',
        filter: 'lowpass',
        frequency: 500,
        q: 0.6,
        gain: 0.62,
        sweep: { depth: 340, seconds: 11 },
      },
      {
        colour: 'pink',
        filter: 'bandpass',
        frequency: 900,
        q: 0.4,
        gain: 0.16,
        sweep: { depth: 500, seconds: 13 },
      },
    ],
    grains: [],
  },
  fireplace: {
    layers: [{ colour: 'brown', filter: 'lowpass', frequency: 320, q: 0.8, gain: 0.35 }],
    grains: [
      {
        every: 0.5,
        jitter: 0.95,
        frequency: [900, 4200],
        decay: 0.05,
        gain: 0.1,
        type: 'noise',
        burst: 3,
      },
    ],
  },
  wind: {
    layers: [
      {
        colour: 'pink',
        filter: 'bandpass',
        frequency: 620,
        q: 1.6,
        gain: 0.5,
        sweep: { depth: 420, seconds: 9 },
      },
      { colour: 'brown', filter: 'lowpass', frequency: 260, q: 0.7, gain: 0.3 },
    ],
    grains: [],
  },
  forest: {
    layers: [
      {
        colour: 'pink',
        filter: 'bandpass',
        frequency: 700,
        q: 1.2,
        gain: 0.32,
        sweep: { depth: 300, seconds: 14 },
      },
    ],
    grains: [
      // Leaves.
      { every: 0.9, jitter: 0.8, frequency: [2400, 7000], decay: 0.06, gain: 0.04, type: 'noise' },
      // A bird, now and then, three notes at a time.
      {
        every: 13,
        jitter: 0.7,
        frequency: [1900, 3100],
        decay: 0.12,
        gain: 0.045,
        type: 'sine',
        burst: 3,
      },
    ],
  },
  night: {
    layers: [{ colour: 'brown', filter: 'lowpass', frequency: 180, q: 0.7, gain: 0.34 }],
    grains: [
      // Crickets: a tight, repeating chirp high in the spectrum.
      {
        every: 0.42,
        jitter: 0.35,
        frequency: [4200, 4800],
        decay: 0.022,
        gain: 0.028,
        type: 'triangle',
        burst: 2,
      },
    ],
  },
  cafe: {
    layers: [
      { colour: 'brown', filter: 'lowpass', frequency: 700, q: 0.6, gain: 0.3 },
      {
        colour: 'pink',
        filter: 'bandpass',
        frequency: 1100,
        q: 0.9,
        gain: 0.18,
        sweep: { depth: 260, seconds: 7 },
      },
    ],
    grains: [
      // Cutlery and cups, far away.
      { every: 3.4, jitter: 0.9, frequency: [2600, 6000], decay: 0.07, gain: 0.03, type: 'noise' },
    ],
  },
}

/**
 * One running ambience. Volume is set live so the session's mix slider moves
 * it without rebuilding the graph.
 */
export class Ambience {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private nodes: AudioScheduledSourceNode[] = []
  private timers: number[] = []
  private current: AmbienceId | null = null
  private level = 0.6
  private muted = false

  /** Browsers only allow audio after a gesture, so this is called from one. */
  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(this.ctx.destination)
    return this.ctx
  }

  get running(): boolean {
    return this.current !== null && this.current !== 'none'
  }

  play(ambience: AmbienceId): void {
    if (ambience === this.current) return
    this.teardown()
    this.current = ambience
    if (ambience === 'none') return

    const ctx = this.ensureContext()
    if (!ctx || !this.master) return
    void ctx.resume().catch(() => undefined)

    const recipe = RECIPES[ambience]
    for (const layer of recipe.layers) this.startLayer(ctx, this.master, layer)
    for (const grain of recipe.grains) this.scheduleGrain(ctx, this.master, grain)

    this.applyLevel(0.9)
  }

  /** Browsers suspend audio started without a gesture; a tap revives it. */
  resume(): void {
    void this.ctx?.resume().catch(() => undefined)
  }

  setLevel(level: number): void {
    this.level = Math.min(1, Math.max(0, level))
    this.applyLevel(0.25)
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.applyLevel(0.4)
  }

  stop(): void {
    this.teardown()
    this.current = null
    void this.ctx?.close().catch(() => undefined)
    this.ctx = null
    this.master = null
  }

  private applyLevel(rampSeconds: number): void {
    if (!this.ctx || !this.master) return
    // Perceived loudness is closer to the square of the slider position.
    const target = this.muted || !this.running ? 0 : this.level * this.level * 0.5
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    this.master.gain.linearRampToValueAtTime(target, now + rampSeconds)
  }

  private startLayer(ctx: AudioContext, out: GainNode, layer: Layer): void {
    const source = ctx.createBufferSource()
    source.buffer = makeNoiseBuffer(ctx, layer.colour)
    source.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = layer.filter
    filter.frequency.value = layer.frequency
    filter.Q.value = layer.q

    const gain = ctx.createGain()
    gain.gain.value = layer.gain

    source.connect(filter).connect(gain).connect(out)
    source.start()
    this.nodes.push(source)

    if (layer.sweep) {
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 1 / layer.sweep.seconds
      const depth = ctx.createGain()
      depth.gain.value = layer.sweep.depth
      lfo.connect(depth).connect(filter.frequency)
      lfo.start()
      this.nodes.push(lfo)
    }
  }

  /**
   * Events are scheduled one at a time rather than on a fixed grid, so the
   * rhythm stays irregular the way real rain and fire are.
   */
  private scheduleGrain(ctx: AudioContext, out: GainNode, grain: Grain): void {
    const fire = () => {
      const count = grain.burst ? 1 + Math.floor(Math.random() * grain.burst) : 1
      for (let i = 0; i < count; i++) {
        this.playGrain(ctx, out, grain, ctx.currentTime + i * (0.05 + Math.random() * 0.12))
      }
      const wait = grain.every * (1 + (Math.random() * 2 - 1) * grain.jitter)
      this.timers.push(window.setTimeout(fire, Math.max(30, wait * 1000)))
    }
    fire()
  }

  private playGrain(ctx: AudioContext, out: GainNode, grain: Grain, at: number): void {
    const [low, high] = grain.frequency
    const frequency = low + Math.random() * (high - low)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(grain.gain * (0.6 + Math.random() * 0.4), at + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + grain.decay)
    gain.connect(out)

    if (grain.type === 'noise') {
      const source = ctx.createBufferSource()
      source.buffer = makeNoiseBuffer(ctx, 'white')
      source.loop = true
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = frequency
      filter.Q.value = 6
      source.connect(filter).connect(gain)
      source.start(at)
      source.stop(at + grain.decay + 0.02)
      return
    }

    const osc = ctx.createOscillator()
    osc.type = grain.type
    osc.frequency.setValueAtTime(frequency, at)
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.82, at + grain.decay)
    osc.connect(gain)
    osc.start(at)
    osc.stop(at + grain.decay + 0.02)
  }

  private teardown(): void {
    this.timers.forEach(window.clearTimeout)
    this.timers = []
    for (const node of this.nodes) {
      try {
        node.stop()
      } catch {
        // Already stopped.
      }
      node.disconnect()
    }
    this.nodes = []
  }
}
