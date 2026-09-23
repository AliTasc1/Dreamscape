import type {
  Capabilities,
  NarrateRequest,
  PlanRequest,
  Reflection,
  ReflectRequest,
  SessionPlan,
} from '../shared/ai/contracts'
import { localNarrate, localPlan, localReflect } from '../shared/ai/localEngine'

/**
 * Where the night comes from.
 *
 * The phone writes its own by default — no key, no account, no bill, nothing
 * to configure, and it works on a plane. A hosted narrator is opt-in: set
 * `EXPO_PUBLIC_API_BASE` to a Dreamscape server and the app will prefer it,
 * falling back to the local engine the moment it is unreachable.
 */

/**
 * What someone writes into a prompt here is about as private as writing gets,
 * and a night's narration is the answer to it. Over the open internet that
 * traffic is encrypted or it does not happen: a plain-http base is accepted
 * only on a development machine, where it means a laptop on the same Wi-Fi.
 */
function safeBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '')
  if (!trimmed) return ''
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    console.warn('[dreamscape] EXPO_PUBLIC_API_BASE is not a URL; writing nights on the phone')
    return ''
  }
  if (url.protocol === 'https:') return trimmed
  const local =
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    /^10\./.test(url.hostname) ||
    /^192\.168\./.test(url.hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname)
  if (url.protocol === 'http:' && local && __DEV__) return trimmed
  console.warn('[dreamscape] EXPO_PUBLIC_API_BASE must be https; writing nights on the phone')
  return ''
}

const BASE = safeBase(process.env.EXPO_PUBLIC_API_BASE ?? '')

/** The server this app talks to, or '' when it writes its own nights. */
export function apiBase(): string {
  return BASE
}

/**
 * The shared secret the server asks for, when it asks for one.
 *
 * Compiled into the bundle, so it is a lock on the front door rather than a
 * safe — but the front door is what gets tried.
 */
const TOKEN = (process.env.EXPO_PUBLIC_API_TOKEN ?? '').trim()

export function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  return { ...extra, ...(TOKEN ? { 'x-dreamscape-token': TOKEN } : {}) }
}

export const OFFLINE: Capabilities = { narrator: 'none', voice: 'none', model: null }

/** A server's answer is not trusted any more than a client's request is. */
function readCapabilities(payload: unknown): Capabilities {
  if (!payload || typeof payload !== 'object') return OFFLINE
  const raw = payload as Record<string, unknown>
  return {
    narrator:
      raw.narrator === 'claude' ? 'claude' : raw.narrator === 'gemini' ? 'gemini' : 'none',
    voice: raw.voice === 'elevenlabs' ? 'elevenlabs' : raw.voice === 'openai' ? 'openai' : 'none',
    model: typeof raw.model === 'string' ? raw.model.slice(0, 80) : null,
  }
}

export async function fetchCapabilities(): Promise<Capabilities> {
  if (!BASE) return OFFLINE
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const response = await fetch(`${BASE}/api/capabilities`, {
      headers: apiHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!response.ok) return OFFLINE
    return readCapabilities(await response.json())
  } catch {
    return OFFLINE
  }
}

export async function plan(req: PlanRequest, caps: Capabilities): Promise<SessionPlan> {
  if (caps.narrator === 'none' || !BASE) return localPlan(req)
  try {
    const response = await fetch(`${BASE}/api/plan`, {
      method: 'POST',
      headers: apiHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(req),
    })
    if (!response.ok) return localPlan(req)
    return (await response.json()) as SessionPlan
  } catch {
    return localPlan(req)
  }
}

export async function reflect(req: ReflectRequest, caps: Capabilities): Promise<Reflection> {
  if (caps.narrator === 'none' || !BASE) return localReflect(req)
  try {
    const response = await fetch(`${BASE}/api/reflect`, {
      method: 'POST',
      headers: apiHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(req),
    })
    if (!response.ok) return localReflect(req)
    return (await response.json()) as Reflection
  } catch {
    return localReflect(req)
  }
}

/**
 * React Native's fetch has no streaming body, so a hosted narration is read
 * through XHR's incremental responseText instead — the same server-sent events,
 * parsed as they arrive.
 */
function streamOverXhr(
  url: string,
  body: unknown,
  onDelta: (text: string) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    let consumed = 0
    let received = false

    const drain = () => {
      const text = xhr.responseText ?? ''
      let boundary = text.indexOf('\n\n', consumed)
      while (boundary !== -1) {
        const frame = text.slice(consumed, boundary)
        consumed = boundary + 2
        boundary = text.indexOf('\n\n', consumed)

        const line = frame.split('\n').find((l) => l.startsWith('data:'))
        if (!line) continue
        try {
          const event = JSON.parse(line.slice(5).trim()) as { type: string; text?: string }
          if (event.type === 'delta' && event.text) {
            received = true
            onDelta(event.text)
          }
        } catch {
          // A half-written frame; the next progress event completes it.
        }
      }
    }

    xhr.onprogress = drain
    xhr.onload = () => {
      drain()
      resolve(received)
    }
    xhr.onerror = () => resolve(received)
    xhr.ontimeout = () => resolve(received)
    xhr.open('POST', url)
    for (const [name, value] of Object.entries(apiHeaders({ 'content-type': 'application/json' }))) {
      xhr.setRequestHeader(name, value)
    }
    xhr.timeout = 120_000
    xhr.send(JSON.stringify(body))
  })
}

/** Paces locally written text so it arrives like a stream rather than a wall. */
async function streamLocally(text: string, onDelta: (chunk: string) => void): Promise<void> {
  const pieces = text.match(/\S+\s*/g) ?? [text]
  for (const piece of pieces) {
    onDelta(piece)
    await new Promise((resolve) => setTimeout(resolve, 8))
  }
}

export async function narrate(
  req: NarrateRequest,
  caps: Capabilities,
  onDelta: (text: string) => void,
): Promise<void> {
  if (caps.narrator !== 'none' && BASE) {
    const served = await streamOverXhr(`${BASE}/api/narrate`, req, onDelta)
    if (served) return
  }
  await streamLocally(localNarrate(req), onDelta)
}
