import { useEffect } from 'react'

const SITE = 'Vinod Kumar'
const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '')
const DEFAULT_TITLE = 'Vinod Kumar · Full Stack Developer & AI Application Engineer'
const DEFAULT_DESCRIPTION =
  'Vinod Kumar is a Full Stack Developer and AI Application Engineer in Noida, India, building production SaaS applications with React, Node.js, PostgreSQL and AI integrations.'

function setMeta(selector, attr, key, content) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Sets the document title, meta description and matching Open Graph tags. */
export function usePageMeta({ title, description } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE}` : DEFAULT_TITLE
    const desc = description ?? DEFAULT_DESCRIPTION
    document.title = fullTitle
    setMeta('meta[name="description"]', 'name', 'description', desc)
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle)
    setMeta('meta[property="og:description"]', 'property', 'og:description', desc)
    if (SITE_URL) {
      const base = import.meta.env.BASE_URL
      const { pathname } = window.location
      const path = pathname.startsWith(base) ? pathname.slice(base.length - 1) : pathname
      const url = `${SITE_URL}${path}`
      setMeta('meta[property="og:url"]', 'property', 'og:url', url)
      let link = document.head.querySelector('link[rel="canonical"]')
      if (!link) {
        link = document.createElement('link')
        link.rel = 'canonical'
        document.head.appendChild(link)
      }
      link.href = url
    }
  }, [title, description])
}
