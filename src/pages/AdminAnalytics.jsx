import { useEffect, useMemo, useState } from 'react'
import { adminFetch } from '../lib/adminApi.js'

const RANGES = [
  { id: '1d', label: '24 hours', days: 1 },
  { id: '7d', label: '7 days', days: 7 },
  { id: '15d', label: '15 days', days: 15 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '3 months', days: 90 },
]
// Validated categorical slots 1-2 (dataviz palette): visitors, page views.
const SERIES = [
  { key: 'visitors', label: 'Visitors', color: '#2a78d6' },
  { key: 'views', label: 'Page views', color: '#eb6834' },
]
const TILES = [
  { key: 'visitors', label: 'Visitors' },
  { key: 'views', label: 'Page views' },
  { key: 'avgTime', label: 'Avg. time on site', format: 'duration' },
  { key: 'resume_download', label: 'Résumé downloads' },
  { key: 'contact_submit', label: 'Contact form' },
  { key: 'email_click', label: 'Email clicks' },
  { key: 'linkedin_click', label: 'LinkedIn clicks' },
  { key: 'github_click', label: 'GitHub clicks' },
]

const nf = new Intl.NumberFormat('en-IN')
const countryName = (() => {
  const names = new Intl.DisplayNames(['en'], { type: 'region' })
  return (code) => {
    try {
      return code && code !== 'unknown' ? names.of(code.toUpperCase()) : 'Unknown'
    } catch {
      return code
    }
  }
})()
const duration = (s) => (s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`)

function withDerived(t) {
  if (!t) return {}
  return { ...t, avgTime: t.visitors ? Number(t.engaged_ms) / 1000 / t.visitors : 0 }
}

/** Every bucket in the range, zero-filled, in IST. */
function fillSeries(rows, days, hourly) {
  const byKey = new Map(rows.map((r) => [r.t, r]))
  const out = []
  const now = new Date()
  const steps = hourly ? 24 : days
  for (let i = steps - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * (hourly ? 3600_000 : 86_400_000))
    const ist = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const pad = (n) => String(n).padStart(2, '0')
    const day = `${ist.getFullYear()}-${pad(ist.getMonth() + 1)}-${pad(ist.getDate())}`
    const t = hourly ? `${day}T${pad(ist.getHours())}` : day
    const r = byKey.get(t)
    out.push({
      t,
      label: hourly
        ? ist.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true })
        : ist.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      visitors: r?.visitors ?? 0,
      views: r?.views ?? 0,
    })
  }
  return out
}

export default function AdminAnalytics() {
  const [range, setRange] = useState('7d')
  const [result, setResult] = useState({ range: null, data: null, error: '' })

  useEffect(() => {
    let cancelled = false
    adminFetch(`/stats?range=${range}`).then(
      (data) => !cancelled && setResult({ range, data, error: '' }),
      (err) => !cancelled && setResult({ range, data: null, error: err.message }),
    )
    return () => {
      cancelled = true
    }
  }, [range])

  const loading = result.range !== range
  const { data, error } = result
  const days = RANGES.find((r) => r.id === range).days
  const series = useMemo(() => (data ? fillSeries(data.series, days, data.hourly) : []), [data, days])
  const cur = withDerived(data?.current)
  const prev = withDerived(data?.previous)

  return (
    <section className="an" aria-labelledby="an-title" aria-busy={loading}>
      <div className="an__head">
        <h3 id="an-title" className="an__title">
          Site analytics
        </h3>
        <div className="an__ranges" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="adm-msg adm-msg--error" role="alert">
          {error}
        </p>
      )}

      <div className={`an__tiles ${loading ? 'is-loading' : ''}`}>
        {TILES.map((t) => (
          <Tile key={t.key} tile={t} value={cur[t.key]} previous={prev[t.key]} days={days} />
        ))}
      </div>

      <div className="an__card an__chart-card">
        <div className="an__card-head">
          <h4>Visitors and page views</h4>
          <ul className="an__legend" aria-label="Legend">
            {SERIES.map((s) => (
              <li key={s.key}>
                <span style={{ background: s.color }} aria-hidden="true" />
                {s.label}
              </li>
            ))}
          </ul>
        </div>
        <LineChart rows={series} />
        <details className="an__table">
          <summary>View as table</summary>
          <table>
            <thead>
              <tr>
                <th scope="col">{data?.hourly ? 'Hour' : 'Day'}</th>
                <th scope="col">Visitors</th>
                <th scope="col">Page views</th>
              </tr>
            </thead>
            <tbody>
              {series.map((r) => (
                <tr key={r.t}>
                  <th scope="row">{r.label}</th>
                  <td>{nf.format(r.visitors)}</td>
                  <td>{nf.format(r.views)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>

      <div className="an__lists">
        <BarList title="Top pages" rows={data?.pages} format={(k) => k} />
        <BarList title="Traffic sources" rows={data?.sources} format={(k) => k ?? 'direct'} />
        <BarList title="Countries" rows={data?.countries} format={countryName} />
        <BarList title="Devices" rows={data?.devices} format={(k) => (k ? k[0].toUpperCase() + k.slice(1) : '—')} />
      </div>
    </section>
  )
}

function Tile({ tile, value = 0, previous = 0, days }) {
  const shown = tile.format === 'duration' ? duration(value) : nf.format(value)
  let change = null
  if (previous > 0) {
    const pct = Math.round(((value - previous) / previous) * 100)
    change = { pct, up: pct >= 0 }
  } else if (value > 0) {
    change = { pct: null, up: true }
  }
  return (
    <div className="an__tile">
      <span className="an__tile-label">{tile.label}</span>
      <strong className="an__tile-value">{shown}</strong>
      <span className={`an__delta ${change && change.pct !== 0 ? (change.up ? 'is-up' : 'is-down') : ''}`}>
        {change ? (
          <>
            {change.pct !== 0 && <span aria-hidden="true">{change.up ? '↑' : '↓'}</span>}
            {change.pct === null ? 'New' : `${Math.abs(change.pct)}%`}
          </>
        ) : (
          '—'
        )}
        <span className="an__delta-ctx"> vs previous {days === 1 ? '24 hours' : `${days} days`}</span>
      </span>
    </div>
  )
}

/** Two series, one axis (both are counts). Crosshair + tooltip on hover. */
function LineChart({ rows }) {
  const [hover, setHover] = useState(null)
  const W = 720
  const H = 240
  const P = { l: 36, r: 12, t: 12, b: 28 }
  const max = Math.max(4, ...rows.flatMap((r) => [r.visitors, r.views]))
  const niceMax = Math.ceil(max / 4) * 4
  const x = (i) => P.l + (rows.length < 2 ? 0 : (i * (W - P.l - P.r)) / (rows.length - 1))
  const y = (v) => H - P.b - (v / niceMax) * (H - P.t - P.b)
  const path = (key) => rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[key]).toFixed(1)}`).join('')
  const ticks = [0, 1, 2, 3, 4].map((k) => (niceMax / 4) * k)
  const every = Math.max(1, Math.ceil(rows.length / 8))

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W
    const i = Math.round(((px - P.l) / (W - P.l - P.r)) * (rows.length - 1))
    setHover(Math.max(0, Math.min(rows.length - 1, i)))
  }

  if (!rows.length) return <div className="an__empty">No data yet.</div>
  const h = hover !== null ? rows[hover] : null
  return (
    <div className="an__chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Visitors and page views over time" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="an__grid" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" className="an__axis">
              {nf.format(t)}
            </text>
          </g>
        ))}
        {rows.map((r, i) =>
          i % every === 0 ? (
            <text key={r.t} x={x(i)} y={H - 8} textAnchor="middle" className="an__axis">
              {r.label}
            </text>
          ) : null,
        )}
        {SERIES.map((s) => (
          <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} className="an__cross" />
            {SERIES.map((s) => (
              <circle key={s.key} cx={x(hover)} cy={y(h[s.key])} r="4.5" fill={s.color} stroke="#fff" strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>
      {h && (
        <div className="an__tip" style={{ left: `${(x(hover) / W) * 100}%` }} role="status">
          <strong>{h.label}</strong>
          {SERIES.map((s) => (
            <span key={s.key}>
              <i style={{ background: s.color }} aria-hidden="true" />
              {s.label} <b>{nf.format(h[s.key])}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function BarList({ title, rows, format }) {
  const max = Math.max(1, ...(rows ?? []).map((r) => r.views))
  return (
    <div className="an__card">
      <div className="an__card-head">
        <h4>{title}</h4>
        <span className="an__muted">Views</span>
      </div>
      {rows?.length ? (
        <ul className="an__bars">
          {rows.map((r) => (
            <li key={r.key ?? 'none'} title={`${format(r.key)}: ${nf.format(r.views)} views, ${nf.format(r.visitors)} visitors`}>
              <span className="an__bar" style={{ width: `${(r.views / max) * 100}%` }} aria-hidden="true" />
              <span className="an__bar-label">{format(r.key)}</span>
              <span className="an__bar-value">{nf.format(r.views)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="an__empty">No data yet.</div>
      )}
    </div>
  )
}
