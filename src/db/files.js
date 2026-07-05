import { Bool2Int, Int2Bool } from '../lib/AppUtil'
import { getDB } from './core'

export const api = {
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
    }
    return null
  },

  async addFile(hash, size, updated_at, chunk_length, chunk_cursor, is_saved) {
    const db = await getDB()
    await db.execute(
      'INSERT INTO files (hash, size, updated_at, chunk_length, chunk_cursor, is_saved) VALUES ($1, $2, $3, $4, $5, $6)',
      [hash, size, updated_at, chunk_length, chunk_cursor, Bool2Int(is_saved)]
    )
  },

  async updateFileChunkCursor(hash, chunk_cursor, updated_at) {
    const db = await getDB()
    await db.execute(
      'UPDATE files SET chunk_cursor = $1, updated_at = $2 WHERE hash = $3',
      [chunk_cursor, updated_at, hash]
    )
  },

  async localFileSaved(hash, chunk_cursor, updated_at) {
    const db = await getDB()
    await db.execute(
      'UPDATE files SET chunk_cursor = $1, updated_at = $2, is_saved = $3 WHERE hash = $4',
      [chunk_cursor, updated_at, 1, hash]
    )
  },

  async remoteFileSaved(hash, updated_at) {
    const db = await getDB()
    await db.execute(
      'UPDATE files SET updated_at = $1, is_saved = $2 WHERE hash = $3',
      [updated_at, 1, hash]
    )
  },

  // private_chat_file
  async addPrivateFile(ehash, tmp1, tmp2, hash, size) {
    const address1 = tmp1 > tmp2 ? tmp1 : tmp2
    const address2 = tmp1 > tmp2 ? tmp2 : tmp1
    const db = await getDB()
    await db.execute(
      'INSERT INTO private_chat_files (ehash, address1, address2, hash, size) VALUES ($1, $2, $3, $4, $5)',
      [ehash, address1, address2, hash, size]
    )
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
    const db = await getDB()
    await db.execute(
      'INSERT INTO group_chat_files (ehash, group_hash, hash, size) VALUES ($1, $2, $3, $4)',
      [ehash, group_hash, hash, size]
    )
  },

  async getGroupFileByEHash(ehash) {
    const dbInstance = await getDB()
    const group_chat_files = await dbInstance.select(
      'SELECT * FROM group_chat_files WHERE ehash = $1 LIMIT 1',
      [ehash]
    )
    return group_chat_files.length > 0 ? group_chat_files[0] : null
  },
}
