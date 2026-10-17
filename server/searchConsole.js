// Google Search Console data for the admin dashboard, with no stored key:
// Vercel's OIDC token -> Google STS (workload identity federation) ->
// short-lived token for the read-only service account -> Search Analytics.
// Google Cloud project "vinod-kumar-portfolio" only trusts the production
// deployment of the Vercel project vinod-kumar-portfolio (see the provider's
// attribute condition). All values below are identifiers, not secrets.
import { getVercelOidcToken } from '@vercel/oidc'

const GCP = {
  projectNumber: '64296510660',
  pool: 'vercel',
  provider: 'vercel',
  serviceAccount: 'search-console-reader@vinod-kumar-portfolio.iam.gserviceaccount.com',
}
const SITE = 'https://vinod-kumar.in/'
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

let cached = { token: null, expires: 0 }

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(`google_${res.status}`), { code: data?.error?.status || res.status })
  return data
}

async function accessToken() {
  if (cached.token && cached.expires > Date.now() + 60_000) return cached.token
  const subject = await getVercelOidcToken()
  const audience = `//iam.googleapis.com/projects/${GCP.projectNumber}/locations/global/workloadIdentityPools/${GCP.pool}/providers/${GCP.provider}`
  const sts = await postJson('https://sts.googleapis.com/v1/token', {
    grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
    audience,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
    subjectToken: subject,
    subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
  })
  const sa = await postJson(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP.serviceAccount}:generateAccessToken`,
    { scope: [SCOPE], lifetime: '3600s' },
    { Authorization: `Bearer ${sts.access_token}` },
  )
  cached = { token: sa.accessToken, expires: new Date(sa.expireTime).getTime() }
  return cached.token
}

const isoDay = (d) => d.toISOString().slice(0, 10)
const daysAgo = (n) => isoDay(new Date(Date.now() - n * 86_400_000))

async function query(token, body) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`
  const data = await postJson(url, body, { Authorization: `Bearer ${token}` })
  return data.rows ?? []
}

const totalsOf = (rows) => {
  const r = rows[0]
  return r
    ? { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }
    : { clicks: 0, impressions: 0, ctr: 0, position: 0 }
}

/** Totals for the range and the one before it, plus top queries and pages. */
export async function searchStats(days) {
  const token = await accessToken()
  // Search Console data lags by about two days; a 1-day range still reads the latest day.
  const span = Math.max(days, 1)
  const range = (from, to) => ({ startDate: daysAgo(from), endDate: daysAgo(to) })
  const [current, previous, queries, pages] = await Promise.all([
    query(token, { ...range(span, 0) }),
    query(token, { ...range(span * 2, span + 1) }),
    query(token, { ...range(span, 0), dimensions: ['query'], rowLimit: 10 }),
    query(token, { ...range(span, 0), dimensions: ['page'], rowLimit: 5 }),
  ])
  const list = (rows) => rows.map((r) => ({ key: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: r.position }))
  return { current: totalsOf(current), previous: totalsOf(previous), queries: list(queries), pages: list(pages) }
}
