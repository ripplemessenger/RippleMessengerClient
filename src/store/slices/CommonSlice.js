import { createSlice } from '@reduxjs/toolkit'

const CommonSlice = createSlice({
  name: 'Common',
  initialState: {
    AppBaseDir: null,

    ConfirmPopup: null,

    FlashNoticeMessage: null,
    FlashNoticeDuration: 0,

    DisplayJson: null,
    DisplayJsonOption: false,

    // Whether the main window currently has OS focus (not minimized/hidden).
    // Used to decide if an incoming chat message is "actively being viewed".
    WindowFocused: true,
    // Current route pathname (e.g. '/chat', '/bulletin'). Tracked so the
    // message handler knows if the user is on the chat page.
    CurrentRoute: '/'
  },
  reducers: {
    setAppBaseDir: (state, action) => {
      state.AppBaseDir = action.payload
    },

    setConfirmPopup: (state, action) => {
      state.ConfirmPopup = action.payload
    },

    setFlashNoticeMessage: (state, action) => {
      state.FlashNoticeMessage = action.payload.message
      state.FlashNoticeDuration = action.payload.duration
    },
    setDisplayJson: (state, action) => {
      state.DisplayJson = action.payload.json
      state.DisplayJsonOption = action.payload.isExpand
    },
    setWindowFocused: (state, action) => {
      state.WindowFocused = action.payload
    },
    setCurrentRoute: (state, action) => {
      state.CurrentRoute = action.payload
    }
  }
})

export const {
  setAppBaseDir,
  setConfirmPopup,
  setFlashNoticeMessage,
  setDisplayJson,
  setWindowFocused,
  setCurrentRoute
} = CommonSlice.actions
export default CommonSlice.reducer
