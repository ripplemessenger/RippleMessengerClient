import { call, select, cancelled, delay } from 'redux-saga/effects'

import Logger from '../../lib/Logger'
import { AvatarRequest, FetchFollowBulletin, LoadMineBulletinSequence } from './MessengerSaga'

// Placeholder: 1s and 5s polling intervals removed (empty bodies, no work to do)

export function* taskSlow() {
  try {
    while (true) {
      // 1
      const address = yield select(state => state.User.Address)
      if (address) {
        yield call(FetchFollowBulletin)
      }

      // 2
      yield call(LoadMineBulletinSequence)

      // Jittered interval: 55–65 s (60 ± 5s) to avoid thundering herd
      const jitter = Math.floor(Math.random() * 11) - 5  // range [-5, +5]
      yield delay((60 + jitter) * 1000)
    }
  } finally {
    if (yield cancelled()) {
      Logger.debug('Scheduled taskSlow cancelled...')
    }
  }
}

export function* taskCreep() {
  try {
    while (true) {
      yield call(AvatarRequest, { payload: { flag: false } })

      // Jittered interval: 3300–3900 s (3600 ± 300s) to avoid thundering herd
      const jitter = Math.floor(Math.random() * 601) - 300  // range [-300, +300]
      yield delay((3600 + jitter) * 1000)
    }
  } finally {
    if (yield cancelled()) {
      Logger.debug('Scheduled taskCreep cancelled...')
    }
  }
}