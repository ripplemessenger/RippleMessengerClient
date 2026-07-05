import { Bool2Int, Int2Bool } from '../lib/AppUtil'
import { getDB } from './core'

export const api = {
  async getAllServers() {
    const db = await getDB()
    let servers = await db.select('SELECT * FROM servers ORDER BY priority DESC, updated_at DESC')
    for (let i = 0; i < servers.length; i++) {
      servers[i].is_connect = Int2Bool(servers[i].is_connect)
    }
    return servers
  },

  async getServerByURL(url) {
    const db = await getDB()
    const servers = await db.select(
      'SELECT * FROM servers WHERE url = $1 LIMIT 1',
      [url]
    )
    return servers.length > 0 ? servers[0] : null
  },

  async getServerListByPriority() {
    const db = await getDB()
    let servers = await db.select(
      'SELECT * FROM servers WHERE is_connect = $1 ORDER BY priority DESC',
      [Bool2Int(true)]
    )
    for (let i = 0; i < servers.length; i++) {
      servers[i].is_connect = Int2Bool(servers[i].is_connect)
    }
    return servers
  },

  async addServer(url, updated_at) {
    const db = await getDB()
    await db.execute(
      'INSERT INTO servers (url, updated_at, is_connect, priority) VALUES ($1, $2, $3, $4)',
      [url, updated_at, Bool2Int(false), 64]
    )
  },

  async toggleServerConnect(url, is_connect, updated_at) {
    const db = await getDB()
    await db.execute(
      'UPDATE servers SET is_connect = $1, updated_at = $2 WHERE url = $3',
      [Bool2Int(is_connect), updated_at || Date.now(), url]
    )
  },

  async deleteServer(url) {
    const db = await getDB()
    await db.execute('DELETE FROM servers WHERE url = $1', [url])
  },

  async updateServerDefault(url) {
    const db = await getDB()
    await db.execute(
      'UPDATE servers SET priority = $1 WHERE url = $2',
      [64, url]
    )
  },

  async updateServerPriority() {
    const db = await getDB()
    const server_list = await db.select('SELECT * FROM servers ORDER BY priority DESC, updated_at DESC')
    const server_count = server_list.length
    for (let i = 0; i < server_list.length; i++) {
      await db.execute(
        'UPDATE servers SET priority = $1 WHERE url = $2',
        [server_count - i, server_list[i].url]
      )
    }
  },
}
