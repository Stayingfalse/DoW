'use strict'

const { getDb } = require('../db/setup')

// Cache health response for up to 10 s to prevent rapid-poll abuse
const CACHE_TTL_MS = 10_000
let _cachedResponse = null
let _cacheExpiry = 0

/**
 * GET /health
 * Returns a JSON health object for use by Docker HEALTHCHECK, load balancers,
 * and uptime monitors. Always responds with HTTP 200 unless the database check
 * itself throws, in which case it responds with HTTP 503.
 * Responses are cached for 10 seconds to limit database query frequency.
 */
module.exports = async function (fastify) {
  fastify.get('/health', async (request, reply) => {
    const now = Date.now()

    // Return cached response if still fresh
    if (_cachedResponse && now < _cacheExpiry) {
      return reply.code(_cachedResponse.statusCode).send(_cachedResponse.body)
    }

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

    const statusCode = dbOk ? 200 : 503
    _cachedResponse = { statusCode, body }
    _cacheExpiry = now + CACHE_TTL_MS

    return reply.code(statusCode).send(body)
  })
}
