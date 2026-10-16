import { describe, it, expect } from 'vitest'
import { normalizeContact, validateContact, LIMITS } from '../../shared/contact.js'

const ok = { name: 'Asha', email: 'asha@company.example', inquiry: 'ai', message: 'x'.repeat(LIMITS.message.min) }

describe('normalizeContact', () => {
  it('turns non-strings into empty strings', () => {
    expect(normalizeContact({ name: 5, email: null, inquiry: {}, message: [] })).toEqual({
      name: '',
      email: '',
      inquiry: '',
      message: '',
    })
  })

  it('keeps single-line fields on one line and unifies message line endings', () => {
    const n = normalizeContact({ name: 'A\r\nB', email: ' a@b.co ', inquiry: 'ai', message: 'one\r\ntwo\rthree' })
    expect(n.name).toBe('A B')
    expect(n.email).toBe('a@b.co')
    expect(n.message).toBe('one\ntwo\nthree')
  })
})

describe('validateContact', () => {
  it('accepts a valid message at the length boundaries', () => {
    expect(validateContact(ok)).toEqual({})
    expect(validateContact({ ...ok, message: 'x'.repeat(LIMITS.message.max) })).toEqual({})
  })

  it('enforces length limits', () => {
    expect(validateContact({ ...ok, name: 'A' }).name).toBeTruthy()
    expect(validateContact({ ...ok, name: 'A'.repeat(81) }).name).toBeTruthy()
    expect(validateContact({ ...ok, message: 'x'.repeat(19) }).message).toBeTruthy()
    expect(validateContact({ ...ok, message: 'x'.repeat(2001) }).message).toBeTruthy()
  })
})
