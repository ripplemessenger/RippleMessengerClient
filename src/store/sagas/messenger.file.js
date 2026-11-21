import * as path from '@tauri-apps/api/path'
import { readFile, writeFile, mkdir, stat, remove } from '@tauri-apps/plugin-fs'
import { openPath } from '@tauri-apps/plugin-opener'
import { call, put, select } from 'redux-saga/effects'

import { saveLocalFile } from './messenger.bulletin'
import { getFileRequestList, setFileRequestList, pushFileRequest, genFileNonce, SendMessage } from './messenger.core'
// Imported from MessengerSaga (runtime-only dependency; generators execute after modules load)
import { SendContent } from './MessengerSaga'
import { LoadFileManagementList as LoadFileManagementListAction, GenerateVideoCover } from './messenger.actions'
import { dbAPI } from '../../db'
import {
  FileChunkSize,
  FILE_REQUEST_TTL_MS,
  FLASH_DURATION_MS,
  FileDir,
  FileMaxSize,
  SessionType,
  DefaultPartition
} from '../../lib/AppConst'
import { filesize_format, FileHashAsync } from '../../lib/AppUtil'
import Logger from '../../lib/Logger'
import { mgAPI } from '../../lib/MessageGenerator'
import { FileRequestType, MessageObjectType } from '../../lib/MessengerConst'
import { DHSequence, PrivateFileEHash, GroupFileEHash, buildFileFullPath } from '../../lib/MessengerUtil'
import { setFlashNoticeMessage } from '../slices/CommonSlice'
import { markFileSaved, setFileStatus } from '../slices/MessengerSlice'
import i18n from '../../i18n'

/**
 * Download a bulletin attachment from the Site over HTTP (fast path).
 *
 * The Site is co-located with the relay Server and serves the Server's file
 * disk at /file/{hash}. A single streaming HTTP request (with Range support)
 * is much faster than the serial 1MB WebSocket chunk round-trips, so this is
 * tried first. On success the file is written to the same on-disk path as the
 * WS chunk path, hash-verified, and marked saved.
 *
 * Returns true on success, false on any failure (network error, non-200,
 * hash mismatch) so the caller can fall back to the WS chunk path.
 */
/**
 * Derive the Site base URL from a WebSocket server URL.
 * The Site is co-located with the relay Server, so the Site is at the same
 * host: wss://host → https://host, ws://host → http://host.
 * Returns null if the URL is not a recognized WS scheme.
 */
export function* FetchBulletinFileViaSite({ hash, chunk_length }) {
  try {
    // Use the SiteURL the Server told us (Declare message).
    const siteBase = yield select((state) => state.Messenger.SiteURL)
    if (!siteBase) {
      Logger.warn('[📥 FetchBulletinFileViaSite] no SiteURL from server, skipping HTTP path')
      return false
    }
    const url = siteBase + '/file/' + hash
    // Safety net: don't hang forever on a dead/slow connection before falling
    // back to WS. 30s covers the slow direct connection (~15s to headers);
    // if the Site is truly unreachable, fail and use the WS path.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    let resp
    try {
      resp = yield call(() => fetch(url, { method: 'GET', signal: controller.signal }))
    } finally {
      clearTimeout(timeout)
    }
    if (!resp.ok) {
      Logger.warn('[📥 FetchBulletinFileViaSite] HTTP ' + resp.status + ' for ' + hash + ', falling back to WS')
      return false
    }
    const buf = yield call(() => resp.arrayBuffer())
    const content = new Uint8Array(buf)
    // Write to the standard on-disk path (same as the WS chunk path).
    yield call(saveLocalFile, hash, content)
    // Verify hash (native off-thread digest, fast even for 64MB).
    const actual = yield call(FileHashAsync, content)
    if (actual === hash) {
      yield call(() => dbAPI.localFileSaved(hash, chunk_length, Date.now()))
      yield put(markFileSaved({ hash: hash }))
      yield put(GenerateVideoCover({ hash: hash }))
      yield put(LoadFileManagementListAction({ category: 'bulletin', page: 1 }))
      Logger.info('[📥 FetchBulletinFileViaSite] ✅ downloaded via HTTP, hash verified (' + content.length + ' bytes)')
      return true
    }
    Logger.error(
      '[📥 FetchBulletinFileViaSite] ❌ hash mismatch: expected=' + hash + ' got=' + actual + ', falling back to WS'
    )
    // Delete the corrupted file so the WS path starts clean.
    const base_dir = yield select((state) => state.Common.AppBaseDir)
    const save_file_path = yield call(() => path.join(...buildFileFullPath(base_dir, FileDir, hash)))
    yield call(() => remove(save_file_path))
    return false
  } catch (e) {
    Logger.warn('[📥 FetchBulletinFileViaSite] HTTP failed: ' + e.message + ', falling back to WS')
    return false
  }
}

