import { all, call, put, select } from 'redux-saga/effects'
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
    let session_list = []

    // Private sessions: batch all friend queries in parallel
    const friend_list = yield call(() => dbAPI.getMyFriends(address))
    if (friend_list.length > 0) {
      const friendResults = yield all(friend_list.map(friend =>
        all([
          call(() => dbAPI.getPrivateNewMessageCount(address, friend.remote)),
          call(() => dbAPI.getLastPrivateMessageSignedAt(address, friend.remote)),
        ])
      ))
      for (let i = 0; i < friend_list.length; i++) {
        const [new_msg_count, last_msg_signed_at] = friendResults[i]
        session_list.push({
          type: SessionType.Private,
          address: friend_list[i].remote,
          new_msg_count,
          updated_at: last_msg_signed_at,
        })
      }
    }

    // Group sessions: batch all group queries in parallel
    const group_list = yield select(state => state.Messenger.GroupList)
    if (group_list.length > 0) {
      const groupResults = yield all(group_list.map(group => {
        let member = [...group.member]
        member.push(group.created_by)
        member = [...new Set(member)]
        if (!member.includes(address)) {
          return null
        }
        return all([
          call(() => dbAPI.getGroupNewMessageCount(group.hash)),
          call(() => dbAPI.getLastGroupMessageSignedAt(group.hash)),
        ])
      }))
      for (let i = 0; i < group_list.length; i++) {
        const result = groupResults[i]
        if (result === null) continue
        const [new_msg_count, last_msg_signed_at] = result
        let member = [...group_list[i].member]
        member.push(group_list[i].created_by)
        member = [...new Set(member)]
        session_list.push({
          type: SessionType.Group,
          hash: group_list[i].hash,
          name: group_list[i].name,
          member,
          new_msg_count,
          updated_at: last_msg_signed_at,
        })
      }
    }

    session_list = [...session_list].sort((a, b) => b.updated_at - a.updated_at)
    yield put(setSessionList(session_list))
  } catch (e) {
    Logger.error('[LoadSessionList] failed:', e.message)
  }
}
