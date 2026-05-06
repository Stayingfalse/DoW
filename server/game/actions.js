'use strict'

/**
 * Validates and applies a player action to the game state.
 * Returns { success, newState, effects, narration } or { success: false, error }
 *
 * Location fields use snake_case (zombie_count, barricade_count, search_deck,
 * survivor_ids) consistent with the SQLite schema and what the client reads.
 */
function applyAction (state, playerId, type, payload) {
  if (state.phase !== 'action') {
    return { success: false, error: 'Not the action phase' }
  }
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
  // Ownership already validated in engine before calling applyAction;
  // double-check here for defence-in-depth
  const player = state.players.find(p => p.id === playerId)
  if (!player || !(player.survivorIds || []).includes(survivorId)) {
    return { success: false, error: 'You do not control that survivor' }
  }

  // Remove survivor from their current location
  for (const locId of Object.keys(state.locations)) {
    const l = state.locations[locId]
    l.survivor_ids = (l.survivor_ids || []).filter(id => id !== survivorId)
  }
  loc.survivor_ids = [...(loc.survivor_ids || []), survivorId]

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
  const player = state.players.find(p => p.id === playerId)
  if (!player || !(player.survivorIds || []).includes(survivorId)) {
    return { success: false, error: 'You do not control that survivor' }
  }

  const killed = Math.min(1, loc.zombie_count || 0)
  loc.zombie_count = (loc.zombie_count || 0) - killed

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
  if (!(player.survivorIds || []).includes(survivorId)) {
    return { success: false, error: 'You do not control that survivor' }
  }

  const deck = loc.search_deck || []
  const item = deck.shift()
  loc.search_deck = deck
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
  if (typeof itemId !== 'string' || itemId.trim() === '') {
    return { success: false, error: 'itemId required' }
  }
  const player = state.players.find(p => p.id === playerId)
  if (!player) return { success: false, error: 'Player not found' }

  // Validate item is in hand
  const itemIdx = (player.hand || []).indexOf(itemId)
  if (itemIdx === -1) return { success: false, error: 'Item not in hand' }

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
  if (!(player.survivorIds || []).includes(survivorId)) {
    return { success: false, error: 'You do not control that survivor' }
  }

  // Find the survivor's current location
  let locId = null
  for (const [id, loc] of Object.entries(state.locations)) {
    if ((loc.survivor_ids || []).includes(survivorId)) { locId = id; break }
  }
  if (!locId) return { success: false, error: 'Survivor location not found' }

  state.locations[locId].barricade_count = (state.locations[locId].barricade_count || 0) + 1

  return {
    success: true,
    newState: state,
    effects: [{ type: 'BARRICADE_ADDED', locationId: locId }],
    narration: `Barricade added at ${locId}.`
  }
}

function applyClean (state, playerId, payload) {
  const { survivorId } = payload || {}
  const player = state.players.find(p => p.id === playerId)
  if (!player) return { success: false, error: 'Player not found' }
  if (!(player.survivorIds || []).includes(survivorId)) {
    return { success: false, error: 'You do not control that survivor' }
  }
  return {
    success: true,
    newState: state,
    effects: [{ type: 'WOUND_CLEANED', survivorId }],
    narration: 'Wound cleaned.'
  }
}

function applyExile (state, playerId, targetSurvivorId) {
  const player = state.players.find(p => (p.survivorIds || []).includes(targetSurvivorId))
  if (player) player.isExiled = true
  return { success: true }
}

function deepClone (obj) {
  return structuredClone(obj)
}

module.exports = { applyAction, applyExile }