/**
 * Fetch the next chunk of a bulletin attachment from the server.
 */
export function* FetchBulletinFile({ payload }) {
  try {
    const seed = yield select((state) => state.User.Seed)
    if (!seed) {
      Logger.warn('[📥 FetchBulletinFile] No seed found, aborting')
      return
    }
    let file = yield call(() => dbAPI.getFileByHash(payload.hash))
    if (file === null) {
      if (!payload.size) {
        Logger.warn('[📥 FetchBulletinFile] File not in DB and no size provided, cannot create record')
        return
      }
      const chunk_length = Math.ceil(payload.size / FileChunkSize)
      yield call(() => dbAPI.addFile(payload.hash, payload.size, Date.now(), chunk_length, 0, false))
      file = yield call(() => dbAPI.getFileByHash(payload.hash))
    }
    Logger.info(
      '[📥 FetchBulletinFile] hash=' +
        file.hash +
        ', is_saved=' +
        file.is_saved +
        ', cursor=' +
        file.chunk_cursor +
        '/' +
        file.chunk_length
    )
    if (file.is_saved) {
      Logger.info('[📥 FetchBulletinFile] already saved, skipping')
      return
    }
    // If all chunks received but hash not yet verified (is_saved=false),
    // verify now instead of requesting a non-existent next chunk
    if (file.chunk_cursor >= file.chunk_length) {
      Logger.warn(
        '[📥 FetchBulletinFile] All chunks already received (' +
          file.chunk_cursor +
          '/' +
          file.chunk_length +
          ') but is_saved=false — verifying hash now'
      )
      const base_dir = yield select((state) => state.Common.AppBaseDir)
      const filePath = yield call(() => path.join(...buildFileFullPath(base_dir, FileDir, file.hash)))
      try {
        const content = yield call(() => readFile(filePath))
        // Async native digest — see receiveFileChunk in messenger.ws.js for why.
        const hash = yield call(FileHashAsync, content)
        if (hash === file.hash) {
          yield call(() => dbAPI.remoteFileSaved(file.hash, Date.now()))
          yield put(markFileSaved({ hash: file.hash }))
          // Generate video cover if this is a video file (idempotent, fails soft)
          yield put(GenerateVideoCover({ hash: file.hash }))
          yield put(LoadFileManagementListAction({ category: 'bulletin', page: 1 }))
        } else {
          Logger.error(
            '[📥 FetchBulletinFile] ❌ Hash mismatch on retry — deleting corrupted file and resetting cursor'
          )
          yield call(() => remove(filePath))
          yield call(() => dbAPI.updateFileChunkCursor(file.hash, 0, Date.now()))
          // Fall through to re-download from scratch
        }
      } catch (e) {
        Logger.error('[📥 FetchBulletinFile] Failed to read file for hash verification:', e.message)
        yield call(() => dbAPI.updateFileChunkCursor(file.hash, 0, Date.now()))
      }
    }
    // Fast path: try downloading the whole file from the Site over HTTP. The
    // Site is co-located with the relay Server and serves its file disk, so
    // /file/{hash} works in production. One streaming request beats the serial
    // 1MB WS round-trips. On any failure, fall through to the WS chunk path.
    Logger.info('[📥 FetchBulletinFile] trying HTTP path (Site)')
    const httpOk = yield call(FetchBulletinFileViaSite, { hash: file.hash, chunk_length: file.chunk_length })
    if (httpOk) {
      Logger.info('[📥 FetchBulletinFile] HTTP path succeeded')
      return
    }
    Logger.info('[📥 FetchBulletinFile] HTTP path failed, falling back to WS chunk path')
    const nonce = genFileNonce()
    const cursor = file.chunk_cursor + 1
    const tmp = {
      Type: FileRequestType.File,
      Nonce: nonce,
      Hash: file.hash,
      ChunkCursor: cursor,
      Timestamp: Date.now()
    }
    setFileRequestList(
      getFileRequestList().filter((r) => r.Timestamp + FILE_REQUEST_TTL_MS > Date.now() && r.Hash !== file.hash)
    )
    pushFileRequest(tmp)
    const file_request = yield call(() => mgAPI.genFileRequest(seed, FileRequestType.File, file.hash, nonce, cursor))
    Logger.info('[📥 FetchBulletinFile] sending WS chunk request: cursor=' + cursor + '/' + file.chunk_length)
    const sent = yield call(SendMessage, { msg: file_request })
    Logger.info('[📥 FetchBulletinFile] WS chunk request sent=' + (sent ? 'yes' : 'NO'))
  } catch (e) {
    Logger.error('[📥 FetchBulletinFile] FAILED for', payload.hash, e.message, e.stack)
  }
}

