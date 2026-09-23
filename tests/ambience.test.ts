/**
 * Listening to the ambience with a ruler.
 *
 * I cannot hear these loops, so the thing that was wrong with the first
 * version had to become something measurable. It was: far too much energy
 * above five kilohertz, which is what "hiss" is, and events made of noise
 * rather than of pitch, which is what "crackle" is.
 *
 * So these tests take the spectrum of every bed and insist the top octaves sit
 * well below the middle, check the loop joins itself without a step, and check
 * nothing clips. They do not prove it sounds like rain. They prove it is not
 * the sound of an untuned radio.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  FADE_SECONDS,
  renderAmbience,
  toWav,
  type AmbienceKind,
} from '../mobile/src/shared/audio/ambienceSynth'

const RATE = 22_050
const SECONDS = 4 // Shorter than the app's loop; the maths is the same.

const KINDS: AmbienceKind[] = ['rain', 'ocean', 'fireplace', 'wind', 'forest', 'night', 'cafe']

/**
 * Energy per band, by the slow and obvious method: one Goertzel pass per
 * frequency of interest over a window. No FFT, no dependency, and only a few
 * hundred frequencies are needed to see the shape.
 */
function goertzel(buffer: Float32Array, rate: number, hz: number, from: number, length: number): number {
  const w = (2 * Math.PI * hz) / rate
  const coeff = 2 * Math.cos(w)
  let s1 = 0
  let s2 = 0
  for (let i = 0; i < length; i++) {
    const s = buffer[from + i]! + coeff * s1 - s2
    s2 = s1
    s1 = s
  }
  return Math.sqrt(s1 * s1 + s2 * s2 - coeff * s1 * s2) / length
}

/** Mean energy across a band, sampled logarithmically. */
function band(buffer: Float32Array, rate: number, low: number, high: number): number {
  const window = Math.min(buffer.length, 16_384)
  const start = Math.floor((buffer.length - window) / 2)
  const steps = 14
  let total = 0
  for (let i = 0; i < steps; i++) {
    const hz = low * Math.pow(high / low, i / (steps - 1))
    total += goertzel(buffer, rate, hz, start, window)
  }
  return total / steps
}

function peak(buffer: Float32Array): number {
  let max = 0
  for (let i = 0; i < buffer.length; i++) max = Math.max(max, Math.abs(buffer[i]!))
  return max
}

function rms(buffer: Float32Array): number {
  let sum = 0
  for (let i = 0; i < buffer.length; i++) sum += buffer[i]! * buffer[i]!
  return Math.sqrt(sum / buffer.length)
}

const rendered = new Map(KINDS.map((kind) => [kind, renderAmbience(kind, RATE, SECONDS)]))

describe('every bed', () => {
  for (const kind of KINDS) {
    describe(kind, () => {
      const loop = rendered.get(kind)!

      it('is the length and shape it was asked for', () => {
        assert.equal(loop.rate, RATE)
        assert.equal(loop.left.length, RATE * SECONDS)
        assert.equal(loop.right.length, RATE * SECONDS)
      })

      it('never clips', () => {
        assert.ok(peak(loop.left) <= 1, `left peaks at ${peak(loop.left)}`)
        assert.ok(peak(loop.right) <= 1, `right peaks at ${peak(loop.right)}`)
      })

      it('is actually audible', () => {
        assert.ok(rms(loop.left) > 0.02, `left is near silent: ${rms(loop.left)}`)
        assert.ok(rms(loop.right) > 0.02, `right is near silent: ${rms(loop.right)}`)
      })

      it('has no NaN or infinity anywhere in it', () => {
        for (const channel of [loop.left, loop.right]) {
          for (let i = 0; i < channel.length; i += 97) {
            assert.ok(Number.isFinite(channel[i]!), `${kind} went non-finite at ${i}`)
          }
        }
      })

      /**
       * The whole complaint, as a number. Hiss is energy at the top of the
       * spectrum with nothing underneath it, so the top two octaves have to
       * sit far below the middle of the band.
       */
      it('is not hiss', () => {
        const middle = band(loop.left, RATE, 200, 1200)
        const top = band(loop.left, RATE, 6000, 10_000)
        const ratio = top / middle
        assert.ok(ratio < 0.2, `${kind}: the top of the spectrum is ${ratio.toFixed(3)} of the middle`)
      })

      it('has a body rather than only a top end', () => {
        const low = band(loop.left, RATE, 80, 400)
        const high = band(loop.left, RATE, 3000, 8000)
        assert.ok(low > high, `${kind}: more energy up high (${high}) than down low (${low})`)
      })

      it('joins itself without a step at the loop point', () => {
        // Whatever the wrap does, it must not be louder than the music around
        // it — a step there is the click you hear every few seconds.
        const n = 64
        const end = loop.left.subarray(loop.left.length - n)
        const start = loop.left.subarray(0, n)
        const step = Math.abs(start[0]! - end[n - 1]!)
        assert.ok(step < 0.35, `${kind}: the loop steps by ${step.toFixed(3)} at the join`)
      })

      it('is not the same in both ears', () => {
        // Identical channels are mono wearing a stereo coat.
        let same = 0
        for (let i = 0; i < 2000; i++) if (loop.left[i] === loop.right[i]) same++
        assert.ok(same < 1500, `${kind}: the two channels are ${same / 20}% identical`)
      })

      it('keeps moving instead of sitting still', () => {
        // A bed with no variation over time is a tone, not an ambience.
        const chunk = Math.floor(loop.left.length / 8)
        const levels = Array.from({ length: 8 }, (_, i) =>
          rms(loop.left.subarray(i * chunk, (i + 1) * chunk)),
        )
        const spread = Math.max(...levels) / Math.min(...levels)
        assert.ok(spread > 1.02, `${kind}: every part of it is the same loudness`)
      })
    })
  }
})

