import Dexie from 'dexie'
import { call, put, takeLatest, select, delay } from 'redux-saga/effects'
import { loadAccountListStart, loadAccountListSuccess, loginStart, loginSuccess, logoutStart, setContactList, setFollowList, setFriendList, setUserError } from "../slices/UserSlice"
import { decryptWithPassword } from '../../lib/AppUtil'
import { ClearMessage, DisconnectSwitch, LoadChannelList, LoadGroupList, LoadGroupRequestList, LoadServerList, LoadSessionList } from './MessengerSaga'
import { SessionType } from '../../lib/AppConst'
import { setChannelList, setCurrentSession, setGroupList, setSessionList } from '../slices/MessengerSlice'
import { MasterAddress } from '../../lib/MessengerConst'
import { dbAPI } from '../../db'

function* handleLogin(action) {
  let nickname = ''
  let contact = yield call(() => dbAPI.getContactByAddress(action.payload.address))
  if (contact !== null) {
    nickname = contact.nickname
  }
  yield put(loginSuccess({ seed: action.payload.seed, address: action.payload.address, nickname: nickname }))
  yield call(LoadServerList)
  yield call(LoadContactList)
  yield call(LoadGroupList)
  yield call(LoadChannelList)
  yield call(LoadSessionList)
  yield call(LoadGroupRequestList)

  const contact_list = yield select(state => state.User.ContactList)
  if (contact_list.length === 0) {
    yield call(ContactAdd, { payload: { address: MasterAddress, nickname: 'RippleMessenger' } })
    yield call(ContactToggleIsFollow, { payload: { contact_address: MasterAddress } })
  }
  // TODO
  // Bulletin...
}

function* handleLogout() {
  localStorage.removeItem('Seed')
  localStorage.removeItem('Address')
  yield call(DisconnectSwitch)
  yield call(ClearMessage)
  yield put(setContactList({ contact_list: [], contact_map: {} }))
  yield put(setFollowList([]))
  yield put(setFriendList([]))
  yield put(setSessionList([]))
  yield put(setGroupList({ group_list: [], group_member_map: {} }))
  yield put(setChannelList([]))
  yield put(setCurrentSession(null))
  yield put(setChannelList([]))
}

// Account
function* LoadAccountList() {
  let local_account_list = yield call(() => dbAPI.getAllAccounts())
  yield put(loadAccountListSuccess({ local_account_list: local_account_list }))
}

function* AccountAdd({ payload }) {
  let local_account = yield call(() => dbAPI.getAccountByAddress(payload.address))
  if (local_account !== null) {
    yield call(() => dbAPI.updateAccount(payload.address, payload.salt, payload.cipher_data, Date.now()))
  } else {
    yield call(() => dbAPI.addAccount(payload.address, payload.salt, payload.cipher_data, Date.now()))
  }
  yield put(loadAccountListStart())
}

function* AccountDel({ payload }) {
  let account = yield call(() => dbAPI.getAccountByAddress(payload.address))
  if (account !== null) {
    try {
      let tmpSeed = decryptWithPassword(payload.password, account.salt, account.cipher_data)
      if (tmpSeed !== '') {
        yield call(() => dbAPI.deleteContactByAddress(payload.address))
        yield put(loadAccountListStart())
        yield put(setUserError(null))
      } else {
        yield put(setUserError('password wrong...'))
      }
    } catch (error) {
      console.log(error)
      yield put(setUserError('password wrong...'))
    }
  }
}

// Contact
function* LoadContactList() {
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
          contact.IsFollow = true
          follow_list.push(follow.remote)
          break
        }
      }
      for (let j = 0; j < tmp_friend_list.length; j++) {
        const friend = tmp_friend_list[j]
        if (friend.remote === contact.address) {
          contact.IsFriend = true
          friend_list.push(friend.remote)
          break
        }
      }
      if (contact.IsFollow === undefined) {
        contact.IsFollow = false
      }
      if (contact.IsFriend === undefined) {
        contact.IsFriend = false
      }
      contact_list.push(contact)
    }
  }
  yield put(setContactList({ contact_list: contact_list, contact_map: contact_map }))
  yield put(setFollowList(follow_list))
  yield put(setFriendList(friend_list))
}

function* ContactAdd({ payload }) {
  let contact = yield call(() => dbAPI.getContactByAddress(payload.address))
  if (contact === null) {
    yield call(dbAPI.addContact, payload.address, payload.nickname, Date.now())
  } else {
    yield call(dbAPI.updateContactNickname, payload.address, payload.nickname, Date.now())
  }
  yield call(LoadContactList)
}

function* ContactDel({ payload }) {
  yield call(dbAPI.deleteContactByAddress, payload.contact_address)
  yield call(LoadContactList)
}

function* ContactToggleIsFollow({ payload }) {
  const address = yield select(state => state.User.Address)
  let contact_address = payload.contact_address
  let follow = yield call(() => dbAPI.getFollow(address, contact_address))
  if (follow !== null) {
    yield call(() => dbAPI.deleteFollow(address, contact_address))
  } else {
    yield call(() => dbAPI.addFollow(address, contact_address, Date.now()))
  }
  yield call(LoadContactList)
}

export function* ContactToggleIsFriend({ payload }) {
  const address = yield select(state => state.User.Address)
  const session_list_old = yield select(state => state.Messenger.SessionList)
  let contact_address = payload.contact_address
  let friend = yield call(() => dbAPI.getFriend(address, contact_address))
  if (friend !== null) {
    yield call(() => dbAPI.deleteFriend(address, contact_address))
    yield put(setSessionList(session_list_old.filter(s => s.address !== contact_address)))
  } else {
    yield call(() => dbAPI.addFriend(address, contact_address, Date.now()))
    yield put(setSessionList([...session_list_old, { type: SessionType.Private, address: contact_address, updated_at: Date.now() }]))
  }
  yield call(LoadContactList)
}

export function* watchUser() {
  yield takeLatest(loginStart.type, handleLogin)
  yield takeLatest(logoutStart.type, handleLogout)

  yield takeLatest(loadAccountListStart.type, LoadAccountList)
  yield takeLatest('AccountAdd', AccountAdd)
  yield takeLatest('AccountDel', AccountDel)

  yield takeLatest('LoadContactList', LoadContactList)
  yield takeLatest('ContactAdd', ContactAdd)
  yield takeLatest('ContactDel', ContactDel)
  yield takeLatest('ContactToggleIsFollow', ContactToggleIsFollow)
  yield takeLatest('ContactToggleIsFriend', ContactToggleIsFriend)
}