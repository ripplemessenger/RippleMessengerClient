import { Buffer } from 'buffer'
import Elliptic from 'elliptic'
import * as rippleKeyPairs from 'ripple-keypairs'

// Module-level EC curve singleton — avoids re-initializing on every ECDH handshake.
const ec = new Elliptic.ec('secp256k1')
import { invoke } from '@tauri-apps/api/core'
import * as path from '@tauri-apps/api/path'
import { open, readFile, writeFile, remove, mkdir, SeekMode } from '@tauri-apps/plugin-fs'
import { cancelled, call, fork, put, select, take } from 'redux-saga/effects'

import { dbAPI } from '../../db'
import { AvatarDir, FileChunkSize, FileDir, FILE_REQUEST_TTL_MS, SessionType, DefaultPartition } from '../../lib/AppConst'
import { AesDecrypt, AesDecryptBuffer, AesEncrypt, AesEncryptBuffer, genAESKey, HalfSHA512, QuarterSHA512Message } from '../../lib/AppUtil'
import Logger from '../../lib/Logger'
import { mgAPI } from '../../lib/MessageGenerator'
import { ActionCode, FileRequestType, GenesisHash, ObjectType, Epoch, DefaultServer, MessageObjectType } from '../../lib/MessengerConst'
import { DHSequence, FileHash, Uint32ToBuffer, VerifyJsonSignature, getMemberIndex, getMemberByIndex, ArrayBufferToUint32, buildFileSubPath, buildFileFullPath } from '../../lib/MessengerUtil'
import { globalWsChannel } from '../../lib/WebsocketUtil'
import { setGroupRequestList, setServerAddressList, updateMessengerConnStatus, setDisplayBulletinReplyList, setTagBulletinList, setRandomBulletinList } from '../slices/MessengerSlice'

// Schema validators used by WS handlers
import {
  checkAvatarRequestSchema,
  checkBulletinRequestSchema,
  checkBulletinSchema,
  checkECDHHandshakeSchema,
  checkFileRequestSchema,
  checkGroupListSchema,
  checkGroupMessageListSchema,
  checkGroupMessageSyncSchema,
  checkGroupSyncSchema,
  checkMessageObjectSchema,
  checkPrivateMessageSchema,
  checkPrivateMessageSyncSchema,
  deriveJson,
  checkReplyBulletinListSchema,
  checkTagBulletinListSchema,
  checkAvatarListSchema,
  checkRandomBulletinListSchema,
  checkServerAddressListSchema,
} from '../../lib/MessageSchemaVerifier'

// Core messaging
import { SendMessage, getFileRequestList, setFileRequestList } from './messenger.core'

// Bulletin & avatar
import { CacheBulletin, RequestNextBulletin, AvatarRequest, RequestAvatarFile, SubscribeFollow, FetchFollowBulletin } from './messenger.bulletin'

// File transfer
import { FetchBulletinFile, FetchPrivateChatFile, FetchGroupChatFile } from './messenger.file'

// Private chat
import { SyncPrivateMessage, InitHandshake, RefreshPrivateMessageList } from './messenger.private'

// Group chat
import { RefreshGroupMessageList, GroupSync } from './messenger.group'

// Session management
import { LoadSessionList } from './messenger.session'

// Server management & group list (stays in MessengerSaga.js)
import { UpdateConnStatus, LoadGroupList, LoadGroupRequestList } from './MessengerSaga'

// ---------- Binary message handlers (file chunk reception) ----------

function* handleBinaryAvatar(request, content) {
  try {
    const content_hash = FileHash(content)
    if (request.Hash === content_hash) {
      const base_dir = yield call(() => path.resourceDir())
      const avatar_dir = yield call(() => path.join(base_dir, AvatarDir))
      yield call(() => mkdir(avatar_dir, { recursive: true }))
      const avatar_path = `${avatar_dir}/${request.Address}.png`
      yield call(() => writeFile(avatar_path, content))
      yield call(() => dbAPI.updateAvatarIsSaved(request.Address, true, Date.now()))
    }
  } catch (e) {
    Logger.error('[handleBinaryAvatar] failed for', request.Hash, e.message)
  }
}

/**
 * Shared helper: write a file chunk to disk, update tracking state, and either
 * fetch the next chunk or verify the completed file.
 *
 * @param {object} opts.filePath - absolute path for the file being received
 * @param {object} opts.content - content bytes (already decrypted if needed)
 * @param {object} opts.request - the matching FileRequest entry (provides Nonce, Hash, ChunkCursor)
 * @param {object} opts.file - DB file record (chunk_cursor, chunk_length)
 * @param {function} opts.fetchNext - saga to call when more chunks are needed
 * @param {object} opts.fetchNextPayload - payload to pass to fetchNext
 */
function* receiveFileChunk({ filePath, content, request, file, fetchNext, fetchNextPayload }) {
  if (file.chunk_cursor < file.chunk_length && file.chunk_cursor + 1 === request.ChunkCursor) {
    yield call(() => writeFile(filePath, content, { append: true }))
    setFileRequestList(getFileRequestList().filter(r => r.Nonce !== request.Nonce))
    const current_chunk_cursor = file.chunk_cursor + 1
    yield call(() => dbAPI.updateFileChunkCursor(request.Hash, current_chunk_cursor, Date.now()))
    if (current_chunk_cursor < file.chunk_length) {
      yield call(fetchNext, { payload: fetchNextPayload })
    } else {
      const hash = FileHash(yield call(() => readFile(filePath)))
      if (hash === request.Hash) {
        yield call(() => dbAPI.remoteFileSaved(request.Hash, Date.now()))
      } else {
        yield call(() => remove(filePath))
        yield call(() => dbAPI.updateFileChunkCursor(request.Hash, 0, Date.now()))
        yield call(fetchNext, { payload: fetchNextPayload })
      }
    }
  }
}

