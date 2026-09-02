import { getDB } from './core'

// Search plain-text messages (private + group) by content LIKE query.
// Returns rows: { msg_type, peer, peer_name, sender, sender_name, content_preview, signed_at }
//   - private: peer = the other party's address, peer_name = contact nickname (if any)
//   - group:   peer = group hash, peer_name = group name
export const api = {
  async searchMessages({ query, address, page = 1, pageSize = 20 }) {
    const db = await getDB()
    const offset = (page - 1) * pageSize
    const likePattern = `%${query.trim()}%`
    const memberPattern = `%${address}%`

    const querySql = `
      SELECT 'private' AS msg_type,
             CASE WHEN pm.sour = $1 THEN pm.dest ELSE pm.sour END AS peer,
             c1.nickname AS peer_name,
             pm.sour AS sender,
             c2.nickname AS sender_name,
             SUBSTR(pm.content, 1, 100) AS content_preview,
             pm.signed_at
      FROM private_messages pm
      LEFT JOIN contacts c1 ON c1.address = CASE WHEN pm.sour = $1 THEN pm.dest ELSE pm.sour END
      LEFT JOIN contacts c2 ON c2.address = pm.sour
      WHERE (pm.sour = $1 OR pm.dest = $1)
        AND pm.is_object = 0
        AND pm.content LIKE $2

      UNION ALL

      SELECT 'group' AS msg_type,
             gm.group_hash AS peer,
             g.name AS peer_name,
             gm.address AS sender,
             c.nickname AS sender_name,
             SUBSTR(gm.content, 1, 100) AS content_preview,
             gm.signed_at
      FROM group_messages gm
      INNER JOIN groups g ON g.hash = gm.group_hash
      LEFT JOIN contacts c ON c.address = gm.address
      WHERE (g.member LIKE $3 OR g.created_by = $1)
        AND gm.is_object = 0
        AND gm.content LIKE $2

      ORDER BY signed_at DESC
      LIMIT $4 OFFSET $5
    `
    const rows = await db.select(querySql, [address, likePattern, memberPattern, pageSize, offset])
    return rows
  },

  async getMessageSearchCount({ query, address }) {
    const db = await getDB()
    const likePattern = `%${query.trim()}%`
    const memberPattern = `%${address}%`

    const querySql = `
      SELECT COUNT(*) AS count FROM (
        SELECT 1 FROM private_messages pm
        WHERE (pm.sour = $1 OR pm.dest = $1)
          AND pm.is_object = 0
          AND pm.content LIKE $2

        UNION ALL

        SELECT 1 FROM group_messages gm
        INNER JOIN groups g ON g.hash = gm.group_hash
        WHERE (g.member LIKE $3 OR g.created_by = $1)
          AND gm.is_object = 0
          AND gm.content LIKE $2
      )
    `
    const [result] = await db.select(querySql, [address, likePattern, memberPattern])
    return result ? result.count : 0
  }
}
