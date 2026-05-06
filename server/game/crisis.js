'use strict'

// Contributions held in escrow per game: Map<gameId, Map<playerId, cards[]>>
const escrow = new Map()
// Timers per game
const timers = new Map()
const CRISIS_TIMEOUT_MS = 60000

/**
 * Add a player's card contribution to the escrow.
 * Calls onReveal when all players have contributed or timer expires.
 */
function addContribution (gameId, playerId, cards, onReveal) {
  if (!escrow.has(gameId)) escrow.set(gameId, new Map())
  escrow.get(gameId).set(playerId, cards)

  // Check if we should reveal now (simplified — reveal when at least one contrib)
  // Full game: wait for all players; here: start 60s timer on first contribution
  if (!timers.has(gameId)) {
    const timer = setTimeout(() => {
      reveal(gameId, onReveal)
    }, CRISIS_TIMEOUT_MS)
    timers.set(gameId, timer)
  }
}

function reveal (gameId, onReveal) {
  clearTimer(gameId)
  const contributions = {}
  const gameEscrow = escrow.get(gameId) || new Map()
  for (const [pid, cards] of gameEscrow.entries()) {
    contributions[pid] = cards
  }
  escrow.delete(gameId)

  // Count food contributions (simplified pass condition)
  const totalFood = Object.values(contributions).flat().filter(c => c === 'food').length
  const pass = totalFood >= 2

  onReveal({
    contributions,
    pass,
    moraleBonus: pass ? 0 : 0,
    moralePenalty: pass ? 0 : 1
  })
}

function clearTimer (gameId) {
  if (timers.has(gameId)) {
    clearTimeout(timers.get(gameId))
    timers.delete(gameId)
  }
}

function forceReveal (gameId, onReveal) {
  reveal(gameId, onReveal)
}

module.exports = { addContribution, forceReveal, clearTimer }
