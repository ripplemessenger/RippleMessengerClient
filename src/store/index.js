import { configureStore } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import { all } from 'redux-saga/effects'

import CommonReducer from './slices/CommonSlice'
import MessengerReducer from './slices/MessengerSlice'
import UserReducer from './slices/UserSlice'
import { watchCommon } from './sagas/CommonSaga'
import { taskCreep, taskFast, taskInstant, taskSlow } from './sagas/TaskSaga'
import { watchMessenger } from './sagas/MessengerSaga'
import { watchUser } from './sagas/UserSaga'

export default function* rootSaga() {
  yield all([
    watchCommon(),
    watchUser(),
    watchMessenger(),

    taskInstant(),
    taskFast(),
    taskSlow(),
    taskCreep(),
  ])
}

const sagaMiddleware = createSagaMiddleware()

export const store = configureStore({
  reducer: {
    Common: CommonReducer,
    User: UserReducer,
    Messenger: MessengerReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sagaMiddleware)
})

sagaMiddleware.run(rootSaga)