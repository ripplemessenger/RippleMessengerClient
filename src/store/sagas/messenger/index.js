// Barrel file for messenger saga modules.
// Re-exports all public symbols for backward compatibility.
// External consumers (UserSaga, TaskSaga, store/index) should import from here.

// Root watcher (imported by store/index.js)
export { watchMessenger } from '../messenger.watcher'

// Session management
export { LoadSessionList } from '../messenger.session'

// Private chat
export {
  SyncPrivateMessage,
  InitHandshake,
  LoadPrivateSession,
  SendPrivateContent,
  RefreshPrivateMessageList,
  ShowForwardBulletin,
  ForwardBulletin,
} from '../messenger.private'

// Group chat
export {
  RefreshGroupMessageList,
  LoadGroupSession,
  SendGroupContent,
  ComposeMemberAdd,
  ComposeMemberDel,
  CreateGroup,
  DeleteGroup,
  GroupSync,
} from '../messenger.group'

// Core messaging
export {
  SendMessage,
  ConnectServer,
  getFileRequestList,
  setFileRequestList,
  pushFileRequest,
  genFileNonce,
} from '../messenger.core'

// File transfer
export {
  FetchBulletinFile,
  SaveBulletinFile,
  FetchPrivateChatFile,
  FetchGroupChatFile,
  FetchChatFile,
  SaveChatFile,
  SendFile,
} from '../messenger.file'

// Bulletin & avatar (all re-exports from messenger.bulletin)
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
} from '../messenger.bulletin'

// Server management & session dispatchers (stays in MessengerSaga.js)
export {
  LoadServerList,
  UpdateConnStatus,
  ServerAdd,
  ServerDel,
  ServerSetDefault,
  ServerToggle,
  LoadCurrentSession,
  SendContent,
  LoadGroupList,
  LoadGroupRequestList,
  AcceptGroupRequest,
} from '../MessengerSaga'
