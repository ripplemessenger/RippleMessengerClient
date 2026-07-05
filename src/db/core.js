import { path } from '@tauri-apps/api'
import Database from '@tauri-apps/plugin-sql'

import Logger from '../lib/Logger'

let dbInstance = null

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

      PRIMARY KEY (local, remote)
    );`)

    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS friends (
      local TEXT NOT NULL,
      remote TEXT NOT NULL,
      updated_at INTEGER NOT NULL,

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
    CREATE TABLE IF NOT EXISTS channels (
      name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      speaker TEXT NOT NULL,
      created_at INTEGER NOT NULL,

      PRIMARY KEY (name, created_by)
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
      is_marked INTEGER DEFAULT 0
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
      is_readed INTEGER DEFAULT 0,
      is_object INTEGER DEFAULT 0,
      object_type INTEGER DEFAULT 0
    );`)

    await dbInstance.execute("PRAGMA foreign_keys = ON;");
  } catch (error) {
    Logger.error('db.initDB', error)
  }
}

/**
 * Get the database singleton instance, initializing lazily.
 */
export async function getDB() {
  const exeDir = await path.resourceDir()
  const dbPath = await path.join(exeDir, 'app.db')
  if (!dbInstance) {
    dbInstance = await Database.load(`sqlite:${dbPath}`)
    await initDB()
  }
  return dbInstance
}
