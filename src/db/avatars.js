import { Bool2Int, Int2Bool } from '../lib/AppUtil'
import { getDB } from './core'

export const api = {
  async getAvatarByAddress(address) {
    const dbInstance = await getDB()
    const avatars = await dbInstance.select(
      'SELECT * FROM avatar_files WHERE address = $1 LIMIT 1',
      [address]
    )
    if (avatars.length > 0) {
      let avatar = avatars[0]
      if (avatar.json !== null) {
        avatar.json = JSON.parse(avatar.json)
      }
      avatar.is_saved = Int2Bool(avatar.is_saved)
      return avatar
    }
    return null
  },

  async getAvatarByHash(hash) {
    const dbInstance = await getDB()
    const avatars = await dbInstance.select(
      'SELECT * FROM avatar_files WHERE hash = $1 LIMIT 1',
      [hash]
    )
    if (avatars.length > 0) {
      let avatar = avatars[0]
      if (avatar.json !== null) {
        avatar.json = JSON.parse(avatar.json)
      }
      avatar.is_saved = Int2Bool(avatar.is_saved)
      return avatar
    }
    return null
  },

  async getAvatarOldList() {
    const dbInstance = await getDB()
    let avatars = await dbInstance.select('SELECT * FROM avatar_files ORDER BY updated_at DESC LIMIT 64')
    for (let i = 0; i < avatars.length; i++) {
      if (avatars[i].json !== null) {
        avatars[i].json = JSON.parse(avatars[i].json)
      }
      avatars[i].is_saved = Int2Bool(avatars[i].is_saved)
    }
    return avatars
  },

  async addAvatar(address, hash, size, signed_at, updated_at, json, is_saved) {
    const db = await getDB()
    let sql = 'INSERT INTO avatar_files (address, hash, size, signed_at, updated_at, is_saved, json) VALUES ($1, $2, $3, $4, $5, $6, NULL)'
    let value = [address, hash, size, signed_at, updated_at, Bool2Int(is_saved)]
    if (json !== null) {
      sql = 'INSERT INTO avatar_files (address, hash, size, signed_at, updated_at, is_saved, json) VALUES ($1, $2, $3, $4, $5, $6, $7)'
      value = [address, hash, size, signed_at, updated_at, Bool2Int(is_saved), JSON.stringify(json)]
    }
    await db.execute(sql, value)
  },

  async updateAvatar(address, hash, size, signed_at, updated_at, json, is_saved) {
    const db = await getDB()
    await db.execute(
      'UPDATE avatar_files SET hash = $1, size = $2, signed_at = $3, updated_at = $4, json = $5, is_saved = $6 WHERE address = $7',
      [hash, size, signed_at, updated_at, JSON.stringify(json), Bool2Int(is_saved), address]
    )
  },

  async updateAvatarUpdatedAt(address, updated_at) {
    const db = await getDB()
    await db.execute(
      'UPDATE avatar_files SET updated_at = $1 WHERE address = $2',
      [updated_at, address]
    )
  },

  async updateAvatarIsSaved(address, is_saved, updated_at) {
    const db = await getDB()
    await db.execute(
      'UPDATE avatar_files SET is_saved = $1, updated_at = $2 WHERE address = $3',
      [Bool2Int(is_saved), updated_at, address]
    )
  },

  // Management: get total avatar storage size
  async getAvatarStorageSize() {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select(
      'SELECT COUNT(address) AS count, COALESCE(SUM(size), 0) AS totalSize FROM avatar_files'
    )
    return result ? { count: result.count, totalSize: result.totalSize } : { count: 0, totalSize: 0 }
  },

  // Management: delete avatar record from DB (NOT disk file)
  async deleteAvatarRecord(address) {
    const db = await getDB()
    await db.execute('DELETE FROM avatar_files WHERE address = $1', [address])
  },

  // Management: clear all avatar records from DB
  async clearAllAvatarRecords() {
    const db = await getDB()
    const [result] = await db.select('SELECT COUNT(address) AS count FROM avatar_files')
    const count = result ? result.count : 0
    await db.execute('DELETE FROM avatar_files')
    return count
  },
}
