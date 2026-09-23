/**
 * The server's front door.
 *
 * Every one of these cases is something a request could actually carry: a
 * number big enough to write a prompt nobody can afford, a prompt long enough
 * to be the bill on its own, a voice id that is really an attempt to read an
 * environment variable. The validator's job is to turn each of them into a
 * night-shaped request or into a 400, and never into a paid API call.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  BadRequestError,
  narrateRequest,
  planRequest,
  reflectRequest,
  ttsRequest,
} from '../server/src/validate'

const GOOD_PLAN = {
  lang: 'tr',
  prompt: 'Ormanın derinliklerindeyim, babam gibi konuş benimle.',
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
  memory: { themes: ['forest'], feelings: ['tired'], personas: [], moments: [], nights: 3 },
}

describe('planRequest', () => {
  it('passes a real request through unchanged', () => {
    const out = planRequest(GOOD_PLAN)
    assert.equal(out.lang, 'tr')
    assert.equal(out.minutes, 30)
    assert.equal(out.prefs.amb, 'forest')
    assert.equal(out.memory.nights, 3)
    assert.equal(out.sky, undefined)
  })

  it('clamps a length nobody could listen to', () => {
    assert.equal(planRequest({ ...GOOD_PLAN, minutes: 100_000 }).minutes, 120)
    assert.equal(planRequest({ ...GOOD_PLAN, minutes: -5 }).minutes, 1)
    assert.equal(planRequest({ ...GOOD_PLAN, minutes: 12.7 }).minutes, 13)
  })

  it('refuses a length that is not a number at all', () => {
    assert.throws(() => planRequest({ ...GOOD_PLAN, minutes: 'lots' }), BadRequestError)
    assert.throws(() => planRequest({ ...GOOD_PLAN, minutes: NaN }), BadRequestError)
    assert.throws(() => planRequest({ ...GOOD_PLAN, minutes: Infinity }), BadRequestError)
  })

  it('truncates a prompt long enough to be the bill', () => {
    const out = planRequest({ ...GOOD_PLAN, prompt: 'a'.repeat(500_000) })
    assert.equal(out.prompt.length, 4_000)
  })

  it('refuses an empty or missing prompt', () => {
    assert.throws(() => planRequest({ ...GOOD_PLAN, prompt: '   ' }), BadRequestError)
    assert.throws(() => planRequest({ ...GOOD_PLAN, prompt: undefined }), BadRequestError)
    assert.throws(() => planRequest({ ...GOOD_PLAN, prompt: { evil: true } }), BadRequestError)
  })

  it('refuses a body that is not an object', () => {
    for (const body of [null, undefined, 'string', 42, []]) {
      assert.throws(() => planRequest(body), BadRequestError, `accepted ${JSON.stringify(body)}`)
    }
  })

  it('strips control characters that could forge log lines or headers', () => {
    const out = planRequest({ ...GOOD_PLAN, prompt: 'hello\u0000\u0007\u001bworld' })
    assert.equal(out.prompt, 'helloworld')
    assert.doesNotMatch(out.prompt, /[\u0000-\u001f]/)
  })

  it('keeps newlines, because a prompt is allowed to have paragraphs', () => {
    const out = planRequest({ ...GOOD_PLAN, prompt: 'line one\nline two' })
    assert.equal(out.prompt, 'line one\nline two')
  })

  it('narrows every preference to an id the app actually offers', () => {
    const out = planRequest({
      ...GOOD_PLAN,
      prefs: {
        voice: 'API_KEY',
        mood: '../../etc/passwd',
        amb: 'DROP TABLE',
        personality: 42,
        style: null,
        speed: 'instant',
        intensity: {},
      },
    })
    assert.deepEqual(out.prefs, {
      voice: 'warm',
      mood: 'calm',
      amb: 'rain',
      personality: 'gentle',
      style: 'story',
      speed: 'slow',
      intensity: 'soft',
    })
  })

  it('caps memory so a forged profile cannot become the prompt', () => {
    const out = planRequest({
      ...GOOD_PLAN,
      memory: {
        themes: Array.from({ length: 10_000 }, (_, i) => `theme ${i}`),
        feelings: Array.from({ length: 10_000 }, () => 'x'.repeat(10_000)),
        personas: 'not an array',
        moments: Array.from({ length: 10_000 }, () => ({ text: 'a', at: 'b' })),
        nights: 1e12,
      },
    })
    assert.equal(out.memory.themes.length, 40)
    assert.equal(out.memory.feelings.length, 40)
    assert.ok(out.memory.feelings[0]!.length <= 600)
    assert.deepEqual(out.memory.personas, [])
    assert.equal(out.memory.moments.length, 40)
    assert.equal(out.memory.nights, 100_000)
  })

  it('drops non-strings mixed into memory lists', () => {
    const out = planRequest({
      ...GOOD_PLAN,
      memory: { ...GOOD_PLAN.memory, themes: ['ok', null, 7, {}, 'also ok'] },
    })
    assert.deepEqual(out.memory.themes, ['ok', 'also ok'])
  })

  it('falls back to English for an unknown language rather than failing', () => {
    assert.equal(planRequest({ ...GOOD_PLAN, lang: 'de' }).lang, 'en')
    assert.equal(planRequest({ ...GOOD_PLAN, lang: null }).lang, 'en')
    assert.equal(planRequest({ ...GOOD_PLAN, lang: 'tr' }).lang, 'tr')
  })

  it('falls back to the gentlest tone for anything unrecognised', () => {
    assert.equal(planRequest({ ...GOOD_PLAN, tone: 'explicit' }).tone, 'gentle')
    assert.equal(planRequest({ ...GOOD_PLAN, tone: 'mature' }).tone, 'mature')
  })

  it('truncates the weather line', () => {
    const out = planRequest({ ...GOOD_PLAN, sky: 'r'.repeat(5_000) })
    assert.equal(out.sky?.length, 300)
    assert.equal(planRequest({ ...GOOD_PLAN, sky: '  ' }).sky, undefined)
  })
})

const GOOD_NARRATE = {
  ...GOOD_PLAN,
  plan: {
    title: 'Derin Orman',
    scene: 'Çam ağaçlarının altında',
    persona: { who: 'baban', relationship: 'baba', voiceDirection: 'yavaş' },
    arc: ['varış', 'yürüyüş', 'dinlenme'],
    ambience: 'forest',
    openingLine: 'Buradasın.',
    rememberedLine: '',
  },
  segment: 0,
  segments: 6,
  soFar: '',
}

describe('narrateRequest', () => {
  it('passes a real request through', () => {
    const out = narrateRequest(GOOD_NARRATE)
    assert.equal(out.segment, 0)
    assert.equal(out.segments, 6)
    assert.equal(out.plan.arc.length, 3)
    assert.equal(out.userSaid, undefined)
  })

  it('never lets the segment run past the end of the night', () => {
    assert.equal(narrateRequest({ ...GOOD_NARRATE, segment: 9_999 }).segment, 5)
    assert.equal(narrateRequest({ ...GOOD_NARRATE, segment: -3 }).segment, 0)
  })

  it('caps the number of segments', () => {
    assert.equal(narrateRequest({ ...GOOD_NARRATE, segments: 1e9 }).segments, 120)
    assert.equal(narrateRequest({ ...GOOD_NARRATE, segments: 0 }).segments, 1)
  })

  it('caps an arc long enough to be its own prompt', () => {
    const out = narrateRequest({
      ...GOOD_NARRATE,
      plan: { ...GOOD_NARRATE.plan, arc: Array.from({ length: 5_000 }, () => 'beat') },
    })
    assert.equal(out.plan.arc.length, 40)
  })

  it('truncates the running summary and what the listener said', () => {
    const out = narrateRequest({
      ...GOOD_NARRATE,
      soFar: 's'.repeat(1_000_000),
      userSaid: 'u'.repeat(1_000_000),
    })
    assert.equal(out.soFar.length, 20_000)
    assert.equal(out.userSaid?.length, 1_000)
  })

  it('refuses a missing or malformed plan', () => {
    assert.throws(() => narrateRequest({ ...GOOD_NARRATE, plan: null }), BadRequestError)
    assert.throws(() => narrateRequest({ ...GOOD_NARRATE, plan: 'forest' }), BadRequestError)
    assert.throws(() => narrateRequest({ ...GOOD_NARRATE, plan: [] }), BadRequestError)
  })

  it('survives a plan with every field missing', () => {
    const out = narrateRequest({ ...GOOD_NARRATE, plan: {} })
    assert.equal(out.plan.title, '')
    assert.deepEqual(out.plan.arc, [])
    assert.equal(out.plan.ambience, 'none')
  })

  it('narrows the ambience the plan claims', () => {
    const out = narrateRequest({
      ...GOOD_NARRATE,
      plan: { ...GOOD_NARRATE.plan, ambience: '../../../etc/passwd' },
    })
    assert.equal(out.plan.ambience, 'none')
  })
})

describe('reflectRequest', () => {
  it('accepts a null plan, because a night can end before one exists', () => {
    const out = reflectRequest({ lang: 'en', prompt: 'a forest', plan: null, transcript: '', memory: {} })
    assert.equal(out.plan, null)
    assert.equal(out.memory.nights, 0)
  })

  it('truncates a transcript', () => {
    const out = reflectRequest({ lang: 'en', prompt: 'x', plan: null, transcript: 't'.repeat(1e6), memory: {} })
    assert.equal(out.transcript.length, 60_000)
  })
})

describe('ttsRequest', () => {
  it('passes real text through', () => {
    const out = ttsRequest({ text: 'Buradasın.', lang: 'tr', voice: 'female', intensity: 'whisper', speed: 'slow', tone: 'gentle' })
    assert.equal(out.text, 'Buradasın.')
    assert.equal(out.voice, 'female')
  })

  it('refuses empty text rather than paying for silence', () => {
    assert.throws(() => ttsRequest({ text: '', lang: 'en' }), BadRequestError)
    assert.throws(() => ttsRequest({ text: '\u0000\u0007', lang: 'en' }), BadRequestError)
  })

  it('truncates text so one request cannot buy an audiobook', () => {
    const out = ttsRequest({ text: 'a'.repeat(1e6), lang: 'en' })
    assert.equal(out.text.length, 5_000)
  })

  /**
   * The voice id is interpolated into an environment variable name downstream
   * (`ELEVENLABS_VOICE_${voice.toUpperCase()}`). Narrowing it to the known ids
   * is what keeps a request from choosing which variable gets read.
   */
  it('never lets a caller choose which environment variable is read', () => {
    for (const attempt of ['API_KEY', 'ID', '', '__proto__', 'warm ', 7, null]) {
      const out = ttsRequest({ text: 'hello', lang: 'en', voice: attempt })
      assert.ok(
        ['female', 'male', 'neutral', 'warm', 'deep', 'whisper'].includes(out.voice),
        `voice ${JSON.stringify(attempt)} became ${out.voice}`,
      )
    }
  })
})
