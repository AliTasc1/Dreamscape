/**
 * Ambience, synthesised.
 *
 * Pure arithmetic: no platform, no files, no network. The phone renders a loop
 * once and plays it on repeat; the web can render the same loop from the same
 * code. `tests/ambience.test.ts` measures what comes out.
 *
 * The first version of this file made one mistake, and it made it everywhere:
 * a single one-pole low-pass, which rolls off at six decibels per octave, is
 * not a filter so much as a suggestion. Noise pushed through it stays bright,
 * and bright noise is hiss. Everything here is built from two-pole filters
 * instead, and the sounds that are made of events — raindrops, the crackle of
 * a fire, crickets — are modelled as events with a pitch and a decay, not as
 * bursts of more noise.
 *
 * Three rules hold the loop together:
 *
 *  - Every modulation completes a whole number of cycles inside the loop, so
 *    the end lines up with the beginning instead of arriving mid-swell.
 *  - The render runs longer than the loop and the overhang is cross-faded onto
 *    the head, so the wrap has no click and no repeated transient.
 *  - No event's tail is longer than that cross-fade, or it would be cut off.
 */

export type AmbienceKind =
  | 'rain'
  | 'ocean'
  | 'fireplace'
  | 'wind'
  | 'forest'
  | 'night'
  | 'cafe'

export interface Loop {
  left: Float32Array
  right: Float32Array
  rate: number
}

/** How loud each bed sits, as RMS. Rain fills a room; a night barely moves. */
const LOUDNESS: Record<AmbienceKind, number> = {
  rain: 0.15,
  ocean: 0.16,
  fireplace: 0.13,
  wind: 0.14,
  forest: 0.1,
  night: 0.075,
  cafe: 0.1,
}

const SEEDS: Record<AmbienceKind, number> = {
  rain: 0x5eed1,
  ocean: 0x5eed2,
  fireplace: 0x5eed3,
  wind: 0x5eed4,
  forest: 0x5eed5,
  night: 0x5eed6,
  cafe: 0x5eed7,
}

/** The longest tail any event here is allowed to have. */
export const FADE_SECONDS = 0.6

// ---------------------------------------------------------------- primitives

/** Deterministic, so the same ambience renders to the same bytes every time. */
function rng(seed: number): () => number {
  let state = (seed >>> 0) || 1
  return () => {
    // xorshift32 — cheap, and far better distributed than a plain LCG.
    state ^= state << 13
    state >>>= 0
    state ^= state >> 17
    state ^= state << 5
    state >>>= 0
    return state / 0x100000000
  }
}

function white(random: () => number): number {
  return random() * 2 - 1
}

/**
 * Pink noise by Paul Kellet's filter: about -3 dB per octave, which is the
 * tilt most natural sound already has. Starting from pink rather than white
 * is half of why this no longer hisses.
 */
function pinkMaker(random: () => number): () => number {
  let b0 = 0
  let b1 = 0
  let b2 = 0
  let b3 = 0
  let b4 = 0
  let b5 = 0
  let b6 = 0
  return () => {
    const w = white(random)
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.969 * b2 + w * 0.153852
    b3 = 0.8665 * b3 + w * 0.3104856
    b4 = 0.55 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.016898
    const out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362
    b6 = w * 0.115926
    return out * 0.11
  }
}

/** Brown noise: -6 dB per octave. Rumble, swell, the bottom of everything. */
function brownMaker(random: () => number): () => number {
  let last = 0
  return () => {
    last = (last + 0.02 * white(random)) / 1.02
    return last * 3.2
  }
}

type Shape = 'lowpass' | 'highpass' | 'bandpass'

/**
 * A two-pole filter from the RBJ cookbook — twelve decibels an octave, and a
 * resonance control, which is what lets wind and rain have a voice rather than
 * a colour. Coefficients are only recomputed when a sweep actually moves them.
 */
class Biquad {
  private b0 = 1
  private b1 = 0
  private b2 = 0
  private a1 = 0
  private a2 = 0
  private x1 = 0
  private x2 = 0
  private y1 = 0
  private y2 = 0
  private lastHz = -1
  private lastQ = -1

