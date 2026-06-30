import { call, put, select } from 'redux-saga/effects'
import Logger from '../../lib/Logger'
import { SessionType } from '../../lib/AppConst'
import { setSessionList } from '../slices/MessengerSlice'
import { dbAPI } from '../../db'

export function* LoadSessionList() {
  try {
    const address = yield select(state => state.User.Address)
    if (!address) {
      return
    }
    // private
    const friend_list = yield call(() => dbAPI.getMyFriends(address))
    let session_list = []
    for (let i = 0; i < friend_list.length; i++) {
      const friend = friend_list[i]
      const new_msg_count = yield call(() => dbAPI.getPrivateNewMessageCount(address, friend.remote))
      const last_msg_signed_at = yield call(() => dbAPI.getLastPrivateMessageSignedAt(address, friend.remote))
      session_list.push({ type: SessionType.Private, address: friend.remote, new_msg_count: new_msg_count, updated_at: last_msg_signed_at })
    }
    // group
    const group_list = yield select(state => state.Messenger.GroupList)
    for (let i = 0; i < group_list.length; i++) {
      const group = group_list[i]
      let member = [...group.member]
      member.push(group.created_by)
      member = [...new Set(member)]
      if (member.includes(address)) {
        const new_msg_count = yield call(() => dbAPI.getGroupNewMessageCount(group.hash))
        const last_msg_signed_at = yield call(() => dbAPI.getLastGroupMessageSignedAt(group.hash))
        session_list.push({ type: SessionType.Group, hash: group.hash, name: group.name, member: member, new_msg_count: new_msg_count, updated_at: last_msg_signed_at })
      }
    }
    session_list = [...session_list].sort((a, b) => b.updated_at - a.updated_at)
    yield put(setSessionList(session_list))
  } catch (e) {
    Logger.error('[LoadSessionList] failed:', e.message)
  }
}
