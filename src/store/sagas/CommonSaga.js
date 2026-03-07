import * as path from '@tauri-apps/api/path'
import { call, fork, put } from 'redux-saga/effects'
import { setAppBaseDir } from '../slices/CommonSlice'
import { getDB } from '../../db';

function* GetDB() {
  yield call(LoadAppBaseDir)
  try {
    yield call(getDB)
  } catch (e) {
    console.error(e)
  }
}

function* LoadAppBaseDir() {
  // let test = yield call(() => path.appLocalDataDir())
  // test = yield call(() => path.desktopDir())
  // test = yield call(() => path.downloadDir())
  // test = yield call(() => path.resourceDir())
  const app_base_path = yield call(() => path.resourceDir())
  yield put(setAppBaseDir(app_base_path))
}

export function* watchCommon() {
  yield fork(GetDB)
}