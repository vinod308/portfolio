import { describe, it, expect } from 'vitest'
import { normalizeContact, validateContact, fullName, LIMITS } from '../../shared/contact.js'

const ok = {
  firstName: 'Asha',
  lastName: 'Rao',
  email: 'asha@company.example',
  phone: '+91 98765 43210',
  message: 'x'.repeat(LIMITS.message.min),
}

describe('normalizeContact', () => {
  it('turns non-strings into empty strings', () => {
    expect(normalizeContact({ firstName: 5, lastName: [], email: null, phone: {}, message: [] })).toEqual({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      message: '',
    })
  })

  it('keeps single-line fields on one line and unifies message line endings', () => {
    const n = normalizeContact({
      ...ok,
      firstName: 'A\r\nB',
      email: ' a@b.co ',
      phone: ' +91\n98765 ',
      message: 'one\r\ntwo\rthree',
    })
    expect(n.firstName).toBe('A B')
    expect(n.email).toBe('a@b.co')
    expect(n.phone).toBe('+91 98765')
    expect(n.message).toBe('one\ntwo\nthree')
  })
})

describe('validateContact', () => {
  it('accepts a valid message at the length boundaries', () => {
    expect(validateContact(ok)).toEqual({})
    expect(validateContact({ ...ok, message: 'x'.repeat(LIMITS.message.max) })).toEqual({})
  })

  it('requires every field', () => {
    const empty = { firstName: '', lastName: '', email: '', phone: '', message: '' }
    expect(Object.keys(validateContact(empty)).sort()).toEqual(['email', 'firstName', 'lastName', 'message', 'phone'])
  })

  it('enforces length limits', () => {
    expect(validateContact({ ...ok, firstName: 'A'.repeat(51) }).firstName).toBeTruthy()
    expect(validateContact({ ...ok, lastName: 'A'.repeat(51) }).lastName).toBeTruthy()
    expect(validateContact({ ...ok, message: 'x'.repeat(19) }).message).toBeTruthy()
    expect(validateContact({ ...ok, message: 'x'.repeat(2001) }).message).toBeTruthy()
  })

  it('accepts single-letter and non-Latin names, rejects digits and symbols', () => {
    expect(validateContact({ ...ok, firstName: 'K', lastName: 'Ng' })).toEqual({})
    expect(validateContact({ ...ok, firstName: 'विनोद', lastName: 'कुमार' })).toEqual({})
    expect(validateContact({ ...ok, firstName: 'R2D2' }).firstName).toBeTruthy()
    expect(validateContact({ ...ok, lastName: '-Smith' }).lastName).toBeTruthy()
  })

  it('checks phone format and digit count', () => {
    expect(validateContact({ ...ok, phone: '+44 20 7946 0958' })).toEqual({})
    expect(validateContact({ ...ok, phone: '123456' }).phone).toMatch(/7 to 15 digits/)
    expect(validateContact({ ...ok, phone: '1234567890123456' }).phone).toMatch(/7 to 15 digits/)
    expect(validateContact({ ...ok, phone: '+91-98765-ABCDE' }).phone).toMatch(/like \+91/)
  })
})

describe('fullName', () => {
  it('joins first and last name', () => {
    expect(fullName({ firstName: ' Asha ', lastName: 'Rao ' })).toBe('Asha Rao')
  })
})
