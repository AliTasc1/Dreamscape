/**
 * The night that runs with no keys at all.
 *
 * This is the app's floor: no Anthropic key, no ElevenLabs key, no network.
 * The phone's own voice reads what this module writes. It is the only path
 * every user is guaranteed to get, so it is the one that must never produce
 * an empty paragraph, an English line for a Turkish listener, or a night
 * that ends before the clock does.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { localNarrate, localPlan, localReflect, read } from '../app/src/ai/localEngine'
import { EMPTY_MEMORY } from '../app/src/ai/contracts'
import { DEFAULT_PREFERENCES } from '../app/src/state/preferences'
import type { LanguageId, PlanRequest } from '../app/src/ai/contracts'

function planRequest(prompt: string, lang: LanguageId = 'tr', minutes = 30): PlanRequest {
  return {
    lang,
    prompt,
    minutes,
    tone: 'gentle',
    prefs: DEFAULT_PREFERENCES,
    memory: EMPTY_MEMORY,
  }
}

/** The listener's own example, word for word. */
const FOREST =
  'Ormanın derinliklerindeyim, babam gibi konuşup öğüt veriyorsun ve beni sakinleştiriyorsun.'

describe('reading the prompt', () => {
  it('finds the place and the person in the listener’s own words', () => {
    const reading = read(FOREST, 'none')
    assert.equal(reading.scene, 'forest')
    assert.equal(reading.persona, 'father')
  })

  it('reads English the same way', () => {
    const reading = read('I am deep in the forest and you speak to me like my father', 'none')
    assert.equal(reading.scene, 'forest')
    assert.equal(reading.persona, 'father')
  })

  it('finds each place it knows', () => {
    const cases: [string, string][] = [
      ['deniz kenarındayım', 'beach'],
      ['dağın zirvesinde', 'mountain'],
      ['tokyo sokaklarında', 'city'],
      ['uzayda, yıldızların arasında', 'space'],
      ['şöminenin yanındaki kulübede', 'cabin'],
      ['kendi odamda, yatağımda', 'room'],
    ]
    for (const [prompt, scene] of cases) {
      assert.equal(read(prompt, 'none').scene, scene, prompt)
    }
  })

  it('still answers when the prompt says nothing it recognises', () => {
    const reading = read('qqq zzz', 'none')
    assert.ok(reading.scene)
    assert.ok(reading.persona)
    assert.ok(reading.feeling)
  })

  it('honours the chosen ambience over the one the prompt suggests', () => {
    assert.equal(read(FOREST, 'rain').ambience, 'rain')
  })
})

describe('the plan', () => {
  it('becomes who the listener asked for, in their language', () => {
    const plan = localPlan(planRequest(FOREST))
    assert.ok(plan.title)
    assert.ok(plan.scene)
    assert.ok(plan.persona.who)
    assert.ok(plan.openingLine)
    assert.doesNotMatch(plan.persona.who, /^your /, 'Turkish listener got an English persona')
  })

  it('gives a longer night more beats', () => {
    assert.ok(localPlan(planRequest(FOREST, 'tr', 60)).arc.length >
      localPlan(planRequest(FOREST, 'tr', 10)).arc.length)
  })

  it('never returns fewer than three beats, however short the night', () => {
    assert.ok(localPlan(planRequest(FOREST, 'tr', 1)).arc.length >= 3)
  })

  it('writes in English for an English listener', () => {
    const plan = localPlan(planRequest('I am deep in a forest, speak to me like my father', 'en'))
    assert.ok(plan.openingLine)
    assert.doesNotMatch(plan.openingLine, /[şğıçöü]/i, 'English listener got Turkish')
  })

  it('calls back to something remembered when there is something to remember', () => {
    const withMemory = localPlan({
      ...planRequest(FOREST),
      memory: {
        ...EMPTY_MEMORY,
        moments: [{ text: 'babamı özlüyorum', at: '2026-09-01' }],
        nights: 4,
      },
    })
    assert.match(withMemory.rememberedLine, /babamı özlüyorum/)
    assert.equal(localPlan(planRequest(FOREST)).rememberedLine, '')
  })
})

describe('the narration', () => {
  const plan = localPlan(planRequest(FOREST))
  const base = {
    ...planRequest(FOREST),
    plan,
    segment: 0,
    segments: 6,
    soFar: '',
  }

  it('opens with the line the plan promised', () => {
    const text = localNarrate(base)
    assert.ok(text.startsWith(plan.openingLine), text.slice(0, 80))
  })

  it('writes every segment of a long night without running dry', () => {
    for (let segment = 0; segment < 6; segment++) {
      const text = localNarrate({ ...base, segment })
      const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim())
      assert.ok(paragraphs.length >= 3, `segment ${segment} produced ${paragraphs.length}`)
      for (const paragraph of paragraphs) {
        assert.notEqual(paragraph.trim(), '', `segment ${segment} had a blank paragraph`)
        assert.doesNotMatch(paragraph, /undefined|\[object/, `segment ${segment}: ${paragraph}`)
      }
    }
  })

  it('answers the listener inside the dream when they speak', () => {
    const text = localNarrate({ ...base, segment: 2, userSaid: 'korkuyorum' })
    assert.match(text, /korkuyorum/)
  })

  it('works the real weather in once, near the start', () => {
    const line = 'Dışarıda gerçekten yağmur yağıyor, 12 derece.'
    assert.match(localNarrate({ ...base, sky: line }), new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    // Not repeated every segment — it is a detail, not a refrain.
    assert.doesNotMatch(localNarrate({ ...base, segment: 3, sky: line }), /derece/)
  })

  it('brings the last segment to a stop', () => {
    const last = localNarrate({ ...base, segment: 5 })
    const first = localNarrate({ ...base, segment: 0 })
    assert.notEqual(last, first)
    assert.ok(last.trim().length > 0)
  })
})

describe('what a night teaches it', () => {
  it('learns from the listener’s own words', () => {
    const prompt = 'Ormandayım ve çok yorgunum, babam gibi konuş benimle.'
    const reflection = localReflect({
      lang: 'tr',
      prompt,
      plan: localPlan(planRequest(prompt)),
      transcript: 'bir şeyler',
      memory: EMPTY_MEMORY,
    })
    assert.ok(reflection.themes.length > 0)
    assert.ok(reflection.feelings.length > 0, 'a tired listener left no feeling behind')
    assert.ok(reflection.personas.length > 0)
    assert.match(reflection.moments[0] ?? '', /yorgun/)
    for (const list of [reflection.themes, reflection.feelings, reflection.personas]) {
      for (const entry of list) assert.notEqual(entry.trim(), '')
    }
  })

  /**
   * Calm is not something to carry into the next night. The companion
   * remembers what the listener was struggling with, not that they were fine.
   */
  it('remembers nothing when there was nothing to carry', () => {
    const reflection = localReflect({
      lang: 'tr',
      prompt: FOREST,
      plan: localPlan(planRequest(FOREST)),
      transcript: '',
      memory: EMPTY_MEMORY,
    })
    assert.deepEqual(reflection.feelings, [])
    assert.ok(reflection.themes.length > 0)
  })

  it('does not fall over on an empty night', () => {
    const reflection = localReflect({
      lang: 'en',
      prompt: '',
      plan: null,
      transcript: '',
      memory: EMPTY_MEMORY,
    })
    assert.ok(Array.isArray(reflection.themes))
    assert.ok(Array.isArray(reflection.moments))
  })
})
