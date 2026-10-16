import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import Container from './Container.jsx'
import Logo from './Logo.jsx'
import Button from './Button.jsx'
import { useMotion, gsap } from '../lib/motion.js'
import './Navbar.css'

/**
 * Sticky site header.
 * links: [{ label, to }] router paths (may include #hash); cta: { label, href }
 * On narrow screens the links collapse into a disclosure menu.
 */
export default function Navbar({ links = [], cta }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuId = useId()
  const ref = useRef(null)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile menu whenever the route or hash changes.
  const [lastKey, setLastKey] = useState(location.key)
  if (lastKey !== location.key) {
    setLastKey(location.key)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const onResize = () => window.matchMedia('(min-width: 48rem)').matches && setOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  useMotion(ref, (q) => {
    gsap.from(q('.navbar__inner > *'), { y: -10, autoAlpha: 0, duration: 0.7, stagger: 0.06, delay: 0.1 })
  })

  const hasMenu = links.length > 0

  return (
    <header
      ref={ref}
      className={`navbar ${scrolled ? 'navbar--scrolled' : ''} ${open ? 'navbar--open' : ''}`}
    >
      <Container as="nav" className="navbar__inner" aria-label="Primary">
        <Logo to="/" size={36} tagline />

        {hasMenu && (
          <ul className="navbar__links" id={menuId} role="list">
            {links.map((link) => (
              <li key={link.to}>
                <Link className="navbar__link" to={link.to}>
                  {link.label}
                </Link>
              </li>
            ))}
            {cta && (
              <li className="navbar__menu-cta">
                <Button href={cta.href}>{cta.label}</Button>
              </li>
            )}
          </ul>
        )}

        <div className="navbar__actions">
          {cta && (
            <Button href={cta.href} className={`navbar__cta ${hasMenu ? '' : 'navbar__cta--always'}`}>
              {cta.label}
            </Button>
          )}
          {hasMenu && (
            <button
              type="button"
              className="navbar__toggle"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
              <span className="navbar__toggle-bar navbar__toggle-bar--top" aria-hidden="true" />
              <span className="navbar__toggle-bar navbar__toggle-bar--bottom" aria-hidden="true" />
            </button>
          )}
        </div>
      </Container>
    </header>
  )
}