  constructor(
    private readonly rate: number,
    private readonly shape: Shape,
  ) {}

  set(hz: number, q: number): void {
    const f = Math.min(this.rate * 0.45, Math.max(20, hz))
    // A hair of movement is not worth eighteen multiplications.
    if (Math.abs(f - this.lastHz) < 0.5 && Math.abs(q - this.lastQ) < 0.01) return
    this.lastHz = f
    this.lastQ = q

    const w = (2 * Math.PI * f) / this.rate
    const cos = Math.cos(w)
    const alpha = Math.sin(w) / (2 * Math.max(0.1, q))
    const a0 = 1 + alpha

    if (this.shape === 'lowpass') {
      const k = (1 - cos) / 2
      this.b0 = k / a0
      this.b1 = (1 - cos) / a0
      this.b2 = k / a0
    } else if (this.shape === 'highpass') {
      const k = (1 + cos) / 2
      this.b0 = k / a0
      this.b1 = -(1 + cos) / a0
      this.b2 = k / a0
    } else {
      this.b0 = alpha / a0
      this.b1 = 0
      this.b2 = -alpha / a0
    }
    this.a1 = (-2 * cos) / a0
    this.a2 = (1 - alpha) / a0
  }

  run(x: number): number {
    const y =
      this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2
    this.x2 = this.x1
    this.x1 = x
    this.y2 = this.y1
    this.y1 = y
    return y
  }
}

/** Two of them in series: twenty-four decibels an octave, and properly dark. */
class Ladder {
  private readonly a: Biquad
  private readonly b: Biquad
  constructor(rate: number, shape: Shape) {
    this.a = new Biquad(rate, shape)
    this.b = new Biquad(rate, shape)
  }
  set(hz: number, q: number): void {
    this.a.set(hz, q)
    this.b.set(hz, 0.7)
  }
  run(x: number): number {
    return this.b.run(this.a.run(x))
  }
}

/**
 * One sound with a beginning and an end: a drop landing, a log spitting, a
 * cricket. Scheduled up front so density is exact rather than probabilistic.
 */
interface Event {
  /** Frame it begins on. */
  at: number
  /** Hz. */
  hz: number
  /** Seconds until it has effectively gone. */
  decay: number
  gain: number
  /** -1 hard left, +1 hard right. */
  pan: number
  /** Amplitude-modulation rate, for chirps. 0 for everything else. */
  trill: number
  /** How long the event keeps going before it is only decaying. */
  hold: number
}

function schedule(
  random: () => number,
  frames: number,
  perSecond: number,
  rate: number,
  make: (random: () => number) => Omit<Event, 'at'>,
): Event[] {
  const count = Math.max(0, Math.round((frames / rate) * perSecond))
  const events: Event[] = []
  for (let i = 0; i < count; i++) {
    events.push({ at: Math.floor(random() * frames), ...make(random) })
  }
  return events.sort((a, b) => a.at - b.at)
}

/**
 * Renders the scheduled events into two channels.
 *
 * Each is a decaying tone with a little noise in it, because a drop of water
 * on a leaf is mostly a pitch and slightly a splash. The noise alone was the
 * old crackle; the pitch alone would be a doorbell.
 */
function mixEvents(
  events: Event[],
  left: Float32Array,
  right: Float32Array,
  rate: number,
  random: () => number,
  noisiness: number,
): void {
  const total = left.length
  for (const event of events) {
    const life = Math.min(total - event.at, Math.ceil((event.decay * 6 + event.hold) * rate))
    if (life <= 0) continue
    const k = 1 / (event.decay * rate)
    const step = (2 * Math.PI * event.hz) / rate
    const trillStep = event.trill > 0 ? (2 * Math.PI * event.trill) / rate : 0
    const gainL = event.gain * Math.sqrt((1 - event.pan) / 2)
    const gainR = event.gain * Math.sqrt((1 + event.pan) / 2)
    const holdFrames = event.hold * rate

    for (let i = 0; i < life; i++) {
      const index = event.at + i
      // A fast rise, or the attack clicks.
      const attack = Math.min(1, i / (0.0015 * rate))
      const envelope = i < holdFrames ? attack : attack * Math.exp(-(i - holdFrames) * k)
      if (envelope < 0.0005) break
      const trill = trillStep > 0 ? 0.5 + 0.5 * Math.sin(trillStep * i) : 1
      const body = Math.sin(step * i) * (1 - noisiness) + white(random) * noisiness
      const value = body * envelope * trill
      left[index] += value * gainL
      right[index] += value * gainR
    }
  }
}

