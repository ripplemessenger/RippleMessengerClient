import * as path from '@tauri-apps/api/path'
import { writeFile, mkdir, stat } from '@tauri-apps/plugin-fs'
import { call, put, select } from 'redux-saga/effects'

import { dbAPI } from '../../db'
import { CoverDir, FileVideoExtRegex } from '../../lib/AppConst'
import { generateVideoCoverBlob } from '../../lib/videoCover'
import Logger from '../../lib/Logger'

/**
 * Generate a JPEG cover thumbnail for a saved video bulletin attachment.
 *
 * Triggered after a video file finishes downloading (hash verified). Looks up
 * the file's extension, and if it's a video, captures a frame via an offscreen
 * <video> element and writes the JPEG to {baseDir}/cover/{hash}.jpg.
 *
 * Fails soft: any error (unsupported codec, decode failure, disk error) is
 * logged and swallowed so the UI can fall back to a placeholder.
 *
 * @param {{payload: {hash: string}}} action
 */
export function* GenerateVideoCover({ payload }) {
  const { hash } = payload
  try {
    // 1. Check if this is a video file
    const ext = yield call(() => dbAPI.getFileExtByHash(hash))
    if (!ext || !FileVideoExtRegex.test(ext)) {
      return // Not a video, skip
    }

    // 2. Check if cover already exists (idempotent)
    const base_dir = yield select((state) => state.Common.AppBaseDir)
    const coverPath = yield call(() => path.join(base_dir, CoverDir, `${hash}.jpg`))
    try {
      yield call(() => stat(coverPath))
      return // Cover already exists, skip
    } catch {
      // Doesn't exist, continue
    }

    // 3. Locate the video file on disk
    const { buildFileFullPath } = yield call(() => import('../../lib/MessengerUtil'))
    const fileDir = 'file'
    const filePath = yield call(() => path.join(...buildFileFullPath(base_dir, fileDir, hash)))
    try {
      yield call(() => stat(filePath))
    } catch {
      Logger.warn('[🎬 GenerateVideoCover] Video file not found on disk: ' + filePath)
      return
    }

    // 4. Generate the cover blob (DOM operation, runs in WebView2)
    Logger.info('[🎬 GenerateVideoCover] Capturing frame for ' + hash)
    const blob = yield call(generateVideoCoverBlob, filePath)
    if (!blob) {
      Logger.warn('[🎬 GenerateVideoCover] Frame capture failed for ' + hash + ' (unsupported codec or decode error)')
      return
    }

    // 5. Write the JPEG to disk
    const buffer = yield call(() => blob.arrayBuffer())
    const coverDir = yield call(() => path.join(base_dir, CoverDir))
    yield call(() => mkdir(coverDir, { recursive: true }))
    yield call(() => writeFile(coverPath, new Uint8Array(buffer)))
    Logger.info('[🎬 GenerateVideoCover] ✅ Cover saved: ' + coverPath)

    // 6. Notify UI to refresh (bulletin components can re-check for cover)
    yield put({ type: 'VideoCoverGenerated', payload: { hash } })
  } catch (err) {
    Logger.warn('[🎬 GenerateVideoCover] Error: ' + (err && err.message ? err.message : String(err)))
  }
}
