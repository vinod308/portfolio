// Shared GSAP setup and animation presets.
//
// Rules every section follows:
//  - Animate with useMotion(): it scopes selectors to the component, only runs
//    when the user allows motion, and reverts every tween/ScrollTrigger on
//    unmount (so React StrictMode's double effect leaves no duplicates).
//  - Content is fully visible in the static HTML/CSS. Animations only ever
//    animate *from* a hidden state, so reduced-motion users and no-JS readers
//    get the finished layout.
//  - Animate transform/opacity/clip-path/stroke only.
import { useLayoutEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin)
gsap.defaults({ ease: 'power3.out', duration: 0.8 })
// Section timelines target optional elements (e.g. chart bars that only some
// mock-ups have), so an empty selection is expected, not an error.
gsap.config({ nullTargetWarn: false })

// Dev-only handle for inspecting active triggers from the console.
if (import.meta.env.DEV && typeof window !== 'undefined') window.__motion = { gsap, ScrollTrigger }

export const MEDIA = {
  motion: '(prefers-reduced-motion: no-preference)',
  desktop: '(min-width: 64rem)',
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Run `setup(q, { isDesktop })` inside a gsap.matchMedia scoped to `scopeRef`.
 * `q` is a selector bound to the scope. Setup runs only when motion is allowed
 * and re-runs when the desktop breakpoint changes. Return a cleanup function
 * for anything GSAP doesn't own (event listeners).
 */
export function useMotion(scopeRef, setup) {
  useLayoutEffect(() => {
    const scope = scopeRef.current
    if (!scope) return undefined
    const mm = gsap.matchMedia(scope)
    mm.add(MEDIA, (ctx) => {
      if (!ctx.conditions.motion) return undefined
      return setup(gsap.utils.selector(scope), { isDesktop: ctx.conditions.desktop })
    })
    return () => {
      mm.revert()
      // countUp() rewrites text; put the final values back after a revert.
      scope.querySelectorAll('[data-final]').forEach((el) => {
        el.textContent = el.dataset.final
      })
    }
    // setup is defined inline by callers and intentionally runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

const onEnter = (trigger, start = 'top 82%') => (trigger ? { trigger, start, once: true } : undefined)

/** Fade + rise into place, optionally staggered and scroll-triggered. */
export function reveal(targets, { trigger, start, y = 28, stagger = 0.08, ...vars } = {}) {
  if (!targets || (targets.length === 0)) return null
  return gsap.from(targets, {
    y,
    autoAlpha: 0,
    stagger,
    scrollTrigger: onEnter(trigger, start),
    ...vars,
  })
}

/** Wipe an element in from the bottom edge with clip-path. */
export function clipReveal(targets, { trigger, start, ...vars } = {}) {
  return gsap.from(targets, {
    clipPath: 'inset(100% 0% 0% 0% round 16px)',
    duration: 1.1,
    ease: 'power4.out',
    scrollTrigger: onEnter(trigger, start),
    ...vars,
  })
}

/** Draw SVG strokes (path/line/rect/polyline) from 0 to full length. */
export function drawStroke(targets, { trigger, start, scrub, ...vars } = {}) {
  const els = gsap.utils.toArray(targets)
  els.forEach((el) => {
    const len = typeof el.getTotalLength === 'function' ? el.getTotalLength() : 0
    gsap.set(el, { strokeDasharray: len, strokeDashoffset: 0 })
  })
  return gsap.from(els, {
    strokeDashoffset: (_, el) => (typeof el.getTotalLength === 'function' ? el.getTotalLength() : 0),
    duration: 1.4,
    ease: 'power2.inOut',
    scrollTrigger: scrub ? { trigger, start, end: vars.end, scrub } : onEnter(trigger, start),
    ...vars,
  })
}

/** Grow a line/bar along one axis via scale (no layout work). */
export function growLine(targets, { trigger, start, axis = 'x', origin, ...vars } = {}) {
  return gsap.from(targets, {
    [axis === 'x' ? 'scaleX' : 'scaleY']: 0,
    transformOrigin: origin ?? (axis === 'x' ? 'left center' : 'center top'),
    duration: 1.1,
    ease: 'power2.inOut',
    scrollTrigger: onEnter(trigger, start),
    ...vars,
  })
}

/**
 * Count a number up to the value already rendered in the element.
 * Reads data-value (number) and data-decimals; the element's static text is
 * the final value, so nothing is lost without JS.
 */
export function countUp(el, vars = {}) {
  const end = parseFloat(el.dataset.value)
  const decimals = parseInt(el.dataset.decimals ?? '0', 10)
  const fmt = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  const finalText = el.dataset.final ?? el.textContent
  el.dataset.final = finalText
  const state = { v: 0 }
  return gsap.to(state, {
    v: end,
    duration: 1.6,
    ease: 'power2.out',
    onUpdate: () => {
      el.textContent = fmt.format(state.v)
    },
    onComplete: () => {
      el.textContent = finalText
    },
    ...vars,
  })
}

/**
 * Settle the inner UI of a ProjectMockup (rows, cards, bars) once `trigger`
 * enters. Shared by the homepage project rows and the case study pages.
 */
export function animateMockup(root, { trigger = root, delay = 0.3 } = {}) {
  const q = gsap.utils.selector(root)
  const tl = gsap.timeline({ scrollTrigger: { trigger, start: 'top 80%', once: true }, delay })
  tl.from(q('.mk-row, .mk-card, .mk-score, .mk-citations .mk-line'), {
    autoAlpha: 0,
    y: 8,
    duration: 0.45,
    stagger: 0.05,
  })
    .from(q('.mk-bar'), { scaleX: 0, transformOrigin: 'left center', duration: 0.9, stagger: 0.06, ease: 'power2.out' }, 0.1)
    .from(q('.mk-col__bar'), { scaleY: 0, transformOrigin: 'center bottom', duration: 0.9, stagger: 0.08, ease: 'power2.out' }, 0.1)
  return tl
}

export { gsap, ScrollTrigger }
