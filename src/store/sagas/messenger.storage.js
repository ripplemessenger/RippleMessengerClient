import * as path from '@tauri-apps/api/path'
import { remove, stat } from '@tauri-apps/plugin-fs'
import { all, call, put, select } from 'redux-saga/effects'

import { dbAPI } from '../../db'
import { FileDir, FLASH_DURATION_MS } from '../../lib/AppConst'
import Logger from '../../lib/Logger'
import { buildFileFullPath, calcTotalPage } from '../../lib/MessengerUtil'
import { setFlashNoticeMessage } from '../slices/CommonSlice'
import { setStorageSummary, setBulletinManagementList, setFileManagementList, setAllTagsList } from '../slices/MessengerSlice'

const StorageManagementPageSize = 20

// ==================== Storage Summary ====================

export function* LoadStorageSummary() {
  try {
    const [bulletinCount, fileCount, privateMsgCount, groupMsgCount, avatarCount] = yield all([
      call(() => dbAPI.getBulletinCount()),
      call(() => dbAPI.getFileCount()),
      call(() => dbAPI.getPrivateMessageCount()),
      call(() => dbAPI.getGroupMessageCount()),
      call(() => dbAPI.getAvatarCount()),
    ])

    const [fileSizeSum, avatarSizeSum] = yield all([
      call(() => dbAPI.getFileSizeSum()),
      call(() => dbAPI.getAvatarSizeSum()),
    ])

    // Get DB file size on disk
    let dbFileSize = 0
    try {
      const exeDir = yield call(() => path.resourceDir())
      const dbPath = yield call(() => path.join(exeDir, 'app.db'))
      const dbStat = yield call(() => stat(dbPath))
      dbFileSize = dbStat.size || 0
    } catch (dbErr) {
      Logger.warn('[LoadStorageSummary] could not read DB file size:', dbErr.message)
    }

    yield put(setStorageSummary({
      bulletinCount,
      fileCount,
      privateMsgCount,
      groupMsgCount,
      avatarCount,
      fileSizeSum,
      avatarSizeSum,
      dbFileSize,
      totalDbRecords: bulletinCount + privateMsgCount + groupMsgCount + fileCount + avatarCount,
      totalSizeSum: fileSizeSum + avatarSizeSum,
    }))
  } catch (e) {
    Logger.error('[LoadStorageSummary] failed:', e.message)
  }
}

// ==================== Bulletin Management ====================

export function* LoadBulletinManagementList({ payload }) {
  try {
    const address = yield select(state => state.User.Address)
    const { filter, page = 1 } = payload

    const bulletins = yield call(() => dbAPI.getBulletinsForManagement({ filter, address, page, pageSize: StorageManagementPageSize }))
    const total = yield call(() => dbAPI.getBulletinCountForManagement({ filter, address }))
    const totalPage = calcTotalPage(total, StorageManagementPageSize)

    yield put(setBulletinManagementList({ List: bulletins, Page: page, TotalPage: totalPage }))
  } catch (e) {
    Logger.error('[LoadBulletinManagementList] failed:', e.message)
  }
}

export function* DeleteBulletinItem({ payload }) {
  try {
    yield call(() => dbAPI.deleteBulletin(payload.hash))

    // Refresh the current list page
    const currentPage = yield select(state => state.Messenger.BulletinManagementPage)
    const address = yield select(state => state.User.Address)
    const filter = payload.filter || 'all'
    const totalAfter = yield call(() => dbAPI.getBulletinCountForManagement({ filter, address }))
    const totalPages = calcTotalPage(totalAfter, StorageManagementPageSize)

    // If current page exceeds total pages after deletion, go to last available page
    const refreshPage = currentPage > totalPages ? Math.max(1, totalPages) : currentPage
    yield call(LoadBulletinManagementList, { payload: { filter, page: refreshPage } })
    yield put(setFlashNoticeMessage({ message: 'bulletin deleted', duration: FLASH_DURATION_MS }))
  } catch (e) {
    Logger.error('[DeleteBulletinItem] failed:', e.message)
    yield put(setFlashNoticeMessage({ message: 'failed to delete bulletin', duration: FLASH_DURATION_MS }))
  }
}

