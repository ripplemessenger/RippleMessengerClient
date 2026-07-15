import { Bool2Int, Int2Bool } from '../lib/AppUtil'
import { Epoch, MessageObjectType } from '../lib/MessengerConst'
import { groupMessage2Display } from '../lib/MessengerUtil'
import { getDB } from './core'

export const api = {
  async getGroups() {
    const dbInstance = await getDB()
    let groups = await dbInstance.select('SELECT * FROM groups ORDER BY created_at DESC')
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      groups[i].member = JSON.parse(group.member)
      groups[i].create_json = JSON.parse(group.create_json)
      if (group.delete_json) {
        groups[i].delete_json = JSON.parse(group.delete_json)
      }
      groups[i].is_accepted = Int2Bool(group.is_accepted)
    }
    return groups
  },

  async getGroupByHash(hash) {
    const dbInstance = await getDB()
    const groups = await dbInstance.select(
      'SELECT * FROM groups WHERE hash = $1 LIMIT 1',
      [hash]
    )
    if (groups.length > 0) {
      let group = groups[0]
      group.member = JSON.parse(group.member)
      group.create_json = JSON.parse(group.create_json)
      if (group.delete_json) {
        group.delete_json = JSON.parse(group.delete_json)
      }
      group.is_accepted = Int2Bool(group.is_accepted)
      return group
    }
    return null
  },

  async createGroup(hash, name, created_by, member, created_at, create_json, is_accepted) {
    const db = await getDB()
    await db.execute(
      'INSERT INTO groups (hash, name, created_by, member, created_at, create_json, is_accepted) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [hash, name, created_by, JSON.stringify(member), created_at, JSON.stringify(create_json), Bool2Int(is_accepted)]
    )
  },

  async updateGroupDelete(hash, delete_json) {
    const db = await getDB()
    await db.execute(
      'UPDATE groups SET delete_json = $1, deleted_at = $2 WHERE hash = $3',
      [JSON.stringify(delete_json), delete_json.Timestamp, hash]
    )
  },

  async acceptGroupRequest(hash) {
    const db = await getDB()
    await db.execute(
      'UPDATE groups SET is_accepted = $1 WHERE hash = $2',
      [1, hash]
    )
  },

  // group message
  async getGroupSession(group_hash) {
    const dbInstance = await getDB()
    let msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 ORDER BY signed_at ASC',
      [group_hash]
    )
    for (let i = 0; i < msgs.length; i++) {
      msgs[i] = groupMessage2Display(msgs[i])
    }
    return msgs
  },

  async getGroupNewMessageCount(group_hash) {
    const dbInstance = await getDB()
    const [result] = await dbInstance.select(
      'SELECT COUNT(DISTINCT hash) as count FROM group_messages WHERE group_hash = $1 AND is_readed = $2',
      [group_hash, Bool2Int(false)]
    )
    return result ? result.count : 0
  },

  async readGroupSession(group_hash) {
    const db = await getDB()
    await db.execute(
      'UPDATE group_messages SET is_readed = $2 WHERE group_hash = $1',
      [group_hash, Bool2Int(true)]
    )
  },

  async getUnsyncGroupSession(group_hash, signed_at) {
    const dbInstance = await getDB()
    return await dbInstance.select(
      'SELECT json FROM group_messages WHERE group_hash = $1 AND signed_at > $2 ORDER BY signed_at ASC LIMIT 64',
      [group_hash, signed_at]
    )
  },

  async getMemberLastGroupMessage(group_hash, address) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 AND address = $2 ORDER BY sequence DESC LIMIT 1',
      [group_hash, address]
    )
    return msgs.length > 0 ? groupMessage2Display(msgs[0]) : null
  },

  async getLastConfirmGroupMessage(group_hash, address) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 AND address != $2 AND is_confirmed = $3 ORDER BY signed_at DESC LIMIT 1',
      [group_hash, address, Bool2Int(true)]
    )
    return msgs.length > 0 ? groupMessage2Display(msgs[0]) : null
  },

  async getLastUnconfirmGroupMessage(group_hash, address) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 AND address != $2 AND is_confirmed = $3 ORDER BY signed_at DESC LIMIT 1',
      [group_hash, address, Bool2Int(false)]
    )
    return msgs.length > 0 ? groupMessage2Display(msgs[0]) : null
  },

  async getLastGroupMessage(group_hash) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 ORDER BY signed_at DESC LIMIT 1',
      [group_hash]
    )
    return msgs.length > 0 ? groupMessage2Display(msgs[0]) : null
  },

  async getLastGroupMessageSignedAt(group_hash) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 ORDER BY signed_at DESC LIMIT 1',
      [group_hash]
    )
    return msgs.length > 0 ? groupMessage2Display(msgs[0]).signed_at : Epoch
  },

  async getLastGroupMemberMessage(group_hash, address) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 AND address = $2 ORDER BY sequence DESC LIMIT 1',
      [group_hash, address]
    )
    return msgs.length > 0 ? groupMessage2Display(msgs[0]) : null
  },

  async addGroupMessage(hash, group_hash, address, sequence, pre_hash, content, json, signed_at, is_confirmed, is_marked, is_readed, is_object) {
    const db = await getDB()
    await db.execute(
      'INSERT INTO group_messages (hash, group_hash, address, sequence, pre_hash, content, json, signed_at, is_confirmed, is_marked, is_readed, is_object, object_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [hash, group_hash, address, sequence, pre_hash, is_object ? JSON.stringify(content) : content, JSON.stringify(json), signed_at, Bool2Int(is_confirmed), Bool2Int(is_marked), Bool2Int(is_readed), Bool2Int(is_object), is_object ? content.ObjectType : MessageObjectType.NotObject]
    )
    return true
  },

  async confirmGroupMessage(hash) {
    const db = await getDB()
    await db.execute(
      'UPDATE group_messages SET is_confirmed = $1 WHERE hash = $2',
      [Bool2Int(true), hash]
    )
  },

  async getGroupMessageBySequence(group_hash, address, sequence) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 AND address = $2 AND sequence = $3 LIMIT 1',
      [group_hash, address, sequence]
    )
    return msgs.length > 0 ? groupMessage2Display(msgs[0]) : null
  },

  async getGroupMessageByHash(group_hash, hash) {
    const dbInstance = await getDB()
    const msgs = await dbInstance.select(
      'SELECT * FROM group_messages WHERE group_hash = $1 AND hash = $2 LIMIT 1',
      [group_hash, hash]
    )
    return msgs.length > 0 ? groupMessage2Display(msgs[0]) : null
  },
}
