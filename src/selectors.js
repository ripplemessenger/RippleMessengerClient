import { createSelector } from '@reduxjs/toolkit'

// Root slice accessors
export const selectMessenger = state => state.Messenger
export const selectUser = state => state.User
export const selectCommon = state => state.Common

// Connection status — used by Header, ConnectionStatusBanner, useBulletinLoad, useMessengerConnStatus
export const selectMessengerConnStatus = createSelector(
  [selectMessenger],
  messenger => messenger.MessengerConnStatus
)

// Connected server count derived from ConnsStatus — used by TabMessengerNetwork
export const selectConnectedServerCount = createSelector(
  [selectMessenger],
  messenger => {
    const conns = messenger.ConnsStatus
    if (!conns) return 0
    return Object.values(conns).filter(status => status === WebSocket.OPEN).length
  }
)

// Total new message count across all sessions — computed by setSessionList reducer, already a number
export const selectTotalNewMessages = createSelector(
  [selectMessenger],
  messenger => messenger.SessionNewMsgCount || 0
)

// Portal bulletin list with pagination — most visited page
export const selectPortalBulletins = createSelector(
  [selectMessenger],
  messenger => ({
    list: messenger.PortalBulletinList || [],
    page: messenger.PortalBulletinPage || 1,
    totalPage: messenger.PortalBulletinTotalPage || 1,
  })
)

// Portal publish UI flags — used by PortalPage
export const selectPublishFlags = createSelector(
  [selectMessenger],
  messenger => ({
    showPublish: messenger.ShowPublishFlag,
    showForward: messenger.ShowForwardFlag,
    showPaste: messenger.ShowPasteFlag,
  })
)

// Follow bulletin list with pagination
export const selectFollowBulletins = createSelector(
  [selectMessenger],
  messenger => ({
    list: messenger.FollowBulletinList || [],
    page: messenger.FollowBulletinPage || 1,
    totalPage: messenger.FollowBulletinTotalPage || 1,
  })
)

// Bookmark bulletin list with pagination
export const selectBookmarkBulletins = createSelector(
  [selectMessenger],
  messenger => ({
    list: messenger.BookmarkBulletinList || [],
    page: messenger.BookmarkBulletinPage || 1,
    totalPage: messenger.BookmarkBulletinTotalPage || 1,
  })
)

// Tag bulletin list with pagination and search tags
export const selectTagBulletins = createSelector(
  [selectMessenger],
  messenger => ({
    list: messenger.TagBulletinList || [],
    page: messenger.TagBulletinPage || 1,
    totalPage: messenger.TagBulletinTotalPage || 1,
    searchTags: messenger.SearchTagList || [],
  })
)

// Address bulletin list with pagination
export const selectAddressBulletins = createSelector(
  [selectMessenger],
  messenger => ({
    list: messenger.AddressBulletinList || [],
    page: messenger.AddressBulletinPage || 1,
    totalPage: messenger.AddressBulletinTotalPage || 1,
    address: messenger.BulletinAddress,
  })
)

// Random bulletin list
export const selectRandomBulletins = createSelector(
  [selectMessenger],
  messenger => messenger.RandomBulletinList || []
)

// Chat session data — SessionList + CurrentSession + messages
export const selectChatSessions = createSelector(
  [selectMessenger],
  messenger => messenger.SessionList || []
)

export const selectCurrentSession = createSelector(
  [selectMessenger],
  messenger => messenger.CurrentSession
)

export const selectCurrentSessionMessages = createSelector(
  [selectMessenger],
  messenger => messenger.CurrentSessionMessageList || []
)

// Group member list for a given group hash
export const selectGroupMembers = createSelector(
  [selectMessenger],
  messenger => messenger.GroupMemberMap || {}
)

// Flash notice state — used by MainLayout
export const selectFlashNotice = createSelector(
  [selectCommon],
  common => ({
    message: common.FlashNoticeMessage,
    duration: common.FlashNoticeDuration || 0,
  })
)

// JSON display modal state — used by MainLayout and JsonDiv
export const selectDisplayJson = createSelector(
  [selectCommon],
  common => ({
    json: common.DisplayJson,
    isExpand: common.DisplayJsonOption,
  })
)
