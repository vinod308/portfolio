// Build-time renderer used by scripts/prerender.js (never shipped to the
// browser). Renders a route to HTML and returns the <head> tags for it.
import { StrictMode } from 'react'
import { prerender } from 'react-dom/static'
import { StaticRouter } from 'react-router'
import { AppRoutes } from './App.jsx'
import { caseStudies } from './data/projects.js'
import { PAGE_META, caseStudyMeta, pageUrl, resolveMeta } from './lib/pageMeta.js'
import { structuredData } from './lib/structuredData.js'

export { PAGE_META }

const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '')

/** Every page that gets its own prerendered index.html. */
export const ROUTES = [
  { path: '/', meta: PAGE_META.home },
  { path: '/projects', meta: PAGE_META.projects },
  { path: '/about', meta: PAGE_META.about },
  { path: '/contact', meta: PAGE_META.contact },
  ...caseStudies.map((p) => ({ path: `/projects/${p.slug}`, meta: caseStudyMeta(p) })),
]

const attr = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const text = (v) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Title, description, Open Graph, canonical and JSON-LD tags for a page. */
export function headTags(path, meta, { noindex = false } = {}) {
  const { title, description } = resolveMeta(meta)
  const tags = [
    `<title>${text(title)}</title>`,
    `<meta name="description" content="${attr(description)}" />`,
    `<meta property="og:title" content="${attr(title)}" />`,
    `<meta property="og:description" content="${attr(description)}" />`,
  ]
  if (noindex) {
    tags.push('<meta name="robots" content="noindex" />')
  } else if (pageUrl(path)) {
    tags.push(`<link rel="canonical" href="${attr(pageUrl(path))}" />`)
    tags.push(`<meta property="og:url" content="${attr(pageUrl(path))}" />`)
    const data = structuredData(path)
    // Escape "<" so the JSON can never close the script element early.
    if (data) tags.push(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`)
  }
  return tags.join('\n    ')
}

/** Render a route path (without the base path) to its static HTML. */
export async function renderRoute(path) {
  const { prelude } = await prerender(
    <StrictMode>
      <StaticRouter basename={BASENAME} location={`${BASENAME}${path}`}>
        <AppRoutes />
      </StaticRouter>
    </StrictMode>,
  )
  return new Response(prelude).text()
}
