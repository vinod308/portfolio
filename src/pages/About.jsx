import { useRef } from 'react'
import Container from '../components/Container.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import Portrait from '../components/Portrait.jsx'
import CapabilityList from '../components/CapabilityList.jsx'
import Button, { ArrowIcon } from '../components/Button.jsx'
import Experience from '../sections/Experience.jsx'
import ContactCTA from '../sections/ContactCTA.jsx'
import { principles, skillGroups } from '../data/content.js'
import { site } from '../data/site.js'
import { usePageMeta } from '../lib/usePageMeta.js'
import { useMotion, reveal } from '../lib/motion.js'
import './About.css'

export default function About() {
  usePageMeta({
    title: 'About',
    description:
      'About Vinod Kumar: full stack developer in Noida with nearly 7 years of experience in React, Node.js, PostgreSQL, AI integrations and production deployment.',
  })
  const ref = useRef(null)

  useMotion(ref, (q) => {
    q('.about-block').forEach((block) => {
      reveal(block.querySelectorAll('.section-heading > *'), { trigger: block, stagger: 0.07 })
      reveal(block.querySelectorAll('.about-reveal'), { trigger: block, start: 'top 75%', stagger: 0.07, y: 20, delay: 0.1 })
    })
  })

  return (
    <div className="page about-page" ref={ref}>
      <Container>
        <PageHeader
          eyebrow="About"
          title="I build full stack products and keep them running"
          description="Full stack developer in Noida with nearly 7 years of professional experience. I own application modules end to end within a development team, from React UI and Express.js APIs to PostgreSQL schemas, deployment and production support."
          aside={<Portrait eager />}
        >
          <p className="about-intro">
            My recent work centres on SaaS products and on integrating AI so that the backend, not the model, decides
            what happens. Before that I built PHP, WordPress and Shopify sites for client CMS and e-commerce work.
          </p>
          <div className="about-actions">
            <Button href={site.resume} icon={<ArrowIcon />}>
              Download résumé (PDF)
            </Button>
            <Button to="/projects" variant="secondary">
              See projects
            </Button>
          </div>
        </PageHeader>

        <section className="about-block" aria-labelledby="principles-title">
          <SectionHeading id="principles-title" eyebrow="Approach" title="How I work" />
          <ol className="principles" role="list">
            {principles.map((p, i) => (
              <li className="principle about-reveal" key={p.title}>
                <span className="principle__num mono-label">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="principle__title">{p.title}</h3>
                <p>{p.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-block about-block--split" aria-labelledby="caps-title">
          <SectionHeading
            id="caps-title"
            eyebrow="Capabilities"
            title="What I work on"
            description="Five areas I work across, with the technologies I use in each."
          />
          <CapabilityList headingLevel={3} />
        </section>

        <section className="about-block" aria-labelledby="stack-title">
          <SectionHeading id="stack-title" eyebrow="Stack" title="Technologies" />
          <div className="stack-groups">
            {skillGroups.map((g) => (
              <div className={`stack-group about-reveal ${g.muted ? 'stack-group--muted' : ''}`} key={g.title}>
                <h3 className="stack-group__title">{g.title}</h3>
                <ul className="chips" role="list">
                  {g.items.map((t) => (
                    <li className="chip" key={t}>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </Container>

      <Experience />
      <ContactCTA />
    </div>
  )
}