/** A modulation that ends where it started, so the loop does not lurch. */
function lfo(cycles: number, seconds: number): (frame: number, rate: number) => number {
  const hz = cycles / seconds
  return (frame, rate) => Math.sin((2 * Math.PI * hz * frame) / rate)
}

// ------------------------------------------------------------------ the beds

interface Canvas {
  left: Float32Array
  right: Float32Array
  rate: number
  frames: number
  seconds: number
  random: () => number
}

function rain(c: Canvas): void {
  const { left, right, rate, frames, random } = c
  const pinkL = pinkMaker(random)
  const pinkR = pinkMaker(random)
  const rumble = brownMaker(random)

  // The sheet of rain: pink noise with everything above a few kHz taken off,
  // and everything below the room taken off too.
  const bodyL = new Ladder(rate, 'lowpass')
  const bodyR = new Ladder(rate, 'lowpass')
  const cutL = new Biquad(rate, 'highpass')
  const cutR = new Biquad(rate, 'highpass')
  const deep = new Ladder(rate, 'lowpass')
  const breath = lfo(3, c.seconds)
  const drift = lfo(1, c.seconds)

  cutL.set(170, 0.7)
  cutR.set(170, 0.7)
  deep.set(110, 0.7)

  for (let i = 0; i < frames; i++) {
    const open = 2600 + breath(i, rate) * 550 + drift(i, rate) * 250
    bodyL.set(open, 0.6)
    bodyR.set(open, 0.6)
    const l = cutL.run(bodyL.run(pinkL())) * 1.9
    const r = cutR.run(bodyR.run(pinkR())) * 1.9
    const low = deep.run(rumble()) * 0.5
    left[i] = l + low
    right[i] = r + low
  }

  // Sixty drops a second blur into texture; any fewer and you hear each one.
  mixEvents(
    schedule(random, frames, 62, rate, (r2) => ({
      hz: 900 + r2() * 1900,
      decay: 0.004 + r2() * 0.012,
      gain: 0.04 + r2() * 0.1,
      pan: white(r2) * 0.85,
      trill: 0,
      hold: 0,
    })),
    left,
    right,
    rate,
    random,
    0.35,
  )
}

function ocean(c: Canvas): void {
  const { left, right, rate, frames, random } = c
  const brownL = brownMaker(random)
  const brownR = brownMaker(random)
  const foamL = pinkMaker(random)
  const foamR = pinkMaker(random)

  const swellL = new Ladder(rate, 'lowpass')
  const swellR = new Ladder(rate, 'lowpass')
  const spray = new Biquad(rate, 'bandpass')
  const sprayR = new Biquad(rate, 'bandpass')
  // Two long waves in the loop, so it never sounds like it is counting.
  const wave = lfo(2, c.seconds)
  const slow = lfo(1, c.seconds)

  spray.set(1300, 0.8)
  sprayR.set(1150, 0.8)

  for (let i = 0; i < frames; i++) {
    // A wave is not a sine: it gathers slowly and breaks quickly.
    const raw = (wave(i, rate) + 1) / 2
    const swell = Math.pow(raw, 1.8)
    const open = 190 + swell * 620 + slow(i, rate) * 60
    swellL.set(open, 0.8)
    swellR.set(open, 0.8)

    // The foam arrives after the water does.
    const late = Math.pow(Math.max(0, (wave(i - rate * 0.9, rate) + 1) / 2), 3)

    const l = swellL.run(brownL()) * (0.55 + swell * 0.9)
    const r = swellR.run(brownR()) * (0.55 + swell * 0.9)
    left[i] = l + spray.run(foamL()) * late * 0.5
    right[i] = r + sprayR.run(foamR()) * late * 0.5
  }
}

