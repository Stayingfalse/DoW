'use strict'

const { v4: uuidv4 } = require('uuid')
const db = require('../db/queries')
const statemachine = require('./statemachine')
const actions = require('./actions')
const crisis = require('./crisis')
const crossroads = require('./crossroads')

const locationsData = require('../data/locations.json')
const itemsData = require('../data/items.json')
const charactersData = require('../data/characters.json')
const crisisDataAll = require('../data/crisis.json')
const crossroadsDataAll = require('../data/crossroads.json')
const objectivesData = require('../data/objectives.json')
const scenariosData = require('../data/scenarios.json')

const WS_OPEN = 1 // WebSocket.OPEN

// In-memory game state cache: gameId -> state
const games = new Map()

// ─── Game Initialization ──────────────────────────────────────────────────────

/**
 * Build a shuffled search deck for a location based on its item categories.
 * Creates 3 copies of each matching item to form a reasonable-sized deck.
 */
function buildSearchDeck (categories) {
  const matching = itemsData.filter(item => categories.includes(item.type))
  const deck = []
  for (const item of matching) {
    deck.push(item.id, item.id, item.id)
  }
  return shuffle(deck)
}

/**
 * Roll N action dice (values 1–6).
 */
function rollActionDice (count) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1)
}

/**
 * Populate game state from JSON data files when a game starts.
 * Mutates state in place.
 */
function initGameState (state) {
  const scenario = scenariosData.find(s => s.id === state.scenarioId) || scenariosData[0]

  // ── Locations ────────────────────────────────────────────────────────────────
  state.locations = {}
  for (const loc of locationsData) {
    state.locations[loc.id] = {
      zombie_count: loc.startingZombies || 0,
      barricade_count: loc.startingBarricades || 0,
      search_deck: buildSearchDeck(loc.searchCategories || []),
      survivor_ids: []
    }
  }

  // ── Colony food supply ───────────────────────────────────────────────────────
  state.food = (state.players.length || 1) + 1

  // ── Character assignment (2 per player) ──────────────────────────────────────
  const charPool = shuffle([...charactersData])
  for (const player of state.players) {
    const chars = charPool.splice(0, 2)
    player.survivorIds = chars.map(c => c.id)
    player.characters = chars.map(c => c.id)
    player.zombiesKilled = 0
    // Place each survivor at their designated start location
    for (const char of chars) {
      if (char.startLocation && state.locations[char.startLocation]) {
        state.locations[char.startLocation].survivor_ids.push(char.id)
      }
    }
  }

  // ── Secret objectives ────────────────────────────────────────────────────────
  const betrayerIdx = Math.floor(Math.random() * state.players.length)
  const betrayerObj = objectivesData.find(o => o.type === 'betrayer')
  const survivorObjs = shuffle(objectivesData.filter(o => o.type === 'survivor'))

  for (let i = 0; i < state.players.length; i++) {
    if (i === betrayerIdx) {
      state.players[i].secretObjective = betrayerObj
      state.players[i].isBetrayer = true
    } else {
      state.players[i].secretObjective = survivorObjs.shift() || null
      state.players[i].isBetrayer = false
    }
  }

  // ── Crossroads cards ─────────────────────────────────────────────────────────
  const crossroadsDeck = shuffle([...crossroadsDataAll])
  for (const player of state.players) {
    player.crossroadsCard = crossroadsDeck.shift() || null
  }
  crossroads.dealCards(state.id, state.players)

  // ── First crisis card ────────────────────────────────────────────────────────
  state.crisisDeck = shuffle([...crisisDataAll])
  state.currentCrisis = state.crisisDeck.shift() || null

  // ── Action dice for first player ─────────────────────────────────────────────
  state.actionDice = rollActionDice(4)
  state.usedDice = []
  state.scenarioRounds = scenario.rounds || 10
  state.morale = scenario.startingMorale || 5

  return state
}

/**
 * Draw the next crisis card into state.currentCrisis.
 * Re-shuffles the full deck if exhausted.
 */
function drawNextCrisis (state) {
  if (!state.crisisDeck || state.crisisDeck.length === 0) {
    state.crisisDeck = shuffle([...crisisDataAll])
  }
  state.currentCrisis = state.crisisDeck.shift() || null
}

/**
 * Spawn zombies at the end of a cleanup phase.
 * Default: 1 zombie added to 2 random non-colony locations.
 */
