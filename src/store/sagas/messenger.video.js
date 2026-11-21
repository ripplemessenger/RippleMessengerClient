import { call } from 'redux-saga/effects'

import { FetchBulletinFile as FetchBulletinFileHandler } from './messenger.file'
import { getFileRequestList } from './messenger.core'
import { dbAPI } from '../../db'
import Logger from '../../lib/Logger'

/**
 * Video feed preload queue (plan 2.3).
 *
 * Given a list of {hash, size} for the upcoming feed items (active+1, active+2),
 * start a download for each one that is not already saved or in flight.
 *
 * We call the FetchBulletinFile handler directly (via `call`) instead of
 * dispatching the action, so the takeLatest channel does not cancel a
 * concurrent preload. Dedup is by the shared file-request list (one pending
 * request per hash) plus the DB is_saved flag.
 *
 * The 15s "no chunk arrived" watchdog lives in the page (it owns the active
 * index); it re-dispatches FetchBulletinFile to re-request the current chunk.
 */
export function* VideoFeedPreload({ payload }) {
  const items = payload?.items || []
  for (const item of items) {
    if (!item?.hash) continue
    try {
      const file = yield call(() => dbAPI.getFileByHash(item.hash))
      if (file && file.is_saved) continue
      const inFlight = getFileRequestList().some((r) => r.Hash === item.hash)
      if (inFlight) continue
      yield call(FetchBulletinFileHandler, { payload: { hash: item.hash, size: item.size || 0 } })
    } catch (e) {
      Logger.error('[🎬 VideoFeedPreload] failed for', item.hash, e.message)
    }
  }
}
