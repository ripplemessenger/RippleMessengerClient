import { fork, takeEvery, takeLatest } from 'redux-saga/effects'

// WebSocket listener
import { WebsocketListener } from './messenger.ws'

// Action creators for saga commands
import {
  LoadServerList as LoadServerListAction,
  ServerAdd,
  ServerDel,
  ServerSetDefault,
  ServerToggle,
  LoadPortalBulletin,
  LoadAddressBulletin,
  LoadFollowBulletin,
  LoadBookmarkBulletin,
  LoadBulletin,
  RequestRandomBulletin,
  RequestServerAddress,
  RequestReplyBulletin,
  RequestTagBulletin,
  CheckAvatar,
  SaveSelfAvatar,
  FetchBulletinFile,
  SaveBulletinFile,
  FetchPrivateChatFile,
  FetchGroupChatFile,
  FetchChatFile,
  SaveChatFile,
  PublishBulletin,
  BulletinTagAdd,
  BulletinTagDel,
  BulletinQuoteAdd,
  BulletinQuoteDel,
  BulletinFileAdd,
  BulletinFileDel,
  BulletinReply,
  BulletinQuote,
  BulletinMarkToggle,
  UploadBulletin,
  LoadSessionList as LoadSessionListAction,
  LoadCurrentSession,
  SendFile,
  SendContent,
  ShowForwardBulletin,
  ForwardBulletin,
  ComposeMemberAdd,
  ComposeMemberDel,
  CreateGroup,
  DeleteGroup,
  AcceptGroupRequest,
} from './messenger.actions'

// Bulletin & avatar
import {
  UploadBulletin as UploadBulletinHandler,
  CheckAvatar as CheckAvatarHandler,
  SaveSelfAvatar as SaveSelfAvatarHandler,
  LoadPortalBulletin as LoadPortalBulletinHandler,
  LoadAddressBulletin as LoadAddressBulletinHandler,
  LoadFollowBulletin as LoadFollowBulletinHandler,
  LoadBookmarkBulletin as LoadBookmarkBulletinHandler,
  LoadBulletin as LoadBulletinHandler,
  RequestRandomBulletin as RequestRandomBulletinHandler,
  RequestServerAddress as RequestServerAddressHandler,
  RequestReplyBulletin as RequestReplyBulletinHandler,
  RequestTagBulletin as RequestTagBulletinHandler,
  PublishBulletin as PublishBulletinHandler,
  BulletinTagAdd as BulletinTagAddHandler,
  BulletinTagDel as BulletinTagDelHandler,
  BulletinQuoteAdd as BulletinQuoteAddHandler,
  BulletinQuoteDel as BulletinQuoteDelHandler,
  BulletinReply as BulletinReplyHandler,
  BulletinQuote as BulletinQuoteHandler,
  BulletinFileAdd as BulletinFileAddHandler,
  BulletinFileDel as BulletinFileDelHandler,
  BulletinMarkToggle as BulletinMarkToggleHandler,
} from './messenger.bulletin'

// Session management
import { LoadSessionList } from './messenger.session'

// File transfer
import {
  FetchBulletinFile as FetchBulletinFileHandler,
  SaveBulletinFile as SaveBulletinFileHandler,
  FetchPrivateChatFile as FetchPrivateChatFileHandler,
  FetchGroupChatFile as FetchGroupChatFileHandler,
  FetchChatFile as FetchChatFileHandler,
  SaveChatFile as SaveChatFileHandler,
  SendFile as SendFileHandler,
} from './messenger.file'

// Private chat
import { ShowForwardBulletin as ShowForwardBulletinHandler, ForwardBulletin as ForwardBulletinHandler } from './messenger.private'

// Group chat
import { ComposeMemberAdd as ComposeMemberAddHandler, ComposeMemberDel as ComposeMemberDelHandler, CreateGroup as CreateGroupHandler, DeleteGroup as DeleteGroupHandler } from './messenger.group'

// Server management & session dispatchers (defined in MessengerSaga.js)
import { LoadServerList, ServerAdd as ServerAddHandler, ServerDel as ServerDelHandler, ServerSetDefault as ServerSetDefaultHandler, ServerToggle as ServerToggleHandler, LoadCurrentSession as LoadCurrentSessionHandler, SendContent as SendContentHandler, AcceptGroupRequest as AcceptGroupRequestHandler } from './MessengerSaga'

