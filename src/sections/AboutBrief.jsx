import { useRef } from 'react'
import { Link } from 'react-router'
import Container from '../components/Container.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import Portrait from '../components/Portrait.jsx'
import { ArrowIcon } from '../components/Button.jsx'
import { useMotion, reveal } from '../lib/motion.js'
import './AboutBrief.css'

/** Compact personal introduction on the homepage; the full story is on /about. */
export default function AboutBrief() {
  const ref = useRef(null)

  useMotion(ref, (q) => {
    reveal(q('.about-brief__text > *'), { trigger: ref.current, stagger: 0.1 })
  })

  return (
    <section className="section about-brief" id="about" ref={ref} aria-labelledby="about-brief-title">
      <Container className="about-brief__grid">
        <Portrait />
        <div className="about-brief__text">
          <SectionHeading id="about-brief-title" eyebrow="About" title="How I approach engineering" />
          <p>
            I&apos;m a full stack developer in Noida with nearly 7 years of professional experience. At Garage
            Collective I own application modules end to end within a development team: React UI, Express.js APIs,
            PostgreSQL schemas, deployment and production support.
          </p>
          <p>
            My recent work centres on SaaS products and on integrating AI so that the backend, not the model, decides
            what happens. Before that I built PHP, WordPress and Shopify sites for client CMS and e-commerce work.
          </p>
          <Link className="text-link" to="/about">
            More about how I work <ArrowIcon />
          </Link>
        </div>
      </Container>
    </section>
  )
}
