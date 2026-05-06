'use strict'

const itemsData = require('../data/items.json')

// Per-game escrow: Map<gameId, Map<playerId, string[]>>
const escrow = new Map()
// Per-game timers
const timers = new Map()

const CRISIS_TIMEOUT_MS = 60000

/**
 * Add a player's card contribution to the escrow.
 * Reveals when all active players have contributed or the 60-second timer expires.
 *
 * @param {string}   gameId
 * @param {string}   playerId
 * @param {string[]} cards          - item IDs the player is contributing
 * @param {number}   playerCount    - number of non-exiled players
 * @param {object}   currentCrisis  - crisis card object from crisis.json
 * @param {Function} onReveal       - called with the reveal result
 */
function addContribution (gameId, playerId, cards, playerCount, currentCrisis, onReveal) {
  if (!escrow.has(gameId)) escrow.set(gameId, new Map())
  escrow.get(gameId).set(playerId, cards)

  const contributed = escrow.get(gameId).size

  // Auto-reveal when all players have submitted
  if (contributed >= playerCount) {
    reveal(gameId, currentCrisis, onReveal)
    return
  }

  // Otherwise start the countdown on the first contribution
  if (!timers.has(gameId)) {
    const timer = setTimeout(() => {
      reveal(gameId, currentCrisis, onReveal)
    }, CRISIS_TIMEOUT_MS)
    timers.set(gameId, timer)
  }
}

/**
 * Evaluate contributions against the crisis card and compute pass/fail.
 */
function reveal (gameId, currentCrisis, onReveal) {
  clearTimer(gameId)

  const contributions = {}
  const gameEscrow = escrow.get(gameId) || new Map()
  for (const [pid, cards] of gameEscrow.entries()) {
    contributions[pid] = cards
  }
  escrow.delete(gameId)

  if (!currentCrisis) {
    // No active crisis — auto-pass
    onReveal({ contributions, pass: true, moraleBonus: 0, moralePenalty: 0 })
    return
  }

  // Count qualifying contributions
  const allCards = Object.values(contributions).flat()
  let qualifyingCount = 0

  if (currentCrisis.contributionType === 'any') {
    qualifyingCount = allCards.length
  } else {
    // Each contributed card matches if its item type equals the crisis's contributionType
    for (const cardId of allCards) {
      const item = itemsData.find(i => i.id === cardId)
      if (item && item.type === currentCrisis.contributionType) {
        qualifyingCount++
      }
    }
  }

  const pass = qualifyingCount >= (currentCrisis.threshold || 0)
  const effect = pass ? (currentCrisis.passEffect || {}) : (currentCrisis.failEffect || {})

  onReveal({
    contributions,
    pass,
    crisisId: currentCrisis.id,
    crisisName: currentCrisis.name,
    qualifyingCount,
    threshold: currentCrisis.threshold,
    moraleBonus: pass ? (effect.moraleDelta > 0 ? effect.moraleDelta : 0) : 0,
    moralePenalty: !pass ? (effect.moraleDelta < 0 ? Math.abs(effect.moraleDelta) : 1) : 0,
    food: effect.food || 0,
    colonyZombies: effect.colonyZombies || 0,
    effectDescription: effect.description || ''
  })
}

function clearTimer (gameId) {
  if (timers.has(gameId)) {
    clearTimeout(timers.get(gameId))
    timers.delete(gameId)
  }
}

function forceReveal (gameId, currentCrisis, onReveal) {
  reveal(gameId, currentCrisis, onReveal)
}

module.exports = { addContribution, forceReveal, clearTimer }
