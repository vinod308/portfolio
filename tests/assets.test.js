import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { site } from '../src/data/site.js'

const PUBLIC = path.resolve(import.meta.dirname, '../public')
const read = (p) => readFileSync(path.join(PUBLIC, p))

function pngSize(buf) {
  expect(buf.subarray(1, 4).toString()).toBe('PNG')
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

describe('public assets', () => {
  it('ships the résumé PDF the site links to', () => {
    const file = site.resume.replace(/^\//, '')
    expect(existsSync(path.join(PUBLIC, file))).toBe(true)
    expect(read(file).subarray(0, 5).toString()).toBe('%PDF-')
  })

  it('ships every logo variant and favicon as valid SVG', () => {
    for (const f of [
      'favicon.svg',
      'brand/vk-logo-dark.svg',
      'brand/vk-logo-light.svg',
      'brand/vk-mark-dark.svg',
      'brand/vk-mark-light.svg',
      'brand/vk-app-icon.svg',
    ]) {
      const svg = read(f).toString()
      expect(svg, f).toMatch(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
      expect(svg, f).toContain('</svg>')
    }
  })

  it('ships correctly sized raster icons and social preview', () => {
    expect(pngSize(read('apple-touch-icon.png'))).toEqual({ width: 180, height: 180 })
    expect(pngSize(read('og-image.png'))).toEqual({ width: 1200, height: 630 })
  })

  it('references those assets from index.html', () => {
    const html = readFileSync(path.resolve(PUBLIC, '../index.html'), 'utf8')
    for (const ref of ['/favicon.svg', '/apple-touch-icon.png', '/og-image.png', 'twitter:card', 'og:title']) {
      expect(html).toContain(ref)
    }
  })
})
