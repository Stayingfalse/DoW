'use strict'

const WS_OPEN = 1 // WebSocket.OPEN
const PROTOCOL_VERSION = 1
const MAX_PAYLOAD_BYTES = 4096 // max allowed WS message payload size

// In-memory presence map: playerId -> WebSocket
const presence = new Map()

const ratelimit = require('../game/ratelimit')
const engine = require('../game/engine')

module.exports = async function (fastify) {
  fastify.get('/', { websocket: true }, (socket, request) => {
    // Guard: require authenticated session
    if (!request.session || !request.session.isAuthenticated) {
      socket.close(4001, 'Unauthorized')
      return
    }

    const playerId = request.session.playerId
    const displayName = request.session.displayName

    // Replace any stale socket in presence (handles reconnects for the same player)
    presence.set(playerId, socket)
    fastify.log.info({ playerId, displayName }, 'WS connected')

    // ── Reconnect / resume ──────────────────────────────────────────────────
    // If the player already has an active game, immediately send current state.
    const resumeGameId = request.session.gameId
    if (resumeGameId) {
      const resumeState = engine.getGame(resumeGameId)
      const isInGame = resumeState &&
        (resumeState.players || []).some(p => p.id === playerId)

      if (resumeState && isInGame) {
        // Send full public + private state so client is fully up-to-date
        engine.broadcastStateTo(resumeGameId, [socket])
        engine.broadcastPrivateStateTo(resumeGameId, playerId, socket)
        fastify.log.info({ playerId, resumeGameId }, 'WS resumed game state')
      }
    }

    // Broadcast updated presence to others
    for (const [pid, sock] of presence.entries()) {
      if (pid !== playerId && sock.readyState === WS_OPEN) {
        sock.send(JSON.stringify({
          type: 'PLAYER_JOINED',
          payload: { playerId, displayName, playerCount: presence.size }
        }))
      }
    }

    socket.on('message', (raw) => {
      // Rate limiting — first pass: general burst window (type-agnostic)
      const rl = ratelimit.check(playerId, ratelimit.GENERIC_TYPE)
      if (rl.limited) {
        socket.send(JSON.stringify({ type: 'ERROR', payload: { message: rl.reason, code: 'RATE_LIMITED' } }))
        return
      }

      let msg
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        socket.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid JSON' } }))
        return
      }

      // Per-type rate check (action cooldown)
      const rlTyped = ratelimit.check(playerId, msg.type)
      if (rlTyped.limited) {
        socket.send(JSON.stringify({ type: 'ERROR', payload: { message: rlTyped.reason, code: 'RATE_LIMITED' } }))
        return
      }

      handleMessage(fastify, socket, request, msg)
    })

    socket.on('close', () => {
      // Only remove from presence if this is still the current socket
      if (presence.get(playerId) === socket) {
        presence.delete(playerId)
        ratelimit.remove(playerId)
        fastify.log.info({ playerId }, 'WS disconnected')
        broadcastToAll({
          type: 'PLAYER_LEFT',
          payload: { playerId }
        })
      }
    })

    socket.on('error', (err) => {
      fastify.log.error({ playerId, err }, 'WS error')
    })
  })
}

function handleMessage (fastify, socket, request, msg) {
  const { type, payload } = msg

  // Reject oversized payloads
  const rawSize = JSON.stringify(payload).length
  if (rawSize > MAX_PAYLOAD_BYTES) {
    socket.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' } }))
    return
  }

  fastify.log.debug({ type, payloadSize: rawSize }, 'WS message received')

  // ── Protocol handshake ──────────────────────────────────────────────────────
  if (type === 'HELLO') {
    const clientVersion = (payload && typeof payload.version === 'number') ? payload.version : 0
    if (clientVersion !== PROTOCOL_VERSION) {
      socket.send(JSON.stringify({
        type: 'VERSION_MISMATCH',
        payload: { serverVersion: PROTOCOL_VERSION, clientVersion, message: 'Reload the page to get the latest client.' }
      }))
      return
    }
    socket.send(JSON.stringify({
      type: 'HELLO_ACK',
      payload: { version: PROTOCOL_VERSION }
    }))
    return
  }

  // ── Game message routing ────────────────────────────────────────────────────
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
      fastify.log.warn({ type }, 'Unknown WS message type')
      socket.send(JSON.stringify({ type: 'ERROR', payload: { message: `Unknown type: ${type}`, code: 'UNKNOWN_TYPE' } }))
  }
}

function broadcastToAll (msg) {
  const data = JSON.stringify(msg)
  for (const sock of presence.values()) {
    if (sock.readyState === WS_OPEN) sock.send(data)
  }
}

module.exports.presence = presence
