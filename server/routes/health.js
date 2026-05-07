'use strict'

const { getDb } = require('../db/setup')

/**
 * GET /health
 * Returns a JSON health object for use by Docker HEALTHCHECK, load balancers,
 * and uptime monitors. Always responds with HTTP 200 unless the database check
 * itself throws, in which case it responds with HTTP 503.
 */
module.exports = async function (fastify) {
  fastify.get('/health', async (request, reply) => {
    const startMs = Date.now()
    let dbOk = false
    let dbLatencyMs = null

    try {
      const t0 = Date.now()
      getDb().prepare('SELECT 1').get()
      dbLatencyMs = Date.now() - t0
      dbOk = true
    } catch (err) {
      fastify.log.error({ err }, 'Health check: database error')
    }

    const mem = process.memoryUsage()
    const body = {
      status: dbOk ? 'ok' : 'degraded',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      db: {
        ok: dbOk,
        latencyMs: dbLatencyMs
      },
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal
      }
    }

    return reply.code(dbOk ? 200 : 503).send(body)
  })
}
