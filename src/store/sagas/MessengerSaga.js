import { Buffer } from 'buffer'
import Elliptic from 'elliptic'
import * as rippleKeyPairs from 'ripple-keypairs'
import * as path from '@tauri-apps/api/path'
import { open, readFile, writeFile, remove, mkdir, stat, SeekMode } from '@tauri-apps/plugin-fs'
import { call, delay, put, select, fork, takeEvery, takeLatest } from 'redux-saga/effects'
import { eventChannel, END } from 'redux-saga'
import { checkAvatarRequestSchema, checkBulletinRequestSchema, checkBulletinSchema, checkECDHHandshakeSchema, checkPrivateMessageSchema, checkFileRequestSchema, checkMessageObjectSchema, deriveJson, checkGroupSyncSchema, checkGroupListSchema, checkGroupMessageListSchema, checkPrivateMessageSyncSchema, checkGroupMessageSyncSchema } from '../../lib/MessageSchemaVerifier'
import MessageGenerator from '../../lib/MessageGenerator'
import { ActionCode, FileRequestType, GenesisHash, ObjectType, MessageObjectType, Epoch } from '../../lib/MessengerConst'
import { AvatarDir, BulletinPageSize, Day, DefaultPartition, DefaultServer, FileChunkSize, FileDir, FileMaxSize, Hour, MaxMember, MaxSpeaker, Minute, SessionType } from '../../lib/AppConst'
import { setBulletinAddressList, setChannelList, setComposeMemberList, setComposeSpeakerList, setCurrentBulletinSequence, setCurrentChannel, setPublishFileList, setPublishQuoteList, setCurrentSession, setCurrentSessionMessageList, setFollowBulletinList, setForwardBulletin, setForwardFlag, setGroupList, setGroupRequestList, setMineBulletinList, setPublishFlag, setRandomBulletin, setSessionList, setTotalGroupMemberList, updateMessengerConnStatus, setPublishTagList, setDisplayBulletin, setDisplayBulletinReplyList, setTagBulletinList, setServerList, setCurrentServer, setBookmarkBulletinList, setChannelBulletinList } from '../slices/MessengerSlice'
import { AesDecrypt, AesDecryptBuffer, AesEncrypt, AesEncryptBuffer, ConsoleError, ConsoleWarn, filesize_format, genAESKey, HalfSHA512, QuarterSHA512Message } from '../../lib/AppUtil'
import { BlobToUint32, calcTotalPage, DHSequence, PrivateFileEHash, FileHash, genNonce, GroupFileEHash, Uint32ToBuffer, VerifyJsonSignature, getMemberIndex, getMemberByIndex } from '../../lib/MessengerUtil'
import { setFlashNoticeMessage } from '../slices/UserSlice'
import { dbAPI } from '../../db'

let switchClient = null
let switchEventChannel = null

let MG = null

function initMessageGenerator(seed) {
  const keypair = rippleKeyPairs.deriveKeypair(seed)
  MG = new MessageGenerator(keypair.publicKey, keypair.privateKey)
}

function createSwitchEventChannel(client) {
  return eventChannel((emit) => {
    const onOpen = () => {
      emit(updateMessengerConnStatus(true))
    }

    const onMessage = async (event) => {
      const data_type = typeof event.data
      if (data_type === 'string') {
        try {
          const json = JSON.parse(event.data)
          console.log(json)
          emit({ type: 'HandelReceiveMessage', payload: json })
        } catch (error) {
          console.log(event.data)
          emit({ type: 'SOCKET_ERROR', error: 'Invalid JSON format' })
        }
      } else if (data_type === 'object') {
        // emit({ type: 'HandelReceiveBolb', payload: event.data })
        // console.log(typeof event.data)
        // console.log(event.data)
        const nonce = await BlobToUint32(event.data.slice(0, 4))
        FileRequestList = FileRequestList.filter(r => r.Timestamp + 120 * 1000 > Date.now())
        for (let i = 0; i < FileRequestList.length; i++) {
          const request = FileRequestList[i]
          if (request.Nonce === nonce) {
            const base_dir = await path.resourceDir()
            if (request.Type === FileRequestType.Avatar) {
              let content = event.data.slice(4)
              content = await content.arrayBuffer()
              content = Buffer.from(content)
              const content_hash = FileHash(content)
              if (request.Hash === content_hash) {
                const avatar_dir = await path.join(base_dir, AvatarDir)
                mkdir(avatar_dir, { recursive: true })
                let avatar_path = `${avatar_dir}/${request.Address}.png`
                await writeFile(avatar_path, content)
                await dbAPI.updateAvatarIsSaved(request.Address, 1, Date.now())
              }
            } else if (request.Type === FileRequestType.File) {
              let content = event.data.slice(4)
              content = await content.arrayBuffer()
              content = Buffer.from(content)
              const file_dir = await path.join(base_dir, FileDir, request.Hash.substring(0, 3), request.Hash.substring(3, 6))
              mkdir(file_dir, { recursive: true })
              let file_path = await path.join(file_dir, request.Hash)
              let file = await dbAPI.getFileByHash(request.Hash)
              if (file.chunk_cursor < file.chunk_length && file.chunk_cursor + 1 === request.ChunkCursor) {
                await writeFile(file_path, content, { append: true })
                FileRequestList = FileRequestList.filter(r => r.Nonce !== request.Nonce)
                let current_chunk_cursor = file.chunk_cursor + 1
                await dbAPI.updateFileChunkCursor(request.Hash, current_chunk_cursor, Date.now())
                if (current_chunk_cursor < file.chunk_length) {
                  emit({ type: 'FetchBulletinFile', payload: { hash: request.Hash } })
                } else {
                  let hash = FileHash(await readFile(file_path))
                  if (hash === request.Hash) {
                    await dbAPI.remoteFileSaved(request.Hash, Date.now())
                  } else {
                    await remove(file_path)
                    await dbAPI.updateFileChunkCursor(request.Hash, 0, Date.now())
                    emit({ type: 'FetchBulletinFile', payload: { hash: request.Hash } })
                  }
                }
              }
            } else if (request.Type === FileRequestType.PrivateChatFile) {
              let content = event.data.slice(4)
              content = await content.arrayBuffer()
              content = Buffer.from(content)
              const file_dir = await path.join(base_dir, FileDir, request.Hash.substring(0, 3), request.Hash.substring(3, 6))
              mkdir(file_dir, { recursive: true })
              let chat_file_path = await path.join(file_dir, request.Hash)
              let chat_file = await dbAPI.getFileByHash(request.Hash)
              if (chat_file.chunk_cursor < chat_file.chunk_length && chat_file.chunk_cursor + 1 === request.ChunkCursor) {
                const decrypted_content = AesDecryptBuffer(content, request.aes_key)
                await writeFile(chat_file_path, decrypted_content, { append: true })
                FileRequestList = FileRequestList.filter(r => r.Nonce !== request.Nonce)
                let current_chunk_cursor = chat_file.chunk_cursor + 1
                await dbAPI.updateFileChunkCursor(request.Hash, current_chunk_cursor, Date.now())
                if (current_chunk_cursor < chat_file.chunk_length) {
                  emit({ type: 'FetchPrivateChatFile', payload: { hash: request.Hash, size: request.Size, remote: request.Address } })
                } else {
                  let hash = FileHash(await readFile(chat_file_path))
                  if (hash === request.Hash) {
                    await dbAPI.remoteFileSaved(request.Hash, Date.now())
                  } else {
                    await remove(chat_file_path)
                    await dbAPI.updateFileChunkCursor(request.Hash, 0, Date.now())
                    emit({ type: 'FetchPrivateChatFile', payload: { hash: request.Hash, size: request.Size, remote: request.Address } })
                  }
                }
              }
            } else if (request.Type === FileRequestType.GroupChatFile) {
              const index = await BlobToUint32(event.data.slice(4, 8))
              const from = getMemberByIndex(request.GroupMember, index)
              const ecdh_sequence = DHSequence(DefaultPartition, Date.now(), request.SelfAddress, from)
              let ecdh = await dbAPI.getHandshake(request.SelfAddress, from, DefaultPartition, ecdh_sequence)
              if (ecdh !== null && ecdh.aes_key !== null) {
                const file_dir = await path.join(base_dir, FileDir, request.Hash.substring(0, 3), request.Hash.substring(3, 6))
                mkdir(file_dir, { recursive: true })
                let chat_file_path = await path.join(file_dir, request.Hash)
                let chat_file = await dbAPI.getFileByHash(request.Hash)
                if (chat_file.chunk_cursor < chat_file.chunk_length && chat_file.chunk_cursor + 1 === request.ChunkCursor) {
                  let content = event.data.slice(8)
                  content = await content.arrayBuffer()
                  content = Buffer.from(content)
                  const decrypted_content = AesDecryptBuffer(content, ecdh.aes_key)
                  await writeFile(chat_file_path, decrypted_content, { append: true })
                  FileRequestList = FileRequestList.filter(r => r.Nonce !== request.Nonce)
                  await dbAPI.updateFileChunkCursor(request.Hash, chat_file.chunk_cursor + 1, Date.now())
                }

                chat_file = await dbAPI.getFileByHash(request.Hash)
                if (chat_file.chunk_cursor < chat_file.chunk_length) {
                  emit({ type: 'FetchGroupChatFile', payload: { hash: request.Hash, size: request.Size, group_hash: request.GroupHash } })
                } else {
                  let hash = FileHash(await readFile(chat_file_path))
                  if (hash === request.Hash) {
                    await dbAPI.remoteFileSaved(request.Hash, Date.now())
                  } else {
                    await remove(chat_file_path)
                    await dbAPI.updateFileChunkCursor(request.Hash, 0, Date.now())
                    emit({ type: 'FetchGroupChatFile', payload: { hash: request.Hash, size: request.Size, group_hash: request.GroupHash } })
                  }
                }
              }
            }
          }
        }
      }
    }

    const onClose = () => {
      emit(updateMessengerConnStatus(false))
      emit(END)
    }

    const onError = (errorEvent) => {
      emit({ type: 'SOCKET_ERROR', error: errorEvent.message || 'WebSocket error' })
    }


    client.addEventListener('open', onOpen)
    client.addEventListener('message', onMessage)
    client.addEventListener('close', onClose)
    client.addEventListener('error', onError)


    return () => {
      client.removeEventListener('open', onOpen)
      client.removeEventListener('message', onMessage)
      client.removeEventListener('close', onClose)
      client.removeEventListener('error', onError)

      if (client.readyState === WebSocket.OPEN) {
        client.close()
      }
    }
  })
}

let MessageQueue = []
function* EnqueueMessage({ payload }) {
  if (!MessageQueue.includes(payload.msg)) {
    MessageQueue.push(payload.msg)
    console.log(MessageQueue)
  }
}

export function* ReleaseMessage() {
  if (MessageQueue.length > 0) {
    yield call(SendMessage, { msg: MessageQueue.shift() })
    console.log(MessageQueue)
  }
}

export function* ClearMessage() {
  MessageQueue = []
}

