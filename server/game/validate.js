'use strict'

/**
 * Dead of Winter — Server-side input validators
 * Phase 5: All game handler inputs are sanitised here before reaching the engine.
 *
 * Every validator returns { ok: true } on success or { ok: false, error: string }.
 */

const VALID_LOCATION_IDS = new Set([
  'colony', 'gas_station', 'grocery_store', 'hospital',
  'police_station', 'school', 'library'
])

/** Maximum number of cards a player may contribute in a single crisis action. */
const MAX_CARDS_PER_CONTRIBUTION = 10

/**
 * Ensure `value` is a non-empty string of reasonable length.
 * @param {*} value
 * @param {string} fieldName
 * @param {number} [maxLen=64]
 */
function requireString (value, fieldName, maxLen = 64) {
  if (typeof value !== 'string' || value.trim() === '') {
    return { ok: false, error: `${fieldName} must be a non-empty string` }
  }
  if (value.length > maxLen) {
    return { ok: false, error: `${fieldName} too long (max ${maxLen} chars)` }
  }
  return { ok: true }
}

/**
 * Validate that a location ID is a known board location.
 * @param {*} locationId
 */
function requireValidLocation (locationId) {
  const str = requireString(locationId, 'locationId')
  if (!str.ok) return str
  if (!VALID_LOCATION_IDS.has(locationId)) {
    return { ok: false, error: `Unknown location: ${locationId}` }
  }
  return { ok: true }
}

/**
 * Validate that the acting player owns the given survivorId.
 * @param {object} state   Game state
 * @param {string} playerId
 * @param {string} survivorId
 */
function requireSurvivorOwnership (state, playerId, survivorId) {
  const str = requireString(survivorId, 'survivorId')
  if (!str.ok) return str
  const player = (state.players || []).find(p => p.id === playerId)
  if (!player) return { ok: false, error: 'Player not found in game' }
  if (!(player.survivorIds || []).includes(survivorId)) {
    return { ok: false, error: 'You do not control that survivor' }
  }
  return { ok: true }
}

/**
 * Validate that the player is not exiled.
 * @param {object} state
 * @param {string} playerId
 */
function requireNotExiled (state, playerId) {
  const player = (state.players || []).find(p => p.id === playerId)
  if (!player) return { ok: false, error: 'Player not found in game' }
  if (player.isExiled) return { ok: false, error: 'Exiled players cannot act' }
  return { ok: true }
}

/**
 * Validate that a list of card IDs are all present in the player's hand.
 * Deduplicates the list; partial contributions are rejected entirely.
 * @param {object} state
 * @param {string} playerId
 * @param {string[]} cardIds
 */
function requireCardsInHand (state, playerId, cardIds) {
  if (!Array.isArray(cardIds)) {
    return { ok: false, error: 'cards must be an array' }
  }
  if (cardIds.length > MAX_CARDS_PER_CONTRIBUTION) {
    return { ok: false, error: `Too many cards (max ${MAX_CARDS_PER_CONTRIBUTION})` }
  }
  const player = (state.players || []).find(p => p.id === playerId)
  if (!player) return { ok: false, error: 'Player not found in game' }

  const hand = [...(player.hand || [])]
  for (const cardId of cardIds) {
    const idx = hand.indexOf(cardId)
    if (idx === -1) {
      return { ok: false, error: `Card ${cardId} is not in your hand` }
    }
    // Remove from temp copy so duplicates are caught
    hand.splice(idx, 1)
  }
  return { ok: true }
}

/**
 * Validate that a survivor being targeted for exile exists in the game
 * and belongs to a different player (you can't exile your own survivors).
 * @param {object} state
 * @param {string} votingPlayerId
 * @param {string} targetSurvivorId
 */
function requireExileTarget (state, votingPlayerId, targetSurvivorId) {
  const str = requireString(targetSurvivorId, 'targetSurvivorId')
  if (!str.ok) return str

  const owner = (state.players || []).find(p =>
    (p.survivorIds || []).includes(targetSurvivorId)
  )
  if (!owner) {
    return { ok: false, error: 'Target survivor not found in this game' }
  }
  if (owner.id === votingPlayerId) {
    return { ok: false, error: 'You cannot exile your own survivors' }
  }
  return { ok: true }
}

/**
 * Validate that the player is currently in the given game.
 * @param {object} state
 * @param {string} playerId
 */
function requirePlayerInGame (state, playerId) {
  const player = (state.players || []).find(p => p.id === playerId)
  if (!player) return { ok: false, error: 'You are not in this game' }
  return { ok: true }
}

module.exports = {
  MAX_CARDS_PER_CONTRIBUTION,
  requireString,
  requireValidLocation,
  requireSurvivorOwnership,
  requireNotExiled,
  requireCardsInHand,
  requireExileTarget,
  requirePlayerInGame
}
