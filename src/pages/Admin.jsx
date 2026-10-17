import { useCallback, useEffect, useRef, useState } from 'react'
import Logo from '../components/Logo.jsx'
import Button from '../components/Button.jsx'
import { GOOGLE_CLIENT_ID } from '../../shared/admin.js'
import { ADMIN_API, AdminError, adminGet, tokenStore } from '../lib/adminApi.js'
import './Admin.css'

const GIS_SRC = 'https://accounts.google.com/gsi/client'

/** Load Google Identity Services once; resolves with window.google.accounts.id. */
function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id)
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => resolve(window.google.accounts.id)
    script.onerror = () => reject(new Error('Could not load Google sign-in.'))
    document.head.appendChild(script)
  })
}

const LINKS = [
  { label: 'Google Analytics', href: 'https://analytics.google.com/analytics/web/#/a412276736p559306424/reports/intelligenthome' },
  { label: 'Search Console', href: 'https://search.google.com/search-console?resource_id=https%3A%2F%2Fvinod-kumar.in%2F' },
  { label: 'Bing Webmaster', href: 'https://www.bing.com/webmasters?siteUrl=https%3A%2F%2Fvinod-kumar.in%2F' },
  { label: 'Hostinger', href: 'https://hpanel.hostinger.com/websites/vinod-kumar.in' },
  { label: 'Vercel', href: 'https://vercel.com/kings-international/vinod-kumar-portfolio' },
]

/**
 * /admin: Google sign-in for allow-listed accounts (shared/admin.js). The
 * server checks the Google ID token on every admin request; this page only
 * decides what to show. Not prerendered, noindex, outside the public layout.
 */
export default function Admin() {
  // signed-out | verifying | signed-in | error | unavailable
  const [state, setState] = useState(() => {
    if (!GOOGLE_CLIENT_ID || !ADMIN_API) return 'unavailable'
    return tokenStore.get() ? 'verifying' : 'signed-out'
  })
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const buttonRef = useRef(null)

  useEffect(() => {
    document.title = 'Admin · Vinod Kumar'
  }, [])

  const accept = useCallback((token, me) => {
    tokenStore.set(token)
    setUser(me)
    setState('signed-in')
  }, [])

  const reject = useCallback((err) => {
    tokenStore.clear()
    if (err instanceof AdminError && err.status === 401) {
      setState('signed-out')
    } else {
      setError(err.message)
      setState('error')
    }
  }, [])

  /** New Google sign-in: ask the server, which enforces the allow-list. */
  const verify = useCallback(
    (token) => {
      setState('verifying')
      adminGet('/me', token).then(({ user: me }) => accept(token, me), reject)
    },
    [accept, reject],
  )

  // Resume a sign-in from earlier in this tab.
  useEffect(() => {
    const saved = tokenStore.get()
    if (!saved || !GOOGLE_CLIENT_ID || !ADMIN_API) return undefined
    let cancelled = false
    adminGet('/me', saved).then(
      ({ user: me }) => !cancelled && accept(saved, me),
      (err) => !cancelled && reject(err),
    )
    return () => {
      cancelled = true
    }
  }, [accept, reject])

  // Render Google's button whenever the signed-out view is showing.
  useEffect(() => {
    if (state !== 'signed-out' && state !== 'error') return undefined
    let cancelled = false
    loadGoogleIdentity()
      .then((gis) => {
        if (cancelled || !buttonRef.current) return
        gis.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: ({ credential }) => verify(credential),
          auto_select: false,
          use_fedcm_for_prompt: true,
        })
        gis.renderButton(buttonRef.current, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill' })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [state, verify])

  const signOut = () => {
    tokenStore.clear()
    window.google?.accounts?.id?.disableAutoSelect()
    setUser(null)
    setState('signed-out')
  }

  return (
    <div className="admin">
      <header className="admin__bar">
        <Logo to="/" size={36} />
        {state === 'signed-in' && (
          <div className="admin__who">
            <span>
              {user.name || user.email}
              <span className="admin__email">{user.email}</span>
            </span>
            <Button variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          </div>
        )}
      </header>

      <main className="admin__main" id="main">
        {state === 'signed-in' ? (
          <Dashboard />
        ) : (
          <section className="admin__card" aria-labelledby="admin-title">
            <p className="mono-label admin__eyebrow">Admin</p>
            <h1 id="admin-title" className="admin__title">
              Sign in to manage your portfolio
            </h1>
            {state === 'unavailable' && (
              <p className="admin__text">Admin sign-in isn&apos;t configured on this deployment yet.</p>
            )}
            {state === 'verifying' && (
              <p className="admin__text" role="status">
                Checking your sign-in…
              </p>
            )}
            {(state === 'signed-out' || state === 'error') && (
              <>
                <p className="admin__text">Only the site owner&apos;s Google account can sign in here.</p>
                {state === 'error' && (
                  <p className="admin__error" role="alert">
                    {error}
                  </p>
                )}
                <div className="admin__google" ref={buttonRef} />
              </>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

function Dashboard() {
  return (
    <div className="admin__dash">
      <h1 className="admin__title">Dashboard</h1>
      <div className="admin__grid">
        <section className="admin__card">
          <h2 className="admin__card-title">Inquiries</h2>
          <p className="admin__text">Contact form messages will be listed here. Coming next.</p>
        </section>
        <section className="admin__card">
          <h2 className="admin__card-title">Projects</h2>
          <p className="admin__text">Add and edit projects and case studies. Coming next.</p>
        </section>
        <section className="admin__card">
          <h2 className="admin__card-title">Tools</h2>
          <ul className="admin__links" role="list">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer">
                  {l.label}
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
