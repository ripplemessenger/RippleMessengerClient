import { Bool2Int } from '../lib/AppUtil'
import { Epoch, MessageObjectType } from '../lib/MessengerConst'
import { privateMessage2Display } from '../lib/MessengerUtil'
import { getDB } from './core'

export const api = {
  async getPrivateSession(sour, dest) {
    const dbInstance = await getDB()
    let msgs = await dbInstance.select(
      'SELECT * FROM private_messages WHERE (sour = $1 AND dest = $2) OR (sour = $2 AND dest = $1) ORDER BY signed_at ASC',
      [sour, dest]
    )
    for (let i = 0; i < msgs.length; i++) {
      msgs[i] = privateMessage2Display(msgs[i])
    }
    return msgs
  },

  async getPrivateNewMessageCount(sour, dest) {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select(
      'SELECT COUNT(DISTINCT hash) as count FROM private_messages WHERE ((sour = $1 AND dest = $2) OR (sour = $2 AND dest = $1)) AND is_readed = $3',
      [sour, dest, Bool2Int(false)]
    )
    return result ? result.count : 0
  },

  async readPrivateSession(sour, dest) {
    const db = await getDB()
    await db.execute(
      'UPDATE private_messages SET is_readed = $3 WHERE (sour = $1 AND dest = $2) OR (sour = $2 AND dest = $1)',
      [sour, dest, Bool2Int(true)]
    )
  },

  async getLastPrivateMessageSignedAt(sour, dest) {
    const dbInstance = await getDB()
    let msgs = await dbInstance.select(
      'SELECT * FROM private_messages WHERE (sour = $1 AND dest = $2) OR (sour = $2 AND dest = $1) ORDER BY signed_at DESC LIMIT 1',
      [sour, dest]
    )
    return msgs.length > 0 ? privateMessage2Display(msgs[0]).signed_at : Epoch
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
    return await dbInstance.select(
      'SELECT json FROM private_messages WHERE (sour = $1 AND dest = $2 AND sequence > $3) OR (sour = $2 AND dest = $1 AND sequence > $4) ORDER BY signed_at ASC',
      [sour, dest, self_sequence, pair_sequence]
    )
  },

  async addPrivateMessage(hash, sour, dest, sequence, pre_hash, content, json, signed_at, is_confirmed, is_marked, is_readed, is_object) {
    const db = await getDB()
    await db.execute(
      'INSERT INTO private_messages (hash, sour, dest, sequence, pre_hash, content, json, signed_at, is_confirmed, is_marked, is_readed, is_object, object_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [hash, sour, dest, sequence, pre_hash, is_object ? JSON.stringify(content) : content, JSON.stringify(json), signed_at, Bool2Int(is_confirmed), Bool2Int(is_marked), Bool2Int(is_readed), Bool2Int(is_object), is_object ? content.ObjectType : MessageObjectType.NotObject]
    )
    return true
  },

  async confirmPrivateMessage(hash) {
    const db = await getDB()
    await db.execute(
      'UPDATE private_messages SET is_confirmed = $1 WHERE hash = $2',
      [Bool2Int(true), hash]
    )
  },
}
