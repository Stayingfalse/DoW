'use strict'

const WS_OPEN = 1 // WebSocket.OPEN

// In-memory presence map: playerId -> WebSocket
const presence = new Map()

module.exports = async function (fastify) {
  fastify.get('/', { websocket: true }, (socket, request) => {
    // Guard: require authenticated session
    if (!request.session || !request.session.isAuthenticated) {
      socket.close(4001, 'Unauthorized')
      return
    }

    const playerId = request.session.playerId
    const displayName = request.session.displayName

    presence.set(playerId, socket)
    fastify.log.info({ playerId, displayName }, 'WS connected')

    // Broadcast updated presence
    broadcast({
      type: 'PLAYER_JOINED',
      payload: { playerId, displayName, playerCount: presence.size }
    }, socket)

    socket.on('message', (raw) => {
      let msg
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        socket.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid JSON' } }))
        return
      }

      handleMessage(fastify, socket, request, msg)
    })

    socket.on('close', () => {
      presence.delete(playerId)
      fastify.log.info({ playerId }, 'WS disconnected')
      broadcast({
        type: 'PLAYER_LEFT',
        payload: { playerId }
      })
    })

    socket.on('error', (err) => {
      fastify.log.error({ playerId, err }, 'WS error')
    })
  })
}

function handleMessage (fastify, socket, request, msg) {
  const { type, payload } = msg
  fastify.log.debug({ type, payload }, 'WS message received')

  // Game message routing — wired in Phase 3+
  const engine = require('../game/engine')

  switch (type) {
    case 'CREATE_GAME':
      engine.handleCreateGame(socket, request, payload, presence)
      break
    case 'JOIN_GAME':
      engine.handleJoinGame(socket, request, payload, presence)
      break
    case 'START_GAME':
      engine.handleStartGame(socket, request, payload, presence)
      break
    case 'ACTION_MOVE':
    case 'ACTION_ATTACK':
    case 'ACTION_SEARCH':
    case 'ACTION_ITEM':
    case 'ACTION_BARRICADE':
    case 'ACTION_CLEAN':
      engine.handlePlayerAction(socket, request, type, payload, presence)
      break
    case 'CRISIS_CONTRIB':
      engine.handleCrisisContrib(socket, request, payload, presence)
      break
    case 'END_TURN':
      engine.handleEndTurn(socket, request, payload, presence)
      break
    case 'EXILE_VOTE':
      engine.handleExileVote(socket, request, payload, presence)
      break
    case 'CROSSROADS_CHOICE':
      engine.handleCrossroadsChoice(socket, request, payload, presence)
      break
    default:
      socket.send(JSON.stringify({ type: 'ERROR', payload: { message: `Unknown type: ${type}` } }))
  }
}

function broadcast (msg, excludeSocket) {
  const data = JSON.stringify(msg)
  for (const sock of presence.values()) {
    if (sock !== excludeSocket && sock.readyState === WS_OPEN) {
      sock.send(data)
    }
  }
}

module.exports.presence = presence
