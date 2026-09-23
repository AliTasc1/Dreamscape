/**
 * Choosing a narrator, and reading what it says back.
 *
 * Two providers now write these nights and they answer differently. The free
 * one is the one most people will actually be using, so the parts of it that
 * can be checked without a key are: which provider gets picked, how a reply is
 * turned into a plan, and — the one that matters most — that a refusal is
 * recognised as a refusal rather than becoming an empty night.
 */

import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { RefusedError, extractJson, shapePlan, shapeReflection } from '../server/src/shape'
import type { PlanRequest } from '../server/src/contracts'

const REQUEST: PlanRequest = {
  lang: 'tr',
  prompt: 'Ormanın derinliklerindeyim.',
  minutes: 30,
  tone: 'gentle',
  prefs: {
    voice: 'warm',
    mood: 'calm',
    amb: 'forest',
    personality: 'wise',
    style: 'story',
    speed: 'slow',
    intensity: 'soft',
  },
  memory: { themes: [], feelings: [], personas: [], moments: [], nights: 0 },
}

describe('reading a model’s reply', () => {
  it('takes bare JSON', () => {
    assert.deepEqual(extractJson('{"a":1}'), { a: 1 })
  })

  it('takes JSON out of a code fence', () => {
    assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 })
  })

  it('takes JSON out from under a sentence the model added anyway', () => {
    assert.deepEqual(extractJson('Sure, here you go:\n{"a":1}\nHope that helps.'), { a: 1 })
  })

  it('survives braces inside the strings', () => {
    assert.deepEqual(extractJson('{"a":"a } brace","b":2}'), { a: 'a } brace', b: 2 })
  })

  it('survives an escaped quote inside a string', () => {
    assert.deepEqual(extractJson('{"a":"say \\"hi\\""}'), { a: 'say "hi"' })
  })

  it('complains rather than guessing when there is no object', () => {
    assert.throws(() => extractJson('I would rather not.'))
    assert.throws(() => extractJson('{"a": 1'))
  })
})

describe('shaping a plan', () => {
  it('keeps everything a well-formed reply gave it', () => {
    const plan = shapePlan(
      JSON.stringify({
        title: 'Derin Orman',
        scene: 'Çam ağaçlarının altında',
        persona: { who: 'baban', relationship: 'baba', voiceDirection: 'yavaş' },
        arc: ['varış', 'yürüyüş', 'dinlenme'],
        ambience: 'forest',
        openingLine: 'Buradasın.',
        rememberedLine: '',
      }),
      REQUEST,
    )
    assert.equal(plan.title, 'Derin Orman')
    assert.equal(plan.persona.who, 'baban')
    assert.deepEqual(plan.arc, ['varış', 'yürüyüş', 'dinlenme'])
  })

  it('falls back to the prompt when the model forgot a title', () => {
    const plan = shapePlan('{"scene":"bir yer"}', REQUEST)
    assert.equal(plan.title, REQUEST.prompt.slice(0, 40))
  })

  it('falls back to the chosen ambience when the model forgot one', () => {
    assert.equal(shapePlan('{"title":"x"}', REQUEST).ambience, 'forest')
    assert.equal(shapePlan('{"title":"x","ambience":""}', REQUEST).ambience, 'forest')
  })

  it('survives a reply with nothing recognisable in it', () => {
    const plan = shapePlan('{"nonsense":true}', REQUEST)
    assert.equal(typeof plan.title, 'string')
    assert.deepEqual(plan.arc, [])
    assert.equal(plan.persona.who, '')
  })

  it('drops non-strings out of the arc rather than passing them on', () => {
    const plan = shapePlan('{"arc":["bir",2,null,{"x":1},"iki"]}', REQUEST)
    assert.deepEqual(plan.arc, ['bir', 'iki'])
  })

  it('caps an arc long enough to be a prompt of its own', () => {
    const arc = JSON.stringify(Array.from({ length: 500 }, (_, i) => `beat ${i}`))
    assert.equal(shapePlan(`{"arc":${arc}}`, REQUEST).arc.length, 16)
  })
})

describe('shaping a reflection', () => {
  it('keeps a handful of each and no more', () => {
    const many = JSON.stringify(Array.from({ length: 50 }, (_, i) => `x${i}`))
    const reflection = shapeReflection(
      `{"themes":${many},"feelings":${many},"personas":${many},"moments":${many}}`,
    )
    assert.equal(reflection.themes.length, 3)
    assert.equal(reflection.feelings.length, 3)
    assert.equal(reflection.personas.length, 2)
    assert.equal(reflection.moments.length, 2)
  })

  it('returns empty lists rather than failing on an empty reply', () => {
    const reflection = shapeReflection('{}')
    assert.deepEqual(reflection.themes, [])
    assert.deepEqual(reflection.moments, [])
  })
})

describe('a refusal', () => {
  it('carries the reason the model gave', () => {
    const error = new RefusedError('PROHIBITED_CONTENT')
    assert.equal(error.category, 'PROHIBITED_CONTENT')
    assert.equal(error.name, 'RefusedError')
    assert.match(error.message, /PROHIBITED_CONTENT/)
  })

  it('is fine without one', () => {
    assert.equal(new RefusedError(null).category, null)
  })
})

/**
 * The picker reads the environment at call time, so these set it and put it
 * back. Nothing here needs a key: the question is only who would be asked.
 */
describe('picking a provider', () => {
  const saved = { ...process.env }

  afterEach(() => {
    process.env = { ...saved }
  })

  async function provider(env: Record<string, string | undefined>) {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    // Imported fresh each time, because the module reads the environment.
    const path = require.resolve('../server/src/narrator')
    delete require.cache[path]
    return (require('../server/src/narrator') as typeof import('../server/src/narrator')).provider()
  }

  it('writes on the device when nothing is configured', async () => {
    assert.equal(
      await provider({ ANTHROPIC_API_KEY: '', ANTHROPIC_AUTH_TOKEN: '', GEMINI_API_KEY: '', NARRATOR: '' }),
      'none',
    )
  })

  it('uses the free one when it is the only one there', async () => {
    assert.equal(
      await provider({ ANTHROPIC_API_KEY: '', ANTHROPIC_AUTH_TOKEN: '', GEMINI_API_KEY: 'k', NARRATOR: '' }),
      'gemini',
    )
  })

  it('prefers the paid one when both are there, because it was a choice', async () => {
    assert.equal(
      await provider({ ANTHROPIC_API_KEY: 'k', GEMINI_API_KEY: 'k', NARRATOR: '' }),
      'claude',
    )
  })

  it('lets NARRATOR override that', async () => {
    assert.equal(
      await provider({ ANTHROPIC_API_KEY: 'k', GEMINI_API_KEY: 'k', NARRATOR: 'gemini' }),
      'gemini',
    )
  })

  it('ignores NARRATOR when that provider has no key', async () => {
    assert.equal(
      await provider({ ANTHROPIC_API_KEY: 'k', GEMINI_API_KEY: '', NARRATOR: 'gemini' }),
      'claude',
    )
  })
})
