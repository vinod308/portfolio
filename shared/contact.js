// Contact form rules shared by the browser (src/lib/contact.js) and the
// server (server/app.js), so both sides always enforce the same limits.
// Pure ESM with no dependencies: safe to import from Vite and from Node.

export const LIMITS = {
  name: { max: 50 },
  email: { max: 254 },
  phone: { minDigits: 7, maxDigits: 15, max: 25 },
  message: { min: 20, max: 2000 },
  maxLinks: 5,
}

// Submissions faster than this after the form appeared are treated as bots.
export const MIN_FILL_MS = 3000

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/
const LINK_RE = /\bhttps?:\/\/|\bwww\./gi
// Letters in any script, plus the joiners real names use: space ' ’ - .
const NAME_RE = /^\p{L}[\p{L}\p{M}' ’.-]*(?: [\p{L}\p{M}' ’.-]+)*$/u
// Optional leading +, then digits with spaces, dots, dashes or brackets.
const PHONE_RE = /^\+?[\d\s().-]+$/

/** Characters that never belong in any field (control chars except tab/newline). */
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/**
 * Normalise raw values: strings only, trimmed, control characters removed,
 * line endings unified. Single-line fields lose all line breaks.
 */
export function normalizeContact(raw = {}) {
  const str = (v) => (typeof v === 'string' ? v : '')
  const single = (v) => str(v).replace(CONTROL_RE, '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
  return {
    firstName: single(raw.firstName),
    lastName: single(raw.lastName),
    email: single(raw.email),
    phone: single(raw.phone),
    message: str(raw.message).replace(/\r\n?/g, '\n').replace(CONTROL_RE, '').trim(),
  }
}

function nameError(value, label) {
  if (!value) return `Please enter your ${label}.`
  if (value.length > LIMITS.name.max) return `Your ${label} can be at most ${LIMITS.name.max} characters.`
  if (!NAME_RE.test(value)) return `Use letters only in your ${label} (spaces, hyphens and apostrophes are fine).`
  return undefined
}

/** Returns { field: message } for every invalid field (empty object if valid). */
export function validateContact(values) {
  const errors = {}
  const firstName = values.firstName.trim()
  const lastName = values.lastName.trim()
  const email = values.email.trim()
  const phone = values.phone.trim()
  const message = values.message.trim()

  errors.firstName = nameError(firstName, 'first name')
  errors.lastName = nameError(lastName, 'last name')

  if (!email) errors.email = 'Please enter your email address.'
  else if (email.length > LIMITS.email.max) errors.email = 'That email address is too long.'
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter an email address like name@example.com.'

  const digits = phone.replace(/\D/g, '').length
  if (!phone) errors.phone = 'Please enter your phone number.'
  else if (phone.length > LIMITS.phone.max || !PHONE_RE.test(phone))
    errors.phone = 'Enter a phone number like +91 98765 43210.'
  else if (digits < LIMITS.phone.minDigits || digits > LIMITS.phone.maxDigits)
    errors.phone = `Phone numbers have ${LIMITS.phone.minDigits} to ${LIMITS.phone.maxDigits} digits.`

  if (!message) errors.message = 'Please write a message.'
  else if (message.length < LIMITS.message.min)
    errors.message = `Please add a little more detail (at least ${LIMITS.message.min} characters).`
  else if (message.length > LIMITS.message.max) errors.message = `Messages can be at most ${LIMITS.message.max} characters.`
  else if ((message.match(LINK_RE) || []).length > LIMITS.maxLinks)
    errors.message = `Please include no more than ${LIMITS.maxLinks} links.`

  for (const key of Object.keys(errors)) if (!errors[key]) delete errors[key]
  return errors
}

export const fullName = (values) => `${values.firstName.trim()} ${values.lastName.trim()}`.trim()
