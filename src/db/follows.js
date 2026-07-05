import { getDB } from './core'

export const api = {
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
    const db = await getDB()
    await db.execute(
      'INSERT INTO follows (local, remote, updated_at) VALUES ($1, $2, $3)',
      [local, remote, timestamp]
    )
  },

  async deleteFollow(local, remote) {
    const db = await getDB()
    await db.execute(
      'DELETE FROM follows WHERE local = $1 AND remote = $2',
      [local, remote]
    )
  },
}
