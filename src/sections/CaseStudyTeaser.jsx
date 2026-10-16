import { useRef } from 'react'
import Container from '../components/Container.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import Button, { ArrowIcon } from '../components/Button.jsx'
import { getProject, projectPath } from '../data/projects.js'
import { useMotion, gsap, reveal } from '../lib/motion.js'
import './CaseStudyTeaser.css'

const project = getProject('ongrid')
const cs = project.caseStudy
const STAGES = [
  { label: 'The problem', text: cs.context },
  { label: 'My contribution', text: cs.mine.join(' ') },
  { label: 'Technical approach', text: cs.implementation.map((i) => i.body).join(' ') },
]

export default function CaseStudyTeaser() {
  const ref = useRef(null)

  useMotion(ref, (q, { isDesktop }) => {
    reveal(q('.case__head > *'), { trigger: q('.case__head')[0], stagger: 0.08 })

    if (isDesktop) {
      // Scroll-linked: progress bar fills and each stage lights up as the
      // reader moves through the section. No pinning.
      const tl = gsap.timeline({
        scrollTrigger: { trigger: q('.case__stages')[0], start: 'top 80%', end: 'bottom 45%', scrub: 0.6 },
      })
      tl.from(q('.case__progress-fill'), { scaleX: 0, transformOrigin: 'left center', ease: 'none', duration: 3 }, 0)
      q('.case__stage').forEach((stage, i) => {
        tl.from(stage, { autoAlpha: 0.15, y: 30, duration: 0.8, ease: 'power2.out' }, i * 0.9)
      })
    } else {
      reveal(q('.case__stage'), { trigger: q('.case__stages')[0], stagger: 0.12 })
    }

    reveal(q('.case__arch > *'), { trigger: q('.case__arch')[0], x: -12, y: 0, stagger: 0.1, start: 'top 90%' })
    return undefined
  })

  return (
    <section className="section theme-light case" ref={ref} aria-labelledby="case-title">
      <Container>
        <div className="case__head section__head section__head--split">
          <SectionHeading
            id="case-title"
            eyebrow="Featured case study"
            title={`${project.name}: one workspace for team operations`}
            description={project.role}
          />
          <Button to={projectPath(project)} variant="primary" icon={<ArrowIcon />}>
            Read the case study
          </Button>
        </div>

        <div className="case__progress" aria-hidden="true">
          <span className="case__progress-fill" />
        </div>

        <ol className="case__stages" role="list">
          {STAGES.map((s, i) => (
            <li className="case__stage" key={s.label}>
              <p className="case__num mono-label">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="case__label">{s.label}</h3>
              <p className="case__text">{s.text}</p>
            </li>
          ))}
        </ol>

        <div className="case__arch" aria-label="Architecture: React UI, Express.js REST API, PostgreSQL">
          <span className="case__arch-node">React UI</span>
          <span className="case__arch-link" aria-hidden="true" />
          <span className="case__arch-node">Express.js REST API</span>
          <span className="case__arch-link" aria-hidden="true" />
          <span className="case__arch-node">PostgreSQL data models</span>
        </div>
      </Container>
    </section>
  )
}
