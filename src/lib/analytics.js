// Google Analytics 4, loaded only after the visitor accepts.
//
// Until consent is "granted" nothing is requested from Google and no cookies
// are set. GA4 enhanced measurement (on in the GA property) records page
// views for client-side navigation, résumé PDF downloads and outbound clicks;
// track() adds the events it can't see (email clicks, contact form leads).
// Only runs on the primary host in production builds, so local dev, previews
// and the GitHub Pages / Vercel mirrors never send data.
import { useSyncExternalStore } from 'react'
import { site } from '../data/site.js'

const STORAGE_KEY = 'analytics-consent' // 'granted' | 'denied'
const { gaId, host } = site.analytics

/** Pure check, exported for tests. */
export function isAnalyticsEnabled({ prod, id, primaryHost, hostname }) {
  return Boolean(prod && id && hostname === primaryHost)
}

export const analyticsEnabled = () =>
  typeof window !== 'undefined' &&
  isAnalyticsEnabled({ prod: import.meta.env.PROD, id: gaId, primaryHost: host, hostname: window.location.hostname })

function readConsent() {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

// ---- Consent store (shared by the banner and the footer link) ----
let state = { consent: null, settingsOpen: false }
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const SERVER_STATE = { consent: null, settingsOpen: false, enabled: false }
let snapshot = SERVER_STATE
const getSnapshot = () => {
  const enabled = analyticsEnabled()
  if (snapshot.consent !== state.consent || snapshot.settingsOpen !== state.settingsOpen || snapshot.enabled !== enabled) {
    snapshot = { ...state, enabled }
  }
  return snapshot
}

/** { consent, settingsOpen, enabled }; consent is null until the visitor chooses. */
export function useConsent() {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE)
}

export function openConsentSettings() {
  state = { ...state, settingsOpen: true }
  emit()
}

// ---- gtag ----
let loaded = false

function loadGtag() {
  if (loaded) return
  loaded = true
  window[`ga-disable-${gaId}`] = false
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // gtag.js expects the arguments object itself, not an array.
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', gaId)
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`
  document.head.appendChild(script)
}

function clearGaCookies() {
  const parts = window.location.hostname.split('.')
  const domains = ['', ...parts.map((_, i) => `.${parts.slice(i).join('.')}`)]
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim()
    if (!name.startsWith('_ga')) continue
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ''}`
    }
  }
}

export function setConsent(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Private mode: the choice lasts for this page view only.
  }
  state = { consent: value, settingsOpen: false }
  emit()
  if (!analyticsEnabled()) return
  if (value === 'granted') {
    loadGtag()
  } else {
    window[`ga-disable-${gaId}`] = true
    clearGaCookies()
  }
}

/** Send a GA4 event; a no-op unless analytics is loaded. */
export function track(name, params = {}) {
  if (loaded && window.gtag) window.gtag('event', name, params)
}

/** Call once on startup: restores a previous "granted" and tracks email clicks. */
export function initAnalytics() {
  if (!analyticsEnabled()) return
  state = { ...state, consent: readConsent() }
  emit()
  if (state.consent === 'granted') loadGtag()
  document.addEventListener('click', (e) => {
    const link = e.target instanceof Element ? e.target.closest('a[href^="mailto:"]') : null
    // No link_url: GA's terms forbid sending email addresses, even our own.
    if (link) track('contact_click', { method: 'email' })
  })
}
