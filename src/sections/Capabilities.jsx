import { useRef } from 'react'
import Container from '../components/Container.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import Portrait from '../components/Portrait.jsx'
import CapabilityList from '../components/CapabilityList.jsx'
import { ArrowIcon } from '../components/Button.jsx'
import { Link } from 'react-router'
import { useMotion, reveal } from '../lib/motion.js'
import './Capabilities.css'

export default function Capabilities() {
  const ref = useRef(null)

  useMotion(ref, (q) => {
    reveal(q('.about__intro > :not(.portrait)'), { trigger: q('.about__intro')[0], stagger: 0.1, delay: 0.2 })
  })

  return (
    <section className="section about" id="about" ref={ref} aria-labelledby="about-title">
      <Container className="about__grid">
        <div className="about__intro">
          <Portrait />
          <SectionHeading id="about-title" eyebrow="About" title="Full stack, from interface to infrastructure" />
          <p>
            I&apos;m a full stack developer in Noida with nearly 7 years of professional experience. At Garage
            Productions I own application modules end to end within a development team: React UI, Express.js
            APIs, PostgreSQL schemas, deployment and production support.
          </p>
          <p>
            My recent work centres on SaaS products and on integrating AI so that the backend, not the model,
            decides what happens. Before that I built PHP, WordPress and Shopify sites for client CMS and
            e-commerce work.
          </p>
          <Link className="text-link" to="/about">
            More about how I work <ArrowIcon />
          </Link>
        </div>

        <div>
          <h3 className="visually-hidden">Engineering capabilities</h3>
          <CapabilityList headingLevel={4} />
        </div>
      </Container>
    </section>
  )
}
