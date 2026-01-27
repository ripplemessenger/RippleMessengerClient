import { createSlice } from '@reduxjs/toolkit'
import { BulletinPageTab } from '../../lib/AppConst'

const MessengerSlice = createSlice({
  name: 'Messenger',
  initialState: {
    message_generator: null,
    MessengerConnStatus: false,

    // server
    CurrentServer: null,
    ServerList: [],

    // bulletin publish
    ShowPublishFlag: false,
    ShowForwardFlag: false,
    ForwardBulletin: null,
    CurrentBulletinSequence: 0,
    PublishTagList: [],
    PublishQuoteList: [],
    PublishFileList: [],

    // bulletin display
    activeTabBulletin: BulletinPageTab.Mine,
    MineBulletinList: [],
    FollowBulletinList: [],
    BookmarkBulletinList: [],

    DisplayBulletin: null,
    DisplayBulletinReplyList: [],
    DisplayBulletinReplyPage: 1,
    DisplayBulletinReplyTotalPage: 1,

    RandomBulletin: null,

    BulletinAddressPage: 1,
    BulletinAddressTotalPage: 1,
    BulletinAddressList: [],

    SearchTagList: [],
    TagBulletinList: [],
    TagBulletinPage: 1,
    TagBulletinTotalPage: 1,

    // channel
    ChannelList: [],
    CurrentChannel: null,
    CurrentChannelBulletinList: [],
    ComposeSpeakerList: [],

    // private
    SessionList: [],
    CurrentSession: null,
    CurrentSessionMessageList: [],

    // group
    GroupList: [],
    // for handshake
    TotalGroupMemberList: [],
    ComposeMemberList: [],
    GroupRequestList: [],
  },
  reducers: {
    updateMessengerConnStatus: (state, action) => {
      state.MessengerConnStatus = action.payload
    },

    setCurrentServer: (state, action) => {
      state.CurrentServer = action.payload
    },
    setServerList: (state, action) => {
      state.ServerList = action.payload
    },

    setPublishFlag: (state, action) => {
      state.ShowPublishFlag = action.payload
    },
    setForwardFlag: (state, action) => {
      state.ShowForwardFlag = action.payload
    },
    setForwardBulletin: (state, action) => {
      state.ForwardBulletin = action.payload
    },
    setCurrentBulletinSequence: (state, action) => {
      state.CurrentBulletinSequence = action.payload
    },
    setPublishTagList: (state, action) => {
      state.PublishTagList = action.payload
    },
    setPublishQuoteList: (state, action) => {
      state.PublishQuoteList = action.payload
    },
    setPublishFileList: (state, action) => {
      state.PublishFileList = action.payload
    },

    // bulletin
    setActiveTabBulletin: (state, action) => {
      state.activeTabBulletin = action.payload
    },
    setDisplayBulletin: (state, action) => {
      state.DisplayBulletin = action.payload
      state.DisplayBulletinReplyList = []
    },
    setDisplayBulletinReplyList: (state, action) => {
      console.log(action)
      state.DisplayBulletinReplyList = action.payload.List
      state.DisplayBulletinReplyPage = action.payload.Page
      state.DisplayBulletinReplyTotalPage = action.payload.TotalPage
    },
    setRandomBulletin: (state, action) => {
      state.RandomBulletin = action.payload
    },
    setMineBulletinList: (state, action) => {
      state.MineBulletinList = action.payload
    },
    setFollowBulletinList: (state, action) => {
      state.FollowBulletinList = action.payload
    },
    setBookmarkBulletinList: (state, action) => {
      state.BookmarkBulletinList = action.payload
    },
    setBulletinAddressList: (state, action) => {
      state.BulletinAddressPage = action.payload.Page
      state.BulletinAddressTotalPage = action.payload.TotalPage
      state.BulletinAddressList = action.payload.List
    },
    setTagBulletinList: (state, action) => {
      state.TagBulletinList = action.payload.List
      state.TagBulletinPage = action.payload.Page
      state.TagBulletinTotalPage = action.payload.TotalPage
    },
    setSearchTagList: (state, action) => {
      state.SearchTagList = action.payload
    },

    // channel
    setChannelList: (state, action) => {
      state.ChannelList = action.payload
    },
    setCurrentChannel: (state, action) => {
      state.CurrentChannel = action.payload
    },
    setCurrentChannelBulletinList: (state, action) => {
      state.CurrentChannelBulletinList = action.payload
    },
    setComposeSpeakerList: (state, action) => {
      state.ComposeSpeakerList = action.payload
    },

    // session
    setSessionList: (state, action) => {
      state.SessionList = action.payload
    },
    setCurrentSession: (state, action) => {
      state.CurrentSession = action.payload
    },
    setCurrentSessionMessageList: (state, action) => {
      state.CurrentSessionMessageList = action.payload
    },

    // group
    setGroupList: (state, action) => {
      state.GroupList = action.payload
    },
    setTotalGroupMemberList: (state, action) => {
      state.TotalGroupMemberList = action.payload
    },
    setComposeMemberList: (state, action) => {
      state.ComposeMemberList = action.payload
    },
    setGroupRequestList: (state, action) => {
      state.GroupRequestList = action.payload
    },
  }
})

export const {
  updateMessengerConnStatus,

  setCurrentServer,
  setServerList,

  setPublishFlag,
  setForwardFlag,
  setForwardBulletin,
  setCurrentBulletinSequence,
  setPublishTagList,
  setPublishQuoteList,
  setPublishFileList,

  setDisplayBulletin,
  setDisplayBulletinReplyList,
  setRandomBulletin,
  setMineBulletinList,
  setFollowBulletinList,
  setBookmarkBulletinList,
  setBulletinAddressList,
  setTagBulletinList,
  setSearchTagList,

  setActiveTabBulletin,

  // channel
  setChannelList,
  setCurrentChannel,
  setCurrentChannelBulletinList,
  setComposeSpeakerList,

  // session
  setSessionList,
  setCurrentSession,
  setCurrentSessionMessageList,

  // group
  setGroupList,
  setTotalGroupMemberList,
  setComposeMemberList,
  setGroupRequestList,
} = MessengerSlice.actions
export default MessengerSlice.reducer