export function* BulkDeleteBulletins({ payload }) {
  try {
    const { hashes, filter } = payload
    if (!Array.isArray(hashes) || hashes.length === 0) return

    yield call(() => dbAPI.deleteBulletinsByHashes(hashes))

    // Refresh the list from page 1
    const address = yield select(state => state.User.Address)
    const totalAfter = yield call(() => dbAPI.getBulletinCountForManagement({ filter: filter || 'all', address }))
    const totalPages = calcTotalPage(totalAfter, StorageManagementPageSize)

    yield call(LoadBulletinManagementList, { payload: { filter: filter || 'all', page: Math.max(1, totalPages < 1 ? 1 : totalPages) } })
    yield put(setFlashNoticeMessage({ message: `${hashes.length} bulletins deleted`, duration: FLASH_DURATION_MS }))
  } catch (e) {
    Logger.error('[BulkDeleteBulletins] failed:', e.message)
    yield put(setFlashNoticeMessage({ message: 'failed to delete bulletins', duration: FLASH_DURATION_MS }))
  }
}

// ==================== File Management ====================

export function* LoadFileManagementList({ payload }) {
  try {
    const { category, fileExt, page = 1 } = payload

    const files = yield call(() => dbAPI.getFilesForManagement({ category, fileExt, page, pageSize: StorageManagementPageSize }))
    const total = yield call(() => dbAPI.getFileCountForManagement({ category, fileExt }))
    const totalPage = calcTotalPage(total, StorageManagementPageSize)

    yield put(setFileManagementList({ List: files, Page: page, TotalPage: totalPage, fileExt }))
  } catch (e) {
    Logger.error('[LoadFileManagementList] failed:', e.message)
  }
}

export function* DeleteFileItem({ payload }) {
  try {
    const { hash } = payload

    const { hasChatRef } = yield call(() => dbAPI.deleteBulletinFileSafe(hash))

    if (!hasChatRef) {
      try {
        const base_dir = yield select(state => state.Common.AppBaseDir)
        const filePath = yield call(() => path.join(...buildFileFullPath(base_dir, FileDir, hash)))
        yield call(() => remove(filePath))
      } catch (diskErr) {
        Logger.warn('[DeleteFileItem] disk removal skipped for', hash, diskErr.message)
      }
    } else {
      Logger.warn('[DeleteFileItem] file still referenced by chat, skipping disk/files deletion for', hash)
    }

    const currentPage = yield select(state => state.Messenger.FileManagementPage)
    const currentFileExt = yield select(state => state.Messenger.FileManagementFileExt)
    const totalAfter = yield call(() => dbAPI.getFileCountForManagement({ category: 'bulletin', fileExt: currentFileExt }))
    const totalPages = calcTotalPage(totalAfter, StorageManagementPageSize)
    const refreshPage = currentPage > totalPages ? Math.max(1, totalPages) : currentPage

    yield call(LoadFileManagementList, { payload: { category: 'bulletin', fileExt: currentFileExt, page: refreshPage }})
    yield put(setFlashNoticeMessage({ message: 'file deleted', duration: FLASH_DURATION_MS }))
  } catch (e) {
    Logger.error('[DeleteFileItem] failed:', e.message)
    yield put(setFlashNoticeMessage({ message: 'failed to delete file', duration: FLASH_DURATION_MS }))
  }
}

export function* ClearOrphanedFiles() {
  try {
    // First, get all orphaned file hashes so we can also clean disk
    const orphanedFiles = yield call(() => dbAPI.getFilesForManagement({ category: 'orphan', page: 1, pageSize: 10000 }))

    // Remove each orphan from disk
    const base_dir = yield select(state => state.Common.AppBaseDir)
    for (const file of orphanedFiles) {
      try {
        const filePath = yield call(() => path.join(...buildFileFullPath(base_dir, FileDir, file.hash)))
        yield call(() => remove(filePath))
      } catch (diskErr) {
        Logger.warn('[ClearOrphanedFiles] disk removal skipped for', file.hash, diskErr.message)
      }
    }

    // Clear orphaned records from DB
    yield call(() => dbAPI.clearOrphanedFileRecords())

    // Refresh the file list
    yield call(LoadFileManagementList, { payload: { category: 'all', page: 1 } })

    // Also refresh storage summary
    yield call(LoadStorageSummary)

    yield put(setFlashNoticeMessage({ message: `${orphanedFiles.length} orphaned files cleared`, duration: FLASH_DURATION_MS }))
  } catch (e) {
    Logger.error('[ClearOrphanedFiles] failed:', e.message)
    yield put(setFlashNoticeMessage({ message: 'failed to clear orphaned files', duration: FLASH_DURATION_MS }))
  }
}

