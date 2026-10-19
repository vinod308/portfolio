import { useEffect, useState } from 'react'
import { adminFetch } from '../lib/adminApi.js'

const TABS = [
  { id: '', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'replied', label: 'Replied' },
  { id: 'archived', label: 'Archived' },
]

const when = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })

function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`
  if (s < 86_400) return `${Math.round(s / 3600)}h ago`
  if (s < 7 * 86_400) return `${Math.round(s / 86_400)}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** /admin/inquiries: contact form messages, newest first. */
export default function AdminInquiries({ onCounts }) {
  const [tab, setTab] = useState('')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [state, setState] = useState({ key: null, items: [], counts: null, error: '' })
  const [selectedId, setSelectedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const key = `${tab}|${query}`

  // Search 300 ms after typing stops.
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ ...(tab && { status: tab }), ...(query && { q: query }) })
    adminFetch(`/inquiries?${params}`).then(
      ({ items, counts }) => {
        if (cancelled) return
        setState({ key, items, counts, error: '' })
        onCounts?.(counts)
      },
      (err) => !cancelled && setState((s) => ({ ...s, key, error: err.message })),
    )
    return () => {
      cancelled = true
    }
  }, [key, tab, query, onCounts])

  const loading = state.key !== key
  const selected = state.items.find((i) => i.id === selectedId) ?? null

  const setStatus = async (item, status) => {
    setBusy(true)
    try {
      const { item: updated } = await adminFetch(`/inquiries/${item.id}`, { method: 'PATCH', body: { status } })
      setState((s) => {
        const counts = { ...s.counts, [item.status]: s.counts[item.status] - 1, [status]: s.counts[status] + 1 }
        onCounts?.(counts)
        const items = tab && tab !== status ? s.items.filter((i) => i.id !== item.id) : s.items.map((i) => (i.id === item.id ? updated : i))
        return { ...s, items, counts }
      })
      if (tab && tab !== status) setSelectedId(null)
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }))
    }
    setBusy(false)
  }

  const total = state.counts ? Object.values(state.counts).reduce((a, b) => a + b, 0) : 0

  return (
    <section className="inq" aria-busy={loading}>
      <div className="inq__bar">
        <div className="an__ranges" role="group" aria-label="Filter by status">
          {TABS.map((t) => (
            <button key={t.id || 'all'} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
              {state.counts && <span className="inq__count">{t.id ? state.counts[t.id] : total}</span>}
            </button>
          ))}
        </div>
        <label className="inq__search">
          <span className="visually-hidden">Search inquiries</span>
          <input type="search" placeholder="Search name, email, phone or message" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {state.error && (
        <p className="adm-msg adm-msg--error" role="alert">
          {state.error}
        </p>
      )}

      <div className="inq__layout">
        <ul className="inq__list" aria-label="Inquiries">
          {state.items.length === 0 && !loading && (
            <li className="an__empty">{query || tab ? 'No inquiries match.' : 'No inquiries yet. Messages from the contact form will appear here.'}</li>
          )}
          {state.items.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                className={`inq__row ${i.id === selectedId ? 'is-selected' : ''} ${i.status === 'new' ? 'is-new' : ''}`}
                onClick={() => setSelectedId(i.id)}
                aria-current={i.id === selectedId || undefined}
              >
                <span className="inq__row-top">
                  <strong>
                    {i.firstName} {i.lastName}
                  </strong>
                  <span className="inq__time">{ago(i.createdAt)}</span>
                </span>
                <span className="inq__row-mail">{i.email}</span>
                <span className="inq__row-msg">{i.message}</span>
                <span className={`inq__pill is-${i.status}`}>{i.status}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="inq__detail an__card">
          {selected ? (
            <Detail item={selected} busy={busy} onStatus={(s) => setStatus(selected, s)} />
          ) : (
            <div className="an__empty">Select an inquiry to read it.</div>
          )}
        </div>
      </div>
    </section>
  )
}

function Detail({ item, busy, onStatus }) {
  const digits = item.phone.replace(/\D/g, '')
  const tel = `tel:${item.phone.startsWith('+') ? '+' : ''}${digits}`
  const mailto = `mailto:${item.email}?subject=${encodeURIComponent('Re: your message on vinod-kumar.in')}`
  return (
    <article className="inq__article">
      <header className="inq__article-head">
        <div>
          <h3>
            {item.firstName} {item.lastName}
          </h3>
          <p className="an__muted">
            {when(item.createdAt)}
            {!item.emailed && ' · email notification failed'}
          </p>
        </div>
        <span className={`inq__pill is-${item.status}`}>{item.status}</span>
      </header>
      <dl className="inq__facts">
        <dt>First name</dt>
        <dd>{item.firstName}</dd>
        <dt>Last name</dt>
        <dd>{item.lastName}</dd>
        <dt>Email</dt>
        <dd>
          <a href={mailto}>{item.email}</a>
        </dd>
        <dt>Phone</dt>
        <dd>{item.phone ? <a href={tel}>{item.phone}</a> : 'Not given'}</dd>
      </dl>
      <p className="inq__message">{item.message}</p>
      <div className="inq__actions">
        <a className="adm-primary inq__btn" href={mailto}>
          Reply by email
        </a>
        {item.phone && (
          <a className="inq__btn inq__btn--ghost" href={tel}>
            Call
          </a>
        )}
        {item.phone.startsWith('+') && (
          <a className="inq__btn inq__btn--ghost" href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        )}
      </div>
      <div className="inq__actions inq__actions--status">
        {item.status !== 'replied' && (
          <button type="button" className="inq__btn inq__btn--ghost" disabled={busy} onClick={() => onStatus('replied')}>
            Mark as replied
          </button>
        )}
        {item.status !== 'new' && (
          <button type="button" className="inq__btn inq__btn--ghost" disabled={busy} onClick={() => onStatus('new')}>
            Mark as new
          </button>
        )}
        {item.status !== 'archived' && (
          <button type="button" className="inq__btn inq__btn--ghost" disabled={busy} onClick={() => onStatus('archived')}>
            Archive
          </button>
        )}
      </div>
    </article>
  )
}
