import { createSlice } from '@reduxjs/toolkit'

const CommonSlice = createSlice({
  name: 'Common',
  initialState: {
    AppBaseDir: null,

    FlashNoticeMessage: null,
    FlashNoticeDuration: 0,
    DisplayJson: null,
    DisplayJsonOption: false
  },
  reducers: {
    setAppBaseDir: (state, action) => {
      state.AppBaseDir = action.payload
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
  setFlashNoticeMessage,
  setDisplayJson
} = CommonSlice.actions
export default CommonSlice.reducer