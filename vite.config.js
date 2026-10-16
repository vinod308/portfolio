import path from 'node:path'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { caseStudies } from './src/data/projects.js'

const ROUTES = ['/', '/projects', '/about', '/contact', ...caseStudies.map((p) => `/projects/${p.slug}`)]

/**
 * Fills absolute URLs into index.html (__SITE_URL__) and, when VITE_SITE_URL
 * is set, emits sitemap.xml. robots.txt is always emitted.
 */
function siteMeta(siteUrl, trailingSlash) {
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
    // Static hosts (GitHub Pages) have no SPA rewrites. Give every known route
    // its own index.html so it answers 200 (and can be indexed), and make
    // 404.html the app shell so unknown links still render the 404 page.
    writeBundle(options) {
      const dir = options.dir || 'dist'
      const index = path.join(dir, 'index.html')
      if (!existsSync(index)) return
      copyFileSync(index, path.join(dir, '404.html'))
      for (const route of ROUTES.filter((r) => r !== '/')) {
        const target = path.join(dir, route, 'index.html')
        mkdirSync(path.dirname(target), { recursive: true })
        copyFileSync(index, target)
      }
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
