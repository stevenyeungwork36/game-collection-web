/**
 * API base URL for backend. Empty = same origin (e.g. when frontend and backend are served together).
 * Set VITE_API_BASE_URL in Netlify (or .env) to your Render backend URL when frontend is on a different domain.
 * Example: https://your-app.onrender.com
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
