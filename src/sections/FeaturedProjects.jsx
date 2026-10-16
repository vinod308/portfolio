import { useRef } from 'react'
import Container from '../components/Container.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import Button, { ArrowIcon, ExternalIcon } from '../components/Button.jsx'
import { Link } from 'react-router'
import ProjectMockup from './ProjectMockup.jsx'
import { featuredProjects, projectPath, hostOf } from '../data/projects.js'
import { useMotion, reveal, clipReveal, animateMockup } from '../lib/motion.js'
import './FeaturedProjects.css'

export default function FeaturedProjects() {
  const ref = useRef(null)

  useMotion(ref, (q, { isDesktop }) => {
    reveal(q('.section__head > *'), { trigger: q('.section__head')[0] })

    q('.project').forEach((row) => {
      const rq = (sel) => row.querySelectorAll(sel)
      if (isDesktop) clipReveal(rq('.mk'), { trigger: row, start: 'top 78%' })
      else reveal(rq('.mk'), { trigger: row, y: 20 })
      reveal(rq('.project__copy > *'), { trigger: row, start: 'top 78%', y: 20, stagger: 0.07 })
      // Inner UI settles in after the panel opens
      animateMockup(row, { delay: isDesktop ? 0.45 : 0.2 })
    })
    reveal(q('.featured__more'), { trigger: q('.featured__more')[0], start: 'top 92%' })
  })

  return (
    <section className="section featured" id="projects" ref={ref} aria-labelledby="projects-title">
      <Container>
        <div className="section__head">
          <SectionHeading
            id="projects-title"
            eyebrow="Featured projects"
            title="SaaS products I've helped build"
            description="Three products across finance, AI search visibility and team operations, built with React, Node.js, Express.js and PostgreSQL."
          />
        </div>

        <ol className="featured__list" role="list">
          {featuredProjects.map((p, i) => (
            <li className={`project ${i % 2 ? 'project--flip' : ''}`} key={p.slug}>
              <div className="project__copy">
                <p className="project__index mono-label">
                  {String(i + 1).padStart(2, '0')} · {p.category}
                </p>
                <h3 className="project__name">{p.name}</h3>
                <p className="project__summary">{p.summary}</p>
                <div className="project__role">
                  <p className="project__role-label">My role</p>
                  <p>{p.role}</p>
                </div>
                <ul className="chips" role="list" aria-label="Technologies">
                  {p.stack.map((t) => (
                    <li className="chip" key={t}>
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="project__links">
                  <Link className="text-link" to={projectPath(p)}>
                    Read the case study <ArrowIcon />
                  </Link>
                  {p.href && (
                    <a className="text-link text-link--muted" href={p.href} target="_blank" rel="noopener noreferrer">
                      {hostOf(p.href)}
                      <ExternalIcon />
                      <span className="visually-hidden"> (opens in a new tab)</span>
                    </a>
                  )}
                </div>
              </div>
              <ProjectMockup variant={p.mockup} />
            </li>
          ))}
        </ol>

        <div className="featured__more">
          <Button to="/projects" variant="secondary" icon={<ArrowIcon />}>
            See all projects
          </Button>
        </div>
      </Container>
    </section>
  )
}
