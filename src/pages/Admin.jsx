import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { LogoMark } from '../components/Logo.jsx'
import { site } from '../data/site.js'
import { GOOGLE_CLIENT_ID } from '../../shared/admin.js'
import { ADMIN_API, adminFetch, session } from '../lib/adminApi.js'
import { markOwner } from '../lib/pulse.js'
import AdminAnalytics from './AdminAnalytics.jsx'
import './Admin.css'

/**
 * /admin and /admin/set-password. Sign-in by email + password or Google; the
 * server (server/admin.js) enforces the allow-list and owns the session.
 * Not prerendered, noindex, outside the public layout, never tracked.
 */
export default function Admin() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = 'Admin · Vinod Kumar'
  }, [])
  if (!ADMIN_API) {
    return (
      <AuthScreen title="Admin unavailable" subtitle="Sign-in isn't available on this copy of the site.">
        <a className="adm-link" href="https://vinod-kumar.in/admin/">
          Go to vinod-kumar.in/admin
        </a>
      </AuthScreen>
    )
  }
  return pathname.startsWith('/admin/set-password') ? <SetPassword /> : <AdminHome />
}

function AdminHome() {
  // checking | signed-out | signed-in
  const [state, setState] = useState(() => (session.get() ? 'checking' : 'signed-out'))
  const [user, setUser] = useState(null)

  const signedIn = useCallback((token, me) => {
    session.set(token)
    markOwner()
    setUser(me)
    setState('signed-in')
  }, [])

  // Resume this tab's session.
  useEffect(() => {
    const token = session.get()
    if (!token) return undefined
    let cancelled = false
    adminFetch('/me', { token }).then(
      ({ user: me }) => !cancelled && signedIn(token, me),
      () => {
        if (cancelled) return
        session.clear()
        setState('signed-out')
      },
    )
    return () => {
      cancelled = true
    }
  }, [signedIn])

  const signOut = async () => {
    await adminFetch('/logout', { method: 'POST' }).catch(() => {})
    session.clear()
    window.google?.accounts?.id?.disableAutoSelect()
    setUser(null)
    setState('signed-out')
  }

  if (state === 'checking') return <AuthScreen title="One moment…" subtitle="Checking your session." />
  if (state === 'signed-out') return <Login onSignedIn={signedIn} />
  return <Dashboard user={user} onSignOut={signOut} />
}

/* ---------------------------------------------------------------- Sign in */

function Login({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setError('')
    setNotice('')
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setBusy(true)
    try {
      const { token, user } = await adminFetch('/login', { method: 'POST', body: { email, password }, token: null })
      onSignedIn(token, user)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const forgot = async () => {
    setError('')
    setNotice('')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter your email above first, then choose "Forgot password?".')
      return
    }
    try {
      const { message } = await adminFetch('/password/request', { method: 'POST', body: { email }, token: null })
      setNotice(message)
    } catch (err) {
      setError(err.message)
    }
  }

  const google = useCallback(
    async (credential) => {
      setError('')
      try {
        const { token, user } = await adminFetch('/google', { method: 'POST', body: { credential }, token: null })
        onSignedIn(token, user)
      } catch (err) {
        setError(err.message)
      }
    },
    [onSignedIn],
  )

  return (
    <AuthScreen title="Good to see you." subtitle="Sign in to your portfolio admin.">
      <form className="adm-form" onSubmit={submit} noValidate>
        <Field
          label="Email"
          icon={<MailIcon />}
          type="email"
          autoComplete="username"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          label="Password"
          aside={
            <button type="button" className="adm-textbtn" onClick={forgot}>
              Forgot password?
            </button>
          }
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="adm-msg adm-msg--error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="adm-msg adm-msg--ok" role="status">
            {notice}
          </p>
        )}
        <button className="adm-primary" type="submit" aria-disabled={busy || undefined}>
          {busy ? 'Signing in…' : 'Sign in'} <ArrowIcon />
        </button>
      </form>
      <div className="adm-or" role="separator">
        <span>or</span>
      </div>
      <GoogleButton onCredential={google} />
      <p className="adm-foot">
        First time? Enter your email and choose <strong>Forgot password?</strong> to set one.
      </p>
    </AuthScreen>
  )
}

/* ---------------------------------------------------------- Set password */

function SetPassword() {
  const navigate = useNavigate()
  const token = new URLSearchParams(window.location.search).get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setError('')
    if (password.length < 12) return setError('Use at least 12 characters.')
    if (password !== confirm) return setError("The two passwords don't match.")
    setBusy(true)
    try {
      await adminFetch('/password/set', { method: 'POST', body: { token, password }, token: null })
      setDone(true)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <AuthScreen title="Link missing" subtitle="Open the link from your email, or request a new one.">
        <button className="adm-primary" type="button" onClick={() => navigate('/admin')}>
          Back to sign in <ArrowIcon />
        </button>
      </AuthScreen>
    )
  }
  if (done) {
    return (
      <AuthScreen title="Password set." subtitle="You can sign in with your email and new password.">
        <button className="adm-primary" type="button" onClick={() => navigate('/admin')}>
          Go to sign in <ArrowIcon />
        </button>
      </AuthScreen>
    )
  }
  return (
    <AuthScreen title="Set your password" subtitle="At least 12 characters. A short sentence works well.">
      <form className="adm-form" onSubmit={submit} noValidate>
        <PasswordField
          label="New password"
          autoComplete="new-password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Type it again"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && (
          <p className="adm-msg adm-msg--error" role="alert">
            {error}
          </p>
        )}
        <button className="adm-primary" type="submit" aria-disabled={busy || undefined}>
          {busy ? 'Saving…' : 'Set password'} <ArrowIcon />
        </button>
      </form>
    </AuthScreen>
  )
}

