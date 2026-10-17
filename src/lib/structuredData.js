// schema.org JSON-LD for the prerendered pages. Every value comes from
// site.js / projects.js / pageMeta.js, so nothing here can drift from what
// the page itself says.
import { site } from '../data/site.js'
import { caseStudies } from '../data/projects.js'
import { DEFAULT_DESCRIPTION, PAGE_META, SITE_NAME, caseStudyMeta, pageUrl, resolveMeta } from './pageMeta.js'

const [locality, country] = site.location.split(', ')

function person() {
  const home = pageUrl('/')
  return {
    '@type': 'Person',
    '@id': `${home}#person`,
    name: site.name,
    url: home,
    jobTitle: site.title.split(' | '),
    description: DEFAULT_DESCRIPTION,
    email: `mailto:${site.email}`,
    address: { '@type': 'PostalAddress', addressLocality: locality, addressCountry: country },
    sameAs: site.socials.map((s) => s.href),
    knowsAbout: [...new Set(caseStudies.flatMap((p) => p.stack))],
  }
}

const ref = (node) => ({ '@id': node['@id'] })

function breadcrumbs(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: pageUrl(path),
    })),
  }
}

function webPage(type, path, meta, extra = {}) {
  const { title, description } = resolveMeta(meta)
  return {
    '@type': type,
    '@id': pageUrl(path),
    url: pageUrl(path),
    name: title,
    description,
    inLanguage: 'en',
    ...extra,
  }
}

/**
 * The JSON-LD graph for a route path such as '/', '/about' or
 * '/projects/haylow'. Returns null when there is no site URL to anchor ids to
 * or the path is not a known page.
 */
export function structuredData(path) {
  if (!pageUrl('/')) return null
  const me = person()
  const website = {
    '@type': 'WebSite',
    '@id': `${pageUrl('/')}#website`,
    url: pageUrl('/'),
    name: SITE_NAME,
    inLanguage: 'en',
    publisher: ref(me),
  }
  const graph = [website, me]
  const crumbs = (...items) => breadcrumbs([['Home', '/'], ...items])

  if (path === '/') {
    graph.push(webPage('ProfilePage', '/', PAGE_META.home, { mainEntity: ref(me), isPartOf: ref(website) }))
  } else if (path === '/about') {
    graph.push(
      webPage('ProfilePage', path, PAGE_META.about, { mainEntity: ref(me), isPartOf: ref(website) }),
      crumbs(['About', path]),
    )
  } else if (path === '/contact') {
    graph.push(
      webPage('ContactPage', path, PAGE_META.contact, { about: ref(me), isPartOf: ref(website) }),
      crumbs(['Contact', path]),
    )
  } else if (path === '/projects') {
    graph.push(
      webPage('CollectionPage', path, PAGE_META.projects, {
        isPartOf: ref(website),
        hasPart: caseStudies.map((p) => ({ '@id': `${pageUrl(`/projects/${p.slug}`)}#article` })),
      }),
      crumbs(['Projects', path]),
    )
  } else {
    const p = caseStudies.find((c) => path === `/projects/${c.slug}`)
    if (!p) return null
    const meta = caseStudyMeta(p)
    graph.push({
      '@type': 'Article',
      '@id': `${pageUrl(path)}#article`,
      headline: meta.title,
      description: meta.description,
      url: pageUrl(path),
      mainEntityOfPage: pageUrl(path),
      inLanguage: 'en',
      author: ref(me),
      publisher: ref(me),
      isPartOf: ref(website),
      about: { '@type': 'Thing', name: p.name, description: p.summary, ...(p.href ? { url: p.href } : {}) },
      keywords: p.stack,
    })
    graph.push(crumbs(['Projects', '/projects'], [p.name, path]))
  }

  return { '@context': 'https://schema.org', '@graph': graph }
}
