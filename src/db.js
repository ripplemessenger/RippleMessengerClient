import { path } from '@tauri-apps/api'
import Database from '@tauri-apps/plugin-sql'
import { Bool2Int, ConsoleError, Int2Bool } from './lib/AppUtil'
import { MessageObjectType } from './lib/MessengerConst'
import { BulletinPageSize } from './lib/AppConst'
import { bulletin2Display, groupMessage2Display, privateMessage2Display } from './lib/MessengerUtil'

let dbInstance = null

export async function initDB() {
  try {
    await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS servers (
      url TEXT PRIMARY KEY,
      updated_at INTEGER NOT NULL
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
      json TEXT NOT NULL,
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
    console.error("init db failed:", error);
  }
}

export async function getDB() {
  const exeDir = await path.resourceDir()
  const dbPath = await path.join(exeDir, 'app.db')
  if (!dbInstance) {
    dbInstance = await Database.load(`sqlite:${dbPath}`)
    await initDB()
  }
  return dbInstance
}

export const dbAPI = {
  // server
  async getAllServers() {
    const dbInstance = await getDB()
    return await dbInstance.select('SELECT * FROM servers ORDER BY updated_at DESC')
  },

  async getServerByURL(url) {
    const dbInstance = await getDB()
    const servers = await dbInstance.select(
      'SELECT * FROM servers WHERE url = $1 LIMIT 1',
      [url]
    )
    return servers.length > 0 ? servers[0] : null
  },

  async addServer(url, updated_at) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO servers (url, updated_at) VALUES ($1, $2)',
        [url, updated_at]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async updateServer(url, updated_at) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE servers SET updated_at = $1 WHERE url = $2',
        [updated_at, url]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async deleteServer(url) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute('DELETE FROM servers WHERE url = $1', [url])
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // contact
  async getAllContacts() {
    const dbInstance = await getDB()
    return await dbInstance.select('SELECT * FROM contacts ORDER BY updated_at DESC')
  },

  async getContactByAddress(address) {
    const dbInstance = await getDB()
    const contacts = await dbInstance.select(
      'SELECT * FROM contacts WHERE address = $1 LIMIT 1',
      [address]
    )
    return contacts.length > 0 ? contacts[0] : null
  },

  async addContact(address, nickname, timestamp) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO contacts (address, nickname, updated_at) VALUES ($1, $2, $3)',
        [address, nickname, timestamp]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async updateContactNickname(address, nickname, timestamp) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE contacts SET nickname = $1, updated_at = $2 WHERE address = $3',
        [nickname, timestamp, address]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async deleteContactByAddress(address) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute('DELETE FROM contacts WHERE address = $1', [address])
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // account
  async getAllAccounts() {
    const dbInstance = await getDB()
    return await dbInstance.select('SELECT * FROM accounts ORDER BY updated_at DESC')
  },

  async getAccountByAddress(address) {
    const dbInstance = await getDB()
    const accounts = await dbInstance.select(
      'SELECT * FROM accounts WHERE address = $1 LIMIT 1',
      [address]
    )
    return accounts.length > 0 ? accounts[0] : null
  },

  async addAccount(address, salt, cipher_data, timestamp) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO accounts (address, salt, cipher_data, updated_at) VALUES ($1, $2, $3, $4)',
        [address, salt, cipher_data, timestamp]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async updateAccount(address, salt, cipher_data, timestamp) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE accounts SET salt = $1, cipher_data = $2, updated_at = $3 WHERE address = $4',
        [salt, cipher_data, timestamp, address]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async deleteAccountByAddress(address) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'DELETE FROM accounts WHERE address = $1',
        [address])
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // follow
  async getMyFollows(address) {
    const dbInstance = await getDB()
    return await dbInstance.select(
      'SELECT * FROM follows WHERE local = $1 ORDER BY updated_at DESC',
      [address]
    )
  },

  async getFollow(local, remote) {
    const dbInstance = await getDB()
    const follows = await dbInstance.select(
      'SELECT * FROM follows WHERE local = $1 AND remote = $2 LIMIT 1',
      [local, remote]
    )
    return follows.length > 0 ? follows[0] : null
  },

  async addFollow(local, remote, timestamp) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO follows (local, remote, updated_at) VALUES ($1, $2, $3)',
        [local, remote, timestamp]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async deleteFollow(local, remote) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'DELETE FROM follows WHERE local = $1 AND remote = $2',
        [local, remote])
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // friend
  async getMyFriends(address) {
    const dbInstance = await getDB()
    return await dbInstance.select(
      'SELECT * FROM friends WHERE local = $1 ORDER BY updated_at DESC',
      [address]
    )
  },

  async getFriend(local, remote) {
    const dbInstance = await getDB()
    const friends = await dbInstance.select(
      'SELECT * FROM friends WHERE local = $1 AND remote = $2 LIMIT 1',
      [local, remote]
    )
    return friends.length > 0 ? friends[0] : null
  },

  async addFriend(local, remote, timestamp) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO friends (local, remote, updated_at) VALUES ($1, $2, $3)',
        [local, remote, timestamp]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async deleteFriend(local, remote) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'DELETE FROM friends WHERE local = $1 AND remote = $2',
        [local, remote])
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // avatar
  async getAvatarByAddress(address) {
    const dbInstance = await getDB()
    const avatars = await dbInstance.select(
      'SELECT * FROM avatar_files WHERE address = $1 LIMIT 1',
      [address]
    )
    if (avatars.length > 0) {
      let avatar = avatars[0]
      avatar.json = JSON.parse(avatar.json)
      avatar.is_saved = Int2Bool(avatar.is_saved)
      return avatar
    } else {
      return null
    }
  },

  async getAvatarByHash(hash) {
    const dbInstance = await getDB()
    const avatars = await dbInstance.select(
      'SELECT * FROM avatar_files WHERE hash = $1 LIMIT 1',
      [hash]
    )
    if (avatars.length > 0) {
      let avatar = avatars[0]
      avatar.json = JSON.parse(avatar.json)
      avatar.is_saved = Int2Bool(avatar.is_saved)
      return avatar
    } else {
      return null
    }
  },

  async getAvatarOldList() {
    const dbInstance = await getDB()
    let avatars = await dbInstance.select('SELECT * FROM avatar_files ORDER BY updated_at DESC LIMIT 64')
    for (let i = 0; i < avatars.length; i++) {
      const avatar = avatars[i]
      avatars[i].json = JSON.parse(avatar.json)
      avatars[i].is_saved = Int2Bool(avatar.is_saved)
    }
    return avatars
  },

  async addAvatar(address, hash, size, signed_at, updated_at, json, is_saved) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO avatar_files (address, hash, size, signed_at, updated_at, json, is_saved) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [address, hash, size, signed_at, updated_at, json, is_saved]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async updateAvatar(address, hash, size, signed_at, updated_at, json, is_saved) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE avatar_files SET hash = $1, size = $2, signed_at = $3, updated_at = $4, json = $5, is_saved = $6 WHERE address = $7',
        [hash, size, signed_at, updated_at, json, is_saved, address]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async updateAvatarUpdatedAt(address, updated_at) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE avatar_files SET updated_at = $1 WHERE address = $2',
        [updated_at, address]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async updateAvatarIsSaved(address, is_saved, updated_at) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE avatar_files SET is_saved = $1, updated_at = $2 WHERE address = $3',
        [is_saved, updated_at, address]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // bulletin
  async getMyBulletins(address, page) {
    const dbInstance = await getDB()
    let bulletins = await dbInstance.select(
      `SELECT * FROM bulletins WHERE address = $1 ORDER BY sequence DESC LIMIT ${BulletinPageSize} OFFSET ${(page - 1) * BulletinPageSize}`,
      [address]
    )
    for (let i = 0; i < bulletins.length; i++) {
      const bulletin = bulletins[i]
      bulletins[i] = bulletin2Display(bulletin)
    }
    return bulletins
  },

  async getMyBulletinCount(address) {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select(
      `SELECT COUNT(hash) as count FROM bulletins WHERE address = $1`,
      [address]
    )
    return result ? result.count : 0
  },

  async getBulletinListByAddresses(addresses, page) {
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return []
    }

    const dbInstance = await getDB()
    const placeholders = addresses.map(() => '?').join(', ');
    const query = `SELECT * FROM bulletins WHERE address IN (${placeholders}) ORDER BY signed_at DESC LIMIT ${BulletinPageSize} OFFSET ${(page - 1) * BulletinPageSize}`
    let bulletins = await dbInstance.select(query, addresses)
    for (let i = 0; i < bulletins.length; i++) {
      const bulletin = bulletins[i]
      bulletins[i] = bulletin2Display(bulletin)
    }
    return bulletins
  },

  async getBulletinCountByAddresses(addresses) {
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return 0
    }

    const dbInstance = await getDB()
    const placeholders = addresses.map(() => '?').join(', ')
    const query = `SELECT COUNT(hash) as count FROM bulletins WHERE address IN (${placeholders})`
    let [result] = await dbInstance.select(query, addresses)
    return result ? result.count : 0
  },

  async getBulletinListByIsmark(page) {
    const dbInstance = await getDB()
    let bulletins = await dbInstance.select(
      `SELECT * FROM bulletins WHERE is_marked = $1 ORDER BY signed_at DESC LIMIT ${BulletinPageSize} OFFSET ${(page - 1) * BulletinPageSize}`,
      [Bool2Int(true)]
    )
    for (let i = 0; i < bulletins.length; i++) {
      const bulletin = bulletins[i]
      bulletins[i] = bulletin2Display(bulletin)
    }
    return bulletins
  },

  async getBulletinCountByIsmark() {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select(
      `SELECT COUNT(hash) as count FROM bulletins WHERE is_marked = $1`,
      [Bool2Int(true)]
    )
    return result ? result.count : 0
  },

  async getBulletinListByHash(hashes) {
    if (!Array.isArray(hashes) || hashes.length === 0) {
      return []
    }

    const dbInstance = await getDB()
    const placeholders = hashes.map(() => '?').join(', ')
    const query = `SELECT * FROM bulletins WHERE hash IN (${placeholders}) ORDER BY signed_at`
    let bulletins = await dbInstance.select(query, hashes)
    for (let i = 0; i < bulletins.length; i++) {
      const bulletin = bulletins[i]
      // to display
      bulletins[i] = bulletin2Display(bulletin)
    }
    return bulletins
  },

  async getBulletinByHash(hash) {
    const dbInstance = await getDB()
    const bulletins = await dbInstance.select(
      'SELECT * FROM bulletins WHERE hash = $1 LIMIT 1',
      [hash]
    )
    if (bulletins.length > 0) {
      let bulletin = bulletins[0]
      // to display
      bulletin = bulletin2Display(bulletin)
      return bulletin
    } else {
      return null
    }
  },

  async getBulletinBySequence(address, sequence) {
    const dbInstance = await getDB()
    const bulletins = await dbInstance.select(
      'SELECT * FROM bulletins WHERE address = $1 AND sequence = $2 LIMIT 1',
      [address, sequence]
    )
    if (bulletins.length > 0) {
      let bulletin = bulletins[0]
      // to display
      bulletin = bulletin2Display(bulletin)
      return bulletin
    } else {
      return null
    }
  },

  async getLastBulletin(address) {
    const dbInstance = await getDB()
    const bulletins = await dbInstance.select(
      'SELECT * FROM bulletins WHERE address = $1 ORDER BY sequence DESC LIMIT 1',
      [address]
    )
    if (bulletins.length > 0) {
      let bulletin = bulletins[0]
      // to display
      bulletin = bulletin2Display(bulletin)
      return bulletin
    } else {
      return null
    }
  },

  async addBulletin(hash, address, sequence, pre_hash, content, json, signed_at) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO bulletins (hash, address, sequence, pre_hash, content, json, signed_at, is_marked) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [hash, address, sequence, pre_hash, content, JSON.stringify(json), signed_at, Bool2Int(false)]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async toggleBulletinMark(hash, is_marked) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE bulletins SET is_marked = $1 WHERE hash = $2',
        [Bool2Int(is_marked), hash]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // bulletin file
  async addFilesToBulletin(bulletin_hash, files) {
    if (!Array.isArray(files) || files.length === 0)
      return true

    const dbInstance = await getDB()
    try {
      for (const file of files) {
        await dbInstance.execute(
          `INSERT OR IGNORE INTO bulletin_files (bulletin_hash, file_hash, file_size, file_name, file_ext) VALUES ($1, $2, $3, $4, $5)`,
          [bulletin_hash, file.Hash, file.Size, file.Name, file.Ext]
        )
      }
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // bulletin reply
  async getReplyHashListByBulletinHash(hash, page) {
    const dbInstance = await getDB()
    const bulletins = await dbInstance.select(
      `SELECT reply_hash FROM bulletin_replys WHERE bulletin_hash = $1 ORDER BY reply_signed_at DESC LIMIT ${BulletinPageSize} OFFSET ${(page - 1) * BulletinPageSize}`,
      [hash]
    )
    console.log(bulletins)
    const hashes = bulletins.map(bulletin => bulletin.reply_hash)
    return hashes
  },

  async getReplyCount(hash) {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select(
      `SELECT COUNT(reply_hash) as count FROM bulletin_replys WHERE bulletin_hash = $1`,
      [hash]
    )
    return result ? result.count : 0
  },

  async addReplyToBulletins(bulletins, reply_hash, reply_signed_at) {
    if (!Array.isArray(bulletins) || bulletins.length === 0)
      return true

    console.log(bulletins)
    const dbInstance = await getDB()
    try {
      for (const bulletin of bulletins) {
        await dbInstance.execute(
          `INSERT OR IGNORE INTO bulletin_replys (bulletin_hash, reply_hash, reply_signed_at) VALUES ($1, $2, $3)`,
          [bulletin.Hash, reply_hash, reply_signed_at]
        )
      }
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // bulletin tag
  async getBulletinHashListByTagId(ids, page) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return []
    }

    const dbInstance = await getDB()
    const placeholders = ids.map(() => '?').join(', ')
    const query = `SELECT DISTINCT bulletin_hash FROM bulletin_tags WHERE tag_id IN(${placeholders}) ORDER BY bulletin_signed_at DESC LIMIT ${BulletinPageSize} OFFSET ${(page - 1) * BulletinPageSize}`
    const bulletins = await dbInstance.select(query, ids)
    const hashes = bulletins.map(bulletin => bulletin.bulletin_hash)
    return hashes
  },

  async getBulletinHashCountByTagId(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return []
    }

    const dbInstance = await getDB()
    const placeholders = ids.map(() => '?').join(', ')
    const query = `SELECT COUNT(DISTINCT bulletin_hash) as count FROM bulletin_tags WHERE tag_id IN(${placeholders})`
    const [result] = await dbInstance.select(query, ids)
    return result ? result.count : 0
  },

  async addTagsToBulletin(bulletin_hash, bulletin_signed_at, tagNames) {
    if (!Array.isArray(tagNames) || tagNames.length === 0)
      return true

    const dbInstance = await getDB()
    try {
      for (const rawName of tagNames) {
        const name = rawName.trim()
        if (!name) continue

        await dbInstance.execute(
          `INSERT OR IGNORE INTO tags (name) VALUES ($1)`,
          [name]
        )

        const [row] = await dbInstance.select("SELECT id FROM tags WHERE name = $1", [name])
        const tagId = row?.id

        if (!tagId) continue

        await dbInstance.execute(
          `INSERT OR IGNORE INTO bulletin_tags (bulletin_hash, bulletin_signed_at, tag_id) VALUES ($1, $2, $3)`,
          [bulletin_hash, bulletin_signed_at, tagId]
        )

      }
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // tag
  async getTagIdListByName(names) {
    if (!Array.isArray(names) || names.length === 0) {
      return []
    }

    const dbInstance = await getDB()
    const placeholders = names.map(() => '?').join(', ');
    const query = `SELECT id FROM tags WHERE name IN(${placeholders})`
    const tags = await dbInstance.select(query, names)
    const ids = tags.map(tag => tag.id)
    return ids
  },

  async addTag(name) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        "INSERT OR IGNORE INTO tags (name) VALUES ($1)",
        [name]
      );
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // channel
  async getMyChannels(created_by) {
    const dbInstance = await getDB()
    let channels = await dbInstance.select(
      'SELECT * FROM channels WHERE created_by = $1 ORDER BY created_at DESC',
      [created_by]
    )
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i]
      channels[i].speaker = JSON.parse(channel.speaker)
    }
    return channels
  },

  async getChannelByName(created_by, name) {
    const dbInstance = await getDB()
    const channels = await dbInstance.select(
      'SELECT * FROM channels WHERE created_by = $1 AND name = $2 LIMIT 1',
      [created_by, name]
    )
    if (channels.length > 0) {
      let channel = channels[0]
      channel.speaker = JSON.parse(channel.speaker)
      return channel
    } else {
      return null
    }
  },

  async addChannel(created_by, name, speaker, created_at) {
    console.log(created_by, name, speaker, created_at)
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO channels (created_by, name, speaker, created_at) VALUES ($1, $2, $3, $4)',
        [created_by, name, JSON.stringify(speaker), created_at]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async updateChannel(created_by, name, speaker, created_at) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE channels SET speaker = $1, created_at = $2 WHERE created_by = $3 AND name = $4',
        [JSON.stringify(speaker), created_at, created_by, name]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async deleteChannel(created_by, name) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'DELETE FROM channels WHERE created_by = $1, name = $2',
        [created_by, name])
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  //  file
  async getFileByHash(hash) {
    const dbInstance = await getDB()
    const files = await dbInstance.select(
      'SELECT * FROM files WHERE hash = $1 LIMIT 1',
      [hash]
    )
    if (files.length > 0) {
      let file = files[0]
      file.is_saved = Int2Bool(file.is_saved)
      return file
    } else {
      return null
    }
  },

  async addFile(hash, size, updated_at, chunk_length, chunk_cursor, is_saved) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO files (hash, size, updated_at, chunk_length, chunk_cursor, is_saved) VALUES ($1, $2, $3, $4, $5, $6)',
        [hash, size, updated_at, chunk_length, chunk_cursor, Bool2Int(is_saved)]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async updateFileChunkCursor(hash, chunk_cursor, updated_at) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE files SET chunk_cursor = $1, updated_at = $2 WHERE hash = $3',
        [chunk_cursor, updated_at, hash]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async localFileSaved(hash, chunk_cursor, updated_at) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE files SET chunk_cursor = $1, updated_at = $2, is_saved = $3 WHERE hash = $4',
        [chunk_cursor, updated_at, 1, hash]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async remoteFileSaved(hash, updated_at) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE files SET updated_at = $1, is_saved = $2 WHERE hash = $3',
        [updated_at, 1, hash]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // private_chat_file
  async addPrivateFile(ehash, tmp1, tmp2, hash, size) {
    const address1 = tmp1 > tmp2 ? tmp1 : tmp2
    const address2 = tmp1 > tmp2 ? tmp2 : tmp1
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO private_chat_files (ehash, address1, address2, hash, size) VALUES ($1, $2, $3, $4, $5)',
        [ehash, address1, address2, hash, size]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async getPrivateFileByEHash(ehash) {
    const dbInstance = await getDB()
    const private_chat_files = await dbInstance.select(
      'SELECT * FROM private_chat_files WHERE ehash = $1 LIMIT 1',
      [ehash]
    )
    return private_chat_files.length > 0 ? private_chat_files[0] : null
  },

  // group_chat_file
  async addGroupFile(ehash, group_hash, hash, size) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO group_chat_files (ehash, group_hash, hash, size) VALUES ($1, $2, $3, $4)',
        [ehash, group_hash, hash, size]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async getGroupFileByEHash(ehash) {
    const dbInstance = await getDB()
    const group_chat_files = await dbInstance.select(
      'SELECT * FROM group_chat_files WHERE ehash = $1 LIMIT 1',
      [ehash]
    )
    return group_chat_files.length > 0 ? group_chat_files[0] : null
  },

  // handshake
  async initHandshakeFromLocal(self_address, pair_address, partition, sequence, private_key, public_key, self_json) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO handshakes (self_address, pair_address, partition, sequence, private_key, public_key, self_json) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [self_address, pair_address, partition, sequence, private_key, public_key, JSON.stringify(self_json)]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async initHandshakeFromRemote(self_address, pair_address, partition, sequence, aes_key, private_key, public_key, self_json, pair_json) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO handshakes (self_address, pair_address, partition, sequence, aes_key, private_key, public_key, self_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [self_address, pair_address, partition, sequence, aes_key, private_key, public_key, JSON.stringify(self_json), JSON.stringify(pair_json)]
      )
      return true
    } catch (error) {
      console.log(error)
      ConsoleError(error)
      return false
    }
  },

  async updateHandshake(self_address, pair_address, partition, sequence, aes_key, self_json, pair_json) {
    console.log(self_address, pair_address, partition, sequence, aes_key, self_json, pair_json)
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE handshakes SET aes_key = $1, self_json = $2, pair_json = $3 WHERE self_address = $4 AND pair_address = $5 AND partition = $6 AND sequence = $7',
        [aes_key, JSON.stringify(self_json), JSON.stringify(pair_json), self_address, pair_address, partition, sequence]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async getHandshake(self_address, pair_address, partition, sequence) {
    const dbInstance = await getDB()
    const handshakes = await dbInstance.select(
      'SELECT * FROM handshakes WHERE self_address = $1 AND pair_address = $2 AND partition = $3 AND sequence = $4 LIMIT 1',
      [self_address, pair_address, partition, sequence]
    )
    if (handshakes.length > 0) {
      let handsake = handshakes[0]
      handsake.self_json = JSON.parse(handsake.self_json)
      if (handsake.pair_json) {
        handsake.pair_json = JSON.parse(handsake.pair_json)
      }
      return handsake
    } else {
      return null
    }
  },

  // private message
  async getPrivateSession(sour, dest) {
    const dbInstance = await getDB()
    let msgs = await dbInstance.select(
      'SELECT * FROM private_messages WHERE (sour = $1 AND dest = $2) OR (sour = $2 AND dest = $1) ORDER BY signed_at ASC',
      [sour, dest]
    )
    for (let i = 0; i < msgs.length; i++) {
      msgs[i] = privateMessage2Display(msgs[i])
    }
    return msgs
  },

  async getPrivateNewMessageCount(sour, dest) {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select(
      'SELECT COUNT(DISTINCT hash) as count FROM private_messages WHERE ((sour = $1 AND dest = $2) OR (sour = $2 AND dest = $1)) AND is_readed = $3',
      [sour, dest, Bool2Int(false)]
    )
    return result ? result.count : 0
  },

  async readPrivateSession(sour, dest) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE private_messages SET is_readed = $3 WHERE (sour = $1 AND dest = $2) OR (sour = $2 AND dest = $1)',
        [sour, dest, Bool2Int(true)]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async getLastPrivateMessage(sour, dest) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM private_messages WHERE sour = $1 AND dest = $2 ORDER BY sequence DESC LIMIT 1',
      [sour, dest]
    )
    if (msgs.length > 0) {
      const msg = privateMessage2Display(msgs[0])
      return msg
    } else {
      return null
    }
  },

  async getLastConfirmPrivateMessage(sour, dest) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM private_messages WHERE sour = $1 AND dest = $2 AND is_confirmed = $3 ORDER BY sequence DESC LIMIT 1',
      [sour, dest, Bool2Int(true)]
    )
    if (msgs.length > 0) {
      const msg = privateMessage2Display(msgs[0])
      return msg
    } else {
      return null
    }
  },

  async getLastUnconfirmPrivateMessage(sour, dest) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM private_messages WHERE sour = $1 AND dest = $2 AND is_confirmed = $3 ORDER BY sequence DESC LIMIT 1',
      [sour, dest, Bool2Int(false)]
    )
    if (msgs.length > 0) {
      const msg = privateMessage2Display(msgs[0])
      return msg
    } else {
      return null
    }
  },

  async getUnsyncPrivateSession(sour, dest, self_sequence, pair_sequence) {
    const dbInstance = await getDB()
    let msgs = await dbInstance.select(
      'SELECT json FROM private_messages WHERE (sour = $1 AND dest = $2 AND sequence > $3) OR (sour = $2 AND dest = $1 AND sequence > $4) ORDER BY signed_at ASC',
      [sour, dest, self_sequence, pair_sequence]
    )
    return msgs
  },

  async addPrivateMessage(hash, sour, dest, sequence, pre_hash, content, json, signed_at, is_confirmed, is_marked, is_readed, is_object) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO private_messages (hash, sour, dest, sequence, pre_hash, content, json, signed_at, is_confirmed, is_marked, is_readed, is_object, object_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
        [hash, sour, dest, sequence, pre_hash, is_object ? JSON.stringify(content) : content, JSON.stringify(json), signed_at, Bool2Int(is_confirmed), Bool2Int(is_marked), Bool2Int(is_readed), Bool2Int(is_object), is_object ? content.ObjectType : MessageObjectType.NotObject]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async confirmPrivateMessage(hash) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE private_messages SET is_confirmed = $1 WHERE hash = $2',
        [Bool2Int(true), hash]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // group
  async getGroups() {
    const dbInstance = await getDB()
    let groups = await dbInstance.select('SELECT * FROM groups ORDER BY created_at DESC')
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      groups[i].member = JSON.parse(group.member)
      groups[i].create_json = JSON.parse(group.create_json)
      if (group.delete_json) {
        groups[i].delete_json = JSON.parse(group.delete_json)
      }
      groups[i].is_accepted = Int2Bool(group.is_accepted)
    }
    return groups
  },

  async getGroupByHash(hash) {
    const dbInstance = await getDB()
    const groups = await dbInstance.select(
      'SELECT * FROM groups WHERE hash = $1 LIMIT 1',
      [hash]
    )
    if (groups.length > 0) {
      let group = groups[0]
      group.member = JSON.parse(group.member)
      group.create_json = JSON.parse(group.create_json)
      if (group.delete_json) {
        group.delete_json = JSON.parse(group.delete_json)
      }
      group.is_accepted = Int2Bool(group.is_accepted)
      return group
    } else {
      return null
    }
  },

  async createGroup(hash, name, created_by, member, created_at, create_json, is_accepted) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO groups (hash, name, created_by, member, created_at, create_json, is_accepted) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [hash, name, created_by, JSON.stringify(member), created_at, JSON.stringify(create_json), Bool2Int(is_accepted)]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async updateGroupDelete(hash, delete_json) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE groups SET delete_json = $1, delete_at = $2 WHERE hash = $3',
        [JSON.stringify(delete_json), delete_json.Timestamp, hash]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async acceptGroupRequest(hash) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE groups SET is_accepted = $1 WHERE hash = $2',
        [1, hash]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // group message
  async getGroupSession(group_hash) {
    const dbInstance = await getDB()
    let msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 ORDER BY signed_at ASC',
      [group_hash]
    )
    for (let i = 0; i < msgs.length; i++) {
      msgs[i] = groupMessage2Display(msgs[i])
    }
    return msgs
  },

  async getGroupNewMessageCount(group_hash) {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select(
      'SELECT COUNT(DISTINCT hash) as count FROM group_messages WHERE group_hash = $1 AND is_readed = $2',
      [group_hash, Bool2Int(false)]
    )
    return result ? result.count : 0
  },

  async readGroupSession(group_hash) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE group_messages SET is_readed = $2 WHERE group_hash = $1',
        [group_hash, Bool2Int(true)]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async getUnsyncGroupSession(group_hash, signed_at) {
    const dbInstance = await getDB()
    let msgs = await dbInstance.select(
      'SELECT json FROM group_messages WHERE group_hash = $1 AND signed_at > $2 ORDER BY signed_at ASC LIMIT 64',
      [group_hash, signed_at]
    )
    return msgs
  },

  async getMemberLastGroupMessage(group_hash, address) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 AND address = $2 ORDER BY sequence DESC LIMIT 1',
      [group_hash, address]
    )
    if (msgs.length > 0) {
      const msg = groupMessage2Display(msgs[0])
      return msg
    } else {
      return null
    }
  },

  async getLastConfirmGroupMessage(group_hash, address) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 AND address != $2 AND is_confirmed = $3 ORDER BY signed_at DESC LIMIT 1',
      [group_hash, address, Bool2Int(true)]
    )
    if (msgs.length > 0) {
      const msg = groupMessage2Display(msgs[0])
      return msg
    } else {
      return null
    }
  },

  async getLastUnconfirmGroupMessage(group_hash, address) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 AND address != $2 AND is_confirmed = $3 ORDER BY signed_at DESC LIMIT 1',
      [group_hash, address, Bool2Int(false)]
    )
    if (msgs.length > 0) {
      const msg = groupMessage2Display(msgs[0])
      return msg
    } else {
      return null
    }
  },

  async getLastGroupMessage(group_hash) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 ORDER BY signed_at DESC LIMIT 1',
      [group_hash]
    )
    if (msgs.length > 0) {
      const msg = groupMessage2Display(msgs[0])
      return msg
    } else {
      return null
    }
  },

  async getLastGroupMemberMessage(group_hash, address) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 AND address = $2 ORDER BY sequence DESC LIMIT 1',
      [group_hash, address]
    )
    if (msgs.length > 0) {
      const msg = groupMessage2Display(msgs[0])
      return msg
    } else {
      return null
    }
  },

  async addGroupMessage(hash, group_hash, address, sequence, pre_hash, content, json, signed_at, is_confirmed, is_marked, is_readed, is_object) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'INSERT INTO group_messages (hash, group_hash, address, sequence, pre_hash, content, json, signed_at, is_confirmed, is_marked, is_readed, is_object, object_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
        [hash, group_hash, address, sequence, pre_hash, is_object ? JSON.stringify(content) : content, JSON.stringify(json), signed_at, Bool2Int(is_confirmed), Bool2Int(is_marked), Bool2Int(is_readed), Bool2Int(is_object), is_object ? content.ObjectType : MessageObjectType.NotObject]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async confirmGroupMessage(hash) {
    try {
      const dbInstance = await getDB()
      await dbInstance.execute(
        'UPDATE group_messages SET is_confirmed = $1 WHERE hash = $2',
        [Bool2Int(true), hash]
      )
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  async getGroupMessageBySequence(group_hash, address, sequence) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 AND address = $2 AND sequence = $3 LIMIT 1',
      [group_hash, address, sequence]
    )
    if (msgs.length > 0) {
      const msg = groupMessage2Display(msgs[0])
      return msg
    } else {
      return null
    }
  },

  async getGroupMessageByHash(group_hash, hash) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 AND hash = $2 LIMIT 1',
      [group_hash, hash]
    )
    if (msgs.length > 0) {
      const msg = groupMessage2Display(msgs[0])
      return msg
    } else {
      return null
    }
  },
}