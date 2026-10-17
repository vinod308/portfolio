import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { makeApp, validBody, mockTransport } from './helpers.js'
import { createMemoryStore } from '../../server/adminStore.js'
import { createMemoryInquiryStore } from '../../server/inquiries.js'

const ORIGIN = 'http://localhost:5173'

async function setup(transport) {
  const adminStore = createMemoryStore()
  const inquiryStore = createMemoryInquiryStore()
  const ctx = makeApp({ adminStore, inquiryStore, ...(transport && { transport }) })
  const token = await adminStore.createToken('vinodvinni308@gmail.com', 'session', 60)
  const auth = (r) => r.set('Origin', ORIGIN).set('Authorization', `Bearer ${token}`)
  return { ...ctx, inquiryStore, auth }
}
const submit = (app, body = validBody) => request(app).post('/api/contact').set('Origin', ORIGIN).send(body)

describe('inquiries', () => {
  it('saves each contact submission and marks it emailed', async () => {
    const t = await setup()
    await submit(t.app)
    expect(t.inquiryStore.items[0]).toMatchObject({ firstName: 'Asha', lastName: 'Recruiter', phone: '+91 98765 43210', status: 'new', emailed: true })
  })

  it('keeps the inquiry when email fails, and never saves bots', async () => {
    const t = await setup(mockTransport(async () => { throw Object.assign(new Error('x'), { code: 'EAUTH' }) }))
    expect((await submit(t.app)).status).toBe(502)
    expect(t.inquiryStore.items[0].emailed).toBe(false)
    await submit(t.app, { ...validBody, website: 'spam.example' })
    expect(t.inquiryStore.items).toHaveLength(1)
  })

  it('lists, filters, searches and updates status for the signed-in owner only', async () => {
    const t = await setup()
    await submit(t.app)
    await submit(t.app, { ...validBody, firstName: 'Ravi', email: 'ravi@startup.example' })
    expect((await request(t.app).get('/api/admin/inquiries').set('Origin', ORIGIN)).status).toBe(401)

    const all = await t.auth(request(t.app).get('/api/admin/inquiries'))
    expect(all.body.items).toHaveLength(2)
    expect(all.body.counts).toEqual({ new: 2, replied: 0, archived: 0 })

    const found = await t.auth(request(t.app).get('/api/admin/inquiries?q=ravi'))
    expect(found.body.items.map((i) => i.firstName)).toEqual(['Ravi'])

    const id = found.body.items[0].id
    const upd = await t.auth(request(t.app).patch(`/api/admin/inquiries/${id}`)).send({ status: 'replied' })
    expect(upd.body.item.status).toBe('replied')
    const replied = await t.auth(request(t.app).get('/api/admin/inquiries?status=replied'))
    expect(replied.body.items).toHaveLength(1)
    expect((await t.auth(request(t.app).patch(`/api/admin/inquiries/${id}`)).send({ status: 'deleted' })).status).toBe(400)
    expect((await t.auth(request(t.app).patch('/api/admin/inquiries/999')).send({ status: 'archived' })).status).toBe(404)
  })
})
