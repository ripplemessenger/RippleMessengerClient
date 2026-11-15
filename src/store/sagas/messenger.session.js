import { call, put, select } from 'redux-saga/effects'
import Logger from '../../lib/Logger'
import { SessionType } from '../../lib/AppConst'
import { Epoch } from '../../lib/MessengerConst'
import { setSessionList } from '../slices/MessengerSlice'
import { dbAPI } from '../../db'

/**
 * Bump a single session entry in the Redux store — zero DB queries.
 *
 * Called after a new private/group message is stored, instead of re-running
 * the full LoadSessionList aggregate (3 SQL queries). We just increment the
 * unread count and update the timestamp for the one affected session, then
 * re-sort.
 *
 * @param {object} args
 * @param {string} args.sessionType  - SessionType.Private or SessionType.Group
 * @param {string} args.key         - peer address (private) or group hash (group)
 * @param {number} args.timestamp   - message timestamp (ms)
 * @param {boolean} [args.unread=true] - whether the message is unread
 */
export function* BumpSession({ sessionType, key, timestamp, unread = true }) {
  try {
    const session_list = yield select((state) => state.Messenger.SessionList)
    if (!session_list || session_list.length === 0) {
      // Session list not loaded yet — fall back to full load
      yield call(LoadSessionList)
      return
    }

    const updated = session_list.map((s) => {
      const isMatch =
        (sessionType === SessionType.Private && s.type === SessionType.Private && s.address === key) ||
        (sessionType === SessionType.Group && s.type === SessionType.Group && s.hash === key)
      if (!isMatch) return s
      return {
        ...s,
        new_msg_count: unread ? s.new_msg_count + 1 : s.new_msg_count,
        updated_at: timestamp
      }
    })

    updated.sort((a, b) => b.updated_at - a.updated_at)
    yield put(setSessionList(updated))
  } catch (e) {
    Logger.error('[BumpSession] failed:', e.message)
  }
}

/**
 * Build the chat session list (friend conversations + joined groups).
 *
 * Previously this issued two queries per friend and two per group (unread count
 * + last activity), and it runs on every incoming message — 50 friends + 10
 * groups meant ~120 queries per message. Both halves are now single aggregate
 * queries (see getPrivateSessionSummaries / getGroupSessionSummaries).
 */
export function* LoadSessionList() {
  try {
    const address = yield select((state) => state.User.Address)
    if (!address) {
      return
    }
    let session_list = []

    // Private sessions — one aggregate query for all peers
    const friend_list = yield call(() => dbAPI.getMyFriends(address))
    if (friend_list.length > 0) {
      const summaries = yield call(() => dbAPI.getPrivateSessionSummaries(address))
      for (let i = 0; i < friend_list.length; i++) {
        const peer = friend_list[i].remote
        const summary = summaries[peer]
        session_list.push({
          type: SessionType.Private,
          address: peer,
          new_msg_count: summary ? summary.unread : 0,
          updated_at: summary ? summary.last_signed_at : Epoch
        })
      }
    }

    // Group sessions — one aggregate query for the groups we are a member of
    const group_list = yield select((state) => state.Messenger.GroupList)
    if (group_list.length > 0) {
      const joined_groups = []
      for (let i = 0; i < group_list.length; i++) {
        const group = group_list[i]
        let member = [...group.member]
        member.push(group.created_by)
        member = [...new Set(member)]
        if (!member.includes(address)) continue
        joined_groups.push({ ...group, member })
      }

      if (joined_groups.length > 0) {
        const summaries = yield call(() => dbAPI.getGroupSessionSummaries(joined_groups.map((g) => g.hash)))
        for (let i = 0; i < joined_groups.length; i++) {
          const group = joined_groups[i]
          const summary = summaries[group.hash]
          session_list.push({
            type: SessionType.Group,
            hash: group.hash,
            name: group.name,
            member: group.member,
            new_msg_count: summary ? summary.unread : 0,
            updated_at: summary ? summary.last_signed_at : Epoch
          })
        }
      }
    }

    session_list = [...session_list].sort((a, b) => b.updated_at - a.updated_at)
    yield put(setSessionList(session_list))
  } catch (e) {
    Logger.error('[LoadSessionList] failed:', e.message)
  }
}
