'use strict'

/**
 * Spawns zombies at a given location.
 */
function spawnZombies (locationId, count, state) {
  if (!state.locations[locationId]) return state
  state.locations[locationId].zombieCount = (state.locations[locationId].zombieCount || 0) + count
  return state
}

/**
 * Colony phase: moves zombies from exterior locations toward colony.
 * Each location with zombies and no barricades adds 1 zombie to colony.
 */
function moveZombies (state) {
  const colonyId = 'colony'
  for (const [locId, loc] of Object.entries(state.locations)) {
    if (locId === colonyId) continue
    if ((loc.zombieCount || 0) > 0 && (loc.barricadeCount || 0) === 0) {
      state.locations[colonyId] = state.locations[colonyId] || { zombieCount: 0 }
      state.locations[colonyId].zombieCount = (state.locations[colonyId].zombieCount || 0) + 1
    }
  }
  return state
}

/**
 * Zombies attack survivors at a location.
 * Each zombie has a chance to wound a survivor.
 */
function attackSurvivors (locationId, state) {
  const loc = state.locations[locationId]
  if (!loc || !loc.zombieCount) return { wounds: 0, state }

  const survivorIds = loc.survivorIds || []
  if (!survivorIds.length) return { wounds: 0, state }

  // Simple: each zombie wounds one random survivor
  let wounds = 0
  for (let i = 0; i < loc.zombieCount; i++) {
    const target = survivorIds[Math.floor(Math.random() * survivorIds.length)]
    if (target) {
      // Mark wound in state (survivors tracked in game state, simplified here)
      state.wounds = state.wounds || {}
      state.wounds[target] = (state.wounds[target] || 0) + 1
      wounds++
    }
  }
  return { wounds, state }
}

module.exports = { spawnZombies, moveZombies, attackSurvivors }
