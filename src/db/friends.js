import { getDB } from './core'

export const api = {
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
    const db = await getDB()
    await db.execute(
      'INSERT INTO friends (local, remote, updated_at) VALUES ($1, $2, $3)',
      [local, remote, timestamp]
    )
  },

  async deleteFriend(local, remote) {
    const db = await getDB()
    await db.execute(
      'DELETE FROM friends WHERE local = $1 AND remote = $2',
      [local, remote]
    )
  },
}
