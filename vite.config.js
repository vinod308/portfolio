import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { caseStudies } from './src/data/projects.js'

const ROUTES = ['/', '/projects', '/about', '/contact', ...caseStudies.map((p) => `/projects/${p.slug}`)]

// Already allowed by "User-agent: *"; named so it is explicit that AI search,
// assistant and training crawlers are welcome (a portfolio wants to be cited).
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
]

/**
 * Fills absolute URLs into index.html (__SITE_URL__) and, when VITE_SITE_URL
 * is set, emits sitemap.xml. robots.txt is always emitted. Per-page HTML,
 * canonical links, 404.html and llms.txt come from scripts/prerender.js.
 */
function siteMeta(siteUrl, trailingSlash) {
  return {
    name: 'site-meta',
    transformIndexHtml(html) {
      return html.replaceAll('__SITE_URL__', siteUrl)
    },
    generateBundle() {
      const robots = [
        'User-agent: *',
        'Allow: /',
        '',
        ...AI_CRAWLERS.map((bot) => `User-agent: ${bot}`),
        'Allow: /',
        '',
        ...(siteUrl ? [`# AI-readable summary: ${siteUrl}/llms.txt`, `Sitemap: ${siteUrl}/sitemap.xml`, ''] : []),
      ]
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') })
      if (!siteUrl) return
      const loc = (r) => (r === '/' ? '/' : trailingSlash ? `${r}/` : r)
      const urls = ROUTES.map((r) => `  <url><loc>${siteUrl}${loc(r)}</loc></url>`).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode, isSsrBuild }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (env.VITE_SITE_URL || '').replace(/\/$/, '')
  // Dev and preview forward /api to the Express server (npm run dev:server).
  const proxy = { '/api': { target: env.API_PROXY_TARGET || 'http://localhost:3001' } }
  return {
    // '/portfolio/' for the GitHub Pages project site; '/' everywhere else.
    base: env.VITE_BASE || '/',
    // The SSR build (npm run build, step 2) only feeds scripts/prerender.js.
    plugins: [react(), !isSsrBuild && siteMeta(siteUrl, env.VITE_TRAILING_SLASH === 'true')],
    build: { copyPublicDir: !isSsrBuild },
    server: { proxy },
    preview: { proxy },
    test: {
      include: ['tests/**/*.test.{js,jsx}'],
      setupFiles: ['tests/setup.js'],
      restoreMocks: true,
    },
  }
})
