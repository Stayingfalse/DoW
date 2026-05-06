'use strict'

require('dotenv').config()
const Fastify = require('fastify')
const setupDb = require('./db/setup')

const app = Fastify({ logger: true })

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

const port = parseInt(process.env.PORT || '3000', 10)
app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
