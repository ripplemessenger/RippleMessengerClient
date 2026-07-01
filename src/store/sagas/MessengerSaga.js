import { call, put, select } from 'redux-saga/effects'
import Logger from '../../lib/Logger'
import { DefaultServer } from '../../lib/MessengerConst'
import { SessionType } from '../../lib/AppConst'
import { setGroupRequestList, setGroupList, updateMessengerConnStatus, setServerList } from '../slices/MessengerSlice'
import { dbAPI } from '../../db'

// ==================== Re-exports (backward compatibility) ====================
// External consumers (UserSaga, TaskSaga, store/index, messenger.group, messenger.file)
// import symbols from this file. They are defined in the messenger.* modules.

export { watchMessenger } from './messenger.watcher'

export { LoadSessionList } from './messenger.session'

export {
  SyncPrivateMessage,
  InitHandshake,
  LoadPrivateSession,
  SendPrivateContent,
  RefreshPrivateMessageList,
  ShowForwardBulletin,
  ForwardBulletin,
} from './messenger.private'

export {
  RefreshGroupMessageList,
  LoadGroupSession,
  SendGroupContent,
  ComposeMemberAdd,
  ComposeMemberDel,
  CreateGroup,
  DeleteGroup,
  GroupSync,
} from './messenger.group'

export {
  FetchBulletinFile,
  SaveBulletinFile,
  FetchPrivateChatFile,
  FetchGroupChatFile,
  FetchChatFile,
  SaveChatFile,
  SendFile,
} from './messenger.file'

export {
  CacheBulletin,
  UploadBulletin,
  CheckAvatar,
  SaveSelfAvatar,
  AvatarRequest,
  RequestAvatarFile,
  RequestNextBulletin,
  LoadPortalBulletin,
  RefreshPortalBulletin,
  LoadMineBulletinSequence,
  LoadAddressBulletin,
  FetchFollowBulletin,
  LoadFollowBulletin,
  RefreshFollowBulletin,
  LoadBookmarkBulletin,
  LoadBulletin,
  RequestRandomBulletin,
  RequestServerAddress,
  RequestReplyBulletin,
  RequestTagBulletin,
  PublishBulletin,
  BulletinTagAdd,
  BulletinTagDel,
  BulletinQuoteAdd,
  BulletinQuoteDel,
  BulletinReply,
  BulletinQuote,
  saveLocalFile,
  BulletinFileAdd,
  BulletinFileDel,
  BulletinMarkToggle,
  SubscribeFollow,
} from './messenger.bulletin'

// Core messaging (needed by LoadServerList below)
import { ConnectServer } from './messenger.core'

// Private/Group session handlers (needed by dispatchers below)
// Already re-exported above; importing locally for direct use.
import { LoadPrivateSession, SendPrivateContent } from './messenger.private'
import { LoadGroupSession, SendGroupContent } from './messenger.group'

// ==================== Server Management ====================

export function* LoadServerList() {
  try {
    let server_list = yield call(() => dbAPI.getAllServers())
    if (server_list.length === 0) {
      const timestamp = Date.now()
      yield call(() => dbAPI.addServer(DefaultServer, timestamp))
      yield call(() => dbAPI.toggleServerConnect(DefaultServer, true, timestamp))
      server_list.push({
        key: DefaultServer,
        url: DefaultServer,
        updated_at: timestamp,
        is_connect: true
      })
    } else {
      for (let i = 0; i < server_list.length; i++) {
        let server = { ...server_list[i], key: server_list[i].url }
        server_list[i] = server
      }
    }
    yield put(setServerList(server_list))
    yield call(ConnectServer)
  } catch (e) {
    Logger.error('[LoadServerList] failed:', e.message)
  }
}

export function* UpdateConnStatus(action) {
  try {
    const ConnsStatus = yield select(state => state.Messenger.ConnsStatus)
    let tmp = { ...ConnsStatus }
    tmp[action.key] = action.status
    yield put(updateMessengerConnStatus(tmp))
  } catch (e) {
    Logger.error('[UpdateConnStatus] failed:', e.message)
  }
}

export function* ServerAdd({ payload }) {
  try {
    const server = yield call(() => dbAPI.getServerByURL(payload.url))
    if (server === null) {
      yield call(() => dbAPI.addServer(payload.url, Date.now()))
      yield call(() => dbAPI.updateServerPriority())
      yield call(LoadServerList)
    }
  } catch (e) {
    Logger.error('[ServerAdd] failed:', e.message)
  }
}

export function* ServerDel({ payload }) {
  try {
    yield call(() => dbAPI.deleteServer(payload.url))
    yield call(LoadServerList)
  } catch (e) {
    Logger.error('[ServerDel] failed:', e.message)
  }
}

export function* ServerSetDefault({ payload }) {
  try {
    yield call(() => dbAPI.updateServerDefault(payload.url))
    yield call(() => dbAPI.updateServerPriority())
    yield call(LoadServerList)
  } catch (e) {
    Logger.error('[ServerSetDefault] failed:', e.message)
  }
}

export function* ServerToggle({ payload }) {
  try {
    yield call(() => dbAPI.toggleServerConnect(payload.url, payload.is_connect, Date.now()))
    yield call(LoadServerList)
  } catch (e) {
    Logger.error('[ServerToggle] failed:', e.message)
  }
}

// ==================== Session Dispatcher ====================

/** Route session load to the appropriate private/group handler. */
export function* LoadCurrentSession({ payload }) {
  try {
    if (payload.type === SessionType.Private) {
      yield call(LoadPrivateSession, { payload })
    } else if (payload.type === SessionType.Group) {
      yield call(LoadGroupSession, { payload })
    }
  } catch (e) {
    Logger.error('[LoadCurrentSession] failed:', e.message)
  }
}

/** Route content send to the appropriate private/group handler. */
export function* SendContent({ payload }) {
  try {
    const CurrentSession = yield select(state => state.Messenger.CurrentSession)
    if (CurrentSession.type === SessionType.Private) {
      yield call(SendPrivateContent, { payload })
    } else if (CurrentSession.type === SessionType.Group) {
      yield call(SendGroupContent, { payload })
    }
  } catch (e) {
    Logger.error('[SendContent] failed:', e.message)
  }
}

// ==================== Group List ====================

export function* LoadGroupList() {
  try {
    const address = yield select(state => state.User.Address)
    let group_list = yield call(() => dbAPI.getGroups())
    group_list = group_list.filter(g => g.is_accepted === true && (g.created_by === address || g.member.includes(address)))
    yield put(setGroupList({ group_list: group_list, address: address }))
  } catch (e) {
    Logger.error('[LoadGroupList] failed:', e.message)
  }
}

export function* LoadGroupRequestList() {
  try {
    const address = yield select(state => state.User.Address)
    let group_list = yield call(() => dbAPI.getGroups())
    group_list = group_list.filter(g => g.is_accepted === false && (g.created_by === address || g.member.includes(address)))
    yield put(setGroupRequestList(group_list))
  } catch (e) {
    Logger.error('[LoadGroupRequestList] failed:', e.message)
  }
}

export function* AcceptGroupRequest({ payload }) {
  try {
    const address = yield select(state => state.User.Address)
    const group_request = yield call(() => dbAPI.getGroupByHash(payload.hash))
    if (group_request !== null && group_request.is_accepted === false && (group_request.created_by === address || group_request.member.includes(address))) {
      yield call(() => dbAPI.acceptGroupRequest(payload.hash))
      yield call(LoadGroupRequestList)
      yield call(LoadGroupList)
    }
  } catch (e) {
    Logger.error('[AcceptGroupRequest] failed:', e.message)
  }
}
