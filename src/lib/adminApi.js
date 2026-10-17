// Client for /api/admin (server/admin.js). The admin API lives next to the
// contact API, so its base URL comes from VITE_CONTACT_ENDPOINT:
// '/api/contact' in dev, the Vercel URL in production, 'none' where there is
// no API (GitHub Pages, the Vercel mirror) and therefore no admin.
import { CONTACT_ENDPOINT } from './contact.js'

export const ADMIN_API = CONTACT_ENDPOINT === 'none' ? null : CONTACT_ENDPOINT.replace(/\/api\/contact$/, '/api/admin')

const TOKEN_KEY = 'admin-session'

// sessionStorage: the session ends when the tab closes; the server also
// expires it after 12 hours.
export const session = {
  get() {
    try {
      return window.sessionStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token) {
    try {
      window.sessionStorage.setItem(TOKEN_KEY, token)
    } catch {
      // Private mode without storage: signed in for this page view only.
    }
  },
  clear() {
    try {
      window.sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      // nothing stored
    }
  },
}

export class AdminError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/** Call an admin endpoint; resolves with the JSON body or throws AdminError. */
export async function adminFetch(path, { method = 'GET', body, token = session.get() } = {}) {
  let res
  try {
    res = await fetch(`${ADMIN_API}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body && JSON.stringify(body),
    })
  } catch {
    throw new AdminError(0, 'Could not reach the server. Check your connection and try again.')
  }
  const data = await res.json().catch(() => null)
  if (res.ok && data?.ok) return data
  throw new AdminError(res.status, data?.message || 'Something went wrong. Please try again.')
}
