import * as path from '@tauri-apps/api/path'
import { readFile, writeFile, mkdir, stat } from '@tauri-apps/plugin-fs'
import { call, put, select } from 'redux-saga/effects'

import { saveLocalFile } from './messenger.bulletin'
import { getFileRequestList, setFileRequestList, pushFileRequest, genFileNonce, SendMessage } from './messenger.core'
// Imported from MessengerSaga (runtime-only dependency; generators execute after modules load)
import { SendContent } from './MessengerSaga'
import { dbAPI } from '../../db'
import { FileChunkSize, FILE_REQUEST_TTL_MS, FLASH_DURATION_MS, FileDir, FileMaxSize, SessionType, DefaultPartition } from '../../lib/AppConst'
import { filesize_format } from '../../lib/AppUtil'
import Logger from '../../lib/Logger'
import { mgAPI } from '../../lib/MessageGenerator'
import { FileRequestType, MessageObjectType } from '../../lib/MessengerConst'
import { DHSequence, PrivateFileEHash, FileHash, GroupFileEHash, buildFileSubPath, buildFileFullPath } from '../../lib/MessengerUtil'
import { setFlashNoticeMessage } from '../slices/CommonSlice'

/**
 * Fetch the next chunk of a bulletin attachment from the server.
 */
export function* FetchBulletinFile({ payload }) {
  try {
    const seed = yield select(state => state.User.Seed)
    if (!seed) {
      return
    }
    const file = yield call(() => dbAPI.getFileByHash(payload.hash))
    if (file !== null && file.is_saved === false) {
      const nonce = genFileNonce()
      const tmp = {
        Type: FileRequestType.File,
        Nonce: nonce,
        Hash: file.hash,
        ChunkCursor: file.chunk_cursor + 1,
        Timestamp: Date.now()
      }
      setFileRequestList(getFileRequestList().filter(r => r.Timestamp + FILE_REQUEST_TTL_MS > Date.now() && r.Hash !== file.hash))
      pushFileRequest(tmp)
      const file_request = yield call(() => mgAPI.genFileRequest(seed, FileRequestType.File, file.hash, nonce, file.chunk_cursor + 1))
      yield call(SendMessage, { msg: file_request })
    }
  } catch (e) {
    Logger.error('[FetchBulletinFile] failed for', payload.hash, e.message)
  }
}

/**
 * Save a bulletin attachment to the system download directory.
 */
export function* SaveBulletinFile({ payload }) {
  try {
    const file = yield call(() => dbAPI.getFileByHash(payload.hash))
    if (file && file.is_saved) {
      const base_dir = yield select(state => state.Common.AppBaseDir)
      const sour_file_path = yield call(() => path.join(...buildFileFullPath(base_dir, FileDir, payload.hash)))
      const content = yield call(() => readFile(sour_file_path))
      const dl_dir = yield call(() => path.downloadDir())
      const dest_dir = yield call(() => path.join(dl_dir, `RippleMessenger`))
      yield call(() => mkdir(dest_dir, { recursive: true }))
      const dest_file_path = yield call(() => path.join(dest_dir, `${payload.name}${payload.ext}`))
      yield call(() => writeFile(dest_file_path, content))
      yield put(setFlashNoticeMessage({ message: 'file saved to download directory', duration: 2000 }))
    } else if (file) {
      yield put(setFlashNoticeMessage({ message: `fetching file(${file.chunk_cursor}/${file.chunk_length}) from server...`, duration: 2000 }))
      yield call(FetchBulletinFile, { payload: { hash: payload.hash, size: payload.size } })
    } else {
      // file === null (DB missing record), will be created by FetchBulletinFile
      yield put(setFlashNoticeMessage({ message: 'file record not found, fetching from server...', duration: 2000 }))
      yield call(FetchBulletinFile, { payload: { hash: payload.hash, size: payload.size } })
    }
  } catch (e) {
    Logger.error('[SaveBulletinFile] failed:', e.message)
  }
}

/**
 * Fetch the next chunk of a private chat file from the remote peer.
 */
export function* FetchPrivateChatFile({ payload }) {
  try {
    const seed = yield select(state => state.User.Seed)
    if (!seed) {
      return
    }
    const self_address = yield select(state => state.User.Address)
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
        setFileRequestList(getFileRequestList().filter(r => r.Timestamp + FILE_REQUEST_TTL_MS > Date.now() && r.EHash !== ehash))
        pushFileRequest(tmp)
        const file_request = yield call(() => mgAPI.genFileRequest(seed, FileRequestType.PrivateChatFile, ehash, nonce, file.chunk_cursor + 1, payload.remote))
        yield call(SendMessage, { key: payload.key, msg: file_request })
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
    const seed = yield select(state => state.User.Seed)
    if (!seed) {
      return
    }
    const self_address = yield select(state => state.User.Address)
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
      const group_member_map = yield select(state => state.Messenger.GroupMemberMap)
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
      setFileRequestList(getFileRequestList().filter(r => r.Timestamp + FILE_REQUEST_TTL_MS > Date.now() && r.EHash !== ehash))
      pushFileRequest(tmp)
      const file_request = yield call(() => mgAPI.genGroupFileRequest(seed, payload.group_hash, ehash, nonce, file.chunk_cursor + 1))
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
    const current_session = yield select(state => state.Messenger.CurrentSession)
    if (current_session.type === SessionType.Private) {
      yield call(FetchPrivateChatFile, { payload: { key: payload.key, remote: current_session.remote, hash: payload.hash, size: payload.size } })
    } else if (current_session.type === SessionType.Group) {
      yield call(FetchGroupChatFile, { payload: { key: payload.key, group_hash: current_session.hash, hash: payload.hash, size: payload.size } })
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
      const base_dir = yield select(state => state.Common.AppBaseDir)
      const sour_file_path = yield call(() => path.join(...buildFileFullPath(base_dir, FileDir, payload.hash)))
      const content = yield call(() => readFile(sour_file_path))
      const dl_dir = yield call(() => path.downloadDir())
      const dest_dir = yield call(() => path.join(dl_dir, `RippleMessenger`))
      yield call(() => mkdir(dest_dir, { recursive: true }))
      const dest_file_path = yield call(() => path.join(dest_dir, `${payload.name}${payload.ext}`))
      yield call(() => writeFile(dest_file_path, content))
      yield put(setFlashNoticeMessage({ message: 'file saved to download directory', duration: 2000 }))
    } else if (file) {
      yield put(setFlashNoticeMessage({ message: `fetching file(${file.chunk_cursor}/${file.chunk_length}) from online friend or group member...`, duration: FLASH_DURATION_MS }))
      yield call(FetchChatFile, { payload: { hash: payload.hash, size: payload.size } })
    } else {
      // file === null (DB missing record), will be created by FetchChatFile
      yield put(setFlashNoticeMessage({ message: 'file record not found, fetching from contact...', duration: FLASH_DURATION_MS }))
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
    const self_address = yield select(state => state.User.Address)
    const CurrentSession = yield select(state => state.Messenger.CurrentSession)

    const file_path = payload.file_path
    const fileNameWithExt = yield call(() => path.basename(file_path))
    const ext = yield call(() => path.extname(fileNameWithExt))
    const name = yield call(() => path.basename(fileNameWithExt, ext))
    const file_info = yield call(() => stat(file_path))
    if (file_info.size > FileMaxSize) {
      yield put(setFlashNoticeMessage({ message: `file size too large(more than ${filesize_format(FileMaxSize)})...`, duration: FLASH_DURATION_MS }))
      return
    }

    const content = yield call(() => readFile(file_path))
    const hash = FileHash(content)
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
