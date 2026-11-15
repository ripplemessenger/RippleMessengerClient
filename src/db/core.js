import { path } from '@tauri-apps/api'
import Database from '@tauri-apps/plugin-sql'

import Logger from '../lib/Logger'

let dbInstance = null

/**
 * Conservative cap on bound parameters per statement.
 *
 * SQLite's SQLITE_MAX_VARIABLE_NUMBER defaults to 999 on builds older than
 * 3.32, so stay comfortably under that. Used by the batching helpers below to
 * turn "one statement per row" loops into a handful of multi-row statements.
 */
export const MAX_SQL_VARS = 900

/**
 * Split a list into chunks whose multi-row statement stays within the
 * parameter cap.
 * @param {Array} items - Items to batch
 * @param {number} varsPerItem - Bound parameters each item contributes
 * @returns {Array<Array>} Chunks (never empty-sized)
 */
export function chunkByVars(items, varsPerItem) {
  const size = Math.max(1, Math.floor(MAX_SQL_VARS / varsPerItem))
  const out = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

/**
 * Build a multi-row placeholder list: `($1, $2), ($3, $4), …`.
 * @param {number} count - Number of rows
 * @param {number} varsPerItem - Parameters per row
 * @returns {string} Placeholder groups
 */
export function valueGroups(count, varsPerItem) {
  const groups = []
  for (let i = 0; i < count; i++) {
    const tuple = []
    for (let v = 0; v < varsPerItem; v++) {
      tuple.push(`$${i * varsPerItem + v + 1}`)
    }
    groups.push(`(${tuple.join(', ')})`)
  }
  return groups.join(', ')
}

/**
 * Initialize all database tables.
 */
export async function initDB() {
  try {
    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS servers (
      url TEXT PRIMARY KEY,
      priority INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL,
      is_connect INTEGER DEFAULT 0
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS contacts (
      address TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      address TEXT PRIMARY KEY,
      salt TEXT NOT NULL,
      cipher_data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS follows (
      local TEXT NOT NULL,
      remote TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0,

      PRIMARY KEY (local, remote)
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS friends (
      local TEXT NOT NULL,
      remote TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0,

      PRIMARY KEY (local, remote)
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS avatar_files (
      address TEXT PRIMARY KEY,
      hash TEXT NOT NULL,
      size INTEGER NOT NULL,
      signed_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      json TEXT,
      is_saved INTEGER DEFAULT 0
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS files (
      hash TEXT PRIMARY KEY,
      size INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      chunk_length INTEGER NOT NULL,
      chunk_cursor INTEGER NOT NULL,
      is_saved INTEGER DEFAULT 0
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS private_chat_files (
      ehash TEXT PRIMARY KEY,
      address1 TEXT NOT NULL,
      address2 TEXT NOT NULL,
      hash TEXT NOT NULL,
      size INTEGER NOT NULL
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS group_chat_files (
      ehash TEXT PRIMARY KEY,
      group_hash TEXT NOT NULL,
      hash TEXT NOT NULL,
      size INTEGER NOT NULL
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS handshakes (
      self_address TEXT NOT NULL,
      pair_address TEXT NOT NULL,
      partition INTEGER NOT NULL,
      sequence INTEGER NOT NULL,
      aes_key TEXT,
      private_key TEXT NOT NULL,
      public_key TEXT NOT NULL,
      self_json TEXT NOT NULL,
      pair_json TEXT,

      PRIMARY KEY (self_address, pair_address, partition, sequence)
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS bulletins (
      hash TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      content TEXT NOT NULL,
      json TEXT NOT NULL,
      signed_at INTEGER NOT NULL,
      pre_hash TEXT NOT NULL,
      next_hash TEXT,
      is_marked INTEGER DEFAULT 0,
      marked_at INTEGER DEFAULT 0
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS bulletin_replys (
      bulletin_hash TEXT NOT NULL,
      reply_hash TEXT NOT NULL,
      reply_signed_at INTEGER NOT NULL,

      PRIMARY KEY (bulletin_hash, reply_hash),
      check (bulletin_hash != reply_hash),
      FOREIGN KEY (bulletin_hash) REFERENCES bulletins(hash) ON DELETE CASCADE,
      FOREIGN KEY (reply_hash) REFERENCES bulletins(hash) ON DELETE CASCADE
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS bulletin_files (
      bulletin_hash TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_ext TEXT NOT NULL,

      PRIMARY KEY (bulletin_hash, file_hash),
      FOREIGN KEY (bulletin_hash) REFERENCES bulletins(hash) ON DELETE CASCADE,
      FOREIGN KEY (file_hash) REFERENCES files(hash) ON DELETE CASCADE
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY autoincrement,
      name TEXT NOT NULL unique
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS bulletin_tags (
      bulletin_hash TEXT NOT NULL,
      bulletin_signed_at INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,

      PRIMARY KEY (bulletin_hash, tag_id),
      FOREIGN KEY (bulletin_hash) REFERENCES bulletins(hash) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS private_messages (
      hash TEXT PRIMARY KEY,
      sour TEXT NOT NULL,
      dest TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      pre_hash TEXT NOT NULL,
      content TEXT NOT NULL,
      json TEXT NOT NULL,
      signed_at INTEGER NOT NULL,
      is_confirmed INTEGER DEFAULT 0,
      is_marked INTEGER DEFAULT 0,
      marked_at INTEGER DEFAULT 0,
      is_readed INTEGER DEFAULT 0,
      is_object INTEGER DEFAULT 0,
      object_type INTEGER DEFAULT 0
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS groups (
      hash TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      member TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      create_json TEXT NOT NULL,
      deleted_at INTEGER,
      delete_json TEXT,
      is_accepted INTEGER DEFAULT 0
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS group_messages (
      hash TEXT PRIMARY KEY,
      group_hash TEXT NOT NULL,
      address TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      pre_hash TEXT NOT NULL,
      content TEXT NOT NULL,
      json TEXT NOT NULL,
      signed_at INTEGER NOT NULL,
      is_confirmed INTEGER DEFAULT 0,
      is_marked INTEGER DEFAULT 0,
      marked_at INTEGER DEFAULT 0,
      is_readed INTEGER DEFAULT 0,
      is_object INTEGER DEFAULT 0,
      object_type INTEGER DEFAULT 0
    );`)

    await dbInstance.execute('PRAGMA foreign_keys = ON;')

    // ── Migration: add is_deleted column to follows/friends if missing ──
    await migrateAddColumn(dbInstance, 'follows', 'is_deleted', 'INTEGER DEFAULT 0')
    await migrateAddColumn(dbInstance, 'friends', 'is_deleted', 'INTEGER DEFAULT 0')

    // ── Migration: add marked_at column to message tables if missing ──
    await migrateAddColumn(dbInstance, 'bulletins', 'marked_at', 'INTEGER DEFAULT 0')
    await migrateAddColumn(dbInstance, 'private_messages', 'marked_at', 'INTEGER DEFAULT 0')
    await migrateAddColumn(dbInstance, 'group_messages', 'marked_at', 'INTEGER DEFAULT 0')

    await createIndexes(dbInstance)
  } catch (error) {
    Logger.error('db.initDB', error)
  }
}

/**
 * Create the query indexes.
 *
 * The schema previously had none at all, so every lookup by address / sequence /
 * signed_at / group_hash was a full table scan. That also made the paged session
 * queries cheaper to fetch but no cheaper to find: `ORDER BY signed_at DESC
 * LIMIT n` still had to scan and sort the whole table.
 *
 * All statements use IF NOT EXISTS, so this is idempotent and safe to run against
 * an existing database on every startup.
 * @param {import('@tauri-apps/plugin-sql').default} db - Database instance
 */
async function createIndexes(db) {
  const statements = [
    // ── bulletins ──
    // per-address chain walk: last bulletin, by-sequence lookup, gap fill
    'CREATE INDEX IF NOT EXISTS idx_bulletins_address_sequence ON bulletins(address, sequence)',
    // portal / followed / bookmark feeds all sort by signed_at
    'CREATE INDEX IF NOT EXISTS idx_bulletins_signed_at ON bulletins(signed_at)',
    'CREATE INDEX IF NOT EXISTS idx_bulletins_is_marked_signed_at ON bulletins(is_marked, signed_at)',

    // ── bulletin relations ──
    'CREATE INDEX IF NOT EXISTS idx_bulletin_replys_hash_signed_at ON bulletin_replys(bulletin_hash, reply_signed_at)',
    'CREATE INDEX IF NOT EXISTS idx_bulletin_files_file_hash ON bulletin_files(file_hash)',
    'CREATE INDEX IF NOT EXISTS idx_bulletin_tags_tag_signed_at ON bulletin_tags(tag_id, bulletin_signed_at)',

    // ── private messages ── (two independent directions, so both orders)
    'CREATE INDEX IF NOT EXISTS idx_private_messages_sour_dest_signed_at ON private_messages(sour, dest, signed_at)',
    'CREATE INDEX IF NOT EXISTS idx_private_messages_dest_sour_signed_at ON private_messages(dest, sour, signed_at)',
    'CREATE INDEX IF NOT EXISTS idx_private_messages_sour_dest_sequence ON private_messages(sour, dest, sequence)',

    // ── group messages ──
    'CREATE INDEX IF NOT EXISTS idx_group_messages_group_signed_at ON group_messages(group_hash, signed_at)',
    'CREATE INDEX IF NOT EXISTS idx_group_messages_group_address_sequence ON group_messages(group_hash, address, sequence)',
    'CREATE INDEX IF NOT EXISTS idx_group_messages_group_is_readed ON group_messages(group_hash, is_readed)',

    // ── files / avatars ──
    'CREATE INDEX IF NOT EXISTS idx_files_is_saved_updated_at ON files(is_saved, updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_avatar_files_hash ON avatar_files(hash)',
    'CREATE INDEX IF NOT EXISTS idx_avatar_files_updated_at ON avatar_files(updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_private_chat_files_hash ON private_chat_files(hash)',
    'CREATE INDEX IF NOT EXISTS idx_group_chat_files_hash ON group_chat_files(hash)',
    'CREATE INDEX IF NOT EXISTS idx_group_chat_files_group_hash ON group_chat_files(group_hash)',

    // ── groups ──
    'CREATE INDEX IF NOT EXISTS idx_groups_is_accepted ON groups(is_accepted)'
  ]

  for (const sql of statements) {
    try {
      await db.execute(sql)
    } catch (e) {
      // A failed index must not stop the app from starting.
      Logger.warn('[DB-Index] failed:', sql, e.message || e)
    }
  }
}

/**
 * Add a column to a table if it doesn't already exist.
 */
async function migrateAddColumn(db, table, column, definition) {
  try {
    const rows = await db.select(`PRAGMA table_info(${table})`)
    const columns = rows.map((r) => r.name)
    if (!columns.includes(column)) {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
      Logger.info(`[DB-Migrate] Added ${table}.${column}`)
    }
  } catch (e) {
    Logger.warn(`[DB-Migrate] Failed to check/add ${table}.${column}:`, e.message || e)
  }
}

/** Cached DB file path — resolved once per process. */
let dbPath = null
/** In-flight initialisation, so concurrent callers share one load + one init. */
let dbInitPromise = null

/**
 * Get the database singleton instance, initializing lazily.
 *
 * `path.resourceDir()` and `path.join()` are Tauri IPC calls that cross the
 * WebView ↔ Rust boundary. The previous implementation awaited both on EVERY
 * call — even after the database was already open — and every dbAPI method
 * starts with `await getDB()`, so each query paid two extra round-trips for a
 * path that never changes. The path is now resolved once, and the fast path
 * returns without any IPC.
 *
 * Concurrency: the first caller creates a shared init promise; later callers
 * await the same one instead of racing to `Database.load()` twice.
 */
export async function getDB() {
  if (dbInstance) return dbInstance
  if (dbInitPromise) return dbInitPromise

  dbInitPromise = (async () => {
    if (dbPath === null) {
      const exeDir = await path.resourceDir()
      dbPath = await path.join(exeDir, 'app.db')
    }
    dbInstance = await Database.load(`sqlite:${dbPath}`)
    await initDB()
    return dbInstance
  })()

  try {
    return await dbInitPromise
  } catch (e) {
    // Never cache a failed init — let the next call retry from scratch.
    dbInitPromise = null
    dbInstance = null
    throw e
  }
}
