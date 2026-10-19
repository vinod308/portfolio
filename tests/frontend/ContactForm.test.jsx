// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ContactForm from '../../src/components/ContactForm.jsx'

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

async function fillValid(user) {
  await user.type(screen.getByLabelText(/^First name/), 'Asha')
  await user.type(screen.getByLabelText(/^Last name/), 'Recruiter')
  await user.type(screen.getByLabelText(/^Email/), 'asha@company.example')
  await user.type(screen.getByLabelText(/^Phone/), '+91 98765 43210')
  await user.type(screen.getByLabelText(/^Message/), 'We have a full stack role and would love to talk.')
}

const submit = () => screen.getByRole('button', { name: /send message|try again|sending/i })

describe('ContactForm', () => {
  let fetchMock
  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows field errors and does not call the API when invalid', async () => {
    const user = userEvent.setup()
    render(<ContactForm />)
    await user.click(submit())
    expect(screen.getByText('Please enter your first name.')).toBeVisible()
    expect(screen.getByText('Please enter your last name.')).toBeVisible()
    expect(screen.getByText('Please enter your email address.')).toBeVisible()
    expect(screen.getByLabelText(/^Phone/)).not.toHaveAttribute('aria-invalid')
    expect(screen.getByLabelText(/^First name/)).toHaveFocus()
    expect(screen.getByLabelText(/^First name/)).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a loading state and blocks duplicate submissions while sending', async () => {
    let resolve
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)))
    const user = userEvent.setup()
    render(<ContactForm />)
    await fillValid(user)
    await user.click(submit())

    const button = submit()
    expect(button).toHaveTextContent('Sending…')
    expect(button).toHaveAttribute('aria-disabled', 'true')
    await user.click(button)
    await user.click(button)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolve(json(200, { ok: true }))
    expect(await screen.findByText('Thanks, your message is on its way.')).toBeVisible()
  })

  it('posts the documented JSON contract', async () => {
    fetchMock.mockResolvedValue(json(200, { ok: true }))
    const user = userEvent.setup()
    render(<ContactForm />)
    await fillValid(user)
    await user.click(submit())
    await screen.findByText('Thanks, your message is on its way.')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/contact')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({
      firstName: 'Asha',
      lastName: 'Recruiter',
      email: 'asha@company.example',
      phone: '+91 98765 43210',
      website: '',
    })
    expect(typeof body.elapsedMs).toBe('number')
  })

  it('shows success only after the server confirms', async () => {
    fetchMock.mockResolvedValue(json(200, { ok: false }))
    const user = userEvent.setup()
    render(<ContactForm />)
    await fillValid(user)
    await user.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent('Not sent.')
    expect(screen.queryByText('Thanks, your message is on its way.')).toBeNull()
  })

  it('shows a retryable failure, then succeeds on retry', async () => {
    fetchMock.mockResolvedValueOnce(json(502, { ok: false, message: 'x' })).mockResolvedValueOnce(json(200, { ok: true }))
    const user = userEvent.setup()
    render(<ContactForm />)
    await fillValid(user)
    await user.click(submit())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/could not be delivered right now/i)
    expect(alert).toHaveTextContent('vinodvinni308@gmail.com')
    expect(submit()).toHaveTextContent('Try again')

    await user.click(submit())
    expect(await screen.findByText('Thanks, your message is on its way.')).toBeVisible()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('handles network errors and rate limiting', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(json(429, { ok: false }))
    const user = userEvent.setup()
    render(<ContactForm />)
    await fillValid(user)
    await user.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent(/check your connection/i)
    await user.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many messages/i)
  })

  it('maps server field errors onto the form', async () => {
    fetchMock.mockResolvedValue(json(422, { ok: false, errors: { email: 'This address bounced.' } }))
    const user = userEvent.setup()
    render(<ContactForm />)
    await fillValid(user)
    await user.click(submit())
    expect(await screen.findByText('This address bounced.')).toBeVisible()
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true')
  })
})
