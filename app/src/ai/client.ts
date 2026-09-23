import type {
  Capabilities,
  NarrateEvent,
  NarrateRequest,
  PlanRequest,
  Reflection,
  ReflectRequest,
  SessionPlan,
} from './contracts'
import { localNarrate, localPlan, localReflect } from './localEngine'

/**
 * Talks to the narrator service, and quietly writes the night itself when
 * there isn't one. Nothing above this module needs to know which happened.
 */

const BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

export const OFFLINE: Capabilities = { narrator: 'none', voice: 'none', model: null }

function url(path: string): string {
  return `${BASE}${path}`
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) throw new Error(`${path} failed: ${response.status}`)
  return (await response.json()) as T
}

/** A server's answer is not trusted any more than a client's request is. */
function readCapabilities(payload: unknown): Capabilities {
  if (!payload || typeof payload !== 'object') return OFFLINE
  const raw = payload as Record<string, unknown>
  return {
    narrator: raw.narrator === 'claude' ? 'claude' : 'none',
    voice: raw.voice === 'elevenlabs' ? 'elevenlabs' : raw.voice === 'openai' ? 'openai' : 'none',
    model: typeof raw.model === 'string' ? raw.model.slice(0, 80) : null,
  }
}

export async function fetchCapabilities(): Promise<Capabilities> {
  try {
    const response = await fetch(url('/api/capabilities'), {
      signal: AbortSignal.timeout(4000),
    })
    if (!response.ok) return OFFLINE
    return readCapabilities(await response.json())
  } catch {
    return OFFLINE
  }
}

export async function plan(req: PlanRequest, caps: Capabilities): Promise<SessionPlan> {
  if (caps.narrator !== 'claude') return localPlan(req)
  try {
    return await postJson<SessionPlan>('/api/plan', req)
  } catch {
    return localPlan(req)
  }
}

export async function reflect(req: ReflectRequest, caps: Capabilities): Promise<Reflection> {
  if (caps.narrator !== 'claude') return localReflect(req)
  try {
    return await postJson<Reflection>('/api/reflect', req)
  } catch {
    return localReflect(req)
  }
}

/** Delivers one segment, piece by piece, however it was written. */
export async function narrate(
  req: NarrateRequest,
  caps: Capabilities,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (caps.narrator !== 'claude') {
    await streamLocally(localNarrate(req), onDelta, signal)
    return
  }

  let response: Response
  try {
    response = await fetch(url('/api/narrate'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    })
  } catch {
    await streamLocally(localNarrate(req), onDelta, signal)
    return
  }

  if (!response.ok || !response.body) {
    await streamLocally(localNarrate(req), onDelta, signal)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let received = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE frames are separated by a blank line.
    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      boundary = buffer.indexOf('\n\n')

      const line = frame.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      let event: NarrateEvent
      try {
        event = JSON.parse(line.slice(5).trim()) as NarrateEvent
      } catch {
        continue
      }
      if (event.type === 'delta') {
        received = true
        onDelta(event.text)
      } else if (event.type === 'error' && !received) {
        await streamLocally(localNarrate(req), onDelta, signal)
        return
      }
    }
  }

  if (!received) await streamLocally(localNarrate(req), onDelta, signal)
}

/** Paces locally written text so it arrives like a stream rather than a wall. */
async function streamLocally(
  text: string,
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const pieces = text.match(/\S+\s*/g) ?? [text]
  for (const piece of pieces) {
    if (signal?.aborted) return
    onDelta(piece)
    await new Promise((resolve) => setTimeout(resolve, 12))
  }
}

/** Asks the service for spoken audio. Null means "use the browser instead". */
export async function fetchSpeech(
  body: unknown,
  caps: Capabilities,
  signal?: AbortSignal,
): Promise<Blob | null> {
  if (caps.voice === 'none') return null
  try {
    const response = await fetch(url('/api/tts'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
    if (!response.ok) return null
    return await response.blob()
  } catch {
    return null
  }
}