function* handleBinaryBulletinFile(request, content) {
  try {
    const base_dir = yield call(() => path.resourceDir())
    const hash_subpath = buildFileSubPath(request.Hash)
    const file_dir = yield call(() => path.join(base_dir, FileDir, ...hash_subpath))
    yield call(() => mkdir(file_dir, { recursive: true }))
    const file_path = yield call(() => path.join(file_dir, request.Hash))
    const file = yield call(() => dbAPI.getFileByHash(request.Hash))
    yield call(receiveFileChunk, {
      filePath: file_path,
      content,
      request,
      file,
      fetchNext: FetchBulletinFile,
      fetchNextPayload: { hash: request.Hash }
    })
  } catch (e) {
    Logger.error('[handleBinaryBulletinFile] failed for', request.Hash, e.message)
  }
}

function* handleBinaryPrivateFile(request, content) {
  try {
    const base_dir = yield call(() => path.resourceDir())
    const hash_subpath = buildFileSubPath(request.Hash)
    const file_dir = yield call(() => path.join(base_dir, FileDir, ...hash_subpath))
    yield call(() => mkdir(file_dir, { recursive: true }))
    const file_path = yield call(() => path.join(file_dir, request.Hash))
    const file = yield call(() => dbAPI.getFileByHash(request.Hash))
    const decrypted_content = AesDecryptBuffer(content, request.aes_key)
    yield call(receiveFileChunk, {
      filePath: file_path,
      content: decrypted_content,
      request,
      file,
      fetchNext: FetchPrivateChatFile,
      fetchNextPayload: { hash: request.Hash, size: request.Size, remote: request.Address }
    })
  } catch (e) {
    Logger.error('[handleBinaryPrivateFile] failed for', request.Hash, e.message)
  }
}

function* handleBinaryGroupFile(request, content, action) {
  try {
    const file = yield call(() => dbAPI.getFileByHash(request.Hash))
    if (file.chunk_cursor < file.chunk_length && file.chunk_cursor + 1 === request.ChunkCursor) {
      const index = yield call(() => ArrayBufferToUint32(action.data.slice(4, 8)))
      const from = getMemberByIndex(request.GroupMember, index)
      const ecdh_sequence = DHSequence(DefaultPartition, Date.now(), request.SelfAddress, from)
      const ecdh = yield call(() => dbAPI.getHandshake(request.SelfAddress, from, DefaultPartition, ecdh_sequence))
      if (ecdh?.aes_key) {
        const base_dir = yield call(() => path.resourceDir())
        const hash_subpath = buildFileSubPath(request.Hash)
        const file_dir = yield call(() => path.join(base_dir, FileDir, ...hash_subpath))
        yield call(() => mkdir(file_dir, { recursive: true }))
        const file_path = yield call(() => path.join(file_dir, request.Hash))
        const decrypted_content = AesDecryptBuffer(content, ecdh.aes_key)
        yield call(receiveFileChunk, {
          filePath: file_path,
          content: decrypted_content,
          request,
          file,
          fetchNext: FetchGroupChatFile,
          fetchNextPayload: { hash: request.Hash, size: request.Size, group_hash: request.GroupHash }
        })
      }
    }
  } catch (e) {
    Logger.error('[handleBinaryGroupFile] failed for', request.Hash, e.message)
  }
}

function* handleBinaryMessage(action) {
  try {
    const nonce = yield call(() => ArrayBufferToUint32(action.data.slice(0, 4)))
    setFileRequestList(getFileRequestList().filter(r => r.Timestamp + FILE_REQUEST_TTL_MS > Date.now()))
    const fileRequests = getFileRequestList()
    for (let i = 0; i < fileRequests.length; i++) {
      const request = fileRequests[i]
      if (request.Nonce === nonce) {
        switch (request.Type) {
          case FileRequestType.Avatar:
            yield call(handleBinaryAvatar, request, new Uint8Array(action.data.slice(4)))
            break
          case FileRequestType.File:
            yield call(handleBinaryBulletinFile, request, new Uint8Array(action.data.slice(4)))
            break
          case FileRequestType.PrivateChatFile:
            yield call(handleBinaryPrivateFile, request, Buffer.from(action.data.slice(4)))
            break
          case FileRequestType.GroupChatFile:
            yield call(handleBinaryGroupFile, request, Buffer.from(action.data.slice(8)), action)
            break
        }
      }
    }
  } catch (e) {
    Logger.error('[handleBinaryMessage] failed:', e.message)
  }
}

// ---------- Action message handlers ----------

function* handleAvatarRequestAction(json, action) {
  try {
    if (checkAvatarRequestSchema(json) && VerifyJsonSignature(json)) {
      let new_list = []
      for (let i = 0; i < json.List.length; i++) {
        const avatar = json.List[i]
        const db_avatar = yield call(() => dbAPI.getAvatarByAddress(avatar.Address))
        if (db_avatar !== null && db_avatar.signed_at > avatar.SignedAt) {
          new_list.push(db_avatar.json)
        }
      }
      if (new_list.length > 0) {
        let avatar_response = { ObjectType: ObjectType.AvatarList, List: new_list }
        yield call(SendMessage, { key: action.key, msg: JSON.stringify(avatar_response) })
      }
    }
  } catch (e) {
    Logger.error('[handleAvatarRequestAction] failed:', e.message)
  }
}