// ==================== Bulletin Search & Tag ====================

export function* SearchBulletinManagementList({ payload }) {
  try {
    const address = yield select(state => state.User.Address)
    const { query, filter, page = 1 } = payload

    const bulletins = yield call(() => dbAPI.searchBulletinsForManagement({ query: query || '', filter, address, page, pageSize: StorageManagementPageSize }))
    const total = yield call(() => dbAPI.getBulletinSearchCountForManagement({ query: query || '', filter, address }))
    const totalPage = calcTotalPage(total, StorageManagementPageSize)

    yield put(setBulletinManagementList({ List: bulletins, Page: page, TotalPage: totalPage }))
  } catch (e) {
    Logger.error('[SearchBulletinManagementList] failed:', e.message)
  }
}

export function* LoadBulletinManagementByTag({ payload }) {
  try {
    const { tagName, page = 1 } = payload

    const bulletins = yield call(() => dbAPI.getBulletinsByTag({ tagName, page, pageSize: StorageManagementPageSize }))
    const total = bulletins.length // DB API doesn't have a count-by-tag yet; use fetched count for single-page load
    const totalPage = calcTotalPage(total, StorageManagementPageSize)

    yield put(setBulletinManagementList({ List: bulletins, Page: page, TotalPage: Math.max(1, totalPage) }))
  } catch (e) {
    Logger.error('[LoadBulletinManagementByTag] failed:', e.message)
  }
}

export function* LoadAllTags() {
  try {
    const tags = yield call(() => dbAPI.getAllTags())
    yield put(setAllTagsList(tags))
  } catch (e) {
    Logger.error('[LoadAllTags] failed:', e.message)
  }
}

// ==================== File Bulk Delete & Avatar Clear ====================

export function* BulkDeleteFiles({ payload }) {
  try {
    const { hashes } = payload
    if (!Array.isArray(hashes) || hashes.length === 0) return

    const results = yield call(() => dbAPI.deleteBulletinFilesSafe(hashes))
    const base_dir = yield select(state => state.Common.AppBaseDir)

    for (let i = 0; i < hashes.length; i++) {
      if (!results[i]?.hasChatRef) {
        try {
          const filePath = yield call(() => path.join(...buildFileFullPath(base_dir, FileDir, hashes[i])))
          yield call(() => remove(filePath))
        } catch (diskErr) {
          Logger.warn('[BulkDeleteFiles] disk removal skipped for', hashes[i], diskErr.message)
        }
      }
    }

    const currentFileExt = yield select(state => state.Messenger.FileManagementFileExt)
    yield call(LoadFileManagementList, { payload: { category: 'bulletin', fileExt: currentFileExt, page: 1 }})
    yield call(LoadStorageSummary)
    yield put(setFlashNoticeMessage({ message: `${hashes.length} files deleted`, duration: FLASH_DURATION_MS }))
  } catch (e) {
    Logger.error('[BulkDeleteFiles] failed:', e.message)
    yield put(setFlashNoticeMessage({ message: 'failed to delete files', duration: FLASH_DURATION_MS }))
  }
}

export function* ClearAvatarCache() {
  try {
    const count = yield call(() => dbAPI.clearAllAvatarRecords())

    // Refresh storage summary
    yield call(LoadStorageSummary)

    yield put(setFlashNoticeMessage({ message: `${count} avatar(s) cleared`, duration: FLASH_DURATION_MS }))
  } catch (e) {
    Logger.error('[ClearAvatarCache] failed:', e.message)
    yield put(setFlashNoticeMessage({ message: 'failed to clear avatar cache', duration: FLASH_DURATION_MS }))
  }
}