/* ------------------------------------------------------------- Dashboard */

const NAV = [
  { label: 'Home', icon: <HomeIcon />, active: true },
  { label: 'Inquiries', icon: <InboxIcon /> },
  { label: 'Projects', icon: <FolderIcon /> },
]

function greeting(date) {
  const h = date.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function Dashboard({ user, onSignOut }) {
  const now = new Date()
  const name = user.name || site.name
  const first = name.split(' ')[0]
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="adm-app">
      <aside className="adm-side">
        <a className="adm-brand" href="/" aria-label={`${site.name}, view site`}>
          <LogoMark size={30} />
          <span>{site.name}</span>
        </a>
        <nav className="adm-nav" aria-label="Admin">
          {NAV.map((n) =>
            n.active ? (
              <span key={n.label} className="adm-nav__item is-active" aria-current="page">
                {n.icon}
                {n.label}
              </span>
            ) : (
              <span key={n.label} className="adm-nav__item is-soon" aria-disabled="true">
                {n.icon}
                {n.label}
                <em>Soon</em>
              </span>
            ),
          )}
        </nav>
        <div className="adm-user">
          <span className="adm-avatar" aria-hidden="true">
            {initials}
          </span>
          <span className="adm-user__text">
            <strong>{name}</strong>
            <span>{user.email}</span>
          </span>
          <button type="button" className="adm-iconbtn" onClick={onSignOut} aria-label="Sign out" title="Sign out">
            <LogoutIcon />
          </button>
        </div>
      </aside>

      <div className="adm-content">
        <header className="adm-top">
          <span className="adm-top__icon" aria-hidden="true">
            <HomeIcon />
          </span>
          <h1 className="adm-top__title">Dashboard</h1>
        </header>
        <main className="adm-main" id="main">
          <p className="adm-date">
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h2 className="adm-hello">
            {greeting(now)}, {first}
          </h2>
          <p className="adm-sub">Portfolio admin · vinod-kumar.in</p>
          <AdminAnalytics />
        </main>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Building blocks */

function AuthScreen({ title, subtitle, children }) {
  return (
    <div className="adm-auth">
      <main className="adm-card" id="main">
        <a className="adm-logo" href="/" aria-label={`${site.name}, view site`}>
          <LogoMark size={44} />
          <span>{site.name}</span>
        </a>
        <h1 className="adm-title">{title}</h1>
        <p className="adm-subtitle">{subtitle}</p>
        {children}
      </main>
      <p className="adm-legal">
        © {new Date().getFullYear()} {site.name} · <a href="/">vinod-kumar.in</a>
      </p>
    </div>
  )
}

function Field({ label, icon, aside, ...input }) {
  const id = `adm-${label.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <div className="adm-field">
      <div className="adm-field__row">
        <label htmlFor={id}>{label}</label>
        {aside}
      </div>
      <div className="adm-input">
        <span className="adm-input__icon" aria-hidden="true">
          {icon}
        </span>
        <input id={id} {...input} />
      </div>
    </div>
  )
}

function PasswordField({ label, aside, ...input }) {
  const [shown, setShown] = useState(false)
  const id = `adm-${label.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <div className="adm-field">
      <div className="adm-field__row">
        <label htmlFor={id}>{label}</label>
        {aside}
      </div>
      <div className="adm-input">
        <span className="adm-input__icon" aria-hidden="true">
          <LockIcon />
        </span>
        <input id={id} type={shown ? 'text' : 'password'} {...input} />
        <button
          type="button"
          className="adm-input__eye"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
        >
          {shown ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  )
}

/** Google's own button (required for ID-token sign-in), sized to the card. */
function GoogleButton({ onCredential }) {
  const ref = useRef(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined
    let cancelled = false
    const ready = window.google?.accounts?.id
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://accounts.google.com/gsi/client'
          s.async = true
          s.onload = resolve
          s.onerror = reject
          document.head.appendChild(s)
        })
    ready.then(
      () => {
        if (cancelled || !ref.current) return
        const gis = window.google.accounts.id
        gis.initialize({ client_id: GOOGLE_CLIENT_ID, callback: ({ credential }) => onCredential(credential), use_fedcm_for_prompt: true })
        gis.renderButton(ref.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          width: Math.min(ref.current.offsetWidth || 340, 400),
        })
      },
      () => !cancelled && setFailed(true),
    )
    return () => {
      cancelled = true
    }
  }, [onCredential])
  if (!GOOGLE_CLIENT_ID || failed) return null
  return <div className="adm-google" ref={ref} />
}

/* ----------------------------------------------------------------- Icons */

const svg = (d, extra) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...extra}>
    {d}
  </svg>
)
function MailIcon() {
  return svg(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>)
}
function LockIcon() {
  return svg(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>)
}
function EyeIcon() {
  return svg(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>)
}
function EyeOffIcon() {
  return svg(<><path d="M3 3l18 18" /><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>)
}
function ArrowIcon() {
  return svg(<path d="M5 12h14m-6-6 6 6-6 6" />, { width: 16, height: 16 })
}
function HomeIcon() {
  return svg(<><path d="m3 11 9-7 9 7" /><path d="M5 10v10h14V10" /></>)
}
function InboxIcon() {
  return svg(<><path d="M3 13h5l2 3h4l2-3h5" /><path d="M5 5h14l2 8v6H3v-6Z" /></>)
}
function FolderIcon() {
  return svg(<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />)
}
function LogoutIcon() {
  return svg(<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="m10 16-4-4 4-4M6 12h10" /></>)
}