function* SendMessage(payload) {
  console.log('!!!send message', payload)
  try {
    if (switchClient.readyState === WebSocket.OPEN) {
      switchClient.send(payload.msg)
    } else {
      // yield put({ 
      //   type: WS_ERROR, 
      //   payload: { 
      //     message: 'could not send message，WebSocket not connected',
      //     code: switchClient.readyState
      //   } 
      // })
    }
  } catch (error) {
    // yield put({ 
    //   type: WS_ERROR, 
    //   payload: { 
    //     message: 'send message failura', 
    //     error: error.message 
    //   } 
    // })
  }
}

function* CacheBulletin(bulletin_json) {
  let address = rippleKeyPairs.deriveAddress(bulletin_json.PublicKey)
  let bulletin_db = yield call(() => dbAPI.getBulletinBySequence(address, bulletin_json.Sequence))
  if (bulletin_db === null) {
    let new_bulletin_hash = QuarterSHA512Message(bulletin_json)
    let result = yield call(() => dbAPI.addBulletin(new_bulletin_hash, address, bulletin_json.Sequence, bulletin_json.PreHash, bulletin_json.Content, bulletin_json, bulletin_json.Timestamp))
    if (result) {
      if (bulletin_json.Tag) {
        yield call(() => dbAPI.addTagsToBulletin(new_bulletin_hash, bulletin_json.Timestamp, bulletin_json.Tag))
      }
      if (bulletin_json.Quote) {
        yield call(() => dbAPI.addReplyToBulletins(bulletin_json.Quote, new_bulletin_hash, bulletin_json.Timestamp))
      }
      if (bulletin_json.File) {
        for (let i = 0; i < bulletin_json.File.length; i++) {
          const f = bulletin_json.File[i]
          let chunk_length = Math.ceil(f.Size / FileChunkSize)
          let file = yield call(() => dbAPI.getFileByHash(f.Hash))
          if (file === null) {
            yield call(() => dbAPI.addFile(f.Hash, f.Size, Date.now(), chunk_length, 0, false))
          }
          yield fork(FetchBulletinFile, { payload: { hash: f.Hash } })
        }
        yield call(() => dbAPI.addFilesToBulletin(new_bulletin_hash, bulletin_json.File))
      }
    }
    bulletin_db = yield call(() => dbAPI.getBulletinBySequence(address, bulletin_json.Sequence))
  }
  return bulletin_db
}

