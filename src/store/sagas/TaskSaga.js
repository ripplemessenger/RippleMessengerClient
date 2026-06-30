import { fork, select, cancelled, delay } from 'redux-saga/effects'

import Logger from '../../lib/Logger'
import { AvatarRequest, FetchFollowBulletin, LoadMineBulletinSequence } from './MessengerSaga'

export function* taskInstant() {
  const interval = 1 * 1000
  try {
    while (true) {
      const seed = yield select(state => state.User.Seed)
      if (seed) {
      }
      yield delay(interval)
    }
  } finally {
    if (yield cancelled()) {
      Logger.debug('Scheduled taskInstant cancelled...')
    }
  }
}

export function* taskFast() {
  const interval = 5 * 1000
  try {
    while (true) {
      const seed = yield select(state => state.User.Seed)
      if (seed) {
      }
      yield delay(interval)
    }
  } finally {
    if (yield cancelled()) {
      Logger.debug('Scheduled taskFast cancelled...')
    }
  }
}

export function* taskSlow() {
  const interval = 60 * 1000
  try {
    while (true) {
      // 1
      const address = yield select(state => state.User.Address)
      if (address) {
        yield fork(FetchFollowBulletin)
      }

      // 2
      yield fork(LoadMineBulletinSequence)

      yield delay(interval)
    }
  } finally {
    if (yield cancelled()) {
      Logger.debug('Scheduled taskSlow cancelled...')
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
      Logger.debug('Scheduled taskCreep cancelled...')
    }
  }
}