'use strict'

const { getDb } = require('./setup')

// Allowed column names per table — prevents SQL injection via dynamic field names
const ALLOWED_GAME_FIELDS = new Set(['phase', 'round', 'morale', 'state'])
const ALLOWED_PLAYER_FIELDS = new Set(['game_id', 'turn_order', 'survivor_ids', 'hand', 'secret_objective', 'is_betrayer', 'is_exiled'])

function validateFields (allowed, fields) {
  for (const key of Object.keys(fields)) {
    if (!allowed.has(key)) throw new Error(`Invalid field name: ${key}`)
  }
}

// ─── Games ────────────────────────────────────────────────────────────────────

function insertGame ({ id, scenarioId, state }) {
  const now = Date.now()
  getDb().prepare(`
    INSERT INTO games (id, scenario_id, phase, round, morale, state, created_at, updated_at)
    VALUES (?, ?, 'setup', 1, 5, ?, ?, ?)
  `).run(id, scenarioId, JSON.stringify(state || {}), now, now)
}

function getGame (id) {
  const row = getDb().prepare('SELECT * FROM games WHERE id = ?').get(id)
  if (!row) return null
  return { ...row, state: JSON.parse(row.state) }
}

function updateGame (id, fields) {
  validateFields(ALLOWED_GAME_FIELDS, fields)
  const now = Date.now()
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ')
  const values = Object.values(fields).map(v =>
    typeof v === 'object' ? JSON.stringify(v) : v
  )
  getDb().prepare(`UPDATE games SET ${sets}, updated_at = ? WHERE id = ?`).run(...values, now, id)
}

function listGames () {
  return getDb().prepare('SELECT id, scenario_id, phase, round, morale, created_at FROM games').all()
}

// ─── Players ──────────────────────────────────────────────────────────────────

function insertPlayer ({ id, gameId, displayName, createdAt }) {
  getDb().prepare(`
    INSERT INTO players (id, game_id, display_name, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, gameId || null, displayName, createdAt || Date.now())
}

function getPlayer (id) {
  const row = getDb().prepare('SELECT * FROM players WHERE id = ?').get(id)
  if (!row) return null
  return {
    ...row,
    survivorIds: JSON.parse(row.survivor_ids),
    hand: JSON.parse(row.hand),
    secretObjective: JSON.parse(row.secret_objective)
  }
}

function getPlayersForGame (gameId) {
  return getDb().prepare('SELECT * FROM players WHERE game_id = ?').all(gameId).map(row => ({
    ...row,
    survivorIds: JSON.parse(row.survivor_ids),
    hand: JSON.parse(row.hand),
    secretObjective: JSON.parse(row.secret_objective)
  }))
}

function updatePlayer (id, fields) {
  validateFields(ALLOWED_PLAYER_FIELDS, fields)
  const mapped = {}
  for (const [k, v] of Object.entries(fields)) {
    mapped[k] = typeof v === 'object' ? JSON.stringify(v) : v
  }
  const sets = Object.keys(mapped).map(k => `${k} = ?`).join(', ')
  getDb().prepare(`UPDATE players SET ${sets} WHERE id = ?`).run(...Object.values(mapped), id)
}

function assignPlayerToGame (playerId, gameId, turnOrder) {
  getDb().prepare('UPDATE players SET game_id = ?, turn_order = ? WHERE id = ?').run(gameId, turnOrder, playerId)
}

// ─── Locations ────────────────────────────────────────────────────────────────

function upsertLocation ({ id, gameId, zombieCount, barricadeCount, searchDeck, discard, survivorIds }) {
  getDb().prepare(`
    INSERT INTO locations (id, game_id, zombie_count, barricade_count, search_deck, discard, survivor_ids)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id, game_id) DO UPDATE SET
      zombie_count = excluded.zombie_count,
      barricade_count = excluded.barricade_count,
      search_deck = excluded.search_deck,
      discard = excluded.discard,
      survivor_ids = excluded.survivor_ids
  `).run(
    id, gameId,
    zombieCount || 0,
    barricadeCount || 0,
    JSON.stringify(searchDeck || []),
    JSON.stringify(discard || []),
    JSON.stringify(survivorIds || [])
  )
}

function getLocationsForGame (gameId) {
  return getDb().prepare('SELECT * FROM locations WHERE game_id = ?').all(gameId).map(row => ({
    ...row,
    searchDeck: JSON.parse(row.search_deck),
    discard: JSON.parse(row.discard),
    survivorIds: JSON.parse(row.survivor_ids)
  }))
}

// ─── Events ───────────────────────────────────────────────────────────────────

function insertEvent ({ gameId, round, playerId, type, payload }) {
  getDb().prepare(`
    INSERT INTO events (game_id, round, player_id, type, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(gameId, round, playerId || null, type, JSON.stringify(payload || {}), Date.now())
}

function getEventsForGame (gameId, limit) {
  const query = limit
    ? 'SELECT * FROM events WHERE game_id = ? ORDER BY id DESC LIMIT ?'
    : 'SELECT * FROM events WHERE game_id = ? ORDER BY id ASC'
  const rows = limit
    ? getDb().prepare(query).all(gameId, limit)
    : getDb().prepare(query).all(gameId)
  return rows.map(row => ({ ...row, payload: JSON.parse(row.payload) }))
}

module.exports = {
  insertGame,
  getGame,
  updateGame,
  listGames,
  insertPlayer,
  getPlayer,
  getPlayersForGame,
  updatePlayer,
  assignPlayerToGame,
  upsertLocation,
  getLocationsForGame,
  insertEvent,
  getEventsForGame
}
