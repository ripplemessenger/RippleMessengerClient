import { all, call, fork, put, select } from 'redux-saga/effects'

import { SendMessage } from './messenger.core'
import { LoadSessionList } from './messenger.session'
import { dbAPI } from '../../db'
import { DefaultPartition, SessionType } from '../../lib/AppConst'
import { AesEncrypt, QuarterSHA512Message } from '../../lib/AppUtil'
import Logger from '../../lib/Logger'
import { mgAPI } from '../../lib/MessageGenerator'
import { GenesisHash, ObjectType, GroupMemberMax } from '../../lib/MessengerConst'
import { DHSequence } from '../../lib/MessengerUtil'
import { setCurrentSession, setCurrentSessionMessageList, setComposeMemberList } from '../slices/MessengerSlice'

export function* RefreshGroupMessageList() {
  try {
    const CurrentSession = yield select(state => state.Messenger.CurrentSession)
    if (!CurrentSession) {
      return
    }
    const current_msg_list = yield call(() => dbAPI.getGroupSession(CurrentSession.hash))
    yield put(setCurrentSessionMessageList(current_msg_list))
  } catch (e) {
    Logger.error('[RefreshGroupMessageList] failed:', e.message)
  }
}

function* RequestGroupMessageSync({ payload }) {
  try {
    const seed = yield select(state => state.User.Seed)
    if (!seed) {
      return
    }

    const latest_msg = yield call(() => dbAPI.getLastGroupMessage(payload.hash))
    if (latest_msg) {
      const group_message_sync_request = yield call(() => mgAPI.genGroupMessageSync(seed, payload.hash, latest_msg.address, latest_msg.sequence))
      yield call(SendMessage, { msg: JSON.stringify(group_message_sync_request) })
    } else {
      const address = yield select(state => state.User.Address)
      const group_message_sync_request = yield call(() => mgAPI.genGroupMessageSync(seed, payload.hash, address, 0))
      yield call(SendMessage, { msg: JSON.stringify(group_message_sync_request) })
    }
  } catch (e) {
    Logger.error('[RequestGroupMessageSync] failed:', e.message)
  }
}

/** Load a group chat session. */
export function* LoadGroupSession({ payload }) {
  try {
    const seed = yield select(state => state.User.Seed)
    if (!seed) {
      return
    }
    const self_address = yield select(state => state.User.Address)
    let group_session = { type: SessionType.Group, hash: payload.hash, name: payload.name, member: payload.member, updated_at: payload.updated_at }
    if (group_session.member.includes(self_address)) {
      const current_group_msg = yield call(() => dbAPI.getMemberLastGroupMessage(payload.hash, self_address))
      if (current_group_msg !== null) {
        group_session.current_sequence = current_group_msg.sequence
        group_session.current_hash = current_group_msg.hash
      } else {
        group_session.current_sequence = 0
        group_session.current_hash = GenesisHash
      }
      yield put(setCurrentSession(group_session))
      yield call(() => dbAPI.readGroupSession(payload.hash))
      yield call(LoadSessionList)
      yield call(RefreshGroupMessageList)
      yield call(RequestGroupMessageSync, { payload: { hash: group_session.hash } })
    }
  } catch (e) {
    Logger.error('[LoadGroupSession] failed for', payload.hash, e.message)
  }
}

/** Encrypt and send a group message to a single member. */
function* SendGroupMessageToMember(group_hash, self_address, member, msg_json, seed, timestamp) {
  if (member === self_address) {
    return
  }
  const tmp_msg_json = JSON.parse(JSON.stringify(msg_json))
  const ecdh_sequence = DHSequence(DefaultPartition, timestamp, self_address, member)
  const ecdh = yield call(() => dbAPI.getHandshake(self_address, member, DefaultPartition, ecdh_sequence))
  if (ecdh === null) {
    yield call(InitHandshake, { ecdh_sequence, pair_address: member })
  } else if (ecdh.aes_key === null) {
    yield fork(SendMessage, { msg: JSON.stringify(ecdh.self_json) })
  } else {
    const encrypt_content = AesEncrypt(tmp_msg_json.Content, ecdh.aes_key)
    tmp_msg_json.Content = encrypt_content
    delete tmp_msg_json["ObjectType"]
    delete tmp_msg_json["GroupHash"]
    const group_msg_list_json = yield call(() => mgAPI.genGroupMessageList(seed, group_hash, member, [tmp_msg_json], timestamp))
    yield call(SendMessage, { msg: JSON.stringify(group_msg_list_json) })
  }
}

