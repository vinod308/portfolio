// Contact form rules shared by the browser (src/lib/contact.js) and the
// server (server/app.js), so both sides always enforce the same limits.
// Pure ESM with no dependencies: safe to import from Vite and from Node.

export const LIMITS = {
  name: { min: 2, max: 80 },
  email: { max: 254 },
  message: { min: 20, max: 2000 },
  maxLinks: 5,
}

export const INQUIRIES = [
  { value: 'job', label: 'Job opportunity' },
  { value: 'project', label: 'Freelance or contract project' },
  { value: 'ai', label: 'AI integration' },
  { value: 'other', label: 'Something else' },
]

// Submissions faster than this after the form appeared are treated as bots.
export const MIN_FILL_MS = 3000

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/
const LINK_RE = /\bhttps?:\/\/|\bwww\./gi

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
    name: single(raw.name),
    email: single(raw.email),
    inquiry: single(raw.inquiry),
    message: str(raw.message).replace(/\r\n?/g, '\n').replace(CONTROL_RE, '').trim(),
  }
}

/** Returns { field: message } for every invalid field (empty object if valid). */
export function validateContact(values) {
  const errors = {}
  const name = values.name.trim()
  const email = values.email.trim()
  const message = values.message.trim()

  if (!name) errors.name = 'Please enter your name.'
  else if (name.length < LIMITS.name.min) errors.name = `Name should be at least ${LIMITS.name.min} characters.`
  else if (name.length > LIMITS.name.max) errors.name = `Name can be at most ${LIMITS.name.max} characters.`

  if (!email) errors.email = 'Please enter your email address.'
  else if (email.length > LIMITS.email.max) errors.email = 'That email address is too long.'
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter an email address like name@example.com.'

  if (!INQUIRIES.some((i) => i.value === values.inquiry)) errors.inquiry = 'Please choose what your message is about.'

  if (!message) errors.message = 'Please write a message.'
  else if (message.length < LIMITS.message.min)
    errors.message = `Please add a little more detail (at least ${LIMITS.message.min} characters).`
  else if (message.length > LIMITS.message.max) errors.message = `Messages can be at most ${LIMITS.message.max} characters.`
  else if ((message.match(LINK_RE) || []).length > LIMITS.maxLinks)
    errors.message = `Please include no more than ${LIMITS.maxLinks} links.`

  return errors
}

export const inquiryLabel = (value) => INQUIRIES.find((i) => i.value === value)?.label ?? 'Other'
