'use strict'

const { v4: uuidv4 } = require('uuid')
const db = require('../db/queries')

module.exports = async function (fastify) {
  // POST /auth/join
  fastify.post('/join', {
    schema: {
      body: {
        type: 'object',
        required: ['displayName'],
        properties: {
          displayName: { type: 'string', minLength: 1, maxLength: 32 }
        }
      }
    }
  }, async (request, reply) => {
    const { displayName } = request.body

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
