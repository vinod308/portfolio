# Vinod Kumar — Portfolio

Personal portfolio for **Vinod Kumar**, Full Stack Developer | AI Application Engineer.

- **Frontend:** React + Vite (JavaScript), React Router, plain CSS with design tokens, GSAP.
- **Backend:** a small Node.js + Express API (`server/`) with one endpoint,
  `POST /api/contact`, which validates inquiries and emails them to
  vinodvinni308@gmail.com through SMTP (Nodemailer).
- **Tests:** Vitest for the API (mocked SMTP), validation rules, assets and the contact form UI.

## Prerequisites

- Node.js **22.9 or newer** (uses `--env-file-if-exists`; developed on Node 24).
- An SMTP account that can send from the address you put in `MAIL_FROM`
  (only needed to actually deliver email; see [Local testing](#local-testing)).

## Installation

```bash
npm install
cp server/.env.example server/.env   # then fill in SMTP values (never commit this file)
```

## Running locally

Run the API and the frontend in two terminals:

```bash
npm run dev:server   # Express API on http://localhost:3001 (reads server/.env, restarts on change)
npm run dev          # Vite on http://localhost:5173
```

Vite proxies `/api/*` to `http://localhost:3001` (`vite.config.js`), so the
browser calls `/api/contact` on its own origin. `CLIENT_ORIGIN` in
`server/.env` must match the Vite URL (`http://localhost:5173` by default).
`npm run preview` (production build) uses the same proxy.

| Command | What it does |
| --- | --- |
| `npm run dev` | Frontend dev server |
| `npm run dev:server` | API with file watching, env from `server/.env` |
| `npm start` | API without watching (production entry point) |
| `npm run build` | Production frontend build into `dist/`, then prerenders every page (see below) |
| `npm test` | All automated tests (never sends real email) |
| `npm run lint` | ESLint |

## Environment variables

### Backend (`server/.env` locally, hosting secret manager in production)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `SMTP_HOST` | yes | | SMTP server hostname from your provider |
| `SMTP_PORT` | | `587` | `587` for STARTTLS submission, `465` for implicit TLS |
| `SMTP_SECURE` | | `true` if port is 465, else `false` | `true` = TLS from the first byte (port 465) |
| `SMTP_REQUIRE_TLS` | | `true` when not secure | Refuse to log in unless the connection upgrades via STARTTLS |
| `SMTP_USER` / `SMTP_PASS` | yes | | SMTP login (often an app password, see below) |
| `MAIL_FROM` | yes | | Fixed sender your account may send as, e.g. `Portfolio Contact <you@yourdomain.com>` |
| `MAIL_TO` | | `vinodvinni308@gmail.com` | Where inquiries are delivered |
| `PORT` | | `3001` | API port |
| `CLIENT_ORIGIN` | | `http://localhost:5173` | Allowed frontend origin(s), comma-separated, no trailing slash |
| `TRUST_PROXY` | | unset | Set (e.g. `1`) behind a reverse proxy so rate limiting sees real client IPs |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MIN` | | `5` / `15` | Contact submissions allowed per IP per window |
| `SERVE_STATIC` | | `false` | `true` = Express also serves `dist/` with SPA fallback (single-service deploy) |
| `SMTP_VERIFY_ON_START` | | `true` | Check SMTP login at startup and log the result (code only) |
| `MAIL_TRANSPORT` | | `smtp` | `log` = don't send, just log metadata (local dev only; refused in production) |
| `NODE_ENV` | | | Set to `production` in production |

The server refuses to start if required variables are missing or malformed,
and lists the variable **names** (never values).

### Frontend (build time, `.env.example` at the project root)

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_CONTACT_ENDPOINT` | `/api/contact` | Where the form POSTs. Only change it if the API is on another origin |
| `VITE_SITE_URL` | empty | Public URL (no trailing slash). Enables absolute social-preview URLs, canonical links and `sitemap.xml` |

`VITE_*` values are baked into the public bundle: never put secrets in them.
SMTP credentials exist only in the server's environment.

## SMTP configuration

No provider is assumed. Use the exact host, port, security mode and
credentials from your provider's documentation. Typical shapes:

- **Port 587 (STARTTLS):** `SMTP_PORT=587`, `SMTP_SECURE=false`, `SMTP_REQUIRE_TLS=true`.
- **Port 465 (implicit TLS):** `SMTP_PORT=465`, `SMTP_SECURE=true`.
- **Gmail / Google Workspace:** requires 2-Step Verification and an
  [app password](https://support.google.com/accounts/answer/185833) for
  `SMTP_PASS`. `MAIL_FROM` must be that account's address (or a verified alias).
- **Transactional providers** (Postmark, SendGrid, Mailgun, Amazon SES, Brevo…):
  use their SMTP credentials and verify the sending domain (SPF/DKIM) so
  `MAIL_FROM` passes authentication.

How the email is built:

- **From:** always `MAIL_FROM`; the visitor's address is never used as the sender.
- **Reply-To:** the visitor's validated name and email, so replying goes straight to them.
- **Subject:** `[Portfolio Inquiry] <topic> from <name>`, with line breaks and
  control characters removed so the header can't be injected into.
- **Body:** plain text plus an HTML version in which all visitor content is escaped.

The API answers `{ "ok": true }` only after the SMTP server accepts the
message. Acceptance is not a guarantee of inbox delivery: the receiving side
can still filter or junk it (see [Troubleshooting](#troubleshooting-email-delivery)).

## Contact API contract

```http
POST /api/contact
Content-Type: application/json

{ "name": "…", "email": "…", "inquiry": "job|project|ai|other", "message": "…", "website": "", "elapsedMs": 12000 }
```

| Response | Meaning |
| --- | --- |
| `200 { ok: true }` | SMTP accepted the message (also returned for silently dropped bot submissions) |
| `400 { ok: false }` | Malformed JSON, wrong field types, non-object body |
| `403` | Request from an origin not in `CLIENT_ORIGIN` |
| `413` | Body over 16 KB |
| `415` | Not `application/json` |
| `422 { ok: false, errors: { field: message } }` | Validation failed (the form highlights those fields) |
| `429` | Rate limit reached |
| `502 { ok: false }` | SMTP failed; generic message, the form offers a retry and the public email |

Validation rules (`shared/contact.js`) are shared by the browser and the server:
name 2–80 chars, valid email ≤ 254 chars, known inquiry type, message 20–2000
chars with at most 5 links. Single-line fields lose line breaks; control
characters are stripped.

### Security measures

- Server-side validation and normalisation of every field and type.
- JSON only, 16 KB body limit, per-IP rate limit (`express-rate-limit`).
- Spam: a hidden `website` honeypot and a minimum form-fill time (`elapsedMs`
  under 3 s). Both get a normal-looking success response and no email.
- Origin check plus CORS restricted to `CLIENT_ORIGIN`; security headers via
  Helmet (CSP, HSTS, nosniff, frame and referrer policies); `x-powered-by` removed.
- Generic error responses; logs record only event, inquiry type, email domain,
  message length and SMTP error codes. Never credentials, names, addresses or message text.
- No endpoint exposes configuration. `GET /api/health` returns `{ "ok": true }` only.
- `.env` files are git-ignored; only `*.env.example` placeholders are committed.

## Local testing

**Automated (safe for CI):** `npm test`. All SMTP calls use a mocked
transport; nothing is sent. Coverage includes valid submission, missing fields,
invalid email, oversized messages and bodies, wrong types, rate limiting,
honeypot and timing traps, SMTP success, SMTP failure, rejected recipients,
header injection, HTML escaping, CORS, security headers, absence of secrets in
logs, SPA fallback, required assets, and the form's loading, duplicate-submit,
success, retryable-failure and field-error states.

**Without SMTP credentials:** set `MAIL_TRANSPORT=log` in `server/.env`. The
whole flow works and the server logs that a message would have been sent.

**With real credentials:** fill in `server/.env`, run both dev servers, and send
one message through `/contact`. Watch the API log for `smtp_ready` at startup
and `mail_sent` after submitting, then check the inbox (and spam folder).

## Production deployment

Use HTTPS everywhere. Put all backend variables in the host's secret manager
and set `NODE_ENV=production`.

**Option A: one Node service (simplest).** Build and serve the frontend and API together:

```bash
npm ci && npm run build
SERVE_STATIC=true NODE_ENV=production npm start
```

Set `CLIENT_ORIGIN` to the public site origin (e.g. `https://yourdomain.com`)
and `TRUST_PROXY=1` if the platform puts a proxy in front. Express serves
hashed assets with long-lived caching, each page's prerendered
`index.html` (so `/projects/haylow` loads directly) and `404.html` with a
404 status for unknown URLs.

**Option B: static frontend + separate API.** Deploy `dist/` to any static
host: every page has its own `index.html` folder and unknown URLs should get
`404.html`. Either proxy `/api/*` on the static host to the API service
(keeps `VITE_CONTACT_ENDPOINT=/api/contact`), or build with
`VITE_CONTACT_ENDPOINT=https://api.yourdomain.com/api/contact` and set the
API's `CLIENT_ORIGIN` to the site origin.

In both cases set `VITE_SITE_URL` at build time so social previews, canonical
links, JSON-LD and the sitemap use absolute URLs. The in-memory rate limiter is
per process; if you run several API instances, use a shared store (e.g. Redis)
for `express-rate-limit`.

### Prerendering and structured data

`npm run build` runs three steps: the normal client build, an SSR build of
`src/entry-server.jsx` into `node_modules/.prerender/`, and
`scripts/prerender.js`, which writes a fully rendered `index.html` for every
page in `ROUTES` (home, projects, about, contact, each case study). Crawlers
that don't run JavaScript (AI crawlers, LinkedIn/WhatsApp previews) get the
real content plus that page's title, description, canonical link and
schema.org JSON-LD (`src/lib/structuredData.js`: Person, WebSite,
ProfilePage, Article and BreadcrumbList, built only from `site.js` and
`projects.js`). The browser then hydrates the HTML. `404.html` is a
client-rendered shell marked `noindex`.

Titles and descriptions live in `src/lib/pageMeta.js`, shared by the
prerender and by `usePageMeta` for client-side navigation. A new case study in
`projects.js` is prerendered and added to the sitemap automatically.

## Troubleshooting email delivery

| Symptom | Likely cause / fix |
| --- | --- |
| Server exits with `config_invalid` | A required variable is missing or malformed; the log lists which |
| `smtp_verify_failed` with `EAUTH` / `535` | Wrong username/password; Gmail needs an app password, not the normal password |
| `ESOCKET` / `ETIMEDOUT` / `ECONNECTION` | Wrong host/port, firewall, or the host blocks outbound SMTP (many clouds block port 25; use 587 or 465) |
| TLS or `wrong version number` errors | Port and `SMTP_SECURE` don't match: 465 needs `SMTP_SECURE=true`, 587 needs `false` |
| `Must issue a STARTTLS` / login refused | Keep `SMTP_REQUIRE_TLS=true` on 587 |
| Sender rejected (`553`, `550`) | `MAIL_FROM` isn't an address the account may send as |
| `mail_sent` logged but nothing arrives | Check spam; set up SPF/DKIM/DMARC for the `MAIL_FROM` domain; some providers hold new accounts for review |
| Form shows "Forbidden" / 403 | Site origin isn't listed in `CLIENT_ORIGIN` (exact scheme, host and port, no trailing slash) |
| Everyone gets 429 at once | Behind a proxy without `TRUST_PROXY`, so all visitors share one IP |

## Project structure

```
public/                   favicon, apple-touch-icon, og-image, résumé PDF, brand/ logos
scripts/build-brand.py    generates the logo/favicon SVGs
scripts/prerender.js      writes the prerendered page HTML (last step of npm run build)
server/
  index.js                entry point: config, SMTP verify, listen, graceful shutdown
  app.js                  Express app: security, rate limit, /api/contact, static hosting
  config.js               environment parsing and validation
  mailer.js               Nodemailer transport and message builder
  .env.example            backend variables (placeholders only)
shared/contact.js         validation rules used by browser and server
src/
  App.jsx                 routes (lazy-loaded inner pages)
  entry-server.jsx        build-time renderer: page list, head tags, route HTML
  components/             Layout, Navbar, Footer, Logo, Button, Container, SectionHeading,
                          PageHeader, Portrait, CapabilityList, ProjectCard, WorkflowDiagram, ContactForm
  sections/               homepage sections
  pages/                  Home, Projects, ProjectDetail, About, Contact, NotFound
  data/                   site.js, projects.js (single source of project content), content.js
  lib/                    motion.js (GSAP), contact.js (API client), pageMeta.js + usePageMeta.js,
                          structuredData.js (JSON-LD), useHydrated.js
  styles/                 tokens.css, base.css, layout.css
tests/                    server/, shared/, frontend/, assets.test.js
```

## Routes

| Path | Page |
| --- | --- |
| `/` | Homepage |
| `/projects` | Project gallery, filterable with `?category=saas\|ai\|ecommerce\|web` |
| `/projects/:slug` | Case study for `moneygence`, `haylow`, `ongrid` (others show the 404 page) |
| `/about` | About, approach, capabilities, stack, experience |
| `/contact` | Contact form |
| `/work/:slug` | Redirects to `/projects/:slug` (old Phase 2 links) |
| anything else | 404 page |

## Content rules

All copy comes from the approved résumé. External links are included only after
confirming the site responds; a project with no confirmed URL has `href: null`.
Statements in `src/data/projects.js` marked `CONFIRM` go beyond the résumé
wording and should be checked before launch. Project mock-ups and the
engineering dashboard are original CSS/SVG illustrations with placeholder data,
labelled as illustrative on the page.

## Animation

Every section animates through `useMotion(ref, setup)` in `src/lib/motion.js`,
which wraps `gsap.matchMedia()` scoped to the component: tweens and
ScrollTriggers are reverted on unmount (no duplicates under StrictMode), setup
runs only without `prefers-reduced-motion`, and mobile gets lighter motion.
Content is fully visible in the static markup; animations only tween *from* a
hidden state. Presets: `reveal`, `clipReveal`, `drawStroke`, `growLine`,
`countUp`, `animateMockup`.

## Brand

**Concept: "VK as a system graph".** One continuous stroke draws the V and the
K, which share a vertex (the V's right arm *is* the top of the K's stem). Open
ends are nodes, like services in an architecture diagram, and the K's junction
is a glowing teal hub: the backend in control. Blue-to-teal gradient on a
64-unit grid.

On the site, `<LogoMark>` (`src/components/Logo.jsx`) draws itself on load,
pops the nodes in sequence and ignites the hub. In the hero (`motion="signal"`)
a signal pulse then runs V → shared vertex → hub → leg every few seconds;
in the navbar the pulse replays on hover/focus. With reduced motion it is static.

| File | Use |
| --- | --- |
| `public/brand/vk-logo-dark.svg` | Full lockup on dark backgrounds |
| `public/brand/vk-logo-light.svg` | Full lockup on light backgrounds |
| `public/brand/vk-mark-dark.svg` / `vk-mark-light.svg` | Monogram only |
| `public/brand/vk-app-icon.svg` | App / social avatar tile |
| `public/favicon.svg` | Browser favicon |
| `public/og-image.png` | 1200×630 social preview |

The wordmark in the SVG lockups is Geist SemiBold converted to outlines, so the
files render identically without the font installed. In the site itself,
`<Logo />` draws the same mark inline and sets the wordmark as live text.

To change the geometry or colours, edit `scripts/build-brand.py` and run it
(needs `pip install fonttools brotli` and `npm install` for the font file).
Keep the path data in `src/components/Logo.jsx` in sync.

## Design system

All colours, type sizes, spacing, radii and motion durations live in
`src/styles/tokens.css`. Components use **semantic** tokens only
(`--color-surface`, `--color-text-muted`, `--color-button-primary-bg`, …),
which map onto the palette:

| Token | Value |
| --- | --- |
| Midnight Navy | `#0B1220` |
| Panel Navy | `#111D30` |
| Electric Blue | `#4D7CFE` |
| Signal Teal | `#48D6C5` |
| Cool White | `#F5F7FA` |
| Steel Grey | `#94A3B8` |
| Border | `#27354A` |

Typography: **Geist** (sans) and **Geist Mono** (labels/metadata), self-hosted
through `@fontsource-variable`, with system font fallbacks. Type sizes are
fluid (`clamp()`) between 360px and 1280px viewports.

## Accessibility and motion

- Semantic landmarks, skip link, visible `:focus-visible` rings.
- The mobile menu is a disclosure button with `aria-expanded` and closes on Escape.
- `prefers-reduced-motion` zeroes the motion tokens and CSS transitions; GSAP
  animations must check `prefersReducedMotion()` from `src/lib/motion.js`.
