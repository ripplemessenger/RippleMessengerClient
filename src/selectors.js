import { createSelector } from '@reduxjs/toolkit'

// Root slice accessors
export const selectMessenger = state => state.Messenger
export const selectUser = state => state.User
export const selectCommon = state => state.Common
export const selectUserAddress = state => state.User.Address

// ── Leaf-level field accessors (Messenger slice) ──
// Each selector only invalidates when its own field changes.
const selectMessengerConnStatusField = state => state.Messenger.MessengerConnStatus
const selectConnsStatus = state => state.Messenger.ConnsStatus
const selectSessionNewMsgCount = state => state.Messenger.SessionNewMsgCount
const selectPortalBulletinList = state => state.Messenger.PortalBulletinList
const selectPortalBulletinPage = state => state.Messenger.PortalBulletinPage
const selectPortalBulletinTotalPage = state => state.Messenger.PortalBulletinTotalPage
const selectShowPublishFlag = state => state.Messenger.ShowPublishFlag
const selectShowForwardFlag = state => state.Messenger.ShowForwardFlag
const selectShowPasteFlag = state => state.Messenger.ShowPasteFlag
const selectFollowBulletinList = state => state.Messenger.FollowBulletinList
const selectFollowBulletinPage = state => state.Messenger.FollowBulletinPage
const selectFollowBulletinTotalPage = state => state.Messenger.FollowBulletinTotalPage
const selectBookmarkBulletinList = state => state.Messenger.BookmarkBulletinList
const selectBookmarkBulletinPage = state => state.Messenger.BookmarkBulletinPage
const selectBookmarkBulletinTotalPage = state => state.Messenger.BookmarkBulletinTotalPage
const selectTagBulletinList = state => state.Messenger.TagBulletinList
const selectTagBulletinPage = state => state.Messenger.TagBulletinPage
const selectTagBulletinTotalPage = state => state.Messenger.TagBulletinTotalPage
const selectSearchTagList = state => state.Messenger.SearchTagList
const selectAddressBulletinList = state => state.Messenger.AddressBulletinList
const selectAddressBulletinPage = state => state.Messenger.AddressBulletinPage
const selectAddressBulletinTotalPage = state => state.Messenger.AddressBulletinTotalPage
const selectBulletinAddress = state => state.Messenger.BulletinAddress
const selectRandomBulletinList = state => state.Messenger.RandomBulletinList
const selectSessionList = state => state.Messenger.SessionList
const selectCurrentSessionField = state => state.Messenger.CurrentSession
const selectCurrentSessionMessageList = state => state.Messenger.CurrentSessionMessageList
const selectGroupMemberMap = state => state.Messenger.GroupMemberMap

// Display bulletin + reply data
const selectDisplayBulletin = state => state.Messenger.DisplayBulletin
const selectDisplayBulletinReplyList = state => state.Messenger.DisplayBulletinReplyList
const selectDisplayBulletinReplyPage = state => state.Messenger.DisplayBulletinReplyPage
const selectDisplayBulletinReplyTotalPage = state => state.Messenger.DisplayBulletinReplyTotalPage

// Server address page data
const selectServerAddressPage = state => state.Messenger.ServerAddressPage
const selectServerAddressTotalPage = state => state.Messenger.ServerAddressTotalPage
const selectServerAddressList = state => state.Messenger.ServerAddressList

// Group tab fields
const selectGroupRequestList = state => state.Messenger.GroupRequestList
const selectComposeMemberList = state => state.Messenger.ComposeMemberList
const selectGroupList = state => state.Messenger.GroupList

// Server list + connections — TabMessengerNetwork
const selectServerList = state => state.Messenger.ServerList

// ── Leaf-level field accessors (User slice) ──
const selectUserNickname = state => state.User.Nickname
const selectUserSeed = state => state.User.Seed
const selectUserAccountList = state => state.User.AccountList
const selectActiveTabSettingField = state => state.User.activeTabSetting
const selectContactList = state => state.User.ContactList

// ── Leaf-level field accessors (Common slice) ──
const selectFlashNoticeMessage = state => state.Common.FlashNoticeMessage
const selectFlashNoticeDuration = state => state.Common.FlashNoticeDuration
const selectDisplayJsonField = state => state.Common.DisplayJson
const selectDisplayJsonOption = state => state.Common.DisplayJsonOption

// Connection status — used by Header, ConnectionStatusBanner, useBulletinLoad, useMessengerConnStatus
export const selectMessengerConnStatus = createSelector(
  [selectMessengerConnStatusField],
  field => field
)

// Connected server count derived from ConnsStatus — used by TabMessengerNetwork
export const selectConnectedServerCount = createSelector(
  [selectConnsStatus],
  (conns) => {
    if (!conns) return 0
    return Object.values(conns).filter(status => status === WebSocket.OPEN).length
  }
)

// Total new message count across all sessions — computed by setSessionList reducer, already a number
export const selectTotalNewMessages = createSelector(
  [selectSessionNewMsgCount],
  (count) => count || 0
)

// Portal bulletin list with pagination — most visited page
export const selectPortalBulletins = createSelector(
  [selectPortalBulletinList, selectPortalBulletinPage, selectPortalBulletinTotalPage],
  (list, page, totalPage) => ({
    list: list || [],
    page: page || 1,
    totalPage: totalPage || 1,
  })
)

// Portal publish UI flags — used by PortalPage
export const selectPublishFlags = createSelector(
  [selectShowPublishFlag, selectShowForwardFlag, selectShowPasteFlag],
  (showPublish, showForward, showPaste) => ({
    showPublish,
    showForward,
    showPaste,
  })
)