export { WebsocketListener } from './messenger.ws'

/**
 * Root messenger watcher.
 * Registers all takeEvery/takeLatest sagas and forks the WebSocket listener.
 */
export function* watchMessenger() {
  yield fork(WebsocketListener)

  // Server management
  yield takeLatest(LoadServerListAction.type, LoadServerList)
  yield takeLatest(ServerAdd.type, ServerAddHandler)
  yield takeLatest(ServerDel.type, ServerDelHandler)
  yield takeLatest(ServerSetDefault.type, ServerSetDefaultHandler)
  yield takeLatest(ServerToggle.type, ServerToggleHandler)

  // Bulletin loading
  yield takeEvery(LoadPortalBulletin.type, LoadPortalBulletinHandler)
  yield takeEvery(LoadAddressBulletin.type, LoadAddressBulletinHandler)
  yield takeEvery(LoadFollowBulletin.type, LoadFollowBulletinHandler)
  yield takeEvery(LoadBookmarkBulletin.type, LoadBookmarkBulletinHandler)
  yield takeLatest(LoadBulletin.type, LoadBulletinHandler)
  yield takeLatest(RequestRandomBulletin.type, RequestRandomBulletinHandler)
  yield takeLatest(RequestServerAddress.type, RequestServerAddressHandler)
  yield takeLatest(RequestReplyBulletin.type, RequestReplyBulletinHandler)
  yield takeLatest(RequestTagBulletin.type, RequestTagBulletinHandler)

  // Avatar
  yield takeEvery(CheckAvatar.type, CheckAvatarHandler)
  yield takeLatest(SaveSelfAvatar.type, SaveSelfAvatarHandler)

  // File
  yield takeLatest(FetchBulletinFile.type, FetchBulletinFileHandler)
  yield takeLatest(SaveBulletinFile.type, SaveBulletinFileHandler)
  yield takeLatest(FetchPrivateChatFile.type, FetchPrivateChatFileHandler)
  yield takeLatest(FetchGroupChatFile.type, FetchGroupChatFileHandler)
  yield takeLatest(FetchChatFile.type, FetchChatFileHandler)
  yield takeLatest(SaveChatFile.type, SaveChatFileHandler)

  // Bulletin publish
  yield takeLatest(PublishBulletin.type, PublishBulletinHandler)
  yield takeLatest(BulletinTagAdd.type, BulletinTagAddHandler)
  yield takeLatest(BulletinTagDel.type, BulletinTagDelHandler)
  yield takeLatest(BulletinQuoteAdd.type, BulletinQuoteAddHandler)
  yield takeLatest(BulletinQuoteDel.type, BulletinQuoteDelHandler)
  yield takeLatest(BulletinFileAdd.type, BulletinFileAddHandler)
  yield takeLatest(BulletinFileDel.type, BulletinFileDelHandler)
  yield takeLatest(BulletinReply.type, BulletinReplyHandler)
  yield takeLatest(BulletinQuote.type, BulletinQuoteHandler)

  yield takeLatest(BulletinMarkToggle.type, BulletinMarkToggleHandler)

  yield takeLatest(UploadBulletin.type, UploadBulletinHandler)

  // Session
  yield takeLatest(LoadSessionListAction.type, LoadSessionList)
  yield takeLatest(LoadCurrentSession.type, LoadCurrentSessionHandler)
  yield takeLatest(SendFile.type, SendFileHandler)

  // Chat
  yield takeLatest(SendContent.type, SendContentHandler)
  yield takeLatest(ShowForwardBulletin.type, ShowForwardBulletinHandler)
  yield takeLatest(ForwardBulletin.type, ForwardBulletinHandler)

  // Group
  yield takeLatest(ComposeMemberAdd.type, ComposeMemberAddHandler)
  yield takeLatest(ComposeMemberDel.type, ComposeMemberDelHandler)
  yield takeLatest(CreateGroup.type, CreateGroupHandler)
  yield takeLatest(DeleteGroup.type, DeleteGroupHandler)
  yield takeLatest(AcceptGroupRequest.type, AcceptGroupRequestHandler)
}