/** Send a message in the current group chat session. */
export function* SendGroupContent({ payload }) {
  try {
    const seed = yield select(state => state.User.Seed)
    if (!seed) {
      return
    }
    let timestamp = Date.now()
    const self_address = yield select(state => state.User.Address)
    const CurrentSession = yield select(state => state.Messenger.CurrentSession)
    if (!CurrentSession) {
      return
    }

    const last_confirmed_group_msg = yield call(() => dbAPI.getLastConfirmGroupMessage(CurrentSession.hash, self_address))
    const last_unconfirm_message_group_list = yield call(() => dbAPI.getLastUnconfirmGroupMessage(CurrentSession.hash, self_address))
    let to_confirm_group_msg = null

    if (last_unconfirm_message_group_list !== null && (last_confirmed_group_msg === null || last_unconfirm_message_group_list.sequence > last_confirmed_group_msg.sequence)) {
      to_confirm_group_msg = {
        Address: last_unconfirm_message_group_list.address,
        Sequence: last_unconfirm_message_group_list.sequence,
        Hash: last_unconfirm_message_group_list.hash
      }
    }

    if (to_confirm_group_msg !== null) {
      yield call(() => dbAPI.confirmGroupMessage(to_confirm_group_msg.Hash))
    }

    const group_msg_json = yield call(() => mgAPI.genGroupMessage(seed, CurrentSession.hash, CurrentSession.current_sequence + 1, CurrentSession.current_hash, to_confirm_group_msg, payload.content, timestamp))
    let group_msg_hash = QuarterSHA512Message(group_msg_json)
    yield call(() => dbAPI.addGroupMessage(group_msg_hash, CurrentSession.hash, self_address, CurrentSession.current_sequence + 1, CurrentSession.current_hash, payload.content, group_msg_json, group_msg_json.Timestamp, false, false, true, typeof payload.content === 'object'))

    let tmp_group_session = { ...CurrentSession }
    tmp_group_session.current_sequence = CurrentSession.current_sequence + 1
    tmp_group_session.current_hash = group_msg_hash
    yield put(setCurrentSession(tmp_group_session))

    yield call(RefreshGroupMessageList)

    // Send to all members concurrently
    yield all(tmp_group_session.member.map(member =>
      fork(SendGroupMessageToMember, CurrentSession.hash, self_address, member, group_msg_json, seed, timestamp)
    ))
  } catch (e) {
    Logger.error('[SendGroupContent] failed:', e.message)
  }
}

export function* ComposeMemberAdd({ payload }) {
  const address = yield select(state => state.User.Address)
  const old_list = yield select(state => state.Messenger.ComposeMemberList)
  let new_list = [...old_list]
  new_list = new_list.filter(member => member !== payload.address)
  new_list.unshift(payload.address)
  new_list = new_list.filter(member => member !== address)
  if (new_list.length > GroupMemberMax) {
    new_list = new_list.slice(0, GroupMemberMax)
  }
  yield put(setComposeMemberList(new_list))
}

export function* ComposeMemberDel({ payload }) {
  const old_list = yield select(state => state.Messenger.ComposeMemberList)
  let new_list = [...old_list]
  new_list = new_list.filter(member => member !== payload.address)
  yield put(setComposeMemberList(new_list))
}

export function* CreateGroup(action) {
  try {
    const seed = yield select(state => state.User.Seed)
    if (!seed) {
      return
    }
    const address = yield select(state => state.User.Address)
    const member = yield select(state => state.Messenger.ComposeMemberList)

    let hash = QuarterSHA512Message({ created_by: address, Member: member, Random: crypto.getRandomValues(new Uint32Array(1))[0] / 4294967295 })
    let json = yield call(() => mgAPI.genGroupCreate(seed, hash, action.payload.name, member))
    let result = yield call(() => dbAPI.createGroup(json.Hash, action.payload.name, address, json.Member, json.Timestamp, json, true))
    if (result) {
      let group_response = {
        ObjectType: ObjectType.GroupList,
        List: [json]
      }
      yield call(SendMessage, { msg: JSON.stringify(group_response) })
      yield call(LoadSessionList)
      yield call(LoadGroupList)
    }
    yield put(setComposeMemberList([]))
  } catch (e) {
    Logger.error('[CreateGroup] failed:', e.message)
  }
}

export function* DeleteGroup(action) {
  try {
    const seed = yield select(state => state.User.Seed)
    if (!seed) {
      return
    }
    const address = yield select(state => state.User.Address)
    const group = yield call(() => dbAPI.getGroupByHash(action.payload.hash))
    if (group !== null && group.created_by === address && group.delete_json === null) {
      let json = yield call(() => mgAPI.genGroupDelete(seed, action.payload.hash))
      let result = yield call(() => dbAPI.updateGroupDelete(action.payload.hash, json))
      if (result > 0) {
        let group_response = {
          ObjectType: ObjectType.GroupList,
          List: [json]
        }
        yield call(SendMessage, { msg: JSON.stringify(group_response) })
        yield call(LoadSessionList)
        yield call(LoadGroupList)
      }
    }
  } catch (e) {
    Logger.error('[DeleteGroup] failed:', e.message)
  }
}

export function* GroupSync(payload) {
  try {
    const seed = yield select(state => state.User.Seed)
    if (!seed) {
      return
    }
    const group_sync_request = yield call(() => mgAPI.genGroupSync(seed))
    yield call(SendMessage, { key: payload.key, msg: JSON.stringify(group_sync_request) })
  } catch (e) {
    Logger.error('[GroupSync] failed:', e.message)
  }
}

// Cross-module imports resolved at saga runtime (not module load) —
// MessengerSaga re-exports LoadGroupList; messenger.private exports InitHandshake.
import { InitHandshake } from './messenger.private'
import { LoadGroupList } from './MessengerSaga'