// Follow bulletin list with pagination
export const selectFollowBulletins = createSelector(
  [selectFollowBulletinList, selectFollowBulletinPage, selectFollowBulletinTotalPage],
  (list, page, totalPage) => ({
    list: list || [],
    page: page || 1,
    totalPage: totalPage || 1,
  })
)

// Bookmark bulletin list with pagination
export const selectBookmarkBulletins = createSelector(
  [selectBookmarkBulletinList, selectBookmarkBulletinPage, selectBookmarkBulletinTotalPage],
  (list, page, totalPage) => ({
    list: list || [],
    page: page || 1,
    totalPage: totalPage || 1,
  })
)

// Tag bulletin list with pagination and search tags
export const selectTagBulletins = createSelector(
  [selectTagBulletinList, selectTagBulletinPage, selectTagBulletinTotalPage, selectSearchTagList],
  (list, page, totalPage, searchTags) => ({
    list: list || [],
    page: page || 1,
    totalPage: totalPage || 1,
    searchTags: searchTags || [],
  })
)

// Address bulletin list with pagination
export const selectAddressBulletins = createSelector(
  [selectAddressBulletinList, selectAddressBulletinPage, selectAddressBulletinTotalPage, selectBulletinAddress],
  (list, page, totalPage, address) => ({
    list: list || [],
    page: page || 1,
    totalPage: totalPage || 1,
    address,
  })
)

// Random bulletin list
export const selectRandomBulletins = createSelector(
  [selectRandomBulletinList],
  (list) => list || []
)

// Chat session data — SessionList + CurrentSession + messages
export const selectChatSessions = createSelector(
  [selectSessionList],
  (list) => list || []
)

export const selectCurrentSession = createSelector(
  [selectCurrentSessionField],
  session => session
)

export const selectCurrentSessionMessages = createSelector(
  [selectCurrentSessionMessageList],
  (list) => list || []
)

// Group member list for a given group hash
export const selectGroupMembers = createSelector(
  [selectGroupMemberMap],
  (map) => map || {}
)

// Flash notice state — used by MainLayout
export const selectFlashNotice = createSelector(
  [selectFlashNoticeMessage, selectFlashNoticeDuration],
  (message, duration) => ({
    message,
    duration: duration || 0,
  })
)

// JSON display modal state — used by MainLayout and JsonDiv
export const selectDisplayJson = createSelector(
  [selectDisplayJsonField, selectDisplayJsonOption],
  (json, isExpand) => ({
    json,
    isExpand,
  })
)

// ─── Combined memoized selectors for page components ───

// BulletinAddressPage — address bulletins + publish/forward flags + connection status + bulletin address
export const selectBulletinAddressData = createSelector(
  [selectAddressBulletinList, selectAddressBulletinTotalPage, selectAddressBulletinPage,
    selectBulletinAddress, selectShowPublishFlag, selectShowForwardFlag, selectMessengerConnStatusField],
  (list, totalPage, page, address, showPublish, showForward, connStatus) => ({
    AddressBulletinList: list || [],
    AddressBulletinTotalPage: totalPage || 0,
    AddressBulletinPage: page || 1,
    BulletinAddress: address,
    ShowPublishFlag: showPublish,
    ShowForwardFlag: showForward,
    MessengerConnStatus: connStatus,
  })
)

// BulletinViewPage — display bulletin + replies with pagination
export const selectDisplayBulletins = createSelector(
  [selectDisplayBulletin, selectDisplayBulletinReplyList, selectDisplayBulletinReplyPage, selectDisplayBulletinReplyTotalPage],
  (bulletin, replyList, replyPage, replyTotalPage) => ({
    DisplayBulletin: bulletin,
    DisplayBulletinReplyList: replyList || [],
    DisplayBulletinReplyPage: replyPage || 1,
    DisplayBulletinReplyTotalPage: replyTotalPage || 0,
  })
)

// TabGroup — group requests + compose members + group list
export const selectGroupData = createSelector(
  [selectGroupRequestList, selectComposeMemberList, selectGroupList],
  (requests, composeMembers, groups) => ({
    GroupRequestList: requests || [],
    ComposeMemberList: composeMembers || [],
    GroupList: groups || [],
  })
)

// TabGroup — user profile fields needed by group tab (Address + ContactList)
export const selectUserTabGroup = createSelector(
  [selectUserAddress, selectContactList],
  (address, contacts) => ({
    Address: address,
    ContactList: contacts || [],
  })
)

// TabMe — user profile fields (includes activeTabSetting since TabMe reads it too)
export const selectUserTabMe = createSelector(
  [selectUserAddress, selectUserNickname, selectUserSeed, selectUserAccountList, selectActiveTabSettingField],
  (address, nickname, seed, accounts, activeTab) => ({
    Address: address,
    Nickname: nickname,
    Seed: seed,
    AccountList: accounts || [],
    activeTabSetting: activeTab,
  })
)

// ServerAddressPage — server address list with pagination
export const selectServerAddressData = createSelector(
  [selectServerAddressList, selectServerAddressPage, selectServerAddressTotalPage],
  (list, page, totalPage) => ({
    ServerAddressList: list || [],
    ServerAddressPage: page || 1,
    ServerAddressTotalPage: totalPage || 0,
  })
)

// SettingPage — active tab for settings sub-navigation
export const selectActiveTabSetting = createSelector(
  [selectActiveTabSettingField],
  tab => tab
)

// TabMessengerNetwork — server list + connection statuses
export const selectServerNetworkData = createSelector(
  [selectServerList, selectConnsStatus],
  (servers, conns) => ({
    ServerList: servers || [],
    ConnsStatus: conns || {},
  })
)
