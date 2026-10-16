import { Link } from 'react-router'
import { ArrowIcon, ExternalIcon } from './Button.jsx'
import { CATEGORIES, projectPath, hostOf } from '../data/projects.js'
import './ProjectCard.css'

const labelOf = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? id

/** Gallery card. Featured projects link to their case study. */
export default function ProjectCard({ project: p, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`
  return (
    <article className={`project-card ${p.featured ? 'project-card--featured' : ''}`}>
      <div className="project-card__top">
        <p className="mono-label project-card__kind">{p.kind}</p>
        {p.caseStudy && <span className="project-card__badge">Case study</span>}
      </div>
      <Heading className="project-card__name">
        {p.caseStudy ? (
          <Link className="project-card__title-link" to={projectPath(p)}>
            {p.name}
          </Link>
        ) : (
          p.name
        )}
      </Heading>
      <p className="project-card__summary">{p.summary}</p>
      <ul className="chips" role="list" aria-label="Technologies">
        {p.stack.map((t) => (
          <li className="chip" key={t}>
            {t}
          </li>
        ))}
      </ul>
      <div className="project-card__footer">
        <p className="project-card__cats">
          <span className="visually-hidden">Categories: </span>
          {p.categories.map(labelOf).join(' · ')}
        </p>
        <div className="project-card__links">
          {p.caseStudy && (
            <Link className="text-link" to={projectPath(p)} aria-label={`Read the ${p.name} case study`}>
              Case study <ArrowIcon />
            </Link>
          )}
          {p.href && (
            <a className="text-link text-link--muted" href={p.href} target="_blank" rel="noopener noreferrer">
              {hostOf(p.href)}
              <ExternalIcon />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
