import { useRef } from 'react'
import { Link } from 'react-router'
import Container from './Container.jsx'
import Logo from './Logo.jsx'
import { site } from '../data/site.js'
import { navLinks } from '../data/content.js'
import { useMotion, reveal } from '../lib/motion.js'
import { openConsentSettings, useConsent } from '../lib/usage.js'
import './Footer.css'

export default function Footer() {
  const year = new Date().getFullYear()
  const ref = useRef(null)
  const analytics = useConsent()

  useMotion(ref, (q) => {
    reveal(q('.footer__col'), { trigger: ref.current, start: 'top 96%', y: 16, stagger: 0.08 })
  })

  return (
    <footer className="footer" ref={ref}>
      <Container className="footer__inner">
        <div className="footer__col footer__brand">
          <Logo to="/" size={44} />
          <p className="footer__meta">{site.title}</p>
          <a className="footer__email" href={`mailto:${site.email}`}>
            {site.email}
          </a>
        </div>

        <nav className="footer__col" aria-label="Footer">
          <p className="mono-label footer__heading">Navigate</p>
          <ul className="footer__list" role="list">
            {navLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to}>{l.label}</Link>
              </li>
            ))}
            <li>
              <a href={site.resume}>Résumé (PDF)</a>
            </li>
          </ul>
        </nav>

        <div className="footer__col">
          <p className="mono-label footer__heading">Elsewhere</p>
          <ul className="footer__list" role="list">
            {site.socials.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer">
                  {s.label}
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <p className="footer__legal mono-label">
          © {year} {site.name} · {site.location}
          {analytics.enabled && (
            <>
              {' · '}
              <button type="button" className="footer__settings" onClick={openConsentSettings}>
                Cookie settings
              </button>
            </>
          )}
        </p>
      </Container>
    </footer>
  )
}
