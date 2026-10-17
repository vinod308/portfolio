import { useEffect, useLayoutEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'
import ConsentBanner from './ConsentBanner.jsx'
import { site } from '../data/site.js'
import { navLinks } from '../data/content.js'
import { prefersReducedMotion, ScrollTrigger } from '../lib/motion.js'
import { pulsePageView } from '../lib/pulse.js'

/**
 * Shared shell. Handles scroll position on navigation: hash links scroll to
 * their section, new pages start at the top and move focus to <main> so
 * screen-reader users land on the new content.
 */
export default function Layout() {
  const { pathname, hash, search, key } = useLocation()
  const mainRef = useRef(null)
  const last = useRef({ pathname, hash, search })

  useEffect(() => {
    pulsePageView(pathname)
  }, [pathname])

  useLayoutEffect(() => {
    const prev = last.current
    last.current = { pathname, hash, search }
    const pageChanged = prev.pathname !== pathname
    // Query-only updates (e.g. project filters) keep the scroll position.
    if (!pageChanged && prev.hash === hash && prev.search !== search) return

    // 'instant', not 'auto': 'auto' follows the CSS scroll-behavior: smooth,
    // so the page was still near its old position when ScrollTrigger.refresh()
    // below recorded and restored it, and new pages opened scrolled down.
    const jump = pageChanged || prefersReducedMotion() ? 'instant' : 'smooth'
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (target) {
        target.scrollIntoView({ behavior: jump })
        return
      }
    }
    window.scrollTo({ top: 0, behavior: jump })
    if (pageChanged) {
      mainRef.current?.focus({ preventScroll: true })
      ScrollTrigger.refresh()
    }
  }, [pathname, hash, search, key])

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar links={navLinks} cta={{ label: 'Résumé', href: site.resume }} />
      <main id="main" ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <ConsentBanner />
    </>
  )
}
