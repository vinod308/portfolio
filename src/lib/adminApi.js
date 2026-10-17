// Client for /api/admin (server/admin.js). The admin API lives next to the
// contact API, so its base URL comes from VITE_CONTACT_ENDPOINT:
// '/api/contact' in dev, the Vercel URL in production, 'none' where there is
// no API (GitHub Pages, the Vercel mirror) and therefore no admin.
import { CONTACT_ENDPOINT } from './contact.js'

export const ADMIN_API = CONTACT_ENDPOINT === 'none' ? null : CONTACT_ENDPOINT.replace(/\/api\/contact$/, '/api/admin')

const TOKEN_KEY = 'admin-id-token'

// sessionStorage: the token disappears when the tab closes. Google ID tokens
// also expire after an hour; the server rejects them after that.
export const tokenStore = {
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
      // Private mode without storage: stay signed in for this page view only.
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

/** GET an admin endpoint with the Google ID token; throws AdminError on failure. */
export async function adminGet(path, token) {
  let res
  try {
    res = await fetch(`${ADMIN_API}${path}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new AdminError(0, 'Could not reach the server. Check your connection and try again.')
  }
  const body = await res.json().catch(() => null)
  if (res.ok && body?.ok) return body
  throw new AdminError(res.status, body?.message || 'Something went wrong. Please try again.')
}
