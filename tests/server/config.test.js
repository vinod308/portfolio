import { describe, it, expect } from 'vitest'
import { readConfig, ConfigError } from '../../server/config.js'
import { baseEnv, TEST_SECRET } from './helpers.js'

describe('readConfig', () => {
  it('lists missing SMTP variables by name without echoing values', () => {
    const env = { ...baseEnv, SMTP_HOST: '', SMTP_USER: '', MAIL_FROM: '' }
    let error
    try {
      readConfig(env)
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(ConfigError)
    expect(error.problems).toEqual(
      expect.arrayContaining(['SMTP_HOST is required', 'SMTP_USER is required', 'MAIL_FROM is required']),
    )
    expect(error.message).not.toContain(TEST_SECRET)
  })

  it('defaults to STARTTLS on 587 and implicit TLS on 465', () => {
    const c587 = readConfig(baseEnv)
    expect(c587.smtp).toMatchObject({ port: 587, secure: false, requireTLS: true })
    const c465 = readConfig({ ...baseEnv, SMTP_PORT: '465', SMTP_SECURE: '' })
    expect(c465.smtp).toMatchObject({ port: 465, secure: true, requireTLS: false })
  })

  it('applies documented defaults', () => {
    const c = readConfig(baseEnv)
    expect(c.mailTo).toBe('vinodvinni308@gmail.com')
    expect(c.port).toBe(3001)
    expect(c.clientOrigins).toEqual(['http://localhost:5173'])
    expect(c.rateLimit).toEqual({ windowMs: 15 * 60_000, max: 5 })
  })

  it('accepts several origins and rejects malformed ones', () => {
    const c = readConfig({ ...baseEnv, CLIENT_ORIGIN: 'https://vinod.dev, https://www.vinod.dev/' })
    expect(c.clientOrigins).toEqual(['https://vinod.dev', 'https://www.vinod.dev'])
    expect(() => readConfig({ ...baseEnv, CLIENT_ORIGIN: 'vinod.dev/path' })).toThrow(ConfigError)
  })

  it('rejects an invalid From address', () => {
    expect(() => readConfig({ ...baseEnv, MAIL_FROM: 'not an address' })).toThrow(/MAIL_FROM/)
    expect(readConfig({ ...baseEnv, MAIL_FROM: 'mailer@example.test' }).mailFrom).toBe('mailer@example.test')
  })

  it('allows the log transport without SMTP settings, but never in production', () => {
    const dev = readConfig({ MAIL_TRANSPORT: 'log' })
    expect(dev.mailTransport).toBe('log')
    expect(() => readConfig({ MAIL_TRANSPORT: 'log', NODE_ENV: 'production' })).toThrow(/not allowed/)
  })
})
