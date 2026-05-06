'use strict'

/**
 * Bot hook stubs — engine treats bots identically to human players.
 * Full AI logic to be implemented in a future phase.
 */

function decideBotAction (gameState, botPlayerId) {
  return null
}

function scheduleBotTurn (gameId, botPlayerId) {
  // No-op stub
}

module.exports = { decideBotAction, scheduleBotTurn }
