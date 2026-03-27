/**
 * API base URL for backend. Empty = same origin (Cloudflare Pages + Functions proxy to Worker, or Vite dev proxy).
 * Set VITE_API_BASE_URL in Pages env or frontend/.env.local when calling the Worker URL directly.
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}

/** For debugging: in browser console, run window.__API_BASE__ to see the baked-in base URL. */
if (typeof window !== 'undefined') {
  window.__API_BASE__ = API_BASE
}

/**
 * Safe fetch + JSON parse. Use for API calls so non-JSON error responses (e.g. 502 HTML) don't throw.
 * Returns { ok, data, errorMessage }.
 */
export async function apiFetch(url, options = {}) {
  let res
  try {
    res = await fetch(url, options)
  } catch (e) {
    return { ok: false, data: null, errorMessage: e.message || 'Network request failed' }
  }
  let data = null
  try {
    const text = await res.text()
    if (text) data = JSON.parse(text)
  } catch {
    data = null
  }
  const errorMessage = (data && typeof data.error === 'string') ? data.error : (res.ok ? null : `HTTP ${res.status}`)
  return { ok: res.ok, data, errorMessage }
}
