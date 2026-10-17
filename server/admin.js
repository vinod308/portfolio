// /api/admin: every request must carry a Google ID token (from "Sign in with
// Google" on /admin) as "Authorization: Bearer <token>". The token is verified
// here on every request; there is no server session to steal or expire.
import express from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { GOOGLE_CLIENT_ID, isAdminEmail } from '../shared/admin.js'

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']
const GOOGLE_JWKS = 'https://www.googleapis.com/oauth2/v3/certs'

export class AuthError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/**
 * Returns verify(token) -> { email, name, picture }. Checks Google's
 * signature, issuer, audience, expiry and that the email is verified.
 */
export function createGoogleVerifier(clientId = GOOGLE_CLIENT_ID) {
  const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS))
  return async function verifyGoogleIdToken(token) {
    if (!clientId) throw new AuthError(503, 'Admin sign-in is not configured yet.')
    let payload
    try {
      ;({ payload } = await jwtVerify(token, jwks, { issuer: GOOGLE_ISSUERS, audience: clientId }))
    } catch {
      throw new AuthError(401, 'Your sign-in has expired. Please sign in again.')
    }
    if (payload.email_verified !== true) throw new AuthError(403, 'This Google account is not allowed.')
    return { email: String(payload.email).toLowerCase(), name: payload.name ?? '', picture: payload.picture ?? '' }
  }
}

/** Express middleware: verifies the bearer token and the allow-list, sets req.admin. */
export function requireAdmin({ verifyIdToken, logger }) {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    const match = /^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/.exec(req.get('authorization') || '')
    if (!match) return res.status(401).json({ ok: false, message: 'Please sign in.' })
    try {
      const user = await verifyIdToken(match[1])
      if (!isAdminEmail(user.email)) {
        logger.warn({ event: 'admin_denied', emailDomain: user.email.split('@')[1] })
        return res.status(403).json({ ok: false, message: 'This Google account is not allowed.' })
      }
      req.admin = user
      next()
    } catch (err) {
      const status = err instanceof AuthError ? err.status : 401
      if (status !== 401) logger.warn({ event: 'admin_auth_failed', status })
      return res.status(status).json({ ok: false, message: err instanceof AuthError ? err.message : 'Please sign in.' })
    }
  }
}

export function adminRouter({ verifyIdToken, logger }) {
  const router = express.Router()
  router.use(requireAdmin({ verifyIdToken, logger }))
  router.get('/me', (req, res) => res.json({ ok: true, user: req.admin }))
  return router
}
