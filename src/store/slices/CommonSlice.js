import { createSlice } from '@reduxjs/toolkit'

const CommonSlice = createSlice({
  name: 'Common',
  initialState: {
    AppBaseDir: null
  },
  reducers: {
    setAppBaseDir: (state, action) => {
      state.AppBaseDir = action.payload
    }
  }
})

export const {
  setAppBaseDir,
} = CommonSlice.actions
export default CommonSlice.reducer