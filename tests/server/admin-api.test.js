import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { makeApp } from './helpers.js'
import { AuthError, createGoogleVerifier } from '../../server/admin.js'
import { createMemoryStore, hashPassword, verifyPassword } from '../../server/adminStore.js'
import { isAdminEmail } from '../../shared/admin.js'

const OWNER = 'vinodvinni308@gmail.com'
const ORIGIN = 'http://localhost:5173'
const fakeGoogle = async (credential) => {
  if (credential === 'owner-google') return { email: OWNER, name: 'Vinod Kumar', picture: '' }
  if (credential === 'other-google') return { email: 'someone@example.com', name: 'Someone', picture: '' }
  throw new AuthError(401, 'Google sign-in failed. Please try again.')
}

function setup() {
  const adminStore = createMemoryStore()
  const ctx = makeApp({ adminStore, verifyIdToken: fakeGoogle, env: { RATE_LIMIT_MAX: '50' } })
  const post = (path, body, token) => {
    const req = request(ctx.app).post(`/api/admin${path}`).set('Origin', ORIGIN)
    if (token) req.set('Authorization', `Bearer ${token}`)
    return req.send(body)
  }
  const get = (path, token) => {
    const req = request(ctx.app).get(`/api/admin${path}`).set('Origin', ORIGIN)
    return token ? req.set('Authorization', `Bearer ${token}`) : req
  }
  return { ...ctx, adminStore, post, get }
}

/** Request a link, pull the token out of the emailed URL, set the password. */
async function setPassword(t, password = 'correct horse battery') {
  await t.post('/password/request', { email: OWNER })
  const mail = t.transport.sendMail.mock.calls.at(-1)[0]
  const token = new URL(/https?:\/\/\S+/.exec(mail.text)[0]).searchParams.get('token')
  return t.post('/password/set', { token, password })
}

describe('admin password flow', () => {
  it('emails a one-time link only to the owner, with the same answer for anyone', async () => {
    const t = setup()
    const stranger = await t.post('/password/request', { email: 'someone@example.com' })
    const owner = await t.post('/password/request', { email: OWNER })
    expect(stranger.body).toEqual(owner.body)
    expect(t.transport.sendMail).toHaveBeenCalledTimes(1)
    const mail = t.transport.sendMail.mock.calls[0][0]
    expect(mail.to).toBe(OWNER)
    expect(mail.text).toMatch(/\/admin\/set-password\/\?token=[\w-]+/)
    expect(mail.html).toContain('Set password')
  })

  it('sets the password once, stores only a hash, and then signs in', async () => {
    const t = setup()
    expect((await setPassword(t)).status).toBe(200)
    const stored = t.adminStore.passwords.get(OWNER)
    expect(stored).toMatch(/^scrypt\$/)
    expect(stored).not.toContain('correct horse')

    const login = await t.post('/login', { email: 'VinodVinni308@gmail.com', password: 'correct horse battery' })
    expect(login.status).toBe(200)
    expect(login.body.user.email).toBe(OWNER)
    const me = await t.get('/me', login.body.token)
    expect(me.body).toEqual({ ok: true, user: { email: OWNER } })
  })

  it('rejects reused links, short passwords and wrong passwords', async () => {
    const t = setup()
    await t.post('/password/request', { email: OWNER })
    const token = new URL(/https?:\/\/\S+/.exec(t.transport.sendMail.mock.calls[0][0].text)[0]).searchParams.get('token')
    expect((await t.post('/password/set', { token, password: 'short' })).status).toBe(422)
    expect((await t.post('/password/set', { token, password: 'a long enough password' })).status).toBe(200)
    expect((await t.post('/password/set', { token, password: 'another long password' })).status).toBe(400)

    const wrong = await t.post('/login', { email: OWNER, password: 'not the password' })
    const unknown = await t.post('/login', { email: 'someone@example.com', password: 'a long enough password' })
    expect(wrong.status).toBe(401)
    expect(unknown.body).toEqual(wrong.body)
  })

  it('signs out everywhere when the password changes, and on logout', async () => {
    const t = setup()
    await setPassword(t, 'first long password')
    const { token } = (await t.post('/login', { email: OWNER, password: 'first long password' })).body
    await setPassword(t, 'second long password')
    expect((await t.get('/me', token)).status).toBe(401)

    const fresh = (await t.post('/login', { email: OWNER, password: 'second long password' })).body.token
    expect((await t.post('/logout', {}, fresh)).status).toBe(200)
    expect((await t.get('/me', fresh)).status).toBe(401)
  })
})

describe('admin Google sign-in', () => {
  it('starts a session for the owner only', async () => {
    const t = setup()
    const ok = await t.post('/google', { credential: 'owner-google' })
    expect(ok.status).toBe(200)
    expect((await t.get('/me', ok.body.token)).status).toBe(200)
    expect((await t.post('/google', { credential: 'other-google' })).status).toBe(403)
    expect((await t.post('/google', { credential: 'forged' })).status).toBe(401)
  })
})

describe('admin API guards', () => {
  it('needs a session, blocks other origins and answers 503 without a database', async () => {
    const t = setup()
    expect((await t.get('/me')).status).toBe(401)
    expect((await t.get('/me', 'x'.repeat(43))).status).toBe(401)
    const evil = await request(t.app).get('/api/admin/me').set('Origin', 'https://evil.example')
    expect(evil.status).toBe(403)
    const bare = makeApp({ verifyIdToken: fakeGoogle })
    expect((await request(bare.app).get('/api/admin/me').set('Origin', ORIGIN)).status).toBe(503)
  })

  it('rate-limits sign-in attempts', async () => {
    const t = setup()
    const codes = []
    for (let i = 0; i < 11; i++) codes.push((await t.post('/login', { email: OWNER, password: 'nope nope nope' })).status)
    expect(codes.at(-1)).toBe(429)
  })
})

describe('password hashing and Google verification', () => {
  it('hashes with a random salt and verifies', async () => {
    const a = await hashPassword('same password here')
    const b = await hashPassword('same password here')
    expect(a).not.toBe(b)
    expect(await verifyPassword('same password here', a)).toBe(true)
    expect(await verifyPassword('different password', a)).toBe(false)
  })

  it('rejects malformed Google tokens and unconfigured client IDs', async () => {
    await expect(createGoogleVerifier('')('a.b.c')).rejects.toMatchObject({ status: 503 })
    await expect(createGoogleVerifier('id.apps.googleusercontent.com')('a.b.c')).rejects.toMatchObject({ status: 401 })
  })

  it('allow-list is exact and case-insensitive', () => {
    expect(isAdminEmail('VinodVinni308@gmail.com')).toBe(true)
    expect(isAdminEmail('vinodvinni308@gmail.com.evil.com')).toBe(false)
    expect(isAdminEmail(undefined)).toBe(false)
  })
})