function* handelMessengerEvent(action) {
  console.log(action)
  yield put(action)
  const seed = yield select(state => state.User.Seed)
  const address = yield select(state => state.User.Address)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }

  if (action.type === updateMessengerConnStatus.type && action.payload === true) {
    // connnected
    ConsoleWarn(`connnected`)
    let msg = MG.genDeclare()
    yield call(SendMessage, { msg: msg })
    yield call(AvatarRequest)
    yield call(SubscribeChannel)
  } else if (action.type === updateMessengerConnStatus.type && action.payload === false) {
    // disconnnected
    // yield call([switchClient, switchClient.disconnect])
  } else if (action.type === 'HandelReceiveMessage') {
    yield put(updateMessengerConnStatus(true))
    console.log('received message', action.payload)
    let json = action.payload
    if (json.Action && (json.To === undefined || json.To === address)) {
      let ob_address = rippleKeyPairs.deriveAddress(json.PublicKey)
      switch (json.Action) {
        // request action
        case ActionCode.AvatarRequest:
          if (checkAvatarRequestSchema(json) && VerifyJsonSignature(json)) {
            let new_list = []
            for (let i = 0; i < json.List.length; i++) {
              const avatar = json.List[i]
              let db_avatar = yield call(() => dbAPI.getAvatarByAddress(avatar.Address))
              if (db_avatar !== null && db_avatar.signed_at > avatar.SignedAt) {
                new_list.push(db_avatar.json)
              }
            }
            if (new_list.length > 0) {
              let avatar_response = {
                ObjectType: ObjectType.AvatarList,
                List: new_list
              }
              yield call(EnqueueMessage, { payload: { msg: JSON.stringify(avatar_response) } })
            }
          }
          break
        case ActionCode.BulletinRequest:
          if (checkBulletinRequestSchema(json) && VerifyJsonSignature(json)) {
            let bulletin = yield call(() => dbAPI.getBulletinBySequence(json.Address, json.Sequence))
            if (bulletin !== null) {
              yield call(SendMessage, { msg: JSON.stringify(bulletin.json) })
            } else if (json.Address === address) {
              // pull self bulletin from server
              const last_bulletin = yield call(() => dbAPI.getLastBulletin(json.Address))
              if (last_bulletin === null) {
                if (json.Sequence > 1) {
                  let msg = MG.genBulletinRequest(address, 1, address)
                  yield call(EnqueueMessage, { payload: { msg: msg } })
                }
              } else if (last_bulletin.sequence + 1 < json.Sequence) {
                let msg = MG.genBulletinRequest(address, last_bulletin.sequence + 1, address)
                yield call(EnqueueMessage, { payload: { msg: msg } })
              }
            }
          }
          break
        case ActionCode.FileRequest:
          console.log(json.Hash)
          if (checkFileRequestSchema(json) && VerifyJsonSignature(json)) {
            if (json.FileType === FileRequestType.Avatar) {
              let avatar = yield call(() => dbAPI.getAvatarByHash(json.Hash))
              if (avatar !== null) {
                const base_dir = yield select(state => state.Common.AppBaseDir)
                const avatar_path = yield call(() => path.join(base_dir, `/${AvatarDir}/${avatar.address}.png`))
                const content = yield call(() => readFile(avatar_path))
                const nonce = Uint32ToBuffer(json.Nonce)
                yield call(SendMessage, { msg: Buffer.concat([nonce, content]) })
              }
            } else if (json.FileType === FileRequestType.File) {
              let file = yield call(() => dbAPI.getFileByHash(json.Hash))
              if (file !== null && file.is_saved) {// && file.chunk_cursor >= json.ChunkCursor) {
                const base_dir = yield select(state => state.Common.AppBaseDir)
                const file_path = yield call(() => path.join(base_dir, FileDir, json.Hash.substring(0, 3), json.Hash.substring(3, 6), json.Hash))
                const nonce = Uint32ToBuffer(json.Nonce)
                if (file.size <= FileChunkSize) {
                  const content = yield call(() => readFile(file_path))
                  yield call(SendMessage, { msg: Buffer.concat([nonce, content]) })
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
                      yield call(SendMessage, { msg: Buffer.concat([nonce, chunk]) })
                    }
                  } finally {
                    yield call(() => fileHandle.close())
                  }
                }
              }
            } else if (json.FileType === FileRequestType.PrivateChatFile) {
              let private_chat_file = yield call(() => dbAPI.getPrivateFileByEHash(json.Hash))
              if (private_chat_file !== null) {
                let file = yield call(() => dbAPI.getFileByHash(private_chat_file.hash))
                if (file !== undefined && file.is_saved) {// && file.chunk_length >= json.ChunkCursor) {
                  const base_dir = yield select(state => state.Common.AppBaseDir)
                  const file_path = yield call(() => path.join(base_dir, FileDir, file.hash.substring(0, 3), file.hash.substring(3, 6), file.hash))
                  const nonce = Uint32ToBuffer(json.Nonce)

                  if (file.size <= FileChunkSize) {
                    const content = yield call(() => readFile(file_path))
                    const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, ob_address)
                    let ecdh = yield call(() => dbAPI.getHandshake(address, ob_address, DefaultPartition, ecdh_sequence))
                    if (ecdh !== null && ecdh.aes_key !== null) {
                      const encrypted_content = AesEncryptBuffer(content, ecdh.aes_key)
                      yield call(SendMessage, { msg: Buffer.concat([nonce, encrypted_content]) })
                    }
                    yield call(SendMessage, { msg: Buffer.concat([nonce, content]) })
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
                        let ecdh = yield call(() => dbAPI.getHandshake(address, ob_address, DefaultPartition, ecdh_sequence))
                        if (ecdh !== null && ecdh.aes_key !== null) {
                          const encrypted_chunk = AesEncryptBuffer(chunk, ecdh.aes_key)
                          yield call(SendMessage, { msg: Buffer.concat([nonce, encrypted_chunk]) })
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
                let group_chat_file = yield call(() => dbAPI.getFileByHash(json.Hash))
                if (group_chat_file !== null) {
                  let file = yield call(() => dbAPI.getFileByHash(group_chat_file.hash))
                  if (file !== undefined && file.is_saved) {// && file.chunk_length >= json.ChunkCursor) {
                    const base_dir = yield select(state => state.Common.AppBaseDir)
                    const file_path = yield call(() => path.join(base_dir, FileDir, file.hash.substring(0, 3), file.hash.substring(3, 6), file.hash))
                    const nonce = Uint32ToBuffer(json.Nonce)

                    if (file.size <= FileChunkSize) {
                      const content = yield call(() => readFile(file_path))
                      const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, ob_address)
                      let ecdh = yield call(() => dbAPI.getHandshake(address, ob_address, DefaultPartition, ecdh_sequence))
                      if (ecdh !== null && ecdh.aes_key !== null) {
                        const encrypted_content = AesEncryptBuffer(content, ecdh.aes_key)
                        yield call(SendMessage, { msg: Buffer.concat([nonce, index_u32, encrypted_content]) })
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
                          let ecdh = yield call(() => dbAPI.getHandshake(address, ob_address, DefaultPartition, ecdh_sequence))
                          if (ecdh !== null && ecdh.aes_key !== null) {
                            const encrypted_chunk = AesEncryptBuffer(chunk, ecdh.aes_key)
                            yield call(SendMessage, { msg: Buffer.concat([nonce, index_u32, encrypted_chunk]) })
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
          break
        case ActionCode.PrivateMessageSync:
          if (checkPrivateMessageSyncSchema(json) && VerifyJsonSignature(json)) {
            const friend = yield call(() => dbAPI.getFriend(address, ob_address))
            if (friend !== null) {
              let unsyncMessageList = yield call(() => dbAPI.getUnsyncPrivateSession(address, ob_address, json.PairSequence, json.SelfSequence))
              for (let i = 0; i < unsyncMessageList.length; i++) {
                const msg = unsyncMessageList[i]
                yield call(SendMessage, { msg: msg.json })
              }
            }
          }
          break
        case ActionCode.GroupSync:
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
              let group_response = {
                ObjectType: ObjectType.GroupList,
                List: tmp_list
              }
              yield call(EnqueueMessage, { payload: { msg: JSON.stringify(group_response) } })
            }
          }
          break
        case ActionCode.GroupMessageSync:
          if (checkGroupMessageSyncSchema(json) && VerifyJsonSignature(json)) {
            let timestamp = Date.now()
            let group = yield call(() => dbAPI.getGroupByHash(json.Hash))
            console.log(group)
            if (group === null) {
              yield call(GroupSync)
            } else if (group.is_accepted === true && (group.created_by === ob_address || group.member.includes(ob_address))) {
              const ecdh_sequence = DHSequence(DefaultPartition, timestamp, address, ob_address)
              let ecdh = yield call(() => dbAPI.getHandshake(address, ob_address, DefaultPartition, ecdh_sequence))
              console.log(ecdh)
              if (ecdh === null && address !== ob_address) {
                yield call(InitHandshake, { ecdh_sequence: ecdh_sequence, pair_address: ob_address })
              } else if (ecdh.aes_key === null) {
                yield fork(SendMessage, { msg: JSON.stringify(ecdh.self_json) })
              } else {
                let tmp_msg_list = []
                if (json.Sequence === 0) {
                  tmp_msg_list = yield call(() => dbAPI.getUnsyncGroupSession(json.Hash, Epoch))
                } else {
                  let current_msg = yield call(() => dbAPI.getGroupMessageBySequence(json.Hash, json.Address, json.Sequence))
                  console.log(current_msg)
                  if (current_msg !== null) {
                    tmp_msg_list = yield call(() => dbAPI.getUnsyncGroupSession(json.Hash, current_msg.signed_at))
                  } else {
                    let last_group_member_msg = yield call(() => dbAPI.getLastGroupMemberMessage(json.Hash, json.Address))
                    let group_member_sequence = 0
                    if (last_group_member_msg !== null) {
                      group_member_sequence = last_group_member_msg.sequence
                    }
                    let group_msg_sync_request = MG.genGroupMessageSync(json.Hash, json.Address, group_member_sequence, json.Address)
                    yield call(SendMessage, { msg: JSON.stringify(group_msg_sync_request) })
                  }
                }
                console.log(tmp_msg_list)
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
                  let group_msg_list_json = {
                    ObjectType: ObjectType.GroupMessageList,
                    GroupHash: json.Hash,
                    To: ob_address,
                    Timestamp: timestamp,
                    PublicKey: MG.PublicKey,
                    List: list
                  }
                  yield call(SendMessage, { msg: JSON.stringify(group_msg_list_json) })
                }
              }
            }
          }
          break
        default:
          break
      }
    } else if (json.ObjectType && (json.To === undefined || json.To === address)) {
      let timestamp = Date.now()
      if (json.ObjectType === ObjectType.Bulletin) {
        let ob_address = rippleKeyPairs.deriveAddress(json.PublicKey)
        if (checkBulletinSchema(json)) {
          if (VerifyJsonSignature(json)) {
            let bulletin = yield call(CacheBulletin, json)
            yield put(setRandomBulletin(bulletin))
            // TODO fetch next bulletin
            // if (tmp.result) {
            //   let bulletin_request = MG.genBulletinRequest(ob_address, json.Sequence + 1, ob_address)
            //   yield call(EnqueueMessage, { payload: { msg: bulletin_request } })
            // }
          }
        }
      } else if (json.ObjectType === ObjectType.BulletinAddressList) {
        console.log(json)
        yield put(setBulletinAddressList(json))
      } else if (json.ObjectType === ObjectType.ReplyBulletinList) {
        console.log(json)
        let replys = []
        for (let i = 0; i < json.List.length; i++) {
          const bulletin = json.List[i]
          if (VerifyJsonSignature(bulletin)) {
            const b = yield call(CacheBulletin, bulletin)
            replys.push(b)
          }
        }
        yield put(setDisplayBulletinReplyList({ List: replys, Page: json.Page, TotalPage: json.TotalPage }))
      } else if (json.ObjectType === ObjectType.TagBulletinList) {
        console.log(json)
        let tag_bulletin_list = []
        for (let i = 0; i < json.List.length; i++) {
          const bulletin = json.List[i]
          if (VerifyJsonSignature(bulletin)) {
            const b = yield call(CacheBulletin, bulletin)
            tag_bulletin_list.push(b)
          }
        }
        yield put(setTagBulletinList({ List: tag_bulletin_list, Page: json.Page, TotalPage: json.TotalPage }))
      } else if (json.ObjectType === ObjectType.AvatarList) {
        for (let i = 0; i < json.List.length; i++) {
          const avatar = json.List[i]
          if (VerifyJsonSignature(avatar)) {
            const avatar_address = rippleKeyPairs.deriveAddress(avatar.PublicKey)
            let db_avatar = yield call(() => dbAPI.getAvatarByAddress(avatar_address))
            if (db_avatar !== undefined) {
              if (db_avatar.SignedAt < avatar.Timestamp) {
                if (db_avatar.Hash === avatar.Hash) {
                  yield call(() => dbAPI.updateAvatar(avatar_address, avatar.Hash, avatar.Size, avatar.Timestamp, Date.now(), avatar, 1))
                } else {
                  yield call(() => dbAPI.updateAvatar(avatar_address, avatar.Hash, avatar.Size, avatar.Timestamp, Date.now(), avatar, 0))
                  yield call(RequestAvatarFile, { address: avatar_address, hash: avatar.Hash })
                }
              }
            }
          }
        }
      } else if (json.ObjectType === ObjectType.ECDH) {
        let ob_address = rippleKeyPairs.deriveAddress(json.PublicKey)
        if (checkECDHHandshakeSchema(json)) {
          let friend = yield call(() => dbAPI.getFriend(address, ob_address))
          console.log(friend)
          const total_member_list = yield select(state => state.Messenger.TotalGroupMemberList)
          console.log(total_member_list)
          if (friend !== null || total_member_list.includes(ob_address)) {
            let ecdh = yield call(() => dbAPI.getHandshake(address, ob_address, DefaultPartition, json.Sequence))
            console.log(ecdh)
            if (ecdh === null) {
              const ec = new Elliptic.ec('secp256k1')
              const ecdh_sk = HalfSHA512(GenesisHash + seed + address + json.Sequence)
              const self_key_pair = ec.keyFromPrivate(ecdh_sk, 'hex')
              const ecdh_pk = self_key_pair.getPublic('hex')
              const self_json = MG.genECDHHandshake(DefaultPartition, json.Sequence, ecdh_pk, json.Self, ob_address, timestamp)
              const pair_key_pair = ec.keyFromPublic(json.Self, 'hex')
              const shared_key = self_key_pair.derive(pair_key_pair.getPublic()).toString('hex')
              const aes_key = genAESKey(shared_key, address, ob_address, json.Sequence)
              yield call(() => dbAPI.initHandshakeFromRemote(address, ob_address, DefaultPartition, json.Sequence, aes_key, ecdh_sk, ecdh_pk, self_json, json))
              yield call(SendMessage, { msg: JSON.stringify(self_json) })
            } else {
              const ec = new Elliptic.ec('secp256k1')
              const self_key_pair = ec.keyFromPrivate(ecdh.private_key, 'hex')
              const self_json = MG.genECDHHandshake(DefaultPartition, json.Sequence, ecdh.public_key, json.Self, ob_address, timestamp)
              const pair_key_pair = ec.keyFromPublic(json.Self, 'hex')
              const shared_key = self_key_pair.derive(pair_key_pair.getPublic()).toString('hex')
              const aes_key = genAESKey(shared_key, address, ob_address, json.Sequence)
              yield call(() => dbAPI.updateHandshake(address, ob_address, DefaultPartition, json.Sequence, aes_key, self_json, json))
              if (json.Pair === "") {
                yield call(SendMessage, { msg: JSON.stringify(self_json) })
              }
            }
          } else {
            // Strangers do nothing
          }
        }
      } else if (json.ObjectType === ObjectType.PrivateMessage) {
        // private
        let ob_address = rippleKeyPairs.deriveAddress(json.PublicKey)
        if (checkPrivateMessageSchema(json)) {
          if (ob_address !== address) {
            let friend = yield call(() => dbAPI.getFriend(address, ob_address))
            if (friend !== null) {
              const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, ob_address)
              let ecdh = yield call(() => dbAPI.getHandshake(address, ob_address, DefaultPartition, ecdh_sequence))
              if (ecdh === null || ecdh.aes_key === null) {
                yield call(InitHandshake, { ecdh_sequence: ecdh_sequence, pair_address: ob_address })
              } else {
                let content = AesDecrypt(json.Content, ecdh.aes_key)
                let content_json = deriveJson(content)
                if (content_json && checkMessageObjectSchema(content_json)) {
                  content = content_json
                }
                let hash = QuarterSHA512Message(json)
                if (typeof content === 'object') {
                  if (content.ObjectType === MessageObjectType.PrivateChatFile) {
                    yield fork(FetchPrivateChatFile, { payload: { remote: ob_address, hash: content.Hash, size: content.Size } })
                  }
                }

                let last_msg = yield call(() => dbAPI.getLastPrivateMessage(ob_address, address))
                const CurrentSession = yield select(state => state.Messenger.CurrentSession)
                if (last_msg === null) {
                  if (json.Sequence === 1 && json.PreHash === GenesisHash) {
                    // first msg, save
                    yield call(() => dbAPI.addPrivateMessage(hash, ob_address, address, json.Sequence, json.PreHash, content, json, json.Timestamp, false, false, false, typeof content === 'object'))
                    if (CurrentSession && CurrentSession.type === SessionType.Private && CurrentSession.remote === ob_address) {
                      yield call(RefreshPrivateMessageList)
                    } else {
                      // TODO: unread message count
                    }
                  } else {
                    // request first msg
                    yield call(SyncPrivateMessage, { payload: { local: address, remote: ob_address } })
                  }
                } else {
                  // (last_msg !== undefined)
                  if (last_msg.sequence + 1 === json.Sequence && last_msg.hash === json.PreHash) {
                    // chained msg, save
                    yield call(() => dbAPI.addPrivateMessage(hash, ob_address, address, json.Sequence, json.PreHash, content, json, json.Timestamp, false, false, false, typeof content === 'object'))
                    if (CurrentSession && CurrentSession.type === SessionType.Private && CurrentSession.remote === ob_address) {
                      yield call(RefreshPrivateMessageList)
                    } else {
                      // TODO: unread message count
                    }
                  } else if (last_msg.sequence + 1 < json.Sequence) {
                    // unchained msg, request next msg
                    yield call(SyncPrivateMessage, { payload: { local: address, remote: ob_address } })
                  }
                }
              }
            }
          } else {
            // sync self message
            let msg_to = yield call(() => dbAPI.getFriend(address, json.To))
            if (msg_to !== null) {
              const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, json.To)
              let ecdh = yield call(() => dbAPI.getHandshake(address, json.To, DefaultPartition, ecdh_sequence))
              if (ecdh === null || ecdh.aes_key === null) {
                yield call(InitHandshake, { ecdh_sequence: ecdh_sequence, pair_address: json.To })
              } else {
                let content = AesDecrypt(json.Content, ecdh.aes_key)
                let content_json = deriveJson(content)
                if (content_json && checkMessageObjectSchema(content_json)) {
                  content = content_json
                }
                let hash = QuarterSHA512Message(json)
                if (typeof content === 'object') {
                  if (content.ObjectType === MessageObjectType.PrivateChatFile) {
                    yield fork(FetchPrivateChatFile, { payload: { remote: json.To, hash: content.Hash, size: content.Size } })
                  }
                }

                let last_msg = yield call(() => dbAPI.getLastPrivateMessage(address, json.To))
                if (last_msg === null) {
                  if (json.Sequence === 1 && json.PreHash === GenesisHash) {
                    // first msg, save
                    yield call(() => dbAPI.addPrivateMessage(hash, address, json.To, json.Sequence, json.PreHash, content, json, json.Timestamp, false, false, false, typeof content === 'object'))
                  } else {
                    // request first msg
                    yield call(SyncPrivateMessage, { payload: { local: address, remote: json.To } })
                  }
                } else {
                  // (last_msg !== undefined)
                  if (last_msg.sequence + 1 === json.Sequence && last_msg.hash === json.PreHash) {
                    // chained msg, save
                    yield call(() => dbAPI.addPrivateMessage(hash, address, json.To, json.Sequence, json.PreHash, content, json, json.Timestamp, false, false, false, typeof content === 'object'))
                  } else if (last_msg.sequence + 1 < json.Sequence) {
                    // unchained msg, request next msg
                    yield call(SyncPrivateMessage, { payload: { local: address, remote: json.To } })
                  }
                }
              }
            }
          }
        }
      } else if (json.ObjectType === ObjectType.GroupList) {
        if (checkGroupListSchema(json)) {
          for (let i = 0; i < json.List.length; i++) {
            const group_json = json.List[i]
            let db_g = yield call(() => dbAPI.getGroupByHash(group_json.Hash))
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
        }
      } else if (json.ObjectType === ObjectType.GroupMessageList) {
        if (checkGroupMessageListSchema(json)) {
          const ob_address = rippleKeyPairs.deriveAddress(json.PublicKey)
          let group = yield call(() => dbAPI.getGroupByHash(json.GroupHash))
          if (group === null) {
            yield call(GroupSync)
          } else if (group.is_accepted === true) {
            const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, ob_address)
            let ecdh = yield call(() => dbAPI.getHandshake(address, ob_address, DefaultPartition, ecdh_sequence))
            if (ecdh === null) {
              yield call(InitHandshake, { ecdh_sequence: ecdh_sequence, pair_address: ob_address })
            } else if (ecdh.aes_key === null) {
              yield fork(SendMessage, { msg: JSON.stringify(ecdh.self_json) })
            } else {
              let unCachedMessageAddress = []
              for (let i = 0; i < json.List.length; i++) {
                const group_msg = json.List[i]
                const msg_address = rippleKeyPairs.deriveAddress(group_msg.PublicKey)
                let pre_message = yield call(() => dbAPI.getGroupByHash(json.GroupHash, group_msg.PreHash))
                if (pre_message !== undefined
                  || (pre_message === undefined && group_msg.Sequence === 1 && group_msg.PreHash === GenesisHash)) {
                  let content = AesDecrypt(group_msg.Content, ecdh.aes_key)
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
                  if (VerifyJsonSignature(verify_json)) {
                    let hash = QuarterSHA512Message(verify_json)
                    if (typeof verify_json.Content === 'object') {
                      if (verify_json.Content.ObjectType === MessageObjectType.GroupChatFile) {
                        let chunk_length = Math.ceil(verify_json.Content.Size / FileChunkSize)
                        let file = yield call(() => dbAPI.getFileByHash(verify_json.Content.Hash))
                        if (file === null) {
                          yield call(() => dbAPI.addFile(verify_json.Content.Hash, verify_json.Content.Size, Date.now(), chunk_length, 0, false))
                        }

                        const ehash = GroupFileEHash(json.GroupHash, verify_json.Content.Hash)
                        let group_chat_file = yield call(() => dbAPI.getFileByHash(ehash))
                        if (group_chat_file === null) {
                          yield call(() => dbAPI.addGroupFile(ehash, json.GroupHash, verify_json.Content.Hash, verify_json.Content.Size))
                        }
                      }
                    }
                    yield call(() => dbAPI.addGroupMessage(hash, json.GroupHash, msg_address, verify_json.Sequence, verify_json.PreHash, verify_json.Content, verify_json, verify_json.Timestamp, false, false, false, typeof verify_json.Content === 'object'))
                    const CurrentSession = yield select(state => state.Messenger.CurrentSession)
                    if (CurrentSession && CurrentSession.type === SessionType.Group && CurrentSession.hash === json.GroupHash) {
                      yield call(RefreshGroupMessageList)
                    } else {
                      // TODO: unread message count
                    }
                  }
                } else {
                  unCachedMessageAddress.push(msg_address)
                }
              }
              unCachedMessageAddress = [...new Set(unCachedMessageAddress)]
              for (let i = 0; i < unCachedMessageAddress.length; i++) {
                const msg_address = unCachedMessageAddress[i]
                let last_msg = yield call(() => dbAPI.getMemberLastGroupMessage(json.GroupHash, msg_address))
                if (last_msg === null) {
                  let group_msg_sync_request = MG.genGroupMessageSync(json.GroupHash, msg_address, 0, ob_address)
                  yield call(SendMessage, { msg: JSON.stringify(group_msg_sync_request) })
                } else {
                  let group_msg_sync_request = MG.genGroupMessageSync(json.GroupHash, msg_address, last_msg.sequence, ob_address)
                  yield call(SendMessage, { msg: JSON.stringify(group_msg_sync_request) })
                }
              }
            }
          }
        }
      }
    }
  } else if (action.type === 'FetchBulletinFile') {
    // TODO is need
    console.log(action.payload)
    yield fork(FetchBulletinFile, { payload: { hash: action.payload.hash } })
  } else if (action.type === 'FetchPrivateChatFile') {
    // TODO is need
    console.log(action.payload)
    yield fork(FetchPrivateChatFile, { payload: action.payload })
  }
}

let FileRequestList = []
function genFileNonce() {
  let nonce = genNonce()
  for (let i = 0; i < FileRequestList.length; i++) {
    const r = FileRequestList[i];
    if (r.Nonce === nonce) {
      return genFileNonce()
    }
  }
  return nonce
}

function* FetchBulletinFile({ payload }) {
  let file = yield call(() => dbAPI.getFileByHash(payload.hash))
  if (file !== null && file.is_saved === false) {
    let nonce = genFileNonce()
    let tmp = {
      Type: FileRequestType.File,
      Nonce: nonce,
      Hash: file.hash,
      ChunkCursor: file.chunk_cursor + 1,
      // Address: address,
      Timestamp: Date.now()
    }
    FileRequestList = FileRequestList.filter(r => r.Timestamp + 120 * 1000 > Date.now())
    FileRequestList = FileRequestList.filter(r => r.Hash !== file.hash)
    FileRequestList.push(tmp)
    let file_request = MG.genFileRequest(FileRequestType.File, file.hash, nonce, file.chunk_cursor + 1)
    yield call(SendMessage, { msg: file_request })
  }
}

function* SaveBulletinFile({ payload }) {
  const file = yield call(() => dbAPI.getFileByHash(payload.hash))
  if (file && file.is_saved) {
    const base_dir = yield select(state => state.Common.AppBaseDir)
    const sour_file_path = yield call(() => path.join(base_dir, FileDir, payload.hash.substring(0, 3), payload.hash.substring(3, 6), payload.hash))
    const content = yield call(() => readFile(sour_file_path))
    const dl_dir = yield call(() => path.downloadDir())
    const dest_dir = yield call(() => path.join(dl_dir, `RippleMessenger`))
    yield call(() => mkdir(dest_dir, { recursive: true }))
    const dest_file_path = yield call(() => path.join(dest_dir, `${payload.name}${payload.ext}`))
    yield call(() => writeFile(dest_file_path, content))
    yield put(setFlashNoticeMessage({ message: 'file saved to download directory', duration: 2000 }))
  } else {
    yield put(setFlashNoticeMessage({ message: 'file not exist, fetching from server...', duration: 2000 }))
    yield call(FetchBulletinFile, { payload: { hash: payload.hash, size: payload.size } })
  }
}

function* FetchPrivateChatFile({ payload }) {
  const self_address = yield select(state => state.User.Address)
  const ehash = PrivateFileEHash(self_address, payload.remote, payload.hash)
  let private_chat_file = yield call(() => dbAPI.getPrivateFileByEHash(ehash))
  if (private_chat_file === null) {
    yield call(() => dbAPI.addPrivateFile(ehash, self_address, payload.remote, payload.hash, payload.size))
  }

  let chunk_length = Math.ceil(payload.size / FileChunkSize)
  let file = yield call(() => dbAPI.getFileByHash(payload.hash))
  if (file === null) {
    yield call(() => dbAPI.addFile(payload.hash, payload.size, Date.now(), chunk_length, 0, false))
  }

  file = yield call(() => dbAPI.getFileByHash(payload.hash))
  if (file && !file.is_saved) {
    let timestamp = Date.now()
    const ecdh_sequence = DHSequence(DefaultPartition, timestamp, self_address, payload.remote)
    let ecdh = yield call(() => dbAPI.getHandshake(self_address, payload.remote, DefaultPartition, ecdh_sequence))
    console.log(ecdh)
    if (ecdh !== null && ecdh.aes_key !== null) {
      let nonce = genFileNonce()
      let tmp = {
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
      FileRequestList = FileRequestList.filter(r => r.Timestamp + 120 * 1000 > Date.now())
      FileRequestList = FileRequestList.filter(r => r.EHash !== ehash)
      FileRequestList.push(tmp)
      let file_request = MG.genFileRequest(FileRequestType.PrivateChatFile, ehash, nonce, file.chunk_cursor + 1, payload.remote)
      yield call(SendMessage, { msg: file_request })
    }
  } else {
    // file exist
  }
}

function* FetchGroupChatFile({ payload }) {
  const self_address = yield select(state => state.User.Address)
  const ehash = GroupFileEHash(payload.group_hash, payload.hash)
  let group_chat_file = yield call(() => dbAPI.getGroupFileByEHash(ehash))
  if (group_chat_file === null) {
    yield call(() => dbAPI.addGroupFile(ehash, payload.group_hash, payload.hash, payload.size))
  }

  let chunk_length = Math.ceil(payload.size / FileChunkSize)
  let file = yield call(() => dbAPI.getFileByHash(payload.hash))
  if (file === null) {
    yield call(() => dbAPI.addFile(payload.hash, payload.size, Date.now(), chunk_length, 0, false))
  }

  file = yield call(() => dbAPI.getFileByHash(payload.hash))
  if (file && !file.is_saved) {
    let timestamp = Date.now()
    let nonce = genFileNonce()
    const group_member_map = yield select(state => state.Messenger.GroupMemberMap)
    let tmp = {
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
    FileRequestList = FileRequestList.filter(r => r.Timestamp + 120 * 1000 > Date.now())
    FileRequestList = FileRequestList.filter(r => r.EHash === ehash)
    console.log(tmp)
    FileRequestList.push(tmp)
    let file_request = MG.genGroupFileRequest(payload.group_hash, ehash, nonce, file.chunk_cursor + 1)
    yield call(SendMessage, { msg: file_request })
  } else {
    // file exist
  }
}

function* FetchChatFile({ payload }) {
  const current_session = yield select(state => state.Messenger.CurrentSession)
  if (current_session.type === SessionType.Private) {
    yield call(FetchPrivateChatFile, { payload: { remote: current_session.remote, hash: payload.hash, size: payload.size } })
  } else if (current_session.type === SessionType.Group) {
    yield call(FetchGroupChatFile, { payload: { group_hash: current_session.hash, hash: payload.hash, size: payload.size } })
  }
}

function* SaveChatFile({ payload }) {
  const file = yield call(() => dbAPI.getFileByHash(payload.hash))
  if (file && file.is_saved) {
    const base_dir = yield select(state => state.Common.AppBaseDir)
    const sour_file_path = yield call(() => path.join(base_dir, FileDir, payload.hash.substring(0, 3), payload.hash.substring(3, 6), payload.hash))
    const content = yield call(() => readFile(sour_file_path))
    const dl_dir = yield call(() => path.downloadDir())
    const dest_dir = yield call(() => path.join(dl_dir, `RippleMessenger`))
    yield call(() => mkdir(dest_dir, { recursive: true }))
    const dest_file_path = yield call(() => path.join(dest_dir, `${payload.name}${payload.ext}`))
    yield call(() => writeFile(dest_file_path, content))
    yield put(setFlashNoticeMessage({ message: 'file saved to download directory', duration: 2000 }))
  } else {
    yield put(setFlashNoticeMessage({ message: 'file not exist, fetching from friend, make sure friend is online...', duration: 2000 }))
    yield call(FetchChatFile, { payload: { hash: payload.hash, size: payload.size } })
  }
}

export function* ConnectSwitch() {
  try {
    if (switchClient && switchClient.readyState === WebSocket.OPEN) {
      return
    }
    const server = yield select(state => state.Messenger.CurrentServer)
    switchClient = new WebSocket(server)
    switchEventChannel = yield call(createSwitchEventChannel, switchClient)
    yield takeEvery(switchEventChannel, handelMessengerEvent)
  } catch (error) {
    console.log(error)
    yield put(updateMessengerConnStatus(false))
  }
}

export function* DisconnectSwitch() {
  try {
    if (switchClient === null || switchClient.readyState !== WebSocket.OPEN) {
      return
    }
    yield call([switchClient, switchClient.close])
    switchClient = null
    switchEventChannel = null
  } catch (error) {
    console.log(error)
    yield put(updateMessengerConnStatus(false))
  }
}

function* ReConnnect() {
  try {
    if (switchClient && switchClient.readyState === WebSocket.OPEN) {
      yield call([switchClient, switchClient.close])
    }

    const server = yield select(state => state.Messenger.CurrentServer)
    switchClient = new WebSocket(server)
    switchEventChannel = yield call(createSwitchEventChannel, switchClient)
    yield takeEvery(switchEventChannel, handelMessengerEvent)
  } catch (error) {
    console.log(error)
    yield put(updateMessengerConnStatus(false))
  }
}

export function* LoadServerList() {
  let server_list = yield call(() => dbAPI.getAllServers())
  console.log(server_list)
  if (server_list.length === 0) {
    const timestamp = Date.now()
    yield call(() => dbAPI.addServer(DefaultServer, timestamp))
    server_list.push({
      url: DefaultServer,
      updated_at: timestamp
    })
  }
  yield put(setServerList(server_list))
  yield put(setCurrentServer(server_list[0].url))
  yield call(ReConnnect)
}

function* ServerAdd({ payload }) {
  const server = yield call(() => dbAPI.getServerByURL(payload.url))
  if (server === null) {
    yield call(() => dbAPI.addServer(payload.url, Date.now()))
  } else {
    yield call(() => dbAPI.updateServer(payload.url, Date.now()))
  }
  yield call(LoadServerList)
}

function* ServerDel({ payload }) {
  yield call(() => dbAPI.deleteServer(payload.url))
  yield call(LoadServerList)
}

function* ServerUse({ payload }) {
  yield call(() => dbAPI.updateServer(payload.url, Date.now()))
  yield call(LoadServerList)
}

// avatar
function* CheckAvatar({ payload }) {
  // console.log(payload)
  let db_avatar = yield call(() => dbAPI.getAvatarByAddress(payload.address))
  if (db_avatar === null) {
    console.log(`new avatar wanted...`)
    yield call(() => dbAPI.addAvatar(payload.address, GenesisHash, 0, Epoch, "", Epoch, 0))
  }
}

function* SaveSelfAvatar({ payload }) {
  const address = yield select(state => state.User.Address)
  let db_avatar = yield call(() => dbAPI.getAvatarByAddress(address))
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }

  let avatar_json = MG.genAvatarJson(payload.hash, payload.size, payload.timestamp)
  if (db_avatar !== null) {
    yield call(() => dbAPI.updateAvatar(address, payload.hash, payload.size, payload.timestamp, payload.timestamp, avatar_json, 1))
  }

  let avatar_response = {
    ObjectType: ObjectType.AvatarList,
    List: [avatar_json]
  }
  yield call(SendMessage, { msg: JSON.stringify(avatar_response) })
}

export function* AvatarRequest() {
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }
  let timestamp = Date.now()
  let old_avatar_list = yield call(() => dbAPI.getAvatarOldList())
  let list = []
  for (let i = 0; i < old_avatar_list.length; i++) {
    const avatar = old_avatar_list[i];
    if (avatar.updated_at < timestamp - Hour) {
      list.push({ Address: avatar.address, SignedAt: avatar.signed_at })
      yield call(() => dbAPI.updateAvatarUpdatedAt(avatar.address, timestamp))
    }
  }
  if (list.length > 0) {
    let avatar_request = MG.genAvatarRequest(list)
    yield call(SendMessage, { msg: avatar_request })
  }
}

function* RequestAvatarFile(payload) {
  if (payload.hash === GenesisHash) {
    return
  }
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }

  let nonce = genFileNonce()
  let tmp = {
    Type: FileRequestType.Avatar,
    Nonce: nonce,
    Hash: payload.hash,
    Address: payload.address,
    Timestamp: Date.now()
  }
  FileRequestList.push(tmp)

  let avatar_file_request = MG.genFileRequest(FileRequestType.Avatar, payload.hash, nonce, 1)
  yield call(SendMessage, { msg: avatar_file_request })
}

