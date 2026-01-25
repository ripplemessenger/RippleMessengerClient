import Dexie from 'dexie'
import { call, put, takeLatest, select, delay } from 'redux-saga/effects'
import { loadLocalAccountListStart, loadLocalAccountListSuccess, loginStart, loginSuccess, logoutStart, setContactList, setFollowList, setFriendList, setNickname, setUserError } from "../slices/UserSlice"
import { decryptWithPassword, safeAddItem } from '../../lib/AppUtil'
import { ClearMessage, DisconnectSwitch, LoadChannelList, LoadGroupList, LoadGroupRequestList, LoadServerList, LoadSessionList } from './MessengerSaga'
import { CommonDBSchame, SessionType } from '../../lib/AppConst'
import { setChannelList, setCurrentSession, setGroupList, setSessionList } from '../slices/MessengerSlice'
import { MasterAddress } from '../../lib/MessengerConst'

let CommonDB = null

function initCommonDB() {
  CommonDB = new Dexie('Common')
  CommonDB.version(1).stores(CommonDBSchame)
}

function* handleLogin(action) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  let nickname = ''
  let contact = yield call(() => CommonDB.Contacts
    .where('Address')
    .equals(action.payload.address)
    .first())
  if (contact !== undefined) {
    nickname = contact.Nickname
  }
  // localStorage.setItem(`Nickname`, nickname)
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
}

function* handleLogout() {
  localStorage.removeItem('Seed')
  localStorage.removeItem('Address')
  // localStorage.removeItem('Nickname')
  yield call(DisconnectSwitch)
  yield call(ClearMessage)
  yield put(setContactList({ contact_list: [], contact_map: {} }))
  yield put(setFollowList([]))
  yield put(setFriendList([]))
  yield put(setSessionList([]))
  yield put(setGroupList([]))
  yield put(setChannelList([]))
  yield put(setCurrentSession(null))
  yield put(setGroupList([]))
  yield put(setChannelList([]))
}

function* UpdateNickname(action) {
  yield put(setNickname(action.payload.nickname))

  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  let contact = yield call(() => CommonDB.Contacts
    .where('Address')
    .equals(action.payload.address)
    .first())
  if (contact !== undefined) {
    let updatedCount = yield call(() => CommonDB.Contacts
      .where('Address')
      .equals(action.payload.address)
      .modify(tmp => {
        tmp.Nickname = action.payload.nickname
      }))
  } else {
    yield call(() => safeAddItem(CommonDB, 'Contacts', 'Address', { Address: action.payload.address, Nickname: action.payload.nickname, UpdatedAt: Date.now() }))
  }
}

// LocalAccount
function* LoadLocalAccountList() {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }

  try {
    let local_account_list = yield call(() => CommonDB.LocalAccounts
      .orderBy('UpdatedAt')
      .reverse()
      .toArray())
    yield put(loadLocalAccountListSuccess({ local_account_list: local_account_list }))
  } catch (error) {
    console.log(error)
    // CommonDB.delete()
  }
}

function* LocalAccountAdd({ payload }) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  let tmp = {
    Address: payload.address,
    Salt: payload.salt,
    CipherData: payload.cipher_data,
    UpdatedAt: Date.now()
  }
  let local_account = yield call(() => CommonDB.LocalAccounts
    .where('Address')
    .equals(tmp.Address)
    .first())
  if (local_account !== undefined) {
    let updatedCount = yield call(() => CommonDB.LocalAccounts
      .where('Address')
      .equals(tmp.Address)
      .modify(c => {
        c.Salt = tmp.Salt
        c.CipherData = tmp.CipherData
        c.UpdatedAt = tmp.UpdatedAt
      }))
  } else {
    yield call(() => safeAddItem(CommonDB, 'LocalAccounts', 'Address', tmp))
  }

  yield put(loadLocalAccountListStart())
}

