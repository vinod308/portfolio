import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { normalizeContact, validateContact, MIN_FILL_MS } from '../shared/contact.js'
import { buildMessage } from './mailer.js'

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
const FIELDS = ['name', 'email', 'inquiry', 'message', 'website']

const GENERIC_FAILURE = 'The message could not be delivered right now. Please try again in a moment.'

/** Structured JSON-lines logger. Callers must never pass secrets or message bodies. */
export const consoleLogger = {
  info: (o) => console.log(JSON.stringify({ level: 'info', time: new Date().toISOString(), ...o })),
  warn: (o) => console.warn(JSON.stringify({ level: 'warn', time: new Date().toISOString(), ...o })),
  error: (o) => console.error(JSON.stringify({ level: 'error', time: new Date().toISOString(), ...o })),
}

/** Diagnostic fields from a Nodemailer error. Never includes credentials or content. */
function mailErrorInfo(err) {
  return { code: err?.code, responseCode: err?.responseCode, command: err?.command }
}

const emailDomain = (email) => email.split('@')[1]?.toLowerCase()

/**
 * Build the Express app. `transport` needs a sendMail(message) method;
 * tests pass a mock so no real email is ever sent.
 */
export function createApp({ config, transport, logger = consoleLogger, now = () => new Date() }) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', config.trustProxy)

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // Only force HTTPS subresources in production; local HTTP testing would break.
          upgradeInsecureRequests: config.isProduction ? [] : null,
        },
      },
    }),
  )

  // ---- API ----
  const api = express.Router()

  // Browsers send Origin on cross-site and same-site POSTs. Reject any origin
  // that isn't the configured frontend; requests without Origin (same-origin
  // GETs, server-to-server) are allowed and still rate limited.
  api.use((req, res, next) => {
    const origin = req.get('origin')
    if (origin && !config.clientOrigins.includes(origin)) {
      logger.warn({ event: 'origin_rejected', origin: origin.slice(0, 100) })
      return res.status(403).json({ ok: false, message: 'Forbidden.' })
    }
    next()
  })
  api.use(
    cors({
      origin: config.clientOrigins,
      methods: ['POST'],
      allowedHeaders: ['Content-Type', 'Accept'],
      maxAge: 600,
    }),
  )

  api.get('/health', (req, res) => res.json({ ok: true }))

  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn({ event: 'rate_limited', path: req.path })
      res.status(429).json({ ok: false, message: 'Too many messages. Please wait a few minutes and try again.' })
    },
  })

  const requireJson = (req, res, next) => {
    if (!req.is('application/json')) {
      return res.status(415).json({ ok: false, message: 'Requests must be sent as JSON.' })
    }
    next()
  }

  api.post('/contact', limiter, requireJson, express.json({ limit: '16kb', strict: true }), async (req, res) => {
    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ ok: false, message: 'Invalid request.' })
    }
    // Every known field must be a string when present; anything else is malformed.
    if (FIELDS.some((f) => body[f] !== undefined && typeof body[f] !== 'string')) {
      return res.status(400).json({ ok: false, message: 'Invalid request.' })
    }
    if (body.elapsedMs !== undefined && (typeof body.elapsedMs !== 'number' || !Number.isFinite(body.elapsedMs))) {
      return res.status(400).json({ ok: false, message: 'Invalid request.' })
    }

    // Bots: a filled honeypot or an impossibly fast submission gets the same
    // response as a real success, so there is nothing to tune against.
    const honeypot = typeof body.website === 'string' && body.website.trim() !== ''
    const tooFast = typeof body.elapsedMs === 'number' && body.elapsedMs < MIN_FILL_MS
    if (honeypot || tooFast) {
      logger.warn({ event: 'contact_dropped', reason: honeypot ? 'honeypot' : 'too_fast' })
      return res.json({ ok: true })
    }

    const values = normalizeContact(body)
    const errors = validateContact(values)
    if (Object.keys(errors).length) {
      return res.status(422).json({ ok: false, message: 'Please check the highlighted fields.', errors })
    }

    const meta = { inquiry: values.inquiry, emailDomain: emailDomain(values.email), messageLength: values.message.length }
    try {
      const info = await transport.sendMail(buildMessage(values, config, now()))
      if (info?.rejected?.length) {
        logger.error({ event: 'mail_rejected', ...meta, rejectedCount: info.rejected.length })
        return res.status(502).json({ ok: false, message: GENERIC_FAILURE })
      }
      logger.info({ event: 'mail_sent', ...meta, messageId: info?.messageId })
      return res.json({ ok: true })
    } catch (err) {
      logger.error({ event: 'mail_failed', ...meta, ...mailErrorInfo(err) })
      return res.status(502).json({ ok: false, message: GENERIC_FAILURE })
    }
  })

  api.use((req, res) => res.status(404).json({ ok: false, message: 'Not found.' }))
  app.use('/api', api)

  // ---- Built frontend (single-service deployments) ----
  if (config.serveStatic) {
    app.use(
      '/assets',
      express.static(path.join(DIST, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }),
    )
    app.use(express.static(DIST, { index: false, maxAge: '1h' }))
    // SPA fallback: any other GET that wants HTML gets index.html, so
    // /projects/haylow and other client routes work on direct load.
    app.use((req, res, next) => {
      if ((req.method === 'GET' || req.method === 'HEAD') && req.accepts('html')) {
        res.set('Cache-Control', 'no-cache')
        return res.sendFile(path.join(DIST, 'index.html'))
      }
      next()
    })
  }

  // ---- Errors: never leak internals ----
  app.use((req, res) => res.status(404).json({ ok: false, message: 'Not found.' }))
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ ok: false, message: 'Request is too large.' })
    }
    if (err?.type === 'entity.parse.failed' || err?.status === 400) {
      return res.status(400).json({ ok: false, message: 'Invalid request.' })
    }
    if (err?.status === 404) return res.status(404).json({ ok: false, message: 'Not found.' })
    logger.error({ event: 'unhandled_error', name: err?.name, code: err?.code })
    return res.status(500).json({ ok: false, message: 'Something went wrong.' })
  })

  return app
}
