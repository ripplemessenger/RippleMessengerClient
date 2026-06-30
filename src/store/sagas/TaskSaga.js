import { call, select, cancelled, delay } from 'redux-saga/effects'

import Logger from '../../lib/Logger'
import { AvatarRequest, FetchFollowBulletin, LoadMineBulletinSequence } from './MessengerSaga'

// Placeholder: 1s and 5s polling intervals removed (empty bodies, no work to do)

export function* taskSlow() {
  const interval = 60 * 1000
  try {
    while (true) {
      // 1
      const address = yield select(state => state.User.Address)
      if (address) {
        yield call(FetchFollowBulletin)
      }

      // 2
      yield call(LoadMineBulletinSequence)

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
      yield call(AvatarRequest, { payload: { flag: false } })
      yield delay(interval)
    }
  } finally {
    if (yield cancelled()) {
      Logger.debug('Scheduled taskCreep cancelled...')
    }
  }
}