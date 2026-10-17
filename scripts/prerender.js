// Last step of `npm run build`: turns the client build's empty index.html into
// one fully rendered page per route, so crawlers that don't run JavaScript
// (AI crawlers, link previews) get the real content, title, canonical and
// JSON-LD. Uses the SSR bundle built from src/entry-server.jsx.
//
// Usage: node scripts/prerender.js [outDir] [ssrEntry]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const outDir = path.resolve(process.argv[2] || 'dist')
const ssrEntry = path.resolve(process.argv[3] || 'node_modules/.prerender/entry-server.js')
const { PAGE_META, ROUTES, SITE_URL, headTags, llmsFullTxt, llmsTxt, renderRoute } = await import(pathToFileURL(ssrEntry).href)

const ROOT = '<div id="root"></div>'
// Page-specific tags in index.html; each page gets its own from headTags().
const PER_PAGE_TAGS = [
  /\s*<title>[\s\S]*?<\/title>/,
  /\s*<meta\s+name="description"[\s\S]*?\/>/,
  /\s*<meta\s+property="og:title"[\s\S]*?\/>/,
  /\s*<meta\s+property="og:description"[\s\S]*?\/>/,
  /\s*<meta\s+property="og:url"[\s\S]*?\/>/,
  /\s*<link\s+rel="canonical"[\s\S]*?\/>/,
]

let template = readFileSync(path.join(outDir, 'index.html'), 'utf8')
if (!template.includes(ROOT)) throw new Error(`${ROOT} not found in index.html (already prerendered?)`)
for (const re of PER_PAGE_TAGS) template = template.replace(re, '')

// data-route tells main.jsx which page the HTML is, so it only hydrates when
// the URL matches (hosts may serve a page's HTML for other URLs).
const page = (head, route, body = '') =>
  template
    .replace(/\s*<\/head>/, `\n    ${head}\n  </head>`)
    .replace(ROOT, route ? `<div id="root" data-route="${route}">${body}</div>` : ROOT)

function write(file, html) {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, html)
}

for (const { path: route, meta } of ROUTES) {
  const body = await renderRoute(route)
  if (!body.includes('<h1')) throw new Error(`Prerendered ${route} has no <h1>; did a lazy page fail to load?`)
  write(path.join(outDir, route, 'index.html'), page(headTags(route, meta), route, body))
  console.log(`prerendered ${route}`)
}

// Unknown URLs: static hosts serve 404.html, which renders client-side (it
// can't know the URL in advance) and asks search engines not to index it.
write(path.join(outDir, '404.html'), page(headTags('/404', PAGE_META.notFound, { noindex: true })))
console.log('wrote 404.html')

// Markdown versions for AI assistants; their links need absolute URLs.
if (SITE_URL) {
  write(path.join(outDir, 'llms.txt'), llmsTxt())
  write(path.join(outDir, 'llms-full.txt'), llmsFullTxt())
  console.log('wrote llms.txt, llms-full.txt')
}
