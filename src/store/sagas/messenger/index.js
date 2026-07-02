// Barrel file for messenger saga modules.
// Re-exports all public symbols for backward compatibility.
// External consumers (UserSaga, TaskSaga, store/index) should import from here.

// Root watcher (imported by store/index.js)
export { watchMessenger } from '../messenger.watcher'

// Action creators (preferred export — Redux dispatches these as plain objects)
// Covers all symbols that have both an action creator and a saga handler.
export {
  // Server management
  LoadServerList,
  ServerAdd,
  ServerDel,
  ServerSetDefault,
  ServerToggle,

  // Bulletin loading
  LoadPortalBulletin,
  LoadAddressBulletin,
  LoadFollowBulletin,
  LoadBookmarkBulletin,
  LoadBulletin,
  RequestRandomBulletin,
  RequestServerAddress,
  RequestReplyBulletin,
  RequestTagBulletin,

  // Avatar
  CheckAvatar,
  SaveSelfAvatar,

  // Bulletin file transfer
  FetchBulletinFile,
  SaveBulletinFile,

  // Chat file transfer
  FetchPrivateChatFile,
  FetchGroupChatFile,
  FetchChatFile,
  SaveChatFile,

  // Bulletin publish
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

  // Bulletin local
  UploadBulletin,

  // Session
  LoadSessionList,
  LoadCurrentSession,

  // File send
  SendFile,

  // Chat
  SendContent,
  ShowForwardBulletin,
  ForwardBulletin,

  // Group compose
  ComposeMemberAdd,
  ComposeMemberDel,

  // Group management
  CreateGroup,
  DeleteGroup,
  AcceptGroupRequest,
} from '../messenger.actions'

// Saga-only: bulletin & avatar internal helpers (no action creator)
export {
  CacheBulletin,
  AvatarRequest,
  RequestAvatarFile,
  RequestNextBulletin,
  RefreshPortalBulletin,
  LoadMineBulletinSequence,
  FetchFollowBulletin,
  RefreshFollowBulletin,
  saveLocalFile,
  SubscribeFollow,
} from '../messenger.bulletin'

// Saga-only: private chat
export {
  SyncPrivateMessage,
  InitHandshake,
  LoadPrivateSession,
  SendPrivateContent,
  RefreshPrivateMessageList,
} from '../messenger.private'

// Saga-only: group chat
export {
  RefreshGroupMessageList,
  LoadGroupSession,
  SendGroupContent,
  GroupSync,
} from '../messenger.group'

// Saga-only: core messaging utilities
export {
  SendMessage,
  ConnectServer,
  getFileRequestList,
  setFileRequestList,
  pushFileRequest,
  genFileNonce,
} from '../messenger.core'

// Saga-only: MessengerSaga internal helpers
export {
  LoadGroupList,
  LoadGroupRequestList,
} from '../MessengerSaga'
