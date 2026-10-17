import nodemailer from 'nodemailer'
import { fullName } from '../shared/contact.js'

// Fixed wording so a Gmail filter on "New portfolio inquiry" catches every message.
const SUBJECT_PREFIX = 'New portfolio inquiry from'

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
/** "Sat, 17 Oct 2026, 1:17 pm IST": the time as Vinod reads it, in India. */
export function formatReceived(date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  )
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod.toLowerCase()} IST`
}

// Email-safe HTML: tables and inline styles only, 600px wide, no images
// (the monogram is text), so it renders the same in Gmail, Outlook and on phones.
// White throughout with black text; depth comes from a soft shadow and hairlines.
const C = {
  white: '#ffffff',
  text: '#111111',
  muted: '#555555',
  line: '#e5e5e5',
  shadow: '0 4px 18px rgba(0,0,0,0.10)',
}
// Invisible spacers after the preview text, so inbox snippets don't run on
// into the header text.
const PREVIEW_PAD = '&#847;&zwnj;&nbsp;'.repeat(60)
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

const button = (href, label) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;padding:10px 18px;margin:0 8px 8px 0;border-radius:8px;border:1px solid ${C.text};background:${C.white};color:${C.text};font:600 14px ${FONT};text-decoration:none;box-shadow:${C.shadow}">${label}</a>`

// Explicit black links: otherwise Gmail auto-links emails, phones and domains in blue.
const link = (href, label) =>
  `<a href="${escapeHtml(href)}" style="color:${C.text};text-decoration:underline">${escapeHtml(label)}</a>`

const detail = (label, valueHtml) => `<tr>
  <td style="padding:10px 0;border-top:1px solid ${C.line};width:96px;color:${C.muted};font:13px ${FONT};vertical-align:top">${label}</td>
  <td style="padding:10px 0;border-top:1px solid ${C.line};color:${C.text};font:15px ${FONT};vertical-align:top">${valueHtml}</td>
</tr>`

/**
 * Build the notification email. The visitor's address is only ever used as
 * Reply-To; From is always the configured, authenticated sender.
 */
export function buildMessage(inquiry, config, receivedAt = new Date()) {
  const name = headerSafe(fullName(inquiry))
  const firstName = headerSafe(inquiry.firstName, 50)
  const phone = headerSafe(inquiry.phone, 25)
  const email = inquiry.email
  const when = formatReceived(receivedAt)
  const site = new URL(config.clientOrigins[0]).host
  const digits = phone.replace(/\D/g, '')
  const tel = `tel:${phone.startsWith('+') ? '+' : ''}${digits}`
  // wa.me needs the country code, so only offer WhatsApp for international numbers.
  const whatsapp = phone.startsWith('+') ? `https://wa.me/${digits}` : null
  const mailto = `mailto:${email}?subject=${encodeURIComponent(`Re: your message on ${site}`)}`
  const preview = inquiry.message.replace(/\s+/g, ' ').slice(0, 120)
  const siteLink = link(config.clientOrigins[0], site)

  const text = [
    `New portfolio inquiry from ${name}`,
    '',
    `First name: ${headerSafe(inquiry.firstName, 50)}`,
    `Last name:  ${headerSafe(inquiry.lastName, 50)}`,
    `Email:      ${email}`,
    `Phone:      ${phone}`,
    `Received:   ${when}`,
    '',
    'Message',
    '-------',
    inquiry.message,
    '',
    '--',
    `Reply to this email to answer ${name} directly.`,
    `Sent from the contact form on ${site}`,
  ].join('\n')

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>New portfolio inquiry</title></head>
<body style="margin:0;padding:0;background:${C.white}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(`${name}: ${preview}`)}${PREVIEW_PAD}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.white}"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border:1px solid ${C.line};border-radius:14px;background:${C.white};box-shadow:${C.shadow}">

  <tr><td style="padding:22px 28px;border-bottom:1px solid ${C.line}">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="width:40px;height:40px;border-radius:10px;border:1.5px solid ${C.text};text-align:center;vertical-align:middle;color:${C.text};font:700 15px ${FONT};letter-spacing:0.5px">VK</td>
      <td style="padding-left:14px">
        <div style="color:${C.text};font:700 16px ${FONT}">New portfolio inquiry</div>
        <div style="color:${C.muted};font:13px ${FONT};padding-top:2px">${siteLink} · contact form</div>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:26px 28px 8px">
    <div style="color:${C.muted};font:600 12px ${FONT};letter-spacing:1px;text-transform:uppercase">From</div>
    <div style="color:${C.text};font:700 24px ${FONT};padding:6px 0 18px">${escapeHtml(name)}</div>
    <div>${button(mailto, `Reply to ${escapeHtml(firstName)}`)}${button(tel, 'Call')}${whatsapp ? button(whatsapp, 'WhatsApp') : ''}</div>
  </td></tr>

  <tr><td style="padding:12px 28px 4px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${detail('First name', escapeHtml(headerSafe(inquiry.firstName, 50)))}
      ${detail('Last name', escapeHtml(headerSafe(inquiry.lastName, 50)))}
      ${detail('Email', link(mailto, email))}
      ${detail('Phone', link(tel, phone))}
      ${detail('Received', escapeHtml(when))}
    </table>
  </td></tr>

  <tr><td style="padding:20px 28px 28px">
    <div style="color:${C.muted};font:600 12px ${FONT};letter-spacing:1px;text-transform:uppercase;padding-bottom:10px">Message</div>
    <div style="background:${C.white};border:1px solid ${C.line};border-radius:10px;padding:16px 18px;color:${C.text};font:15px/1.6 ${FONT};white-space:pre-wrap;box-shadow:${C.shadow}">${escapeHtml(inquiry.message)}</div>
  </td></tr>

  <tr><td style="padding:16px 28px;border-top:1px solid ${C.line};color:${C.muted};font:12px/1.5 ${FONT}">
    Reply to this email to answer ${escapeHtml(name)} directly. Sent from the contact form on ${siteLink}.
  </td></tr>

</table>
</td></tr></table>
</body></html>`

  return {
    from: config.mailFrom,
    to: config.mailTo,
    replyTo: { name, address: email },
    subject: headerSafe(`${SUBJECT_PREFIX} ${name}`, 150),
    text,
    html,
  }
}