function* handleBulletinRequestAction(json, action, address, seed) {
  try {
    if (checkBulletinRequestSchema(json) && VerifyJsonSignature(json)) {
      let bulletin = null
      if (json.Hash) {
        bulletin = yield call(() => dbAPI.getBulletinByHash(json.Hash))
      } else {
        bulletin = yield call(() => dbAPI.getBulletinBySequence(json.Address, json.Sequence))
      }
      if (bulletin !== null) {
        yield call(SendMessage, { key: action.key, msg: JSON.stringify(bulletin.json) })
      } else if (json.Address === address) {
        const last_bulletin = yield call(() => dbAPI.getLastBulletin(json.Address))
        if (last_bulletin === null) {
          if (json.Sequence > 1) {
            const msg = yield call(() => mgAPI.genBulletinRequest(seed, address, 1, address))
            yield call(SendMessage, { key: action.key, msg: msg })
          }
        } else if (last_bulletin.sequence + 1 < json.Sequence) {
          yield call(RequestNextBulletin, { key: action.key, payload: { address: address } })
        }
      }
    }
  } catch (e) {
    Logger.error('[handleBulletinRequestAction] failed:', e.message)
  }
}

function* handleFileRequestAction(json, action, address, ob_address) {
  try {
    if (checkFileRequestSchema(json) && VerifyJsonSignature(json)) {
      if (json.FileType === FileRequestType.Avatar) {
        const avatar = yield call(() => dbAPI.getAvatarByHash(json.Hash))
        if (avatar !== null) {
          const base_dir = yield select(state => state.Common.AppBaseDir)
          const avatar_path = yield call(() => path.join(base_dir, `/${AvatarDir}/${avatar.address}.png`))
          const content = yield call(() => readFile(avatar_path))
          const nonce = Uint32ToBuffer(json.Nonce)
          yield call(SendMessage, { key: action.key, msg: Buffer.concat([nonce, content]) })
        }
      } else if (json.FileType === FileRequestType.File) {
        const file = yield call(() => dbAPI.getFileByHash(json.Hash))
        if (file !== null && file.is_saved) {
          const base_dir = yield select(state => state.Common.AppBaseDir)
          const file_path = yield call(() => path.join(...buildFileFullPath(base_dir, FileDir, json.Hash)))
          const nonce = Uint32ToBuffer(json.Nonce)
          if (file.size <= FileChunkSize) {
            const content = yield call(() => readFile(file_path))
            yield call(SendMessage, { key: action.key, msg: Buffer.concat([nonce, content]) })
          } else {
            const fileHandle = yield call(() => open(file_path, { read: true }))
            try {
              const start = (json.ChunkCursor - 1) * FileChunkSize
              fileHandle.seek(start, SeekMode.Start)
              const length = Math.min(FileChunkSize, file.size - start)
              const buffer = new Uint8Array(length)
              const bytesRead = yield call(() => fileHandle.read(buffer))
              if (bytesRead > 0) {
                const chunk = buffer.slice(0, bytesRead)
                yield call(SendMessage, { key: action.key, msg: Buffer.concat([nonce, chunk]) })
              }
            } finally {
              yield call(() => fileHandle.close())
            }
          }
        }
      } else if (json.FileType === FileRequestType.PrivateChatFile) {
        const private_chat_file = yield call(() => dbAPI.getPrivateFileByEHash(json.Hash))
        if (private_chat_file !== null) {
          const file = yield call(() => dbAPI.getFileByHash(private_chat_file.hash))
          if (file !== undefined && file.is_saved) {
            const base_dir = yield select(state => state.Common.AppBaseDir)
            const file_path = yield call(() => path.join(...buildFileFullPath(base_dir, FileDir, file.hash)))
            const nonce = Uint32ToBuffer(json.Nonce)
            if (file.size <= FileChunkSize) {
              const content = yield call(() => readFile(file_path))
              const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, ob_address)
              const ecdh = yield call(() => dbAPI.getHandshake(address, ob_address, DefaultPartition, ecdh_sequence))
              if (ecdh?.aes_key) {
                const encrypted_content = AesEncryptBuffer(content, ecdh.aes_key)
                yield call(SendMessage, { key: action.key, msg: Buffer.concat([nonce, encrypted_content]) })
              }
            } else {
              const fileHandle = yield call(() => open(file_path, { read: true }))
              try {
                const start = (json.ChunkCursor - 1) * FileChunkSize
                fileHandle.seek(start, SeekMode.Start)
                const length = Math.min(FileChunkSize, file.size - start)
                const buffer = new Uint8Array(length)
                const bytesRead = yield call(() => fileHandle.read(buffer))
                if (bytesRead > 0) {
                  const chunk = buffer.slice(0, bytesRead)
                  const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, ob_address)
                  const ecdh = yield call(() => dbAPI.getHandshake(address, ob_address, DefaultPartition, ecdh_sequence))
                  if (ecdh?.aes_key) {
                    const encrypted_chunk = AesEncryptBuffer(chunk, ecdh.aes_key)
                    yield call(SendMessage, { key: action.key, msg: Buffer.concat([nonce, encrypted_chunk]) })
                  }
                }
              } finally {
                yield call(() => fileHandle.close())
              }
            }
          }
        }
      } else if (json.FileType === FileRequestType.GroupChatFile) {
        const group_member_map = yield select(state => state.Messenger.GroupMemberMap)
        if (group_member_map[json.GroupHash] && group_member_map[json.GroupHash].includes(ob_address)) {
          let index = getMemberIndex(group_member_map[json.GroupHash], address)
          const index_u32 = Uint32ToBuffer(index)
          const group_chat_file = yield call(() => dbAPI.getGroupFileByEHash(json.Hash))
          if (group_chat_file !== null) {
            const file = yield call(() => dbAPI.getFileByHash(group_chat_file.hash))
            if (file !== undefined && file.is_saved) {
              const base_dir = yield select(state => state.Common.AppBaseDir)
              const file_path = yield call(() => path.join(...buildFileFullPath(base_dir, FileDir, file.hash)))
              const nonce = Uint32ToBuffer(json.Nonce)
              const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, ob_address)
              const ecdh = yield call(() => dbAPI.getHandshake(address, ob_address, DefaultPartition, ecdh_sequence))
              if (file.size <= FileChunkSize) {
                const content = yield call(() => readFile(file_path))
                if (ecdh?.aes_key) {
                  const encrypted_content = AesEncryptBuffer(content, ecdh.aes_key)
                  yield call(SendMessage, { key: action.key, msg: Buffer.concat([nonce, index_u32, encrypted_content]) })
                }
              } else {
                const fileHandle = yield call(() => open(file_path, { read: true }))
                try {
                  const start = (json.ChunkCursor - 1) * FileChunkSize
                  fileHandle.seek(start, SeekMode.Start)
                  const length = Math.min(FileChunkSize, file.size - start)
                  const buffer = new Uint8Array(length)
                  const bytesRead = yield call(() => fileHandle.read(buffer))
                  if (bytesRead > 0) {
                    const chunk = buffer.slice(0, bytesRead)
                    if (ecdh?.aes_key) {
                      const encrypted_chunk = AesEncryptBuffer(chunk, ecdh.aes_key)
                      yield call(SendMessage, { key: action.key, msg: Buffer.concat([nonce, index_u32, encrypted_chunk]) })
                    }
                  }
                } finally {
                  yield call(() => fileHandle.close())
                }
              }
            }
          }
        }
      }
    }
  } catch (e) {
    Logger.error('[handleFileRequestAction] failed:', e.message)
  }
}

