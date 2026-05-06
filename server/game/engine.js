'use strict'

const { v4: uuidv4 } = require('uuid')
const db = require('../db/queries')
const statemachine = require('./statemachine')
const actions = require('./actions')
const crisis = require('./crisis')
const crossroads = require('./crossroads')
const { scheduleBotTurn } = require('./bot-hooks')

const WS_OPEN = 1 // WebSocket.OPEN

// In-memory game state cache: gameId -> state
const games = new Map()

function createGame (scenarioId) {
  const id = uuidv4()
  const state = {
    id,
    scenarioId,
    phase: 'setup',
    round: 1,
    morale: 5,
    players: [],
    locations: {},
    activePlayerId: null,
    actionDice: [],
    usedDice: []
  }
  games.set(id, state)
  db.insertGame({ id, scenarioId, state })
  return state
}

function getGame (gameId) {
  if (games.has(gameId)) return games.get(gameId)
  const row = db.getGame(gameId)
  if (!row) return null
  const state = { ...row.state, id: row.id, phase: row.phase, round: row.round, morale: row.morale }
  games.set(gameId, state)
  return state
}

function saveGame (gameId) {
  const state = games.get(gameId)
  if (!state) return
  db.updateGame(gameId, {
    phase: state.phase,
    round: state.round,
    morale: state.morale,
    state: state
  })
}

function broadcastState (gameId, presence) {
  const state = getGame(gameId)
  if (!state) return
  const msg = JSON.stringify({ type: 'GAME_STATE', payload: publicState(state) })
  for (const [playerId, sock] of presence.entries()) {
    if (sock.readyState === WS_OPEN) sock.send(msg)
  }
}

function publicState (state) {
  return {
    id: state.id,
    scenarioId: state.scenarioId,
    phase: state.phase,
    round: state.round,
    morale: state.morale,
    players: (state.players || []).map(p => ({
      id: p.id,
      displayName: p.displayName,
      turnOrder: p.turnOrder,
      survivorIds: p.survivorIds,
      handSize: (p.hand || []).length,
      isExiled: p.isExiled
    })),
    locations: state.locations,
    activePlayerId: state.activePlayerId,
    actionDice: state.actionDice,
    usedDice: state.usedDice
  }
}

// ─── WS Message Handlers ──────────────────────────────────────────────────────

function handleCreateGame (socket, request, payload, presence) {
  const { scenario } = payload || {}
  if (!scenario) {
    return socket.send(JSON.stringify({ type: 'ERROR', payload: { message: 'scenario required' } }))
  }
  const state = createGame(scenario)
  const playerId = request.session.playerId
  // Assign creator to game
  db.assignPlayerToGame(playerId, state.id, 0)
  request.session.gameId = state.id
  state.players = [{ id: playerId, displayName: request.session.displayName, turnOrder: 0, survivorIds: [], hand: [], isExiled: false }]
  saveGame(state.id)
  broadcastState(state.id, presence)
}

function handleJoinGame (socket, request, payload, presence) {
  const { gameId } = payload || {}
  const state = getGame(gameId)
  if (!state) {
    return socket.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Game not found' } }))
  }
  if (state.phase !== 'setup') {
    return socket.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Game already started' } }))
  }
  const playerId = request.session.playerId
  const turnOrder = state.players.length
  db.assignPlayerToGame(playerId, gameId, turnOrder)
  request.session.gameId = gameId
  state.players.push({ id: playerId, displayName: request.session.displayName, turnOrder, survivorIds: [], hand: [], isExiled: false })
  saveGame(gameId)
  broadcastState(gameId, presence)
}

function handleStartGame (socket, request, payload, presence) {
  const gameId = request.session.gameId
  const state = getGame(gameId)
  if (!state || state.phase !== 'setup') {
    return socket.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Cannot start game' } }))
  }
  statemachine.transition(state, 'START')
  saveGame(gameId)
  broadcastState(gameId, presence)
  broadcastPhaseChange(gameId, state, presence)
}

function handlePlayerAction (socket, request, type, payload, presence) {
  const gameId = request.session.gameId
  const playerId = request.session.playerId
  const state = getGame(gameId)
  if (!state) return

  const result = actions.applyAction(state, playerId, type, payload)
  if (!result.success) {
    return socket.send(JSON.stringify({ type: 'ERROR', payload: { message: result.error } }))
  }
  Object.assign(state, result.newState)
  saveGame(gameId)
  db.insertEvent({ gameId, round: state.round, playerId, type, payload })
  broadcastState(gameId, presence)
  broadcastToAll(gameId, presence, {
    type: 'ACTION_RESULT',
    payload: { success: true, effects: result.effects, narration: result.narration }
  })
  // Check crossroads triggers
  crossroads.evaluateTriggers(state, { type, payload, playerId }, presence)
}

function handleCrisisContrib (socket, request, payload, presence) {
  const gameId = request.session.gameId
  const playerId = request.session.playerId
  crisis.addContribution(gameId, playerId, payload.cards || [], (result) => {
    broadcastToAll(gameId, presence, { type: 'CRISIS_REVEAL', payload: result })
    const state = getGame(gameId)
    if (result.pass) {
      state.morale = Math.max(0, state.morale + (result.moraleBonus || 0))
    } else {
      state.morale = Math.max(0, state.morale - (result.moralePenalty || 1))
    }
    saveGame(gameId)
    broadcastState(gameId, presence)
  })
}

function handleEndTurn (socket, request, payload, presence) {
  const gameId = request.session.gameId
  const state = getGame(gameId)
  if (!state) return
  statemachine.advanceTurn(state)
  saveGame(gameId)
  broadcastState(gameId, presence)
  broadcastPhaseChange(gameId, state, presence)
  // Check win/loss
  const outcome = statemachine.checkOutcome(state)
  if (outcome) {
    broadcastToAll(gameId, presence, { type: 'GAME_OVER', payload: outcome })
  }
}

function handleExileVote (socket, request, payload, presence) {
  const gameId = request.session.gameId
  const state = getGame(gameId)
  if (!state) return
  const { targetSurvivorId } = payload || {}
  const result = actions.applyExile(state, request.session.playerId, targetSurvivorId)
  if (result.success) {
    saveGame(gameId)
    broadcastState(gameId, presence)
  }
}

function handleCrossroadsChoice (socket, request, payload, presence) {
  const gameId = request.session.gameId
  const state = getGame(gameId)
  if (!state) return
  const result = crossroads.applyChoice(state, payload.crossroadsId, payload.choice)
  if (result.success) {
    Object.assign(state, result.newState)
    saveGame(gameId)
    broadcastState(gameId, presence)
  }
}

// ─── Broadcast Helpers ────────────────────────────────────────────────────────

function broadcastToAll (gameId, presence, msg) {
  const data = JSON.stringify(msg)
  for (const sock of presence.values()) {
    if (sock.readyState === WS_OPEN) sock.send(data)
  }
}

function broadcastPhaseChange (gameId, state, presence) {
  broadcastToAll(gameId, presence, {
    type: 'PHASE_CHANGE',
    payload: { phase: state.phase, round: state.round }
  })
}

module.exports = {
  createGame,
  getGame,
  saveGame,
  broadcastState,
  handleCreateGame,
  handleJoinGame,
  handleStartGame,
  handlePlayerAction,
  handleCrisisContrib,
  handleEndTurn,
  handleExileVote,
  handleCrossroadsChoice
}
