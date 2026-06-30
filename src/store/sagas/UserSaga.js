import { call, fork, put, select, takeLatest } from 'redux-saga/effects'

import { dbAPI } from '../../db'
import Logger from '../../lib/Logger'
import { disconnectAllWebsockets } from '../../lib/WebsocketUtil'
import { PostAddress } from '../../lib/MessengerConst'
import { SessionType } from '../../lib/AppConst'
import { setCurrentSession, setGroupList, setSessionList } from '../slices/MessengerSlice'
import { loadAccountListStart, loadAccountListSuccess, loginStart, loginSuccess, logoutStart, setContactList, setFollowList, setFriendList, setUserError } from '../slices/UserSlice'
import { AccountAdd as AccountAddAction, AccountDel as AccountDelAction, ContactAdd as ContactAddAction, ContactDel as ContactDelAction, ContactToggleIsFollow as ContactToggleIsFollowAction, ContactToggleIsFriend as ContactToggleIsFriendAction, LoadContactList as LoadContactListAction } from './messenger.actions'
import { LoadGroupList, LoadGroupRequestList, LoadMineBulletinSequence, LoadServerList, RefreshPortalBulletin, SubscribeFollow } from './MessengerSaga'
import { LoadSessionList } from './messenger.session'

function* handleLogin({ payload }) {
  try {
    let nickname = ''
    let contact = yield call(() => dbAPI.getContactByAddress(payload.address))
    if (contact !== null) {
      nickname = contact.nickname
    }
    yield call(() => dbAPI.updateAccountUpdatedAt(payload.address, Date.now()))
    yield put(loginSuccess({ seed: payload.seed, address: payload.address, nickname: nickname }))
    yield call(loadContactList)
    yield call(LoadMineBulletinSequence)
    yield call(RefreshPortalBulletin)
    yield call(LoadGroupList)
    yield call(LoadSessionList)
    yield call(LoadGroupRequestList)

    const contact_list = yield select(state => state.User.ContactList)
    if (contact_list.length === 0) {
      yield call(addContact, { payload: { address: PostAddress, nickname: 'London' } })
      yield call(toggleContactFollow, { payload: { contact_address: PostAddress } })
    }
    yield call(LoadServerList)
  } catch (e) {
    Logger.error('[handleLogin] failed for', payload.address, e.message)
    yield put(setUserError(e.message))
  }
}

function* handleLogout() {
  try {
    localStorage.removeItem('Seed')
    localStorage.removeItem('Address')
    yield put(setContactList({ contact_list: [], contact_map: {} }))
    yield put(setFollowList([]))
    yield put(setFriendList([]))
    yield put(setSessionList([]))
    yield put(setGroupList({ group_list: [], group_member_map: {} }))
    yield put(setCurrentSession(null))
    yield call(disconnectAllWebsockets)
  } catch (e) {
    Logger.error('[handleLogout] failed:', e.message)
  }
}

// Account
function* loadAccountList() {
  try {
    let account_list = yield call(() => dbAPI.getAllAccounts())
    yield put(loadAccountListSuccess({ account_list: account_list }))
  } catch (e) {
    Logger.error('[loadAccountList] failed:', e.message)
  }
}

function* addAccount({ payload }) {
  try {
    let local_account = yield call(() => dbAPI.getAccountByAddress(payload.address))
    if (local_account !== null) {
      yield call(() => dbAPI.updateAccount(payload.address, payload.salt, payload.cipher_data, Date.now()))
    } else {
      yield call(() => dbAPI.addAccount(payload.address, payload.salt, payload.cipher_data, Date.now()))
    }
    yield put(loadAccountListStart())
  } catch (e) {
    Logger.error('[addAccount] failed:', e.message)
  }
}

function* delAccount({ payload }) {
  try {
    let account = yield call(() => dbAPI.getAccountByAddress(payload.address))
    if (account !== null) {
      yield call(() => dbAPI.deleteAccountByAddress(payload.address))
      yield put(loadAccountListStart())
    }
  } catch (e) {
    Logger.error('[delAccount] failed:', e.message)
  }
}

