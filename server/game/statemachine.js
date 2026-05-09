'use strict'

const { moveZombies } = require('./zombie')
const scenariosData = require('../data/scenarios.json')

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
      if (state.phase === 'action') {
        state.phase = 'crisis'
        state.activePlayerId = null  // No active player during crisis phase
      }
      break
    case 'END_CRISIS':
      if (state.phase === 'crisis') {
        state.phase = 'colony'
        state.activePlayerId = null  // No active player during colony phase
      }
      break
    case 'END_COLONY':
      if (state.phase === 'colony') {
        state.phase = 'cleanup'
        state.activePlayerId = null  // No active player during cleanup phase
      }
      break
    case 'END_CLEANUP':
      if (state.phase === 'cleanup') {
        state.round = (state.round || 1) + 1
        state.phase = 'action'
        state.activePlayerId = state.players.filter(p => !p.isExiled)[0]?.id || null
      }
      break
    case 'END_GAME':
      state.phase = 'end'
      break
  }
  return state
}

/**
 * Advance the turn to the next player or advance the phase.
 */
function advanceTurn (state) {
  if (state.phase === 'action') {
    const players = (state.players || []).filter(p => !p.isExiled)
    const currentIdx = players.findIndex(p => p.id === state.activePlayerId)
    const nextIdx = currentIdx + 1

    if (nextIdx >= players.length) {
      transition(state, 'END_ACTION')
    } else {
      state.activePlayerId = players[nextIdx].id
    }
    return state
  }

  const phaseEvents = {
    crisis: 'END_CRISIS',
    colony: 'END_COLONY',
    cleanup: 'END_CLEANUP'
  }
  const evt = phaseEvents[state.phase]
  if (evt) transition(state, evt)
  return state
}

/**
 * Run colony phase side-effects: food consumption and zombie movement.
 * Called when transitioning crisis → colony.
 */
function runColonyPhase (state) {
  // Food consumption: 1 food per non-exiled player
  const activePlayers = (state.players || []).filter(p => !p.isExiled)
  const foodConsumed = activePlayers.length
  state.food = Math.max(0, (state.food || 0) - foodConsumed)

  // Morale loss if no food remains
  if (state.food === 0) {
    state.morale = Math.max(0, state.morale - 1)
  }

  // Move zombies from exterior locations toward colony
  moveZombies(state)

  return state
}

/**
 * Check win/loss conditions.
 * Returns an outcome object or null if the game continues.
 */
function checkOutcome (state) {
  // Universal loss: morale reaches zero
  if (state.morale <= 0) {
    return { result: 'loss', reason: 'morale_zero', betrayerWins: hasBetrayer(state) }
  }

  // Universal loss: rounds exceeded
  if ((state.round || 1) > (state.scenarioRounds || 10)) {
    return { result: 'loss', reason: 'rounds_exceeded', betrayerWins: false }
  }

  // Game still in progress
  if (state.phase === 'end') {
    return { result: 'win', reason: 'scenario_complete', betrayerWins: false }
  }

  return null
}

/**
 * Check whether any player in the game is the betrayer.
 */
function hasBetrayer (state) {
  return (state.players || []).some(p => p.isBetrayer && !p.isExiled)
}

module.exports = { transition, advanceTurn, runColonyPhase, checkOutcome, PHASES }
