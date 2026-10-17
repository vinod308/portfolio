import { useEffect, useId, useRef, useState } from 'react'
import Button, { ArrowIcon } from './Button.jsx'
import { LIMITS, validateContact, submitContact, ContactError } from '../lib/contact.js'
import { site } from '../data/site.js'
import { track } from '../lib/usage.js'
import './ContactForm.css'

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', message: '', website: '' }
const FIELD_ORDER = ['firstName', 'lastName', 'email', 'phone', 'message']
const clock = () => performance.now()

export default function ContactForm() {
  const uid = useId()
  const id = (f) => `${uid}-${f}`
  const [values, setValues] = useState(EMPTY)
  const [touched, setTouched] = useState({})
  const [serverErrors, setServerErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [failure, setFailure] = useState('')
  const formRef = useRef(null)
  const statusRef = useRef(null)
  const abortRef = useRef(null)
  const openedAt = useRef(0)

  // Time the form has been open is sent as a bot signal (see shared/contact.js).
  useEffect(() => {
    openedAt.current = clock()
    return () => abortRef.current?.abort()
  }, [])

  // Move focus to the result so keyboard and screen-reader users hear it.
  useEffect(() => {
    if (status === 'success' || status === 'error') statusRef.current?.focus()
  }, [status])

  const clientErrors = validateContact(values)
  const errorFor = (f) => (touched[f] ? serverErrors[f] || clientErrors[f] : undefined)

  const update = (e) => {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
    if (serverErrors[name]) setServerErrors((s) => ({ ...s, [name]: undefined }))
  }
  const blur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (status === 'submitting') return
    setTouched(Object.fromEntries(FIELD_ORDER.map((f) => [f, true])))
    const firstInvalid = FIELD_ORDER.find((f) => clientErrors[f])
    if (firstInvalid) {
      formRef.current?.querySelector(`[name="${firstInvalid}"]`)?.focus()
      return
    }

    setStatus('submitting')
    setFailure('')
    abortRef.current = new AbortController()
    try {
      await submitContact(values, {
        signal: abortRef.current.signal,
        elapsedMs: clock() - openedAt.current,
      })
      setStatus('success')
      track('generate_lead', { method: 'contact_form' })
    } catch (err) {
      const e2 = err instanceof ContactError ? err : new ContactError('server', 'The message could not be sent.')
      setServerErrors(e2.fieldErrors)
      setFailure(e2.message)
      setStatus('error')
      const field = FIELD_ORDER.find((f) => e2.fieldErrors[f])
      if (field) formRef.current?.querySelector(`[name="${field}"]`)?.focus()
    }
  }

  const reset = () => {
    setValues(EMPTY)
    setTouched({})
    setServerErrors({})
    setFailure('')
    setStatus('idle')
    openedAt.current = clock()
  }

  if (status === 'success') {
    return (
      <div className="contact-form contact-form--done card" role="status" tabIndex={-1} ref={statusRef}>
        <span className="contact-form__check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" />
          </svg>
        </span>
        <h2 className="contact-form__done-title">Thanks, your message is on its way.</h2>
        <p className="contact-form__done-text">
          I&apos;ll reply to <strong>{values.email.trim()}</strong> as soon as I can.
        </p>
        <Button variant="secondary" onClick={reset}>
          Send another message
        </Button>
      </div>
    )
  }

  const field = (name) => {
    const err = errorFor(name)
    return {
      id: id(name),
      name,
      value: values[name],
      onChange: update,
      onBlur: blur,
      'aria-invalid': err ? true : undefined,
      'aria-describedby': [err && id(`${name}-error`), id(`${name}-hint`)].filter(Boolean).join(' ') || undefined,
    }
  }
  const msgLen = values.message.trim().length

  return (
    <form className="contact-form card" ref={formRef} onSubmit={onSubmit} noValidate aria-describedby={id('privacy')}>
      <div className="contact-form__row">
        <TextField
          field={field('firstName')}
          error={errorFor('firstName')}
          label="First name"
          hint={`Required, up to ${LIMITS.name.max} characters.`}
          autoComplete="given-name"
          maxLength={LIMITS.name.max + 10}
        />
        <TextField
          field={field('lastName')}
          error={errorFor('lastName')}
          label="Last name"
          hint={`Required, up to ${LIMITS.name.max} characters.`}
          autoComplete="family-name"
          maxLength={LIMITS.name.max + 10}
        />
      </div>

      <div className="contact-form__row">
        <TextField
          field={field('email')}
          error={errorFor('email')}
          label="Email"
          hint="Required. I'll reply to this address."
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={LIMITS.email.max}
        />
        <TextField
          field={field('phone')}
          error={errorFor('phone')}
          label="Phone"
          hint="Required. Include the country code, for example +91."
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          maxLength={LIMITS.phone.max}
        />
      </div>

      <div className="field">
        <div className="field__label-row">
          <label className="field__label" htmlFor={id('message')}>
            Message <span aria-hidden="true">*</span>
          </label>
          <span
            className={`field__count ${msgLen > LIMITS.message.max ? 'is-over' : ''}`}
            id={id('message-hint')}
          >
            {msgLen} / {LIMITS.message.max}
            <span className="visually-hidden"> characters. Minimum {LIMITS.message.min}.</span>
          </span>
        </div>
        <textarea {...field('message')} className="field__input field__textarea" rows={7} required />
        <FieldError id={id('message-error')} message={errorFor('message')} />
      </div>

      {/* Honeypot: hidden from people and assistive tech, filled by bots */}
      <div className="contact-form__trap" aria-hidden="true">
        <label htmlFor={id('website')}>Website</label>
        <input id={id('website')} name="website" type="text" tabIndex={-1} autoComplete="off" value={values.website} onChange={update} />
      </div>

      {status === 'error' && (
        <div className="contact-form__alert" role="alert" tabIndex={-1} ref={statusRef}>
          <p>
            <strong>Not sent.</strong> {failure}
          </p>
          <p>
            You can also email me directly at <a href={`mailto:${site.email}`}>{site.email}</a>.
          </p>
        </div>
      )}

      <div className="contact-form__actions">
        <Button
          type="submit"
          size="lg"
          icon={status === 'submitting' ? <span className="spinner" /> : <ArrowIcon />}
          aria-disabled={status === 'submitting' || undefined}
          className={status === 'submitting' ? 'is-busy' : ''}
        >
          {status === 'submitting' ? 'Sending…' : status === 'error' ? 'Try again' : 'Send message'}
        </Button>
        <span className="visually-hidden" role="status">
          {status === 'submitting' ? 'Sending your message' : ''}
        </span>
        <p className="contact-form__privacy" id={id('privacy')}>
          Your name, email, phone number and message are used only to reply to this inquiry. They are not added to
          a mailing list or shared.
        </p>
      </div>
    </form>
  )
}

function TextField({ field, error, label, hint, type = 'text', ...rest }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={field.id}>
        {label} <span aria-hidden="true">*</span>
      </label>
      <input {...field} {...rest} className="field__input" type={type} required />
      <FieldError id={`${field.id}-error`} message={error} />
      <span className="visually-hidden" id={`${field.id}-hint`}>
        {hint}
      </span>
    </div>
  )
}

function FieldError({ id, message }) {
  return (
    <p className="field__error" id={id} hidden={!message}>
      {message}
    </p>
  )
}
