/**
 * The real sky, from Open-Meteo.
 *
 * Free, no key, no account, no rate limit worth worrying about, and CORS-open
 * so it works from a browser and from a phone alike. It tells the night what
 * the weather actually is where the listener is lying, so "it is raining" is
 * true rather than decorative, and when the sun set so the companion can know
 * how late it is.
 *
 * Everything here is optional. No location, no network, a bad response — the
 * night is written exactly as before.
 *
 * https://open-meteo.com/ — non-commercial use is free; see their terms
 * before shipping this commercially.
 */

import type { AmbienceId } from '../domain/options'

const FORECAST = 'https://api.open-meteo.com/v1/forecast'

/** WMO weather codes, grouped into what they sound like. */
const RAIN = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82])
const STORM = new Set([95, 96, 99])
const SNOW = new Set([71, 73, 75, 77, 85, 86])
const FOG = new Set([45, 48])
const CLEAR = new Set([0, 1])

export interface SkyReading {
  /** True weather in one word, for the narrator to use or ignore. */
  weather: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog'
  temperature: number
  /** 0–100. */
  cloudCover: number
  windSpeed: number
  /** Local ISO times, or null when the sun does not set today. */
  sunrise: string | null
  sunset: string | null
  /** True when the listener is somewhere it is still daylight. */
  isDay: boolean
  /** What this sky suggests playing underneath. */
  ambience: AmbienceId
}

function weatherFrom(code: number, cloudCover: number): SkyReading['weather'] {
  if (STORM.has(code)) return 'storm'
  if (RAIN.has(code)) return 'rain'
  if (SNOW.has(code)) return 'snow'
  if (FOG.has(code)) return 'fog'
  if (CLEAR.has(code) && cloudCover < 40) return 'clear'
  return 'cloudy'
}

function ambienceFor(weather: SkyReading['weather'], windSpeed: number): AmbienceId {
  switch (weather) {
    case 'rain':
    case 'storm':
      return 'rain'
    case 'snow':
    case 'fog':
      return 'fireplace'
    case 'clear':
      return windSpeed > 20 ? 'wind' : 'night'
    default:
      return windSpeed > 25 ? 'wind' : 'night'
  }
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function isoOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length >= 10 ? value : null
}

/**
 * Coordinates are rounded to two decimals — roughly a kilometre — before they
 * leave the device. The weather is the same across a town, and nobody needs to
 * know which building.
 */
export function coarsen(value: number): number {
  return Math.round(value * 100) / 100
}

export async function readSky(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<SkyReading | null> {
  const url =
    `${FORECAST}?latitude=${coarsen(latitude)}&longitude=${coarsen(longitude)}` +
    '&current=temperature_2m,weather_code,is_day,cloud_cover,wind_speed_10m' +
    '&daily=sunrise,sunset&timezone=auto&forecast_days=1'

  let payload: unknown
  try {
    const response = await fetch(url, { signal })
    if (!response.ok) return null
    payload = await response.json()
  } catch {
    return null
  }

  if (!payload || typeof payload !== 'object') return null
  const body = payload as Record<string, unknown>
  const current = (body.current ?? {}) as Record<string, unknown>
  const daily = (body.daily ?? {}) as Record<string, unknown>

  // A response without a weather code is not a reading, whatever else it has.
  if (typeof current.weather_code !== 'number') return null

  const cloudCover = num(current.cloud_cover, 0)
  const windSpeed = num(current.wind_speed_10m, 0)
  const weather = weatherFrom(current.weather_code, cloudCover)

  return {
    weather,
    temperature: num(current.temperature_2m, 15),
    cloudCover,
    windSpeed,
    sunrise: isoOrNull((daily.sunrise as unknown[] | undefined)?.[0]),
    sunset: isoOrNull((daily.sunset as unknown[] | undefined)?.[0]),
    isDay: current.is_day === 1,
    ambience: ambienceFor(weather, windSpeed),
  }
}

/** One line for the narrator, in the listener's language. */
export function describeSky(sky: SkyReading, lang: 'tr' | 'en'): string {
  const c = Math.round(sky.temperature)
  const tr: Record<SkyReading['weather'], string> = {
    clear: `Dışarısı açık ve ${c} derece.`,
    cloudy: `Dışarısı bulutlu, ${c} derece.`,
    rain: `Dışarıda gerçekten yağmur yağıyor, ${c} derece.`,
    storm: `Dışarıda fırtına var, ${c} derece.`,
    snow: `Dışarıda kar yağıyor, ${c} derece.`,
    fog: `Dışarısı sisli, ${c} derece.`,
  }
  const en: Record<SkyReading['weather'], string> = {
    clear: `Outside it is clear and ${c} degrees.`,
    cloudy: `Outside it is overcast, ${c} degrees.`,
    rain: `It is genuinely raining outside, ${c} degrees.`,
    storm: `There is a storm outside, ${c} degrees.`,
    snow: `It is snowing outside, ${c} degrees.`,
    fog: `It is foggy outside, ${c} degrees.`,
  }
  return (lang === 'tr' ? tr : en)[sky.weather]
}