// bulletin
function* RequestNextBulletin({ payload }) {
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }
  let last_bulletin = yield call(() => dbAPI.getLastBulletin(payload.address))
  let request_sequence = 1
  if (last_bulletin !== null) {
    request_sequence = last_bulletin.sequence + 1
  }
  let bulletin_request = MG.genBulletinRequest(payload.address, request_sequence, payload.address)
  yield call(EnqueueMessage, { payload: { msg: bulletin_request } })
}

function* LoadMineBulletin({ payload }) {
  const seed = yield select(state => state.User.Seed)
  const address = yield select(state => state.User.Address)
  if (!seed) {
    MG = null
    return
  }

  let bulletins = yield call(() => dbAPI.getMyBulletins(address, payload.page))
  if (bulletins.length > 0) {
    yield put(setCurrentBulletinSequence(bulletins[0].sequence))
  } else {
    yield put(setCurrentBulletinSequence(0))
  }
  let total = yield call(() => dbAPI.getMyBulletinCount(address))
  let total_page = calcTotalPage(total, BulletinPageSize)
  yield put(setMineBulletinList({ List: bulletins, Page: payload.page, TotalPage: total_page }))
}

function* LoadFollowBulletin({ payload }) {
  const address = yield select(state => state.User.Address)
  let follow_list = yield call(() => dbAPI.getMyFollows(address))
  if (follow_list.length > 0) {
    let follow_address_list = []
    for (let i = 0; i < follow_list.length; i++) {
      const follow = follow_list[i]
      follow_address_list.push(follow.remote)
      yield fork(RequestNextBulletin, { payload: { address: follow.remote } })
    }

    const bulletins = yield call(() => dbAPI.getBulletinListByAddresses(follow_address_list, payload.page))
    const total = yield call(() => dbAPI.getBulletinCountByAddresses(follow_address_list))
    const total_page = calcTotalPage(total, BulletinPageSize)
    yield put(setFollowBulletinList({ List: bulletins, Page: payload.page, TotalPage: total_page }))
  } else {
    yield put(setFollowBulletinList({ List: [], Page: 0, TotalPage: 0 }))
  }
}