function* handlePrivateMessageSyncAction(json, action, address, ob_address) {
  try {
    if (checkPrivateMessageSyncSchema(json) && VerifyJsonSignature(json)) {
      const friend = yield call(() => dbAPI.getFriend(address, ob_address))
      if (friend !== null) {
        const unsyncMessageList = yield call(() => dbAPI.getUnsyncPrivateSession(address, ob_address, json.PairSequence, json.SelfSequence))
        for (let i = 0; i < unsyncMessageList.length; i++) {
          const msg = unsyncMessageList[i]
          yield call(SendMessage, { key: action.key, msg: msg.json })
        }
      }
    }
  } catch (e) {
    Logger.error('[handlePrivateMessageSyncAction] failed:', e.message)
  }
}

function* handleGroupSyncAction(json, action) {
  try {
    if (checkGroupSyncSchema(json) && VerifyJsonSignature(json)) {
      const group_list = yield select(state => state.Messenger.GroupList)
      let tmp_list = []
      for (let i = 0; i < group_list.length; i++) {
        const group = group_list[i]
        if (group.delete_json !== null) {
          tmp_list.push(group.delete_json)
        } else {
          tmp_list.push(group.create_json)
        }
      }
      if (tmp_list.length > 0) {
        let group_response = { ObjectType: ObjectType.GroupList, List: tmp_list }
        yield call(SendMessage, { key: action.key, msg: JSON.stringify(group_response) })
      }
    }
  } catch (e) {
    Logger.error('[handleGroupSyncAction] failed:', e.message)
  }
}

