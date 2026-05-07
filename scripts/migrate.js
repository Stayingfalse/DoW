#!/usr/bin/env node
'use strict'

/**
 * Dead of Winter — Database migration runner
 *
 * Applies schema migrations in order, tracking the current version in a
 * `schema_version` table. Each migration is a plain SQL string; add new ones
 * at the END of the MIGRATIONS array — never reorder or edit existing entries.
 *
 * Usage:
 *   node scripts/migrate.js [--db /path/to/dow.db]
 */

require('dotenv').config()
const path = require('path')
const Database = require('better-sqlite3')

const args = process.argv.slice(2)
const dbFlagIdx = args.indexOf('--db')
const dbPath = dbFlagIdx !== -1 && args[dbFlagIdx + 1]
  ? args[dbFlagIdx + 1]
  : process.env.DB_PATH || path.join(__dirname, '../data/dow.db')

// ─── Migration list ───────────────────────────────────────────────────────────
// Each entry: { version: number, description: string, sql: string }
// version must be sequential starting from 1.
const MIGRATIONS = [
  {
    version: 1,
    description: 'Initial schema',
    sql: `
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
    `
  },
  {
    version: 2,
    description: 'Add difficulty column to games',
    sql: `
      ALTER TABLE games ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'normal';
    `
  },
  {
    version: 3,
    description: 'Add is_bot flag to players',
    sql: `
      ALTER TABLE players ADD COLUMN is_bot INTEGER NOT NULL DEFAULT 0;
    `
  }
]

// ─── Runner ───────────────────────────────────────────────────────────────────

function run () {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Ensure version tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL,
      description TEXT,
      applied_at INTEGER NOT NULL
    );
  `)

  const appliedVersions = new Set(
    db.prepare('SELECT version FROM schema_version').all().map(r => r.version)
  )

  let applied = 0
  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) {
      console.log(`  [skip] v${migration.version}: ${migration.description}`)
      continue
    }

    console.log(`  [run]  v${migration.version}: ${migration.description}`)
    const applyMigration = db.transaction(() => {
      db.exec(migration.sql)
      db.prepare(
        'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)'
      ).run(migration.version, migration.description, Date.now())
    })
    try {
      applyMigration()
      applied++
    } catch (err) {
      // ALTER TABLE … ADD COLUMN fails if column already exists in some SQLite versions;
      // treat that as already applied to make migrations idempotent.
      if (err.message && err.message.includes('duplicate column name')) {
        console.log(`         (column already exists — marking as applied)`)
        db.prepare(
          'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)'
        ).run(migration.version, migration.description, Date.now())
        applied++
      } else {
        console.error(`  [fail] v${migration.version}: ${err.message}`)
        process.exit(1)
      }
    }
  }

  db.close()
  if (applied === 0) {
    console.log('Database is already up-to-date.')
  } else {
    console.log(`Migration complete. Applied ${applied} migration(s).`)
  }
}

console.log(`Migrating database at: ${dbPath}`)
run()