function* LocalAccountDel({ payload }) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  let local_account = yield call(() => CommonDB.LocalAccounts
    .where('Address')
    .equals(payload.address)
    .first())
  if (local_account !== undefined) {
    try {
      let tmpSeed = decryptWithPassword(payload.password, local_account.Salt, local_account.CipherData)
      if (tmpSeed !== '') {
        yield call(() => CommonDB.LocalAccounts.delete(payload.address))
        yield put(loadLocalAccountListStart())
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
  if (CommonDB === null) {
    yield call(initCommonDB)
  }

  let tmp_contact_list = yield call(() => CommonDB.Contacts
    .orderBy('UpdatedAt')
    .reverse()
    .toArray())

  let contact_list = []
  let contact_map = {}
  let follow_list = []
  let friend_list = []
  let tmp_follow_list = yield call(() => CommonDB.Follows
    .orderBy('UpdatedAt')
    .reverse()
    .toArray())
  let tmp_friend_list = yield call(() => CommonDB.Friends
    .orderBy('UpdatedAt')
    .reverse()
    .toArray())
  const address = yield select(state => state.User.Address)
  for (let i = 0; i < tmp_contact_list.length; i++) {
    let contact = tmp_contact_list[i]
    if (address !== contact.Address) {
      contact_map[contact.Address] = contact.Nickname
      for (let j = 0; j < tmp_follow_list.length; j++) {
        const follow = tmp_follow_list[j]
        if (follow.Local === address && follow.Remote === contact.Address) {
          contact.IsFollow = true
          follow_list.push(follow.Remote)
          break
        }
      }
      for (let j = 0; j < tmp_friend_list.length; j++) {
        const friend = tmp_friend_list[j]
        if (friend.Local === address && friend.Remote === contact.Address) {
          contact.IsFriend = true
          friend_list.push(friend.Remote)
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
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  let tmp = {
    Address: payload.address,
    Nickname: payload.nickname,
    UpdatedAt: Date.now()
  }
  let contact = yield call(() => CommonDB.Contacts
    .where('Address')
    .equals(tmp.Address)
    .first())
  if (contact !== undefined) {
    let updatedCount = yield call(() => CommonDB.Contacts
      .where('Address')
      .equals(tmp.Address)
      .modify(c => {
        c.Nickname = tmp.Nickname
      }))
  } else {
    yield call(() => safeAddItem(CommonDB, 'Contacts', 'Address', tmp))
  }

  yield call(LoadContactList)
}

function* ContactDel({ payload }) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  let contact_address = payload.contact_address
  let contact = yield call(() => CommonDB.Contacts
    .where('Address')
    .equals(contact_address)
    .first())
  if (contact) {
    yield call(() => CommonDB.Contacts.delete(contact_address))
  }
  yield call(LoadContactList)
}

function* ContactToggleIsFollow({ payload }) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  const address = yield select(state => state.User.Address)
  let contact_address = payload.contact_address
  let follow = yield call(() => CommonDB.Follows
    .where('[Local+Remote]')
    .equals([address, contact_address])
    .first())
  if (follow !== undefined) {
    yield call(() => CommonDB.Follows
      .where('[Local+Remote]')
      .equals([address, contact_address])
      .delete())
  } else {
    yield call(() => CommonDB.Follows.add({ Local: address, Remote: contact_address, UpdatedAt: Date.now() }))
  }
  yield call(LoadContactList)
}

export function* ContactToggleIsFriend({ payload }) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  const address = yield select(state => state.User.Address)
  const session_list_old = yield select(state => state.Messenger.SessionList)
  let contact_address = payload.contact_address
  let friend = yield call(() => CommonDB.Friends
    .where('[Local+Remote]')
    .equals([address, contact_address])
    .first())
  if (friend !== undefined) {
    yield call(() => CommonDB.Friends
      .where('[Local+Remote]')
      .equals([address, contact_address])
      .delete())
    yield put(setSessionList(session_list_old.filter(s => s.address !== contact_address)))
  } else {
    yield call(() => CommonDB.Friends.add({ Local: address, Remote: contact_address, UpdatedAt: Date.now() }))
    yield put(setSessionList([...session_list_old, { type: SessionType.Private, address: contact_address, updated_at: Date.now() }]))
  }
  yield call(LoadContactList)
}

export function* watchUser() {
  yield takeLatest(loginStart.type, handleLogin)
  yield takeLatest(logoutStart.type, handleLogout)

  yield takeLatest(loadLocalAccountListStart.type, LoadLocalAccountList)
  yield takeLatest('LocalAccountAdd', LocalAccountAdd)
  yield takeLatest('LocalAccountDel', LocalAccountDel)

  yield takeLatest('UpdateNickname', UpdateNickname)
  yield takeLatest('ContactAdd', ContactAdd)
  yield takeLatest('ContactDel', ContactDel)
  yield takeLatest('ContactToggleIsFollow', ContactToggleIsFollow)
  yield takeLatest('ContactToggleIsFriend', ContactToggleIsFriend)
}