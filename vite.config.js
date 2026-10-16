import path from 'node:path'
import { copyFileSync, existsSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { caseStudies } from './src/data/projects.js'

const ROUTES = ['/', '/projects', '/about', '/contact', ...caseStudies.map((p) => `/projects/${p.slug}`)]

/**
 * Fills absolute URLs into index.html (__SITE_URL__) and, when VITE_SITE_URL
 * is set, emits sitemap.xml. robots.txt is always emitted.
 */
function siteMeta(siteUrl) {
  return {
    name: 'site-meta',
    transformIndexHtml(html) {
      let out = html.replaceAll('__SITE_URL__', siteUrl)
      if (siteUrl) {
        out = out.replace(
          '</head>',
          `    <link rel="canonical" href="${siteUrl}/" />\n    <meta property="og:url" content="${siteUrl}/" />\n  </head>`,
        )
      }
      return out
    },
    generateBundle() {
      const robots = ['User-agent: *', 'Allow: /', ...(siteUrl ? [`Sitemap: ${siteUrl}/sitemap.xml`] : []), '']
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') })
      if (!siteUrl) return
      const urls = ROUTES.map((r) => `  <url><loc>${siteUrl}${r === '/' ? '/' : r}</loc></url>`).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
    },
    // Static hosts (GitHub Pages) serve 404.html for unknown paths: make it the
    // app shell so direct links to client routes still load.
    writeBundle(options) {
      const dir = options.dir || 'dist'
      const index = path.join(dir, 'index.html')
      if (existsSync(index)) copyFileSync(index, path.join(dir, '404.html'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (env.VITE_SITE_URL || '').replace(/\/$/, '')
  // Dev and preview forward /api to the Express server (npm run dev:server).
  const proxy = { '/api': { target: env.API_PROXY_TARGET || 'http://localhost:3001' } }
  return {
    // '/portfolio/' for the GitHub Pages project site; '/' everywhere else.
    base: env.VITE_BASE || '/',
    plugins: [react(), siteMeta(siteUrl)],
    server: { proxy },
    preview: { proxy },
    test: {
      include: ['tests/**/*.test.{js,jsx}'],
      setupFiles: ['tests/setup.js'],
      restoreMocks: true,
    },
  }
})
