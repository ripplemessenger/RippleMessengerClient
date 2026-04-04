import { createSlice } from '@reduxjs/toolkit'

const CommonSlice = createSlice({
  name: 'Common',
  initialState: {
    AppBaseDir: null,

    ConfirmFlag: false,
    ConfirmContent: null,
    ConfirmResult: false,

    FlashNoticeMessage: null,
    FlashNoticeDuration: 0,

    DisplayJson: null,
    DisplayJsonOption: false
  },
  reducers: {
    setAppBaseDir: (state, action) => {
      state.AppBaseDir = action.payload
    },

    confirmBegin: (state, action) => {
      state.ConfirmFlag = true
      state.ConfirmContent = action.payload.content
      state.ConfirmResult = false
    },
    confirmDone: (state, action) => {
      state.ConfirmFlag = false
      state.ConfirmContent = action.payload.content
      state.ConfirmResult = action.payload.result
    },

    setFlashNoticeMessage: (state, action) => {
      state.FlashNoticeMessage = action.payload.message
      state.FlashNoticeDuration = action.payload.duration
    },
    setDisplayJson: (state, action) => {
      state.DisplayJson = action.payload.json
      state.DisplayJsonOption = action.payload.isExpand
    },
  }
})

export const {
  setAppBaseDir,
  confirmBegin,
  confirmDone,
  setFlashNoticeMessage,
  setDisplayJson
} = CommonSlice.actions
export default CommonSlice.reducer