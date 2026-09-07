import * as path from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/core'
import { call, fork, put } from 'redux-saga/effects'

import { getDB } from '../../db'
import Logger from '../../lib/Logger'
import { setupSyncAuthListener, setupSyncDeviceListener } from '../../lib/syncAuth'
import { setupSyncVerifyListener } from '../../lib/syncVerify'
import { setAppBaseDir } from '../slices/CommonSlice'

function* GetDB() {
  try {
    yield call(LoadAppBaseDir)
    yield call(getDB)
  } catch (e) {
    Logger.error('[GetDB] failed:', e.message || e)
  }
}

function* LoadAppBaseDir() {
  const app_base_path = yield call(() => path.resourceDir())
  yield put(setAppBaseDir(app_base_path))
}

function* StartSyncServer() {
  // Set up auth listener (non-fatal if it fails)
  try {
    yield call(setupSyncAuthListener)
  } catch (e) {
    console.warn('[SyncServer] setupSyncAuthListener failed:', e.message || e)
  }

  // Set up device listener (non-fatal if it fails)
  try {
    yield call(setupSyncDeviceListener)
  } catch (e) {
    console.warn('[SyncServer] setupSyncDeviceListener failed:', e.message || e)
  }

  // Set up import-verification listener (non-fatal if it fails)
  try {
    yield call(setupSyncVerifyListener)
  } catch (e) {
    console.warn('[SyncServer] setupSyncVerifyListener failed:', e.message || e)
  }

  // Start the sync server
  try {
    const result = yield call(() => invoke('start_sync_server', { address: 'client' }))
    Logger.info('[SyncServer] started:', result)
  } catch (e) {
    Logger.warn('[SyncServer] failed to start (may already be running):', e.message || e)
  }
}

export function* watchCommon() {
  console.log('[SyncServer] watchCommon ENTER')
  yield fork(GetDB)
  yield fork(StartSyncServer)
}
