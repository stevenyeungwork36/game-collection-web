/**
 * Cloudflare Pages Function: proxy /api/* to the Worker backend.
 * Keeps browser requests same-origin (Pages hostname) so users are not blocked by
 * DNS issues resolving *.workers.dev on some home networks.
 *
 * Set BACKEND_URL in Pages → Settings → Environment variables (Production + Preview):
 *   https://game-collection-backend.sy-dev.workers.dev
 * (no trailing slash)
 */

export async function onRequest(context) {
  const { request, env } = context
  const backend =
    env.BACKEND_URL || 'https://game-collection-backend.sy-dev.workers.dev'

  const url = new URL(request.url)
  const target = new URL(url.pathname + url.search, backend)

  const headers = new Headers(request.headers)
  headers.delete('host')

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body
  }

  return fetch(target.toString(), init)
}
