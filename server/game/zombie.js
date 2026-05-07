'use strict'

/**
 * Spawns zombies at a given location.
 */
function spawnZombies (locationId, count, state) {
  if (!state.locations[locationId]) return state
  state.locations[locationId].zombie_count = (state.locations[locationId].zombie_count || 0) + count
  return state
}

/**
 * Colony phase: moves zombies from exterior locations toward the colony.
 * Reduces barricades first; if none remain, zombies enter the colony.
 */
function moveZombies (state) {
  const colonyId = 'colony'
  if (!state.locations[colonyId]) return state

  for (const [locId, loc] of Object.entries(state.locations)) {
    if (locId === colonyId) continue
    if ((loc.zombie_count || 0) === 0) continue

    if ((loc.barricade_count || 0) > 0) {
      // Barricades absorb the zombie movement — remove one barricade
      loc.barricade_count = loc.barricade_count - 1
    } else {
      // No barricades — one zombie moves from this location into colony
      loc.zombie_count = loc.zombie_count - 1
      state.locations[colonyId].zombie_count = (state.locations[colonyId].zombie_count || 0) + 1
    }
  }
  return state
}

/**
 * Zombies attack survivors at a location.
 * Each zombie at the location has a chance to wound a random survivor.
 */
function attackSurvivors (locationId, state) {
  const loc = state.locations[locationId]
  if (!loc || !loc.zombie_count) return { wounds: 0, state }

  const survivorIds = loc.survivor_ids || []
  if (!survivorIds.length) return { wounds: 0, state }

  let wounds = 0
  for (let i = 0; i < loc.zombie_count; i++) {
    const target = survivorIds[Math.floor(Math.random() * survivorIds.length)]
    if (target) {
      state.wounds = state.wounds || {}
      state.wounds[target] = (state.wounds[target] || 0) + 1
      wounds++
    }
  }
  return { wounds, state }
}

module.exports = { spawnZombies, moveZombies, attackSurvivors }