function* LoadBookmarkBulletin({ payload }) {
  let bulletins = yield call(() => dbAPI.getBulletinListByIsmark(payload.page))
  let total = yield call(() => dbAPI.getBulletinCountByIsmark())
  let total_page = calcTotalPage(total, BulletinPageSize)
  yield put(setBookmarkBulletinList({ List: bulletins, Page: payload.page, TotalPage: total_page }))
}

function* LoadBulletin(action) {
  console.log(action)
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }

  let bulletin = yield call(() => dbAPI.getBulletinByHash(action.payload.hash))
  if (bulletin === null) {
    let to = action.payload.address
    if (action.payload.to) {
      to = action.payload.to
    }
    let msg = MG.genBulletinRequest(action.payload.address, action.payload.sequence, to)
    yield call(EnqueueMessage, { payload: { msg: msg } })
  }
  yield put(setDisplayBulletin(bulletin))
}

function* RequestRandomBulletin() {
  yield put(setRandomBulletin(null))
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }
  let random_bulletin_request = MG.genBulletinRandomRequest()
  yield call(SendMessage, { msg: random_bulletin_request })
}

function* RequestBulletinAddress({ payload }) {
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }
  const bulletin_address_request = MG.genBulletinAddressRequest(payload.page)
  yield call(SendMessage, { msg: bulletin_address_request })
}

function* RequestReplyBulletin({ payload }) {
  yield put(setDisplayBulletinReplyList({ List: [], Page: 1, TotalPage: 1 }))
  const connect_status = yield select(state => state.Messenger.MessengerConnStatus)
  if (!connect_status) {
    const display_bulletin = yield select(state => state.Messenger.DisplayBulletin)
    let reply_hash_list = yield call(() => dbAPI.getReplyHashListByBulletinHash(display_bulletin.hash, payload.page))
    let replys = yield call(() => dbAPI.getBulletinListByHash(reply_hash_list))
    let reply_count = yield call(() => dbAPI.getReplyCount(display_bulletin.hash))
    let total_page = calcTotalPage(reply_count, BulletinPageSize)
    yield put(setDisplayBulletinReplyList({ List: replys, Page: 1, TotalPage: total_page }))
  } else {
    const seed = yield select(state => state.User.Seed)
    if (!seed) {
      MG = null
      return
    }
    if (MG === null) {
      yield call(initMessageGenerator, seed)
    }
    const reply_bulletin_request = MG.genReplyBulletinRequest(payload.hash, payload.page)
    yield call(SendMessage, { msg: reply_bulletin_request })
  }
}

