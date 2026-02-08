import * as path from '@tauri-apps/api/path'
import { call, put, takeLatest, select, delay } from 'redux-saga/effects'
import { setAppBaseDir } from '../slices/CommonSlice'
import { getDB } from '../../db';

export function* GetDB() {
  try {
    yield call(getDB)
  } catch (e) {
    console.error(e)
  }
}

export function* LoadAppBaseDir() {
  // let test = yield call(() => path.appLocalDataDir())
  // test = yield call(() => path.desktopDir())
  // test = yield call(() => path.downloadDir())
  // test = yield call(() => path.resourceDir())
  const app_base_path = yield call(() => path.resourceDir())
  yield put(setAppBaseDir(app_base_path))
}

export function* watchCommon() {
  // yield takeLatest('LoadAppBaseDir', LoadAppBaseDir)
}