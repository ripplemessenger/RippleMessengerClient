import { getDB } from './core'

export const api = {
  async getMyFollows(address) {
    const dbInstance = await getDB()
    return await dbInstance.select(
      'SELECT * FROM follows WHERE local = $1 AND is_deleted = 0 ORDER BY updated_at DESC',
      [address]
    )
  },

  async getFollow(local, remote) {
    const dbInstance = await getDB()
    const follows = await dbInstance.select('SELECT * FROM follows WHERE local = $1 AND remote = $2 LIMIT 1', [
      local,
      remote
    ])
    return follows.length > 0 ? follows[0] : null
  },

  async addFollow(local, remote, timestamp) {
    const db = await getDB()
    await db.execute(
      'INSERT INTO follows (local, remote, updated_at, is_deleted) VALUES ($1, $2, $3, 0) ON CONFLICT(local, remote) DO UPDATE SET is_deleted = 0, updated_at = $3',
      [local, remote, timestamp]
    )
  },

  async deleteFollow(local, remote) {
    const db = await getDB()
    await db.execute('UPDATE follows SET is_deleted = 1, updated_at = $3 WHERE local = $1 AND remote = $2', [
      local,
      remote,
      Date.now()
    ])
  }
}
