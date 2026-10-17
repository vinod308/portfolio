// Page titles, descriptions and canonical URLs. Pure functions, shared by the
// client hook (usePageMeta) and the build-time prerender (entry-server.jsx).

export const SITE_NAME = 'Vinod Kumar'
export const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '')
const TRAILING_SLASH = import.meta.env.VITE_TRAILING_SLASH === 'true'

export const DEFAULT_TITLE = 'Vinod Kumar · Full Stack Developer & AI Application Engineer'
export const DEFAULT_DESCRIPTION =
  'Vinod Kumar is a Full Stack Developer and AI Application Engineer in Noida, India, building production SaaS applications with React, Node.js, PostgreSQL and AI integrations.'

export const PAGE_META = {
  home: {},
  projects: {
    title: 'Projects',
    description:
      'SaaS products, AI applications, e-commerce storefronts and web platforms built by Vinod Kumar with React, Node.js, PostgreSQL, Shopify and WordPress.',
  },
  about: {
    title: 'About',
    description:
      'About Vinod Kumar: full stack developer in Noida with nearly 7 years of experience in React, Node.js, PostgreSQL, AI integrations and production deployment.',
  },
  contact: {
    title: 'Contact',
    description:
      'Contact Vinod Kumar about full stack engineering roles, product development or AI integration work. Email vinodvinni308@gmail.com.',
  },
  notFound: { title: 'Page not found', description: 'This page does not exist on Vinod Kumar’s portfolio.' },
}

export const caseStudyMeta = (p) => ({ title: `${p.name} case study`, description: p.caseStudy.overview })

/** Full title and description with site defaults applied. */
export function resolveMeta({ title, description } = {}) {
  return {
    title: title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE,
    description: description ?? DEFAULT_DESCRIPTION,
  }
}

/**
 * Absolute URL for a route path (without the base path), e.g. '/about'.
 * Static hosts that serve folders (GitHub Pages, Hostinger) canonicalise to a
 * trailing slash. Returns '' when VITE_SITE_URL is not set.
 */
export function pageUrl(path) {
  if (!SITE_URL) return ''
  const slash = TRAILING_SLASH && !path.endsWith('/') ? '/' : ''
  return `${SITE_URL}${path}${slash}`
}
