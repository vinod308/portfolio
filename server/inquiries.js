// Contact form submissions, kept in Neon as well as emailed, for /admin/inquiries.
import { neon } from '@neondatabase/serverless'

export const STATUSES = ['new', 'replied', 'archived']

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS inquiries (
     id bigserial PRIMARY KEY,
     created_at timestamptz NOT NULL DEFAULT now(),
     first_name text NOT NULL,
     last_name text NOT NULL,
     email text NOT NULL,
     phone text NOT NULL,
     message text NOT NULL,
     status text NOT NULL DEFAULT 'new',
     emailed boolean NOT NULL DEFAULT false)`,
  'CREATE INDEX IF NOT EXISTS inquiries_created ON inquiries (created_at DESC)',
]

const shape = (r) => ({
  id: Number(r.id),
  createdAt: new Date(r.created_at).toISOString(),
  firstName: r.first_name,
  lastName: r.last_name,
  email: r.email,
  phone: r.phone,
  message: r.message,
  status: r.status,
  emailed: r.emailed,
})

export function createInquiryStore(databaseUrl) {
  const sql = neon(databaseUrl)
  let ready
  const init = () => (ready ??= (async () => { for (const q of SCHEMA) await sql.query(q) })())
  return {
    async add(v) {
      await init()
      const rows = await sql`INSERT INTO inquiries (first_name, last_name, email, phone, message)
                             VALUES (${v.firstName}, ${v.lastName}, ${v.email}, ${v.phone}, ${v.message}) RETURNING id`
      return Number(rows[0].id)
    },
    async markEmailed(id) {
      await init()
      await sql`UPDATE inquiries SET emailed = true WHERE id = ${id}`
    },
    /** Newest first; optional status filter and text search over name, email, phone, message. */
    async list({ status, q, limit = 50, offset = 0 } = {}) {
      await init()
      const like = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null
      const rows = await sql`
        SELECT * FROM inquiries
        WHERE (${status ?? null}::text IS NULL OR status = ${status ?? null})
          AND (${like}::text IS NULL OR first_name || ' ' || last_name || ' ' || email || ' ' || phone || ' ' || message ILIKE ${like})
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      const counts = await sql`SELECT status, count(*)::int AS n FROM inquiries GROUP BY status`
      const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]))
      for (const c of counts) byStatus[c.status] = c.n
      return { items: rows.map(shape), counts: byStatus }
    },
    async setStatus(id, status) {
      await init()
      const rows = await sql`UPDATE inquiries SET status = ${status} WHERE id = ${id} RETURNING *`
      return rows[0] ? shape(rows[0]) : null
    },
  }
}

/** Same behaviour in memory, for tests. */
export function createMemoryInquiryStore() {
  const items = []
  let next = 1
  return {
    items,
    async add(v) {
      const item = { id: next++, createdAt: new Date().toISOString(), ...v, status: 'new', emailed: false }
      items.unshift(item)
      return item.id
    },
    async markEmailed(id) {
      const i = items.find((x) => x.id === id)
      if (i) i.emailed = true
    },
    async list({ status, q } = {}) {
      const needle = q?.toLowerCase()
      const match = (i) =>
        (!status || i.status === status) &&
        (!needle || `${i.firstName} ${i.lastName} ${i.email} ${i.phone} ${i.message}`.toLowerCase().includes(needle))
      const counts = Object.fromEntries(STATUSES.map((s) => [s, items.filter((i) => i.status === s).length]))
      return { items: items.filter(match), counts }
    },
    async setStatus(id, status) {
      const i = items.find((x) => x.id === id)
      if (i) i.status = status
      return i ?? null
    },
  }
}
