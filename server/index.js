'use strict'

require('dotenv').config()
const Fastify = require('fastify')
const setupDb = require('./db/setup')

const app = Fastify({ logger: true })

// ── Crash recovery ─────────────────────────────────────────────────────────────
// Log uncaught errors but avoid masking them — let the process exit so a process
// supervisor (Docker restart policy, systemd, PM2) can restart cleanly.
// flush() is called before process.exit so pino's SonicBoom async buffer is
// written to stdout before the process terminates (avoids silent log loss in
// non-TTY environments such as Docker).
process.on('uncaughtException', (err) => {
  app.log.fatal({ err }, 'Uncaught exception — exiting')
  app.log.flush()
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  app.log.fatal({ reason }, 'Unhandled promise rejection — exiting')
  app.log.flush()
  process.exit(1)
})

// Initialise SQLite
setupDb()

// Register plugins
app.register(require('./plugins/cookie'))
app.register(require('./plugins/session'))
app.register(require('./plugins/static'))
app.register(require('./plugins/websocket'))

// Register routes
app.register(require('./routes/auth'), { prefix: '/auth' })
app.register(require('./routes/game'), { prefix: '/ws' })
app.register(require('./routes/data'), { prefix: '/game' })
app.register(require('./routes/health'))

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown (signal) {
  app.log.info({ signal }, 'Received shutdown signal — closing server')
  app.close(() => {
    app.log.info('Server closed cleanly')
    process.exit(0)
  })
}
process.once('SIGTERM', () => shutdown('SIGTERM'))
process.once('SIGINT',  () => shutdown('SIGINT'))

const port = parseInt(process.env.PORT || '3000', 10)
app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    app.log.flush()
    process.exit(1)
  }
})
