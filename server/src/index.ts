import { timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as narrator from './narrator.js'
import { hasBuild, serveStatic, STATIC_DIR } from './static.js'
import { listVoices, synthesize, voiceProvider } from './tts.js'
import * as validate from './validate.js'
import { BadRequestError } from './validate.js'
import { RefusedError } from './shape.js'
import type { Capabilities } from './contracts.js'

/**
 * Reads `.env` itself, rather than trusting how it was started.
 *
 * `npm start` passes `--env-file-if-exists`, but a process manager runs
 * `node dist/index.js` directly and that flag is nowhere — so the keys are
 * silently absent and the service reports having no narrator and no voice
 * while looking otherwise healthy. It is a miserable thing to debug, and the
 * fix is for the service to go and look.
 *
 * `.env` sits beside `package.json`, one level above `dist/`. Anything
 * already in the environment wins, so a real deployment can set variables
 * however it likes.
 */
function loadDotEnv(): void {
  if (typeof process.loadEnvFile !== 'function') return
  const here = dirname(fileURLToPath(import.meta.url))
  for (const path of [join(here, '..', '.env'), join(process.cwd(), '.env')]) {
    if (!existsSync(path)) continue
    try {
      process.loadEnvFile(path)
      return
    } catch {
      // A malformed file is not worth refusing to start over.
    }
  }
}

loadDotEnv()

const PORT = Number(process.env.PORT ?? 8787)
const MAX_BODY = 512 * 1024

/** Every path that accepts a POST. Anything else is a 404, not a hint. */
const POST_ROUTES = new Set(['/api/plan', '/api/reflect', '/api/narrate', '/api/tts'])

/**
 * A shared secret between this service and the app, when one is set.
 *
 * It is a lock on the front door, not a safe. The token is compiled into the
 * app that has to send it, so anybody willing to unpack a bundle can read it.
 * What it does stop is the thing that actually happens: a public address being
 * found by a scanner or a search engine and quietly spending the operator's
 * quota. For anything beyond that — per-person limits, revoking one listener,
 * knowing who spent what — this needs real accounts, and it has none.
 *
 * Unset, the service is open, which is right on a laptop and wrong anywhere
 * with a domain name in front of it.
 */
const APP_TOKEN = process.env.APP_TOKEN ?? ''

function tokenOk(req: IncomingMessage): boolean {
  if (!APP_TOKEN) return true
  const header = req.headers['x-dreamscape-token']
  const given = Array.isArray(header) ? header[0] : header
  if (!given) return false

  // Compared in constant time, so the answer does not leak the token a
  // character at a time to somebody timing the replies.
  const a = Buffer.from(given)
  const b = Buffer.from(APP_TOKEN)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * A plain per-address budget.
 *
 * This service spends the operator's money on every request, so an open port
 * is an open wallet. One window per address, counted in memory: it resets when
 * the process does, which is the right trade for a single small service.
 * Behind a proxy, set TRUST_PROXY=1 so the count follows the real caller.
 */
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS ?? 60_000)
const RATE_MAX = Number(process.env.RATE_MAX ?? 40)
const seen = new Map<string, { count: number; until: number }>()

function callerOf(req: IncomingMessage): string {
  if (process.env.TRUST_PROXY === '1') {
    const forwarded = req.headers['x-forwarded-for']
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim()
    if (first) return first
  }
  return req.socket.remoteAddress ?? 'unknown'
}

function overBudget(req: IncomingMessage): boolean {
  const now = Date.now()
  // Cheap sweep so a long-lived process does not remember every caller.
  if (seen.size > 5_000) {
    for (const [key, row] of seen) if (row.until <= now) seen.delete(key)
  }
  const key = callerOf(req)
  const row = seen.get(key)
  if (!row || row.until <= now) {
    seen.set(key, { count: 1, until: now + RATE_WINDOW_MS })
    return false
  }
  row.count += 1
  return row.count > RATE_MAX
}

function cors(res: ServerResponse): void {
  res.setHeader('access-control-allow-origin', process.env.CORS_ORIGIN ?? '*')
  res.setHeader('access-control-allow-headers', 'content-type')
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY) throw new Error('request body too large')
    chunks.push(chunk as Buffer)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw new BadRequestError('body')
  }
}

/**
 * Turns an unknown throw into something the app can act on.
 *
 * The detail is logged, never returned: an upstream message can carry a URL,
 * a header or a fragment of a key, and the app only needs to know whether to
 * retry or to fall back to writing the night itself.
 */
function failure(error: unknown): { status: number; body: Record<string, unknown> } {
  if (error instanceof RefusedError) {
    return { status: 422, body: { error: 'refused', category: error.category } }
  }
  if (error instanceof BadRequestError) {
    return { status: 400, body: { error: 'bad_request', field: error.field } }
  }
  console.error('[dreamscape]', error instanceof Error ? error.message : String(error))
  return { status: 502, body: { error: 'upstream' } }
}

