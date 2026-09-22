import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import * as claude from './claude.js'
import { listVoices, synthesize, voiceProvider } from './tts.js'
import type {
  Capabilities,
  NarrateRequest,
  PlanRequest,
  ReflectRequest,
  TtsRequest,
} from './contracts.js'

const PORT = Number(process.env.PORT ?? 8787)
const MAX_BODY = 512 * 1024

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

async function readBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY) throw new Error('request body too large')
    chunks.push(chunk as Buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T
}

/** Turns an unknown throw into something the app can act on. */
function failure(error: unknown): { status: number; body: Record<string, unknown> } {
  if (error instanceof claude.RefusedError) {
    return { status: 422, body: { error: 'refused', category: error.category } }
  }
  const message = error instanceof Error ? error.message : String(error)
  console.error('[dreamscape]', message)
  return { status: 502, body: { error: 'upstream', message } }
}

function capabilities(): Capabilities {
  const narratorReady = claude.hasCredentials()
  return {
    narrator: narratorReady ? 'claude' : 'none',
    voice: voiceProvider(),
    model: narratorReady ? claude.MODEL : null,
  }
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

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

  if (req.method !== 'POST') {
    json(res, 404, { error: 'not_found' })
    return
  }

  // Everything below needs a narrator; say so plainly instead of failing oddly.
  const needsClaude = url.pathname !== '/api/tts'
  if (needsClaude && !claude.hasCredentials()) {
    json(res, 503, { error: 'not_configured', what: 'narrator' })
    return
  }

  try {
    switch (url.pathname) {
      case '/api/plan': {
        json(res, 200, await claude.plan(await readBody<PlanRequest>(req)))
        return
      }

      case '/api/reflect': {
        json(res, 200, await claude.reflect(await readBody<ReflectRequest>(req)))
        return
      }

      case '/api/narrate': {
        const body = await readBody<NarrateRequest>(req)
        res.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
          'x-accel-buffering': 'no',
        })
        const send = (event: unknown) => res.write(`data: ${JSON.stringify(event)}\n\n`)
        try {
          for await (const text of claude.narrate(body)) send({ type: 'delta', text })
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
        const audio = await synthesize(await readBody<TtsRequest>(req))
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
}).listen(PORT, () => {
  const caps = capabilities()
  console.log(`[dreamscape] listening on :${PORT}`)
  console.log(`[dreamscape] narrator=${caps.narrator}${caps.model ? ` (${caps.model})` : ''}`)
  console.log(`[dreamscape] voice=${caps.voice}`)
  if (caps.narrator === 'none') {
    console.log('[dreamscape] set ANTHROPIC_API_KEY to write nights with Claude')
  }
})
