// First-party, cookieless analytics.
//
// POST /api/pulse (text/plain JSON via navigator.sendBeacon) records page
// views, engaged time and key clicks. No cookies, no IP addresses stored:
// a visitor is sha256(daily random salt + IP + user agent), and each day's
// salt is deleted after two days, so IDs can't be linked across days or
// reversed. GET /api/admin/stats (server/admin.js) reads the aggregates.
import { createHash, randomBytes } from 'node:crypto'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { neon } from '@neondatabase/serverless'

export const EVENTS = ['resume_download', 'contact_submit', 'email_click', 'linkedin_click', 'github_click']
export const RANGES = { '1d': 1, '7d': 7, '15d': 15, '30d': 30, '90d': 90 }
const TZ = 'Asia/Kolkata'
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|curl|wget|python|axios|node-fetch/i

/** Where a visit came from, from the referrer and utm_source. */
export function sourceOf(referrer, utm, siteHost) {
  if (utm) return utm.toLowerCase().slice(0, 40)
  let host
  try {
    host = new URL(referrer).hostname.replace(/^www\./, '')
  } catch {
    return 'direct'
  }
  if (!host || host === siteHost) return 'direct'
  if (/(^|\.)google\./.test(host)) return 'google'
  if (/linkedin\.com$|lnkd\.in$/.test(host)) return 'linkedin'
  if (/github\.com$/.test(host)) return 'github'
  if (/bing\.com$/.test(host)) return 'bing'
  if (/(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google)/.test(host)) return 'ai assistants'
  if (/(t\.co|twitter\.com|x\.com)$/.test(host)) return 'x'
  if (/(facebook|instagram|whatsapp)\./.test(host)) return 'meta'
  return host.slice(0, 60)
}

export const deviceOf = (width) => (width < 768 ? 'mobile' : width < 1100 ? 'tablet' : 'desktop')