function fireplace(c: Canvas): void {
  const { left, right, rate, frames, random } = c
  const roarL = brownMaker(random)
  const roarR = brownMaker(random)
  const bodyNoise = pinkMaker(random)

  const roarFilterL = new Ladder(rate, 'lowpass')
  const roarFilterR = new Ladder(rate, 'lowpass')
  const body = new Biquad(rate, 'bandpass')
  const flicker = lfo(5, c.seconds)
  const slow = lfo(2, c.seconds)

  body.set(420, 0.6)

  for (let i = 0; i < frames; i++) {
    const open = 260 + flicker(i, rate) * 70 + slow(i, rate) * 40
    roarFilterL.set(open, 0.8)
    roarFilterR.set(open, 0.8)
    const breath = 0.8 + flicker(i, rate) * 0.22
    const warm = body.run(bodyNoise()) * 0.45
    left[i] = roarFilterL.run(roarL()) * breath + warm
    right[i] = roarFilterR.run(roarR()) * breath + warm
  }

  // Crackles: brief, bright and rare enough to be individual.
  mixEvents(
    schedule(random, frames, 11, rate, (r2) => ({
      hz: 1500 + r2() * 3200,
      decay: 0.003 + r2() * 0.01,
      gain: 0.05 + Math.pow(r2(), 3) * 0.45,
      pan: white(r2) * 0.7,
      trill: 0,
      hold: 0,
    })),
    left,
    right,
    rate,
    random,
    0.55,
  )
  // And now and then a log gives way.
  mixEvents(
    schedule(random, frames, 0.7, rate, (r2) => ({
      hz: 220 + r2() * 300,
      decay: 0.04 + r2() * 0.08,
      gain: 0.12 + r2() * 0.18,
      pan: white(r2) * 0.5,
      trill: 0,
      hold: 0,
    })),
    left,
    right,
    rate,
    random,
    0.5,
  )
}

function wind(c: Canvas): void {
  const { left, right, rate, frames, random } = c
  const pinkL = pinkMaker(random)
  const pinkR = pinkMaker(random)
  const deepNoise = brownMaker(random)

  const voiceL = new Biquad(rate, 'bandpass')
  const voiceR = new Biquad(rate, 'bandpass')
  const airL = new Ladder(rate, 'lowpass')
  const airR = new Ladder(rate, 'lowpass')
  const deep = new Ladder(rate, 'lowpass')
  // Three gust rates that never quite line up — wind is not periodic.
  const gustA = lfo(2, c.seconds)
  const gustB = lfo(3, c.seconds)
  const gustC = lfo(7, c.seconds)

  deep.set(170, 0.7)

  for (let i = 0; i < frames; i++) {
    const gust = (gustA(i, rate) * 0.5 + gustB(i, rate) * 0.32 + gustC(i, rate) * 0.18 + 1) / 2
    voiceL.set(330 + gust * 520, 1.6)
    voiceR.set(300 + gust * 560, 1.6)
    airL.set(900 + gust * 900, 0.7)
    airR.set(900 + gust * 900, 0.7)

    const level = 0.35 + gust * 0.85
    const nL = pinkL()
    const nR = pinkR()
    const low = deep.run(deepNoise()) * 0.45
    left[i] = (voiceL.run(nL) * 1.5 + airL.run(nL) * 0.55) * level + low
    right[i] = (voiceR.run(nR) * 1.5 + airR.run(nR) * 0.55) * level + low
  }
}