function* handleGroupMessageSyncAction(json, action, address, ob_address, seed) {
  try {
    if (checkGroupMessageSyncSchema(json) && VerifyJsonSignature(json)) {
      let timestamp = Date.now()
      const group = yield call(() => dbAPI.getGroupByHash(json.Hash))
      if (group === null) {
        yield call(GroupSync, { key: action.key })
      } else if (group.is_accepted === true && (group.created_by === ob_address || group.member.includes(ob_address))) {
        const ecdh_sequence = DHSequence(DefaultPartition, timestamp, address, ob_address)
        const ecdh = yield call(() => dbAPI.getHandshake(address, ob_address, DefaultPartition, ecdh_sequence))
        if (ecdh === null && address !== ob_address) {
          yield call(InitHandshake, { ecdh_sequence: ecdh_sequence, pair_address: ob_address })
        } else if (ecdh.aes_key === null) {
          yield fork(SendMessage, { key: action.key, msg: JSON.stringify(ecdh.self_json) })
        } else {
          let tmp_msg_list = []
          if (json.Sequence === 0) {
            tmp_msg_list = yield call(() => dbAPI.getUnsyncGroupSession(json.Hash, Epoch))
          } else {
            const current_msg = yield call(() => dbAPI.getGroupMessageBySequence(json.Hash, json.Address, json.Sequence))
            if (current_msg !== null) {
              tmp_msg_list = yield call(() => dbAPI.getUnsyncGroupSession(json.Hash, current_msg.signed_at))
            } else {
              const last_group_member_msg = yield call(() => dbAPI.getLastGroupMemberMessage(json.Hash, json.Address))
              let group_member_sequence = 0
              if (last_group_member_msg !== null) {
                group_member_sequence = last_group_member_msg.sequence
              }
              const group_msg_sync_request = yield call(() => mgAPI.genGroupMessageSync(seed, json.Hash, json.Address, group_member_sequence, json.Address))
              yield call(SendMessage, { key: action.key, msg: JSON.stringify(group_msg_sync_request) })
            }
          }
          if (tmp_msg_list.length > 0) {
            let list = []
            for (let i = 0; i < tmp_msg_list.length; i++) {
              const tmp_msg = tmp_msg_list[i]
              let tmp_msg_json = JSON.parse(tmp_msg.json)
              let encrypt_content = AesEncrypt(tmp_msg_json.Content, ecdh.aes_key)
              tmp_msg_json.Content = encrypt_content
              delete tmp_msg_json["ObjectType"]
              delete tmp_msg_json["GroupHash"]
              list.push(tmp_msg_json)
            }
            const group_msg_list_json = yield call(() => mgAPI.genGroupMessageList(seed, json.Hash, ob_address, list, timestamp))
            yield call(SendMessage, { key: action.key, msg: JSON.stringify(group_msg_list_json) })
          }
        }
      }
    }
  } catch (e) {
    Logger.error('[handleGroupMessageSyncAction] failed:', e.message)
  }
}

// ---------- Action message dispatcher ----------
function* handleActionMessage(json, action, address, seed) {
  try {
    let ob_address = rippleKeyPairs.deriveAddress(json.PublicKey)
    switch (json.Action) {
      case ActionCode.AvatarRequest:
        yield call(handleAvatarRequestAction, json, action)
        break
      case ActionCode.BulletinRequest:
        yield call(handleBulletinRequestAction, json, action, address, seed)
        break
      case ActionCode.FileRequest:
        yield call(handleFileRequestAction, json, action, address, ob_address)
        break
      case ActionCode.PrivateMessageSync:
        yield call(handlePrivateMessageSyncAction, json, action, address, ob_address)
        break
      case ActionCode.GroupSync:
        yield call(handleGroupSyncAction, json, action)
        break
      case ActionCode.GroupMessageSync:
        yield call(handleGroupMessageSyncAction, json, action, address, ob_address, seed)
        break
    }
  } catch (e) {
    Logger.error('[handleActionMessage] failed for Action', json.Action, e.message)
  }
}

// ---------- Object message handlers ----------

function* handleBulletinObject(json) {
  try {
    if (!checkBulletinSchema(json) || !VerifyJsonSignature(json)) return null
    const ob_address = rippleKeyPairs.deriveAddress(json.PublicKey)
    const bulletin = yield call(CacheBulletin, json)
    const address = yield select(state => state.User.Address)
    const follow_list = yield select(state => state.User.FollowList)
    if (follow_list.includes(ob_address) || ob_address === address) {
      yield fork(RequestNextBulletin, { key: null, payload: { address: ob_address } })
    }
    return bulletin
  } catch (e) {
    Logger.error('[handleBulletinObject] failed for', json.Hash, e.message)
  }
}

function* handleServerAddressListObject(json) {
  if (checkServerAddressListSchema(json)) {
    yield put(setServerAddressList(json))
  }
}

function* handleReplyBulletinListObject(json) {
  try {
    if (!checkReplyBulletinListSchema(json)) return
    let replys = []
    for (let i = 0; i < json.List.length; i++) {
      const bulletin = json.List[i]
      if (VerifyJsonSignature(bulletin)) {
        const b = yield call(CacheBulletin, bulletin)
        replys.push(b)
      }
    }
    yield put(setDisplayBulletinReplyList({ List: replys, Page: json.Page, TotalPage: json.TotalPage }))
  } catch (e) {
    Logger.error('[handleReplyBulletinListObject] failed:', e.message)
  }
}

function* handleTagBulletinListObject(json) {
  try {
    if (!checkTagBulletinListSchema(json)) return
    let tag_bulletin_list = []
    for (let i = 0; i < json.List.length; i++) {
      const bulletin = json.List[i]
      if (VerifyJsonSignature(bulletin)) {
        const b = yield call(CacheBulletin, bulletin)
        tag_bulletin_list.push(b)
      }
    }
    yield put(setTagBulletinList({ List: tag_bulletin_list, Page: json.Page, TotalPage: json.TotalPage }))
  } catch (e) {
    Logger.error('[handleTagBulletinListObject] failed:', e.message)
  }
}

function* handleRandomBulletinListObject(json) {
  try {
    if (!checkRandomBulletinListSchema(json)) return
    let random_bulletin_list = []
    for (let i = 0; i < json.List.length; i++) {
      const bulletin = json.List[i]
      if (VerifyJsonSignature(bulletin)) {
        const b = yield call(CacheBulletin, bulletin)
        random_bulletin_list.push(b)
      }
    }
    yield put(setRandomBulletinList(random_bulletin_list))
  } catch (e) {
    Logger.error('[handleRandomBulletinListObject] failed:', e.message)
  }
}

