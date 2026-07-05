import { getDB } from './core'

export const api = {
  async initHandshakeFromLocal(self_address, pair_address, partition, sequence, private_key, public_key, self_json) {
    const db = await getDB()
    await db.execute(
      'INSERT INTO handshakes (self_address, pair_address, partition, sequence, private_key, public_key, self_json) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [self_address, pair_address, partition, sequence, private_key, public_key, JSON.stringify(self_json)]
    )
  },

  async initHandshakeFromRemote(self_address, pair_address, partition, sequence, aes_key, private_key, public_key, self_json, pair_json) {
    const db = await getDB()
    await db.execute(
      'INSERT INTO handshakes (self_address, pair_address, partition, sequence, aes_key, private_key, public_key, self_json, pair_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [self_address, pair_address, partition, sequence, aes_key, private_key, public_key, JSON.stringify(self_json), JSON.stringify(pair_json)]
    )
  },

  async updateHandshake(self_address, pair_address, partition, sequence, aes_key, self_json, pair_json) {
    const db = await getDB()
    await db.execute(
      'UPDATE handshakes SET aes_key = $1, self_json = $2, pair_json = $3 WHERE self_address = $4 AND pair_address = $5 AND partition = $6 AND sequence = $7',
      [aes_key, JSON.stringify(self_json), JSON.stringify(pair_json), self_address, pair_address, partition, sequence]
    )
  },

  async getHandshake(self_address, pair_address, partition, sequence) {
    const dbInstance = await getDB()
    const handshakes = await dbInstance.select(
      'SELECT * FROM handshakes WHERE self_address = $1 AND pair_address = $2 AND partition = $3 AND sequence = $4 LIMIT 1',
      [self_address, pair_address, partition, sequence]
    )
    if (handshakes.length > 0) {
      let handshake = handshakes[0]
      handshake.self_json = JSON.parse(handshake.self_json)
      if (handshake.pair_json) {
        handshake.pair_json = JSON.parse(handshake.pair_json)
      }
      return handshake
    }
    return null
  },
}