function forest(c: Canvas): void {
  const { left, right, rate, frames, random } = c
  const pinkL = pinkMaker(random)
  const pinkR = pinkMaker(random)
  const airNoise = brownMaker(random)

  const leafL = new Biquad(rate, 'bandpass')
  const leafR = new Biquad(rate, 'bandpass')
  const airFilterL = new Ladder(rate, 'lowpass')
  const airFilterR = new Ladder(rate, 'lowpass')
  const airNoiseR = brownMaker(random)
  const breeze = lfo(2, c.seconds)
  const slow = lfo(1, c.seconds)

  airFilterL.set(320, 0.7)
  airFilterR.set(320, 0.7)

  for (let i = 0; i < frames; i++) {
    const move = (breeze(i, rate) * 0.7 + slow(i, rate) * 0.3 + 1) / 2
    leafL.set(1400 + move * 900, 0.9)
    leafR.set(1300 + move * 950, 0.9)
    const level = 0.3 + move * 0.8
    left[i] = leafL.run(pinkL()) * level * 1.4 + airFilterL.run(airNoise()) * 0.4
    right[i] = leafR.run(pinkR()) * level * 1.4 + airFilterR.run(airNoiseR()) * 0.4
  }

  // Individual leaves, close by.
  mixEvents(
    schedule(random, frames, 24, rate, (r2) => ({
      hz: 2200 + r2() * 2600,
      decay: 0.006 + r2() * 0.02,
      gain: 0.02 + Math.pow(r2(), 2) * 0.1,
      pan: white(r2) * 0.9,
      trill: 0,
      hold: 0,
    })),
    left,
    right,
    rate,
    random,
    0.7,
  )
}

function night(c: Canvas): void {
  const { left, right, rate, frames, random } = c
  const airL = brownMaker(random)
  const airR = brownMaker(random)
  const hushL = pinkMaker(random)
  const hushR = pinkMaker(random)

  const deepL = new Ladder(rate, 'lowpass')
  const deepR = new Ladder(rate, 'lowpass')
  const hushFilterL = new Ladder(rate, 'lowpass')
  const hushFilterR = new Ladder(rate, 'lowpass')
  const drift = lfo(1, c.seconds)

  deepL.set(95, 0.7)
  deepR.set(95, 0.7)

  for (let i = 0; i < frames; i++) {
    const open = 600 + drift(i, rate) * 180
    hushFilterL.set(open, 0.6)
    hushFilterR.set(open, 0.6)
    left[i] = deepL.run(airL()) * 0.6 + hushFilterL.run(hushL()) * 0.55
    right[i] = deepR.run(airR()) * 0.6 + hushFilterR.run(hushR()) * 0.55
  }

  // Crickets. The trill is what makes them crickets rather than whistles, and
  // the hold is the length of one chirp before it dies away.
  mixEvents(
    schedule(random, frames, 2.2, rate, (r2) => ({
      hz: 3900 + r2() * 1100,
      decay: 0.03,
      gain: 0.05 + r2() * 0.09,
      pan: white(r2) * 0.9,
      trill: 24 + r2() * 12,
      hold: 0.12 + r2() * 0.16,
    })),
    left,
    right,
    rate,
    random,
    0.08,
  )
}

function cafe(c: Canvas): void {
  const { left, right, rate, frames, random } = c
  const roomL = brownMaker(random)
  const roomR = brownMaker(random)

  const room = new Ladder(rate, 'lowpass')
  const roomRight = new Ladder(rate, 'lowpass')
  room.set(200, 0.7)
  roomRight.set(200, 0.7)

  // Four murmuring layers at unrelated rates: nobody in particular, everybody
  // at once. Speech lives around here, so the filters sit where voices do.
  const layers = [
    { hz: 300, q: 0.9, rate: 3, gain: 0.5 },
    { hz: 420, q: 1.1, rate: 5, gain: 0.42 },
    { hz: 560, q: 1.0, rate: 7, gain: 0.3 },
    { hz: 760, q: 1.2, rate: 11, gain: 0.2 },
  ]
  const voices = layers.map((layer) => ({
    left: new Biquad(rate, 'bandpass'),
    right: new Biquad(rate, 'bandpass'),
    noiseL: pinkMaker(random),
    noiseR: pinkMaker(random),
    swing: lfo(layer.rate, c.seconds),
    layer,
  }))
  for (const voice of voices) {
    voice.left.set(voice.layer.hz, voice.layer.q)
    voice.right.set(voice.layer.hz * 0.96, voice.layer.q)
  }

  for (let i = 0; i < frames; i++) {
    let l = room.run(roomL()) * 0.55
    let r = roomRight.run(roomR()) * 0.55
    for (const voice of voices) {
      const level = 0.35 + ((voice.swing(i, rate) + 1) / 2) * 0.75
      l += voice.left.run(voice.noiseL()) * voice.layer.gain * level
      r += voice.right.run(voice.noiseR()) * voice.layer.gain * level
    }
    left[i] = l
    right[i] = r
  }

  // A cup finding a saucer, once in a while.
  mixEvents(
    schedule(random, frames, 0.5, rate, (r2) => ({
      hz: 1800 + r2() * 1400,
      decay: 0.05 + r2() * 0.06,
      gain: 0.03 + r2() * 0.05,
      pan: white(r2) * 0.8,
      trill: 0,
      hold: 0,
    })),
    left,
    right,
    rate,
    random,
    0.2,
  )
}

