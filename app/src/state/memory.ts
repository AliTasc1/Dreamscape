import type { MemorySnapshot, Reflection } from '../ai/contracts'

/**
 * The companion's memory of one listener.
 *
 * It only ever holds short, human-readable lines — nothing encoded, nothing
 * the person could not read back and delete. Everything lives on the device.
 */

const LIMITS = { themes: 8, feelings: 8, personas: 6, moments: 12 } as const

/** Case- and accent-tolerant comparison, so "Orman" and "orman" are one thing. */
function normalise(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .trim()
}

function mergeList(existing: string[], incoming: string[], limit: number): string[] {
  const seen = new Set(existing.map(normalise))
  const merged = [...existing]
  for (const entry of incoming) {
    const clean = entry.trim()
    if (!clean) continue
    const key = normalise(clean)
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(clean)
  }
  // Newest wins when the list is full: the listener changes over time.
  return merged.slice(-limit)
}

export function rememberNight(
  memory: MemorySnapshot,
  reflection: Reflection,
  at: string,
): MemorySnapshot {
  return {
    themes: mergeList(memory.themes, reflection.themes, LIMITS.themes),
    feelings: mergeList(memory.feelings, reflection.feelings, LIMITS.feelings),
    personas: mergeList(memory.personas, reflection.personas, LIMITS.personas),
    moments: [
      ...memory.moments,
      ...reflection.moments
        .map((text) => text.trim())
        .filter(Boolean)
        .filter((text) => !memory.moments.some((m) => normalise(m.text) === normalise(text)))
        .map((text) => ({ text, at })),
    ].slice(-LIMITS.moments),
    nights: memory.nights + 1,
  }
}

export type MemoryBucket = 'themes' | 'feelings' | 'personas' | 'moments'

/** Removes a single remembered thing, by its text. */
export function forget(
  memory: MemorySnapshot,
  bucket: MemoryBucket,
  text: string,
): MemorySnapshot {
  if (bucket === 'moments') {
    return { ...memory, moments: memory.moments.filter((m) => m.text !== text) }
  }
  return { ...memory, [bucket]: memory[bucket].filter((entry) => entry !== text) }
}

export function isMemoryEmpty(memory: MemorySnapshot): boolean {
  return (
    memory.themes.length === 0 &&
    memory.feelings.length === 0 &&
    memory.personas.length === 0 &&
    memory.moments.length === 0
  )
}

/** The one line Create shows to prove the companion was listening. */
export function latestCallback(memory: MemorySnapshot): string | null {
  const moment = memory.moments[memory.moments.length - 1]
  if (moment) return moment.text
  return memory.themes[memory.themes.length - 1] ?? null
}
