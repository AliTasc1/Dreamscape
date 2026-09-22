import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ServerResponse } from 'node:http'

/**
 * Serves the built app from the same origin as the API.
 *
 * One service instead of two: one URL to share, one thing to deploy, and no
 * CORS. If `app/dist` has not been built this does nothing and the service is
 * API-only, exactly as before.
 */

const HERE = fileURLToPath(new URL('.', import.meta.url))

/** `server/dist/` → `app/dist/`, unless told otherwise. */
export const STATIC_DIR = resolve(
  process.env.STATIC_DIR ?? join(HERE, '..', '..', 'app', 'dist'),
)

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
}

export async function hasBuild(): Promise<boolean> {
  try {
    return (await stat(join(STATIC_DIR, 'index.html'))).isFile()
  } catch {
    return false
  }
}

async function fileAt(path: string): Promise<string | null> {
  try {
    return (await stat(path)).isFile() ? path : null
  } catch {
    return null
  }
}

/**
 * Resolves a request path to a file inside the build, or to index.html so the
 * app's own hash routes work on a cold load. Returns false when there is
 * nothing to serve and the caller should 404.
 */
export async function serveStatic(pathname: string, res: ServerResponse): Promise<boolean> {
  // Strip the leading slash and any traversal before joining.
  const requested = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '')
  const candidate = join(STATIC_DIR, requested)
  if (candidate !== STATIC_DIR && !candidate.startsWith(STATIC_DIR + sep)) return false

  const target =
    (await fileAt(candidate)) ?? (await fileAt(join(STATIC_DIR, 'index.html')))
  if (!target) return false

  const extension = extname(target).toLowerCase()
  // Vite fingerprints its assets, so everything but the shell can be held onto.
  const immutable = target.includes(`${sep}assets${sep}`)
  res.writeHead(200, {
    'content-type': TYPES[extension] ?? 'application/octet-stream',
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  createReadStream(target).pipe(res)
  return true
}
