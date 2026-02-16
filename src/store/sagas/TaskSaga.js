import { fork, select, cancelled, delay } from 'redux-saga/effects'
import { AvatarRequest, ConnectSwitch, FetchFollowBulletin, ReleaseMessage } from './MessengerSaga'

export function* taskInstant() {
  const interval = 1 * 1000
  try {
    while (true) {
      const seed = yield select(state => state.User.Seed)
      if (seed) {
        yield fork(ConnectSwitch)
        yield fork(ReleaseMessage)
      }
      yield delay(interval)
    }
  } finally {
    if (yield cancelled()) {
      console.log('Scheduled taskInstant cancelled...')
    }
  }
}

export function* taskFast() {
  const interval = 5 * 1000
  try {
    while (true) {
      const seed = yield select(state => state.User.Seed)
      if (seed) {
        yield fork(FetchFollowBulletin)
      }
      yield delay(interval)
    }
  } finally {
    if (yield cancelled()) {
      console.log('Scheduled taskFast cancelled...')
    }
  }
}

export function* taskSlow() {
  const interval = 30 * 1000
  try {
    while (true) {
      const address = yield select(state => state.User.Address)
      if (address) {
      }
      yield delay(interval)
    }
  } finally {
    if (yield cancelled()) {
      console.log('Scheduled taskSlow cancelled...')
    }
  }
}

export function* taskCreep() {
  const interval = 3600 * 1000
  try {
    while (true) {
      yield fork(AvatarRequest, { payload: { flag: false } })
      yield delay(interval)
    }
  } finally {
    if (yield cancelled()) {
      console.log('Scheduled taskCreep cancelled...')
    }
  }
}