function* handleAvatarListObject(json) {
  try {
    if (!checkAvatarListSchema(json)) return
    for (let i = 0; i < json.List.length; i++) {
      const avatar = json.List[i]
      if (VerifyJsonSignature(avatar)) {
        const avatar_address = rippleKeyPairs.deriveAddress(avatar.PublicKey)
        const db_avatar = yield call(() => dbAPI.getAvatarByAddress(avatar_address))
        if (db_avatar !== null) {
          if (db_avatar.signed_at < avatar.Timestamp) {
            if (db_avatar.hash === avatar.Hash) {
              yield call(() => dbAPI.updateAvatar(avatar_address, avatar.Hash, avatar.Size, avatar.Timestamp, Date.now(), avatar, true))
            } else {
              yield call(() => dbAPI.updateAvatar(avatar_address, avatar.Hash, avatar.Size, avatar.Timestamp, Date.now(), avatar, false))
              yield call(RequestAvatarFile, { key: null, address: avatar_address, hash: avatar.Hash })
            }
          } else if (db_avatar.signed_at === avatar.Timestamp && db_avatar.is_saved === false) {
            yield call(RequestAvatarFile, { key: null, address: avatar_address, hash: avatar.Hash })
          }
        }
      }
    }
  } catch (e) {
    Logger.error('[handleAvatarListObject] failed:', e.message)
  }
}

function* handleECDHHandshakeObject(json, address, seed) {
  try {
    if (!checkECDHHandshakeSchema(json) || json.To !== address || !VerifyJsonSignature(json)) return
    const ob_address = rippleKeyPairs.deriveAddress(json.PublicKey)
    const friend = yield call(() => dbAPI.getFriend(address, ob_address))
    const total_member_list = yield select(state => state.Messenger.TotalGroupMemberList)
    if (friend !== null || total_member_list.includes(ob_address)) {
      const ecdh = yield call(() => dbAPI.getHandshake(address, ob_address, DefaultPartition, json.Sequence))
      if (ecdh === null) {
        const ecdh_sk = HalfSHA512(GenesisHash + seed + address + json.Sequence)
        const self_key_pair = ec.keyFromPrivate(ecdh_sk, 'hex')
        const ecdh_pk = self_key_pair.getPublic('hex')
        const timestamp = Date.now()
        const self_json = yield call(() => mgAPI.genECDHHandshake(seed, DefaultPartition, json.Sequence, ecdh_pk, json.Self, ob_address, timestamp))
        const pair_key_pair = ec.keyFromPublic(json.Self, 'hex')
        const shared_key = self_key_pair.derive(pair_key_pair.getPublic()).toString('hex')
        const aes_key = genAESKey(shared_key, address, ob_address, json.Sequence)
        yield call(() => dbAPI.initHandshakeFromRemote(address, ob_address, DefaultPartition, json.Sequence, aes_key, ecdh_sk, ecdh_pk, self_json, json))
        yield call(SendMessage, { msg: JSON.stringify(self_json) })
      } else {
        const self_key_pair = ec.keyFromPrivate(ecdh.private_key, 'hex')
        const timestamp = Date.now()
        const self_json = yield call(() => mgAPI.genECDHHandshake(seed, DefaultPartition, json.Sequence, ecdh.public_key, json.Self, ob_address, timestamp))
        const pair_key_pair = ec.keyFromPublic(json.Self, 'hex')
        const shared_key = self_key_pair.derive(pair_key_pair.getPublic()).toString('hex')
        const aes_key = genAESKey(shared_key, address, ob_address, json.Sequence)
        yield call(() => dbAPI.updateHandshake(address, ob_address, DefaultPartition, json.Sequence, aes_key, self_json, json))
        if (json.Pair === "") {
          yield call(SendMessage, { msg: JSON.stringify(self_json) })
        }
      }
    }
  } catch (e) {
    Logger.error('[handleECDHHandshakeObject] failed:', e.message)
  }
}

function* handlePrivateMessageObject(json, address) {
  try {
    if (!checkPrivateMessageSchema(json) || !VerifyJsonSignature(json)) return
    let ob_address = rippleKeyPairs.deriveAddress(json.PublicKey)
    if (json.To !== address && ob_address !== address) return

    yield call(processPrivateMessage, json, address, ob_address)
  } catch (e) {
    Logger.error('[handlePrivateMessageObject] failed:', e.message)
  }
}