function* RequestTagBulletin({ payload }) {
  yield put(setTagBulletinList({ List: [], Page: 1, TotalPage: 1 }))
  const connect_status = yield select(state => state.Messenger.MessengerConnStatus)
  if (!connect_status) {
    let tag_ids = yield call(() => dbAPI.getTagIdListByName(payload.tag))
    let bulletin_hashes = yield call(() => dbAPI.getBulletinHashListByTagId(tag_ids, payload.page))
    let bulletins = yield call(() => dbAPI.getBulletinListByHash(bulletin_hashes))
    let total = yield call(() => dbAPI.getBulletinHashCountByTagId(tag_ids))
    let total_page = calcTotalPage(total, BulletinPageSize)
    yield put(setTagBulletinList({ List: bulletins, Page: 1, TotalPage: total_page }))
  } else {
    const seed = yield select(state => state.User.Seed)
    if (!seed) {
      MG = null
      return
    }
    if (MG === null) {
      yield call(initMessageGenerator, seed)
    }
    const tag_bulletin_request = MG.genTagBulletinRequest(payload.tag, payload.page)
    yield call(SendMessage, { msg: tag_bulletin_request })
  }
}

// Publish
function* PublishBulletin(action) {
  const address = yield select(state => state.User.Address)
  const seed = yield select(state => state.User.Seed)
  const tag = yield select(state => state.Messenger.PublishTagList)
  const quote = yield select(state => state.Messenger.PublishQuoteList)
  const file = yield select(state => state.Messenger.PublishFileList)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }
  const last_bulletin = yield call(() => dbAPI.getLastBulletin(address))
  let bulletin_json
  let timestamp = Date.now()
  if (last_bulletin === null) {
    bulletin_json = MG.genBulletinJson(1, GenesisHash, tag, quote, file, action.payload.content, timestamp)
  } else {
    bulletin_json = MG.genBulletinJson(last_bulletin.sequence + 1, last_bulletin.hash, tag, quote, file, action.payload.content, timestamp)
  }
  let bulletin_json_hash = QuarterSHA512Message(bulletin_json)
  let result = yield call(() => dbAPI.addBulletin(bulletin_json_hash, address, bulletin_json.Sequence, bulletin_json.PreHash, bulletin_json.Content, bulletin_json, bulletin_json.Timestamp))
  if (result) {
    if (bulletin_json.Tag) {
      yield call(() => dbAPI.addTagsToBulletin(bulletin_json_hash, bulletin_json.Timestamp, bulletin_json.Tag))
    }
    if (bulletin_json.Quote) {
      yield call(() => dbAPI.addReplyToBulletins(bulletin_json.Quote, bulletin_json_hash, bulletin_json.Timestamp))
    }
    if (bulletin_json.File) {
      yield call(() => dbAPI.addFilesToBulletin(bulletin_json_hash, bulletin_json.File))
    }
  }
  yield put(setCurrentBulletinSequence(bulletin_json.Sequence))
  yield put(setPublishTagList([]))
  yield put(setPublishQuoteList([]))
  yield put(setPublishFileList([]))
  yield call(LoadMineBulletin, { payload: { page: 1 } })
  yield call(SendMessage, { msg: JSON.stringify(bulletin_json) })
}

function* BulletinTagAdd({ payload }) {
  const old_list = yield select(state => state.Messenger.PublishTagList)
  for (let i = 0; i < old_list.length; i++) {
    const tag = old_list[i]
    if (tag === payload.Tag) {
      return
    }
  }
  const new_list = [...old_list, payload.Tag]
  if (new_list.length > 8) {
    new_list.shift()
  }
  yield put(setPublishTagList(new_list))
}

function* BulletinTagDel({ payload }) {
  const old_list = yield select(state => state.Messenger.PublishTagList)
  let new_list = [...old_list]
  new_list = new_list.filter(t => t != payload.Tag)
  yield put(setPublishTagList(new_list))
}

function* BulletinQuoteAdd({ payload }) {
  const old_list = yield select(state => state.Messenger.PublishQuoteList)
  for (let i = 0; i < old_list.length; i++) {
    const quote = old_list[i]
    if (quote.Hash === payload.Hash) {
      return
    }
  }
  const new_list = [...old_list, payload]
  if (new_list.length > 8) {
    new_list.shift()
  }
  yield put(setPublishQuoteList(new_list))
}

function* BulletinQuoteDel({ payload }) {
  const old_list = yield select(state => state.Messenger.PublishQuoteList)
  let new_list = [...old_list]
  new_list = new_list.filter(q => q.Hash != payload.Hash)
  yield put(setPublishQuoteList(new_list))
}

function* BulletinReply({ payload }) {
  yield call(BulletinQuoteAdd, { payload: payload })
  yield put(setPublishFlag(true))
}

function* BulletinQuote({ payload }) {
  yield call(BulletinQuoteAdd, { payload: payload })
  yield put(setFlashNoticeMessage({ message: 'quote success', duration: 3000 }))
}

function* saveLocalFile(hash, content) {
  const base_dir = yield select(state => state.Common.AppBaseDir)
  const file_dir = yield call(() => path.join(base_dir, FileDir, hash.substring(0, 3), hash.substring(3, 6)))
  yield call(() => mkdir(file_dir, { recursive: true }))
  const save_file_path = yield call(() => path.join(file_dir, hash))
  yield call(() => writeFile(save_file_path, content))
}

function* BulletinFileAdd({ payload }) {
  const file_path = payload.file_path
  const fileNameWithExt = yield call(() => path.basename(file_path))
  const ext = yield call(() => path.extname(fileNameWithExt))
  const name = yield call(() => path.basename(fileNameWithExt, ext))
  const file_info = yield call(() => stat(file_path))
  if (file_info.size > FileMaxSize) {
    yield put(setFlashNoticeMessage({ message: `file size too large(more than ${filesize_format(FileMaxSize)})...`, duration: 3000 }))
  } else {
    const content = yield call(() => readFile(file_path))
    const hash = FileHash(content)

    let chunk_length = Math.ceil(file_info.size / FileChunkSize)
    let file = yield call(() => dbAPI.getFileByHash(hash))
    if (file === null) {
      yield call(() => saveLocalFile(hash, content))
      yield call(() => dbAPI.addFile(hash, file_info.size, Date.now(), chunk_length, chunk_length, true))
    } else {
      yield call(() => saveLocalFile(hash, content))
      yield call(() => dbAPI.localFileSaved(hash, chunk_length, Date.now()))
    }

    let new_file = {
      Name: name,
      Ext: ext,
      Size: file_info.size,
      Hash: hash
    }
    const old_list = yield select(state => state.Messenger.PublishFileList)
    for (let i = 0; i < old_list.length; i++) {
      const file = old_list[i]
      if (file.hash === new_file.Hash) {
        return
      }
    }
    const new_list = [...old_list, new_file]
    if (new_list.length > 8) {
      new_list.shift()
    }
    yield put(setPublishFileList(new_list))
  }
}

function* BulletinFileDel({ payload }) {
  const old_list = yield select(state => state.Messenger.PublishFileList)
  console.log(payload)
  let new_list = [...old_list]
  new_list = new_list.filter(f => f.Hash != payload.Hash)
  yield put(setPublishFileList(new_list))
}

function* BulletinMarkToggle({ payload }) {
  const bulletin_db = yield call(() => dbAPI.getBulletinByHash(payload.hash))
  if (bulletin_db !== null) {
    yield call(() => dbAPI.toggleBulletinMark(payload.hash, !bulletin_db.is_marked))
  }
}

// channel
function* ComposeSpeakerAdd({ payload }) {
  const address = yield select(state => state.User.Address)
  const old_list = yield select(state => state.Messenger.ComposeSpeakerList)
  let new_list = [...old_list]
  new_list = new_list.filter(speaker => speaker !== payload.address)
  new_list.unshift(payload.address)
  if (new_list.length > MaxSpeaker) {
    new_list = new_list.slice(0, MaxSpeaker)
  }
  yield put(setComposeSpeakerList(new_list))
}

function* ComposeSpeakerDel({ payload }) {
  const old_list = yield select(state => state.Messenger.ComposeSpeakerList)
  let new_list = [...old_list]
  new_list = new_list.filter(speaker => speaker !== payload.address)
  yield put(setComposeSpeakerList(new_list))
}

function* RefreshChannelMessageList({ payload }) {
  const CurrentChannel = yield select(state => state.Messenger.CurrentChannel)
  const bulletins = yield call(() => dbAPI.getBulletinListByAddresses(CurrentChannel.speaker, payload.page))
  const total = yield call(() => dbAPI.getBulletinCountByAddresses(CurrentChannel.speaker))
  const total_page = calcTotalPage(total, BulletinPageSize)
  yield put(setChannelBulletinList({ List: bulletins, Page: payload.page, TotalPage: total_page }))
}

function* CreateChannel(action) {
  const address = yield select(state => state.User.Address)
  const speaker = yield select(state => state.Messenger.ComposeSpeakerList)
  const db_channel = yield call(() => dbAPI.getChannelByName(address, action.payload.name))
  if (db_channel === null) {
    yield call(() => dbAPI.addChannel(address, action.payload.name, speaker, Date.now()))
  } else {
    yield call(() => dbAPI.updateChannel(address, action.payload.name, speaker, Date.now()))
  }
  yield put(setComposeSpeakerList([]))
  yield call(LoadChannelList)
}

function* DeleteChannel(action) {
  const address = yield select(state => state.User.Address)
  yield call(() => dbAPI.deleteChannel(address, action.payload.name))
  yield call(LoadChannelList)
}

export function* LoadChannelList() {
  const address = yield select(state => state.User.Address)
  const channel_list = yield call(() => dbAPI.getMyChannels(address))
  yield put(setChannelList(channel_list))
}

function* LoadCurrentChannel({ payload }) {
  yield put(setDisplayBulletinReplyList({ List: [], Page: 1, TotalPage: 1 }))
  const channel = { name: payload.name, speaker: payload.speaker, updated_at: payload.created_at }
  yield put(setCurrentChannel(channel))
  yield call(RefreshChannelMessageList, { payload: { page: 1 } })
}

export function* SubscribeChannel() {
  const address = yield select(state => state.User.Address)
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }
  const channel_list = yield call(() => dbAPI.getMyChannels(address))
  let subscribe_address_list = []
  for (let i = 0; i < channel_list.length; i++) {
    const channel = channel_list[i]
    subscribe_address_list = subscribe_address_list.concat(...channel.speaker)
  }
  subscribe_address_list = [...new Set(subscribe_address_list)]
  let subscribe_request = MG.genBulletinSubscribe(subscribe_address_list)
  yield call(SendMessage, { msg: JSON.stringify(subscribe_request) })
}

// session
export function* LoadSessionList() {
  const address = yield select(state => state.User.Address)
  if (!address) {
    return
  }
  // private
  let friend_list = yield call(() => dbAPI.getMyFriends(address))
  let session_list = []
  for (let i = 0; i < friend_list.length; i++) {
    const friend = friend_list[i]
    session_list.push({ type: SessionType.Private, address: friend.remote, updated_at: Date.now() })
  }
  // group
  let group_list = yield select(state => state.Messenger.GroupList)
  for (let i = 0; i < group_list.length; i++) {
    const group = group_list[i]
    let member = [...group.member]
    member.push(group.created_by)
    member = [...new Set(member)]
    if (member.includes(address)) {
      session_list.push({ type: SessionType.Group, hash: group.hash, name: group.name, member: member, updated_at: Date.now() })
    }
  }
  yield put(setSessionList(session_list))
}

