'use strict'

/**
 * Phase state machine for Dead of Winter.
 *
 * Phases: setup → action → crisis → colony → cleanup → action (next round)
 *                                                     → end (win/loss)
 */
const PHASES = ['setup', 'action', 'crisis', 'colony', 'cleanup']

function transition (state, event) {
  switch (event) {
    case 'START':
      if (state.phase === 'setup') {
        state.phase = 'action'
        state.activePlayerId = state.players[0] && state.players[0].id
      }
      break
    case 'END_ACTION':
      if (state.phase === 'action') state.phase = 'crisis'
      break
    case 'END_CRISIS':
      if (state.phase === 'crisis') state.phase = 'colony'
      break
    case 'END_COLONY':
      if (state.phase === 'colony') state.phase = 'cleanup'
      break
    case 'END_CLEANUP':
      if (state.phase === 'cleanup') {
        state.round = (state.round || 1) + 1
        state.phase = 'action'
        state.activePlayerId = state.players[0] && state.players[0].id
      }
      break
    case 'END_GAME':
      state.phase = 'end'
      break
  }
  return state
}

/**
 * Advance the turn to the next player, or end the action phase.
 */
function advanceTurn (state) {
  if (state.phase !== 'action') {
    // Advance phase
    const phaseEvents = {
      crisis: 'END_CRISIS',
      colony: 'END_COLONY',
      cleanup: 'END_CLEANUP'
    }
    const evt = phaseEvents[state.phase]
    if (evt) transition(state, evt)
    return state
  }

  const players = (state.players || []).filter(p => !p.isExiled)
  const currentIdx = players.findIndex(p => p.id === state.activePlayerId)
  const nextIdx = currentIdx + 1

  if (nextIdx >= players.length) {
    // All players have had their turn — end action phase
    transition(state, 'END_ACTION')
  } else {
    state.activePlayerId = players[nextIdx].id
  }

  return state
}

/**
 * Check win/loss conditions.
 * Returns outcome object or null if game continues.
 */
function checkOutcome (state) {
  if (state.morale <= 0) {
    return { result: 'loss', reason: 'morale_zero', betrayerRevealed: null }
  }
  // Scenario-specific win checks would go here (Phase 3+)
  return null
}

module.exports = { transition, advanceTurn, checkOutcome, PHASES }
