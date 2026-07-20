import { Bool2Int, Int2Bool } from '../lib/AppUtil'
import { BulletinPageSize } from '../lib/AppConst'
import { bulletin2Display } from '../lib/MessengerUtil'
import { getDB } from './core'

export const api = {
  async getPortalBulletins(page) {
    const dbInstance = await getDB()
    let bulletins = await dbInstance.select(
      `SELECT * FROM bulletins ORDER BY signed_at DESC LIMIT ${BulletinPageSize} OFFSET ${(page - 1) * BulletinPageSize}`
    )
    for (let i = 0; i < bulletins.length; i++) {
      bulletins[i] = bulletin2Display(bulletins[i])
    }
    return bulletins
  },

  async getPortalBulletinCount() {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select(`SELECT COUNT(hash) as count FROM bulletins`)
    return result ? result.count : 0
  },

  async getAddressBulletins(address, page) {
    const dbInstance = await getDB()
    let bulletins = await dbInstance.select(
      `SELECT * FROM bulletins WHERE address = $1 ORDER BY sequence DESC LIMIT ${BulletinPageSize} OFFSET ${(page - 1) * BulletinPageSize}`,
      [address]
    )
    for (let i = 0; i < bulletins.length; i++) {
      bulletins[i] = bulletin2Display(bulletins[i])
    }
    return bulletins
  },

  async getAddressBulletinCount(address) {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select(
      `SELECT COUNT(hash) as count FROM bulletins WHERE address = $1`,
      [address]
    )
    return result ? result.count : 0
  },

  async getBulletinListByAddresses(addresses, page, order) {
    if (!Array.isArray(addresses) || addresses.length === 0) return []
    const sortDirection = (order && order.toUpperCase() === 'ASC') ? 'ASC' : 'DESC'
    const dbInstance = await getDB()
    const placeholders = addresses.map((_, i) => `$${i + 1}`).join(', ')
    const query = `SELECT * FROM bulletins WHERE address IN (${placeholders}) ORDER BY signed_at ${sortDirection} LIMIT ${BulletinPageSize} OFFSET ${(page - 1) * BulletinPageSize}`
    let bulletins = await dbInstance.select(query, addresses)
    for (let i = 0; i < bulletins.length; i++) {
      bulletins[i] = bulletin2Display(bulletins[i])
    }
    return bulletins
  },

  async getBulletinCountByAddresses(addresses) {
    if (!Array.isArray(addresses) || addresses.length === 0) return 0
    const dbInstance = await getDB()
    const placeholders = addresses.map((_, i) => `$${i + 1}`).join(', ')
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
      bulletins[i] = bulletin2Display(bulletins[i])
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
    if (!Array.isArray(hashes) || hashes.length === 0) return []
    const dbInstance = await getDB()
    const placeholders = hashes.map((_, i) => `$${i + 1}`).join(', ')
    const query = `SELECT * FROM bulletins WHERE hash IN (${placeholders}) ORDER BY signed_at`
    let bulletins = await dbInstance.select(query, hashes)
    for (let i = 0; i < bulletins.length; i++) {
      bulletins[i] = bulletin2Display(bulletins[i])
    }
    return bulletins
  },

  async getBulletinByHash(hash) {
    const dbInstance = await getDB()
    const bulletins = await dbInstance.select(
      'SELECT * FROM bulletins WHERE hash = $1 LIMIT 1',
      [hash]
    )
    return bulletins.length > 0 ? bulletin2Display(bulletins[0]) : null
  },

  async getBulletinBySequence(address, sequence) {
    const dbInstance = await getDB()
    const bulletins = await dbInstance.select(
      'SELECT * FROM bulletins WHERE address = $1 AND sequence = $2 LIMIT 1',
      [address, sequence]
    )
    return bulletins.length > 0 ? bulletin2Display(bulletins[0]) : null
  },

  async getLastBulletin(address) {
    const dbInstance = await getDB()
    const bulletins = await dbInstance.select(
      'SELECT * FROM bulletins WHERE address = $1 ORDER BY sequence DESC LIMIT 1',
      [address]
    )
    return bulletins.length > 0 ? bulletin2Display(bulletins[0]) : null
  },

  async getLastBulletinByAddresses(addresses) {
    if (!Array.isArray(addresses) || addresses.length === 0) return {}
    const dbInstance = await getDB()
    const placeholders = addresses.map((_, i) => `$${i + 1}`).join(', ')
    const query = `
      SELECT b.*
      FROM bulletins b
      INNER JOIN (
        SELECT address, MAX(sequence) AS max_seq
        FROM bulletins
        WHERE address IN (${placeholders})
        GROUP BY address
      ) mx ON b.address = mx.address AND b.sequence = mx.max_seq
    `
    const rows = await dbInstance.select(query, addresses)
    const result = {}
    for (const row of rows) {
      result[row.address] = bulletin2Display(row)
    }
    return result
  },

  async getBulletinSequencesBatch(pairs) {
    if (!Array.isArray(pairs) || pairs.length === 0) return []
    const dbInstance = await getDB()
    const tupleStrs = pairs.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
    const values = []
    for (const p of pairs) {
      values.push(p.address, p.sequence)
    }
    const query = `
      SELECT address, sequence
      FROM bulletins
      WHERE (address, sequence) IN (${tupleStrs})
    `
    const rows = await dbInstance.select(query, values)
    return new Set(rows.map(r => `${r.address}:${r.sequence}`))
  },

  async addBulletin(hash, address, sequence, pre_hash, content, json, signed_at) {
    const db = await getDB()
    await db.execute(
      'INSERT INTO bulletins (hash, address, sequence, pre_hash, content, json, signed_at, is_marked) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [hash, address, sequence, pre_hash, content, JSON.stringify(json), signed_at, Bool2Int(false)]
    )
    return true
  },

  async toggleBulletinMark(hash, is_marked) {
    const db = await getDB()
    await db.execute(
      'UPDATE bulletins SET is_marked = $1 WHERE hash = $2',
      [Bool2Int(is_marked), hash]
    )
  },

  // bulletin reply
  async getReplyHashListByBulletinHash(hash, page) {
    const dbInstance = await getDB()
    const bulletins = await dbInstance.select(
      `SELECT reply_hash FROM bulletin_replys WHERE bulletin_hash = $1 ORDER BY reply_signed_at DESC LIMIT ${BulletinPageSize} OFFSET ${(page - 1) * BulletinPageSize}`,
      [hash]
    )
    return bulletins.map(b => b.reply_hash)
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
    if (!Array.isArray(bulletins) || bulletins.length === 0) return true
    const db = await getDB()
    for (const bulletin of bulletins) {
      await db.execute(
        `INSERT OR IGNORE INTO bulletin_replys (bulletin_hash, reply_hash, reply_signed_at) VALUES ($1, $2, $3)`,
        [bulletin.Hash, reply_hash, reply_signed_at]
      )
    }
  },

  // bulletin tag
  async getBulletinHashListByTagId(ids, page) {
    if (!Array.isArray(ids) || ids.length === 0) return []
    const dbInstance = await getDB()
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')
    const query = `SELECT DISTINCT bulletin_hash FROM bulletin_tags WHERE tag_id IN(${placeholders}) ORDER BY bulletin_signed_at DESC LIMIT ${BulletinPageSize} OFFSET ${(page - 1) * BulletinPageSize}`
    const bulletins = await dbInstance.select(query, ids)
    return bulletins.map(b => b.bulletin_hash)
  },

  async getBulletinHashCountByTagId(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return 0
    const dbInstance = await getDB()
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')
    const query = `SELECT COUNT(DISTINCT bulletin_hash) as count FROM bulletin_tags WHERE tag_id IN(${placeholders})`
    const [result] = await dbInstance.select(query, ids)
    return result ? result.count : 0
  },

  async addTagsToBulletin(bulletin_hash, bulletin_signed_at, tagNames) {
    if (!Array.isArray(tagNames) || tagNames.length === 0) return true
    const db = await getDB()
    for (const rawName of tagNames) {
      const name = rawName.trim()
      if (!name) continue
      await db.execute(`INSERT OR IGNORE INTO tags (name) VALUES ($1)`, [name])
      const [row] = await db.select("SELECT id FROM tags WHERE name = $1", [name])
      const tagId = row?.id
      if (!tagId) continue
      await db.execute(
        `INSERT OR IGNORE INTO bulletin_tags (bulletin_hash, bulletin_signed_at, tag_id) VALUES ($1, $2, $3)`,
        [bulletin_hash, bulletin_signed_at, tagId]
      )
    }
  },

  async addFilesToBulletin(bulletin_hash, files) {
    if (!Array.isArray(files) || files.length === 0) return true
    const db = await getDB()
    for (const file of files) {
      await db.execute(
        `INSERT OR IGNORE INTO bulletin_files (bulletin_hash, file_hash, file_size, file_name, file_ext) VALUES ($1, $2, $3, $4, $5)`,
        [bulletin_hash, file.Hash, file.Size, file.Name, file.Ext]
      )
    }
  },

  // tag
  async getTagIdListByName(names) {
    if (!Array.isArray(names) || names.length === 0) return []
    const dbInstance = await getDB()
    const placeholders = names.map((_, i) => `$${i + 1}`).join(', ')
    const query = `SELECT id FROM tags WHERE name IN(${placeholders})`
    const tags = await dbInstance.select(query, names)
    return tags.map(tag => tag.id)
  },

  async addTag(name) {
    const db = await getDB()
    await db.execute("INSERT OR IGNORE INTO tags (name) VALUES ($1)", [name])
  },

  // Management: delete a single bulletin by hash (CASCADE handles replies/tags/files)
  async deleteBulletin(hash) {
    const db = await getDB()
    await db.execute('DELETE FROM bulletins WHERE hash = $1', [hash])
  },

  // Management: bulk delete bulletins by hash array
  async deleteBulletinsByHashes(hashes) {
    if (!Array.isArray(hashes) || hashes.length === 0) return 0
    const db = await getDB()
    let deleted = 0
    for (const hash of hashes) {
      await db.execute('DELETE FROM bulletins WHERE hash = $1', [hash])
      deleted++
    }
    return deleted
  },

  // Management: get all bulletins for management view with filter
  // filter: 'all' | 'mine' | 'followed' | 'bookmarked'
  // sortOrder: 'desc' (default) | 'asc'
  async getBulletinsForManagement({ filter, address, page = 1, pageSize = BulletinPageSize, sortOrder = 'desc' }) {
    const db = await getDB()
    const offset = (page - 1) * pageSize
    const sortDir = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC'
    let query, params

    switch (filter) {
      case 'mine':
        query = `SELECT b.hash, b.address, b.sequence, c.nickname, SUBSTR(b.content, 1, 100) AS content_preview, b.signed_at, b.is_marked FROM bulletins b LEFT JOIN contacts c ON b.address = c.address WHERE b.address = $1 ORDER BY b.signed_at ${sortDir} LIMIT $2 OFFSET $3`
        params = [address, pageSize, offset]
        break
      case 'followed':
        query = `SELECT b.hash, b.address, b.sequence, c.nickname, SUBSTR(b.content, 1, 100) AS content_preview, b.signed_at, b.is_marked FROM bulletins b INNER JOIN follows f ON b.address = f.remote LEFT JOIN contacts c ON b.address = c.address WHERE f.local = $1 ORDER BY b.signed_at ${sortDir} LIMIT $2 OFFSET $3`
        params = [address, pageSize, offset]
        break
      case 'bookmarked':
        query = `SELECT b.hash, b.address, b.sequence, c.nickname, SUBSTR(b.content, 1, 100) AS content_preview, b.signed_at, b.is_marked FROM bulletins b LEFT JOIN contacts c ON b.address = c.address WHERE b.is_marked = $1 ORDER BY b.signed_at ${sortDir} LIMIT $2 OFFSET $3`
        params = [Bool2Int(true), pageSize, offset]
        break
      default:
        query = `SELECT b.hash, b.address, b.sequence, c.nickname, SUBSTR(b.content, 1, 100) AS content_preview, b.signed_at, b.is_marked, (SELECT COUNT(f.remote) > 0 FROM follows f WHERE f.remote = b.address AND f.local = $1) AS is_followed FROM bulletins b LEFT JOIN contacts c ON b.address = c.address ORDER BY b.signed_at ${sortDir} LIMIT $2 OFFSET $3`
        params = [address, pageSize, offset]
        break
    }

    const rows = await db.select(query, params)
    return rows.map(r => ({
      ...r,
      is_marked: Int2Bool(r.is_marked),
      is_followed: r.is_followed !== undefined ? Int2Bool(r.is_followed) : false,
    }))
  },

  // Management: get count of bulletins matching filter
  async getBulletinCountForManagement({ filter, address }) {
    const db = await getDB()
    let query, params

    switch (filter) {
      case 'mine':
        query = `SELECT COUNT(hash) AS count FROM bulletins WHERE address = $1`
        params = [address]
        break
      case 'followed':
        query = `SELECT COUNT(b.hash) AS count FROM bulletins b INNER JOIN follows f ON b.address = f.remote WHERE f.local = $1`
        params = [address]
        break
      case 'bookmarked':
        query = `SELECT COUNT(hash) AS count FROM bulletins WHERE is_marked = $1`
        params = [Bool2Int(true)]
        break
      default:
        query = `SELECT COUNT(hash) AS count FROM bulletins`
        params = []
        break
    }

    const [result] = await db.select(query, params)
    return result ? result.count : 0
  },

  // Management: search bulletins with LIKE query and filter
  async searchBulletinsForManagement({ query, filter, address, page = 1, pageSize = BulletinPageSize }) {
    const db = await getDB()
    const offset = (page - 1) * pageSize
    let querySql, params

    const hasSearch = query && query.trim().length > 0
    const likePattern = `%${query.trim()}%`

    switch (filter) {
      case 'mine':
        if (hasSearch) {
          querySql = `SELECT b.hash, b.address, b.sequence, c.nickname, SUBSTR(b.content, 1, 100) AS content_preview, b.signed_at, b.is_marked FROM bulletins b LEFT JOIN contacts c ON b.address = c.address WHERE b.address = $1 AND b.content LIKE $2 ORDER BY b.signed_at DESC LIMIT $3 OFFSET $4`
          params = [address, likePattern, pageSize, offset]
        } else {
          querySql = `SELECT b.hash, b.address, b.sequence, c.nickname, SUBSTR(b.content, 1, 100) AS content_preview, b.signed_at, b.is_marked FROM bulletins b LEFT JOIN contacts c ON b.address = c.address WHERE b.address = $1 ORDER BY b.signed_at DESC LIMIT $2 OFFSET $3`
          params = [address, pageSize, offset]
        }
        break
      case 'followed':
        if (hasSearch) {
          querySql = `SELECT b.hash, b.address, b.sequence, c.nickname, SUBSTR(b.content, 1, 100) AS content_preview, b.signed_at, b.is_marked FROM bulletins b INNER JOIN follows f ON b.address = f.remote LEFT JOIN contacts c ON b.address = c.address WHERE f.local = $1 AND b.content LIKE $2 ORDER BY b.signed_at DESC LIMIT $3 OFFSET $4`
          params = [address, likePattern, pageSize, offset]
        } else {
          querySql = `SELECT b.hash, b.address, b.sequence, c.nickname, SUBSTR(b.content, 1, 100) AS content_preview, b.signed_at, b.is_marked FROM bulletins b INNER JOIN follows f ON b.address = f.remote LEFT JOIN contacts c ON b.address = c.address WHERE f.local = $1 ORDER BY b.signed_at DESC LIMIT $2 OFFSET $3`
          params = [address, pageSize, offset]
        }
        break
      case 'bookmarked':
        if (hasSearch) {
          querySql = `SELECT b.hash, b.address, b.sequence, c.nickname, SUBSTR(b.content, 1, 100) AS content_preview, b.signed_at, b.is_marked FROM bulletins b LEFT JOIN contacts c ON b.address = c.address WHERE b.is_marked = $1 AND b.content LIKE $2 ORDER BY b.signed_at DESC LIMIT $3 OFFSET $4`
          params = [Bool2Int(true), likePattern, pageSize, offset]
        } else {
          querySql = `SELECT b.hash, b.address, b.sequence, c.nickname, SUBSTR(b.content, 1, 100) AS content_preview, b.signed_at, b.is_marked FROM bulletins b LEFT JOIN contacts c ON b.address = c.address WHERE b.is_marked = $1 ORDER BY b.signed_at DESC LIMIT $2 OFFSET $3`
          params = [Bool2Int(true), pageSize, offset]
        }
        break
      default: // 'all'
        if (hasSearch) {
          querySql = `SELECT b.hash, b.address, b.sequence, c.nickname, SUBSTR(b.content, 1, 100) AS content_preview, b.signed_at, b.is_marked, (SELECT COUNT(f.remote) > 0 FROM follows f WHERE f.remote = b.address AND f.local = $1) AS is_followed FROM bulletins b LEFT JOIN contacts c ON b.address = c.address WHERE b.content LIKE $2 ORDER BY b.signed_at DESC LIMIT $3 OFFSET $4`
          params = [address, likePattern, pageSize, offset]
        } else {
          querySql = `SELECT b.hash, b.address, b.sequence, c.nickname, SUBSTR(b.content, 1, 100) AS content_preview, b.signed_at, b.is_marked, (SELECT COUNT(f.remote) > 0 FROM follows f WHERE f.remote = b.address AND f.local = $1) AS is_followed FROM bulletins b LEFT JOIN contacts c ON b.address = c.address ORDER BY b.signed_at DESC LIMIT $2 OFFSET $3`
          params = [address, pageSize, offset]
        }
        break
    }

    const rows = await db.select(querySql, params)
    return rows.map(r => ({
      ...r,
      is_marked: Int2Bool(r.is_marked),
      is_followed: r.is_followed !== undefined ? Int2Bool(r.is_followed) : false,
    }))
  },

  // Management: get bulletins associated with a specific tag
  async getBulletinsByTag({ tagName, page = 1, pageSize = BulletinPageSize }) {
    const db = await getDB()
    const offset = (page - 1) * pageSize
    const querySql = `
      SELECT b.hash, b.address, b.sequence, SUBSTR(b.content, 1, 100) AS content_preview, b.signed_at, b.is_marked, LENGTH(b.json) AS estimated_size
      FROM bulletins b
      INNER JOIN bulletin_tags bt ON b.hash = bt.bulletin_hash
      INNER JOIN tags t ON bt.tag_id = t.id
      WHERE t.name = $1
      ORDER BY b.signed_at DESC
      LIMIT $2 OFFSET $3
    `
    const rows = await db.select(querySql, [tagName, pageSize, offset])
    return rows.map(r => ({
      ...r,
      is_marked: Int2Bool(r.is_marked),
    }))
  },

  // Management: get all distinct tag names for dropdown selection
  async getAllTags() {
    const db = await getDB()
    const rows = await db.select(`SELECT DISTINCT name FROM tags ORDER BY name`)
    return rows.map(r => r.name)
  },

  // Management: count bulletins matching search query + filter (for pagination)
  async getBulletinSearchCountForManagement({ query, filter, address }) {
    const db = await getDB()
    const hasSearch = query && query.trim().length > 0
    const likePattern = `%${query.trim()}%`

    let querySql, params

    switch (filter) {
      case 'mine':
        if (hasSearch) {
          querySql = `SELECT COUNT(hash) AS count FROM bulletins WHERE address = $1 AND content LIKE $2`
          params = [address, likePattern]
        } else {
          querySql = `SELECT COUNT(hash) AS count FROM bulletins WHERE address = $1`
          params = [address]
        }
        break
      case 'followed':
        if (hasSearch) {
          querySql = `SELECT COUNT(b.hash) AS count FROM bulletins b INNER JOIN follows f ON b.address = f.remote WHERE f.local = $1 AND b.content LIKE $2`
          params = [address, likePattern]
        } else {
          querySql = `SELECT COUNT(b.hash) AS count FROM bulletins b INNER JOIN follows f ON b.address = f.remote WHERE f.local = $1`
          params = [address]
        }
        break
      case 'bookmarked':
        if (hasSearch) {
          querySql = `SELECT COUNT(hash) AS count FROM bulletins WHERE is_marked = $1 AND content LIKE $2`
          params = [Bool2Int(true), likePattern]
        } else {
          querySql = `SELECT COUNT(hash) AS count FROM bulletins WHERE is_marked = $1`
          params = [Bool2Int(true)]
        }
        break
      default:
        if (hasSearch) {
          querySql = `SELECT COUNT(hash) AS count FROM bulletins WHERE content LIKE $1`
          params = [likePattern]
        } else {
          querySql = `SELECT COUNT(hash) AS count FROM bulletins`
          params = []
        }
        break
    }

    const [result] = await db.select(querySql, params)
    return result ? result.count : 0
  },

  // Management: delete all bulletins (CASCADE handles replies/tags/linking tables)
  async clearAllBulletins() {
    const db = await getDB()
    const [result] = await db.select('SELECT COUNT(hash) AS count FROM bulletins')
    const count = result ? result.count : 0
    await db.execute('DELETE FROM bulletins')
    return count
  },

  // Management: find all bulletins that reference a given file hash
  async getBulletinsByFileHash(file_hash) {
    const dbInstance = await getDB()
    const rows = await dbInstance.select(
      `SELECT b.hash, b.address, b.sequence, SUBSTR(b.content, 1, 80) AS content_preview, b.signed_at, bf.file_name, bf.file_ext FROM bulletins b INNER JOIN bulletin_files bf ON b.hash = bf.bulletin_hash WHERE bf.file_hash = $1 ORDER BY b.signed_at DESC`,
      [file_hash]
    )
    return rows
  },
}
