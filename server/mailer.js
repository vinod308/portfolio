import nodemailer from 'nodemailer'
import { fullName } from '../shared/contact.js'

const SUBJECT_PREFIX = '[Portfolio Inquiry]'

/** SMTP transport with bounded timeouts, or a metadata-only log transport for local dev. */
export function createTransport(config, logger) {
  if (config.mailTransport === 'log') {
    const json = nodemailer.createTransport({ jsonTransport: true })
    return {
      kind: 'log',
      verify: async () => true,
      close: () => {},
      async sendMail(msg) {
        const info = await json.sendMail(msg)
        // Development only: log that a message would have been sent, not its contents.
        logger?.info({ event: 'mail_logged', subject: msg.subject, to: msg.to, textLength: msg.text.length })
        return { ...info, accepted: [msg.to], rejected: [] }
      },
    }
  }

  const { host, port, secure, requireTLS, user, pass } = config.smtp
  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    dnsTimeout: 10_000,
  })
  transport.kind = 'smtp'
  return transport
}

/** Strip anything that could break out of a header and cap the length. */
export function headerSafe(value, max = 80) {
  // eslint-disable-next-line no-control-regex
  const controls = /[\r\n\t\u0000-\u001F\u007F]+/g
  return String(value).replace(controls, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max)
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Build the notification email. The visitor's address is only ever used as
 * Reply-To; From is always the configured, authenticated sender.
 */
export function buildMessage(inquiry, config, receivedAt = new Date()) {
  const name = headerSafe(fullName(inquiry))
  const phone = headerSafe(inquiry.phone, 25)
  const when = receivedAt.toISOString()

  const text = [
    'New inquiry from the portfolio contact form',
    '',
    `Name:     ${name}`,
    `Email:    ${inquiry.email}`,
    `Phone:    ${phone}`,
    `Received: ${when}`,
    '',
    'Message:',
    inquiry.message,
    '',
    '--',
    `Reply to this email to respond to ${name} directly.`,
  ].join('\n')

  const row = (label, value) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#64748b">${label}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#0b1220;font-size:15px;line-height:1.5">
<p style="margin:0 0 16px;font-weight:bold">New inquiry from the portfolio contact form</p>
<table role="presentation" style="border-collapse:collapse;margin-bottom:16px">${row('Name', name)}${row('Email', inquiry.email)}${row('Phone', phone)}${row('Received', when)}</table>
<p style="margin:0 0 6px;color:#64748b">Message</p>
<div style="white-space:pre-wrap;border-left:3px solid #4d7cfe;padding:4px 0 4px 12px">${escapeHtml(inquiry.message)}</div>
<p style="margin-top:24px;color:#64748b;font-size:13px">Reply to this email to respond to ${escapeHtml(name)} directly.</p>
</body></html>`

  return {
    from: config.mailFrom,
    to: config.mailTo,
    replyTo: { name, address: inquiry.email },
    subject: headerSafe(`${SUBJECT_PREFIX} ${name}`, 150),
    text,
    html,
  }
}
