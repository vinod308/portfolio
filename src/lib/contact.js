// Contact form API client. Validation rules are shared with the server in
// shared/contact.js. The full request/response contract is in the README.

export { LIMITS, INQUIRIES, validateContact } from '../../shared/contact.js'

export const CONTACT_ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT || '/api/contact'
// Static hosts without the API (e.g. GitHub Pages) build with
// VITE_CONTACT_ENDPOINT=none; the contact page then offers email directly.
export const CONTACT_FORM_ENABLED = CONTACT_ENDPOINT !== 'none'
const TIMEOUT_MS = 20000

export class ContactError extends Error {
  constructor(kind, message, fieldErrors = {}) {
    super(message)
    this.kind = kind // 'validation' | 'rate-limit' | 'network' | 'server'
    this.fieldErrors = fieldErrors
    this.retryable = kind === 'network' || kind === 'server' || kind === 'rate-limit'
  }
}

/**
 * POST the message. Resolves only when the server confirms the SMTP server
 * accepted it; throws ContactError otherwise.
 * `elapsedMs` is how long the form was open (used server-side as a bot signal).
 */
export async function submitContact(values, { signal, elapsedMs } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  signal?.addEventListener('abort', () => controller.abort())

  let res
  try {
    res = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: values.name.trim(),
        email: values.email.trim(),
        inquiry: values.inquiry,
        message: values.message.trim(),
        website: values.website ?? '',
        ...(Number.isFinite(elapsedMs) && { elapsedMs: Math.round(elapsedMs) }),
      }),
      signal: controller.signal,
    })
  } catch {
    throw new ContactError('network', 'The message could not be sent. Check your connection and try again.')
  } finally {
    clearTimeout(timer)
  }

  let body = null
  if ((res.headers.get('content-type') || '').includes('application/json')) {
    body = await res.json().catch(() => null)
  }

  if (res.ok && body?.ok) return body
  if (res.status === 400 || res.status === 422) {
    throw new ContactError('validation', body?.message || 'Please check the highlighted fields.', body?.errors || {})
  }
  if (res.status === 413) {
    throw new ContactError('validation', 'Your message is too long. Please shorten it and try again.')
  }
  if (res.status === 429) {
    throw new ContactError('rate-limit', 'Too many messages in a short time. Please wait a few minutes and try again.')
  }
  throw new ContactError('server', 'The message could not be delivered right now. Please try again in a moment.')
}
