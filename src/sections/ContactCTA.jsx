import { useRef } from 'react'
import Container from '../components/Container.jsx'
import Button, { ArrowIcon } from '../components/Button.jsx'
import { site } from '../data/site.js'
import { useMotion, gsap, reveal } from '../lib/motion.js'
import './ContactCTA.css'

export default function ContactCTA() {
  const ref = useRef(null)

  useMotion(ref, (q, { isDesktop }) => {
    const panel = q('.cta')[0]
    reveal(panel, { trigger: panel, y: 40, duration: 1 })
    reveal(q('.cta__inner > *'), { trigger: panel, stagger: 0.09, delay: 0.2 })
    if (isDesktop) {
      gsap.fromTo(
        q('.cta__glow'),
        { yPercent: 20 },
        { yPercent: -20, ease: 'none', scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: true } },
      )
    }
    return undefined
  })

  return (
    <section className="section section--tight contact-cta" ref={ref} aria-labelledby="cta-title">
      <Container>
        <div className="cta">
          <span className="cta__glow" aria-hidden="true" />
          <div className="cta__inner">
            <p className="mono-label">Contact</p>
            <h2 className="cta__title" id="cta-title">
              Have a product to build or an AI feature to ship?
            </h2>
            <p className="cta__text">
              I&apos;m happy to talk about full stack engineering, product development or AI integration work.
            </p>
            <div className="cta__actions">
              <Button to="/contact" size="lg" icon={<ArrowIcon />}>
                Get in touch
              </Button>
              <a className="cta__email" href={`mailto:${site.email}`}>
                {site.email}
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
