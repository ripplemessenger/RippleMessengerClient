import { Bool2Int } from '../lib/AppUtil'
import { MessagePageSize } from '../lib/AppConst'
import { Epoch, MessageObjectType } from '../lib/MessengerConst'
import { privateMessage2Display } from '../lib/MessengerUtil'
import { getDB } from './core'

export const api = {
  async getPrivateSession(sour, dest) {
    const dbInstance = await getDB()
    // UNION ALL instead of `(sour=? AND dest=?) OR (sour=? AND dest=?)`.
    // SQLite does resolve that OR via MULTI-INDEX OR, but it then has to sort
    // every matching row in a temp B-tree before applying ORDER BY. Splitting
    // into two index-ordered branches keeps the cost proportional to the page,
    // not to the length of the conversation (50k-msg chat: 10.8ms -> 0.05ms).
    // When sour === dest both branches would match the same rows, so collapse
    // to a single branch there.
    const sql =
      sour === dest
        ? 'SELECT * FROM private_messages WHERE sour = $1 AND dest = $2 ORDER BY signed_at ASC'
        : `SELECT * FROM private_messages WHERE sour = $1 AND dest = $2
           UNION ALL
           SELECT * FROM private_messages WHERE sour = $2 AND dest = $1
           ORDER BY signed_at ASC`
    let msgs = await dbInstance.select(sql, [sour, dest])
    for (let i = 0; i < msgs.length; i++) {
      msgs[i] = privateMessage2Display(msgs[i])
    }
    return msgs
  },

  /**
   * Paged variant of getPrivateSession: returns at most `limit` messages, the
   * NEWEST ones, re-sorted ascending for display.
   *
   * The unpaged getPrivateSession() loads the entire conversation on every
   * refresh, which made an open chat O(n) per incoming message. Callers that
   * render a scrollback should use this one and page backwards with
   * `beforeSignedAt` (the signed_at of the oldest message currently displayed).
   *
   * @param {string} sour - One side of the conversation
   * @param {string} dest - The other side
   * @param {{limit?: number, beforeSignedAt?: number|null}} [opts]
   * @returns {Promise<Array>} Display-ready messages, oldest first
   */
  async getPrivateSessionPage(sour, dest, { limit = MessagePageSize, beforeSignedAt = null, beforeHash = null } = {}) {
    const dbInstance = await getDB()
    const params = [sour, dest]
    let filter = ''
    if (beforeSignedAt !== null && beforeSignedAt !== undefined) {
      if (beforeHash) {
        // Compound cursor: signed_at alone can repeat (same millisecond), which
        // would silently skip messages when paging back. Tiebreak on hash so the
        // cursor is a strict total order and matches the ORDER BY below.
        params.push(beforeSignedAt, beforeHash)
        const tsIdx = params.length - 1
        const hashIdx = params.length
        filter = ` AND (signed_at < $${tsIdx} OR (signed_at = $${tsIdx} AND hash < $${hashIdx}))`
      } else {
        params.push(beforeSignedAt)
        filter = ` AND signed_at < $${params.length}`
      }
    }
    params.push(limit)
    const limitIdx = params.length
    // Two index-ordered branches instead of one OR — see getPrivateSession.
    // Collapsed to one branch when sour === dest (both would match the same rows).
    const inner =
      sour === dest
        ? `SELECT * FROM private_messages WHERE sour = $1 AND dest = $2${filter}`
        : `SELECT * FROM private_messages WHERE sour = $1 AND dest = $2${filter}
           UNION ALL
           SELECT * FROM private_messages WHERE sour = $2 AND dest = $1${filter}`
    const sql = `SELECT * FROM (${inner} ORDER BY signed_at DESC, hash DESC LIMIT $${limitIdx}) ORDER BY signed_at ASC, hash ASC`
    let msgs = await dbInstance.select(sql, params)
    for (let i = 0; i < msgs.length; i++) {
      msgs[i] = privateMessage2Display(msgs[i])
    }
    return msgs
  },

  /**
   * Per-peer session summaries in ONE query: unread count + last activity, for
   * every conversation this address takes part in.
   *
   * Replaces the previous per-peer pair of queries in LoadSessionList (which ran
   * 2×N queries on every incoming message).
   * @param {string} address - Local address
   * @returns {Promise<Object<string, {unread: number, last_signed_at: number}>>} Map keyed by peer address
   */
  async getPrivateSessionSummaries(address) {
    const dbInstance = await getDB()
    const rows = await dbInstance.select(
      `SELECT
         CASE WHEN sour = $1 THEN dest ELSE sour END AS peer,
         SUM(CASE WHEN is_readed = 0 THEN 1 ELSE 0 END) AS unread,
         MAX(signed_at) AS last_signed_at
       FROM private_messages
       WHERE sour = $1 OR dest = $1
       GROUP BY peer`,
      [address]
    )
    const summaries = {}
    for (const row of rows) {
      summaries[row.peer] = { unread: row.unread, last_signed_at: row.last_signed_at }
    }
    return summaries
  },

  /**
   * Fetch a single private message by hash (used to append one incoming message
   * to the open session without re-reading the whole conversation).
   * @param {string} hash - Message hash
   * @returns {Promise<Object|null>} Display-ready message, or null
   */
  async getPrivateMessageByHash(hash) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select('SELECT * FROM private_messages WHERE hash = $1 LIMIT 1', [hash])
    return msgs.length > 0 ? privateMessage2Display(msgs[0]) : null
  },

  async getPrivateNewMessageCount(sour, dest) {
    const dbInstance = await getDB()
    const unread = Bool2Int(false)
    // Two indexed counts instead of COUNT(DISTINCT hash) over an OR.
    // hash is the primary key, so the two directions are disjoint and the counts
    // can simply be added — except when sour === dest, where both branches would
    // match the same rows.
    const sql =
      sour === dest
        ? 'SELECT COUNT(*) AS count FROM private_messages WHERE sour = $1 AND dest = $2 AND is_readed = $3'
        : `SELECT ((SELECT COUNT(*) FROM private_messages WHERE sour = $1 AND dest = $2 AND is_readed = $3)
                 + (SELECT COUNT(*) FROM private_messages WHERE sour = $2 AND dest = $1 AND is_readed = $3)) AS count`
    const [result] = await dbInstance.select(sql, [sour, dest, unread])
    return result ? result.count : 0
  },

  async readPrivateSession(sour, dest) {
    const db = await getDB()
    const read = Bool2Int(true)
    // Two index-backed UPDATEs instead of one OR-scan — see getPrivateSession.
    await db.execute('UPDATE private_messages SET is_readed = $3 WHERE sour = $1 AND dest = $2', [sour, dest, read])
    await db.execute('UPDATE private_messages SET is_readed = $3 WHERE sour = $2 AND dest = $1', [sour, dest, read])
  },

  async getLastPrivateMessageSignedAt(sour, dest) {
    const dbInstance = await getDB()
    const [row] = await dbInstance.select(
      `SELECT MAX(signed_at) AS last FROM (
         SELECT signed_at FROM private_messages WHERE sour = $1 AND dest = $2
         UNION ALL
         SELECT signed_at FROM private_messages WHERE sour = $2 AND dest = $1
       )`,
      [sour, dest]
    )
    return row && row.last !== null && row.last !== undefined ? row.last : Epoch
  },

  async getLastPrivateMessage(sour, dest) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM private_messages WHERE sour = $1 AND dest = $2 ORDER BY sequence DESC LIMIT 1',
      [sour, dest]
    )
    return msgs.length > 0 ? privateMessage2Display(msgs[0]) : null
  },

  async getLastConfirmPrivateMessage(sour, dest) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM private_messages WHERE sour = $1 AND dest = $2 AND is_confirmed = $3 ORDER BY sequence DESC LIMIT 1',
      [sour, dest, Bool2Int(true)]
    )
    return msgs.length > 0 ? privateMessage2Display(msgs[0]) : null
  },

  async getLastUnconfirmPrivateMessage(sour, dest) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM private_messages WHERE sour = $1 AND dest = $2 AND is_confirmed = $3 ORDER BY sequence DESC LIMIT 1',
      [sour, dest, Bool2Int(false)]
    )
    return msgs.length > 0 ? privateMessage2Display(msgs[0]) : null
  },

  async getUnsyncPrivateSession(sour, dest, self_sequence, pair_sequence) {
    const dbInstance = await getDB()
    // Two index-backed branches with independent cut-offs per direction
    // (self_sequence for the self→dest chain, pair_sequence for dest→self).
    // `signed_at` is selected explicitly so the compound ORDER BY can reference it.
    // Collapsed to one branch when sour === dest (both would match the same rows).
    const sql =
      sour === dest
        ? `SELECT json, signed_at FROM private_messages WHERE sour = $1 AND dest = $2 AND sequence > $3 ORDER BY signed_at ASC`
        : `SELECT json, signed_at FROM private_messages WHERE sour = $1 AND dest = $2 AND sequence > $3
           UNION ALL
           SELECT json, signed_at FROM private_messages WHERE sour = $2 AND dest = $1 AND sequence > $4
           ORDER BY signed_at ASC`
    return await dbInstance.select(sql, [sour, dest, self_sequence, pair_sequence])
  },

  async addPrivateMessage(
    hash,
    sour,
    dest,
    sequence,
    pre_hash,
    content,
    json,
    signed_at,
    is_confirmed,
    is_marked,
    is_readed,
    is_object
  ) {
    const db = await getDB()
    await db.execute(
      'INSERT INTO private_messages (hash, sour, dest, sequence, pre_hash, content, json, signed_at, is_confirmed, is_marked, is_readed, is_object, object_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [
        hash,
        sour,
        dest,
        sequence,
        pre_hash,
        is_object ? JSON.stringify(content) : content,
        JSON.stringify(json),
        signed_at,
        Bool2Int(is_confirmed),
        Bool2Int(is_marked),
        Bool2Int(is_readed),
        Bool2Int(is_object),
        is_object ? content.ObjectType : MessageObjectType.NotObject
      ]
    )
    return true
  },

  async confirmPrivateMessage(sour, dest, sequence) {
    const db = await getDB()
    await db.execute('UPDATE private_messages SET is_confirmed = $1 WHERE sour = $2 AND dest = $3 AND sequence <= $4', [
      Bool2Int(true),
      sour,
      dest,
      sequence
    ])
  }
}
