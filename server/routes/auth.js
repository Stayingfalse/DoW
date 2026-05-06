'use strict'

const { v4: uuidv4 } = require('uuid')
const crypto = require('crypto')
const db = require('../db/queries')

module.exports = async function (fastify) {
  // POST /auth/join
  fastify.post('/join', {
    schema: {
      body: {
        type: 'object',
        required: ['displayName', 'password'],
        properties: {
          displayName: { type: 'string', minLength: 1, maxLength: 32 },
          password: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { displayName, password } = request.body

    // Constant-time comparison to prevent timing attacks
    const expected = process.env.LOBBY_PASSWORD || ''
    const match = expected.length > 0 &&
      password.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expected))

    if (!match) {
      return reply.code(401).send({ error: 'Invalid password' })
    }

    const playerId = uuidv4()
    db.insertPlayer({
      id: playerId,
      gameId: null,
      displayName,
      createdAt: Date.now()
    })

    request.session.playerId = playerId
    request.session.displayName = displayName
    request.session.gameId = null
    request.session.isAuthenticated = true

    return reply.send({ playerId, displayName })
  })

  // POST /auth/leave
  fastify.post('/leave', async (request, reply) => {
    await request.session.destroy()
    return reply.send({ ok: true })
  })
}
