// /api/admin: sign-in for allow-listed accounts (shared/admin.js), by email +
// password or by Google. Both end in the same server session: a random token
// the browser sends as "Authorization: Bearer <token>", stored only as a hash.
//
//   POST /login             { email, password }     -> { token, user }
//   POST /google            { credential }          -> { token, user }
//   POST /password/request  { email }                emails a one-time link
//   POST /password/set      { token, password }      sets the password
//   GET  /me                                         -> { user }
//   POST /logout
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { GOOGLE_CLIENT_ID, isAdminEmail } from '../shared/admin.js'
import { SESSION_HOURS, SET_PASSWORD_MINUTES, hashPassword, verifyPassword } from './adminStore.js'
import { buildPasswordEmail } from './mailer.js'
import { RANGES } from './analytics.js'
import { searchStats as defaultSearchStats } from './searchConsole.js'
import { STATUSES } from './inquiries.js'

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']
const GOOGLE_JWKS = 'https://www.googleapis.com/oauth2/v3/certs'
export const PASSWORD_RULES = { min: 12, max: 128 }

export class AuthError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/** verify(idToken) -> { email, name, picture }; checks signature, issuer, audience, expiry, verified email. */
export function createGoogleVerifier(clientId = GOOGLE_CLIENT_ID) {
  const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS))
  return async function verifyGoogleIdToken(token) {
    if (!clientId) throw new AuthError(503, 'Google sign-in is not configured yet.')
    let payload
    try {
      ;({ payload } = await jwtVerify(token, jwks, { issuer: GOOGLE_ISSUERS, audience: clientId }))
    } catch {
      throw new AuthError(401, 'Google sign-in failed. Please try again.')
    }
    if (payload.email_verified !== true) throw new AuthError(403, 'This Google account is not allowed.')
    return { email: String(payload.email).toLowerCase(), name: payload.name ?? '', picture: payload.picture ?? '' }
  }
}

export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_RULES.min)
    return `Use at least ${PASSWORD_RULES.min} characters.`
  if (password.length > PASSWORD_RULES.max) return `Use at most ${PASSWORD_RULES.max} characters.`
  return null
}

const str = (v) => (typeof v === 'string' ? v.trim() : '')
const limiter = (minutes, limit, message) =>
  rateLimit({
    windowMs: minutes * 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ ok: false, message }),
  })

