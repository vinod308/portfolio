import { useRef } from 'react'
import { Link, useParams } from 'react-router'
import Container from '../components/Container.jsx'
import PageHeader from '../components/PageHeader.jsx'
import WorkflowDiagram from '../components/WorkflowDiagram.jsx'
import Button, { ArrowIcon, ExternalIcon } from '../components/Button.jsx'
import ProjectMockup from '../sections/ProjectMockup.jsx'
import { caseStudies, getProject, projectPath, hostOf } from '../data/projects.js'
import { usePageMeta } from '../lib/usePageMeta.js'
import { useMotion, gsap, reveal, animateMockup } from '../lib/motion.js'
import NotFound from './NotFound.jsx'
import './ProjectDetail.css'

const SECTIONS = [
  { id: 'context', label: 'Problem & context' },
  { id: 'role', label: 'My role' },
  { id: 'implementation', label: 'Implementation' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'stack', label: 'Technologies' },
]

export default function ProjectDetail() {
  const { slug } = useParams()
  const project = getProject(slug)
  if (!project?.caseStudy) return <NotFound />
  // key: remount per project so animations and refs start fresh
  return <CaseStudy key={project.slug} project={project} />
}

function CaseStudy({ project: p }) {
  const cs = p.caseStudy
  usePageMeta({ title: `${p.name} case study`, description: cs.overview })
  const ref = useRef(null)

  const index = caseStudies.findIndex((c) => c.slug === p.slug)
  const prev = caseStudies[(index - 1 + caseStudies.length) % caseStudies.length]
  const next = caseStudies[(index + 1) % caseStudies.length]

  useMotion(ref, (q, { isDesktop }) => {
    const mock = q('.study-hero__visual')[0]
    reveal(mock, { y: 32, duration: 1, delay: 0.35 })
    animateMockup(mock, { trigger: mock, delay: 0.8 })

    q('.study-section').forEach((sec) => {
      const sq = (sel) => sec.querySelectorAll(sel)
      reveal(sq('.study-section__head > *'), { trigger: sec, start: 'top 80%', stagger: 0.07 })
      reveal(sq('.study-reveal'), { trigger: sec, start: 'top 75%', stagger: 0.08, y: 22, delay: 0.15 })
    })

    if (isDesktop) {
      // Section rail tracks reading progress through the case study.
      gsap.from(q('.study-progress__fill'), {
        scaleY: 0,
        transformOrigin: 'center top',
        ease: 'none',
        scrollTrigger: { trigger: q('.study-body')[0], start: 'top 60%', end: 'bottom 60%', scrub: 0.4 },
      })
    }
  })

  return (
    <article className="page study-page" ref={ref}>
      <Container>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol role="list">
            <li>
              <Link to="/projects">Projects</Link>
            </li>
            <li aria-current="page">{p.name}</li>
          </ol>
        </nav>

        <PageHeader
          eyebrow={`Case study · ${p.kind}`}
          title={p.name}
          description={cs.overview}
          aside={
            <div className="study-hero__visual">
              <ProjectMockup variant={p.mockup} />
            </div>
          }
        >
          <ul className="chips" role="list" aria-label="Technologies">
            {p.stack.map((t) => (
              <li className="chip" key={t}>
                {t}
              </li>
            ))}
          </ul>
          {p.href && (
            <a className="text-link" href={p.href} target="_blank" rel="noopener noreferrer">
              Visit {hostOf(p.href)} <ExternalIcon />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          )}
        </PageHeader>

        <div className="study-body">
          <aside className="study-toc" aria-label="On this page">
            <span className="study-progress" aria-hidden="true">
              <span className="study-progress__fill" />
            </span>
            <ol role="list">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.label}</a>
                </li>
              ))}
            </ol>
          </aside>

          <div className="study-content">
            <Section id="context" n={1} title="Problem & context">
              <p className="study-lede study-reveal">{cs.context}</p>
            </Section>

            <Section id="role" n={2} title="My role and contribution">
              <div className="role-grid">
                <div className="role-card role-card--mine study-reveal">
                  <p className="mono-label">My work</p>
                  <ul role="list" className="role-list">
                    {cs.mine.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
                <div className="role-card study-reveal">
                  <p className="mono-label">Scope</p>
                  <p>{cs.team}</p>
                </div>
              </div>
            </Section>

            <Section id="implementation" n={3} title="Technical implementation">
              <ul className="impl-grid" role="list">
                {cs.implementation.map((it) => (
                  <li className="impl-card study-reveal" key={it.title}>
                    <h3 className="impl-card__title">{it.title}</h3>
                    <p>{it.body}</p>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="workflow" n={4} title="Workflow">
              <div className="study-reveal">
                <WorkflowDiagram
                  title={cs.workflow.title}
                  steps={cs.workflow.steps}
                  note="Simplified illustration of the flow, not the production schema or architecture."
                />
              </div>
            </Section>

            <Section id="decisions" n={5} title="Engineering decisions">
              <ul className="decision-list" role="list">
                {cs.decisions.map((d) => (
                  <li className="decision study-reveal" key={d.title}>
                    <h3 className="decision__title">{d.title}</h3>
                    <p>{d.body}</p>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="stack" n={6} title="Technologies used">
              <ul className="chips chips--lg study-reveal" role="list">
                {p.stack.map((t) => (
                  <li className="chip" key={t}>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="illustrative-note study-reveal study-note">
                The interface shown above is an original mock-up with placeholder data, not a product screenshot.
              </p>
            </Section>
          </div>
        </div>

        <nav className="study-pager" aria-label="More case studies">
          <Link className="pager-card" to={projectPath(prev)} rel="prev">
            <span className="mono-label">Previous</span>
            <span className="pager-card__name">{prev.name}</span>
            <span className="pager-card__kind">{prev.kind}</span>
          </Link>
          <Link className="pager-card pager-card--next" to={projectPath(next)} rel="next">
            <span className="mono-label">Next</span>
            <span className="pager-card__name">{next.name}</span>
            <span className="pager-card__kind">{next.kind}</span>
          </Link>
        </nav>

        <div className="study-cta">
          <Button to="/projects" variant="secondary">
            All projects
          </Button>
          <Button to="/contact" icon={<ArrowIcon />}>
            Discuss a project
          </Button>
        </div>
      </Container>
    </article>
  )
}

function Section({ id, n, title, children }) {
  return (
    <section className="study-section" id={id} aria-labelledby={`${id}-title`}>
      <div className="study-section__head">
        <p className="mono-label">{String(n).padStart(2, '0')}</p>
        <h2 id={`${id}-title`} className="study-section__title">
          {title}
        </h2>
      </div>
      <div className="study-section__body">{children}</div>
    </section>
  )
}
