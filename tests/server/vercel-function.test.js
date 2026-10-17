import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { baseEnv } from './helpers.js'

// The function reads process.env at import time, so each test imports a fresh copy.
const KEYS = [...Object.keys(baseEnv), 'CLIENT_ORIGIN', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL', 'NODE_ENV']
let saved

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]))
  for (const k of KEYS) delete process.env[k]
  vi.resetModules()
})
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

describe('Vercel function api/contact.js', () => {
  it('answers 503 without leaking details when SMTP is not configured', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.NODE_ENV = 'production'
    const { default: handler, _configProblems } = await import('../../api/contact.js')
    const res = await request(handler).post('/api/contact').set('Content-Type', 'application/json').send('{}')
    expect(res.status).toBe(503)
    expect(res.body).toEqual({ ok: false, message: 'The contact form is temporarily unavailable.' })
    expect(JSON.stringify(res.body)).not.toMatch(/SMTP|required/)
    expect(_configProblems()).toEqual(expect.arrayContaining(['SMTP_HOST is required']))
  })

  it('allows the deployment origin by default when configured', async () => {
    Object.assign(process.env, baseEnv)
    delete process.env.CLIENT_ORIGIN
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'vinod.vercel.app'
    const { default: handler } = await import('../../api/contact.js')

    const ok = await request(handler)
      .post('/api/contact')
      .set('Origin', 'https://vinod.vercel.app')
      .set('Content-Type', 'application/json')
      .send('{"firstName": 1}')
    expect(ok.status).toBe(400) // reached validation: origin accepted

    const evil = await request(handler)
      .post('/api/contact')
      .set('Origin', 'https://evil.example')
      .set('Content-Type', 'application/json')
      .send('{}')
    expect(evil.status).toBe(403)
  })
})
