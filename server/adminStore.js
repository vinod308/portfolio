// Admin auth storage: password hash, sessions and one-time set-password
// tokens. Only hashes are stored (sha256 for random tokens, scrypt for the
// password), so a database leak exposes nothing usable.
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { neon } from '@neondatabase/serverless'

const scrypt = promisify(scryptCb)
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 }

export const SESSION_HOURS = 12
export const SET_PASSWORD_MINUTES = 30

export const newToken = () => randomBytes(32).toString('base64url')
export const hashToken = (token) => createHash('sha256').update(token).digest('hex')

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, SCRYPT.keylen, SCRYPT)
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password, stored) {
  const [alg, N, r, p, salt, hash] = String(stored).split('$')
  if (alg !== 'scrypt' || !hash) return false
  const expected = Buffer.from(hash, 'base64')
  const key = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, { N: +N, r: +r, p: +p })
  return timingSafeEqual(key, expected)
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS admin_credentials (
     email text PRIMARY KEY,
     password_hash text NOT NULL,
     updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS admin_tokens (
     token_hash text PRIMARY KEY,
     email text NOT NULL,
     purpose text NOT NULL,
     expires_at timestamptz NOT NULL,
     used_at timestamptz,
     created_at timestamptz NOT NULL DEFAULT now())`,
]

/** Postgres (Neon) store. Tables are created on first use. */
export function createNeonStore(databaseUrl) {
  const sql = neon(databaseUrl)
  let ready
  const init = () => (ready ??= (async () => { for (const q of SCHEMA) await sql.query(q) })())
  return {
    async getPasswordHash(email) {
      await init()
      const rows = await sql`SELECT password_hash FROM admin_credentials WHERE email = ${email}`
      return rows[0]?.password_hash ?? null
    },
    async setPasswordHash(email, hash) {
      await init()
      await sql`INSERT INTO admin_credentials (email, password_hash) VALUES (${email}, ${hash})
                ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now()`
    },
    async createToken(email, purpose, minutes) {
      await init()
      const token = newToken()
      await sql`INSERT INTO admin_tokens (token_hash, email, purpose, expires_at)
                VALUES (${hashToken(token)}, ${email}, ${purpose}, now() + make_interval(mins => ${minutes}))`
      return token
    },
    /** The token's email if it is valid for `purpose`; one-time tokens are consumed. */
    async useToken(token, purpose, { once = false } = {}) {
      await init()
      const rows = once
        ? await sql`UPDATE admin_tokens SET used_at = now()
                    WHERE token_hash = ${hashToken(token)} AND purpose = ${purpose}
                      AND used_at IS NULL AND expires_at > now()
                    RETURNING email`
        : await sql`SELECT email FROM admin_tokens
                    WHERE token_hash = ${hashToken(token)} AND purpose = ${purpose} AND expires_at > now()`
      return rows[0]?.email ?? null
    },
    async deleteToken(token) {
      await init()
      await sql`DELETE FROM admin_tokens WHERE token_hash = ${hashToken(token)}`
    },
    async deleteTokens(email, purpose) {
      await init()
      await sql`DELETE FROM admin_tokens WHERE email = ${email} AND purpose = ${purpose}`
    },
  }
}

/** In-memory store with the same behaviour, for tests. */
export function createMemoryStore({ now = () => Date.now() } = {}) {
  const passwords = new Map()
  const tokens = new Map()
  return {
    passwords,
    tokens,
    getPasswordHash: async (email) => passwords.get(email) ?? null,
    setPasswordHash: async (email, hash) => void passwords.set(email, hash),
    async createToken(email, purpose, minutes) {
      const token = newToken()
      tokens.set(hashToken(token), { email, purpose, expires: now() + minutes * 60_000, used: false })
      return token
    },
    async useToken(token, purpose, { once = false } = {}) {
      const t = tokens.get(hashToken(token))
      if (!t || t.purpose !== purpose || t.expires <= now() || (once && t.used)) return null
      if (once) t.used = true
      return t.email
    },
    deleteToken: async (token) => void tokens.delete(hashToken(token)),
    async deleteTokens(email, purpose) {
      for (const [k, t] of tokens) if (t.email === email && t.purpose === purpose) tokens.delete(k)
    },
  }
}
