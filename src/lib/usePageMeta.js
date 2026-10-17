import { useEffect } from 'react'
import { pageUrl, resolveMeta } from './pageMeta.js'

function setMeta(selector, attr, key, content) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * Keeps the document title, meta description, Open Graph tags and canonical
 * link in sync during client-side navigation. The prerendered HTML already
 * contains the same values for the first page load.
 */
export function usePageMeta(meta) {
  const { title, description } = resolveMeta(meta)
  useEffect(() => {
    document.title = title
    setMeta('meta[name="description"]', 'name', 'description', description)
    setMeta('meta[property="og:title"]', 'property', 'og:title', title)
    setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    const base = import.meta.env.BASE_URL
    const { pathname } = window.location
    const url = pageUrl(pathname.startsWith(base) ? pathname.slice(base.length - 1) : pathname)
    if (url) {
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
