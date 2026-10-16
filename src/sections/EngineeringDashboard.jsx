import { useRef } from 'react'
import Container from '../components/Container.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import { useMotion, gsap, reveal, countUp } from '../lib/motion.js'
import './EngineeringDashboard.css'

// Illustrative demo data only. It shows the shape of a guarded AI workflow,
// not measurements from any product.
const STEPS = [
  { name: 'Request received', detail: 'POST /api/generate · schema valid' },
  { name: 'Prompt assembled', detail: 'template + context, server-side' },
  { name: 'Model call', detail: 'provider response parsed' },
  { name: 'Output validated', detail: 'business rules: 6 passed, 0 blocked' },
  { name: 'Persisted', detail: 'PostgreSQL · status = approved' },
]

const METRICS = [
  { label: 'Runs today', value: 1284, decimals: 0, suffix: '' },
  { label: 'Validation pass rate', value: 96.4, decimals: 1, suffix: '%' },
  { label: 'Median response', value: 1.8, decimals: 1, suffix: ' s' },
]

const BARS = [32, 44, 38, 56, 62, 48, 70, 84, 76, 64, 90, 72]

const LOG = [
  ['10:42:07', 'info', 'run 2741 queued'],
  ['10:42:08', 'info', 'provider responded, 812 tokens'],
  ['10:42:08', 'ok', 'validator passed, writing record'],
  ['10:42:09', 'ok', 'run 2741 approved'],
]

const fmt = (m) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: m.decimals, maximumFractionDigits: m.decimals }).format(
    m.value,
  )

export default function EngineeringDashboard() {
  const ref = useRef(null)

  useMotion(ref, (q, { isDesktop }) => {
    reveal(q('.section__head > *'), { trigger: q('.section__head')[0] })
    reveal(q('.console'), { trigger: q('.console')[0], y: 40, duration: 1 })

    const tl = gsap.timeline({
      scrollTrigger: { trigger: q('.console')[0], start: 'top 70%', once: true },
      delay: 0.3,
    })

    // Workflow: each step goes pending -> running -> done, in order.
    q('.wf-step').forEach((step, i) => {
      const sq = gsap.utils.selector(step)
      tl.set(sq('.wf-state--done'), { autoAlpha: 0 }, 0)
        .set(sq('.wf-state--pending'), { autoAlpha: 1 }, 0)
        .set(step, { opacity: 0.4 }, 0)
        .to(sq('.wf-state--pending'), { autoAlpha: 0, duration: 0.2 }, 0.35 + i * 0.45)
        .to(sq('.wf-state--done'), { autoAlpha: 1, duration: 0.25 }, '<')
        .from(sq('.wf-dot'), { scale: 0.4, duration: 0.4, ease: 'back.out(3)' }, '<')
        .to(step, { opacity: 1, duration: 0.3 }, '<')
    })
    tl.from(q('.wf-rail-fill'), { scaleY: 0, transformOrigin: 'center top', ease: 'none', duration: STEPS.length * 0.45 }, 0.35)

    // Metrics, chart and log run alongside the workflow.
    q('.metric__value [data-value]').forEach((el, i) => tl.add(countUp(el), 0.4 + i * 0.15))
    tl.from(q('.chart__bar'), { scaleY: 0, transformOrigin: 'center bottom', duration: 0.7, stagger: 0.05 }, 0.5)
      .from(q('.queue__fill'), { scaleX: 0, transformOrigin: 'left center', duration: 1.6, ease: 'power2.inOut' }, 0.6)
      .from(q('.log__line'), { autoAlpha: 0, x: -8, duration: 0.35, stagger: 0.4 }, 0.5)

    if (isDesktop) {
      // Gentle depth on scroll; no pinning.
      gsap.fromTo(
        q('.console__aside'),
        { y: 30 },
        { y: -10, ease: 'none', scrollTrigger: { trigger: q('.console')[0], start: 'top bottom', end: 'bottom top', scrub: true } },
      )
    }
    return undefined
  })

  return (
    <section className="section theme-light dashboard" ref={ref} aria-labelledby="dashboard-title">
      <Container>
        <div className="section__head section__head--split">
          <SectionHeading
            id="dashboard-title"
            eyebrow="Engineering in practice"
            title="How an AI feature runs, end to end"
            description="The model is one step in a backend workflow. Requests are validated, prompts are built on the server, and nothing is stored or published until the output passes business rules."
          />
        </div>

        <div className="console theme-dark">
          <div className="console__bar">
            <span className="console__title">ai-workflow · run 2741</span>
            <span className="console__live">
              <i aria-hidden="true" /> demo
            </span>
          </div>

          <div className="console__grid">
            <div className="console__main">
              <p className="console__label">Workflow</p>
              <div className="wf">
                <span className="wf-rail" aria-hidden="true">
                  <span className="wf-rail-fill" />
                </span>
                <ol className="wf__list" role="list">
                {STEPS.map((s) => (
                  <li className="wf-step" key={s.name}>
                    <span className="wf-dot" aria-hidden="true" />
                    <span className="wf-text">
                      <span className="wf-name">{s.name}</span>
                      <span className="wf-detail">{s.detail}</span>
                    </span>
                    <span className="wf-status">
                      <span className="wf-state wf-state--pending" aria-hidden="true">
                        pending
                      </span>
                      <span className="wf-state wf-state--done">done</span>
                    </span>
                  </li>
                ))}
                </ol>
              </div>

              <div className="log" aria-label="Sample log output">
                {LOG.map(([t, level, msg]) => (
                  <p className="log__line" key={t + msg}>
                    <span className="log__time">{t}</span>
                    <span className={`log__level log__level--${level}`}>{level}</span>
                    <span>{msg}</span>
                  </p>
                ))}
              </div>
            </div>

            <div className="console__aside">
              <div className="metrics">
                {METRICS.map((m) => (
                  <div className="metric" key={m.label}>
                    <p className="metric__label">{m.label}</p>
                    <p className="metric__value">
                      <span data-value={m.value} data-decimals={m.decimals}>
                        {fmt(m)}
                      </span>
                      {m.suffix}
                    </p>
                  </div>
                ))}
              </div>

              <div className="chart">
                <p className="console__label">Runs per hour</p>
                <div className="chart__bars" aria-hidden="true">
                  {BARS.map((v, i) => (
                    <span className="chart__bar" key={i} style={{ '--v': v }} />
                  ))}
                </div>
              </div>

              <div className="queue">
                <p className="console__label">
                  Validation queue <span>cleared</span>
                </p>
                <span className="queue__track" aria-hidden="true">
                  <span className="queue__fill" />
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="illustrative-note dashboard__note">
          Illustrative demo data showing the workflow pattern, not metrics from a real product.
        </p>
      </Container>
    </section>
  )
}