function* processPrivateMessage(json, address, ob_address) {
  try {
    const is_self = (ob_address === address)
    const remote = is_self ? json.To : ob_address

    const friend = yield call(() => dbAPI.getFriend(address, remote))
    if (friend === null) return

    const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, remote)
    const ecdh = yield call(() => dbAPI.getHandshake(address, remote, DefaultPartition, ecdh_sequence))
    if (ecdh === null || ecdh.aes_key === null) {
      yield call(InitHandshake, { key: null, ecdh_sequence: ecdh_sequence, pair_address: remote })
      return
    }

    let content = AesDecrypt(json.Content, ecdh.aes_key)
    if (content === null) {
      Logger.error('[PrivateMessage] Failed to decrypt message content')
      return
    }
    let content_json = deriveJson(content)
    if (content_json && checkMessageObjectSchema(content_json)) {
      content = content_json
    }

    if (typeof content === 'object' && content.ObjectType === MessageObjectType.PrivateChatFile) {
      yield fork(FetchPrivateChatFile, { payload: { remote: remote, hash: content.Hash, size: content.Size } })
    }

    const CurrentSession = yield select(state => state.Messenger.CurrentSession)
    let is_readed = false
    if (CurrentSession && CurrentSession.type === SessionType.Private && CurrentSession.remote === remote) {
      is_readed = true
    }

    const session_msgs = yield call(() => dbAPI.getPrivateSession(address, remote))
    let last_msg = (session_msgs && session_msgs.length > 0) ? session_msgs.reduce((a, b) => a.sequence > b.sequence ? a : b) : null
    let add_result = false
    if (last_msg === null || json.Sequence === 1) {
      if (json.Sequence === 1 && json.PreHash === GenesisHash) {
        add_result = yield call(() => dbAPI.addPrivateMessage(
          QuarterSHA512Message(json), ob_address, json.To, json.Sequence, json.PreHash,
          content, json, json.Timestamp, false, false, is_readed, typeof content === 'object'
        ))
      } else if (last_msg !== null) {
        yield call(SyncPrivateMessage, { payload: { key: null, local: address, remote: remote } })
      }
    } else {
      if (last_msg.sequence + 1 === json.Sequence && last_msg.hash === json.PreHash) {
        add_result = yield call(() => dbAPI.addPrivateMessage(
          QuarterSHA512Message(json), ob_address, json.To, json.Sequence, json.PreHash,
          content, json, json.Timestamp, false, false, is_readed, typeof content === 'object'
        ))
      } else if (last_msg.sequence + 1 < json.Sequence) {
        yield call(SyncPrivateMessage, { payload: { key: null, local: address, remote: remote } })
      }
    }

    if (add_result) {
      if (CurrentSession && CurrentSession.type === SessionType.Private && CurrentSession.remote === remote) {
        yield call(RefreshPrivateMessageList)
      }
      yield call(LoadSessionList)
      yield call(invoke, 'start_message_flash')
    }
  } catch (e) {
    Logger.error('[processPrivateMessage] failed:', e.message)
  }
}

function* handleGroupListObject(json, address) {
  try {
    if (!checkGroupListSchema(json)) return
    for (let i = 0; i < json.List.length; i++) {
      const group_json = json.List[i]
      const db_g = yield call(() => dbAPI.getGroupByHash(group_json.Hash))
      if (group_json.ObjectType === ObjectType.GroupCreate && VerifyJsonSignature(group_json)) {
        if (db_g === null) {
          const created_by = rippleKeyPairs.deriveAddress(group_json.PublicKey)
          if (created_by === address) {
            yield call(() => dbAPI.createGroup(group_json.Hash, group_json.Name, created_by, group_json.Member, group_json.Timestamp, group_json, true))
            yield call(LoadSessionList)
            yield call(LoadGroupList)
          } else if (group_json.Member.includes(address)) {
            yield call(() => dbAPI.createGroup(group_json.Hash, group_json.Name, created_by, group_json.Member, group_json.Timestamp, group_json, false))
            yield call(LoadGroupRequestList)
          }
        }
      } else if (group_json.ObjectType === ObjectType.GroupDelete && VerifyJsonSignature(group_json)) {
        if (db_g !== null) {
          yield call(() => dbAPI.updateGroupDelete(group_json.Hash, group_json))
        }
      }
    }
  } catch (e) {
    Logger.error('[handleGroupListObject] failed:', e.message)
  }
}

