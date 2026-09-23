/**
 * Three deployables, some shared vocabulary.
 *
 * `app/`, `server/` and `mobile/` ship separately, so a few modules exist as
 * deliberate copies rather than as a package nobody wanted to publish. Copies
 * drift silently — a field added on one side, a preference id renamed on
 * another — and the failure shows up as a night that reads wrong on a phone
 * and right in a browser. These tests make the drift loud instead.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'
import * as appOptions from '../app/src/domain/options'
import * as serverOptions from '../server/src/options'
import { DEFAULT_PREFERENCES } from '../app/src/state/preferences'
import { en } from '../app/src/i18n/en'
import { tr } from '../app/src/i18n/tr'

const ROOT = resolve(__dirname, '..', '..', '..')

function read(path: string): string {
  return readFileSync(resolve(ROOT, path), 'utf8')
}

/** The header explains which copy you are looking at; the rest must match. */
function body(path: string): string {
  return read(path).replace(/^\/\*\*[\s\S]*?\*\/\n\n/, '')
}

describe('the copied modules', () => {
  it('keeps the wire contract identical in all three projects', () => {
    const server = body('server/src/contracts.ts')
    assert.equal(body('app/src/ai/contracts.ts'), server)
    assert.equal(body('mobile/src/shared/ai/contracts.ts'), server)
  })

  it('keeps the offline narrator identical between app and mobile', () => {
    assert.equal(read('mobile/src/shared/ai/localEngine.ts'), read('app/src/ai/localEngine.ts'))
  })

  it('keeps the weather reader identical between app and mobile', () => {
    assert.equal(read('mobile/src/shared/env/sky.ts'), read('app/src/env/sky.ts'))
  })

  it('keeps both dictionaries identical between app and mobile', () => {
    assert.equal(read('mobile/src/shared/i18n/en.ts'), read('app/src/i18n/en.ts'))
    assert.equal(read('mobile/src/shared/i18n/tr.ts'), read('app/src/i18n/tr.ts'))
  })

  it('keeps the memory and preference rules identical', () => {
    assert.equal(read('mobile/src/shared/state/memory.ts'), read('app/src/state/memory.ts'))
    assert.equal(
      read('mobile/src/shared/state/preferences.ts'),
      read('app/src/state/preferences.ts'),
    )
  })
})

describe('the shared vocabulary', () => {
  /**
   * The server keeps only the id lists, because it validates against them. If
   * the app ever offers an id the server has not heard of, the server quietly
   * replaces the user's choice with a default — so this has to hold exactly.
   */
  it('gives the server exactly the ids the app offers', () => {
    const lists = [
      'VOICE_IDS',
      'MOOD_IDS',
      'AMBIENCE_IDS',
      'PERSONALITY_IDS',
      'STYLE_IDS',
      'SPEED_IDS',
      'INTENSITY_IDS',
      'TONE_IDS',
    ] as const
    for (const name of lists) {
      assert.deepEqual(
        [...serverOptions[name]],
        [...appOptions[name]],
        `${name} has drifted between app and server`,
      )
    }
  })

  it('has a default preference that is one of the offered ids', () => {
    const defaults = DEFAULT_PREFERENCES as unknown as Record<string, string>
    const byKey: Record<string, readonly string[]> = {
      voice: appOptions.VOICE_IDS,
      mood: appOptions.MOOD_IDS,
      amb: appOptions.AMBIENCE_IDS,
      personality: appOptions.PERSONALITY_IDS,
      style: appOptions.STYLE_IDS,
      speed: appOptions.SPEED_IDS,
      intensity: appOptions.INTENSITY_IDS,
    }
    for (const [key, allowed] of Object.entries(byKey)) {
      assert.ok(allowed.includes(defaults[key]!), `default ${key} is "${defaults[key]}"`)
    }
  })
})

/** Every leaf of the dictionary, as a dotted path. */
function leaves(node: unknown, path = ''): Map<string, unknown> {
  const out = new Map<string, unknown>()
  if (Array.isArray(node)) {
    node.forEach((item, i) => {
      for (const [key, value] of leaves(item, `${path}[${i}]`)) out.set(key, value)
    })
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      for (const [k, v] of leaves(value, path ? `${path}.${key}` : key)) out.set(k, v)
    }
  } else {
    out.set(path, node)
  }
  return out
}

describe('the two languages', () => {
  const english = leaves(en)
  const turkish = leaves(tr)

  it('says the same things in both', () => {
    const missing = [...english.keys()].filter((key) => !turkish.has(key))
    const extra = [...turkish.keys()].filter((key) => !english.has(key))
    assert.deepEqual(missing, [], 'missing from Turkish')
    assert.deepEqual(extra, [], 'only in Turkish')
  })

  it('has a real string everywhere, and is blank only where both are', () => {
    // A few entries are deliberately empty — the onboarding steps that carry
    // no quote. What must never happen is one language filling a slot the
    // other leaves empty, because that is a half-translated screen.
    for (const [key, value] of english) {
      assert.equal(typeof value, 'string', `en.${key} is not a string`)
      assert.equal(typeof turkish.get(key), 'string', `tr.${key} is not a string`)
      assert.equal(
        String(value).trim() === '',
        String(turkish.get(key)).trim() === '',
        `${key} is filled in one language and blank in the other`,
      )
    }
  })

  it('keeps every placeholder the other language uses', () => {
    for (const [key, value] of english) {
      const ours = String(value).match(/\{\w+\}/g) ?? []
      const theirs = String(turkish.get(key) ?? '').match(/\{\w+\}/g) ?? []
      assert.deepEqual([...ours].sort(), [...theirs].sort(), `placeholders differ at ${key}`)
    }
  })

  it('never leaves English text sitting in the Turkish dictionary', () => {
    // A handful of words are the same in both and are not a mistake.
    const shared = new Set(['Premium', 'Dreamscape', 'OK', 'E-mail'])
    let identical = 0
    for (const [key, value] of english) {
      if (shared.has(String(value))) continue
      if (String(value).length < 4) continue
      if (turkish.get(key) === value) identical++
    }
    assert.ok(identical < 25, `${identical} Turkish strings are still the English ones`)
  })
})
