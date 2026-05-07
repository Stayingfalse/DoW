'use strict'

const path = require('path')
const Database = require('better-sqlite3')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/dow.db')

let _db

function getDb () {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
  }
  return _db
}

function setupDb () {
  const db = getDb()

  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL,
      phase TEXT NOT NULL DEFAULT 'setup',
      round INTEGER DEFAULT 1,
      morale INTEGER DEFAULT 5,
      state TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL,
      turn_order INTEGER,
      survivor_ids TEXT DEFAULT '[]',
      hand TEXT DEFAULT '[]',
      secret_objective TEXT DEFAULT '{}',
      is_betrayer INTEGER DEFAULT 0,
      is_exiled INTEGER DEFAULT 0,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT,
      game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
      zombie_count INTEGER DEFAULT 0,
      barricade_count INTEGER DEFAULT 0,
      search_deck TEXT DEFAULT '[]',
      discard TEXT DEFAULT '[]',
      survivor_ids TEXT DEFAULT '[]',
      PRIMARY KEY (id, game_id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
      round INTEGER,
      player_id TEXT,
      type TEXT NOT NULL,
      payload TEXT DEFAULT '{}',
      created_at INTEGER
    );
  `)

  return db
}

module.exports = setupDb
module.exports.getDb = getDb
