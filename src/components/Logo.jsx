import { useId, useRef } from 'react'
import { Link } from 'react-router'
import { useMotion, gsap } from '../lib/motion.js'
import './Logo.css'

// "VK as a system graph". Geometry mirrors scripts/build-brand.py (64-unit
// grid). One stroke draws V and K, sharing the vertex at (34,14); open ends are
// nodes and the K junction is the hub. Keep both files in sync.
const STROKE = 'M10 14 L22 50 L34 14 L34 50 M34 32 L54 14 M34 32 L54 50'
const ENDS = [
  [10, 14],
  [34, 50],
  [54, 14],
  [54, 50],
]
const HUB = [34, 32]
// The signal's route: one continuous subpath (dash patterns restart per
// subpath) from the V, over the shared vertex, through the hub, out the leg.
const SIGNAL = 'M10 14 L22 50 L34 14 L34 32 L54 50'

/**
 * The animated VK mark.
 * motion: "intro"  draws itself once on load; hovering the parent link replays the signal
 *         "signal" intro, then a signal pulse travels the graph every few seconds
 *         "none"   static
 */
export function LogoMark({ size = 32, motion = 'intro', className = '' }) {
  const ref = useRef(null)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  useMotion(ref, (q) => {
    if (motion === 'none') return undefined
    const tl = gsap.timeline({ delay: 0.15 })
    tl.from(q('.vk-stroke'), { attr: { 'stroke-dashoffset': 1 }, duration: 1.3, ease: 'power2.inOut' })
      .from(q('.vk-node'), { scale: 0, transformOrigin: 'center', duration: 0.45, stagger: 0.12, ease: 'back.out(3)' }, 0.55)
      .from(q('.vk-hub'), { scale: 0, transformOrigin: 'center', duration: 0.6, ease: 'back.out(2.5)' }, 0.9)
      .from(q('.vk-glow'), { autoAlpha: 0, scale: 0.4, transformOrigin: 'center', duration: 0.9 }, 1.0)
      .fromTo(
        q('.vk-ring'),
        { scale: 0.6, autoAlpha: 0.9, transformOrigin: 'center' },
        { scale: 2.4, autoAlpha: 0, duration: 1.1, ease: 'power2.out', immediateRender: false },
        1.05,
      )

    // Signal: a short bright dash that runs the whole graph.
    const pulse = () =>
      gsap
        .timeline()
        .set(q('.vk-pulse'), { autoAlpha: 1, attr: { 'stroke-dashoffset': 0.07 } })
        .to(q('.vk-pulse'), { attr: { 'stroke-dashoffset': -1 }, duration: 1.5, ease: 'power1.inOut' })
        .to(q('.vk-pulse'), { autoAlpha: 0, duration: 0.2 }, '-=0.15')
        .fromTo(
          q('.vk-ring'),
          { scale: 0.6, autoAlpha: 0.8, transformOrigin: 'center' },
          { scale: 2.2, autoAlpha: 0, duration: 0.9, ease: 'power2.out', immediateRender: false },
          0.55,
        )

    if (motion === 'signal') {
      tl.add(() => {
        pulse()
        const loop = gsap.timeline({ repeat: -1, repeatDelay: 4.5, delay: 4.5 })
        loop.add(pulse())
      }, '+=0.3')
      return undefined
    }

    // intro: replay the signal when the logo's link is hovered or focused
    const host = ref.current.closest('a') ?? ref.current
    let running = null
    const replay = () => {
      if (running?.isActive()) return
      running = pulse()
    }
    host.addEventListener('mouseenter', replay)
    host.addEventListener('focus', replay)
    return () => {
      host.removeEventListener('mouseenter', replay)
      host.removeEventListener('focus', replay)
    }
  })

  return (
    <svg
      ref={ref}
      className={`logo-mark ${className}`.trim()}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-g`} x1="10" y1="14" x2="54" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--logo-from)" />
          <stop offset="1" stopColor="var(--logo-to)" />
        </linearGradient>
        <radialGradient id={`${uid}-h`}>
          <stop offset="0" stopColor="var(--logo-hub)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--logo-hub)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="vk-glow" cx={HUB[0]} cy={HUB[1]} r="11" fill={`url(#${uid}-h)`} />
      <path
        className="vk-stroke"
        d={STROKE}
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset="0"
        stroke={`url(#${uid}-g)`}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        className="vk-pulse"
        d={SIGNAL}
        pathLength="1"
        strokeDasharray="0.07 2"
        strokeDashoffset="0.07"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      {ENDS.map(([x, y]) => (
        <circle key={`${x}-${y}`} className="vk-node" cx={x} cy={y} r="3.4" strokeWidth="1.8" />
      ))}
      <circle className="vk-ring" cx={HUB[0]} cy={HUB[1]} r="4.6" fill="none" strokeWidth="1.2" />
      <circle className="vk-hub" cx={HUB[0]} cy={HUB[1]} r="4.6" />
      <circle className="vk-hub-core" cx={HUB[0]} cy={HUB[1]} r="1.8" />
    </svg>
  )
}

/**
 * Brand lockup. Renders as a router link when `to` is set.
 * variant: "full" (mark + wordmark) | "mark"
 */
export default function Logo({ variant = 'full', to, size = 32, motion = 'intro', tagline = false, className = '' }) {
  const content = (
    <>
      <LogoMark size={size} motion={motion} />
      {variant === 'full' ? (
        <span className="logo__text">
          <span className="logo__wordmark">Vinod Kumar</span>
          {tagline && <span className="logo__tagline">Full stack · AI engineer</span>}
        </span>
      ) : (
        <span className="visually-hidden">Vinod Kumar</span>
      )}
    </>
  )
  const classes = `logo ${className}`.trim()

  return to ? (
    <Link className={classes} to={to} aria-label="Vinod Kumar, home">
      {content}
    </Link>
  ) : (
    <span className={classes}>{content}</span>
  )
}
