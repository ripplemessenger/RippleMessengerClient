import { createSlice } from '@reduxjs/toolkit'

const MessengerSlice = createSlice({
  name: 'Messenger',
  initialState: {
    message_generator: null,
    MessengerConnStatus: false,
    ConnsStatus: {},

    // server
    ServerList: [],

    // bulletin publish
    ShowPublishFlag: false,
    ShowForwardFlag: false,
    ForwardBulletin: null,
    CurrentBulletinSequence: 0,
    PublishTagList: [],
    PublishQuoteList: [],
    PublishFileList: [],

    // portal
    PortalBulletinList: [],
    PortalBulletinPage: 1,
    PortalBulletinTotalPage: 1,

    RandomBulletinList: [],

    // bulletin display
    BulletinAddress: null,
    AddressBulletinList: [],
    AddressBulletinPage: 1,
    AddressBulletinTotalPage: 1,

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

    ServerAddressPage: 1,
    ServerAddressTotalPage: 1,
    ServerAddressList: [],

    SearchTagList: [],
    TagBulletinList: [],
    TagBulletinPage: 1,
    TagBulletinTotalPage: 1,

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
      state.ConnsStatus = action.payload
      let flag = false
      for (const [key, value] of Object.entries(action.payload)) {
        if (value === WebSocket.OPEN) {
          flag = true
        }
      }
      state.MessengerConnStatus = flag
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
    setDisplayBulletin: (state, action) => {
      state.DisplayBulletin = action.payload
      state.DisplayBulletinReplyList = []
    },
    setDisplayBulletinReplyList: (state, action) => {
      state.DisplayBulletinReplyList = action.payload.List
      state.DisplayBulletinReplyPage = action.payload.Page
      state.DisplayBulletinReplyTotalPage = action.payload.TotalPage
    },
    setRandomBulletinList: (state, action) => {
      state.RandomBulletinList = action.payload
    },
    setPortalBulletinList: (state, action) => {
      state.PortalBulletinPage = action.payload.Page
      state.PortalBulletinTotalPage = action.payload.TotalPage
      state.PortalBulletinList = action.payload.List
    },

    setBulletinAddress: (state, action) => {
      state.BulletinAddress = action.payload
    },
    setAddressBulletinList: (state, action) => {
      state.AddressBulletinPage = action.payload.Page
      state.AddressBulletinTotalPage = action.payload.TotalPage
      state.AddressBulletinList = action.payload.List
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
    setServerAddressList: (state, action) => {
      state.ServerAddressPage = action.payload.Page
      state.ServerAddressTotalPage = action.payload.TotalPage
      state.ServerAddressList = action.payload.List
    },
    setTagBulletinList: (state, action) => {
      state.TagBulletinList = action.payload.List
      state.TagBulletinPage = action.payload.Page
      state.TagBulletinTotalPage = action.payload.TotalPage
    },
    setSearchTagList: (state, action) => {
      state.SearchTagList = action.payload
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
  setRandomBulletinList,
  setPortalBulletinList,

  setBulletinAddress,
  setAddressBulletinList,

  setFollowBulletinList,
  setBookmarkBulletinList,
  setServerAddressList,
  setTagBulletinList,
  setSearchTagList,

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