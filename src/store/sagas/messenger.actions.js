import { createAction } from '@reduxjs/toolkit'

// These are command actions dispatched from components/sagas to trigger
// saga workers. They do not have corresponding reducers.

// ==================== Server Management ====================
export const LoadServerList = createAction('LoadServerList')
export const ServerAdd = createAction('ServerAdd')
export const ServerDel = createAction('ServerDel')
export const ServerSetDefault = createAction('ServerSetDefault')
export const ServerToggle = createAction('ServerToggle')

// ==================== Bulletin Loading ====================
export const LoadPortalBulletin = createAction('LoadPortalBulletin')
export const LoadAddressBulletin = createAction('LoadAddressBulletin')
export const LoadFollowBulletin = createAction('LoadFollowBulletin')
export const LoadBookmarkBulletin = createAction('LoadBookmarkBulletin')
export const LoadBulletin = createAction('LoadBulletin')
export const RequestRandomBulletin = createAction('RequestRandomBulletin')
export const RequestServerAddress = createAction('RequestServerAddress')
export const RequestReplyBulletin = createAction('RequestReplyBulletin')
export const RequestTagBulletin = createAction('RequestTagBulletin')

// ==================== Avatar ====================
export const CheckAvatar = createAction('CheckAvatar')
export const SaveSelfAvatar = createAction('SaveSelfAvatar')

// ==================== File ====================
export const FetchBulletinFile = createAction('FetchBulletinFile')
export const SaveBulletinFile = createAction('SaveBulletinFile')
export const FetchPrivateChatFile = createAction('FetchPrivateChatFile')
export const FetchGroupChatFile = createAction('FetchGroupChatFile')
export const FetchChatFile = createAction('FetchChatFile')
export const SaveChatFile = createAction('SaveChatFile')

// ==================== Bulletin Publish ====================
export const PublishBulletin = createAction('PublishBulletin')
export const BulletinTagAdd = createAction('BulletinTagAdd')
export const BulletinTagDel = createAction('BulletinTagDel')
export const BulletinQuoteAdd = createAction('BulletinQuoteAdd')
export const BulletinQuoteDel = createAction('BulletinQuoteDel')
export const BulletinFileAdd = createAction('BulletinFileAdd')
export const BulletinFileDel = createAction('BulletinFileDel')
export const BulletinReply = createAction('BulletinReply')
export const BulletinQuote = createAction('BulletinQuote')
export const BulletinMarkToggle = createAction('BulletinMarkToggle')

// ==================== Bulletin Local ====================
export const UploadBulletin = createAction('UploadBulletin')

// ==================== Session ====================
export const LoadSessionList = createAction('LoadSessionList')
export const LoadCurrentSession = createAction('LoadCurrentSession')

// ==================== File Send ====================
export const SendFile = createAction('SendFile')

// ==================== Chat ====================
export const SendContent = createAction('SendContent')
export const ShowForwardBulletin = createAction('ShowForwardBulletin')
export const ForwardBulletin = createAction('ForwardBulletin')

// ==================== Group Compose ====================
export const ComposeMemberAdd = createAction('ComposeMemberAdd')
export const ComposeMemberDel = createAction('ComposeMemberDel')

// ==================== Group Management ====================
export const CreateGroup = createAction('CreateGroup')
export const DeleteGroup = createAction('DeleteGroup')
export const AcceptGroupRequest = createAction('AcceptGroupRequest')

// ==================== Account (UserSaga) ====================
export const AccountAdd = createAction('AccountAdd')
export const AccountDel = createAction('AccountDel')

// ==================== Contact (UserSaga) ====================
export const LoadContactList = createAction('LoadContactList')
export const ContactAdd = createAction('ContactAdd')
export const ContactDel = createAction('ContactDel')
export const ContactToggleIsFollow = createAction('ContactToggleIsFollow')
export const ContactToggleIsFriend = createAction('ContactToggleIsFriend')

// ==================== Storage Management ====================
export const LoadStorageSummary = createAction('LoadStorageSummary')
export const LoadBulletinManagementList = createAction('LoadBulletinManagementList')
export const DeleteBulletinItem = createAction('DeleteBulletinItem')
export const BulkDeleteBulletins = createAction('BulkDeleteBulletins')
export const SearchBulletinManagementList = createAction('SearchBulletinManagementList')
export const LoadBulletinManagementByTag = createAction('LoadBulletinManagementByTag')
export const LoadAllTags = createAction('LoadAllTags')
export const LoadFileManagementList = createAction('LoadFileManagementList')
export const DeleteFileItem = createAction('DeleteFileItem')
export const ClearOrphanedFiles = createAction('ClearOrphanedFiles')
export const BulkDeleteFiles = createAction('BulkDeleteFiles')
export const ClearAvatarCache = createAction('ClearAvatarCache')

// ==================== Bulletin Management ====================
export const LoadBulletinManagement = createAction('LoadBulletinManagement')
export const DeleteBulletin = createAction('DeleteBulletin')
export const ClearAllBulletins = createAction('ClearAllBulletins')

// ==================== File Management ====================
export const LoadCachedFiles = createAction('LoadCachedFiles')
export const DeleteCachedFile = createAction('DeleteCachedFile')
