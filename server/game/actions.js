'use strict'

/**
 * Validates and applies a player action to the game state.
 * Returns { success, newState, effects, narration } or { success: false, error }
 */
function applyAction (state, playerId, type, payload) {
  // Phase guard
  if (state.phase !== 'action') {
    return { success: false, error: 'Not the action phase' }
  }

  // Turn guard
  if (state.activePlayerId !== playerId) {
    return { success: false, error: 'Not your turn' }
  }

  const newState = deepClone(state)

  switch (type) {
    case 'ACTION_MOVE':
      return applyMove(newState, playerId, payload)
    case 'ACTION_ATTACK':
      return applyAttack(newState, playerId, payload)
    case 'ACTION_SEARCH':
      return applySearch(newState, playerId, payload)
    case 'ACTION_ITEM':
      return applyItem(newState, playerId, payload)
    case 'ACTION_BARRICADE':
      return applyBarricade(newState, playerId, payload)
    case 'ACTION_CLEAN':
      return applyClean(newState, playerId, payload)
    default:
      return { success: false, error: `Unknown action type: ${type}` }
  }
}

function applyMove (state, playerId, payload) {
  const { survivorId, toLocationId } = payload || {}
  if (!survivorId || !toLocationId) {
    return { success: false, error: 'survivorId and toLocationId required' }
  }
  const loc = state.locations[toLocationId]
  if (!loc) {
    return { success: false, error: `Unknown location: ${toLocationId}` }
  }
  // Move survivor in state
  for (const locId of Object.keys(state.locations)) {
    const l = state.locations[locId]
    l.survivorIds = (l.survivorIds || []).filter(id => id !== survivorId)
  }
  loc.survivorIds = [...(loc.survivorIds || []), survivorId]

  return {
    success: true,
    newState: state,
    effects: [{ type: 'MOVE', survivorId, toLocationId }],
    narration: `Survivor moved to ${toLocationId}.`
  }
}

function applyAttack (state, playerId, payload) {
  const { survivorId, locationId } = payload || {}
  const loc = state.locations[locationId]
  if (!loc) return { success: false, error: 'Invalid location' }

  const killed = Math.min(1, loc.zombieCount || 0)
  loc.zombieCount = (loc.zombieCount || 0) - killed

  return {
    success: true,
    newState: state,
    effects: [{ type: 'KILL_ZOMBIE', locationId, count: killed }],
    narration: killed ? `Zombie killed at ${locationId}.` : 'No zombies to attack.'
  }
}

function applySearch (state, playerId, payload) {
  const { survivorId, locationId } = payload || {}
  const loc = state.locations[locationId]
  if (!loc) return { success: false, error: 'Invalid location' }

  const player = state.players.find(p => p.id === playerId)
  if (!player) return { success: false, error: 'Player not found' }

  const item = (loc.searchDeck || []).shift()
  if (item) {
    player.hand = [...(player.hand || []), item]
  }

  return {
    success: true,
    newState: state,
    effects: item ? [{ type: 'ITEM_FOUND', item }] : [{ type: 'SEARCH_EMPTY' }],
    narration: item ? `Found ${item}.` : 'Search turned up nothing.'
  }
}

function applyItem (state, playerId, payload) {
  const { itemId, targetId } = payload || {}
  const player = state.players.find(p => p.id === playerId)
  if (!player) return { success: false, error: 'Player not found' }

  player.hand = (player.hand || []).filter(i => i !== itemId)

  return {
    success: true,
    newState: state,
    effects: [{ type: 'ITEM_USED', itemId, targetId }],
    narration: `Used item ${itemId}.`
  }
}

function applyBarricade (state, playerId, payload) {
  const { survivorId } = payload || {}
  const player = state.players.find(p => p.id === playerId)
  if (!player) return { success: false, error: 'Player not found' }

  // Find survivor's location
  let locId = null
  for (const [id, loc] of Object.entries(state.locations)) {
    if ((loc.survivorIds || []).includes(survivorId)) { locId = id; break }
  }
  if (!locId) return { success: false, error: 'Survivor location not found' }

  state.locations[locId].barricadeCount = (state.locations[locId].barricadeCount || 0) + 1

  return {
    success: true,
    newState: state,
    effects: [{ type: 'BARRICADE_ADDED', locationId: locId }],
    narration: `Barricade added at ${locId}.`
  }
}

function applyClean (state, playerId, payload) {
  const { survivorId } = payload || {}
  // Wound clean — placeholder
  return {
    success: true,
    newState: state,
    effects: [{ type: 'WOUND_CLEANED', survivorId }],
    narration: 'Wound cleaned.'
  }
}

function applyExile (state, playerId, targetSurvivorId) {
  // Exile logic placeholder
  const player = state.players.find(p => (p.survivorIds || []).includes(targetSurvivorId))
  if (player) player.isExiled = true
  return { success: true }
}

function deepClone (obj) {
  return structuredClone(obj)
}

module.exports = { applyAction, applyExile }
