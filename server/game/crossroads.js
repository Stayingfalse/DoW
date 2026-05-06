'use strict'

const WS_OPEN = 1 // WebSocket.OPEN

const crossroadsData = require('../data/crossroads.json')

// Map of gameId -> array of held crossroads cards (with predicates)
const heldCards = new Map()

/**
 * Deal one crossroads card to each player at game start.
 */
function dealCards (gameId, players) {
  const deck = shuffle([...crossroadsData])
  heldCards.set(gameId, [])
  for (const player of players) {
    const card = deck.shift()
    if (card) {
      heldCards.get(gameId).push({ ...card, holderId: player.id })
    }
  }
}

/**
 * Evaluate all held crossroads card triggers after every game event.
 * Sends CROSSROADS_TRIGGER to the holding player via presence map.
 */
function evaluateTriggers (state, event, presence) {
  const cards = heldCards.get(state.id) || []
  const toTrigger = []

  for (const card of cards) {
    if (checkTrigger(card, event, state)) {
      toTrigger.push(card)
    }
  }

  for (const card of toTrigger) {
    // Remove from held
    const held = heldCards.get(state.id) || []
    heldCards.set(state.id, held.filter(c => c.id !== card.id))

    // Unicast to holding player
    const sock = presence.get(card.holderId)
    if (sock && sock.readyState === WS_OPEN) {
      sock.send(JSON.stringify({
        type: 'CROSSROADS_TRIGGER',
        payload: { card, triggerContext: event }
      }))
    }
  }
}

function checkTrigger (card, event, state) {
  if (!card.triggerEvent) return false
  return card.triggerEvent === event.type
}

/**
 * Apply a player's crossroads choice to the game state.
 */
function applyChoice (state, crossroadsId, choice) {
  const card = crossroadsData.find(c => c.id === crossroadsId)
  if (!card) return { success: false, error: 'Unknown crossroads card' }

  const outcome = (card.choices || []).find(c => c.id === choice)
  if (!outcome) return { success: false, error: 'Unknown choice' }

  // Apply outcome effects to state (placeholder)
  const newState = { ...state }
  if (outcome.moraleDelta) {
    newState.morale = Math.max(0, (newState.morale || 5) + outcome.moraleDelta)
  }

  return { success: true, newState }
}

function shuffle (arr) {
  for (let currentIndex = arr.length - 1; currentIndex > 0; currentIndex--) {
    const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
    [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex], arr[currentIndex]]
  }
  return arr
}

module.exports = { dealCards, evaluateTriggers, applyChoice }
