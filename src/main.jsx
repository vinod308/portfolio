import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import App from './App.jsx'
import { initAnalytics } from './lib/usage.js'
import { initPulse } from './lib/pulse.js'

const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

// Built pages arrive prerendered (scripts/prerender.js); take over that HTML
// instead of re-rendering it. The dev server and 404.html start empty, and a
// host may answer an unknown URL with another page's HTML: render those fresh.
const root = document.getElementById('root')
const path = window.location.pathname.slice(import.meta.env.BASE_URL.length - 1).replace(/(.)\/$/, '$1') || '/'
if (root.dataset.route === path) {
  hydrateRoot(root, app)
} else {
  root.replaceChildren()
  createRoot(root).render(app)
}

initAnalytics()
initPulse()
