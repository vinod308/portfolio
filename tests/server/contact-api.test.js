import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { makeApp, mockTransport, validBody, TEST_SECRET } from './helpers.js'

const ORIGIN = 'http://localhost:5173'
const post = (app, body, { origin = ORIGIN, type = 'application/json' } = {}) => {
  const r = request(app).post('/api/contact').set('Origin', origin)
  return type ? r.set('Content-Type', type).send(typeof body === 'string' ? body : JSON.stringify(body)) : r.send(body)
}

describe('POST /api/contact: valid submission', () => {
  it('sends one email and reports success only after the transport accepts it', async () => {
    const { app, transport } = makeApp()
    const res = await post(app, validBody)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(transport.sendMail).toHaveBeenCalledTimes(1)
  })

  it('uses the configured From, the visitor as Reply-To and a prefixed subject', async () => {
    const { app, transport, config } = makeApp()
    await post(app, validBody)
    const msg = transport.sendMail.mock.calls[0][0]
    expect(msg.from).toBe(config.mailFrom)
    expect(msg.to).toBe('vinodvinni308@gmail.com')
    expect(msg.replyTo).toEqual({ name: 'Asha Recruiter', address: 'asha@company.example' })
    expect(msg.subject).toBe('[Portfolio Inquiry] Asha Recruiter')
    for (const part of ['Asha Recruiter', 'asha@company.example', '+91 98765 43210', validBody.message]) {
      expect(msg.text).toContain(part)
    }
  })

  it('normalises whitespace and strips control characters', async () => {
    const { app, transport } = makeApp()
    await post(app, { ...validBody, firstName: '  Asha \u0007 ', lastName: ' Recruiter  ', message: `  ${validBody.message}\r\n\u0000` })
    const msg = transport.sendMail.mock.calls[0][0]
    expect(msg.replyTo.name).toBe('Asha Recruiter')
    expect(msg.text).toContain(`${validBody.message}\n\n--`)
  })
})

describe('POST /api/contact: validation', () => {
  it('rejects missing required fields with per-field errors', async () => {
    const { app, transport } = makeApp()
    const res = await post(app, { website: '', elapsedMs: 9000 })
    expect(res.status).toBe(422)
    expect(Object.keys(res.body.errors).sort()).toEqual(['email', 'firstName', 'lastName', 'message', 'phone'])
    expect(transport.sendMail).not.toHaveBeenCalled()
  })

  it('rejects an invalid email address', async () => {
    const { app } = makeApp()
    for (const email of ['not-an-email', 'a@b', 'x@y.c', 'a b@example.com', '<a@example.com>']) {
      const res = await post(app, { ...validBody, email })
      expect(res.status, email).toBe(422)
      expect(res.body.errors.email, email).toBeTruthy()
    }
  })

  it('rejects invalid phone numbers', async () => {
    const { app } = makeApp({ env: { RATE_LIMIT_MAX: '50' } })
    for (const phone of ['12345', '+91 98765 43210 12345 678', '98765-abc-10', '91+9876543210', 'call me']) {
      const res = await post(app, { ...validBody, phone })
      expect(res.status, phone).toBe(422)
      expect(res.body.errors.phone, phone).toBeTruthy()
    }
    for (const phone of ['+91 98765 43210', '(020) 7946-0958', '9876543210', '+1.415.555.0132']) {
      expect((await post(app, { ...validBody, phone })).status, phone).toBe(200)
    }
  })

  it('rejects names with digits or symbols', async () => {
    const { app } = makeApp({ env: { RATE_LIMIT_MAX: '50' } })
    for (const [field, value] of [
      ['firstName', 'Asha2'],
      ['lastName', 'x@y.com'],
      ['firstName', 'Bcc: a'],
      ['lastName', 'A'.repeat(51)],
    ]) {
      const res = await post(app, { ...validBody, [field]: value })
      expect(res.status, value).toBe(422)
      expect(res.body.errors[field], value).toBeTruthy()
    }
    for (const [firstName, lastName] of [
      ['José', "O'Neil"],
      ['Anne-Marie', 'van der Berg'],
      ['विनोद', 'कुमार'],
    ]) {
      expect((await post(app, { ...validBody, firstName, lastName })).status, firstName).toBe(200)
    }
  })

  it('rejects a message over 2000 characters', async () => {
    const { app } = makeApp()
    const res = await post(app, { ...validBody, message: 'a'.repeat(2001) })
    expect(res.status).toBe(422)
    expect(res.body.errors.message).toMatch(/2000/)
  })

  it('rejects messages with too many links', async () => {
    const { app } = makeApp()
    const message = Array.from({ length: 6 }, (_, i) => `see https://spam${i}.example`).join(' ')
    const res = await post(app, { ...validBody, message })
    expect(res.status).toBe(422)
  })

  it('rejects a request body over 16 KB with 413', async () => {
    const { app } = makeApp()
    const res = await post(app, { ...validBody, message: 'a'.repeat(20_000) })
    expect(res.status).toBe(413)
    expect(res.body.ok).toBe(false)
  })

  it('rejects wrong data types', async () => {
    const { app } = makeApp({ env: { RATE_LIMIT_MAX: '50' } })
    for (const body of [
      { ...validBody, firstName: 123 },
      { ...validBody, phone: 9876543210 },
      { ...validBody, message: ['a', 'b'] },
      { ...validBody, email: { $gt: '' } },
      { ...validBody, elapsedMs: 'fast' },
      [validBody],
    ]) {
      const res = await post(app, body)
      expect(res.status).toBe(400)
      expect(res.body).toEqual({ ok: false, message: 'Invalid request.' })
    }
  })

  it('accepts JSON only', async () => {
    const { app } = makeApp()
    const form = await post(app, 'name=a&email=b', { type: 'application/x-www-form-urlencoded' })
    expect(form.status).toBe(415)
    const broken = await post(app, '{"name": ', { type: 'application/json' })
    expect(broken.status).toBe(400)
    expect(broken.body).toEqual({ ok: false, message: 'Invalid request.' })
  })
})