function* SyncPrivateMessage({ payload }) {
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }

  let current_self_msg = yield call(() => dbAPI.getLastPrivateMessage(payload.local, payload.remote))
  let self_sequence = 0
  if (current_self_msg !== null) {
    self_sequence = current_self_msg.sequence
  }

  let current_pair_msg = yield call(() => dbAPI.getLastPrivateMessage(payload.remote, payload.local))
  let pair_sequence = 0
  if (current_pair_msg !== null) {
    pair_sequence = current_pair_msg.sequence
  }

  let private_sync_request = MG.genPrivateMessageSync(payload.remote, pair_sequence, self_sequence)
  yield call(SendMessage, { msg: private_sync_request })
}

function* InitHandshake(payload) {
  const self_seed = yield select(state => state.User.Seed)
  const self_address = yield select(state => state.User.Address)
  if (payload.pair_address === self_address) {
    return
  }
  let timestamp = Date.now()
  const ec = new Elliptic.ec('secp256k1')
  const ecdh_sk = HalfSHA512(GenesisHash + self_seed + self_address + payload.ecdh_sequence)
  const key_pair = ec.keyFromPrivate(ecdh_sk, 'hex')
  const ecdh_pk = key_pair.getPublic('hex')
  let self_json = MG.genECDHHandshake(DefaultPartition, payload.ecdh_sequence, ecdh_pk, '', payload.pair_address, timestamp)
  yield call(() => dbAPI.initHandshakeFromLocal(self_address, payload.pair_address, DefaultPartition, payload.ecdh_sequence, ecdh_sk, ecdh_pk, self_json))
  yield fork(SendMessage, { msg: JSON.stringify(self_json) })
}

function* LoadCurrentSession({ payload }) {
  const seed = yield select(state => state.User.Seed)
  const self_seed = yield select(state => state.User.Seed)
  const self_address = yield select(state => state.User.Address)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }
  let timestamp = Date.now()
  switch (payload.type) {
    case SessionType.Private:
      const pair_address = payload.address
      const ecdh_sequence = DHSequence(DefaultPartition, timestamp, self_address, pair_address)
      let session = { type: SessionType.Private, remote: pair_address, partition_sequence: ecdh_sequence }

      let ecdh = yield call(() => dbAPI.getHandshake(self_address, pair_address, DefaultPartition, ecdh_sequence))
      if (ecdh === null) {
        yield call(InitHandshake, { ecdh_sequence: ecdh_sequence, pair_address: pair_address })
      } else {
        if (ecdh.aes_key !== null) {
          // aes ready, handsake already done, ready to chat
          session.aes_key = ecdh.aes_key
          yield call(SyncPrivateMessage, { payload: { local: self_address, remote: pair_address } })
        } else {
          // my-sk-pk exist, aes not ready
          // send self-not-ready-json
          yield fork(SendMessage, { msg: JSON.stringify(ecdh.self_json) })
        }
      }

      let current_msg = yield call(() => dbAPI.getLastPrivateMessage(self_address, pair_address))
      if (current_msg !== null) {
        session.current_sequence = current_msg.sequence
        session.current_hash = current_msg.hash
      } else {
        session.current_sequence = 0
        session.current_hash = GenesisHash
      }
      yield put(setCurrentSession(session))

      yield call(RefreshPrivateMessageList)
      break
    case SessionType.Group:
      let group_session = { type: SessionType.Group, hash: payload.hash, name: payload.name, member: payload.member, updated_at: payload.updated_at }
      if (group_session.member.includes(self_address)) {
        let current_group_msg = yield call(() => dbAPI.getMemberLastGroupMessage(payload.hash, self_address))
        if (current_group_msg !== null) {
          group_session.current_sequence = current_group_msg.sequence
          group_session.current_hash = current_group_msg.hash
        } else {
          group_session.current_sequence = 0
          group_session.current_hash = GenesisHash
        }
        yield put(setCurrentSession(group_session))
        yield call(RefreshGroupMessageList)
        yield call(RequestGroupMessageSync, { payload: { hash: group_session.hash } })
      }
      break
    default:
      break
  }
}

// message
function* SendContent({ payload }) {
  console.log(payload)
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }
  let timestamp = Date.now()
  const self_address = yield select(state => state.User.Address)
  const CurrentSession = yield select(state => state.Messenger.CurrentSession)
  console.log(CurrentSession)
  console.log(CurrentSession)
  switch (CurrentSession.type) {
    case SessionType.Private:
      if (CurrentSession.aes_key !== undefined) {
        let content = AesEncrypt(payload.content, CurrentSession.aes_key)

        let last_confirmed_msg = yield call(() => dbAPI.getLastConfirmPrivateMessage(CurrentSession.remote, self_address))
        let last_unconfirmed_msg = yield call(() => dbAPI.getLastUnconfirmPrivateMessage(CurrentSession.remote, self_address))
        let to_confirm_msg = null

        if (last_unconfirmed_msg !== null && (last_confirmed_msg === null || last_unconfirmed_msg.sequence > last_confirmed_msg.sequence)) {
          to_confirm_msg = {
            Sequence: last_unconfirmed_msg.sequence,
            Hash: last_unconfirmed_msg.hash
          }
        }

        if (to_confirm_msg !== null) {
          yield call(() => dbAPI.confirmPrivateMessage(to_confirm_msg.Hash))
        }

        let msg_json = MG.genPrivateMessage(CurrentSession.current_sequence + 1, CurrentSession.current_hash, to_confirm_msg, content, CurrentSession.remote, timestamp)
        let hash = QuarterSHA512Message(msg_json)
        yield call(() => dbAPI.addPrivateMessage(hash, self_address, CurrentSession.remote, CurrentSession.current_sequence + 1, CurrentSession.current_hash, payload.content, msg_json, timestamp, false, false, true, typeof payload.content === 'object'))

        let tmp_session = { ...CurrentSession }
        tmp_session.current_sequence = CurrentSession.current_sequence + 1
        tmp_session.current_hash = hash
        yield put(setCurrentSession(tmp_session))

        yield call(RefreshPrivateMessageList)

        yield call(SendMessage, { msg: JSON.stringify(msg_json) })
      } else {
        ConsoleError('aeskey not ready...')
      }
      break
    case SessionType.Group:
      let last_confirmed_group_msg = yield call(() => dbAPI.getLastConfirmGroupMessage(CurrentSession.hash, self_address))
      let last_unconfirm_message_group_list = yield call(() => dbAPI.getLastUnconfirmGroupMessage(CurrentSession.hash, self_address))
      let to_confirm_group_msg = null

      if (last_unconfirm_message_group_list !== null && (last_confirmed_group_msg === null || last_unconfirm_message_group_list.sequence > last_confirmed_group_msg.sequence)) {
        to_confirm_group_msg = {
          Address: last_unconfirm_message_group_list.address,
          Sequence: last_unconfirm_message_group_list.sequence,
          Hash: last_unconfirm_message_group_list.hash
        }
      }

      if (to_confirm_group_msg !== null) {
        yield call(() => dbAPI.confirmGroupMessage(to_confirm_group_msg.Hash))
      }

      let group_msg_json = MG.genGroupMessage(CurrentSession.hash, CurrentSession.current_sequence + 1, CurrentSession.current_hash, to_confirm_group_msg, payload.content, timestamp)
      let group_msg_hash = QuarterSHA512Message(group_msg_json)
      if (typeof payload.content === 'object') {
        if (payload.content.ObjectType === MessageObjectType.GroupChatFile) {
          let chunk_length = Math.ceil(payload.content.Size / FileChunkSize)
          let file = yield call(() => dbAPI.getFileByHash(payload.content.Hash))
          if (file === null) {
            yield call(() => dbAPI.addFile(payload.content.Hash, payload.content.Size, Date.now(), chunk_length, 0, false))
          }

          const ehash = GroupFileEHash(CurrentSession.hash, payload.content.Hash)
          let group_chat_file = yield call(() => dbAPI.getFileByHash(ehash))
          if (group_chat_file === null) {
            yield call(() => dbAPI.addGroupFile(ehash, CurrentSession.hash, payload.content.Hash, payload.content.Size))
          }
        }
      }
      yield call(() => dbAPI.addGroupMessage(group_msg_hash, CurrentSession.hash, self_address, CurrentSession.current_sequence + 1, CurrentSession.current_hash, payload.content, group_msg_json, group_msg_json.Timestamp, false, false, true, typeof payload.content === 'object'))

      let tmp_group_session = { ...CurrentSession }
      tmp_group_session.current_sequence = CurrentSession.current_sequence + 1
      tmp_group_session.current_hash = group_msg_hash
      yield put(setCurrentSession(tmp_group_session))

      yield call(RefreshGroupMessageList)
      for (let i = 0; i < tmp_group_session.member.length; i++) {
        const member = tmp_group_session.member[i]
        let tmp_msg_json = JSON.parse(JSON.stringify(group_msg_json))
        if (member !== self_address) {
          const ecdh_sequence = DHSequence(DefaultPartition, timestamp, self_address, member)
          let ecdh = yield call(() => dbAPI.getHandshake(self_address, member, DefaultPartition, ecdh_sequence))
          if (ecdh === null) {
            yield call(InitHandshake, { ecdh_sequence: ecdh_sequence, pair_address: member })
          } else if (ecdh.aes_key === null) {
            yield fork(SendMessage, { msg: JSON.stringify(ecdh.self_json) })
          } else {
            let encrypt_content = AesEncrypt(tmp_msg_json.Content, ecdh.aes_key)
            tmp_msg_json.Content = encrypt_content
            delete tmp_msg_json["ObjectType"]
            delete tmp_msg_json["GroupHash"]
            let group_msg_list_json = {
              ObjectType: ObjectType.GroupMessageList,
              GroupHash: CurrentSession.hash,
              To: member,
              Timestamp: timestamp,
              PublicKey: MG.PublicKey,
              List: [tmp_msg_json]
            }
            yield call(SendMessage, { msg: JSON.stringify(group_msg_list_json) })
          }
        }
      }
      break
    default:
      break
  }
}