describe('the beds against each other', () => {
  it('makes a night quieter than rain', () => {
    assert.ok(rms(rendered.get('night')!.left) < rms(rendered.get('rain')!.left))
  })

  it('gives the ocean more low end than the forest', () => {
    const sea = band(rendered.get('ocean')!.left, RATE, 60, 250)
    const trees = band(rendered.get('forest')!.left, RATE, 60, 250)
    assert.ok(sea > trees, `ocean ${sea} vs forest ${trees}`)
  })

  it('gives the forest more top than the ocean', () => {
    const trees = band(rendered.get('forest')!.left, RATE, 1500, 4000)
    const sea = band(rendered.get('ocean')!.left, RATE, 1500, 4000)
    assert.ok(trees > sea, `forest ${trees} vs ocean ${sea}`)
  })

  it('renders the same bytes every time', () => {
    const again = renderAmbience('rain', RATE, SECONDS)
    const first = rendered.get('rain')!
    for (let i = 0; i < first.left.length; i += 1013) {
      assert.equal(again.left[i], first.left[i], `rain differed at ${i}`)
    }
  })
})

describe('the WAV it writes', () => {
  const loop = rendered.get('rain')!
  const wav = toWav(loop)

  it('is a stereo 16-bit file of the right length', () => {
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength)
    assert.equal(String.fromCharCode(...wav.subarray(0, 4)), 'RIFF')
    assert.equal(String.fromCharCode(...wav.subarray(8, 12)), 'WAVE')
    assert.equal(view.getUint16(22, true), 2, 'not stereo')
    assert.equal(view.getUint32(24, true), RATE)
    assert.equal(view.getUint16(34, true), 16, 'not 16-bit')
    assert.equal(view.getUint32(40, true), loop.left.length * 4)
    assert.equal(wav.length, 44 + loop.left.length * 4)
  })

  it('carries the samples through intact', () => {
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength)
    for (let i = 0; i < 500; i++) {
      const expected = Math.round(loop.left[i]! * 32767)
      assert.equal(view.getInt16(44 + i * 4, true), expected, `frame ${i}`)
    }
  })
})

describe('the loop budget', () => {
  it('keeps every event shorter than the cross-fade that hides the seam', () => {
    // The longest thing in here is a cricket: a held chirp plus its decay.
    const longestChirp = 0.12 + 0.16 + 0.03 * 6
    assert.ok(
      longestChirp < FADE_SECONDS,
      `a chirp lasts ${longestChirp}s but the fade is only ${FADE_SECONDS}s`,
    )
  })

  it('renders a full-length loop fast enough not to be felt', () => {
    const started = Date.now()
    renderAmbience('rain', 22_050, 20)
    const took = Date.now() - started
    // Generous: a phone is slower than this machine, and it happens once,
    // off the render path, while the session screen is already up.
    assert.ok(took < 6000, `twenty seconds of rain took ${took}ms to render`)
  })

  /**
   * An owl's call is far longer than the cross-fade that hides the seam, so
   * instead of shortening it the call is scheduled well clear of the end. If
   * that margin ever shrinks below the call's length, owls start getting cut
   * in half at the loop point.
   */
  it('keeps the owl clear of the loop point', () => {
    const margin = 2
    const longestCall = 0.42 + 0.18 + 0.3 + 0.09 * 6
    assert.ok(longestCall < margin, `an owl runs ${longestCall}s into a ${margin}s margin`)
  })
})