function capabilities(): Capabilities {
  return {
    narrator: narrator.provider(),
    voice: voiceProvider(),
    model: narrator.model(),
  }
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  let url: URL
  try {
    url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  } catch {
    json(res, 400, { error: 'bad_request', field: 'url' })
    return
  }

  // Everything the API offers is behind the token, capabilities included:
  // knowing what a service can do is a reason to come back and use it.
  if (url.pathname.startsWith('/api/') && !tokenOk(req)) {
    json(res, 401, { error: 'unauthorized' })
    return
  }

  if (url.pathname === '/api/capabilities') {
    json(res, 200, capabilities())
    return
  }

  // Setup helper: the ids to paste into .env, straight from the account.
  if (url.pathname === '/api/voices') {
    if (!process.env.ELEVENLABS_API_KEY) {
      json(res, 503, { error: 'not_configured', what: 'ELEVENLABS_API_KEY' })
      return
    }
    try {
      json(res, 200, { voices: await listVoices() })
    } catch (error) {
      const { status, body } = failure(error)
      json(res, status, body)
    }
    return
  }

  // Anything that is not the API is the app itself, when it has been built.
  if (!url.pathname.startsWith('/api/')) {
    if (req.method === 'GET' && (await serveStatic(url.pathname, res))) return
    json(res, 404, { error: 'not_found' })
    return
  }

  if (req.method !== 'POST') {
    json(res, 404, { error: 'not_found' })
    return
  }

  if (overBudget(req)) {
    res.setHeader('retry-after', String(Math.ceil(RATE_WINDOW_MS / 1000)))
    json(res, 429, { error: 'too_many_requests' })
    return
  }

  // An unknown route is a 404 whatever else is or is not configured.
  if (!POST_ROUTES.has(url.pathname)) {
    json(res, 404, { error: 'not_found' })
    return
  }

  // Everything below needs a narrator; say so plainly instead of failing oddly.
  const needsNarrator = url.pathname !== '/api/tts'
  if (needsNarrator && !narrator.hasCredentials()) {
    json(res, 503, { error: 'not_configured', what: 'narrator' })
    return
  }

  try {
    switch (url.pathname) {
      case '/api/plan': {
        json(res, 200, await narrator.plan(validate.planRequest(await readBody(req))))
        return
      }

      case '/api/reflect': {
        json(res, 200, await narrator.reflect(validate.reflectRequest(await readBody(req))))
        return
      }

      case '/api/narrate': {
        const body = validate.narrateRequest(await readBody(req))
        res.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
          'x-accel-buffering': 'no',
        })
        const send = (event: unknown) => res.write(`data: ${JSON.stringify(event)}\n\n`)
        try {
          for await (const text of narrator.narrate(body)) send({ type: 'delta', text })
          send({ type: 'done' })
        } catch (error) {
          const { body: payload } = failure(error)
          send({ type: 'error', message: String(payload.error) })
        }
        res.end()
        return
      }

      case '/api/tts': {
        if (voiceProvider() === 'none') {
          json(res, 503, { error: 'not_configured', what: 'voice' })
          return
        }
        const audio = await synthesize(validate.ttsRequest(await readBody(req)))
        res.writeHead(200, {
          'content-type': 'audio/mpeg',
          'content-length': audio.byteLength,
          'cache-control': 'no-store',
        })
        res.end(Buffer.from(audio))
        return
      }

      default:
        json(res, 404, { error: 'not_found' })
    }
  } catch (error) {
    if (res.headersSent) {
      res.end()
      return
    }
    const { status, body } = failure(error)
    json(res, status, body)
  }
}

createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error('[dreamscape] unhandled', error)
    if (!res.headersSent) json(res, 500, { error: 'internal' })
    else res.end()
  })
}).listen(PORT, async () => {
  const caps = capabilities()
  console.log(`\n[dreamscape] narrator=${caps.narrator}${caps.model ? ` (${caps.model})` : ''}`)
  console.log(`[dreamscape] voice=${caps.voice}`)
  if (caps.narrator === 'none') {
    console.log('[dreamscape] set GEMINI_API_KEY (free tier) or ANTHROPIC_API_KEY to write')
  }
  if (!APP_TOKEN) {
    console.log('[dreamscape] APP_TOKEN is not set — the API is open to anyone who finds it')
  }
  if (await hasBuild()) {
    console.log(`\n[dreamscape] open  http://localhost:${PORT}\n`)
  } else {
    console.log(`\n[dreamscape] API only on :${PORT} — no app build found at ${STATIC_DIR}`)
    console.log('[dreamscape] build it with:  cd ../app && npm install && npm run build\n')
  }
})
