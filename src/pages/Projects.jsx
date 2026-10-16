import { useLayoutEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'
import Container from '../components/Container.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProjectCard from '../components/ProjectCard.jsx'
import Button from '../components/Button.jsx'
import { CATEGORIES, projects } from '../data/projects.js'
import { usePageMeta } from '../lib/usePageMeta.js'
import { gsap, prefersReducedMotion } from '../lib/motion.js'
import './Projects.css'

const FILTERS = [{ id: 'all', label: 'All' }, ...CATEGORIES]

export default function Projects() {
  usePageMeta({
    title: 'Projects',
    description:
      'SaaS products, AI applications, e-commerce storefronts and web platforms built by Vinod Kumar with React, Node.js, PostgreSQL, Shopify and WordPress.',
  })
  const [params, setParams] = useSearchParams()
  const requested = params.get('category')
  const active = FILTERS.some((f) => f.id === requested) ? requested : 'all'
  const visible = active === 'all' ? projects : projects.filter((p) => p.categories.includes(active))
  const gridRef = useRef(null)
  const firstRun = useRef(true)

  const countFor = (id) => (id === 'all' ? projects.length : projects.filter((p) => p.categories.includes(id)).length)

  const choose = (id) => {
    const next = new URLSearchParams(params)
    if (id === 'all') next.delete('category')
    else next.set('category', id)
    // replace: filter changes shouldn't pile up history entries
    setParams(next, { replace: true, preventScrollReset: true })
  }

  // Cards rise in on first load and again (quicker) whenever the filter changes.
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !gridRef.current) return undefined
    const ctx = gsap.context(() => {
      gsap.from('.projects-grid__item', {
        autoAlpha: 0,
        y: firstRun.current ? 28 : 12,
        duration: firstRun.current ? 0.7 : 0.45,
        stagger: firstRun.current ? 0.06 : 0.035,
        delay: firstRun.current ? 0.35 : 0,
        ease: 'power3.out',
      })
    }, gridRef)
    firstRun.current = false
    return () => ctx.revert()
  }, [active])

  const activeLabel = FILTERS.find((f) => f.id === active).label

  return (
    <div className="page">
      <Container>
        <PageHeader
          eyebrow="Projects"
          title="Work across SaaS, AI, e-commerce and the web"
          description="Products I've helped build and sites I've delivered. The three SaaS products have full case studies; the rest link to the live sites where available."
        />

        <div className="filters" role="group" aria-label="Filter projects by category">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="filter"
              aria-pressed={active === f.id}
              onClick={() => choose(f.id)}
            >
              {f.label}
              <span className="filter__count" aria-hidden="true">
                {countFor(f.id)}
              </span>
            </button>
          ))}
        </div>

        <p className="projects-status" role="status">
          Showing {visible.length} {visible.length === 1 ? 'project' : 'projects'}
          {active !== 'all' && <> in {activeLabel}</>}
        </p>

        {visible.length > 0 ? (
          <ul className="projects-grid" role="list" ref={gridRef}>
            {visible.map((p) => (
              <li className="projects-grid__item" key={p.slug}>
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="projects-empty">
            <p className="projects-empty__title">No projects in {activeLabel} yet.</p>
            <p>Try another category or view everything.</p>
            <Button variant="secondary" onClick={() => choose('all')}>
              Show all projects
            </Button>
          </div>
        )}
      </Container>
    </div>
  )
}