// Contact
function* loadContactList() {
  try {
    const address = yield select(state => state.User.Address)

    let tmp_contact_list = yield call(() => dbAPI.getAllContacts())
    let tmp_follow_list = yield call(() => dbAPI.getMyFollows(address))
    let tmp_friend_list = yield call(() => dbAPI.getMyFriends(address))

    let contact_list = []
    let contact_map = {}
    let follow_list = []
    let friend_list = []

    for (let i = 0; i < tmp_contact_list.length; i++) {
      let contact = tmp_contact_list[i]
      if (address !== contact.address) {
        contact_map[contact.address] = contact.nickname
        for (let j = 0; j < tmp_follow_list.length; j++) {
          const follow = tmp_follow_list[j]
          if (follow.remote === contact.address) {
            contact.is_follow = true
            follow_list.push(follow.remote)
            break
          }
        }
        for (let j = 0; j < tmp_friend_list.length; j++) {
          const friend = tmp_friend_list[j]
          if (friend.remote === contact.address) {
            contact.is_friend = true
            friend_list.push(friend.remote)
            break
          }
        }
        if (contact.is_follow === undefined) {
          contact.is_follow = false
        }
        if (contact.is_friend === undefined) {
          contact.is_friend = false
        }
        contact_list.push(contact)
      }
    }
    yield put(setContactList({ contact_list: contact_list, contact_map: contact_map }))
    yield put(setFollowList(follow_list))
    yield fork(SubscribeFollow)
    yield put(setFriendList(friend_list))
  } catch (e) {
    Logger.error('[loadContactList] failed:', e.message)
  }
}

function* addContact({ payload }) {
  try {
    let contact = yield call(() => dbAPI.getContactByAddress(payload.address))
    if (contact === null) {
      yield call(dbAPI.addContact, payload.address, payload.nickname, Date.now())
    } else {
      yield call(dbAPI.updateContactNickname, payload.address, payload.nickname, Date.now())
    }
    yield call(loadContactList)
  } catch (e) {
    Logger.error('[addContact] failed:', e.message)
  }
}

function* delContact({ payload }) {
  try {
    yield call(dbAPI.deleteContactByAddress, payload.contact_address)
    yield call(loadContactList)
  } catch (e) {
    Logger.error('[delContact] failed:', e.message)
  }
}

function* toggleContactFollow({ payload }) {
  try {
    const address = yield select(state => state.User.Address)
    const contact_address = payload.contact_address
    const follow = yield call(() => dbAPI.getFollow(address, contact_address))
    if (follow !== null) {
      yield call(() => dbAPI.deleteFollow(address, contact_address))
    } else {
      yield call(() => dbAPI.addFollow(address, contact_address, Date.now()))
    }
    yield call(loadContactList)
  } catch (e) {
    Logger.error('[toggleContactFollow] failed:', e.message)
  }
}

function* toggleContactFriend({ payload }) {
  try {
    const address = yield select(state => state.User.Address)
    const session_list_old = yield select(state => state.Messenger.SessionList)
    const contact_address = payload.contact_address
    const friend = yield call(() => dbAPI.getFriend(address, contact_address))
    if (friend !== null) {
      yield call(() => dbAPI.deleteFriend(address, contact_address))
      yield put(setSessionList(session_list_old.filter(s => s.address !== contact_address)))
    } else {
      yield call(() => dbAPI.addFriend(address, contact_address, Date.now()))
      yield put(setSessionList([...session_list_old, { type: SessionType.Private, address: contact_address, updated_at: Date.now() }]))
    }
    yield call(loadContactList)
    yield call(LoadSessionList)
  } catch (e) {
    Logger.error('[toggleContactFriend] failed:', e.message)
  }
}

export function* watchUser() {
  yield takeLatest(loginStart.type, handleLogin)
  yield takeLatest(logoutStart.type, handleLogout)

  yield takeLatest(loadAccountListStart.type, loadAccountList)
  yield takeLatest(AccountAddAction.type, addAccount)
  yield takeLatest(AccountDelAction.type, delAccount)

  yield takeLatest(LoadContactListAction.type, loadContactList)
  yield takeLatest(ContactAddAction.type, addContact)
  yield takeLatest(ContactDelAction.type, delContact)
  yield takeLatest(ContactToggleIsFollowAction.type, toggleContactFollow)
  yield takeLatest(ContactToggleIsFriendAction.type, toggleContactFriend)
}