/**
 * Save a bulletin attachment to the system download directory.
 */
export function* SaveBulletinFile({ payload }) {
  try {
    Logger.info(
      '[💾 SaveBulletinFile] START, hash=' +
        payload.hash +
        ', name=' +
        (payload.name || '') +
        ', ext=' +
        (payload.ext || '')
    )
    const file = yield call(() => dbAPI.getFileByHash(payload.hash))
    Logger.info(
      '[💾 SaveBulletinFile] DB lookup: ' +
        (file ? 'found' : 'null') +
        ', is_saved=' +
        file?.is_saved +
        ', cursor=' +
        file?.chunk_cursor +
        '/' +
        file?.chunk_length
    )
    if (file && file.is_saved) {
      const base_dir = yield select((state) => state.Common.AppBaseDir)
      const sour_file_path = yield call(() => path.join(...buildFileFullPath(base_dir, FileDir, payload.hash)))
      const content = yield call(() => readFile(sour_file_path))
      const dl_dir = yield call(() => path.downloadDir())
      const dest_dir = yield call(() => path.join(dl_dir, `RippleMessenger`))
      yield call(() => mkdir(dest_dir, { recursive: true }))
      const dest_file_path = yield call(() => path.join(dest_dir, `${payload.name}${payload.ext}`))
      yield call(() => writeFile(dest_file_path, content))
      if (payload.autoOpen) {
        yield call(() => openPath(dest_file_path))
        yield put(setFlashNoticeMessage({ message: i18n.t('file.saved_to_download'), duration: 2000 }))
      } else if (payload.revealOnly) {
        // Risk file: open the download folder instead of executing the file
        yield call(() => openPath(dest_dir))
        yield put(
          setFlashNoticeMessage({
            message: i18n.t('file.risk_warning', { ext: payload.ext }),
            duration: 4000
          })
        )
      } else {
        yield put(setFlashNoticeMessage({ message: i18n.t('file.saved_to_download'), duration: 2000 }))
      }
    } else if (file) {
      yield put(
        setFlashNoticeMessage({
          message: i18n.t('file.fetching_from_peer', {
            source: 'server',
            cursor: file.chunk_cursor,
            length: file.chunk_length
          }),
          duration: 2000
        })
      )
      yield call(FetchBulletinFile, { payload: { hash: payload.hash, size: payload.size } })
    } else {
      yield put(
        setFlashNoticeMessage({ message: i18n.t('file.record_not_found', { source: 'server' }), duration: 2000 })
      )
      yield call(FetchBulletinFile, { payload: { hash: payload.hash, size: payload.size } })
    }
  } catch (e) {
    Logger.error('[SaveBulletinFile] FAILED:', String(e), e.stack)
  }
}

