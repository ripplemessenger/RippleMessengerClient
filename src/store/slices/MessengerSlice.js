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
    MineBulletinPage: 1,
    MineBulletinTotalPage: 1,

    FollowBulletinList: [],
    FollowBulletinPage: 1,
    FollowBulletinTotalPage: 1,

    BookmarkBulletinList: [],
    BookmarkBulletinPage: 1,
    BookmarkBulletinTotalPage: 1,

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
    // for follow
    SubscribeList: [],
    CurrentChannel: null,
    ChannelBulletinList: [],
    ChannelBulletinPage: 1,
    ChannelBulletinTotalPage: 1,
    ComposeSpeakerList: [],

    // private
    SessionList: [],
    SessionNewMsgCount: 0,
    CurrentSession: null,
    CurrentSessionMessageList: [],

    // group
    GroupList: [],
    GroupMemberMap: {},

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
      state.DisplayBulletinReplyList = action.payload.List
      state.DisplayBulletinReplyPage = action.payload.Page
      state.DisplayBulletinReplyTotalPage = action.payload.TotalPage
    },
    setRandomBulletin: (state, action) => {
      state.RandomBulletin = action.payload
    },
    setMineBulletinList: (state, action) => {
      state.MineBulletinPage = action.payload.Page
      state.MineBulletinTotalPage = action.payload.TotalPage
      state.MineBulletinList = action.payload.List
    },
    setFollowBulletinList: (state, action) => {
      state.FollowBulletinPage = action.payload.Page
      state.FollowBulletinTotalPage = action.payload.TotalPage
      state.FollowBulletinList = action.payload.List
    },
    setBookmarkBulletinList: (state, action) => {
      state.BookmarkBulletinPage = action.payload.Page
      state.BookmarkBulletinTotalPage = action.payload.TotalPage
      state.BookmarkBulletinList = action.payload.List
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
      const channel_list = action.payload
      state.ChannelList = channel_list
      let subscribe_list = []
      for (let i = 0; i < channel_list.length; i++) {
        const channel = channel_list[i]
        subscribe_list = subscribe_list.concat(...channel.speaker)
      }
      subscribe_list = [...new Set(subscribe_list)]
      state.SubscribeList = subscribe_list
    },
    setCurrentChannel: (state, action) => {
      state.CurrentChannel = action.payload
    },
    setChannelBulletinList: (state, action) => {
      state.ChannelBulletinList = action.payload.List
      state.ChannelBulletinPage = action.payload.Page
      state.ChannelBulletinTotalPage = action.payload.TotalPage
    },
    setComposeSpeakerList: (state, action) => {
      state.ComposeSpeakerList = action.payload
    },

    // session
    setSessionList: (state, action) => {
      state.SessionList = action.payload
      let count = 0
      for (let i = 0; i < action.payload.length; i++) {
        const session = action.payload[i]
        count += session.new_msg_count
      }
      state.SessionNewMsgCount = count
    },
    setCurrentSession: (state, action) => {
      state.CurrentSession = action.payload
    },
    setCurrentSessionMessageList: (state, action) => {
      state.CurrentSessionMessageList = action.payload
    },

    // group
    setGroupList: (state, action) => {
      const group_list = action.payload.group_list
      state.GroupList = group_list

      let group_member_map = {}
      for (let i = 0; i < group_list.length; i++) {
        const group = group_list[i]
        group_member_map[group.hash] = group.member
        group_member_map[group.hash].push(group.created_by)
      }
      state.GroupMemberMap = group_member_map

      let total_member = []
      for (let i = 0; i < group_list.length; i++) {
        const group = group_list[i]
        total_member.push(group.created_by)
        total_member = [].concat(total_member, group.member)
        total_member = total_member.filter(a => a !== action.payload.address)
        total_member = [...new Set(total_member)]
      }
      state.TotalGroupMemberList = total_member
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
  setChannelBulletinList,
  setComposeSpeakerList,

  // session
  setSessionList,
  setCurrentSession,
  setCurrentSessionMessageList,

  // group
  setGroupList,
  setComposeMemberList,
  setGroupRequestList,
} = MessengerSlice.actions
export default MessengerSlice.reducer