function* handleGroupMessageListObject(json, address, seed) {
  try {
    if (!checkGroupMessageListSchema(json)) return
    const ob_address = rippleKeyPairs.deriveAddress(json.PublicKey)
    const group = yield call(() => dbAPI.getGroupByHash(json.GroupHash))
    if (group === null) {
      yield call(GroupSync, { key: null })
      return
    }
    if (group.is_accepted !== true) return

    const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, ob_address)
    const ecdh = yield call(() => dbAPI.getHandshake(address, ob_address, DefaultPartition, ecdh_sequence))
    if (ecdh === null) {
      yield call(InitHandshake, { key: null, ecdh_sequence: ecdh_sequence, pair_address: ob_address })
      return
    }
    if (ecdh.aes_key === null) {
      yield fork(SendMessage, { msg: JSON.stringify(ecdh.self_json) })
      return
    }

    let unCachedMessageAddress = []
    for (let i = 0; i < json.List.length; i++) {
      const group_msg = json.List[i]
      const msg_address = rippleKeyPairs.deriveAddress(group_msg.PublicKey)
      const pre_message = yield call(() => dbAPI.getGroupMessageByHash(json.GroupHash, group_msg.PreHash))
      if (pre_message === undefined && !(group_msg.Sequence === 1 && group_msg.PreHash === GenesisHash)) {
        unCachedMessageAddress.push(msg_address)
        continue
      }

      let content = AesDecrypt(group_msg.Content, ecdh.aes_key)
      if (content === null) {
        Logger.error('[GroupMessage] Failed to decrypt message content')
        continue
      }
      let content_json = deriveJson(content)
      if (content_json && checkMessageObjectSchema(content_json)) {
        content = content_json
      }

      let verify_json = {
        ObjectType: ObjectType.GroupMessage,
        GroupHash: json.GroupHash,
        Sequence: group_msg.Sequence,
        PreHash: group_msg.PreHash,
        Confirm: group_msg.Confirm,
        Content: content,
        Timestamp: group_msg.Timestamp,
        PublicKey: group_msg.PublicKey,
        Signature: group_msg.Signature
      }
      if (verify_json.Confirm === undefined) {
        delete verify_json["Confirm"]
      }

      if (!VerifyJsonSignature(verify_json)) continue

      const hash = QuarterSHA512Message(verify_json)
      if (typeof verify_json.Content === 'object' && verify_json.Content.ObjectType === MessageObjectType.GroupChatFile) {
        yield call(FetchGroupChatFile, { payload: { key: null, group_hash: json.GroupHash, hash: verify_json.Content.Hash, size: verify_json.Content.Size } })
      }

      let is_readed = false
      const CurrentSession = yield select(state => state.Messenger.CurrentSession)
      if (CurrentSession && CurrentSession.type === SessionType.Group && CurrentSession.hash === json.GroupHash) {
        is_readed = true
      }

      const add_result = yield call(() => dbAPI.addGroupMessage(
        hash, json.GroupHash, msg_address, verify_json.Sequence, verify_json.PreHash,
        verify_json.Content, verify_json, verify_json.Timestamp, false, false, is_readed, typeof verify_json.Content === 'object'
      ))
      if (add_result) {
        if (CurrentSession && CurrentSession.type === SessionType.Group && CurrentSession.hash === json.GroupHash) {
          yield call(RefreshGroupMessageList)
        }
        yield call(LoadSessionList)
        yield call(invoke, 'start_message_flash')
      }
    }

    unCachedMessageAddress = [...new Set(unCachedMessageAddress)]
    for (let i = 0; i < unCachedMessageAddress.length; i++) {
      const msg_address = unCachedMessageAddress[i]
      const last_msg = yield call(() => dbAPI.getMemberLastGroupMessage(json.GroupHash, msg_address))
      let sequence = 0
      if (last_msg !== null) {
        sequence = last_msg.sequence
      }
      const group_msg_sync_request = yield call(() => mgAPI.genGroupMessageSync(seed, json.GroupHash, msg_address, sequence, ob_address))
      yield call(SendMessage, { msg: JSON.stringify(group_msg_sync_request) })
    }
  } catch (e) {
    Logger.error('[handleGroupMessageListObject] failed for group', json.GroupHash, e.message)
  }
}

// ---------- Object message dispatcher ----------
function* handleObjectMessage(json, action, address, seed) {
  try {
    if (json.ObjectType === ObjectType.Bulletin) {
      yield call(handleBulletinObject, json)
    } else if (json.ObjectType === ObjectType.ServerAddressList) {
      yield call(handleServerAddressListObject, json)
    } else if (json.ObjectType === ObjectType.ReplyBulletinList) {
      yield call(handleReplyBulletinListObject, json)
    } else if (json.ObjectType === ObjectType.TagBulletinList) {
      yield call(handleTagBulletinListObject, json)
    } else if (json.ObjectType === ObjectType.RandomBulletinList) {
      yield call(handleRandomBulletinListObject, json)
    } else if (json.ObjectType === ObjectType.AvatarList) {
      yield call(handleAvatarListObject, json)
    } else if (json.ObjectType === ObjectType.ECDH) {
      yield call(handleECDHHandshakeObject, json, address, seed)
    } else if (json.ObjectType === ObjectType.PrivateMessage) {
      yield call(handlePrivateMessageObject, json, address)
    } else if (json.ObjectType === ObjectType.GroupList) {
      yield call(handleGroupListObject, json, address)
    } else if (json.ObjectType === ObjectType.GroupMessageList) {
        yield call(handleGroupMessageListObject, json, address, seed)
      }
  } catch (e) {
    Logger.error('[handleObjectMessage] failed for ObjectType', json.ObjectType, e.message)
  }
}

// ---------- WebSocket Listener ----------
export function* WebsocketListener() {
  const channel = globalWsChannel

  try {
    while (true) {
      try {
        const action = yield take(channel)
        switch (action.type) {
          case 'status':
            Logger.info('!!!conn status change:', action)
            if (action.status === WebSocket.OPEN) {
              yield call(UpdateConnStatus, action)
              const seed = yield select(state => state.User.Seed)
              if (!seed) {
                continue
              }
              const msg = yield call(() => mgAPI.genDeclare(seed))
              yield call(SendMessage, { key: action.key, msg: msg })
              yield call(AvatarRequest, { payload: { flag: true } })
              yield call(SubscribeFollow)
              yield call(FetchFollowBulletin)
            } else if (action.status === WebSocket.CLOSED) {
              yield call(UpdateConnStatus, action)
            } else if (action.status === 'error') {
              yield call(UpdateConnStatus, action)
            }
            break
          case 'message':
            Logger.debug('!!!received message: ', action)
            const seed = yield select(state => state.User.Seed)
            if (!seed) {
              continue
            }
            const address = yield select(state => state.User.Address)
            if (action.isBinary) {
              yield call(handleBinaryMessage, action)
            } else {
              const json = action.data
              if (json.Action && (json.To === undefined || json.To === address)) {
                yield call(handleActionMessage, json, action, address, seed)
              } else if (json.ObjectType) {
                yield call(handleObjectMessage, json, action, address, seed)
              }
            }
            break
        }
      } catch (e) {
        Logger.error('[WebsocketListener] unhandled error processing message:', e.message, e.stack)
      }
    }
  } finally {
    if (yield cancelled()) {
      Logger.info('[WebsocketListener] saga cancelled, terminating cleanly')
    }
  }
}

