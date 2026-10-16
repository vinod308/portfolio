import { useRef } from 'react'
import { useMotion, gsap, reveal, clipReveal } from '../lib/motion.js'
import avif400 from '../assets/portrait/vinod-400.avif'
import avif640 from '../assets/portrait/vinod-640.avif'
import avif960 from '../assets/portrait/vinod-960.avif'
import webp400 from '../assets/portrait/vinod-400.webp'
import webp640 from '../assets/portrait/vinod-640.webp'
import webp960 from '../assets/portrait/vinod-960.webp'
import jpg640 from '../assets/portrait/vinod-640.jpg'
import './Portrait.css'

// Rendered width: 15rem on desktop, up to 20rem below that.
const SIZES = '(min-width: 64rem) 15rem, (max-width: 22rem) 100vw, 20rem'

/** Optimised portrait (AVIF/WebP/JPEG) with its own reveal animation. */
export default function Portrait({ eager = false, className = '' }) {
  const ref = useRef(null)

  useMotion(ref, (q, { isDesktop }) => {
    const el = ref.current
    const scrollTrigger = eager ? undefined : { trigger: el, start: 'top 85%', once: true }
    if (isDesktop) {
      clipReveal(el, { trigger: eager ? undefined : el, start: 'top 85%', delay: eager ? 0.2 : 0 })
      // Image settles from a slight zoom inside its frame as the panel opens.
      gsap.from(q('.portrait__img'), { scale: 1.12, duration: 1.6, delay: eager ? 0.2 : 0, scrollTrigger })
    } else {
      reveal(el, { trigger: eager ? undefined : el, y: 20 })
    }
  })

  return (
    <figure className={`portrait ${className}`.trim()} ref={ref}>
      <picture>
        <source type="image/avif" srcSet={`${avif400} 400w, ${avif640} 640w, ${avif960} 960w`} sizes={SIZES} />
        <source type="image/webp" srcSet={`${webp400} 400w, ${webp640} 640w, ${webp960} 960w`} sizes={SIZES} />
        <img
          className="portrait__img"
          src={jpg640}
          width="640"
          height="853"
          alt="Vinod Kumar in a navy blazer and white shirt"
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          {...(eager && { fetchPriority: 'high' })}
        />
      </picture>
      <figcaption className="portrait__caption">
        <span className="portrait__dot" aria-hidden="true" />
        Vinod Kumar · Noida, India
      </figcaption>
    </figure>
  )
}
