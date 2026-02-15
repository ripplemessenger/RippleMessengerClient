import { createSlice } from '@reduxjs/toolkit'
import { SettingPageTab } from '../../lib/AppConst'

const UserSlice = createSlice({
  name: 'User',
  initialState: {
    IsAuth: false,
    Seed: null,
    Address: null,
    Nickname: null,
    UserError: null,

    FlashNoticeMessage: null,
    FlashNoticeDuration: 0,
    DisplayJson: null,

    AccountList: [],

    // contact
    ContactList: [],
    ContactMap: {},
    activeTabSetting: SettingPageTab.Me,

    // follow
    FollowList: [],
    // friend
    FriendList: [],
  },
  reducers: {
    loginStart: (state) => {
      state.UserError = null
      state.IsAuth = false
      state.Seed = null
      state.Address = null
      state.Nickname = null
    },
    loginSuccess: (state, action) => {
      state.UserError = null
      state.IsAuth = true
      state.Seed = action.payload.seed
      state.Address = action.payload.address
      state.Nickname = action.payload.nickname
    },
    logoutStart: (state) => {
      state.UserError = null
      state.IsAuth = false
      state.Seed = null
      state.Address = null
      state.Nickname = null
    },
    setNickname: (state, action) => {
      state.Nickname = action.payload
    },

    setFlashNoticeMessage: (state, action) => {
      state.FlashNoticeMessage = action.payload.message
      state.FlashNoticeDuration = action.payload.duration
    },
    setDisplayJson: (state, action) => {
      state.DisplayJson = action.payload.json
      state.DisplayJsonOption = action.payload.isExpand
    },

    // local account
    loadAccountListStart: (state) => {
      state.AccountList = []
    },
    loadAccountListSuccess: (state, action) => {
      state.AccountList = action.payload.account_list
    },

    // contact
    setContactList: (state, action) => {
      state.ContactList = action.payload.contact_list
      state.ContactMap = action.payload.contact_map
    },
    setFollowList: (state, action) => {
      state.FollowList = action.payload
    },
    setFriendList: (state, action) => {
      state.FriendList = action.payload
    },

    setUserError: (state, action) => {
      state.UserError = action.payload
    },

    setActiveTabSetting: (state, action) => {
      state.activeTabSetting = action.payload
    }
  }
})

export const {
  loginStart,
  loginSuccess,
  logoutStart,
  setNickname,

  setFlashNoticeMessage,
  setDisplayJson,

  loadAccountListStart,
  loadAccountListSuccess,

  setContactList,
  setFollowList,
  setFriendList,

  setUserError,

  setActiveTabSetting
} = UserSlice.actions
export default UserSlice.reducer