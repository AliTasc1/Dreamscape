/**
 * Where the voice stops.
 *
 * A device text-to-speech engine handed a whole paragraph reads it as one
 * breathless run, which is most of why it sounds like a machine. Handed a
 * sentence at a time with real silence between, the same engine sounds like
 * someone speaking slowly — and slowly is most of what "calm" is.
 *
 * The performance markers the narrator writes become those silences. A device
 * engine cannot laugh or take a breath; what it can do is stop where a person
 * would have. Leaving "[laughs]" in the text would only have it read the word
 * out loud, which is worse than saying nothing.
 *
 * Pure text in, plan out. No platform, so `tests/pacing.test.ts` can check it.
 */

const MARKER = /\[([a-z ]+)\]/gi

export function stripMarkers(text: string): string {
  return text
    .replace(MARKER, (_m, name: string) =>
      name.trim().toLowerCase().includes('pause') ? '…' : '',
    )
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.!?…])/g, '$1')
    .trim()
}

interface Segment {
  /** Words to speak, or empty for a silence. */
  text: string
  /** Silence after this segment, in milliseconds. */
  restMs: number
}

/** How long each marker is worth as silence, since none of them can be acted. */
function restForMarker(name: string): number {
  const marker = name.trim().toLowerCase()
  if (marker.includes('breath') || marker.includes('sigh')) return 900
  if (marker.includes('pause')) return 700
  if (marker.includes('laugh') || marker.includes('chuckle') || marker.includes('smile')) return 450
  if (marker.includes('whisper')) return 300
  return 250
}

/** How long to rest after a sentence, by how it ended. */
function restForEnding(text: string, speed: string): number {
  const stretch = speed === 'verySlow' ? 1.5 : speed === 'slow' ? 1.2 : 1
  const last = text.trim().slice(-1)
  if (last === '?' || last === '!') return 620 * stretch
  if (last === ',' || last === ';' || last === ':') return 260 * stretch
  if (last === '…') return 850 * stretch
  return 520 * stretch
}

/**
 * Breaks a paragraph into what the voice should say and where it should stop.
 *
 * Markers become silence in the place they were written. Everything else is
 * split at sentence ends, because that is where a person would breathe.
 */
export function segment(paragraph: string, speed: string): Segment[] {
  const out: Segment[] = []
  const pieces = paragraph.split(/(\[[a-z ]+\])/gi)

  for (const piece of pieces) {
    const marker = piece.match(/^\[([a-z ]+)\]$/i)
    if (marker) {
      const rest = restForMarker(marker[1]!)
      const previous = out[out.length - 1]
      if (previous) previous.restMs = Math.max(previous.restMs, rest)
      else out.push({ text: '', restMs: rest })
      continue
    }

    const clean = piece.replace(/\s+/g, ' ').trim()
    if (!clean) continue
    // Split after . ! ? … when a space follows, keeping the punctuation.
    for (const raw of clean.split(/(?<=[.!?…])\s+/)) {
      const sentence = raw.trim()
      if (sentence) out.push({ text: sentence, restMs: restForEnding(sentence, speed) })
    }
  }

  // No need to sit in silence at the very end; the next paragraph is coming.
  const last = out[out.length - 1]
  if (last) last.restMs = Math.min(last.restMs, 350)
  return out
}