/**
 * Query the DB for a file's download status and publish it to Redux
 * so chat UI components can render saved / in-progress / not-downloaded markers.
 */
export function* CheckFileStatus({ payload }) {
  try {
    const file = yield call(() => dbAPI.getFileByHash(payload.hash))
    Logger.info(
      '[CheckFileStatus] hash=' +
        payload.hash +
        ', file=' +
        (file ? 'found' : 'null') +
        ', is_saved=' +
        file?.is_saved +
        ', cursor=' +
        file?.chunk_cursor +
        '/' +
        file?.chunk_length
    )
    if (file) {
      yield put(
        setFileStatus({
          hash: file.hash,
          is_saved: file.is_saved,
          cursor: file.chunk_cursor,
          length: file.chunk_length
        })
      )
    }
  } catch (e) {
    Logger.error('[CheckFileStatus] failed:', e.message)
  }
}

/**
 * Fetch the next chunk of a private chat file from the remote peer.
 */
export function* FetchPrivateChatFile({ payload }) {
  try {
    const seed = yield select((state) => state.User.Seed)
    if (!seed) {
      return
    }
    const self_address = yield select((state) => state.User.Address)
    const ehash = PrivateFileEHash(self_address, payload.remote, payload.hash)
    const private_chat_file = yield call(() => dbAPI.getPrivateFileByEHash(ehash))
    if (private_chat_file === null) {
      yield call(() => dbAPI.addPrivateFile(ehash, self_address, payload.remote, payload.hash, payload.size))
    }

    const chunk_length = Math.ceil(payload.size / FileChunkSize)
    let file = yield call(() => dbAPI.getFileByHash(payload.hash))
    if (file === null) {
      yield call(() => dbAPI.addFile(payload.hash, payload.size, Date.now(), chunk_length, 0, false))
    }

    file = yield call(() => dbAPI.getFileByHash(payload.hash))
    if (file && !file.is_saved) {
      const timestamp = Date.now()
      const ecdh_sequence = DHSequence(DefaultPartition, timestamp, self_address, payload.remote)
      const ecdh = yield call(() => dbAPI.getHandshake(self_address, payload.remote, DefaultPartition, ecdh_sequence))
      if (ecdh?.aes_key) {
        const nonce = genFileNonce()
        const tmp = {
          Type: FileRequestType.PrivateChatFile,
          Nonce: nonce,
          EHash: ehash,
          Hash: payload.hash,
          Size: payload.size,
          ChunkCursor: file.chunk_cursor + 1,
          Address: payload.remote,
          aes_key: ecdh.aes_key,
          Timestamp: timestamp
        }
        setFileRequestList(
          getFileRequestList().filter((r) => r.Timestamp + FILE_REQUEST_TTL_MS > Date.now() && r.EHash !== ehash)
        )
        pushFileRequest(tmp)
        const file_request = yield call(() =>
          mgAPI.genFileRequest(
            seed,
            FileRequestType.PrivateChatFile,
            ehash,
            nonce,
            file.chunk_cursor + 1,
            payload.remote
          )
        )
        yield call(SendMessage, { key: payload.key, msg: file_request })
      } else {
        // No ECDH shared key — the request would be silently dropped, surface it to the user
        Logger.warn('[FetchPrivateChatFile] no ECDH aes_key for ' + payload.remote + ', file request NOT sent')
        yield put(setFlashNoticeMessage({ message: i18n.t('chat.no_ecdh_key'), duration: 3000 }))
      }
    } else {
      // file exist
    }
  } catch (e) {
    Logger.error('[FetchPrivateChatFile] failed:', e.message)
  }
}

/**
 * Fetch the next chunk of a group chat file from group members.
 */