const BEDS: Record<AmbienceKind, (c: Canvas) => void> = {
  rain,
  ocean,
  fireplace,
  wind,
  forest,
  night,
  cafe,
}

// ------------------------------------------------------------------ assembly

function rms(buffer: Float32Array): number {
  let sum = 0
  for (let i = 0; i < buffer.length; i++) sum += buffer[i]! * buffer[i]!
  return Math.sqrt(sum / buffer.length)
}

/**
 * Brings the bed to its intended loudness, then rounds off anything that would
 * have clipped. A hard clip is a buzz, and a buzz at three in the morning is
 * worse than no ambience at all.
 */
function level(left: Float32Array, right: Float32Array, target: number): void {
  const current = Math.max(rms(left), rms(right)) || 1
  const gain = target / current
  for (let i = 0; i < left.length; i++) {
    left[i] = Math.tanh(left[i]! * gain * 1.15) / 1.15
    right[i] = Math.tanh(right[i]! * gain * 1.15) / 1.15
  }
}

/** Wraps the overhang onto the head so the loop point cannot be heard. */
function seam(channel: Float32Array, frames: number, fade: number): Float32Array {
  const out = new Float32Array(frames)
  out.set(channel.subarray(0, frames))
  for (let i = 0; i < fade; i++) {
    const t = i / fade
    out[i] = out[i]! * t + channel[frames + i]! * (1 - t)
  }
  return out
}

export function renderAmbience(kind: AmbienceKind, rate: number, seconds: number): Loop {
  const frames = Math.round(rate * seconds)
  const fade = Math.round(rate * FADE_SECONDS)
  const total = frames + fade

  const left = new Float32Array(total)
  const right = new Float32Array(total)
  const random = rng(SEEDS[kind])

  BEDS[kind]({ left, right, rate, frames: total, seconds, random })
  level(left, right, LOUDNESS[kind])

  return { left: seam(left, frames, fade), right: seam(right, frames, fade), rate }
}

/** 16-bit stereo PCM, the one format every phone plays without thinking. */
export function toWav(loop: Loop): Uint8Array {
  const frames = loop.left.length
  const dataBytes = frames * 4
  const bytes = new Uint8Array(44 + dataBytes)
  const view = new DataView(bytes.buffer)
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i)
  }

  ascii(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 2, true) // stereo
  view.setUint32(24, loop.rate, true)
  view.setUint32(28, loop.rate * 4, true) // byte rate
  view.setUint16(32, 4, true) // block align
  view.setUint16(34, 16, true) // bits
  ascii(36, 'data')
  view.setUint32(40, dataBytes, true)

  let offset = 44
  for (let i = 0; i < frames; i++) {
    const l = Math.max(-1, Math.min(1, loop.left[i]!))
    const r = Math.max(-1, Math.min(1, loop.right[i]!))
    view.setInt16(offset, Math.round(l * 32767), true)
    view.setInt16(offset + 2, Math.round(r * 32767), true)
    offset += 4
  }
  return bytes
}