function spawnRoundZombies (state) {
  const locIds = Object.keys(state.locations).filter(id => id !== 'colony')
  if (!locIds.length) return
  for (let i = 0; i < 2; i++) {
    const locId = locIds[Math.floor(Math.random() * locIds.length)]
    state.locations[locId].zombie_count = (state.locations[locId].zombie_count || 0) + 1
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

function createGame (scenarioId) {
  const id = uuidv4()
  const state = {
    id,
    scenarioId,
    phase: 'setup',
    round: 1,
    morale: 5,
    food: 0,
    players: [],
    locations: {},
    activePlayerId: null,
    actionDice: [],
    usedDice: [],
    currentCrisis: null,
    crisisDeck: [],
    scenarioRounds: 10
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

// ─── Broadcast helpers ────────────────────────────────────────────────────────

function broadcastState (gameId, presence) {
  const state = getGame(gameId)
  if (!state) return
  const msg = JSON.stringify({ type: 'GAME_STATE', payload: publicState(state) })
  for (const [, sock] of presence.entries()) {
    if (sock.readyState === WS_OPEN) sock.send(msg)
  }
}

/**
 * Send each player their private state (hand, secret objective, crossroads card).
 * Only the holding player receives this unicast message.
 */
function broadcastPrivateState (gameId, presence) {
  const state = getGame(gameId)
  if (!state) return
  for (const player of state.players) {
    const sock = presence.get(player.id)
    if (!sock || sock.readyState !== WS_OPEN) continue
    sock.send(JSON.stringify({
      type: 'PRIVATE_STATE',
      payload: {
        hand: player.hand || [],
        secretObjective: player.secretObjective || null,
        isBetrayer: player.isBetrayer || false,
        survivorIds: player.survivorIds || [],
        crossroadsCard: player.crossroadsCard || null
      }
    }))
  }
}

function publicState (state) {
  return {
    id: state.id,
    scenarioId: state.scenarioId,
    phase: state.phase,
    round: state.round,
    morale: state.morale,
    food: state.food || 0,
    scenarioRounds: state.scenarioRounds || 10,
    currentCrisis: state.currentCrisis
      ? {
          id: state.currentCrisis.id,
          name: state.currentCrisis.name,
          description: state.currentCrisis.description,
          contributionType: state.currentCrisis.contributionType,
          threshold: state.currentCrisis.threshold
        }
      : null,
    players: (state.players || []).map(p => ({
      id: p.id,
      displayName: p.displayName,
      turnOrder: p.turnOrder,
      survivorIds: p.survivorIds,
      handSize: (p.hand || []).length,
      isExiled: p.isExiled,
      zombiesKilled: p.zombiesKilled || 0
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
  db.assignPlayerToGame(playerId, state.id, 0)
  request.session.gameId = state.id
  state.players = [{
    id: playerId,
    displayName: request.session.displayName,
    turnOrder: 0,
    survivorIds: [],
    hand: [],
    secretObjective: null,
    isBetrayer: false,
    isExiled: false,
    zombiesKilled: 0
  }]
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
  state.players.push({
    id: playerId,
    displayName: request.session.displayName,
    turnOrder,
    survivorIds: [],
    hand: [],
    secretObjective: null,
    isBetrayer: false,
    isExiled: false,
    zombiesKilled: 0
  })
  saveGame(gameId)
  broadcastState(gameId, presence)
}

function handleStartGame (socket, request, payload, presence) {
  const gameId = request.session.gameId
  const state = getGame(gameId)
  if (!state || state.phase !== 'setup') {
    return socket.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Cannot start game' } }))
  }
  if (state.players.length === 0) {
    return socket.send(JSON.stringify({ type: 'ERROR', payload: { message: 'No players in game' } }))
  }

  initGameState(state)
  statemachine.transition(state, 'START')
  state.activePlayerId = state.players[0] && state.players[0].id

  saveGame(gameId)
  broadcastState(gameId, presence)
  broadcastPhaseChange(gameId, state, presence)
  broadcastPrivateState(gameId, presence)
}

function handlePlayerAction (socket, request, type, payload, presence) {
  const gameId = request.session.gameId
  const playerId = request.session.playerId
  const state = getGame(gameId)
  if (!state) return

  if (!state.actionDice || state.actionDice.length === 0) {
    return socket.send(JSON.stringify({ type: 'ERROR', payload: { message: 'No action dice remaining — end your turn' } }))
  }

  const result = actions.applyAction(state, playerId, type, payload)
  if (!result.success) {
    return socket.send(JSON.stringify({ type: 'ERROR', payload: { message: result.error } }))
  }
  Object.assign(state, result.newState)

  // Consume one action die
  const usedDie = state.actionDice.shift()
  state.usedDice = [...(state.usedDice || []), usedDie]

  // Track zombie kills for objective progress
  if (type === 'ACTION_ATTACK') {
    const killEffect = (result.effects || []).find(e => e.type === 'KILL_ZOMBIE')
    if (killEffect && killEffect.count > 0) {
      const player = state.players.find(p => p.id === playerId)
      if (player) player.zombiesKilled = (player.zombiesKilled || 0) + killEffect.count
    }
  }

  saveGame(gameId)
  db.insertEvent({ gameId, round: state.round, playerId, type, payload })
  broadcastState(gameId, presence)
  broadcastToAll(gameId, presence, {
    type: 'ACTION_RESULT',
    payload: { success: true, effects: result.effects, narration: result.narration }
  })

  // Unicast updated private state to the acting player
  const actingPlayer = state.players.find(p => p.id === playerId)
  const actingSock = presence.get(playerId)
  if (actingPlayer && actingSock && actingSock.readyState === WS_OPEN) {
    actingSock.send(JSON.stringify({
      type: 'PRIVATE_STATE',
      payload: {
        hand: actingPlayer.hand || [],
        secretObjective: actingPlayer.secretObjective || null,
        isBetrayer: actingPlayer.isBetrayer || false,
        survivorIds: actingPlayer.survivorIds || [],
        crossroadsCard: actingPlayer.crossroadsCard || null
      }
    }))
  }

  crossroads.evaluateTriggers(state, { type, payload, playerId }, presence)
}

function handleCrisisContrib (socket, request, payload, presence) {
  const gameId = request.session.gameId
  const playerId = request.session.playerId
  const state = getGame(gameId)
  if (!state) return

  // Remove contributed cards from player's hand
  const player = state.players.find(p => p.id === playerId)
  const cards = payload.cards || []
  if (player) {
    for (const cardId of cards) {
      const idx = player.hand.indexOf(cardId)
      if (idx !== -1) player.hand.splice(idx, 1)
    }
  }

  const currentCrisis = state.currentCrisis
  const playerCount = state.players.filter(p => !p.isExiled).length

  crisis.addContribution(gameId, playerId, cards, playerCount, currentCrisis, (result) => {
    broadcastToAll(gameId, presence, { type: 'CRISIS_REVEAL', payload: result })

    if (result.pass) {
      if (result.moraleBonus > 0) state.morale = Math.min(10, state.morale + result.moraleBonus)
      if (result.food) state.food = (state.food || 0) + result.food
    } else {
      state.morale = Math.max(0, state.morale - (result.moralePenalty || 1))
      if (result.colonyZombies && state.locations.colony) {
        state.locations.colony.zombie_count = (state.locations.colony.zombie_count || 0) + result.colonyZombies
      }
    }

    saveGame(gameId)
    broadcastState(gameId, presence)

    const outcome = statemachine.checkOutcome(state)
    if (outcome) {
      broadcastToAll(gameId, presence, { type: 'GAME_OVER', payload: outcome })
    }
  })
}

function handleEndTurn (socket, request, payload, presence) {
  const gameId = request.session.gameId
  const state = getGame(gameId)
  if (!state) return

  const prevPhase = state.phase
  statemachine.advanceTurn(state)
  const newPhase = state.phase

  if (prevPhase === 'action' && newPhase === 'action') {
    // Next player within action phase — roll fresh dice
    state.actionDice = rollActionDice(4)
    state.usedDice = []
  } else if (prevPhase === 'crisis' && newPhase === 'colony') {
    // Colony phase: food consumption + zombie movement
    statemachine.runColonyPhase(state)
  } else if (prevPhase === 'cleanup' && newPhase === 'action') {
    // New round — spawn zombies, draw next crisis, fresh dice
    spawnRoundZombies(state)
    drawNextCrisis(state)
    state.actionDice = rollActionDice(4)
    state.usedDice = []
  } else if (prevPhase === 'colony' && newPhase === 'cleanup') {
    // Nothing extra — cleanup phase logic runs when leaving cleanup
  }

  saveGame(gameId)
  broadcastState(gameId, presence)
  broadcastPhaseChange(gameId, state, presence)
  broadcastPrivateState(gameId, presence)

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

// ─── Utilities ────────────────────────────────────────────────────────────────

function shuffle (arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

module.exports = {
  createGame,
  getGame,
  saveGame,
  broadcastState,
  broadcastPrivateState,
  handleCreateGame,
  handleJoinGame,
  handleStartGame,
  handlePlayerAction,
  handleCrisisContrib,
  handleEndTurn,
  handleExileVote,
  handleCrossroadsChoice
}