export function* FetchGroupChatFile({ payload }) {
  try {
    const seed = yield select((state) => state.User.Seed)
    if (!seed) {
      return
    }
    const self_address = yield select((state) => state.User.Address)
    const ehash = GroupFileEHash(payload.group_hash, payload.hash)
    const group_chat_file = yield call(() => dbAPI.getGroupFileByEHash(ehash))
    if (group_chat_file === null) {
      yield call(() => dbAPI.addGroupFile(ehash, payload.group_hash, payload.hash, payload.size))
    }

    const chunk_length = Math.ceil(payload.size / FileChunkSize)
    let file = yield call(() => dbAPI.getFileByHash(payload.hash))
    if (file === null) {
      yield call(() => dbAPI.addFile(payload.hash, payload.size, Date.now(), chunk_length, 0, false))
    }

    file = yield call(() => dbAPI.getFileByHash(payload.hash))
    if (file && !file.is_saved) {
      const timestamp = Date.now()
      const nonce = genFileNonce()
      const group_member_map = yield select((state) => state.Messenger.GroupMemberMap)
      const tmp = {
        Type: FileRequestType.GroupChatFile,
        Nonce: nonce,
        EHash: ehash,
        Hash: payload.hash,
        Size: payload.size,
        ChunkCursor: file.chunk_cursor + 1,
        GroupHash: payload.group_hash,
        GroupMember: group_member_map[payload.group_hash],
        SelfAddress: self_address,
        Timestamp: timestamp
      }
      setFileRequestList(
        getFileRequestList().filter((r) => r.Timestamp + FILE_REQUEST_TTL_MS > Date.now() && r.EHash !== ehash)
      )
      pushFileRequest(tmp)
      const file_request = yield call(() =>
        mgAPI.genGroupFileRequest(seed, payload.group_hash, ehash, nonce, file.chunk_cursor + 1)
      )
      yield call(SendMessage, { key: payload.key, msg: file_request })
    } else {
      // file exist
    }
  } catch (e) {
    Logger.error('[FetchGroupChatFile] failed:', e.message)
  }
}

/**
 * Entry point for fetching chat files -- routes to private or group handler.
 */
export function* FetchChatFile({ payload }) {
  try {
    const current_session = yield select((state) => state.Messenger.CurrentSession)
    if (current_session.type === SessionType.Private) {
      yield call(FetchPrivateChatFile, {
        payload: { key: payload.key, remote: current_session.remote, hash: payload.hash, size: payload.size }
      })
    } else if (current_session.type === SessionType.Group) {
      yield call(FetchGroupChatFile, {
        payload: { key: payload.key, group_hash: current_session.hash, hash: payload.hash, size: payload.size }
      })
    }
  } catch (e) {
    Logger.error('[FetchChatFile] failed:', e.message)
  }
}

/**
 * Save a chat file to the system download directory.
 */
