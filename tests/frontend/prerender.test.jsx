// Runs in Node (no DOM), like the build-time prerender itself.
import { beforeAll, describe, expect, it, vi } from 'vitest'

const SITE = 'https://example.dev'
let server
let structuredData

beforeAll(async () => {
  // pageMeta.js reads these at import time.
  vi.stubEnv('VITE_SITE_URL', SITE)
  vi.stubEnv('VITE_TRAILING_SLASH', 'true')
  vi.resetModules()
  server = await import('../../src/entry-server.jsx')
  ;({ structuredData } = await import('../../src/lib/structuredData.js'))
})

const jsonLd = (head) => JSON.parse(head.match(/<script type="application\/ld\+json">(.*)<\/script>/)[1])

describe('prerendered pages', () => {
  it('lists every page, including each case study', () => {
    const paths = server.ROUTES.map((r) => r.path)
    expect(paths).toEqual(
      expect.arrayContaining(['/', '/projects', '/about', '/contact', '/projects/moneygence', '/projects/haylow', '/projects/ongrid']),
    )
  })

  it('keeps every title within 60 characters and descriptions within 160', () => {
    for (const { path, meta } of server.ROUTES) {
      const head = server.headTags(path, meta)
      const title = head.match(/<title>(.*)<\/title>/)[1].replace(/&amp;/g, '&')
      const description = head.match(/<meta name="description" content="([^"]*)"/)[1]
      expect(title.length, path).toBeLessThanOrEqual(60)
      expect(description.length, path).toBeLessThanOrEqual(160)
    }
  })

  it('separates the hero heading lines with spaces', async () => {
    const home = await server.renderRoute('/')
    const h1 = home.match(/<h1[^>]*>(.*?)<\/h1>/s)[1].replace(/<[^>]+>/g, '')
    expect(h1).toBe('I build digital products and AI-powered apps that hold up in production.')
  })

  it('renders real page content, not an empty shell', async () => {
    const about = await server.renderRoute('/about')
    expect(about).toContain('<h1')
    expect(about).toContain('I build full stack products and keep them running')

    const study = await server.renderRoute('/projects/haylow')
    expect(study).toContain('Haylow.ai')
    expect(study).toContain('Problem &amp; context')
  })

  it('gives each page its own title, description and trailing-slash canonical', () => {
    const route = server.ROUTES.find((r) => r.path === '/projects/ongrid')
    const head = server.headTags(route.path, route.meta)
    expect(head).toContain('<title>OnGrid.work: Team Operations SaaS · Vinod Kumar</title>')
    expect(head).toContain(`<link rel="canonical" href="${SITE}/projects/ongrid/" />`)
    expect(head).toContain(`<meta property="og:url" content="${SITE}/projects/ongrid/" />`)
    expect(head).toMatch(/<meta name="description" content="OnGrid\.work /)
  })

  it('marks the 404 page noindex without a canonical or JSON-LD', () => {
    const head = server.headTags('/404', server.PAGE_META.notFound, { noindex: true })
    expect(head).toContain('<meta name="robots" content="noindex" />')
    expect(head).not.toContain('canonical')
    expect(head).not.toContain('ld+json')
  })

  it('escapes HTML in head values', () => {
    const head = server.headTags('/', { title: 'A <b> & "c"', description: '<script>' })
    expect(head).toContain('<title>A &lt;b&gt; &amp; "c" · Vinod Kumar</title>')
    expect(head).toContain('content="&lt;script&gt;"')
  })
})

describe('llms.txt', () => {
  it('follows the llms.txt layout with absolute links to every page', () => {
    const txt = server.llmsTxt()
    expect(txt).toMatch(/^# Vinod Kumar\n\n> /)
    for (const { path } of server.ROUTES) expect(txt).toContain(`(${SITE}${path === '/' ? '/' : `${path}/`})`)
    expect(txt).toContain(`(${SITE}/llms-full.txt)`)
    expect(txt).toContain('(https://www.linkedin.com/in/vinod308)')
  })

  it('includes case study content but leaves out the unconfirmed decisions', () => {
    const full = server.llmsFullTxt()
    expect(full).toContain('Built the integrations with 4 AI providers.')
    expect(full).toContain('Garage Productions Pvt Ltd')
    expect(full).toContain('**Workflow: How the modules I owned relate.**')
    // A "decisions" entry marked CONFIRM in projects.js
    expect(full).not.toContain('One pipeline for every provider')
  })
})

describe('structured data', () => {
  it('describes the person with facts from site.js', () => {
    const person = structuredData('/')['@graph'].find((n) => n['@type'] === 'Person')
    expect(person).toMatchObject({
      '@id': `${SITE}/#person`,
      name: 'Vinod Kumar',
      jobTitle: ['Full Stack Developer', 'AI Application Engineer'],
      address: { addressLocality: 'Noida', addressCountry: 'India' },
      sameAs: ['https://github.com/vinod308', 'https://www.linkedin.com/in/vinod308'],
    })
  })

  it('adds an article and breadcrumbs to case studies', () => {
    const graph = structuredData('/projects/moneygence')['@graph']
    const article = graph.find((n) => n['@type'] === 'Article')
    expect(article).toMatchObject({
      '@id': `${SITE}/projects/moneygence/#article`,
      headline: 'MoneyGence: Financial Management SaaS',
      author: { '@id': `${SITE}/#person` },
      about: { name: 'MoneyGence', url: 'https://moneygence.com/' },
    })
    const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList').itemListElement
    expect(crumbs.map((c) => c.item)).toEqual([`${SITE}/`, `${SITE}/projects/`, `${SITE}/projects/moneygence/`])
  })

  it('uses ProfilePage for home and about, and nothing for unknown paths', () => {
    expect(structuredData('/')['@graph'].some((n) => n['@type'] === 'ProfilePage')).toBe(true)
    expect(structuredData('/about')['@graph'].some((n) => n['@type'] === 'ProfilePage')).toBe(true)
    expect(structuredData('/nope')).toBeNull()
  })

  it('cannot break out of its script tag', () => {
    const route = server.ROUTES.find((r) => r.path === '/projects/haylow')
    const head = server.headTags(route.path, route.meta)
    const script = head.match(/<script type="application\/ld\+json">(.*)<\/script>/)[1]
    expect(script).not.toContain('<')
    expect(jsonLd(head)['@context']).toBe('https://schema.org')
  })
})

describe('admin page', () => {
  it('is not a public route: not prerendered, not in the sitemap list', () => {
    expect(server.ROUTES.map((r) => r.path)).not.toContain('/admin')
  })

  it('gets a noindex shell with no canonical or JSON-LD', () => {
    const head = server.headTags('/admin', { title: 'Admin' }, { noindex: true })
    expect(head).toContain('<meta name="robots" content="noindex" />')
    expect(head).not.toContain('canonical')
    expect(head).not.toContain('ld+json')
  })

  it('stays out of llms.txt', () => {
    expect(server.llmsTxt()).not.toContain('/admin')
    expect(server.llmsFullTxt()).not.toContain('/admin')
  })
})
