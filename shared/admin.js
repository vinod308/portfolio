// Admin access rules shared by the /admin page and the server. Both values are
// public by design: the Client ID identifies the site to Google, and the
// server (server/admin.js) is what actually enforces the allow-list.

// Google Cloud Console > APIs & Services > Credentials > OAuth client (Web),
// with https://vinod-kumar.in and http://localhost:5173 as JavaScript origins.
export const GOOGLE_CLIENT_ID = ''

/** The only Google accounts that may use /admin (lowercase). */
export const ADMIN_EMAILS = ['vinodvinni308@gmail.com']

export const isAdminEmail = (email) => typeof email === 'string' && ADMIN_EMAILS.includes(email.toLowerCase())
