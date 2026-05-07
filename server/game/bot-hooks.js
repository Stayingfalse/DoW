'use strict'

/**
 * Bot AI — greedy decision-making for the CPU player.
 * Priority: attack zombies > search if low on cards > barricade > move toward zombie-heavy location.
 * Full turn is resolved server-side with a short async delay to simulate "thinking".
 */

const BOT_THINK_DELAY_MS = 1200  // delay before bot acts (UX — gives clients time to see the state)
const MAX_BOT_ACTIONS = 4        // cap actions per turn regardless of dice

/**
 * Decide a sequence of actions for a bot player.
 * Returns an array of { type, survivorId, payload } to be applied in order.
 */
function decideBotActions (gameState, botPlayerId) {
  const player = (gameState.players || []).find(p => p.id === botPlayerId)
  if (!player || !player.survivorIds || !player.survivorIds.length) return []

  const actions = []
  const diceLeft = (gameState.actionDice || []).length

  for (const survivorId of player.survivorIds) {
    if (actions.length >= MAX_BOT_ACTIONS || actions.length >= diceLeft) break

    // Find where this survivor currently is
    const currentLocId = _findSurvivorLocation(survivorId, gameState)
    if (!currentLocId) continue

    const currentLoc = gameState.locations[currentLocId]
    const zombiesHere = (currentLoc && currentLoc.zombie_count) || 0
    const handSize = (player.hand || []).length

    // 1. Attack if zombies present at current location
    if (zombiesHere > 0 && actions.length < diceLeft) {
      actions.push({ type: 'ACTION_ATTACK', payload: { survivorId, locationId: currentLocId } })
      continue
    }

    // 2. Search if hand is small
    if (handSize < 3 && actions.length < diceLeft) {
      actions.push({ type: 'ACTION_SEARCH', payload: { survivorId, locationId: currentLocId } })
      continue
    }

    // 3. Barricade if location has no barricades and zombies could arrive
    if ((currentLoc && (currentLoc.barricade_count || 0) === 0) && actions.length < diceLeft) {
      actions.push({ type: 'ACTION_BARRICADE', payload: { survivorId, locationId: currentLocId } })
      continue
    }

    // 4. Move toward location with most zombies (excluding colony)
    if (actions.length < diceLeft) {
      const targetLocId = _findMostDangerousLocation(gameState, currentLocId)
      if (targetLocId && targetLocId !== currentLocId) {
        actions.push({ type: 'ACTION_MOVE', payload: { survivorId, toLocationId: targetLocId } })
      }
    }
  }

  return actions
}

function _findSurvivorLocation (survivorId, gameState) {
  for (const [locId, loc] of Object.entries(gameState.locations || {})) {
    if ((loc.survivor_ids || []).includes(survivorId)) return locId
  }
  return null
}

function _findMostDangerousLocation (gameState, excludeLocId) {
  let maxZombies = -1
  let bestLocId = null
  for (const [locId, loc] of Object.entries(gameState.locations || {})) {
    if (locId === 'colony' || locId === excludeLocId) continue
    const z = loc.zombie_count || 0
    if (z > maxZombies) { maxZombies = z; bestLocId = locId }
  }
  return bestLocId
}

/**
 * Schedule a bot's turn with a short "think" delay.
 * Calls back with the array of decided actions once the delay elapses.
 */
function scheduleBotTurn (gameId, botPlayerId, callback) {
  // We need the current game state — require lazily to avoid circular deps
  const engine = require('./engine')
  setTimeout(() => {
    const state = engine.getGame(gameId)
    if (!state || state.activePlayerId !== botPlayerId || state.phase !== 'action') return
    const actions = decideBotActions(state, botPlayerId)
    callback(actions)
  }, BOT_THINK_DELAY_MS)
}

/**
 * Decide bot's crisis contribution.
 * Strategy: contribute 1-2 matching cards if available, otherwise skip.
 * Returns array of item IDs to contribute.
 */
function decideBotCrisisContribution (gameState, botPlayerId) {
  const player = (gameState.players || []).find(p => p.id === botPlayerId)
  if (!player || !player.hand || !player.hand.length) return []

  const crisis = gameState.currentCrisis
  if (!crisis) return []

  const itemsData = require('../data/items.json')
  const hand = player.hand || []

  // If crisis accepts 'any' type, contribute 1-2 random cards
  if (crisis.contributionType === 'any') {
    const count = Math.min(2, hand.length, crisis.threshold || 1)
    return hand.slice(0, count)
  }

  // Find matching cards in hand
  const matchingCards = hand.filter(cardId => {
    const item = itemsData.find(i => i.id === cardId)
    return item && item.type === crisis.contributionType
  })

  // Contribute 1-2 matching cards if we have them
  const count = Math.min(2, matchingCards.length)
  return matchingCards.slice(0, count)
}

/**
 * Schedule a bot's crisis contribution with a short delay.
 * Calls back with the array of item IDs to contribute.
 */
function scheduleBotCrisisContribution (gameId, botPlayerId, callback) {
  const engine = require('./engine')
  setTimeout(() => {
    const state = engine.getGame(gameId)
    if (!state || state.phase !== 'crisis') return
    const bot = state.players.find(p => p.id === botPlayerId)
    if (!bot || bot.isExiled) return
    const cards = decideBotCrisisContribution(state, botPlayerId)
    callback(cards)
  }, BOT_THINK_DELAY_MS)
}

module.exports = { decideBotActions, scheduleBotTurn, decideBotCrisisContribution, scheduleBotCrisisContribution }

