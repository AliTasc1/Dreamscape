/**
 * The server as it actually runs.
 *
 * Not the modules — the built artifact, started as a child process and talked
 * to over a socket, because a path-traversal check that passes in a unit test
 * and fails behind `http.createServer` has protected nobody. The secret file
 * planted next to the build is the thing an attacker would be reaching for.
 *
 * No API keys are set, so the narrator is deliberately absent: every test here
 * is about what the server does before it would ever spend money.
 */

import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { after, before, describe, it } from 'node:test'

const SERVER = resolve(__dirname, '..', '..', '..', 'server')

let child: ChildProcess
let port = 0
let root = ''

interface Reply {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: string
}

function fetchRaw(path: string, init: { method?: string; body?: string } = {}): Promise<Reply> {
  return new Promise((done, fail) => {
    const req = request(
      { host: '127.0.0.1', port, path, method: init.method ?? 'GET' },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () =>
          done({ status: res.statusCode ?? 0, headers: res.headers, body }),
        )
      },
    )
    req.on('error', fail)
    if (init.body !== undefined) {
      req.setHeader('content-type', 'application/json')
      req.write(init.body)
    }
    req.end()
  })
}

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await fetchRaw('/api/capabilities')
      return
    } catch {
      await new Promise((r) => setTimeout(r, 100))
    }
  }
  throw new Error('server never came up')
}

before(async () => {
  // A build directory with one real file, and one secret one level above it —
  // exactly the shape a traversal would be trying to cross.
  const base = mkdtempSync(join(tmpdir(), 'dreamscape-static-'))
  writeFileSync(join(base, 'secret.txt'), 'ANTHROPIC_API_KEY=sk-ant-not-a-real-key')
  root = join(base, 'dist')
  mkdirSync(join(root, 'assets'), { recursive: true })
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>Dreamscape</title>')
  writeFileSync(join(root, 'assets', 'app.js'), 'console.log(1)')

  port = 9000 + Math.floor(Math.random() * 900)
  child = spawn(process.execPath, ['dist/index.js'], {
    cwd: SERVER,
    env: {
      ...process.env,
      PORT: String(port),
      STATIC_DIR: root,
      RATE_MAX: '5',
      RATE_WINDOW_MS: '60000',
      // Explicitly absent, so nothing here can reach a paid API.
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_AUTH_TOKEN: '',
      ELEVENLABS_API_KEY: '',
      OPENAI_API_KEY: '',
    },
    stdio: 'ignore',
  })
  await waitForServer()
}, { timeout: 30_000 })

after(() => {
  child?.kill()
  if (root) rmSync(resolve(root, '..'), { recursive: true, force: true })
})

describe('static files', () => {
  it('serves the app shell', async () => {
    const res = await fetchRaw('/')
    assert.equal(res.status, 200)
    assert.match(res.body, /Dreamscape/)
    assert.match(String(res.headers['content-type']), /text\/html/)
  })

  it('serves a fingerprinted asset as immutable and the shell as no-cache', async () => {
    assert.match(String((await fetchRaw('/assets/app.js')).headers['cache-control']), /immutable/)
    assert.match(String((await fetchRaw('/')).headers['cache-control']), /no-cache/)
  })

  it('falls back to the shell so the app\u2019s own routes survive a cold load', async () => {
    const res = await fetchRaw('/nights')
    assert.equal(res.status, 200)
    assert.match(res.body, /Dreamscape/)
  })

  it('never serves a file outside the build, however the path is written', async () => {
    const attempts = [
      '/../secret.txt',
      '/../../secret.txt',
      '/..%2Fsecret.txt',
      '/%2e%2e%2fsecret.txt',
      '/%2e%2e/%2e%2e/secret.txt',
      '/assets/../../secret.txt',
      '/..\\secret.txt',
      '/%2e%2e%5csecret.txt',
      '/....//secret.txt',
      '/%252e%252e%252fsecret.txt',
      '/etc/passwd',
      '/../../../../../../etc/passwd',
    ]
    for (const path of attempts) {
      const res = await fetchRaw(path)
      assert.doesNotMatch(res.body, /sk-ant-not-a-real-key/, `${path} leaked the secret`)
      assert.doesNotMatch(res.body, /root:x:/, `${path} leaked /etc/passwd`)
    }
  })

  it('does not fall over on a malformed percent escape', async () => {
    const res = await fetchRaw('/%ZZ')
    assert.ok(res.status === 200 || res.status === 404, `got ${res.status}`)
    assert.notEqual(res.status, 500)
  })
})

describe('the API surface', () => {
  it('reports its capabilities without any keys configured', async () => {
    const res = await fetchRaw('/api/capabilities')
    assert.equal(res.status, 200)
    const caps = JSON.parse(res.body)
    assert.equal(caps.narrator, 'none')
    assert.equal(caps.voice, 'none')
    assert.equal(caps.model, null)
  })

  it('answers a preflight without a body', async () => {
    const res = await fetchRaw('/api/plan', { method: 'OPTIONS' })
    assert.equal(res.status, 204)
  })

  it('refuses a GET to a POST endpoint', async () => {
    assert.equal((await fetchRaw('/api/plan')).status, 404)
  })

  it('says plainly that it has no narrator rather than failing oddly', async () => {
    const res = await fetchRaw('/api/plan', { method: 'POST', body: '{}' })
    assert.equal(res.status, 503)
    assert.equal(JSON.parse(res.body).what, 'narrator')
  })

  it('404s an unknown API route', async () => {
    assert.equal((await fetchRaw('/api/nope', { method: 'POST', body: '{}' })).status, 404)
  })

  it('never returns an upstream message to the caller', async () => {
    const res = await fetchRaw('/api/tts', { method: 'POST', body: '{"text":"hi"}' })
    const payload = JSON.parse(res.body)
    assert.ok(!('message' in payload), `leaked: ${res.body}`)
  })
})

describe('the per-address budget', () => {
  it('stops answering once a caller is past its window', async () => {
    // RATE_MAX is 5 for this process; the sixth POST must be refused.
    const codes: number[] = []
    for (let i = 0; i < 8; i++) {
      codes.push((await fetchRaw('/api/tts', { method: 'POST', body: '{"text":"hi"}' })).status)
    }
    assert.ok(codes.includes(429), `never refused: ${codes.join(',')}`)
    const refused = await fetchRaw('/api/tts', { method: 'POST', body: '{"text":"hi"}' })
    assert.equal(refused.status, 429)
    assert.ok(refused.headers['retry-after'], 'no retry-after header')
  })

  it('still serves the app to a caller that is over budget', async () => {
    // The limit is for what costs money, not for the page itself.
    const res = await fetchRaw('/')
    assert.equal(res.status, 200)
  })
})