describe('POST /api/contact: bots and abuse', () => {
  it('silently drops honeypot submissions without sending', async () => {
    const { app, transport, logger } = makeApp()
    const res = await post(app, { ...validBody, website: 'https://spam.example' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(transport.sendMail).not.toHaveBeenCalled()
    expect(logger.lines.some((l) => l.event === 'contact_dropped' && l.reason === 'honeypot')).toBe(true)
  })

  it('silently drops submissions made faster than a person could type', async () => {
    const { app, transport } = makeApp()
    const res = await post(app, { ...validBody, elapsedMs: 400 })
    expect(res.body).toEqual({ ok: true })
    expect(transport.sendMail).not.toHaveBeenCalled()
  })

  it('rate limits per client and answers 429 in JSON', async () => {
    const { app, transport } = makeApp({ env: { RATE_LIMIT_MAX: '3' } })
    for (let i = 0; i < 3; i++) expect((await post(app, validBody)).status).toBe(200)
    const limited = await post(app, validBody)
    expect(limited.status).toBe(429)
    expect(limited.body.ok).toBe(false)
    expect(limited.headers['ratelimit-policy'] || limited.headers.ratelimit).toBeTruthy()
    expect(transport.sendMail).toHaveBeenCalledTimes(3)
  })
})

describe('POST /api/contact: SMTP outcomes', () => {
  it('returns a generic 502 and logs diagnostics when SMTP fails', async () => {
    const err = Object.assign(new Error(`Invalid login: 535 Authentication failed for ${TEST_SECRET}`), {
      code: 'EAUTH',
      responseCode: 535,
      command: 'AUTH PLAIN',
    })
    const transport = mockTransport(async () => {
      throw err
    })
    const { app, logger } = makeApp({ transport })
    const res = await post(app, validBody)
    expect(res.status).toBe(502)
    expect(res.body.ok).toBe(false)
    // Response reveals nothing about the cause
    const raw = JSON.stringify(res.body)
    for (const leak of ['EAUTH', '535', 'AUTH', TEST_SECRET, 'smtp.example.test']) expect(raw).not.toContain(leak)
    const failure = logger.lines.find((l) => l.event === 'mail_failed')
    expect(failure).toMatchObject({ code: 'EAUTH', responseCode: 535, command: 'AUTH PLAIN' })
  })

  it('treats a rejected recipient as a failure', async () => {
    const transport = mockTransport(async () => ({ messageId: '<x>', accepted: [], rejected: ['vinodvinni308@gmail.com'] }))
    const { app } = makeApp({ transport })
    const res = await post(app, validBody)
    expect(res.status).toBe(502)
  })

  it('never logs secrets or the message body', async () => {
    const failing = mockTransport(async () => {
      throw Object.assign(new Error(`connect failed ${TEST_SECRET}`), { code: 'ETIMEDOUT' })
    })
    for (const transport of [mockTransport(), failing]) {
      const { app, logger } = makeApp({ transport })
      await post(app, validBody)
      const logged = JSON.stringify(logger.lines)
      expect(logged).not.toContain(TEST_SECRET)
      expect(logged).not.toContain(validBody.message)
      expect(logged).not.toContain('asha@company.example')
    }
  })
})

describe('email content safety', () => {
  it('prevents header injection through the name and escapes HTML', async () => {
    const { app, transport } = makeApp()
    await post(app, {
      ...validBody,
      firstName: 'Eve',
      lastName: 'Doe\r\nBcc',
      message: '<script>alert(1)</script> and <b>bold</b> text that is long enough',
    })
    const msg = transport.sendMail.mock.calls[0][0]
    expect(msg.subject).not.toMatch(/[\r\n]/)
    expect(msg.replyTo.name).not.toMatch(/[\r\n]/)
    expect(msg.html).not.toContain('<script>')
    expect(msg.html).toContain('&lt;script&gt;')
    expect(msg.text).toContain('<script>alert(1)</script>') // plain text stays literal
  })
})

describe('HTTP hardening', () => {
  it('blocks other origins and allows the configured frontend', async () => {
    const { app, transport } = makeApp()
    const evil = await post(app, validBody, { origin: 'https://evil.example' })
    expect(evil.status).toBe(403)
    expect(transport.sendMail).not.toHaveBeenCalled()

    const ok = await post(app, validBody)
    expect(ok.headers['access-control-allow-origin']).toBe(ORIGIN)

    const preflight = await request(app)
      .options('/api/contact')
      .set('Origin', ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type')
    expect(preflight.status).toBe(204)
    expect(preflight.headers['access-control-allow-methods']).toContain('POST')
  })

  it('sends security headers and hides the framework', async () => {
    const { app } = makeApp()
    const res = await request(app).get('/api/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['content-security-policy']).toBeTruthy()
    expect(res.headers['x-powered-by']).toBeUndefined()
  })

  it('exposes no configuration and answers unknown routes with a generic 404', async () => {
    const { app } = makeApp()
    expect((await request(app).get('/api/health')).body).toEqual({ ok: true })
    for (const p of ['/api/config', '/api/env', '/api/contact/test', '/.env']) {
      const res = await request(app).get(p)
      expect(res.status, p).toBe(404)
      expect(JSON.stringify(res.body)).not.toContain(TEST_SECRET)
    }
    expect((await request(app).get('/api/contact')).status).toBe(404)
  })
})

const DIST_INDEX = path.resolve(import.meta.dirname, '../../dist/index.html')
describe.skipIf(!existsSync(DIST_INDEX))('single-service static hosting', () => {
  it('serves each prerendered page, 404s unknown pages and keeps /api JSON', async () => {
    const { app } = makeApp({ env: { SERVE_STATIC: 'true' } })
    for (const p of ['/', '/projects/haylow', '/about/', '/contact']) {
      const res = await request(app).get(p).set('Accept', 'text/html')
      expect(res.status, p).toBe(200)
      expect(res.text, p).toContain(`<div id="root" data-route="${p.replace(/(.)\/$/, '$1')}">`)
    }
    const unknown = await request(app).get('/does-not-exist').set('Accept', 'text/html')
    expect(unknown.status).toBe(404)
    expect(unknown.text).toContain('<meta name="robots" content="noindex" />')
    const escape = await request(app).get('/../package.json').set('Accept', 'text/html')
    expect(escape.status).toBe(404)
    const missingAsset = await request(app).get('/assets/nope.js')
    expect(missingAsset.status).toBe(404)
    expect((await request(app).get('/api/nope')).headers['content-type']).toMatch(/json/)
  })
})
