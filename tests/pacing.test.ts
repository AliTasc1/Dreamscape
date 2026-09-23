/**
 * Where the voice stops.
 *
 * A device engine handed a whole paragraph reads it as one run, which is most
 * of why it sounds like a machine. Handed a sentence at a time with silence in
 * between, the same engine sounds like someone speaking slowly. This is the
 * part of that which can be checked without ears: that the paragraph is cut in
 * the right places, that the markers become silence rather than words, and
 * that nothing the listener wrote can end up spoken as "[laughs]".
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { segment } from '../mobile/src/shared/audio/pacing'

const spoken = (paragraph: string, speed = 'slow') =>
  segment(paragraph, speed).map((part) => part.text).filter(Boolean)

describe('breaking a paragraph up', () => {
  it('gives each sentence its own breath', () => {
    const parts = spoken('Buradasın. Ağaçlar yüksek. Kimse seni aramıyor.')
    assert.deepEqual(parts, ['Buradasın.', 'Ağaçlar yüksek.', 'Kimse seni aramıyor.'])
  })

  it('keeps the punctuation with the sentence it belongs to', () => {
    for (const part of spoken('Duydun mu? Evet! Hadi…')) {
      assert.match(part, /[?!…]$/)
    }
  })

  it('does not split on a decimal or an abbreviation mid-sentence', () => {
    // The split only fires when whitespace follows, so "3.5" stays whole.
    assert.deepEqual(spoken('Hava 3.5 derece.'), ['Hava 3.5 derece.'])
  })

  it('rests longer after a question than after a comma', () => {
    const question = segment('Duydun mu?', 'slow')[0]!
    const clause = segment('Duydun mu,', 'slow')[0]!
    assert.ok(question.restMs > clause.restMs)
  })

  it('rests longer when the listener chose a slower voice', () => {
    const slow = segment('Buradasın. Ve buradayım.', 'verySlow')[0]!
    const normal = segment('Buradasın. Ve buradayım.', 'normal')[0]!
    assert.ok(slow.restMs > normal.restMs)
  })

  it('does not leave a long silence hanging at the end', () => {
    const parts = segment('Buradasın. Uyu artık…', 'verySlow')
    assert.ok(parts[parts.length - 1]!.restMs <= 350)
  })
})

describe('the markers', () => {
  it('never speaks one out loud', () => {
    const text = 'Buradasın. [breathes] Seni bekledim. [laughs] Gel bakalım.'
    for (const part of spoken(text)) {
      assert.doesNotMatch(part, /\[|\]/, `"${part}" still has a marker in it`)
      assert.doesNotMatch(part, /breathes|laughs/i, `"${part}" says the marker`)
    }
  })

  it('turns a breath into the longest silence', () => {
    const [first] = segment('Buradasın. [breathes] Seni bekledim.', 'slow')
    const plain = segment('Buradasın. Seni bekledim.', 'slow')[0]!
    assert.ok(first!.restMs > plain.restMs, 'a breath did not lengthen the pause')
    assert.ok(first!.restMs >= 900)
  })

  it('ranks the silences the way the words would be performed', () => {
    // After a comma the natural rest is short, so the marker decides.
    const rest = (marker: string) => segment(`Bir, [${marker}] iki.`, 'slow')[0]!.restMs
    assert.ok(rest('breathes') > rest('pause'), 'a breath is not longer than a pause')
    assert.ok(rest('pause') > rest('laughs'), 'a pause is not longer than a laugh')
  })

  it('never makes a natural pause shorter than it would have been', () => {
    // A full stop already earns a real rest; a short marker must not eat it.
    const plain = segment('Bir. İki.', 'slow')[0]!.restMs
    for (const marker of ['whispers', 'laughs', 'smiles', 'nods']) {
      const withMarker = segment(`Bir. [${marker}] İki.`, 'slow')[0]!.restMs
      assert.ok(withMarker >= plain, `[${marker}] shortened the pause to ${withMarker}`)
    }
  })

  it('handles a paragraph that is only a marker', () => {
    const parts = segment('[pause]', 'slow')
    assert.equal(parts.length, 1)
    assert.equal(parts[0]!.text, '')
    assert.ok(parts[0]!.restMs > 0)
  })

  it('handles an empty paragraph without inventing one', () => {
    assert.deepEqual(segment('', 'slow'), [])
    assert.deepEqual(segment('   \n  ', 'slow'), [])
  })

  it('survives a marker written the way a person would write it', () => {
    for (const text of ['[BREATHES]', '[ pause ]', '[Long Pause]']) {
      const parts = segment(`Bir. ${text} İki.`, 'slow')
      for (const part of parts) assert.doesNotMatch(part.text, /\[/)
    }
  })
})

describe('what the listener typed', () => {
  it('cannot smuggle a spoken bracket through a reply', () => {
    // Their words come back inside the narration; a marker they typed should
    // be treated as a marker, never read aloud as text.
    const parts = spoken('"[laughs] beni güldürdün" diyorsun. Sonra sessizlik.')
    for (const part of parts) assert.doesNotMatch(part, /laughs/i)
  })

  it('leaves ordinary brackets in numbers and names alone', () => {
    // Only lowercase words in brackets are markers; anything else is text.
    const parts = spoken('Saat [21:40] oldu.')
    assert.ok(parts.join(' ').includes('21:40'), parts.join(' '))
  })
})
