import { Fragment, useRef } from 'react'
import Container from '../components/Container.jsx'
import Button, { ArrowIcon } from '../components/Button.jsx'
import { LogoMark } from '../components/Logo.jsx'
import HeroVisual from './HeroVisual.jsx'
import { site } from '../data/site.js'
import { useMotion, gsap, drawStroke } from '../lib/motion.js'
import './Hero.css'

const TITLE_LINES = ['I build full stack software,', 'from the first line of code', 'to running in production.']

const META = [
  { label: 'Full Stack', detail: 'React · Node.js · PostgreSQL' },
  { label: 'AI Integrations', detail: 'OpenAI · Agents · MCP' },
  { label: 'Production Systems', detail: 'Linux · Nginx · AWS' },
]

export default function Hero() {
  const ref = useRef(null)

  useMotion(ref, (q, { isDesktop }) => {
    const tl = gsap.timeline({ delay: 0.25, defaults: { ease: 'power3.out' } })
    tl.from(q('.hero__eyebrow'), { autoAlpha: 0, x: -12, duration: 0.6 }, 0.6)
      .from(q('.hero__line-inner'), { yPercent: 110, duration: 1, stagger: 0.1, ease: 'power4.out' }, 0.75)
      .from(q('.hero__lede'), { autoAlpha: 0, y: 16, duration: 0.7 }, '-=0.6')
      .from(q('.hero__actions > *, .hero__profiles'), { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.08 }, '-=0.45')
      .from(q('.hero__meta li'), { autoAlpha: 0, y: 10, duration: 0.5, stagger: 0.08 }, '-=0.4')

    // Visual: panel, then nodes in request order, then the connecting edges.
    tl.from(q('.hero-visual'), { autoAlpha: 0, y: 24, scale: 0.98, duration: 0.9 }, 0.45)
      .from(q('.hv-node'), { autoAlpha: 0, y: 8, duration: 0.5, stagger: 0.12 }, 0.8)
      .add(drawStroke(q('.hv-edge'), { duration: 0.8, stagger: 0.12 }), 1.0)
      .from(q('.hv-edge-label, .hv-flow, .hero-visual__status'), { autoAlpha: 0, duration: 0.5, stagger: 0.05 }, 1.6)

    if (!isDesktop) return undefined

    // Ambient motion (desktop only): dashed flow and a packet following the
    // request path. Both are decorative and paused when off-screen.
    const flow = gsap.to(q('.hv-flow'), {
      strokeDashoffset: -20,
      duration: 1.4,
      ease: 'none',
      repeat: -1,
    })
    const packet = gsap.to(q('.hv-packet'), {
      motionPath: { path: q('.hv-route')[0], align: q('.hv-route')[0], alignOrigin: [0.5, 0.5] },
      duration: 4.2,
      ease: 'power1.inOut',
      repeat: -1,
      repeatDelay: 0.8,
      delay: 2.2,
    })
    const io = new IntersectionObserver(([entry]) => {
      const on = entry.isIntersecting
      flow.paused(!on)
      packet.paused(!on)
    })
    io.observe(ref.current)
    return () => io.disconnect()
  })

  return (
    <section className="hero theme-light" id="top" ref={ref} aria-labelledby="hero-title">
      <div className="hero__backdrop" aria-hidden="true" />
      <Container className="hero__grid">
        <div className="hero__copy">
          <div className="hero__brand">
            <LogoMark size={64} motion="signal" className="hero__mark" />
            <p className="mono-label hero__eyebrow">
              {site.name} · {site.title}
            </p>
          </div>
          <h1 className="hero__title" id="hero-title">
            {/* The spaces between lines keep the heading text readable to search engines. */}
            {TITLE_LINES.map((line, i) => (
              <Fragment key={line}>
                {i > 0 && ' '}
                <span className="hero__line">
                  <span className="hero__line-inner">{line}</span>
                </span>
              </Fragment>
            ))}
          </h1>
          <p className="hero__lede">
            Full stack developer with nearly 7 years of experience. I own application modules end to end, from React
            interfaces and Express.js APIs to PostgreSQL schemas, deployment and production support, and integrate AI
            with the backend firmly in control.
          </p>
          <div className="hero__actions">
            <Button to="/#projects" size="lg" icon={<ArrowIcon />}>
              Explore My Work
            </Button>
            <Button href={site.resume} variant="secondary" size="lg" download>
              Download Résumé
            </Button>
          </div>
          <p className="hero__profiles">
            {site.socials.map((s) => (
              <a key={s.href} className="text-link text-link--muted" href={s.href} target="_blank" rel="noopener noreferrer">
                {s.label}
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            ))}
          </p>
          <ul className="hero__meta" role="list">
            {META.map((m) => (
              <li key={m.label}>
                <span className="hero__meta-label">{m.label}</span>
                <span className="hero__meta-detail">{m.detail}</span>
              </li>
            ))}
          </ul>
        </div>
        <HeroVisual />
      </Container>
    </section>
  )
}
