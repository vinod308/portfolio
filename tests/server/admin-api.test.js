import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { makeApp } from './helpers.js'
import { AuthError, createGoogleVerifier } from '../../server/admin.js'
import { isAdminEmail } from '../../shared/admin.js'

// Fake Google verification: real tokens are never used in tests.
const fakeVerifier = (users) => async (token) => {
  if (token in users) return users[token]
  throw new AuthError(401, 'Your sign-in has expired. Please sign in again.')
}
const owner = { email: 'vinodvinni308@gmail.com', name: 'Vinod Kumar', picture: '' }
const stranger = { email: 'someone@example.com', name: 'Someone', picture: '' }
const verifyIdToken = fakeVerifier({ 'owner.token.x': owner, 'stranger.token.x': stranger })

const me = (app, token) => {
  const req = request(app).get('/api/admin/me').set('Origin', 'http://localhost:5173')
  return token ? req.set('Authorization', `Bearer ${token}`) : req
}

describe('GET /api/admin/me', () => {
  it('requires a bearer token', async () => {
    const { app } = makeApp({ verifyIdToken })
    const res = await me(app)
    expect(res.status).toBe(401)
    expect(res.headers['cache-control']).toBe('no-store')
  })

  it('returns the signed-in owner', async () => {
    const { app } = makeApp({ verifyIdToken })
    const res = await me(app, 'owner.token.x')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, user: owner })
  })

  it('refuses any other Google account', async () => {
    const { app, logger } = makeApp({ verifyIdToken })
    const res = await me(app, 'stranger.token.x')
    expect(res.status).toBe(403)
    expect(JSON.stringify(logger.lines)).not.toContain('someone@example.com')
  })

  it('rejects invalid or expired tokens', async () => {
    const { app } = makeApp({ verifyIdToken })
    expect((await me(app, 'forged.token.x')).status).toBe(401)
    expect((await me(app, 'not-a-jwt')).status).toBe(401)
  })

  it('blocks other websites and allows the Authorization header for the site', async () => {
    const { app } = makeApp({ verifyIdToken })
    const evil = await request(app).get('/api/admin/me').set('Origin', 'https://evil.example')
    expect(evil.status).toBe(403)
    const preflight = await request(app)
      .options('/api/admin/me')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization')
    expect(preflight.status).toBe(204)
    expect(preflight.headers['access-control-allow-headers']).toMatch(/Authorization/i)
  })
})

describe('Google token verification', () => {
  it('reports 503 until a Client ID is configured', async () => {
    await expect(createGoogleVerifier('')('a.b.c')).rejects.toMatchObject({ status: 503 })
  })

  it('rejects malformed tokens without trusting them', async () => {
    await expect(createGoogleVerifier('client-id.apps.googleusercontent.com')('a.b.c')).rejects.toMatchObject({
      status: 401,
    })
  })

  it('allow-list is exact and case-insensitive', () => {
    expect(isAdminEmail('VinodVinni308@gmail.com')).toBe(true)
    expect(isAdminEmail('vinodvinni308@gmail.com.evil.com')).toBe(false)
    expect(isAdminEmail('x-vinodvinni308@gmail.com')).toBe(false)
    expect(isAdminEmail(undefined)).toBe(false)
  })
})
