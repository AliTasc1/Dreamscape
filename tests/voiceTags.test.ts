/**
 * The markers, on their way to a voice that can perform them.
 *
 * Eleven v3 acts on the tags it recognises and reads the rest out loud, so a
 * night written with "[long pause]" in it would have the companion say the
 * words "long pause" in the middle of a sentence. Every marker the narrator
 * and the offline engine can produce is checked here against what the model
 * actually supports, and anything unmapped has to come out silently.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { forEleven } from '../server/src/tts'
import { PERFORMANCE_MARKERS } from '../server/src/prompt'

/** Everything the prompt offers, plus what the offline engine writes itself. */
const ALL_MARKERS = [
  ...PERFORMANCE_MARKERS,
  '[pause]',
  '[long pause]',
  '[softly]',
  '[chuckles]',
]

describe('preparing text for Eleven v3', () => {
  it('never leaves a marker the model would read out loud', () => {
    for (const marker of ALL_MARKERS) {
      const out = forEleven(`Buradasın. ${marker} Seni bekledim.`)
      assert.doesNotMatch(out, /\[(pause|long pause|softly|soft|quietly|chuckles?)\]/i, out)
      // Whatever survives must be a tag the model knows.
      for (const [, tag] of out.matchAll(/\[([a-z ]+)\]/gi)) {
        assert.ok(
          ['exhales', 'sighs', 'whispers', 'laughs', 'gasps'].includes(tag!.toLowerCase()),
          `${marker} became an unsupported tag: [${tag}]`,
        )
      }
    }
  })

  it('keeps the tags the model does perform', () => {
    assert.match(forEleven('Bir. [laughs] İki.'), /\[laughs\]/)
    assert.match(forEleven('Bir. [whispers] İki.'), /\[whispers\]/)
    assert.match(forEleven('Bir. [sighs] İki.'), /\[sighs\]/)
  })

  it('turns a breath into the tag that is actually a breath', () => {
    assert.match(forEleven('Bir. [breathes] İki.'), /\[exhales\]/)
  })

  it('turns a chuckle into a laugh rather than dropping it', () => {
    assert.match(forEleven('Bir. [chuckles] İki.'), /\[laughs\]/)
  })

  it('turns pauses into punctuation, because that is what the model reads', () => {
    assert.match(forEleven('Bir. [pause] İki.'), /…/)
    assert.match(forEleven('Bir. [long pause] İki.'), /…/)
    assert.doesNotMatch(forEleven('Bir. [long pause] İki.'), /long/)
  })

  it('drops a direction it has no tag for, silently', () => {
    const out = forEleven('Bir. [softly] İki.')
    assert.doesNotMatch(out, /softly|\[|\]/)
    assert.match(out, /Bir\./)
    assert.match(out, /İki\./)
  })

  it('drops anything invented, rather than risking it', () => {
    for (const odd of ['[shouting angrily]', '[door slams]', '[in turkish]']) {
      const out = forEleven(`Bir. ${odd} İki.`)
      assert.doesNotMatch(out, /\[|\]/, out)
    }
  })

  it('leaves the words themselves alone', () => {
    const text = 'Ormanın derinliklerindeyim ve sen buradasın.'
    assert.equal(forEleven(text), text)
  })

  it('does not leave a gap where a marker used to be', () => {
    assert.doesNotMatch(forEleven('Bir. [softly] İki.'), / {2,}/)
    assert.doesNotMatch(forEleven('Bir [softly], iki.'), /\s,/)
  })

  it('handles a paragraph that is only markers', () => {
    assert.equal(forEleven('[softly] [quietly]'), '')
  })

  it('is case-insensitive, the way a model writes them', () => {
    assert.match(forEleven('Bir. [LAUGHS] İki.'), /\[laughs\]/)
    assert.match(forEleven('Bir. [Breathes] İki.'), /\[exhales\]/)
  })
})
