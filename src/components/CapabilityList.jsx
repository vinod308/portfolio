import { useRef } from 'react'
import { capabilities } from '../data/content.js'
import { useMotion, gsap } from '../lib/motion.js'
import './CapabilityList.css'

/**
 * The five capability areas on a connector rail.
 * headingLevel sets the item heading tag (default h4 for use under an h3).
 */
export default function CapabilityList({ headingLevel = 4 }) {
  const ref = useRef(null)
  const ItemHeading = `h${headingLevel}`

  useMotion(ref, (q, { isDesktop }) => {
    const list = ref.current
    // Rail draws as you scroll through the list (desktop) or grows once (mobile).
    gsap.from(q('.cap-rail__fill'), {
      scaleY: 0,
      transformOrigin: 'center top',
      ease: 'none',
      scrollTrigger: isDesktop
        ? { trigger: list, start: 'top 70%', end: 'bottom 70%', scrub: 0.6 }
        : { trigger: list, start: 'top 80%', once: true },
      ...(isDesktop ? {} : { duration: 1.4, ease: 'power2.inOut' }),
    })

    q('.cap').forEach((item) => {
      const iq = gsap.utils.selector(item)
      const tl = gsap.timeline({ scrollTrigger: { trigger: item, start: 'top 78%', once: true } })
      tl.from(iq('.cap__node'), { scale: 0, duration: 0.5, ease: 'back.out(2.5)' })
        .from(iq('.cap__index, .cap__title, .cap__body'), { autoAlpha: 0, x: 16, duration: 0.6, stagger: 0.07 }, '<0.1')
        .from(iq('.chip'), { autoAlpha: 0, y: 6, duration: 0.35, stagger: 0.04 }, '<0.3')
    })
  })

  return (
    <div className="cap-list" ref={ref}>
      <span className="cap-rail" aria-hidden="true">
        <span className="cap-rail__fill" />
      </span>
      <ol role="list" className="cap-list__items">
        {capabilities.map((c, i) => (
          <li className="cap" key={c.title}>
            <span className="cap__node" aria-hidden="true" />
            <p className="cap__index mono-label">{String(i + 1).padStart(2, '0')}</p>
            <ItemHeading className="cap__title">{c.title}</ItemHeading>
            <p className="cap__body">{c.body}</p>
            <ul className="chips" role="list" aria-label="Technologies">
              {c.tech.map((t) => (
                <li className="chip" key={t}>
                  {t}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