function* SendFile({ payload }) {
  const self_address = yield select(state => state.User.Address)
  const CurrentSession = yield select(state => state.Messenger.CurrentSession)

  const file_path = payload.file_path
  const fileNameWithExt = yield call(() => path.basename(file_path))
  const ext = yield call(() => path.extname(fileNameWithExt))
  const name = yield call(() => path.basename(fileNameWithExt, ext))
  const file_info = yield call(() => stat(file_path))
  if (file_info.size > FileMaxSize) {
    yield put(setFlashNoticeMessage({ message: `file size too large(more than ${filesize_format(FileMaxSize)})...`, duration: 3000 }))
  } else {
    if (CurrentSession.type === SessionType.Private) {
      const content = yield call(() => readFile(file_path))
      const hash = FileHash(content)
      yield call(() => saveLocalFile(hash, content))
      const ehash = PrivateFileEHash(self_address, CurrentSession.remote, hash)

      let chunk_length = Math.ceil(file_info.size / FileChunkSize)
      let file = yield call(() => dbAPI.getFileByHash(hash))
      if (file === null) {
        yield call(() => dbAPI.addFile(hash, file_info.size, Date.now(), chunk_length, chunk_length, true))
      } else {
        yield call(() => dbAPI.localFileSaved(hash, chunk_length, Date.now()))
      }

      let private_chat_file = yield call(() => dbAPI.getPrivateFileByEHash(ehash))
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
      const content = yield call(() => readFile(file_path))
      const hash = FileHash(content)
      yield call(() => saveLocalFile(hash, content))
      const ehash = GroupFileEHash(CurrentSession.hash, hash)

      let chunk_length = Math.ceil(file_info.size / FileChunkSize)
      let file = yield call(() => dbAPI.getFileByHash(hash))
      if (file === null) {
        yield call(() => dbAPI.addFile(hash, file_info.size, Date.now(), chunk_length, chunk_cursor, true))
      } else {
        yield call(() => dbAPI.localFileSaved(hash, chunk_length, Date.now()))
      }

      let group_chat_file = yield call(() => dbAPI.getGroupFileByEHash(ehash))
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
  }
}

// private chat
function* RefreshPrivateMessageList() {
  const self_address = yield select(state => state.User.Address)
  const CurrentSession = yield select(state => state.Messenger.CurrentSession)
  let current_msg_list = yield call(() => dbAPI.getPrivateSession(self_address, CurrentSession.remote))
  yield put(setCurrentSessionMessageList(current_msg_list))
}

function* ShowForwardBulletin({ payload }) {
  yield put(setForwardBulletin(payload))
  yield put(setForwardFlag(true))
}

function* ForwardBulletin({ payload }) {
  yield put(setForwardFlag(false))
  yield call(LoadCurrentSession, { payload: payload.session })
  const forward_bulletin = yield select(state => state.Messenger.ForwardBulletin)
  yield call(SendContent, {
    payload: {
      content: forward_bulletin
    }
  })
  yield put(setFlashNoticeMessage({ message: `bulletin forward success`, duration: 3000 }))
}

// group
function* ComposeMemberAdd({ payload }) {
  const address = yield select(state => state.User.Address)
  const old_list = yield select(state => state.Messenger.ComposeMemberList)
  let new_list = [...old_list]
  new_list = new_list.filter(member => member != payload.address)
  new_list.unshift(payload.address)
  new_list = new_list.filter(member => member !== address)
  if (new_list.length > MaxMember) {
    new_list = new_list.slice(0, MaxMember)
  }
  yield put(setComposeMemberList(new_list))
}

function* ComposeMemberDel({ payload }) {
  const old_list = yield select(state => state.Messenger.ComposeMemberList)
  let new_list = [...old_list]
  new_list = new_list.filter(member => member != payload.address)
  yield put(setComposeMemberList(new_list))
}

function* RefreshGroupMessageList() {
  const CurrentSession = yield select(state => state.Messenger.CurrentSession)
  let current_msg_list = yield call(() => dbAPI.getGroupSession(CurrentSession.hash))
  yield put(setCurrentSessionMessageList(current_msg_list))
}

function* RequestGroupMessageSync({ payload }) {
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }

  let latest_msg = yield call(() => dbAPI.getLastGroupMessage(payload.hash))
  if (latest_msg) {
    const group_message_sync_request = MG.genGroupMessageSync(payload.hash, latest_msg.address, latest_msg.sequence)
    yield call(SendMessage, { msg: JSON.stringify(group_message_sync_request) })
  } else {
    const address = yield select(state => state.User.Address)
    const group_message_sync_request = MG.genGroupMessageSync(payload.hash, address, 0)
    yield call(SendMessage, { msg: JSON.stringify(group_message_sync_request) })
  }
}

function* CreateGroup(action) {
  const seed = yield select(state => state.User.Seed)
  const address = yield select(state => state.User.Address)
  const member = yield select(state => state.Messenger.ComposeMemberList)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }

  let hash = QuarterSHA512Message({ created_by: address, Member: member, Random: Math.random() })
  let json = MG.genGroupCreate(hash, action.payload.name, member)
  let result = yield call(() => dbAPI.createGroup(json.Hash, action.payload.name, address, json.Member, json.Timestamp, json, true))
  if (result) {
    let group_response = {
      ObjectType: ObjectType.GroupList,
      List: [json]
    }
    yield call(EnqueueMessage, { payload: { msg: JSON.stringify(group_response) } })
    yield call(LoadSessionList)
    yield call(LoadGroupList)
  }
  yield put(setComposeMemberList([]))
}

function* DeleteGroup(action) {
  const seed = yield select(state => state.User.Seed)
  const address = yield select(state => state.User.Address)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }
  const group = yield call(() => dbAPI.getGroupByHash(action.payload.hash))
  if (group !== null && group.created_by === address && group.delete_json === undefined) {
    let json = MG.genGroupDelete(action.payload.hash)
    let result = yield call(() => dbAPI.updateGroupDelete(action.payload.hash, json))
    if (result > 0) {
      let group_response = {
        ObjectType: ObjectType.GroupList,
        List: [json]
      }
      yield call(EnqueueMessage, { payload: { msg: JSON.stringify(group_response) } })
      yield call(LoadSessionList)
      yield call(LoadGroupList)
    }
  }
}

function* GroupSync() {
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }
  const group_sync_request = MG.genGroupSync()
  yield call(EnqueueMessage, { payload: { msg: JSON.stringify(group_sync_request) } })
}

export function* LoadGroupList() {
  const address = yield select(state => state.User.Address)
  let group_list = yield call(() => dbAPI.getGroups())
  group_list = group_list.filter(g => g.is_accepted === true && (g.created_by === address || g.member.includes(address)))

  let group_member_map = {}
  for (let i = 0; i < group_list.length; i++) {
    const group = group_list[i]
    group_member_map[group.hash] = group.member
    group_member_map[group.hash].push(group.created_by)
  }
  yield put(setGroupList({ group_list: group_list, group_member_map: group_member_map }))

  let total_member = []
  for (let i = 0; i < group_list.length; i++) {
    const group = group_list[i]
    total_member.push(group.created_by)
    total_member = [].concat(total_member, group.member)
    total_member = total_member.filter(a => a !== address)
    total_member = [...new Set(total_member)]
  }
  yield put(setTotalGroupMemberList(total_member))
}

export function* LoadGroupRequestList() {
  const address = yield select(state => state.User.Address)
  let group_list = yield call(() => dbAPI.getGroups())
  group_list = group_list.filter(g => g.is_accepted === false && (g.created_by === address || g.member.includes(address)))
  yield put(setGroupRequestList(group_list))
}

function* AcceptGroupRequest({ payload }) {
  const address = yield select(state => state.User.Address)
  let group_request = yield call(() => dbAPI.getGroupByHash(payload.hash))
  if (group_request !== null && group_request.is_accepted === false && (group_request.created_by === address || group_request.member.includes(address))) {
    yield call(() => dbAPI.acceptGroupRequest(payload.hash))
    yield call(LoadGroupRequestList)
    yield call(LoadGroupList)
  }
}

export function* watchMessenger() {
  yield takeEvery('ConnectSwitch', ConnectSwitch)
  yield takeEvery('DisConnectSwitch', DisconnectSwitch)

  yield takeLatest('LoadServerList', LoadServerList)
  yield takeLatest('ServerAdd', ServerAdd)
  yield takeLatest('ServerDel', ServerDel)
  yield takeLatest('ServerUse', ServerUse)

  yield takeEvery('LoadMineBulletin', LoadMineBulletin)
  yield takeEvery('LoadFollowBulletin', LoadFollowBulletin)
  yield takeEvery('LoadBookmarkBulletin', LoadBookmarkBulletin)
  yield takeLatest('LoadBulletin', LoadBulletin)
  yield takeLatest('RequestRandomBulletin', RequestRandomBulletin)
  yield takeLatest('RequestBulletinAddress', RequestBulletinAddress)
  yield takeLatest('RequestReplyBulletin', RequestReplyBulletin)
  yield takeLatest('RequestTagBulletin', RequestTagBulletin)

  // avatar
  yield takeLatest('CheckAvatar', CheckAvatar)
  yield takeLatest('SaveSelfAvatar', SaveSelfAvatar)

  // file
  yield takeLatest('FetchBulletinFile', FetchBulletinFile)
  yield takeLatest('SaveBulletinFile', SaveBulletinFile)
  yield takeLatest('FetchPrivateChatFile', FetchPrivateChatFile)
  yield takeLatest('FetchGroupChatFile', FetchGroupChatFile)
  yield takeLatest('FetchChatFile', FetchChatFile)
  yield takeLatest('SaveChatFile', SaveChatFile)

  // bulletin publish
  yield takeLatest('PublishBulletin', PublishBulletin)
  yield takeLatest('BulletinTagAdd', BulletinTagAdd)
  yield takeLatest('BulletinTagDel', BulletinTagDel)
  yield takeLatest('BulletinQuoteAdd', BulletinQuoteAdd)
  yield takeLatest('BulletinQuoteDel', BulletinQuoteDel)
  yield takeLatest('BulletinFileAdd', BulletinFileAdd)
  yield takeLatest('BulletinFileDel', BulletinFileDel)
  yield takeLatest('BulletinReply', BulletinReply)
  yield takeLatest('BulletinQuote', BulletinQuote)

  yield takeLatest('BulletinMarkToggle', BulletinMarkToggle)

  // channel
  yield takeLatest('ComposeSpeakerAdd', ComposeSpeakerAdd)
  yield takeLatest('ComposeSpeakerDel', ComposeSpeakerDel)
  yield takeLatest('CreateChannel', CreateChannel)
  yield takeLatest('DeleteChannel', DeleteChannel)
  yield takeLatest('LoadChannelList', LoadChannelList)
  yield takeLatest('LoadCurrentChannel', LoadCurrentChannel)
  yield takeLatest('RefreshChannelMessageList', RefreshChannelMessageList)

  // session
  yield takeLatest('LoadSessionList', LoadSessionList)
  yield takeLatest('LoadCurrentSession', LoadCurrentSession)
  yield takeLatest('SendFile', SendFile)

  // chat
  yield takeLatest('SendContent', SendContent)
  yield takeLatest('ShowForwardBulletin', ShowForwardBulletin)
  yield takeLatest('ForwardBulletin', ForwardBulletin)

  // group
  yield takeLatest('ComposeMemberAdd', ComposeMemberAdd)
  yield takeLatest('ComposeMemberDel', ComposeMemberDel)
  yield takeLatest('CreateGroup', CreateGroup)
  yield takeLatest('DeleteGroup', DeleteGroup)
  yield takeLatest('AcceptGroupRequest', AcceptGroupRequest)
}