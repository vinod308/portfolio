// Reads and validates server configuration from environment variables.
// Values are never logged; errors list variable *names* only.

export class ConfigError extends Error {
  constructor(problems) {
    super(`Invalid server configuration: ${problems.join('; ')}`)
    this.problems = problems
  }
}

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/

/** Accepts "user@example.com" or "Name <user@example.com>". */
function isMailbox(value) {
  const m = value.match(/^(?:[^<>]*<)?([^<>\s]+)>?$/)
  return Boolean(m && EMAIL_RE.test(m[1]))
}

const bool = (v, fallback) => {
  if (v === undefined || v === '') return fallback
  if (/^(true|1|yes)$/i.test(v)) return true
  if (/^(false|0|no)$/i.test(v)) return false
  return null
}

const int = (v, fallback) => {
  if (v === undefined || v === '') return fallback
  const n = Number(v)
  return Number.isInteger(n) && n >= 0 ? n : null
}

export function readConfig(env = process.env) {
  const problems = []
  const get = (k) => (typeof env[k] === 'string' ? env[k].trim() : undefined)
  const required = (k) => {
    const v = get(k)
    if (!v) problems.push(`${k} is required`)
    return v
  }

  const isProduction = get('NODE_ENV') === 'production'
  const mailTransport = (get('MAIL_TRANSPORT') || 'smtp').toLowerCase()
  if (!['smtp', 'log'].includes(mailTransport)) problems.push('MAIL_TRANSPORT must be "smtp" or "log"')
  if (mailTransport === 'log' && isProduction) problems.push('MAIL_TRANSPORT=log is not allowed when NODE_ENV=production')

  const smtp = { host: undefined, port: 587, secure: false, requireTLS: true, user: undefined, pass: undefined }
  if (mailTransport === 'smtp') {
    smtp.host = required('SMTP_HOST')
    smtp.port = int(get('SMTP_PORT'), 587)
    if (smtp.port === null || smtp.port === 0 || smtp.port > 65535) problems.push('SMTP_PORT must be a port number')
    smtp.secure = bool(get('SMTP_SECURE'), smtp.port === 465)
    if (smtp.secure === null) problems.push('SMTP_SECURE must be true or false')
    // Without implicit TLS, insist on STARTTLS so credentials are never sent in clear text.
    smtp.requireTLS = bool(get('SMTP_REQUIRE_TLS'), !smtp.secure)
    if (smtp.requireTLS === null) problems.push('SMTP_REQUIRE_TLS must be true or false')
    smtp.user = required('SMTP_USER')
    smtp.pass = required('SMTP_PASS')
  }

  const mailFrom = mailTransport === 'smtp' ? required('MAIL_FROM') : get('MAIL_FROM') || 'Portfolio <portfolio@localhost.test>'
  if (mailFrom && !isMailbox(mailFrom)) problems.push('MAIL_FROM must be an address like "Portfolio <you@example.com>"')
  const mailTo = get('MAIL_TO') || 'vinodvinni308@gmail.com'
  if (!isMailbox(mailTo)) problems.push('MAIL_TO must be an email address')

  const port = int(get('PORT'), 3001)
  if (port === null || port > 65535) problems.push('PORT must be a port number')

  const clientOrigins = (get('CLIENT_ORIGIN') || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean)
  for (const o of clientOrigins) {
    if (!/^https?:\/\/[^/\s]+$/.test(o)) problems.push(`CLIENT_ORIGIN entry "${o}" must be an origin like https://example.com`)
  }

  // "false" | "true" | hop count | comma list of subnets, passed to Express.
  const tp = get('TRUST_PROXY')
  let trustProxy = false
  if (tp) trustProxy = bool(tp, null) ?? (int(tp, null) ?? tp)

  const rateWindowMin = int(get('RATE_LIMIT_WINDOW_MIN'), 15)
  const rateMax = int(get('RATE_LIMIT_MAX'), 5)
  if (!rateWindowMin) problems.push('RATE_LIMIT_WINDOW_MIN must be a positive integer')
  if (!rateMax) problems.push('RATE_LIMIT_MAX must be a positive integer')

  const serveStatic = bool(get('SERVE_STATIC'), false)
  const verifyOnStart = bool(get('SMTP_VERIFY_ON_START'), true)
  if (serveStatic === null) problems.push('SERVE_STATIC must be true or false')
  if (verifyOnStart === null) problems.push('SMTP_VERIFY_ON_START must be true or false')

  if (problems.length) throw new ConfigError(problems)

  return {
    isProduction,
    mailTransport,
    smtp,
    mailFrom,
    mailTo,
    port,
    clientOrigins,
    trustProxy,
    rateLimit: { windowMs: rateWindowMin * 60_000, max: rateMax },
    serveStatic,
    verifyOnStart,
    // Neon Postgres for admin sign-in (optional; admin answers 503 without it).
    databaseUrl: get('DATABASE_URL') || null,
  }
}
