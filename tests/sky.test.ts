/**
 * Open-Meteo is the one outside service Dreamscape calls for itself, and the
 * whole point of it is that a bad answer must never spoil a night. These tests
 * feed `readSky` real response shapes and several broken ones and check that it
 * either returns a reading or returns null — never throws, never half-parses.
 *
 * The network is not touched: `fetch` is replaced for each case, so the suite
 * runs offline and on a plane.
 */

import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { coarsen, describeSky, readSky } from '../app/src/env/sky'

const realFetch = globalThis.fetch

function respondWith(payload: unknown, ok = true): string[] {
  const urls: string[] = []
  globalThis.fetch = (async (input: unknown) => {
    urls.push(String(input))
    return {
      ok,
      json: async () => payload,
    } as Response
  }) as typeof fetch
  return urls
}

/** A response shaped the way Open-Meteo documents it. */
function sample(overrides: Record<string, unknown> = {}) {
  return {
    current: {
      temperature_2m: 12.4,
      weather_code: 61,
      is_day: 0,
      cloud_cover: 88,
      wind_speed_10m: 9.2,
      ...overrides,
    },
    daily: { sunrise: ['2026-09-23T06:58'], sunset: ['2026-09-23T19:12'] },
  }
}

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('coarsen', () => {
  it('rounds a coordinate to about a kilometre', () => {
    assert.equal(coarsen(39.933364), 39.93)
    assert.equal(coarsen(-0.128), -0.13)
    assert.equal(coarsen(0), 0)
  })

  it('never lets a precise coordinate reach the wire', async () => {
    const urls = respondWith(sample())
    await readSky(41.0151234, 28.9795678)
    assert.equal(urls.length, 1)
    assert.match(urls[0]!, /latitude=41\.02&longitude=28\.98/)
    assert.doesNotMatch(urls[0]!, /1234|5678/)
  })
})

describe('readSky', () => {
  it('reads a rainy night', async () => {
    respondWith(sample())
    const sky = await readSky(39.93, 32.86)
    assert.ok(sky)
    assert.equal(sky.weather, 'rain')
    assert.equal(sky.temperature, 12.4)
    assert.equal(sky.cloudCover, 88)
    assert.equal(sky.isDay, false)
    assert.equal(sky.sunset, '2026-09-23T19:12')
    assert.equal(sky.ambience, 'rain')
  })

  it('maps every weather family to an ambience the app actually has', async () => {
    const cases: [number, number, string, string][] = [
      // code, wind, expected weather, expected ambience
      [0, 2, 'clear', 'night'],
      [0, 30, 'clear', 'wind'],
      [3, 2, 'cloudy', 'night'],
      [45, 2, 'fog', 'fireplace'],
      [71, 2, 'snow', 'fireplace'],
      [80, 2, 'rain', 'rain'],
      [95, 2, 'storm', 'rain'],
    ]
    for (const [code, wind, weather, ambience] of cases) {
      respondWith(sample({ weather_code: code, wind_speed_10m: wind, cloud_cover: 10 }))
      const sky = await readSky(0, 0)
      assert.ok(sky, `code ${code} returned nothing`)
      assert.equal(sky.weather, weather, `code ${code}`)
      assert.equal(sky.ambience, ambience, `code ${code}`)
    }
  })

  it('treats a clear code under heavy cloud as cloudy', async () => {
    respondWith(sample({ weather_code: 1, cloud_cover: 90 }))
    const sky = await readSky(0, 0)
    assert.equal(sky?.weather, 'cloudy')
  })

  it('gives up quietly on anything it cannot trust', async () => {
    const broken: unknown[] = [
      null,
      'not json',
      {},
      { current: {} },
      { current: { weather_code: 'rainy' } },
      { current: { weather_code: null } },
    ]
    for (const payload of broken) {
      respondWith(payload)
      assert.equal(await readSky(0, 0), null, `accepted ${JSON.stringify(payload)}`)
    }
  })

  it('gives up on a non-200', async () => {
    respondWith(sample(), false)
    assert.equal(await readSky(0, 0), null)
  })

  it('gives up when the network throws rather than propagating', async () => {
    globalThis.fetch = (async () => {
      throw new Error('offline')
    }) as typeof fetch
    assert.equal(await readSky(0, 0), null)
  })

  it('survives missing optional fields with sane defaults', async () => {
    respondWith({ current: { weather_code: 3 }, daily: {} })
    const sky = await readSky(0, 0)
    assert.ok(sky)
    assert.equal(sky.temperature, 15)
    assert.equal(sky.cloudCover, 0)
    assert.equal(sky.sunrise, null)
    assert.equal(sky.sunset, null)
    assert.equal(sky.isDay, false)
  })
})

describe('describeSky', () => {
  it('gives the narrator one sentence in the listener’s language', async () => {
    respondWith(sample())
    const sky = await readSky(0, 0)
    assert.ok(sky)
    assert.equal(describeSky(sky, 'tr'), 'Dışarıda gerçekten yağmur yağıyor, 12 derece.')
    assert.equal(describeSky(sky, 'en'), 'It is genuinely raining outside, 12 degrees.')
  })

  it('has a line for every weather it can report, in both languages', async () => {
    for (const code of [0, 3, 45, 61, 71, 95]) {
      respondWith(sample({ weather_code: code, cloud_cover: 10 }))
      const sky = await readSky(0, 0)
      assert.ok(sky)
      for (const lang of ['tr', 'en'] as const) {
        const line = describeSky(sky, lang)
        assert.ok(line.length > 10, `${lang}/${code} produced "${line}"`)
        assert.doesNotMatch(line, /undefined|NaN/)
      }
    }
  })
})
