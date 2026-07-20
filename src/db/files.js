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

  // Management: get all files with usage info and category
  async getAllFilesWithUsage() {
    const dbInstance = await getDB()
    const rows = await dbInstance.select(`
      SELECT
        f.hash,
        f.size,
        f.is_saved,
        f.updated_at,
        COALESCE(bulletin_files.file_hash, private_chat_files.hash, group_chat_files.hash) IS NOT NULL AS has_ref,
        CASE
          WHEN bulletin_files.file_hash IS NOT NULL THEN 'bulletin'
          WHEN private_chat_files.hash IS NOT NULL THEN 'private'
          WHEN group_chat_files.hash IS NOT NULL THEN 'group'
          ELSE 'orphan'
        END AS category,
        (
          SELECT COUNT(*) FROM bulletin_files WHERE file_hash = f.hash
          +
          SELECT COUNT(*) FROM private_chat_files WHERE hash = f.hash
          +
          SELECT COUNT(*) FROM group_chat_files WHERE hash = f.hash
        ) AS ref_count
      FROM files f
      LEFT JOIN bulletin_files ON bulletin_files.file_hash = f.hash
      LEFT JOIN private_chat_files ON private_chat_files.hash = f.hash
      LEFT JOIN group_chat_files ON group_chat_files.hash = f.hash
      GROUP BY f.hash
      ORDER BY f.updated_at DESC
    `)
    return rows.map(r => ({
      ...r,
      is_saved: Int2Bool(r.is_saved),
    }))
  },

  // Management: count files by category
  async getFileCountByCategory() {
    const dbInstance = await getDB()
    const rows = await dbInstance.select(`
      SELECT
        (SELECT COUNT(*) FROM files f WHERE EXISTS (SELECT 1 FROM bulletin_files bf WHERE bf.file_hash = f.hash)) AS bulletin,
        (SELECT COUNT(*) FROM files f WHERE EXISTS (SELECT 1 FROM private_chat_files pf WHERE pf.hash = f.hash) AND NOT EXISTS (SELECT 1 FROM bulletin_files bf WHERE bf.file_hash = f.hash)) AS private,
        (SELECT COUNT(*) FROM files f WHERE EXISTS (SELECT 1 FROM group_chat_files gf WHERE gf.hash = f.hash) AND NOT EXISTS (SELECT 1 FROM bulletin_files bf WHERE bf.file_hash = f.hash) AND NOT EXISTS (SELECT 1 FROM private_chat_files pf WHERE pf.hash = f.hash)) AS group,
        (SELECT COUNT(*) FROM files f WHERE NOT EXISTS (SELECT 1 FROM bulletin_files bf WHERE bf.file_hash = f.hash) AND NOT EXISTS (SELECT 1 FROM private_chat_files pf WHERE pf.hash = f.hash) AND NOT EXISTS (SELECT 1 FROM group_chat_files gf WHERE gf.hash = f.hash)) AS orphan
    `)
    const [result] = rows
    return result
      ? { bulletin: result.bulletin, private: result.private, group: result.group, orphan: result.orphan }
      : { bulletin: 0, private: 0, group: 0, orphan: 0 }
  },

  // Delete a bulletin file: if the file is also referenced by private/group chat, only remove the bulletin reference (don't delete the file itself). If not referenced elsewhere, delete everything.
  async deleteBulletinFileSafe(hash) {
    const db = await getDB()
    const chatRefs = await db.select(
      `SELECT COUNT(*) AS c FROM (SELECT hash FROM private_chat_files WHERE hash = $1 UNION SELECT hash FROM group_chat_files WHERE hash = $1)`,
      [hash]
    )
    const hasChatRef = (chatRefs[0]?.c || 0) > 0

    await db.execute('DELETE FROM bulletin_files WHERE file_hash = $1', [hash])

    if (!hasChatRef) {
      await db.execute('DELETE FROM files WHERE hash = $1', [hash])
    }

    return { hasChatRef }
  },

  // Bulk version of deleteBulletinFileSafe
  async deleteBulletinFilesSafe(hashes) {
    const results = []
    for (const hash of hashes) {
      results.push(await this.deleteBulletinFileSafe(hash))
    }
    return results
  },

  // Management: delete a file record from DB (NOT disk file)
  async deleteFileRecord(hash) {
    const db = await getDB()
    await db.execute('DELETE FROM files WHERE hash = $1', [hash])
  },

  // Management: clear all orphaned file records (not referenced by any linking table)
  async clearOrphanedFileRecords() {
    const db = await getDB()
    await db.execute(`
      DELETE FROM files
      WHERE hash NOT IN (SELECT file_hash FROM bulletin_files)
      AND hash NOT IN (SELECT hash FROM private_chat_files)
      AND hash NOT IN (SELECT hash FROM group_chat_files)
    `)
  },

  // Management: sum of all file sizes in the files table
  async getFileSizeSum() {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select('SELECT SUM(size) AS total FROM files')
    return result ? (result.total || 0) : 0
  },

  // Management: count private messages
  async getPrivateMessageCount() {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select('SELECT COUNT(hash) AS count FROM private_messages')
    return result ? result.count : 0
  },

  // Management: count group messages
  async getGroupMessageCount() {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select('SELECT COUNT(hash) AS count FROM group_messages')
    return result ? result.count : 0
  },

  // Management: count avatars
  async getAvatarCount() {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select('SELECT COUNT(address) AS count FROM avatar_files')
    return result ? result.count : 0
  },

  // Management: sum of all avatar sizes
  async getAvatarSizeSum() {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select('SELECT SUM(size) AS total FROM avatar_files')
    return result ? (result.total || 0) : 0
  },

  // Management: count all bulletin records
  async getBulletinCount() {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select('SELECT COUNT(hash) AS count FROM bulletins')
    return result ? result.count : 0
  },

  // Management: count all file records
  async getFileCount() {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select('SELECT COUNT(hash) AS count FROM files')
    return result ? result.count : 0
  },

  // Management: get paginated file records with category info
  // category: 'all' | 'bulletin' | 'private' | 'group' | 'orphan'
  // fileExt: optional filter by file extension (e.g. 'pdf', 'jpg')
  async getFilesForManagement({ category, fileExt, page = 1, pageSize = 20 }) {
    const db = await getDB()
    const offset = (page - 1) * pageSize
    const extFilter = fileExt ? ' AND LOWER(bf.file_ext) = $3' : ''
    const extParam = fileExt ? [fileExt] : []

    switch (category) {
      case 'bulletin':
        {
          // GROUP BY f.hash because a file may be attached to multiple bulletins (duplicate rows via INNER JOIN)
          const selectCols = `SELECT f.hash, f.size, f.updated_at, f.chunk_length, f.chunk_cursor, f.is_saved, 'bulletin' AS category, MAX(bf.file_name) AS file_name, MAX(bf.file_ext) AS file_ext`
          const fromClause = `FROM files f INNER JOIN bulletin_files bf ON f.hash = bf.file_hash`
          const groupBy = ` GROUP BY f.hash`
          const orderBy = ` ORDER BY MAX(f.updated_at) DESC`
          if (fileExt) {
            const rows = await db.select(
              `${selectCols} ${fromClause} WHERE LOWER(bf.file_ext) = $1${groupBy}${orderBy} LIMIT $2 OFFSET $3`,
              [fileExt, pageSize, offset]
            )
            return rows.map(r => ({ ...r, is_saved: Int2Bool(r.is_saved) }))
          }
          const rows = await db.select(
            `${selectCols} ${fromClause}${groupBy}${orderBy} LIMIT $1 OFFSET $2`,
            [pageSize, offset]
          )
          return rows.map(r => ({ ...r, is_saved: Int2Bool(r.is_saved) }))
        }
      case 'private':
        {
          const rows = await db.select(
            `SELECT f.hash, f.size, f.updated_at, f.chunk_length, f.chunk_cursor, f.is_saved, 'private_chat' AS category FROM files f INNER JOIN private_chat_files pcf ON f.hash = pcf.hash ORDER BY f.updated_at DESC LIMIT $1 OFFSET $2`,
            [pageSize, offset]
          )
          return rows.map(r => ({ ...r, is_saved: Int2Bool(r.is_saved) }))
        }
      case 'group':
        {
          const rows = await db.select(
            `SELECT f.hash, f.size, f.updated_at, f.chunk_length, f.chunk_cursor, f.is_saved, 'group_chat' AS category FROM files f INNER JOIN group_chat_files gcf ON f.hash = gcf.hash ORDER BY f.updated_at DESC LIMIT $1 OFFSET $2`,
            [pageSize, offset]
          )
          return rows.map(r => ({ ...r, is_saved: Int2Bool(r.is_saved) }))
        }
      case 'orphan':
        {
          const rows = await db.select(
            `SELECT f.hash, f.size, f.updated_at, f.chunk_length, f.chunk_cursor, f.is_saved, 'orphan' AS category FROM files f WHERE f.hash NOT IN (SELECT file_hash FROM bulletin_files) AND f.hash NOT IN (SELECT hash FROM private_chat_files) AND f.hash NOT IN (SELECT hash FROM group_chat_files) ORDER BY f.updated_at DESC LIMIT $1 OFFSET $2`,
            [pageSize, offset]
          )
          return rows.map(r => ({ ...r, is_saved: Int2Bool(r.is_saved) }))
        }
      default:
        {
          const rows = await db.select(
            `SELECT f.hash, f.size, f.updated_at, f.chunk_length, f.chunk_cursor, f.is_saved, CASE WHEN bf.file_hash IS NOT NULL THEN 'bulletin' WHEN pcf.hash IS NOT NULL THEN 'private_chat' WHEN gcf.hash IS NOT NULL THEN 'group_chat' ELSE 'orphan' END AS category, COALESCE(bf.file_name, f.hash) AS file_name, bf.file_ext AS file_ext FROM files f LEFT JOIN bulletin_files bf ON f.hash = bf.file_hash LEFT JOIN private_chat_files pcf ON f.hash = pcf.hash LEFT JOIN group_chat_files gcf ON f.hash = gcf.hash WHERE 1=1${extFilter} ORDER BY f.updated_at DESC LIMIT $1 OFFSET $2`,
            [pageSize, offset, ...extParam]
          )
          return rows.map(r => ({ ...r, is_saved: Int2Bool(r.is_saved) }))
        }
    }
  },

  // Management: get all unique file extensions from bulletin_files
  async getAllFileExtensions() {
    const db = await getDB()
    const rows = await db.select(`SELECT DISTINCT LOWER(bf.file_ext) AS file_ext FROM bulletin_files bf WHERE bf.file_ext IS NOT NULL AND bf.file_ext != '' ORDER BY file_ext`)
    return rows.map(r => r.file_ext.toLowerCase())
  },

  // Management: remove all DB references to a file (bulletin_files, private_chat_files, group_chat_files)
  async removeFileReferences(hash) {
    const db = await getDB()
    await db.execute('DELETE FROM bulletin_files WHERE file_hash = $1', [hash])
    await db.execute('DELETE FROM private_chat_files WHERE hash = $1', [hash])
    await db.execute('DELETE FROM group_chat_files WHERE hash = $1', [hash])
  },

  // Management: get orphaned file hashes (not referenced by any linking table)
  async getOrphanedFileHashes() {
    const dbInstance = await getDB()
    const rows = await dbInstance.select(
      `SELECT hash FROM files WHERE hash NOT IN (SELECT file_hash FROM bulletin_files) AND hash NOT IN (SELECT hash FROM private_chat_files) AND hash NOT IN (SELECT hash FROM group_chat_files)`
    )
    return rows.map(r => r.hash)
  },

  // Management: count files matching category (for pagination)
  async getFileCountForManagement({ category, fileExt }) {
    const db = await getDB()
    const extFilter = fileExt ? ' AND LOWER(bf.file_ext) = $1' : ''
    const extParam = fileExt ? [fileExt] : []

    switch (category) {
      case 'bulletin':
        {
          const params = [...extParam]
          const [result] = await db.select(`SELECT COUNT(DISTINCT f.hash) AS count FROM files f INNER JOIN bulletin_files bf ON f.hash = bf.file_hash WHERE 1=1${extFilter}`, params)
          return result ? result.count : 0
        }
      case 'private':
        {
          const [result] = await db.select('SELECT COUNT(DISTINCT f.hash) AS count FROM files f INNER JOIN private_chat_files pcf ON f.hash = pcf.hash')
          return result ? result.count : 0
        }
      case 'group':
        {
          const [result] = await db.select('SELECT COUNT(DISTINCT f.hash) AS count FROM files f INNER JOIN group_chat_files gcf ON f.hash = gcf.hash')
          return result ? result.count : 0
        }
      case 'orphan':
        {
          const [result] = await db.select(
            `SELECT COUNT(hash) AS count FROM files WHERE hash NOT IN (SELECT file_hash FROM bulletin_files) AND hash NOT IN (SELECT hash FROM private_chat_files) AND hash NOT IN (SELECT hash FROM group_chat_files)`
          )
          return result ? result.count : 0
        }
      default:
        {
          const params = [...extParam]
          const [result] = await db.select(`SELECT COUNT(DISTINCT f.hash) AS count FROM files f LEFT JOIN bulletin_files bf ON f.hash = bf.file_hash WHERE 1=1${extFilter}`, params)
          return result ? result.count : 0
        }
    }
  },

  // Management: bulk delete file records by hash array, removing references first
  async deleteFilesByHashes(hashes) {
    const db = await getDB()
    let deleted = 0
    for (const hash of hashes) {
      await this.removeFileReferences(hash)
      await db.execute('DELETE FROM files WHERE hash = $1', [hash])
      deleted++
    }
    return deleted
  },

  // Management: get files older than a given number of days, paginated
  async getFilesOlderThan({ daysAgo, page = 1, pageSize = 20 }) {
    const db = await getDB()
    const offset = (page - 1) * pageSize
    const cutoffTimestamp = Math.floor((Date.now() - daysAgo * 86400000) / 1000)

    const rows = await db.select(
      `SELECT f.hash, f.size, f.updated_at, f.chunk_length, f.chunk_cursor, f.is_saved, CASE WHEN bf.file_hash IS NOT NULL THEN 'bulletin' WHEN pcf.hash IS NOT NULL THEN 'private_chat' WHEN gcf.hash IS NOT NULL THEN 'group_chat' ELSE 'orphan' END AS category, COALESCE(bf.file_name, f.hash) AS file_name, bf.file_ext AS file_ext FROM files f LEFT JOIN bulletin_files bf ON f.hash = bf.file_hash LEFT JOIN private_chat_files pcf ON f.hash = pcf.hash LEFT JOIN group_chat_files gcf ON f.hash = gcf.hash WHERE f.updated_at <= $1 ORDER BY f.updated_at DESC LIMIT $2 OFFSET $3`,
      [cutoffTimestamp, pageSize, offset]
    )
    return rows.map(r => ({ ...r, is_saved: Int2Bool(r.is_saved) }))
  },

  // Management: avatar storage stats (count + total size from avatar_files)
  async getAvatarStorageStats() {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select(
      'SELECT COUNT(address) AS count, SUM(size) AS total_size FROM avatar_files'
    )
    return result
      ? { count: result.count, totalSize: result.total_size || 0 }
      : { count: 0, totalSize: 0 }
  },
}
