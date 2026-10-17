import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { makeApp } from './helpers.js'
import { createMemoryStore } from '../../server/adminStore.js'
import { deviceOf, parsePulse, sourceOf } from '../../server/analytics.js'

const BROWSER = 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/141 Safari/537.36'

function fakeAnalytics() {
  const events = []
  return {
    events,
    visitorId: async () => "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    record: async (e) => void events.push(e),
    stats: async (days) => ({ current: { visitors: 3, views: 5 }, previous: { visitors: 1, views: 2 }, series: [], days }),
  }
}

describe('pulse collector', () => {
  const beacon = (app, body, ua = BROWSER) =>
    request(app).post('/api/pulse').set('Origin', 'http://localhost:5173').set('User-Agent', ua)
      .set('Content-Type', 'text/plain').send(JSON.stringify(body))

  it('records a page view with source, device and country', async () => {
    const analytics = fakeAnalytics()
    const { app } = makeApp({ analyticsStore: analytics })
    const res = await beacon(app, { type: 'view', path: '/projects/haylow', referrer: 'https://www.google.com/', width: 390 })
      .set('X-Vercel-IP-Country', 'IN')
    expect(res.status).toBe(204)
    expect(analytics.events[0]).toMatchObject({ type: 'view', path: '/projects/haylow', source: 'google', device: 'mobile', country: 'IN' })
    expect(JSON.stringify(analytics.events[0])).not.toMatch(/127\.0\.0\.1|::1/) // no raw IP stored
  })

  it('ignores bots, admin pages, unknown events and junk', async () => {
    const analytics = fakeAnalytics()
    const { app } = makeApp({ analyticsStore: analytics })
    await beacon(app, { type: 'view', path: '/' }, 'Googlebot/2.1')
    await beacon(app, { type: 'view', path: '/admin/' })
    await beacon(app, { type: 'event', path: '/', name: 'free_money' })
    await beacon(app, { type: 'view', path: 'javascript:alert(1)' })
    expect(analytics.events).toHaveLength(0)
    await beacon(app, { type: 'event', path: '/about/', name: 'resume_download' })
    expect(analytics.events).toHaveLength(1)
  })
})

describe('admin stats endpoint', () => {
  it('needs a session and returns the requested range', async () => {
    const analytics = fakeAnalytics()
    const adminStore = createMemoryStore()
    const { app } = makeApp({ analyticsStore: analytics, adminStore })
    const origin = 'http://localhost:5173'
    expect((await request(app).get('/api/admin/stats').set('Origin', origin)).status).toBe(401)
    const token = await adminStore.createToken('vinodvinni308@gmail.com', 'session', 60)
    const res = await request(app).get('/api/admin/stats?range=30d').set('Origin', origin).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, days: 30, current: { visitors: 3 } })
  })
})

describe('classification helpers', () => {
  it('maps referrers to sources', () => {
    expect(sourceOf('', '', 'vinod-kumar.in')).toBe('direct')
    expect(sourceOf('https://vinod-kumar.in/about/', '', 'vinod-kumar.in')).toBe('direct')
    expect(sourceOf('https://www.linkedin.com/feed/', '', 'vinod-kumar.in')).toBe('linkedin')
    expect(sourceOf('https://chatgpt.com/', '', 'vinod-kumar.in')).toBe('ai assistants')
    expect(sourceOf('https://x.example/', 'Newsletter', 'vinod-kumar.in')).toBe('newsletter')
  })

  it('classifies devices and validates beacons', () => {
    expect([deviceOf(375), deviceOf(900), deviceOf(1440)]).toEqual(['mobile', 'tablet', 'desktop'])
    expect(parsePulse('{bad json')).toBeNull()
    expect(parsePulse({ type: 'engage', path: '/', ms: 999_999_999 }).value).toBe(30 * 60_000)
  })
})

describe('admin search endpoint', () => {
  it('returns Search Console data for a session, and 502 when Google fails', async () => {
    const adminStore = createMemoryStore()
    const token = await adminStore.createToken('vinodvinni308@gmail.com', 'session', 60)
    const ok = makeApp({ adminStore, searchStats: async (days) => ({ current: { clicks: 4 }, previous: { clicks: 2 }, queries: [], pages: [], days }) })
    const res = await request(ok.app).get('/api/admin/search?range=15d').set('Origin', 'http://localhost:5173').set('Authorization', `Bearer ${token}`)
    expect(res.body).toMatchObject({ ok: true, days: 15, current: { clicks: 4 } })
    const failing = makeApp({ adminStore, searchStats: async () => { throw new Error('google_403') } })
    const bad = await request(failing.app).get('/api/admin/search').set('Origin', 'http://localhost:5173').set('Authorization', `Bearer ${token}`)
    expect(bad.status).toBe(502)
  })
})
