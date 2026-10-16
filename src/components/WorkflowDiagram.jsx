import { useRef } from 'react'
import { useMotion, gsap } from '../lib/motion.js'
import './WorkflowDiagram.css'

/**
 * Step-by-step workflow: horizontal on wide screens, vertical on narrow.
 * steps: [{ label, meta }]. Connectors grow and nodes light up in order.
 */
export default function WorkflowDiagram({ title, steps, note }) {
  const ref = useRef(null)

  useMotion(ref, (q, { isDesktop }) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top 78%', once: true } })
    q('.wf2__step').forEach((step, i) => {
      const sq = (sel) => step.querySelectorAll(sel)
      const at = i * (isDesktop ? 0.32 : 0.24)
      tl.from(step, { autoAlpha: 0, y: 14, duration: 0.5 }, at)
        .from(sq('.wf2__dot'), { scale: 0, duration: 0.4, ease: 'back.out(3)' }, at + 0.1)
      const link = sq('.wf2__link')
      if (link.length) {
        tl.from(
          link,
          {
            [isDesktop ? 'scaleX' : 'scaleY']: 0,
            transformOrigin: isDesktop ? 'left center' : 'center top',
            duration: 0.4,
            ease: 'power2.inOut',
          },
          at + 0.25,
        )
      }
    })
  })

  return (
    <figure className="wf2" ref={ref}>
      {title && <figcaption className="wf2__title mono-label">{title}</figcaption>}
      <ol className="wf2__steps" role="list">
        {steps.map((s, i) => (
          <li className="wf2__step" key={s.label}>
            <span className="wf2__dot" aria-hidden="true" />
            {i < steps.length - 1 && <span className="wf2__link" aria-hidden="true" />}
            <span className="wf2__label">{s.label}</span>
            {s.meta && <span className="wf2__meta">{s.meta}</span>}
          </li>
        ))}
      </ol>
      {note && <p className="illustrative-note wf2__note">{note}</p>}
    </figure>
  )
}
