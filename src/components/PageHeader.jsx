import { useRef } from 'react'
import SectionHeading from './SectionHeading.jsx'
import { useMotion, gsap } from '../lib/motion.js'
import './PageHeader.css'

/**
 * Top-of-page header for inner pages: h1 with eyebrow and description,
 * optional children (actions, chips) and an optional `aside` (visual).
 */
export default function PageHeader({ eyebrow, title, description, aside, children }) {
  const ref = useRef(null)

  useMotion(ref, (q) => {
    gsap
      .timeline({ delay: 0.1 })
      .from(q('.section-heading > *'), { autoAlpha: 0, y: 22, duration: 0.8, stagger: 0.08 })
      .from(q('.page-header__extra > *'), { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.06 }, '-=0.45')
  })

  return (
    <header className={`page-header ${aside ? 'page-header--split' : ''}`} ref={ref}>
      <div className="page-header__main">
        <SectionHeading as="h1" eyebrow={eyebrow} title={title} description={description} />
        {children && <div className="page-header__extra">{children}</div>}
      </div>
      {aside && <div className="page-header__aside">{aside}</div>}
    </header>
  )
}
