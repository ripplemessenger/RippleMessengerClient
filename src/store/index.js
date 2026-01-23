import { configureStore } from '@reduxjs/toolkit'
import { all } from 'redux-saga/effects'
import createSagaMiddleware from 'redux-saga'

import { watchUser } from './sagas/UserSaga'
import { watchMessenger } from './sagas/MessengerSaga'

import { taskInstant, taskFast, taskSlow, taskCreep } from './sagas/TaskSaga'

import UserReducer from './slices/UserSlice'
import MessengerReducer from './slices/MessengerSlice'

export default function* rootSaga() {
  yield all([
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
    User: UserReducer,
    Messenger: MessengerReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sagaMiddleware)
})

sagaMiddleware.run(rootSaga)