'use strict'

/**
 * Dead of Winter — Per-player rate limiter
 * Phase 5: Prevents message flooding / replay-spam.
 *
 * Uses a fixed-window counter: up to MAX_MESSAGES_PER_WINDOW messages allowed
 * within WINDOW_MS milliseconds per player. Exceeded → { limited: true }.
 *
 * Also enforces a per-action cooldown: game-mutating actions may not be sent
 * faster than ACTION_COOLDOWN_MS to prevent dice-click spam.
 */

const WINDOW_MS = 1000 // 1 second rolling window
const MAX_MESSAGES_PER_WINDOW = 30 // max WS messages per second per player
const ACTION_COOLDOWN_MS = 300 // min ms between game-mutating actions

/**
 * Sentinel value for type-agnostic (burst-window only) rate checks.
 * Using a symbol-like constant avoids colliding with real message types.
 */
const GENERIC_TYPE = '__generic__'

// Game-mutating action types that share the action cooldown
const MUTATING_TYPES = new Set([
  'ACTION_MOVE', 'ACTION_ATTACK', 'ACTION_SEARCH', 'ACTION_ITEM',
  'ACTION_BARRICADE', 'ACTION_CLEAN', 'END_TURN', 'CRISIS_CONTRIB',
  'EXILE_VOTE', 'CROSSROADS_CHOICE', 'START_GAME', 'CREATE_GAME', 'JOIN_GAME'
])

// Map<playerId, { count, windowStart, lastActionAt }>
const state = new Map()

/**
 * Check whether the message should be dropped for this player.
 * Returns { limited: false } when allowed, { limited: true, reason } when rate-limited.
 * Mutates internal counters as a side effect.
 *
 * @param {string} playerId
 * @param {string} type  WS message type
 */
function check (playerId, type) {
  const now = Date.now()
  let entry = state.get(playerId)

  if (!entry) {
    entry = { count: 0, windowStart: now, lastActionAt: 0 }
    state.set(playerId, entry)
  }

  // Reset window if it has expired
  if (now - entry.windowStart >= WINDOW_MS) {
    entry.count = 0
    entry.windowStart = now
  }

  entry.count++

  // Per-window burst check
  if (entry.count > MAX_MESSAGES_PER_WINDOW) {
    return { limited: true, reason: `Rate limit exceeded (>${MAX_MESSAGES_PER_WINDOW} msg/s)` }
  }

  // Per-action cooldown check
  if (MUTATING_TYPES.has(type)) {
    if (now - entry.lastActionAt < ACTION_COOLDOWN_MS) {
      const waitSec = ((ACTION_COOLDOWN_MS - (now - entry.lastActionAt)) / 1000).toFixed(1)
      return { limited: true, reason: `Action too fast — wait ${waitSec}s between actions` }
    }
    entry.lastActionAt = now
  }

  return { limited: false }
}

/**
 * Remove a player's rate-limit entry (call on WS disconnect to avoid memory leaks).
 * @param {string} playerId
 */
function remove (playerId) {
  state.delete(playerId)
}

module.exports = { check, remove, GENERIC_TYPE }
