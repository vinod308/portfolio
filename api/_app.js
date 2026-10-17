// Shared Vercel Function handler (not a route itself: Vercel skips files that
// start with "_"). api/contact.js and api/admin/*.js re-export it. It wraps the
// same Express app the standalone server uses (server/app.js), so validation,
// rate limiting, email delivery and admin sign-in behave identically.
//
// Configuration comes from the project's environment variables (Vercel
// dashboard or `vercel env`). Until SMTP is configured the function answers
// 503 instead of crashing, and the frontend shows its retry/email fallback.
import { readConfig, ConfigError } from '../server/config.js'
import { createTransport } from '../server/mailer.js'
import { createApp, consoleLogger as log } from '../server/app.js'

/** Same-origin requests carry the site's own Origin; allow Vercel's URLs by default. */
function withVercelDefaults(env) {
  const out = { ...env }
  if (!out.CLIENT_ORIGIN) {
    const hosts = [env.VERCEL_PROJECT_PRODUCTION_URL, env.VERCEL_BRANCH_URL, env.VERCEL_URL].filter(Boolean)
    if (hosts.length) out.CLIENT_ORIGIN = [...new Set(hosts)].map((h) => `https://${h}`).join(',')
  }
  // Vercel's edge sets X-Forwarded-For; trust one hop so rate limiting sees the client IP.
  if (!out.TRUST_PROXY) out.TRUST_PROXY = '1'
  // Serverless: no startup verify (it would run on every cold start).
  out.SMTP_VERIFY_ON_START = 'false'
  return out
}

let app
let configProblems = null
try {
  const config = readConfig(withVercelDefaults(process.env))
  app = createApp({ config, transport: createTransport(config, log), logger: log })
} catch (err) {
  if (!(err instanceof ConfigError)) throw err
  configProblems = err.problems
  log.error({ event: 'config_invalid', problems: err.problems })
}

export default function handler(req, res) {
  if (!app) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    return res.end(JSON.stringify({ ok: false, message: 'The contact form is temporarily unavailable.' }))
  }
  return app(req, res)
}

// Exposed for tests only; never sent to clients.
export const _configProblems = () => configProblems
