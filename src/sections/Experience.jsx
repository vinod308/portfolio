import { useRef } from 'react'
import Container from '../components/Container.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import { experience } from '../data/content.js'
import { useMotion, gsap, reveal } from '../lib/motion.js'
import './Experience.css'

export default function Experience() {
  const ref = useRef(null)

  useMotion(ref, (q) => {
    reveal(q('.section__head > *'), { trigger: q('.section__head')[0] })

    const tl = gsap.timeline({ scrollTrigger: { trigger: q('.timeline')[0], start: 'top 75%', once: true } })
    tl.from(q('.timeline__line'), { scaleY: 0, transformOrigin: 'center top', duration: 1.6, ease: 'power2.inOut' }, 0)
    q('.job').forEach((job, i) => {
      const jq = gsap.utils.selector(job)
      tl.from(jq('.job__marker'), { scale: 0, duration: 0.45, ease: 'back.out(2.5)' }, 0.2 + i * 0.55)
        .from(jq('.job__period, .job__role, .job__company'), { autoAlpha: 0, y: 12, duration: 0.55, stagger: 0.06 }, '<0.05')
        .from(jq('.job__highlights li'), { autoAlpha: 0, x: 14, duration: 0.5, stagger: 0.07 }, '<0.2')
    })
    return undefined
  })

  return (
    <section className="section experience" id="experience" ref={ref} aria-labelledby="experience-title">
      <Container>
        <div className="section__head">
          <SectionHeading
            id="experience-title"
            eyebrow="Experience"
            title="Nearly 7 years of building and running production web applications"
          />
        </div>

        <div className="timeline">
          <span className="timeline__line" aria-hidden="true" />
          <ol className="timeline__list" role="list">
          {experience.map((job) => (
            <li className="job" key={job.company}>
              <span className="job__marker" aria-hidden="true" />
              <div className="job__meta">
                <p className="job__period mono-label">
                  <time dateTime={job.start}>{job.period}</time>
                </p>
              </div>
              <div className="job__content">
                <h3 className="job__role">{job.role}</h3>
                <p className="job__company">
                  {job.company}
                  {job.location ? `, ${job.location}` : ''}
                </p>
                <ul className="job__highlights" role="list">
                  {job.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
          </ol>
        </div>
      </Container>
    </section>
  )
}