/** Validate a beacon body; returns a clean event or null. */
export function parsePulse(raw) {
  let b
  try {
    b = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
  if (!b || typeof b !== 'object') return null
  const path = typeof b.path === 'string' && /^\/[\w\-./]{0,200}$/.test(b.path) ? b.path : null
  if (!path || path.startsWith('/admin')) return null
  if (b.type === 'view') {
    return {
      type: 'view',
      path,
      referrer: typeof b.referrer === 'string' ? b.referrer.slice(0, 300) : '',
      utm: typeof b.utm === 'string' ? b.utm.replace(/[^\w.-]/g, '') : '',
      width: Number.isFinite(b.width) ? b.width : 1280,
    }
  }
  if (b.type === 'engage' && Number.isFinite(b.ms) && b.ms > 0) {
    return { type: 'engage', path, value: Math.min(Math.round(b.ms), 30 * 60_000) }
  }
  if (b.type === 'event' && EVENTS.includes(b.name)) return { type: 'event', path, name: b.name }
  return null
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS analytics_events (
     id bigserial PRIMARY KEY,
     ts timestamptz NOT NULL DEFAULT now(),
     visitor text NOT NULL,
     type text NOT NULL,
     name text,
     path text NOT NULL,
     source text,
     country text,
     device text,
     value integer)`,
  'CREATE INDEX IF NOT EXISTS analytics_events_ts ON analytics_events (ts)',
  `CREATE TABLE IF NOT EXISTS analytics_salts (day date PRIMARY KEY, salt text NOT NULL)`,
]

/** Neon-backed analytics store. Tables are created on first use. */
export function createAnalyticsStore(databaseUrl) {
  const sql = neon(databaseUrl)
  let ready
  const init = () => (ready ??= (async () => { for (const q of SCHEMA) await sql.query(q) })())

  async function saltFor(day) {
    await init()
    const rows = await sql`INSERT INTO analytics_salts (day, salt) VALUES (${day}, ${randomBytes(16).toString('hex')})
                           ON CONFLICT (day) DO UPDATE SET day = EXCLUDED.day RETURNING salt`
    await sql`DELETE FROM analytics_salts WHERE day < ${day}::date - 1`
    return rows[0].salt
  }

  return {
    async visitorId(ip, ua) {
      const day = new Date().toLocaleDateString('en-CA', { timeZone: TZ })
      return createHash('sha256').update(`${await saltFor(day)}|${ip}|${ua}`).digest('hex').slice(0, 32)
    },
    async record(e) {
      await init()
      await sql`INSERT INTO analytics_events (visitor, type, name, path, source, country, device, value)
                VALUES (${e.visitor}, ${e.type}, ${e.name ?? null}, ${e.path}, ${e.source ?? null},
                        ${e.country ?? null}, ${e.device ?? null}, ${e.value ?? null})`
    },
    async stats(days) {
      await init()
      const hourly = days === 1
      const totals = (from, to) => sql`
        SELECT count(DISTINCT visitor) FILTER (WHERE type = 'view')::int AS visitors,
               count(*) FILTER (WHERE type = 'view')::int AS views,
               coalesce(sum(value) FILTER (WHERE type = 'engage'), 0)::bigint AS engaged_ms,
               ${sql.unsafe(EVENTS.map((n) => `count(*) FILTER (WHERE type = 'event' AND name = '${n}')::int AS ${n}`).join(', '))}
        FROM analytics_events
        WHERE ts >= now() - make_interval(days => ${from}) AND ts < now() - make_interval(days => ${to})`
      const top = (col, limit) => sql`
        SELECT ${sql.unsafe(col)} AS key, count(*)::int AS views, count(DISTINCT visitor)::int AS visitors
        FROM analytics_events
        WHERE type = 'view' AND ts >= now() - make_interval(days => ${days})
        GROUP BY 1 ORDER BY views DESC LIMIT ${limit}`
      const bucket = hourly ? 'hour' : 'day'
      const [current, previous, series, pages, sources, countries, devices] = await Promise.all([
        totals(days, 0),
        totals(days * 2, days),
        sql`
          SELECT to_char(date_trunc(${bucket}, ts AT TIME ZONE ${TZ}), ${hourly ? 'YYYY-MM-DD"T"HH24' : 'YYYY-MM-DD'}) AS t,
                 count(DISTINCT visitor)::int AS visitors, count(*)::int AS views
          FROM analytics_events
          WHERE type = 'view' AND ts >= now() - make_interval(days => ${days})
          GROUP BY 1 ORDER BY 1`,
        top('path', 10),
        top('source', 8),
        top('country', 8),
        top('device', 3),
      ])
      return { current: current[0], previous: previous[0], series, pages, sources, countries, devices, hourly }
    },
  }
}

/** POST /pulse router. Always answers 204 so the beacon never retries. */
export function pulseRouter({ store, config, logger }) {
  const router = express.Router()
  const siteHost = new URL(config.clientOrigins[0]).hostname
  router.use(
    rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: false, legacyHeaders: false, handler: (req, res) => res.status(204).end() }),
  )
  router.post('/', express.text({ type: '*/*', limit: '2kb' }), async (req, res) => {
    const ua = req.get('user-agent') || ''
    const e = store && !BOT_RE.test(ua) ? parsePulse(req.body) : null
    if (!e) return res.status(204).end()
    // Record before answering: serverless functions may pause after the response.
    try {
      const visitor = await store.visitorId(req.ip, ua)
      await store.record({
        ...e,
        visitor,
        source: e.type === 'view' ? sourceOf(e.referrer, e.utm, siteHost) : null,
        country: e.type === 'view' ? (req.get('x-vercel-ip-country') || 'unknown').slice(0, 2) : null,
        device: e.type === 'view' ? deviceOf(e.width) : null,
      })
    } catch (err) {
      logger.error({ event: 'pulse_failed', code: err?.code })
    }
    res.status(204).end()
  })
  return router
}
