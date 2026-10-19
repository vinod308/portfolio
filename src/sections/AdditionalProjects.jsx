import { useRef } from 'react'
import Container from '../components/Container.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import { ArrowIcon, ExternalIcon } from '../components/Button.jsx'
import { Link } from 'react-router'
import { projects, hostOf, isCompact } from '../data/projects.js'
import { useMotion, reveal } from '../lib/motion.js'
import './AdditionalProjects.css'

const additionalProjects = projects.filter((p) => !p.featured && !isCompact(p))
const cmsProjects = projects.filter(isCompact)

export default function AdditionalProjects() {
  const ref = useRef(null)

  useMotion(ref, (q, { isDesktop }) => {
    reveal(q('.section__head > *'), { trigger: q('.section__head')[0] })
    reveal(q('.mini-card'), {
      trigger: q('.mini-grid')[0],
      y: isDesktop ? 36 : 20,
      stagger: isDesktop ? 0.09 : 0.06,
      duration: 0.7,
    })
    reveal(q('.cms__item'), { trigger: q('.cms')[0], y: 10, stagger: 0.05, start: 'top 90%' })
    return undefined
  })

  return (
    <section className="section theme-light more" ref={ref} aria-labelledby="more-title">
      <Container>
        <div className="section__head">
          <SectionHeading
            id="more-title"
            eyebrow="More work"
            title="AI automation, e-commerce and web platforms"
          />
        </div>

        <ul className="mini-grid" role="list">
          {additionalProjects.map((p) => (
            <li className="mini-card" key={p.name}>
              <p className="mini-card__kind mono-label">{p.kind}</p>
              <h3 className="mini-card__name">{p.name}</h3>
              <p className="mini-card__body">{p.summary}</p>
              <ul className="chips" role="list" aria-label="Technologies">
                {p.stack.map((t) => (
                  <li className="chip" key={t}>
                    {t}
                  </li>
                ))}
              </ul>
              {p.href && (
                <a className="text-link mini-card__link" href={p.href} target="_blank" rel="noopener noreferrer">
                  {hostOf(p.href)}
                  <ExternalIcon />
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              )}
            </li>
          ))}
        </ul>

        <div className="cms">
          <p className="cms__label mono-label">WordPress &amp; PHP builds</p>
          <ul className="cms__list" role="list">
            {cmsProjects.map((p) => (
              <li className="cms__item" key={p.name}>
                <a href={p.href} target="_blank" rel="noopener noreferrer">
                  {p.name}
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
                <span className="cms__tech">{p.stack[0]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="more__all">
          <Link className="text-link" to="/projects">
            Browse all projects by category <ArrowIcon />
          </Link>
        </div>
      </Container>
    </section>
  )
}
