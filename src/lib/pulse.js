// Cookieless first-party analytics (server/analytics.js): page views, engaged
// time and key clicks, sent with navigator.sendBeacon. Production builds on the
// primary site only; never /admin; never on a browser that has signed in to
// admin (the owner's own visits).
import { CONTACT_ENDPOINT } from './contact.js'

const ENDPOINT = CONTACT_ENDPOINT === 'none' ? null : CONTACT_ENDPOINT.replace(/\/api\/contact$/, '/api/pulse')
const OWNER_KEY = 'vk-owner'

function isOwner() {
  try {
    return window.localStorage.getItem(OWNER_KEY) === '1'
  } catch {
    return false
  }
}

/** Called on admin sign-in: stop counting this browser's visits. */
export function markOwner() {
  try {
    window.localStorage.setItem(OWNER_KEY, '1')
  } catch {
    // storage unavailable: nothing to remember
  }
}

const enabled = () =>
  import.meta.env.PROD && ENDPOINT && !window.location.pathname.startsWith('/admin') && !isOwner()

function send(data) {
  if (!enabled()) return
  const body = JSON.stringify({ path: window.location.pathname, ...data })
  // text/plain keeps the cross-origin beacon a "simple" request (no preflight).
  const blob = new Blob([body], { type: 'text/plain' })
  if (!navigator.sendBeacon?.(ENDPOINT, blob)) {
    fetch(ENDPOINT, { method: 'POST', body, keepalive: true, mode: 'no-cors' }).catch(() => {})
  }
}

export function pulseEvent(name) {
  send({ type: 'event', name })
}

// Engaged time: only while the tab is visible, reported when leaving a page.
let visibleSince = 0
let engagedMs = 0
let lastPath = null

function flushEngaged() {
  if (visibleSince) engagedMs += Date.now() - visibleSince
  visibleSince = document.visibilityState === 'visible' ? Date.now() : 0
  if (lastPath && engagedMs > 500) {
    const body = { type: 'engage', ms: engagedMs }
    // Attribute the time to the page it was spent on.
    if (enabled()) {
      navigator.sendBeacon?.(ENDPOINT, new Blob([JSON.stringify({ ...body, path: lastPath })], { type: 'text/plain' }))
    }
  }
  engagedMs = 0
}

// Where this visit came from, captured on its first page and reused for every
// later page in the same visit (client-side navigation keeps document.referrer).
let origin = null

/** Call on every route change (Layout). */
export function pulsePageView(pathname) {
  if (pathname === lastPath) return
  flushEngaged()
  lastPath = pathname
  origin ??= {
    referrer: document.referrer,
    utm: new URLSearchParams(window.location.search).get('utm_source') || '',
  }
  send({ type: 'view', ...origin, width: window.innerWidth })
}

let started = false
/** Call once on startup: engaged-time tracking and click events. */
export function initPulse() {
  if (started || !enabled()) return
  started = true
  visibleSince = document.visibilityState === 'visible' ? Date.now() : 0
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushEngaged()
    else visibleSince = Date.now()
  })
  window.addEventListener('pagehide', flushEngaged)
  document.addEventListener('click', (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href]') : null
    if (!a) return
    const href = a.getAttribute('href')
    if (/\.pdf($|\?)/i.test(href)) pulseEvent('resume_download')
    else if (href.startsWith('mailto:')) pulseEvent('email_click')
    else if (/linkedin\.com/i.test(href)) pulseEvent('linkedin_click')
    else if (/github\.com/i.test(href)) pulseEvent('github_click')
  })
}