export function* SaveChatFile({ payload }) {
  try {
    const file = yield call(() => dbAPI.getFileByHash(payload.hash))
    if (file && file.is_saved) {
      const base_dir = yield select((state) => state.Common.AppBaseDir)
      const sour_file_path = yield call(() => path.join(...buildFileFullPath(base_dir, FileDir, payload.hash)))
      const content = yield call(() => readFile(sour_file_path))
      const dl_dir = yield call(() => path.downloadDir())
      const dest_dir = yield call(() => path.join(dl_dir, `RippleMessenger`))
      yield call(() => mkdir(dest_dir, { recursive: true }))
      const dest_file_path = yield call(() => path.join(dest_dir, `${payload.name}${payload.ext}`))
      yield call(() => writeFile(dest_file_path, content))
      if (payload.autoOpen) {
        yield call(() => openPath(dest_file_path))
        yield put(setFlashNoticeMessage({ message: i18n.t('file.saved_to_download'), duration: 2000 }))
      } else if (payload.revealOnly) {
        // Risk file: open the download folder instead of executing the file
        yield call(() => openPath(dest_dir))
        yield put(
          setFlashNoticeMessage({
            message: i18n.t('file.risk_warning', { ext: payload.ext }),
            duration: 4000
          })
        )
      } else {
        yield put(setFlashNoticeMessage({ message: i18n.t('file.saved_to_download'), duration: 2000 }))
      }
    } else if (file) {
      const current_session = yield select((state) => state.Messenger.CurrentSession)
      const fromWho = current_session.type === SessionType.Group ? i18n.t('chat.group_members') : i18n.t('chat.peer')
      yield put(
        setFlashNoticeMessage({
          message: i18n.t('file.fetching_from_peer', {
            source: fromWho,
            cursor: file.chunk_cursor,
            length: file.chunk_length
          }),
          duration: FLASH_DURATION_MS
        })
      )
      yield call(FetchChatFile, { payload: { hash: payload.hash, size: payload.size } })
    } else {
      // file === null (DB missing record), will be created by FetchChatFile
      const current_session = yield select((state) => state.Messenger.CurrentSession)
      const fromWho = current_session.type === SessionType.Group ? i18n.t('chat.group_members') : i18n.t('chat.peer')
      yield put(
        setFlashNoticeMessage({
          message: i18n.t('file.record_not_found', { source: fromWho }),
          duration: FLASH_DURATION_MS
        })
      )
      yield call(FetchChatFile, { payload: { hash: payload.hash, size: payload.size } })
    }
  } catch (e) {
    Logger.error('[SaveChatFile] failed:', e.message)
  }
}

/**
 * Send a file to the current chat session (private or group).
 */
export function* SendFile({ payload }) {
  try {
    const self_address = yield select((state) => state.User.Address)
    const CurrentSession = yield select((state) => state.Messenger.CurrentSession)

    const file_path = payload.file_path
    const fileNameWithExt = yield call(() => path.basename(file_path))
    const ext = yield call(() => path.extname(fileNameWithExt))
    const name = yield call(() => path.basename(fileNameWithExt, ext))
    const file_info = yield call(() => stat(file_path))
    if (file_info.size > FileMaxSize) {
      yield put(
        setFlashNoticeMessage({
          message: i18n.t('file.size_too_large', { maxSize: filesize_format(FileMaxSize) }),
          duration: FLASH_DURATION_MS
        })
      )
      return
    }

    const content = yield call(() => readFile(file_path))
    const hash = yield call(FileHashAsync, content)
    yield call(() => saveLocalFile(hash, content))

    const chunk_length = Math.ceil(file_info.size / FileChunkSize)
    const file = yield call(() => dbAPI.getFileByHash(hash))
    if (file === null) {
      yield call(() => dbAPI.addFile(hash, file_info.size, Date.now(), chunk_length, chunk_length, true))
    } else {
      yield call(() => dbAPI.localFileSaved(hash, chunk_length, Date.now()))
    }

    if (CurrentSession.type === SessionType.Private) {
      const ehash = PrivateFileEHash(self_address, CurrentSession.remote, hash)
      const private_chat_file = yield call(() => dbAPI.getPrivateFileByEHash(ehash))
      if (private_chat_file === null) {
        yield call(() => dbAPI.addPrivateFile(ehash, self_address, CurrentSession.remote, hash, file_info.size))
      }
      yield call(SendContent, {
        payload: {
          content: {
            ObjectType: MessageObjectType.PrivateChatFile,
            Name: name,
            Ext: ext,
            Size: file_info.size,
            Hash: hash
          }
        }
      })
    } else if (CurrentSession.type === SessionType.Group) {
      const ehash = GroupFileEHash(CurrentSession.hash, hash)
      const group_chat_file = yield call(() => dbAPI.getGroupFileByEHash(ehash))
      if (group_chat_file === null) {
        yield call(() => dbAPI.addGroupFile(ehash, CurrentSession.hash, hash, file_info.size))
      }
      yield call(SendContent, {
        payload: {
          content: {
            ObjectType: MessageObjectType.GroupChatFile,
            Name: name,
            Ext: ext,
            Size: file_info.size,
            Hash: hash
          }
        }
      })
    }
  } catch (e) {
    Logger.error('[SendFile] failed:', e.message)
  }
}
