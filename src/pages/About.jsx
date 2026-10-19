import { useRef } from 'react'
import { Link } from 'react-router'
import Container from '../components/Container.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import Portrait from '../components/Portrait.jsx'
import Button, { ArrowIcon } from '../components/Button.jsx'
import ContactCTA from '../sections/ContactCTA.jsx'
import { principles, skillGroups, learning, experience } from '../data/content.js'
import { site } from '../data/site.js'
import { usePageMeta } from '../lib/usePageMeta.js'
import { PAGE_META } from '../lib/pageMeta.js'
import { useMotion, reveal } from '../lib/motion.js'
import './About.css'

// The homepage carries the full timeline and the capability list; this page
// covers how I work, a short background and the complete technology list.
const [current, first] = experience

export default function About() {
  usePageMeta(PAGE_META.about)
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
          description="I work across the stack on SaaS products: turning product requirements into React interfaces, Express.js APIs and PostgreSQL data models, then deploying and supporting them on Linux servers."
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

        <section className="about-block about-block--split" aria-labelledby="background-title">
          <SectionHeading id="background-title" eyebrow="Background" title="Where I've worked" />
          <div className="about-background about-reveal">
            <p>
              I have {site.experience.toLowerCase()} of professional experience. I started in {first.period.split(' – ')[0]} as a{' '}
              {first.role} at {first.company}, delivering client WordPress websites and administering Apache and Nginx
              servers.
            </p>
            <p>
              Since {current.period.split(' – ')[0]} I&apos;ve been a {current.role} at {current.company}, owning
              application modules within a development team, integrating AI as a backend service layer, and deploying
              and maintaining 15+ client applications on Linux servers.
            </p>
            <Link className="text-link" to="/#experience">
              Full experience timeline <ArrowIcon />
            </Link>
          </div>
        </section>

        <section className="about-block" aria-labelledby="stack-title">
          <SectionHeading id="stack-title" eyebrow="Stack" title="Technologies I use professionally" />
          <div className="stack-groups">
            {skillGroups.map((g) => (
              <div className="stack-group about-reveal" key={g.title}>
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
          <p className="stack-learning about-reveal">
            <span className="mono-label">Currently learning</span> {learning.join(' · ')}
          </p>
        </section>
      </Container>

      <ContactCTA />
    </div>
  )
}