export function adminRouter({
  store,
  analytics,
  inquiries,
  searchStats = defaultSearchStats,
  verifyIdToken,
  transport,
  config,
  logger,
}) {
  const router = express.Router()
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    if (!store) return res.status(503).json({ ok: false, message: 'Admin sign-in is not configured yet.' })
    next()
  })
  router.use(express.json({ limit: '4kb', strict: true }))

  const signInLimit = limiter(15, 10, 'Too many sign-in attempts. Please wait 15 minutes.')
  const linkLimit = limiter(60, 5, 'Too many requests. Please wait an hour and try again.')

  const startSession = async (res, user) => {
    const token = await store.createToken(user.email, 'session', SESSION_HOURS * 60)
    res.json({ ok: true, token, user })
  }

  router.post('/login', signInLimit, async (req, res) => {
    const email = str(req.body?.email).toLowerCase()
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const hash = isAdminEmail(email) ? await store.getPasswordHash(email) : null
    // Same answer for unknown email, no password set yet and wrong password.
    if (!hash || !(await verifyPassword(password, hash))) {
      logger.warn({ event: 'admin_login_failed' })
      return res.status(401).json({ ok: false, message: 'Incorrect email or password.' })
    }
    await startSession(res, { email, name: '', picture: '' })
  })

  router.post('/google', signInLimit, async (req, res) => {
    try {
      const user = await verifyIdToken(str(req.body?.credential))
      if (!isAdminEmail(user.email)) {
        logger.warn({ event: 'admin_denied', emailDomain: user.email.split('@')[1] })
        return res.status(403).json({ ok: false, message: 'This Google account is not allowed.' })
      }
      await startSession(res, user)
    } catch (err) {
      const status = err instanceof AuthError ? err.status : 401
      res.status(status).json({ ok: false, message: err instanceof AuthError ? err.message : 'Google sign-in failed.' })
    }
  })

  router.post('/password/request', linkLimit, async (req, res) => {
    const email = str(req.body?.email).toLowerCase()
    const answer = { ok: true, message: 'If that email can sign in here, a link to set your password is on its way.' }
    if (!isAdminEmail(email)) return res.json(answer)
    try {
      const token = await store.createToken(email, 'set_password', SET_PASSWORD_MINUTES)
      const url = `${config.clientOrigins[0]}/admin/set-password/?token=${token}`
      await transport.sendMail(buildPasswordEmail({ to: email, url, config, minutes: SET_PASSWORD_MINUTES }))
      logger.info({ event: 'admin_password_link_sent' })
      res.json(answer)
    } catch (err) {
      logger.error({ event: 'admin_password_link_failed', code: err?.code })
      res.status(502).json({ ok: false, message: 'The email could not be sent right now. Please try again.' })
    }
  })

  router.post('/password/set', signInLimit, async (req, res) => {
    const problem = passwordProblem(req.body?.password)
    if (problem) return res.status(422).json({ ok: false, message: problem })
    const email = await store.useToken(str(req.body?.token), 'set_password', { once: true })
    if (!email) {
      return res.status(400).json({ ok: false, message: 'This link has expired or was already used. Request a new one.' })
    }
    await store.setPasswordHash(email, await hashPassword(req.body.password))
    // A new password signs out every existing session and voids other links.
    await store.deleteTokens(email, 'session')
    await store.deleteTokens(email, 'set_password')
    logger.info({ event: 'admin_password_set' })
    res.json({ ok: true })
  })

  // Everything below needs a session.
  const bearer = (req) => /^Bearer ([\w-]{20,100})$/.exec(req.get('authorization') || '')?.[1]
  router.use(async (req, res, next) => {
    const token = bearer(req)
    const email = token && (await store.useToken(token, 'session'))
    if (!email || !isAdminEmail(email)) return res.status(401).json({ ok: false, message: 'Please sign in.' })
    req.admin = { email }
    req.sessionToken = token
    next()
  })

  router.get('/me', (req, res) => res.json({ ok: true, user: req.admin }))

  // Site analytics for the dashboard (server/analytics.js).
  router.get('/stats', async (req, res) => {
    const days = RANGES[req.query.range] ?? RANGES['7d']
    if (!analytics) return res.status(503).json({ ok: false, message: 'Analytics is not configured yet.' })
    try {
      res.json({ ok: true, days, ...(await analytics.stats(days)) })
    } catch (err) {
      logger.error({ event: 'stats_failed', code: err?.code })
      res.status(502).json({ ok: false, message: 'Could not load analytics right now.' })
    }
  })

  // Google Search Console (server/searchConsole.js); works only on Vercel production.
  router.get('/search', async (req, res) => {
    const days = RANGES[req.query.range] ?? RANGES['7d']
    try {
      res.json({ ok: true, days, ...(await searchStats(days)) })
    } catch (err) {
      logger.error({ event: 'search_console_failed', code: err?.code ?? err?.name })
      res.status(502).json({ ok: false, message: 'Search Console data is unavailable right now.' })
    }
  })

  // Contact form inquiries (server/inquiries.js).
  router.get('/inquiries', async (req, res) => {
    if (!inquiries) return res.status(503).json({ ok: false, message: 'Inquiries are not configured yet.' })
    const status = STATUSES.includes(req.query.status) ? req.query.status : undefined
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : ''
    try {
      res.json({ ok: true, ...(await inquiries.list({ status, q: q || undefined })) })
    } catch (err) {
      logger.error({ event: 'inquiries_failed', code: err?.code })
      res.status(502).json({ ok: false, message: 'Could not load inquiries right now.' })
    }
  })

  router.patch('/inquiries/:id', async (req, res) => {
    const id = Number(req.params.id)
    const status = req.body?.status
    if (!inquiries) return res.status(503).json({ ok: false, message: 'Inquiries are not configured yet.' })
    if (!Number.isSafeInteger(id) || id < 1 || !STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, message: 'Invalid request.' })
    }
    const item = await inquiries.setStatus(id, status)
    if (!item) return res.status(404).json({ ok: false, message: 'Inquiry not found.' })
    res.json({ ok: true, item })
  })

  router.post('/logout', async (req, res) => {
    await store.deleteToken(req.sessionToken)
    res.json({ ok: true })
  })

  return router
}
