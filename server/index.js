// Entry point: load config, create the mail transport, start the API.
// Run with `npm run dev:server` (reads server/.env) or `npm start`.
import { readConfig, ConfigError } from './config.js'
import { createTransport } from './mailer.js'
import { createApp, consoleLogger as log } from './app.js'

let config
try {
  config = readConfig()
} catch (err) {
  if (err instanceof ConfigError) {
    log.error({ event: 'config_invalid', problems: err.problems })
    log.error({ event: 'config_hint', hint: 'Copy server/.env.example to server/.env and fill it in.' })
    process.exit(1)
  }
  throw err
}

const transport = createTransport(config, log)

// Check SMTP connectivity and credentials once at startup. Failure is logged
// (code only) but does not stop the server, so the site keeps working and the
// form reports a retryable error until SMTP is fixed.
if (config.verifyOnStart) {
  transport
    .verify()
    .then(() => log.info({ event: 'smtp_ready', transport: transport.kind }))
    .catch((err) =>
      log.error({ event: 'smtp_verify_failed', code: err?.code, responseCode: err?.responseCode, command: err?.command }),
    )
}

const app = createApp({ config, transport, logger: log })
const server = app.listen(config.port, () => {
  log.info({
    event: 'server_listening',
    port: config.port,
    transport: transport.kind,
    origins: config.clientOrigins,
    serveStatic: config.serveStatic,
  })
})

function shutdown(signal) {
  log.info({ event: 'shutdown', signal })
  server.close(() => {
    transport.close?.()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
