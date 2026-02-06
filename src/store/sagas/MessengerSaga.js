import { Buffer } from 'buffer'
import Elliptic from 'elliptic'
import * as rippleKeyPairs from 'ripple-keypairs'
import Dexie from 'dexie'
import * as path from '@tauri-apps/api/path'
import { open, readFile, writeFile, remove, mkdir, stat, SeekMode } from '@tauri-apps/plugin-fs'
import { call, delay, put, select, fork, takeEvery, takeLatest } from 'redux-saga/effects'
import { eventChannel, END } from 'redux-saga'
import { checkAvatarRequestSchema, checkBulletinRequestSchema, checkBulletinSchema, checkECDHHandshakeSchema, checkPrivateMessageSchema, checkFileRequestSchema, checkMessageObjectSchema, deriveJson, checkGroupSyncSchema, checkGroupListSchema, checkGroupMessageListSchema, checkPrivateMessageSyncSchema, checkGroupMessageSyncSchema } from '../../lib/MessageSchemaVerifier'
import MessageGenerator from '../../lib/MessageGenerator'
import { ActionCode, FileRequestType, GenesisHash, ObjectType, MessageObjectType, Epoch } from '../../lib/MessengerConst'
import { BulletinPageSize, CommonDBSchame, Day, DefaultPartition, DefaultServer, FileChunkSize, FileMaxSize, Hour, MaxMember, MaxSpeaker, Minute, SessionType } from '../../lib/AppConst'
import { setBulletinAddressList, setChannelList, setComposeMemberList, setComposeSpeakerList, setCurrentBulletinSequence, setCurrentChannel, setCurrentChannelBulletinList, setPublishFileList, setPublishQuoteList, setCurrentSession, setCurrentSessionMessageList, setFollowBulletinList, setForwardBulletin, setForwardFlag, setGroupList, setGroupRequestList, setMineBulletinList, setPublishFlag, setRandomBulletin, setSessionList, setTotalGroupMemberList, updateMessengerConnStatus, setPublishTagList, setDisplayBulletin, setDisplayBulletinReplyList, setTagBulletinList, setServerList, setCurrentServer, setBookmarkBulletinList } from '../slices/MessengerSlice'
import { AesDecrypt, AesDecryptBuffer, AesEncrypt, AesEncryptBuffer, ConsoleError, ConsoleWarn, filesize_format, genAESKey, HalfSHA512, QuarterSHA512Message, safeAddItem } from '../../lib/AppUtil'
import { BlobToUint32, calcTotalPage, DHSequence, PrivateFileEHash, FileHash, genNonce, GroupFileEHash, Uint32ToBuffer, VerifyJsonSignature, getMemberIndex, getMemberByIndex } from '../../lib/MessengerUtil'
import { setFlashNoticeMessage } from '../slices/UserSlice'

let CommonDB = null

function initCommonDB() {
  CommonDB = new Dexie('Common')
  CommonDB.version(1).stores(CommonDBSchame)
}

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
                const avatar_dir = await path.join(base_dir, `avatar`)
                mkdir(avatar_dir, { recursive: true })
                let avatar_path = `${avatar_dir}/${request.Address}.png`
                await writeFile(avatar_path, content)
                await CommonDB.Avatars
                  .where('Address')
                  .equals(request.Address)
                  .modify(a => {
                    a.IsSaved = true
                    a.UpdatedAt = Date.now()
                  })
              }
            } else if (request.Type === FileRequestType.File) {
              let content = event.data.slice(4)
              content = await content.arrayBuffer()
              content = Buffer.from(content)
              const file_dir = await path.join(base_dir, `file`, request.Hash.substring(0, 3), request.Hash.substring(3, 6))
              mkdir(file_dir, { recursive: true })
              let file_path = await path.join(file_dir, request.Hash)
              let file = await CommonDB.Files
                .where('Hash')
                .equals(request.Hash)
                .first()
              if (file.ChunkCursor < file.ChunkLength && file.ChunkCursor + 1 === request.ChunkCursor) {
                await writeFile(file_path, content, { append: true })
                FileRequestList = FileRequestList.filter(r => r.Nonce !== request.Nonce)
                let current_chunk_cursor = file.ChunkCursor + 1
                await CommonDB.Files
                  .where('Hash')
                  .equals(request.Hash)
                  .modify(tmp => {
                    tmp.ChunkCursor = current_chunk_cursor
                    tmp.UpdatedAt = Date.now()
                  })
                if (current_chunk_cursor < file.ChunkLength) {
                  emit({ type: 'FetchBulletinFile', payload: { hash: request.Hash } })
                } else {
                  let hash = FileHash(await readFile(file_path))
                  if (hash === request.Hash) {
                    await CommonDB.Files
                      .where('Hash')
                      .equals(request.Hash)
                      .modify(tmp => {
                        tmp.IsSaved = true
                      })
                  } else {
                    await remove(file_path)
                    await CommonDB.Files
                      .where('Hash')
                      .equals(request.Hash)
                      .modify(tmp => {
                        tmp.ChunkCursor = 0
                        tmp.UpdatedAt = Date.now()
                      })
                    emit({ type: 'FetchBulletinFile', payload: { hash: request.Hash } })
                  }
                }
              }
            } else if (request.Type === FileRequestType.PrivateChatFile) {
              let content = event.data.slice(4)
              content = await content.arrayBuffer()
              content = Buffer.from(content)
              const file_dir = await path.join(base_dir, `file`, request.Hash.substring(0, 3), request.Hash.substring(3, 6))
              mkdir(file_dir, { recursive: true })
              let chat_file_path = await path.join(file_dir, request.Hash)
              let chat_file = await CommonDB.Files
                .where('Hash')
                .equals(request.Hash)
                .first()
              if (chat_file.ChunkCursor < chat_file.ChunkLength && chat_file.ChunkCursor + 1 === request.ChunkCursor) {
                const decrypted_content = AesDecryptBuffer(content, request.AesKey)
                await writeFile(chat_file_path, decrypted_content, { append: true })
                FileRequestList = FileRequestList.filter(r => r.Nonce !== request.Nonce)
                let current_chunk_cursor = chat_file.ChunkCursor + 1
                await CommonDB.Files
                  .where('Hash')
                  .equals(request.Hash)
                  .modify(tmp => {
                    tmp.ChunkCursor = current_chunk_cursor
                    tmp.UpdatedAt = Date.now()
                  })
                if (current_chunk_cursor < chat_file.ChunkLength) {
                  emit({ type: 'FetchPrivateChatFile', payload: { hash: request.Hash, size: request.Size, remote: request.Address } })
                } else {
                  let hash = FileHash(await readFile(chat_file_path))
                  if (hash === request.Hash) {
                    await CommonDB.Files
                      .where('Hash')
                      .equals(request.Hash)
                      .modify(tmp => {
                        tmp.IsSaved = true
                      })
                  } else {
                    await remove(chat_file_path)
                    await CommonDB.Files
                      .where('Hash')
                      .equals(request.Hash)
                      .modify(tmp => {
                        tmp.ChunkCursor = 0
                        tmp.UpdatedAt = Date.now()
                      })
                    emit({ type: 'FetchPrivateChatFile', payload: { hash: request.Hash, size: request.Size, remote: request.Address } })
                  }
                }
              }
            } else if (request.Type === FileRequestType.GroupChatFile) {
              const index = await BlobToUint32(event.data.slice(4, 8))
              const from = getMemberByIndex(request.GroupMember, index)
              const ecdh_sequence = DHSequence(DefaultPartition, Date.now(), request.SelfAddress, from)
              let ecdh = await CommonDB.ECDHS
                .where({ SelfAddress: request.SelfAddress, PairAddress: from, Partition: DefaultPartition, Sequence: ecdh_sequence })
                .first()
              if (ecdh !== undefined && ecdh.AesKey !== undefined) {
                const file_dir = await path.join(base_dir, `file`, request.Hash.substring(0, 3), request.Hash.substring(3, 6))
                mkdir(file_dir, { recursive: true })
                let chat_file_path = await path.join(file_dir, request.Hash)
                let chat_file = await CommonDB.Files
                  .where('Hash')
                  .equals(request.Hash)
                  .first()
                if (chat_file.ChunkCursor < chat_file.ChunkLength && chat_file.ChunkCursor + 1 === request.ChunkCursor) {
                  let content = event.data.slice(8)
                  content = await content.arrayBuffer()
                  content = Buffer.from(content)
                  const decrypted_content = AesDecryptBuffer(content, ecdh.AesKey)
                  await writeFile(chat_file_path, decrypted_content, { append: true })
                  FileRequestList = FileRequestList.filter(r => r.Nonce !== request.Nonce)
                  await CommonDB.Files
                    .where('Hash')
                    .equals(request.Hash)
                    .modify(tmp => {
                      tmp.ChunkCursor = chat_file.ChunkCursor + 1
                      tmp.UpdatedAt = Date.now()
                    })
                }

                chat_file = await CommonDB.Files
                  .where('Hash')
                  .equals(request.Hash)
                  .first()
                if (chat_file.ChunkCursor < chat_file.ChunkLength) {
                  emit({ type: 'FetchGroupChatFile', payload: { hash: request.Hash, size: request.Size, group_hash: request.GroupHash } })
                } else {
                  let hash = FileHash(await readFile(chat_file_path))
                  if (hash === request.Hash) {
                    await CommonDB.Files
                      .where('Hash')
                      .equals(request.Hash)
                      .modify(tmp => {
                        tmp.IsSaved = true
                      })
                  } else {
                    await remove(chat_file_path)
                    await CommonDB.Files
                      .where('Hash')
                      .equals(request.Hash)
                      .modify(tmp => {
                        tmp.ChunkCursor = 0
                        tmp.UpdatedAt = Date.now()
                      })
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
  let bulletin_db = yield call(() => CommonDB.Bulletins
    .where({ Address: address, Sequence: bulletin_json.Sequence })
    .first())
  if (bulletin_db === undefined) {
    let tag = []
    if (bulletin_json.Tag) {
      tag = bulletin_json.Tag
    }
    let quote = []
    if (bulletin_json.Quote) {
      quote = bulletin_json.Quote
    }
    let file = []
    if (bulletin_json.File) {
      file = bulletin_json.File
      for (let i = 0; i < file.length; i++) {
        const f = file[i]
        console.log(f)
        let chunk_length = Math.ceil(f.Size / FileChunkSize)
        yield call(() => safeAddItem(CommonDB, 'Files', 'Hash', {
          Hash: f.Hash,
          Size: f.Size,
          ChunkLength: chunk_length,
          ChunkCursor: 0,
          IsSaved: false,
          UpdatedAt: Date.now()
        }))
        yield fork(FetchBulletinFile, { payload: { hash: f.Hash } })
      }
    }
    let new_bulletin = {
      Hash: QuarterSHA512Message(bulletin_json),
      Address: address,
      Sequence: bulletin_json.Sequence,
      Content: bulletin_json.Content,
      Tag: tag,
      Quote: quote,
      File: file,
      Json: bulletin_json,
      SignedAt: bulletin_json.Timestamp,
      PreHash: bulletin_json.PreHash,
      IsMark: false
    }
    let result = yield call(() => safeAddItem(CommonDB, 'Bulletins', 'Hash', new_bulletin))
    if (result && quote.length > 0) {
      for (let i = 0; i < quote.length; i++) {
        const q = quote[i]
        let q_db = yield call(() => CommonDB.BulletinReplys
          .where({ Hash: q.Hash, ReplyHash: new_bulletin.Hash })
          .first())
        if (q_db === undefined) {
          yield call(() => CommonDB.BulletinReplys.add({
            Hash: q.Hash,
            ReplyHash: new_bulletin.Hash,
            SignedAt: new_bulletin.SignedAt
          }))
        }
      }
    }
    return { result: true, bulletin: new_bulletin }
  } else {
    return { result: false, bulletin: bulletin_db }
  }
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
  if (CommonDB === null) {
    yield call(initCommonDB)
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
              let db_avatar = yield call(() => CommonDB.Avatars
                .where('Address')
                .equals(avatar.Address)
                .first())
              if (db_avatar !== undefined && db_avatar.SignedAt > avatar.SignedAt) {
                new_list.push(db_avatar.Json)
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
            let bulletin = yield call(() => CommonDB.Bulletins
              .where({ Address: json.Address, Sequence: json.Sequence })
              .first())
            if (bulletin) {
              yield call(SendMessage, { msg: JSON.stringify(bulletin.Json) })
            } else if (json.Address === address) {
              // pull self bulletin from server
              const last_bulletin = yield call(() => CommonDB.Bulletins
                .where('Address').equals(json.Address)
                .sortBy('Sequence')
                .then(records => records[records.length - 1]))
              if (last_bulletin === undefined) {
                if (json.Sequence > 1) {
                  let msg = MG.genBulletinRequest(address, 1, address)
                  yield call(EnqueueMessage, { payload: { msg: msg } })
                }
              } else if (last_bulletin.Sequence + 1 < json.Sequence) {
                let msg = MG.genBulletinRequest(address, last_bulletin.Sequence + 1, address)
                yield call(EnqueueMessage, { payload: { msg: msg } })
              }
            }
          }
          break
        case ActionCode.FileRequest:
          console.log(json.Hash)
          if (checkFileRequestSchema(json) && VerifyJsonSignature(json)) {
            if (json.FileType === FileRequestType.Avatar) {
              let avatar = yield call(() => CommonDB.Avatars
                .where('Hash')
                .equals(json.Hash)
                .first())
              if (avatar) {
                const base_dir = yield select(state => state.Common.AppBaseDir)
                const avatar_path = yield call(() => path.join(base_dir, `/avatar/${avatar.Address}.png`))
                const content = yield call(() => readFile(avatar_path))
                const nonce = Uint32ToBuffer(json.Nonce)
                yield call(SendMessage, { msg: Buffer.concat([nonce, content]) })
              }
            } else if (json.FileType === FileRequestType.File) {
              let file = yield call(() => CommonDB.Files
                .where('Hash')
                .equals(json.Hash)
                .first())
              if (file !== undefined && file.IsSaved && file.ChunkLength >= json.ChunkCursor) {
                const base_dir = yield select(state => state.Common.AppBaseDir)
                const file_path = yield call(() => path.join(base_dir, `File`, json.Hash.substring(0, 3), json.Hash.substring(3, 6), json.Hash))
                const nonce = Uint32ToBuffer(json.Nonce)
                if (file.Size <= FileChunkSize) {
                  const content = yield call(() => readFile(file_path))
                  yield call(SendMessage, { msg: Buffer.concat([nonce, content]) })
                } else {
                  const fileHandle = yield call(() => open(file_path, { read: true }))
                  try {
                    const start = (json.ChunkCursor - 1) * FileChunkSize
                    fileHandle.seek(start, SeekMode.Start)
                    const length = Math.min(FileChunkSize, file.Size - start)
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
              // console.log(json)
              let chat_file = yield call(() => CommonDB.PrivateChatFiles
                .where('EHash')
                .equals(json.Hash)
                .first())
              // console.log(chat_file)
              if (chat_file !== undefined) {
                let file = yield call(() => CommonDB.Files
                  .where('Hash')
                  .equals(chat_file.Hash)
                  .first())
                // console.log(file)
                if (file !== undefined && file.IsSaved && file.ChunkLength >= json.ChunkCursor) {
                  const base_dir = yield select(state => state.Common.AppBaseDir)
                  // console.log(base_dir)
                  const file_path = yield call(() => path.join(base_dir, `File`, file.Hash.substring(0, 3), file.Hash.substring(3, 6), file.Hash))
                  // console.log(file_path)
                  const nonce = Uint32ToBuffer(json.Nonce)
                  // console.log(nonce)
                  // console.log(file.Size)
                  // console.log(FileChunkSize)

                  if (file.Size <= FileChunkSize) {
                    const content = yield call(() => readFile(file_path))
                    const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, ob_address)
                    let ecdh = yield call(() => CommonDB.ECDHS
                      .where({ SelfAddress: address, PairAddress: ob_address, Partition: DefaultPartition, Sequence: ecdh_sequence })
                      .first())
                    // console.log(ecdh)
                    if (ecdh !== undefined && ecdh.AesKey !== undefined) {
                      const encrypted_content = AesEncryptBuffer(content, ecdh.AesKey)
                      // TODO222 encrypted_content
                      // console.log(content)
                      // console.log(encrypted_content)
                      yield call(SendMessage, { msg: Buffer.concat([nonce, encrypted_content]) })
                    }
                    yield call(SendMessage, { msg: Buffer.concat([nonce, content]) })
                  } else {
                    const fileHandle = yield call(() => open(file_path, { read: true }))
                    try {
                      const start = (json.ChunkCursor - 1) * FileChunkSize
                      fileHandle.seek(start, SeekMode.Start)
                      const length = Math.min(FileChunkSize, file.Size - start)
                      const buffer = new Uint8Array(length)
                      const bytesRead = yield call(() => fileHandle.read(buffer))
                      if (bytesRead > 0) {
                        const chunk = buffer.slice(0, bytesRead)
                        const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, ob_address)
                        let ecdh = yield call(() => CommonDB.ECDHS
                          .where({ SelfAddress: address, PairAddress: ob_address, Partition: DefaultPartition, Sequence: ecdh_sequence })
                          .first())
                        console.log(ecdh)
                        if (ecdh !== undefined && ecdh.AesKey !== undefined) {
                          const encrypted_chunk = AesEncryptBuffer(chunk, ecdh.AesKey)
                          // TODO222 encrypted_chunk
                          // console.log(chunk)
                          // console.log(encrypted_chunk)
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
                let chat_file = yield call(() => CommonDB.GroupChatFiles
                  .where('EHash')
                  .equals(json.Hash)
                  .first())
                if (chat_file !== undefined) {
                  let file = yield call(() => CommonDB.Files
                    .where('Hash')
                    .equals(chat_file.Hash)
                    .first())
                  if (file !== undefined && file.IsSaved && file.ChunkLength >= json.ChunkCursor) {
                    const base_dir = yield select(state => state.Common.AppBaseDir)
                    const file_path = yield call(() => path.join(base_dir, `File`, file.Hash.substring(0, 3), file.Hash.substring(3, 6), file.Hash))
                    const nonce = Uint32ToBuffer(json.Nonce)

                    if (file.Size <= FileChunkSize) {
                      const content = yield call(() => readFile(file_path))
                      const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, ob_address)
                      let ecdh = yield call(() => CommonDB.ECDHS
                        .where({ SelfAddress: address, PairAddress: ob_address, Partition: DefaultPartition, Sequence: ecdh_sequence })
                        .first())
                      if (ecdh !== undefined && ecdh.AesKey !== undefined) {
                        const encrypted_content = AesEncryptBuffer(content, ecdh.AesKey)
                        yield call(SendMessage, { msg: Buffer.concat([nonce, index_u32, encrypted_content]) })
                      }
                    } else {
                      const fileHandle = yield call(() => open(file_path, { read: true }))
                      try {
                        const start = (json.ChunkCursor - 1) * FileChunkSize
                        fileHandle.seek(start, SeekMode.Start)
                        const length = Math.min(FileChunkSize, file.Size - start)
                        const buffer = new Uint8Array(length)
                        const bytesRead = yield call(() => fileHandle.read(buffer))
                        if (bytesRead > 0) {
                          const chunk = buffer.slice(0, bytesRead)
                          const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, ob_address)
                          let ecdh = yield call(() => CommonDB.ECDHS
                            .where({ SelfAddress: address, PairAddress: ob_address, Partition: DefaultPartition, Sequence: ecdh_sequence })
                            .first())
                          if (ecdh !== undefined && ecdh.AesKey !== undefined) {
                            const encrypted_chunk = AesEncryptBuffer(chunk, ecdh.AesKey)
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
            // TODO PrivateMessageSync pair
            let msg_list = yield call(() => CommonDB.PrivateMessages
              .where({ Sour: address, Dest: ob_address })
              .reverse()
              .sortBy('Sequence')
            )
            console.log(msg_list)
            let unSyncMessageList = msg_list.filter(tmp => tmp.Sequence > json.PairSequence)
            console.log(unSyncMessageList)
            if (unSyncMessageList.length > 0) {
              for (let i = 0; i < unSyncMessageList.length; i++) {
                const msg = unSyncMessageList[i]
                yield call(SendMessage, { msg: JSON.stringify(msg.Json) })
              }
            }
          }
          break
        case ActionCode.GroupSync:
          if (checkGroupSyncSchema(json) && VerifyJsonSignature(json)) {
            let group_list = yield call(() => CommonDB.Groups
              .orderBy('CreatedAt')
              .reverse()
              .toArray())
            group_list = group_list.filter(g => g.IsAccepted === true)
            let tmp_list = []
            for (let i = 0; i < group_list.length; i++) {
              const group = group_list[i]
              if (group.DeleteJson !== undefined) {
                tmp_list.push(group.DeleteJson)
              } else {
                tmp_list.push(group.CreateJson)
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
            let group = yield call(() => CommonDB.Groups
              .where("Hash")
              .equals(json.Hash)
              .first())
            console.log(group)
            if (group === undefined) {
              yield call(GroupSync)
            } else if (group.IsAccepted === true && (group.CreatedBy === ob_address || group.Member.includes(ob_address))) {
              const ecdh_sequence = DHSequence(DefaultPartition, timestamp, address, ob_address)
              let ecdh = yield call(() => CommonDB.ECDHS
                .where({ SelfAddress: address, PairAddress: ob_address, Partition: DefaultPartition, Sequence: ecdh_sequence })
                .first())
              console.log(ecdh)
              if (ecdh === undefined && address !== ob_address) {
                yield call(InitHandshake, { ecdh_sequence: ecdh_sequence, pair_address: ob_address })
              } else if (ecdh.AesKey === undefined) {
                yield fork(SendMessage, { msg: JSON.stringify(ecdh.SelfJson) })
              } else {
                let tmp_msg_list = []
                if (json.Sequence === 0) {
                  tmp_msg_list = yield call(() => CommonDB.GroupMessages
                    .orderBy('SignedAt')
                    .filter((msg) => msg.GroupHash === json.Hash)
                    .limit(64)
                    .toArray())
                  console.log(tmp_msg_list)
                } else {
                  let current_msg = yield call(() => CommonDB.GroupMessages
                    .where({ GroupHash: json.Hash, Address: json.Address })
                    .filter((msg) => msg.Sequence === json.Sequence)
                    .first())
                  if (current_msg !== undefined) {
                    tmp_msg_list = yield call(() => CommonDB.GroupMessages
                      .orderBy('SignedAt')
                      .filter((msg) => msg.GroupHash === json.Hash && msg.SignedAt > current_msg.SignedAt)
                      .limit(64)
                      .toArray())
                  }
                  console.log(current_msg)
                  console.log(tmp_msg_list)
                }
                if (tmp_msg_list.length > 0) {
                  let list = []
                  for (let i = 0; i < tmp_msg_list.length; i++) {
                    const tmp_msg = tmp_msg_list[i]
                    let tmp_msg_json = tmp_msg.Json
                    let encrypt_content = AesEncrypt(tmp_msg_json.Content, ecdh.AesKey)
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
            let tmp = yield call(CacheBulletin, json)
            yield put(setRandomBulletin(tmp.bulletin))
            if (tmp.result) {
              let bulletin_request = MG.genBulletinRequest(ob_address, json.Sequence + 1, ob_address)
              yield call(EnqueueMessage, { payload: { msg: bulletin_request } })
            }
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
            replys.push(b.bulletin)
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
            tag_bulletin_list.push(b.bulletin)
          }
        }
        yield put(setTagBulletinList({ List: tag_bulletin_list, Page: json.Page, TotalPage: json.TotalPage }))
      } else if (json.ObjectType === ObjectType.AvatarList) {
        for (let i = 0; i < json.List.length; i++) {
          const avatar = json.List[i]
          if (VerifyJsonSignature(avatar)) {
            const avatar_address = rippleKeyPairs.deriveAddress(avatar.PublicKey)
            let db_avatar = yield call(() => CommonDB.Avatars
              .where('Address')
              .equals(avatar_address)
              .first())
            if (db_avatar !== undefined) {
              if (db_avatar.SignedAt < avatar.Timestamp) {
                yield call(() => CommonDB.Avatars
                  .where('Address')
                  .equals(avatar_address)
                  .modify(a => {
                    a.Hash = avatar.Hash
                    a.Size = avatar.Size
                    a.UpdatedAt = Date.now()
                    a.SignedAt = avatar.Timestamp
                    a.Json = avatar
                  }))
                if (db_avatar.Hash !== avatar.Hash) {
                  yield call(() => CommonDB.Avatars
                    .where('Address')
                    .equals(avatar_address)
                    .modify(a => {
                      a.IsSaved = false
                    }))
                  yield call(RequestAvatarFile, { address: avatar_address, hash: avatar.Hash })
                }
              }
            }
          }
        }
      } else if (json.ObjectType === ObjectType.ECDH) {
        let ob_address = rippleKeyPairs.deriveAddress(json.PublicKey)
        if (checkECDHHandshakeSchema(json)) {
          let friend = yield call(() => CommonDB.Friends
            .where('[Local+Remote]')
            .equals([address, ob_address])
            .first())
          // console.log(friend)
          const total_member_list = yield select(state => state.Messenger.TotalGroupMemberList)
          // console.log(total_member_list)
          if (friend !== undefined || total_member_list.includes(ob_address)) {
            let ecdh = yield call(() => CommonDB.ECDHS
              .where({ SelfAddress: address, PairAddress: ob_address, Partition: DefaultPartition, Sequence: json.Sequence })
              .first())
            if (ecdh === undefined) {
              const ec = new Elliptic.ec('secp256k1')
              const ecdh_sk = HalfSHA512(GenesisHash + seed + address + json.Sequence)
              const self_key_pair = ec.keyFromPrivate(ecdh_sk, 'hex')
              const ecdh_pk = self_key_pair.getPublic('hex')
              const self_json = MG.genECDHHandshake(DefaultPartition, json.Sequence, ecdh_pk, json.Self, ob_address, timestamp)
              const pair_key_pair = ec.keyFromPublic(json.Self, 'hex')
              const shared_key = self_key_pair.derive(pair_key_pair.getPublic()).toString('hex')
              const aes_key = genAESKey(shared_key, address, ob_address, json.Sequence)
              yield call(() => CommonDB.ECDHS.add({
                SelfAddress: address,
                PairAddress: ob_address,
                Partition: DefaultPartition,
                Sequence: json.Sequence,
                AesKey: aes_key,
                PrivateKey: ecdh_sk,
                PublicKey: ecdh_pk,
                SelfJson: self_json,
                PairJson: json
              }))
              yield call(SendMessage, { msg: JSON.stringify(self_json) })
            } else {
              const ec = new Elliptic.ec('secp256k1')
              const self_key_pair = ec.keyFromPrivate(ecdh.PrivateKey, 'hex')
              const self_json = MG.genECDHHandshake(DefaultPartition, json.Sequence, ecdh.PublicKey, json.Self, ob_address, timestamp)
              const pair_key_pair = ec.keyFromPublic(json.Self, 'hex')
              const shared_key = self_key_pair.derive(pair_key_pair.getPublic()).toString('hex')
              const aes_key = genAESKey(shared_key, address, ob_address, json.Sequence)
              yield call(() => CommonDB.ECDHS
                .where({ SelfAddress: address, PairAddress: ob_address, Partition: DefaultPartition, Sequence: json.Sequence })
                .modify(tmp => {
                  tmp.AesKey = aes_key
                  tmp.SelfJson = self_json
                  tmp.PairJson = json
                }))
              if (json.Pair) {
              } else {
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
            let msg_from = yield call(() => CommonDB.Friends
              .where('[Local+Remote]')
              .equals([address, ob_address])
              .first())
            if (msg_from !== undefined) {
              const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, ob_address)
              let ecdh = yield call(() => CommonDB.ECDHS
                .where({ SelfAddress: address, PairAddress: ob_address, Partition: DefaultPartition, Sequence: ecdh_sequence })
                .first())
              if (ecdh === undefined || ecdh.AesKey === undefined) {
                yield call(InitHandshake, { ecdh_sequence: ecdh_sequence, pair_address: ob_address })
              } else {
                let content = AesDecrypt(json.Content, ecdh.AesKey)
                let content_json = deriveJson(content)
                if (content_json && checkMessageObjectSchema(content_json)) {
                  content = content_json
                }
                let hash = QuarterSHA512Message(json)
                let to_save = {
                  Hash: hash,
                  Sour: ob_address,
                  Dest: address,
                  Sequence: json.Sequence,
                  PreHash: json.PreHash,
                  Content: content,
                  SignedAt: json.Timestamp,
                  // CreatedAt: timestamp,
                  Json: json,
                  Confirmed: 0,
                  Readed: 0
                }
                if (typeof content === 'string') {
                  to_save.IsObject = false
                } else if (typeof content === 'object') {
                  to_save.IsObject = true
                  to_save.ObjectType = content.ObjectType
                  if (content.ObjectType === MessageObjectType.PrivateChatFile) {
                    yield fork(FetchPrivateChatFile, { payload: { remote: ob_address, hash: content.Hash, size: content.Size } })
                  }
                }

                let [last_msg] = yield call(() => CommonDB.PrivateMessages
                  .where({ Sour: ob_address, Dest: address })
                  .reverse()
                  .sortBy('Sequence')
                )
                const CurrentSession = yield select(state => state.Messenger.CurrentSession)
                if (last_msg === undefined) {
                  if (json.Sequence === 1 && json.PreHash === GenesisHash) {
                    // first msg, save
                    yield call(() => safeAddItem(CommonDB, 'PrivateMessages', 'Hash', to_save))
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
                  if (last_msg.Sequence + 1 === json.Sequence && last_msg.Hash === json.PreHash) {
                    // chained msg, save
                    yield call(() => safeAddItem(CommonDB, 'PrivateMessages', 'Hash', to_save))
                    if (CurrentSession && CurrentSession.type === SessionType.Private && CurrentSession.remote === ob_address) {
                      yield call(RefreshPrivateMessageList)
                    } else {
                      // TODO: unread message count
                    }
                  } else if (last_msg.Sequence + 1 < json.Sequence) {
                    // unchained msg, request next msg
                    yield call(SyncPrivateMessage, { payload: { local: address, remote: ob_address } })
                  }
                }
              }
            }
          } else {
            // sync self message
            let msg_to = yield call(() => CommonDB.Friends
              .where('[Local+Remote]')
              .equals([address, json.To])
              .first())
            if (msg_to !== undefined && msg_to.IsAccepted === false) {
              msg_to = undefined
            }
            if (msg_to !== undefined) {
              const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, json.To)
              let ecdh = yield call(() => CommonDB.ECDHS
                .where({ SelfAddress: address, PairAddress: json.To, Partition: DefaultPartition, Sequence: ecdh_sequence })
                .first())
              if (ecdh === undefined || ecdh.AesKey === undefined) {
                yield call(InitHandshake, { ecdh_sequence: ecdh_sequence, pair_address: json.To })
              } else {
                let content = AesDecrypt(json.Content, ecdh.AesKey)
                let content_json = deriveJson(content)
                if (content_json && checkMessageObjectSchema(content_json)) {
                  content = content_json
                }
                let hash = QuarterSHA512Message(json)
                let to_save = {
                  Hash: hash,
                  Sour: address,
                  Dest: json.To,
                  Sequence: json.Sequence,
                  PreHash: json.PreHash,
                  Content: content,
                  SignedAt: json.Timestamp,
                  Json: json,
                  Confirmed: 0,
                  Readed: 0
                }
                if (typeof content === 'string') {
                  to_save.IsObject = false
                } else if (typeof content === 'object') {
                  to_save.IsObject = true
                  to_save.ObjectType = content.ObjectType
                }

                let [last_msg] = yield call(() => CommonDB.PrivateMessages
                  .where({ Sour: address, Dest: json.To })
                  .reverse()
                  .sortBy('Sequence')
                )
                if (last_msg === undefined) {
                  if (json.Sequence === 1 && json.PreHash === GenesisHash) {
                    // first msg, save
                    yield call(() => safeAddItem(CommonDB, 'PrivateMessages', 'Hash', to_save))
                  } else {
                    // request first msg
                    yield call(SyncPrivateMessage, { payload: { local: address, remote: json.To } })
                  }
                } else {
                  // (last_msg !== undefined)
                  if (last_msg.Sequence + 1 === json.Sequence && last_msg.Hash === json.PreHash) {
                    // chained msg, save
                    yield call(() => safeAddItem(CommonDB, 'PrivateMessages', 'Hash', to_save))
                  } else if (last_msg.Sequence + 1 < json.Sequence) {
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
            let db_g = yield call(() => CommonDB.Groups
              .where('Hash')
              .equals(group_json.Hash)
              .first())
            if (group_json.ObjectType === ObjectType.GroupCreate && VerifyJsonSignature(group_json)) {
              if (db_g === undefined) {
                const created_by = rippleKeyPairs.deriveAddress(group_json.PublicKey)
                let new_group = {
                  Hash: group_json.Hash,
                  Name: group_json.Name,
                  CreatedBy: created_by,
                  Member: group_json.Member,
                  CreatedAt: group_json.Timestamp,
                  CreateJson: group_json,
                  IsAccepted: false
                }
                if (created_by === address) {
                  new_group.IsAccepted = true
                  let result = yield call(() => CommonDB.Groups.add(new_group))
                  yield call(LoadSessionList)
                  yield call(LoadGroupList)
                } else {
                  let result = yield call(() => CommonDB.Groups.add(new_group))
                  yield call(LoadGroupRequestList)
                }
              }
            } else if (group_json.ObjectType === ObjectType.GroupDelete && VerifyJsonSignature(group_json)) {
              if (db_g !== undefined && db_g.DeletedAt === undefined) {
                yield call(() => CommonDB.Groups
                  .where('Hash')
                  .equals(group_json.Hash)
                  .modify(tmp => {
                    tmp.DeletedAt = group_json.Timestamp
                    tmp.DeleteJson = group_json
                  }))
              }
            }
          }
        }
      } else if (json.ObjectType === ObjectType.GroupMessageList) {
        if (checkGroupMessageListSchema(json)) {
          const ob_address = rippleKeyPairs.deriveAddress(json.PublicKey)
          let group = yield call(() => CommonDB.Groups
            .where("Hash")
            .equals(json.GroupHash)
            .first())
          if (group === undefined) {
            yield call(GroupSync)
          } else if (group.IsAccepted === true) {
            const ecdh_sequence = DHSequence(DefaultPartition, json.Timestamp, address, ob_address)
            let ecdh = yield call(() => CommonDB.ECDHS
              .where({ SelfAddress: address, PairAddress: ob_address, Partition: DefaultPartition, Sequence: ecdh_sequence })
              .first())
            if (ecdh === undefined) {
              yield call(InitHandshake, { ecdh_sequence: ecdh_sequence, pair_address: ob_address })
            } else if (ecdh.AesKey === undefined) {
              yield fork(SendMessage, { msg: JSON.stringify(ecdh.SelfJson) })
            } else {
              let unCachedMessageAddress = []
              for (let i = 0; i < json.List.length; i++) {
                const group_msg = json.List[i]
                const msg_address = rippleKeyPairs.deriveAddress(group_msg.PublicKey)
                let pre_message = yield call(() => CommonDB.GroupMessages
                  .where('Hash')
                  .equals(group_msg.PreHash)
                  .first())
                if (pre_message !== undefined
                  || (pre_message === undefined && group_msg.Sequence === 1 && group_msg.PreHash === GenesisHash)) {
                  let content = AesDecrypt(group_msg.Content, ecdh.AesKey)
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
                    let to_save = {
                      Hash: hash,
                      GroupHash: json.GroupHash,
                      Address: msg_address,
                      Sequence: verify_json.Sequence,
                      PreHash: verify_json.PreHash,
                      Content: verify_json.Content,
                      SignedAt: verify_json.Timestamp,
                      Json: verify_json,
                      Confirmed: 0,
                      Readed: 1
                    }
                    if (typeof verify_json.Content === 'string') {
                      to_save.IsObject = false
                    } else if (typeof verify_json.Content === 'object') {
                      to_save.IsObject = true
                      to_save.ObjectType = verify_json.Content.ObjectType
                      if (verify_json.Content.ObjectType === MessageObjectType.GroupChatFile) {
                        let chunk_length = Math.ceil(verify_json.Content.Size / FileChunkSize)
                        let file = yield call(() => CommonDB.Files
                          .where('Hash')
                          .equals(verify_json.Content.Hash)
                          .first())
                        if (file === undefined) {
                          let result = yield call(() => CommonDB.Files.add({
                            Hash: verify_json.Content.Hash,
                            Size: verify_json.Content.Size,
                            UpdatedAt: Date.now(),
                            ChunkLength: chunk_length,
                            ChunkCursor: 0,
                            IsSaved: false
                          }))
                        }

                        const ehash = GroupFileEHash(json.GroupHash, verify_json.Content.Hash)
                        console.log(verify_json.Content.Hash)
                        console.log(ehash)
                        let group_chat_file = yield CommonDB.GroupChatFiles
                          .where('EHash')
                          .equals(ehash)
                          .first()
                        console.log(group_chat_file)
                        if (group_chat_file === undefined) {
                          let result = yield call(() => CommonDB.GroupChatFiles.add({
                            EHash: ehash,
                            Hash: verify_json.Content.Hash,
                            Size: verify_json.Content.Size,
                            GroupHash: json.GroupHash
                          }))
                        }
                      }
                    }
                    yield call(() => safeAddItem(CommonDB, 'GroupMessages', 'Hash', to_save))
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
              console.log(unCachedMessageAddress)
              for (let i = 0; i < unCachedMessageAddress.length; i++) {
                const msg_address = unCachedMessageAddress[i]
                let [last_msg] = yield call(() => CommonDB.GroupMessages
                  .where({ Address: msg_address, GroupHash: json.GroupHash })
                  // .where("Address")
                  // .equals(msg_address)
                  .reverse()
                  .sortBy('SignedAt')
                )
                if (last_msg === undefined) {
                  let group_msg_sync_request = MG.genGroupMessageSync(json.GroupHash, msg_address, 0, ob_address)
                  yield call(SendMessage, { msg: JSON.stringify(group_msg_sync_request) })
                } else {
                  let group_msg_sync_request = MG.genGroupMessageSync(json.GroupHash, msg_address, last_msg.Sequence, ob_address)
                  yield call(SendMessage, { msg: JSON.stringify(group_msg_sync_request) })
                }
              }
            }
          }
        }
      }
    }
  } else if (action.type === 'FetchBulletinFile') {
    yield fork(FetchBulletinFile, { payload: { hash: action.payload.hash } })
  } else if (action.type === 'FetchPrivateChatFile') {
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
  let file = yield call(() => CommonDB.Files
    .where('Hash')
    .equals(payload.hash)
    .first())
  if (file !== undefined && file.IsSaved === false) {
    let nonce = genFileNonce()
    let tmp = {
      Type: FileRequestType.File,
      Nonce: nonce,
      Hash: file.Hash,
      ChunkCursor: file.ChunkCursor + 1,
      // Address: address,
      Timestamp: Date.now()
    }
    FileRequestList = FileRequestList.filter(r => r.Timestamp + 120 * 1000 > Date.now())
    FileRequestList = FileRequestList.filter(r => r.Hash !== file.Hash)
    FileRequestList.push(tmp)
    let file_request = MG.genFileRequest(FileRequestType.File, file.Hash, nonce, file.ChunkCursor + 1)
    yield call(SendMessage, { msg: file_request })
  }
}

function* SaveBulletinFile({ payload }) {
  console.log(payload)
  const file = yield call(() => CommonDB.Files
    .where('Hash')
    .equals(payload.hash)
    .first())
  console.log(file)
  if (file && file.IsSaved) {
    const base_dir = yield select(state => state.Common.AppBaseDir)
    const sour_file_path = yield call(() => path.join(base_dir, `File`, payload.hash.substring(0, 3), payload.hash.substring(3, 6), payload.hash))
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
  let chat_file = yield call(() => CommonDB.PrivateChatFiles
    .where('EHash')
    .equals(ehash)
    .first())
  if (chat_file === undefined) {
    let result = yield call(() => CommonDB.PrivateChatFiles.add({
      EHash: ehash,
      Hash: payload.hash,
      Size: payload.size,
      Address1: self_address > payload.remote ? self_address : payload.remote,
      Address2: self_address > payload.remote ? payload.remote : self_address
    }))
  }

  let chunk_length = Math.ceil(payload.size / FileChunkSize)
  let file = yield call(() => CommonDB.Files
    .where('Hash')
    .equals(payload.hash)
    .first())
  if (file === undefined) {
    let result = yield call(() => CommonDB.Files.add({
      Hash: payload.hash,
      Size: payload.size,
      UpdatedAt: Date.now(),
      ChunkLength: chunk_length,
      ChunkCursor: 0,
      IsSaved: false
    }))
  }

  file = yield call(() => CommonDB.Files
    .where('Hash')
    .equals(payload.hash)
    .first())
  if (file && !file.IsSaved) {
    let timestamp = Date.now()
    const ecdh_sequence = DHSequence(DefaultPartition, timestamp, self_address, payload.remote)
    let ecdh = yield call(() => CommonDB.ECDHS
      .where({ SelfAddress: self_address, PairAddress: payload.remote, Partition: DefaultPartition, Sequence: ecdh_sequence })
      .first())
    console.log(ecdh)
    if (ecdh !== undefined && ecdh.AesKey !== undefined) {
      let nonce = genFileNonce()
      let tmp = {
        Type: FileRequestType.PrivateChatFile,
        Nonce: nonce,
        EHash: ehash,
        Hash: payload.hash,
        Size: payload.size,
        ChunkCursor: file.ChunkCursor + 1,
        Address: payload.remote,
        AesKey: ecdh.AesKey,
        Timestamp: timestamp
      }
      FileRequestList = FileRequestList.filter(r => r.Timestamp + 120 * 1000 > Date.now())
      FileRequestList = FileRequestList.filter(r => r.EHash !== ehash)
      FileRequestList.push(tmp)
      let file_request = MG.genFileRequest(FileRequestType.PrivateChatFile, ehash, nonce, file.ChunkCursor + 1, payload.remote)
      yield call(SendMessage, { msg: file_request })
    }
  } else {
    // file exist
  }
}

function* FetchGroupChatFile({ payload }) {
  console.log(payload)
  const self_address = yield select(state => state.User.Address)
  const ehash = GroupFileEHash(payload.group_hash, payload.hash)
  let chat_file = yield call(() => CommonDB.GroupChatFiles
    .where('EHash')
    .equals(ehash)
    .first())
  if (chat_file === undefined) {
    let result = yield call(() => CommonDB.GroupChatFiles.add({
      EHash: ehash,
      Hash: payload.hash,
      Size: payload.size,
      GroupHash: payload.group_hash
    }))
  }

  let chunk_length = Math.ceil(payload.size / FileChunkSize)
  let file = yield call(() => CommonDB.Files
    .where('Hash')
    .equals(payload.hash)
    .first())
  if (file === undefined) {
    let result = yield call(() => CommonDB.Files.add({
      Hash: payload.hash,
      Size: payload.size,
      UpdatedAt: Date.now(),
      ChunkLength: chunk_length,
      ChunkCursor: 0,
      IsSaved: false
    }))
  }

  file = yield call(() => CommonDB.Files
    .where('Hash')
    .equals(payload.hash)
    .first())
  if (file && !file.IsSaved) {
    let timestamp = Date.now()
    let nonce = genFileNonce()
    const group_member_map = yield select(state => state.Messenger.GroupMemberMap)
    let tmp = {
      Type: FileRequestType.GroupChatFile,
      Nonce: nonce,
      EHash: ehash,
      Hash: payload.hash,
      Size: payload.size,
      ChunkCursor: file.ChunkCursor + 1,
      GroupHash: payload.group_hash,
      GroupMember: group_member_map[payload.group_hash],
      SelfAddress: self_address,
      Timestamp: timestamp
    }
    FileRequestList = FileRequestList.filter(r => r.Timestamp + 120 * 1000 > Date.now())
    FileRequestList = FileRequestList.filter(r => r.EHash === ehash)
    console.log(tmp)
    FileRequestList.push(tmp)
    let file_request = MG.genGroupFileRequest(payload.group_hash, ehash, nonce, file.ChunkCursor + 1)
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
  console.log(payload)
  const file = yield call(() => CommonDB.Files
    .where('Hash')
    .equals(payload.hash)
    .first())
  console.log(file)
  if (file && file.IsSaved) {
    const base_dir = yield select(state => state.Common.AppBaseDir)
    const sour_file_path = yield call(() => path.join(base_dir, `File`, payload.hash.substring(0, 3), payload.hash.substring(3, 6), payload.hash))
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
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  let server_list = yield call(() => CommonDB.Servers
    .reverse()
    .sortBy('UpdatedAt'))
  if (server_list.length === 0) {
    const server = {
      URL: DefaultServer,
      UpdatedAt: Date.now()
    }
    yield call(() => CommonDB.Servers.add(server))
    server_list.push(server)
  }
  yield put(setServerList(server_list))
  yield put(setCurrentServer(server_list[0].URL))
  yield call(ReConnnect)
}

function* ServerAdd({ payload }) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  yield call(() => safeAddItem(CommonDB, 'Servers', 'URL', {
    URL: payload.url,
    UpdatedAt: Date.now()
  }))
  yield call(LoadServerList)
}

function* ServerDel({ payload }) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  yield call(() => CommonDB.Servers
    .where('URL')
    .equals(payload.url)
    .delete())
  yield call(LoadServerList)
}

function* ServerUse({ payload }) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  yield call(() => CommonDB.Servers
    .where('URL')
    .equals(payload.url)
    .modify(s => {
      s.UpdatedAt = Date.now()
    }))
  yield call(LoadServerList)
}

// avatar
function* CheckAvatar({ payload }) {
  // console.log(payload)
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  let avatar = yield call(() => CommonDB.Avatars
    .where('Address')
    .equals(payload.address)
    .first())
  if (avatar === undefined) {
    console.log(`new avatar wanted...`)
    yield call(() => CommonDB.Avatars.add({
      Address: payload.address,
      Hash: GenesisHash,
      Size: 0,
      UpdatedAt: Epoch,
      SignedAt: Epoch,
      IsSaved: false
    }))
  }
}

function* SaveSelfAvatar({ payload }) {
  const address = yield select(state => state.User.Address)
  let db_avatar = yield call(() => CommonDB.Avatars
    .where('Address')
    .equals(address)
    .first())
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }

  let avatar_json = MG.genAvatarJson(payload.hash, payload.size, payload.timestamp)
  if (db_avatar !== undefined) {
    yield call(() => CommonDB.Avatars
      .where('Address')
      .equals(address)
      .modify(a => {
        a.Hash = payload.hash
        a.Size = payload.size
        a.Json = avatar_json
        a.UpdatedAt = payload.timestamp
        a.SignedAt = payload.timestamp
        a.IsSaved = true
      }))
  }

  let avatar_response = {
    ObjectType: ObjectType.AvatarList,
    List: [avatar_json]
  }
  yield call(SendMessage, { msg: JSON.stringify(avatar_response) })
}

export function* AvatarRequest() {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }
  let timestamp = Date.now()
  let old_avatar_list = yield call(() => CommonDB.Avatars
    .orderBy('UpdatedAt')
    .limit(64)
    .toArray())
  let list = []
  for (let i = 0; i < old_avatar_list.length; i++) {
    const avatar = old_avatar_list[i];
    if (avatar.UpdatedAt < timestamp - Hour) {
      list.push({ Address: avatar.Address, SignedAt: avatar.SignedAt })
      yield call(() => CommonDB.Avatars
        .where('Address')
        .equals(avatar.Address)
        .modify(a => {
          a.UpdatedAt = timestamp
        }))
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
  if (CommonDB === null) {
    yield call(initCommonDB)
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
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }
  let [bulletin] = yield call(() => CommonDB.Bulletins
    .where('Address')
    .equals(payload.address)
    .reverse()
    .sortBy('Sequence'))
  let request_sequence = 1
  if (bulletin !== undefined) {
    request_sequence = bulletin.Sequence + 1
  }
  let bulletin_request = MG.genBulletinRequest(payload.address, request_sequence, payload.address)
  yield call(EnqueueMessage, { payload: { msg: bulletin_request } })
}

function* LoadMineBulletin() {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  const seed = yield select(state => state.User.Seed)
  const address = yield select(state => state.User.Address)
  if (!seed) {
    MG = null
    return
  }

  let bulletins = yield call(() => CommonDB.Bulletins
    .orderBy('Sequence')
    .reverse()
    .filter(record => record.Address === address)
    .toArray())
  if (bulletins.length > 0) {
    yield put(setCurrentBulletinSequence(bulletins[0].Sequence))
  } else {
    yield put(setCurrentBulletinSequence(0))
  }
  yield put(setMineBulletinList(bulletins))
}

function* LoadFollowBulletin() {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  const seed = yield select(state => state.User.Seed)
  const address = yield select(state => state.User.Address)
  if (!seed) {
    MG = null
    return
  }

  let follows = yield call(() => CommonDB.Follows
    .where('Local')
    .equals(address)
    .toArray())
  if (follows.length > 0) {
    let follow_address_list = []
    for (let i = 0; i < follows.length; i++) {
      const follow = follows[i]
      follow_address_list.push(follow.Remote)
      yield fork(RequestNextBulletin, { payload: { address: follow.Remote } })
    }

    let bulletins = yield call(() => CommonDB.Bulletins
      .where('Address')
      .anyOf(follow_address_list)
      .sortBy('SignedAt')
    )
    bulletins = bulletins.reverse()
    yield put(setFollowBulletinList(bulletins))
  } else {
    yield put(setFollowBulletinList([]))
  }
}

function* LoadBookmarkBulletin() {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }

  let bulletins = yield call(() => CommonDB.Bulletins
    .orderBy('SignedAt')
    .reverse()
    .filter(b => b.IsMark === true)
    .toArray())
  yield put(setBookmarkBulletinList(bulletins))
}

function* LoadBulletin(action) {
  console.log(action)
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }

  let bulletin = yield call(() => CommonDB.Bulletins
    .where('Hash')
    .equals(action.payload.hash)
    .first())
  if (bulletin === undefined) {
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
    let reply_hash_list = yield call(() => CommonDB.BulletinReplys
      .orderBy('SignedAt')
      .filter(item => {
        return item.Hash === display_bulletin.Hash
      })
      .offset((payload.page - 1) * BulletinPageSize)
      .limit(BulletinPageSize)
      .toArray())
    reply_hash_list = reply_hash_list.map(item => item.ReplyHash)
    let replys = yield call(() => CommonDB.Bulletins.bulkGet(reply_hash_list))

    let total = yield call(() => CommonDB.BulletinReplys
      .orderBy('SignedAt')
      .filter(item => {
        return item.Hash === display_bulletin.Hash
      })
      .count())
    let total_page = calcTotalPage(total, BulletinPageSize)
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
    let tag_bulletin_list = yield call(() => CommonDB.Bulletins
      .orderBy('SignedAt')
      .filter(item => {
        for (let i = 0; i < payload.tag.length; i++) {
          const tmp_tag = payload.tag[i]
          if (!item.Tag.includes(tmp_tag)) {
            return false
          }
        }
        return true
      })
      .offset((payload.page - 1) * BulletinPageSize)
      .limit(BulletinPageSize)
      .toArray())
    let total = yield call(() => CommonDB.Bulletins
      .orderBy('SignedAt')
      .filter(item => {
        for (let i = 0; i < payload.tag.length; i++) {
          const tmp_tag = payload.tag[i]
          if (!item.Tag.includes(tmp_tag)) {
            return false
          }
        }
        return true
      })
      .count())
    let total_page = calcTotalPage(total, BulletinPageSize)
    yield put(setTagBulletinList({ List: tag_bulletin_list, Page: 1, TotalPage: total_page }))
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
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  const seed = yield select(state => state.User.Seed)
  const address = yield select(state => state.User.Address)
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
  const last_bulletin = yield call(() => CommonDB.Bulletins
    .where('Address').equals(address)
    .sortBy('Sequence')
    .then(records => records[records.length - 1]))
  let bulletin_json
  let timestamp = Date.now()
  if (last_bulletin === undefined) {
    bulletin_json = MG.genBulletinJson(1, GenesisHash, tag, quote, file, action.payload.content, timestamp)
  } else {
    bulletin_json = MG.genBulletinJson(last_bulletin.Sequence + 1, last_bulletin.Hash, tag, quote, file, action.payload.content, timestamp)
  }
  let new_bulletin = {
    Hash: QuarterSHA512Message(bulletin_json),
    Address: address,
    Sequence: bulletin_json.Sequence,
    Content: bulletin_json.Content,
    Tag: tag,
    Quote: quote,
    File: file,
    Json: bulletin_json,
    SignedAt: timestamp,
    // CreatedAt: timestamp,
    PreHash: bulletin_json.PreHash,
    IsMark: false
  }
  let result = yield call(() => CommonDB.Bulletins.add(new_bulletin))
  yield put(setCurrentBulletinSequence(bulletin_json.Sequence))
  yield put(setPublishTagList([]))
  yield put(setPublishQuoteList([]))
  yield put(setPublishFileList([]))
  yield call(LoadMineBulletin)
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
  const file_dir = yield call(() => path.join(base_dir, `file`, hash.substring(0, 3), hash.substring(3, 6)))
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
    let file = yield call(() => CommonDB.Files
      .where('Hash')
      .equals(hash)
      .first())
    if (file === undefined) {
      yield call(() => saveLocalFile(hash, content))
      let result = yield call(() => CommonDB.Files.add({
        Hash: hash,
        Size: file_info.size,
        UpdatedAt: Date.now(),
        ChunkLength: chunk_length,
        ChunkCursor: chunk_length,
        IsSaved: true
      }))
    } else {
      yield call(() => saveLocalFile(hash, content))
      let updatedCount = yield call(() => CommonDB.Files
        .where('Hash')
        .equals(hash)
        .modify(tmp => {
          tmp.ChunkCursor = chunk_length
          tmp.IsSaved = true
          tmp.UpdatedAt = Date.now()
        }))
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
      if (file.Hash === new_file.Hash) {
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
  let updatedCount = yield call(() => CommonDB.Bulletins
    .where('Hash')
    .equals(payload.hash)
    .modify(tmp => {
      tmp.IsMark = !tmp.IsMark
    }))
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

function* RefreshChannelMessageList() {
  const CurrentChannel = yield select(state => state.Messenger.CurrentChannel)
  const bulletins = yield call(() => CommonDB.Bulletins
    .where('Address')
    .anyOf(CurrentChannel.speaker)
    // .reverse()
    .sortBy('SignedAt')
  )
  yield put(setCurrentChannelBulletinList(bulletins))
}

function* CreateChannel(action) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  const address = yield select(state => state.User.Address)
  const speaker = yield select(state => state.Messenger.ComposeSpeakerList)
  const db_channel = yield call(() => CommonDB.Channels
    .where('Name')
    .equals(action.payload.name)
    .first()
  )
  if (db_channel === undefined) {
    const new_channel = {
      Name: action.payload.name,
      CreatedBy: address,
      Speaker: speaker,
      CreatedAt: Date.now(),
    }
    let result = yield call(() => CommonDB.Channels.add(new_channel))
  } else {
    let result = yield call(() => CommonDB.Channels
      .where('Name')
      .equals(action.payload.name)
      .modify(tmp => {
        tmp.Speaker = speaker
        tmp.CreatedAt = Date.now()
      }))
  }
  yield put(setComposeSpeakerList([]))
  yield call(LoadChannelList)
}

function* DeleteChannel(action) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  let result = yield call(() => CommonDB.Channels
    .where('Name')
    .equals(action.payload.name)
    .delete())
  if (result) {
    yield call(LoadChannelList)
  }
}

export function* LoadChannelList() {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  const channel_list = yield call(() => CommonDB.Channels
    .orderBy('CreatedAt')
    .reverse()
    .toArray())
  console.log(channel_list)
  yield put(setChannelList(channel_list))
}

function* LoadCurrentChannel({ payload }) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  const channel = { name: payload.Name, speaker: payload.Speaker, updated_at: payload.CreatedAt }
  yield put(setCurrentChannel(channel))
  yield call(RefreshChannelMessageList)
}

export function* SubscribeChannel() {
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }
  const channel_list = yield call(() => CommonDB.Channels
    .orderBy('CreatedAt')
    .reverse()
    .toArray())
  let subscribe_address_list = []
  for (let i = 0; i < channel_list.length; i++) {
    const channel = channel_list[i]
    subscribe_address_list = subscribe_address_list.concat(...channel.Speaker)
  }
  subscribe_address_list = [...new Set(subscribe_address_list)]
  let subscribe_request = MG.genBulletinSubscribe(subscribe_address_list)
  yield call(SendMessage, { msg: JSON.stringify(subscribe_request) })
}

// session
export function* LoadSessionList() {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  const address = yield select(state => state.User.Address)
  if (!address) {
    return
  }
  // private
  let friend_list = yield call(() => CommonDB.Friends
    .where('Local')
    .equals(address)
    .toArray())
  let session_list = []
  for (let i = 0; i < friend_list.length; i++) {
    const friend = friend_list[i]
    session_list.push({ type: SessionType.Private, address: friend.Remote, updated_at: Date.now() })
  }
  // group
  let group_list = yield call(() => CommonDB.Groups
    .orderBy('CreatedAt')
    .reverse()
    .toArray())
  group_list = group_list.filter(g => g.DeleteJson === undefined && g.IsAccepted === true)
  for (let i = 0; i < group_list.length; i++) {
    const group = group_list[i]
    let member = [...group.Member]
    member.push(group.CreatedBy)
    if (member.includes(address)) {
      session_list.push({ type: SessionType.Group, hash: group.Hash, name: group.Name, member: member, updated_at: Date.now() })
    }
  }
  yield put(setSessionList(session_list))
}

function* SyncPrivateMessage({ payload }) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }

  let [current_self_msg] = yield call(() => CommonDB.PrivateMessages
    .where({ Sour: payload.local, Dest: payload.remote })
    .reverse()
    .sortBy('Sequence')
  )
  let self_sequence = 0
  if (current_self_msg !== undefined) {
    self_sequence = current_self_msg.Sequence
  }

  let [current_pair_msg] = yield call(() => CommonDB.PrivateMessages
    .where({ Sour: payload.remote, Dest: payload.local })
    .reverse()
    .sortBy('Sequence')
  )
  let pair_sequence = 0
  if (current_pair_msg !== undefined) {
    pair_sequence = current_pair_msg.Sequence
  }

  let private_sync_request = MG.genPrivateMessageSync(payload.remote, pair_sequence, self_sequence)
  yield call(SendMessage, { msg: private_sync_request })
}

function* InitHandshake(payload) {
  // console.log(payload)
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
  yield call(() => CommonDB.ECDHS.add({
    SelfAddress: self_address,
    PairAddress: payload.pair_address,
    Partition: DefaultPartition,
    Sequence: payload.ecdh_sequence,
    // AesKey:'',
    PrivateKey: ecdh_sk,
    PublicKey: ecdh_pk,
    SelfJson: self_json,
    // PairJson:
  }))
  yield fork(SendMessage, { msg: JSON.stringify(self_json) })
}

function* LoadCurrentSession({ payload }) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
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

      let ecdh = yield call(() => CommonDB.ECDHS
        .where({ SelfAddress: self_address, PairAddress: pair_address, Partition: DefaultPartition, Sequence: ecdh_sequence })
        .first())
      if (ecdh === undefined) {
        yield call(InitHandshake, { ecdh_sequence: ecdh_sequence, pair_address: pair_address })
      } else {
        if (ecdh.AesKey !== undefined) {
          // aes ready, handsake already done, ready to chat
          session.aes_key = ecdh.AesKey
        } else {
          // my-sk-pk exist, aes not ready
          // send self-not-ready-json
          yield fork(SendMessage, { msg: JSON.stringify(ecdh.SelfJson) })
        }
      }

      let [current_msg] = yield call(() => CommonDB.PrivateMessages
        .where({ Sour: self_address, Dest: pair_address })
        .reverse()
        .sortBy('Sequence')
      )
      if (current_msg !== undefined) {
        session.current_sequence = current_msg.Sequence
        session.current_hash = current_msg.Hash
      } else {
        session.current_sequence = 0
        session.current_hash = GenesisHash
      }
      yield put(setCurrentSession(session))

      yield call(RefreshPrivateMessageList)

      yield call(SyncPrivateMessage, { payload: { local: self_address, remote: pair_address } })
      break
    case SessionType.Group:
      let group_session = { type: SessionType.Group, hash: payload.hash, name: payload.name, member: payload.member, updated_at: payload.updated_at }
      if (group_session.member.includes(self_address)) {
        let [current_group_msg] = yield call(() => CommonDB.GroupMessages
          .where({ GroupHash: payload.hash, Address: self_address })
          .reverse()
          .sortBy('Sequence')
        )
        if (current_group_msg !== undefined) {
          group_session.current_sequence = current_group_msg.Sequence
          group_session.current_hash = current_group_msg.Hash
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
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
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
  switch (CurrentSession.type) {
    case SessionType.Private:
      if (CurrentSession.aes_key !== undefined) {
        let content = AesEncrypt(payload.content, CurrentSession.aes_key)

        let last_confirmed_msg = null
        let confirmed_message_list = yield call(() => CommonDB.PrivateMessages
          .where({ Sour: CurrentSession.remote, Dest: self_address, Confirmed: 1 })
          .reverse()
          .sortBy('Sequence'))
        if (confirmed_message_list.length > 0) {
          last_confirmed_msg = confirmed_message_list[0]
        }

        let confirm_msg = null
        let unconfirm_message_list = yield call(() => CommonDB.PrivateMessages
          .where({ Sour: CurrentSession.remote, Dest: self_address, Confirmed: 0 })
          .reverse()
          .sortBy('Sequence'))
        console.log(unconfirm_message_list)
        if (unconfirm_message_list.length > 0
          && (last_confirmed_msg === null
            || unconfirm_message_list[0].Sequence > last_confirmed_msg.Sequence)) {
          confirm_msg = {
            Sequence: unconfirm_message_list[0].Sequence,
            Hash: unconfirm_message_list[0].Hash
          }
        }
        console.log(confirm_msg)

        if (confirm_msg !== null) {
          yield call(() => CommonDB.PrivateMessages
            .where('Hash')
            .equals(confirm_msg.Hash)
            .modify(tmp => { tmp.Confirmed = 1 }))
        }

        console.log(content)
        let msg_json = MG.genPrivateMessage(CurrentSession.current_sequence + 1, CurrentSession.current_hash, confirm_msg, content, CurrentSession.remote, timestamp)
        let hash = QuarterSHA512Message(msg_json)
        console.log(msg_json)
        console.log(hash)

        let to_save = {
          Hash: hash,
          Sour: self_address,
          Dest: CurrentSession.remote,
          Sequence: CurrentSession.current_sequence + 1,
          PreHash: CurrentSession.current_hash,
          Content: payload.content,
          SignedAt: timestamp,
          // CreatedAt: timestamp,
          Json: msg_json,
          Confirmed: 0,
          Readed: 1
        }
        if (typeof payload.content === 'string') {
          to_save.IsObject = false
        } else if (typeof payload.content === 'object') {
          to_save.IsObject = true
          to_save.ObjectType = payload.content.ObjectType
        }
        yield call(() => safeAddItem(CommonDB, 'PrivateMessages', 'Hash', to_save))

        let tmp_session = { ...CurrentSession }
        tmp_session.current_sequence = CurrentSession.current_sequence + 1
        tmp_session.current_hash = hash
        console.log(tmp_session)
        yield put(setCurrentSession(tmp_session))

        yield call(RefreshPrivateMessageList)

        yield call(SendMessage, { msg: JSON.stringify(msg_json) })
      } else {
        ConsoleError('aeskey not ready...')
      }
      break
    case SessionType.Group:
      let last_confirmed_group_msg = null
      let confirmed_group_message_list = yield call(() => CommonDB.GroupMessages
        .where({ GroupHash: CurrentSession.hash, Confirmed: 1 })
        .reverse()
        .sortBy('SignedAt')
      )
      if (confirmed_group_message_list.length > 0) {
        last_confirmed_group_msg = confirmed_group_message_list[0]
      }

      let confirm_group_msg = null
      let unconfirm_message_group_list = yield call(() => CommonDB.GroupMessages
        .where({ GroupHash: CurrentSession.hash, Confirmed: 0 })
        .reverse()
        .sortBy('SignedAt')
      )
      unconfirm_message_group_list = unconfirm_message_group_list.filter(m => m.Address !== self_address)
      if (unconfirm_message_group_list.length > 0
        && (last_confirmed_group_msg === null
          || unconfirm_message_group_list[0].Sequence > last_confirmed_group_msg.Sequence)) {
        confirm_group_msg = {
          Address: unconfirm_message_group_list[0].Address,
          Sequence: unconfirm_message_group_list[0].Sequence,
          Hash: unconfirm_message_group_list[0].Hash
        }
      }

      if (confirm_group_msg !== null) {
        yield call(() => CommonDB.GroupMessages
          .where('Hash')
          .equals(confirm_group_msg.Hash)
          .modify(tmp => { tmp.Confirmed = 1 }))
      }

      let group_msg_json = MG.genGroupMessage(CurrentSession.hash, CurrentSession.current_sequence + 1, CurrentSession.current_hash, confirm_group_msg, payload.content, timestamp)
      let group_hash = QuarterSHA512Message(group_msg_json)

      let group_msg_to_save = {
        Hash: group_hash,
        GroupHash: CurrentSession.hash,
        Address: self_address,
        Sequence: CurrentSession.current_sequence + 1,
        PreHash: CurrentSession.current_hash,
        Content: payload.content,
        SignedAt: timestamp,
        Json: group_msg_json,
        Confirmed: 0,
        Readed: 1
      }
      if (typeof payload.content === 'string') {
        group_msg_to_save.IsObject = false
      } else if (typeof payload.content === 'object') {
        group_msg_to_save.IsObject = true
        group_msg_to_save.ObjectType = payload.content.ObjectType
      }
      yield call(() => safeAddItem(CommonDB, 'GroupMessages', 'Hash', group_msg_to_save))

      let tmp_group_session = { ...CurrentSession }
      tmp_group_session.current_sequence = CurrentSession.current_sequence + 1
      tmp_group_session.current_hash = group_hash
      yield put(setCurrentSession(tmp_group_session))

      yield call(RefreshGroupMessageList)
      for (let i = 0; i < tmp_group_session.member.length; i++) {
        const member = tmp_group_session.member[i]
        let tmp_msg_json = group_msg_json
        if (member !== self_address) {
          const ecdh_sequence = DHSequence(DefaultPartition, timestamp, self_address, member)
          let ecdh = yield call(() => CommonDB.ECDHS
            .where({ SelfAddress: self_address, PairAddress: member, Partition: DefaultPartition, Sequence: ecdh_sequence })
            .first())
          if (ecdh === undefined) {
            yield call(InitHandshake, { ecdh_sequence: ecdh_sequence, pair_address: member })
          } else if (ecdh.AesKey === undefined) {
            yield fork(SendMessage, { msg: JSON.stringify(ecdh.SelfJson) })
          } else {
            let encrypt_content = AesEncrypt(tmp_msg_json.Content, ecdh.AesKey)
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
      let file = yield call(() => CommonDB.Files
        .where('Hash')
        .equals(hash)
        .first())
      if (file === undefined) {
        let result = yield call(() => CommonDB.Files.add({
          Hash: hash,
          Size: file_info.size,
          UpdatedAt: Date.now(),
          ChunkLength: chunk_length,
          ChunkCursor: chunk_length,
          IsSaved: true
        }))
      } else {
        let updatedCount = yield call(() => CommonDB.Files
          .where('Hash')
          .equals(hash)
          .modify(tmp => {
            tmp.ChunkCursor = chunk_length
            tmp.IsSaved = true
            tmp.UpdatedAt = Date.now()
          }))
      }

      let private_chat_file = yield call(() => CommonDB.PrivateChatFiles
        .where('EHash')
        .equals(ehash)
        .first())
      if (private_chat_file === undefined) {
        let result = yield call(() => CommonDB.PrivateChatFiles.add({
          EHash: ehash,
          Hash: hash,
          Size: file_info.size,
          Address1: self_address > CurrentSession.remote ? self_address : CurrentSession.remote,
          Address2: self_address > CurrentSession.remote ? CurrentSession.remote : self_address
        }))
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
      let file = yield call(() => CommonDB.Files
        .where('Hash')
        .equals(hash)
        .first())
      if (file === undefined) {
        let result = yield call(() => CommonDB.Files.add({
          Hash: hash,
          Size: file_info.size,
          UpdatedAt: Date.now(),
          ChunkLength: chunk_length,
          ChunkCursor: chunk_length,
          IsSaved: true
        }))
      } else {
        let updatedCount = yield call(() => CommonDB.Files
          .where('Hash')
          .equals(hash)
          .modify(tmp => {
            tmp.ChunkCursor = chunk_length
            tmp.IsSaved = true
            tmp.UpdatedAt = Date.now()
          }))
      }

      let group_chat_file = yield call(() => CommonDB.GroupChatFiles
        .where('EHash')
        .equals(ehash)
        .first())
      if (group_chat_file === undefined) {
        let result = yield call(() => CommonDB.GroupChatFiles.add({
          EHash: ehash,
          Hash: hash,
          Size: file_info.size,
          GroupHash: CurrentSession.hash
        }))
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
  let current_msg_list = yield call(() => CommonDB.PrivateMessages
    .where(['Sour', 'Dest', 'Confirmed'])
    .anyOf([[self_address, CurrentSession.remote, 0],
    [self_address, CurrentSession.remote, 1],
    [CurrentSession.remote, self_address, 0],
    [CurrentSession.remote, self_address, 1]])
    .sortBy('SignedAt'))
  console.log(current_msg_list)
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
  let current_msg_list = yield call(() => CommonDB.GroupMessages
    .where("GroupHash")
    .equals(CurrentSession.hash)
    .sortBy('SignedAt'))
  yield put(setCurrentSessionMessageList(current_msg_list))
}

function* RequestGroupMessageSync({ payload }) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }

  let [latest_msg] = yield call(() => CommonDB.GroupMessages
    .where("GroupHash")
    .equals(payload.hash)
    .reverse()
    .sortBy('SignedAt'))
  console.log(latest_msg)
  if (latest_msg) {
    const group_message_sync_request = MG.genGroupMessageSync(payload.hash, latest_msg.Address, latest_msg.Sequence)
    yield call(SendMessage, { msg: JSON.stringify(group_message_sync_request) })
  } else {
    const address = yield select(state => state.User.Address)
    const group_message_sync_request = MG.genGroupMessageSync(payload.hash, address, 0)
    yield call(SendMessage, { msg: JSON.stringify(group_message_sync_request) })
  }
}

function* CreateGroup(action) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
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

  let hash = QuarterSHA512Message({ CreatedBy: address, Member: member, Random: Math.random() })
  let json = MG.genGroupCreate(hash, action.payload.name, member)
  let new_group = {
    Hash: json.Hash,
    Name: action.payload.name,
    CreatedBy: address,
    Member: json.Member,
    CreatedAt: json.Timestamp,
    CreateJson: json,
    IsAccepted: true
  }
  let result = yield call(() => CommonDB.Groups.add(new_group))
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
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  const seed = yield select(state => state.User.Seed)
  const address = yield select(state => state.User.Address)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }
  const group = yield call(() => CommonDB.Groups
    .where('Hash')
    .equals(action.payload.hash)
    .first())
  if (group !== undefined && group.CreatedBy === address && group.DeleteJson === undefined) {
    let json = MG.genGroupDelete(action.payload.hash)
    let result = yield call(() => CommonDB.Groups
      .where('Hash')
      .equals(action.payload.hash)
      .modify(tmp => {
        tmp.DeletedAt = json.Timestamp
        tmp.DeleteJson = json
      }))
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
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  let group_list = yield call(() => CommonDB.Groups
    .orderBy('CreatedAt')
    .reverse()
    .toArray())
  group_list = group_list.filter(g => g.IsAccepted === true && (g.CreatedBy === address || g.Member.includes(address)))

  let group_member_map = {}
  for (let i = 0; i < group_list.length; i++) {
    const group = group_list[i]
    group_member_map[group.Hash] = group.Member
    group_member_map[group.Hash].push(group.CreatedBy)
  }
  yield put(setGroupList({ group_list: group_list, group_member_map: group_member_map }))

  let total_member = []
  for (let i = 0; i < group_list.length; i++) {
    const group = group_list[i]
    total_member.push(group.CreatedBy)
    total_member = [].concat(total_member, group.Member)
    total_member = total_member.filter(a => a !== address)
    total_member = [...new Set(total_member)]
  }
  yield put(setTotalGroupMemberList(total_member))
}

export function* LoadGroupRequestList() {
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    MG = null
    return
  }
  if (MG === null) {
    yield call(initMessageGenerator, seed)
  }
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  let group_list = yield call(() => CommonDB.Groups
    .orderBy('CreatedAt')
    .reverse()
    .toArray())
  group_list = group_list.filter(g => g.IsAccepted === false)
  yield put(setGroupRequestList(group_list))
}

function* AcceptGroupRequest({ payload }) {
  if (CommonDB === null) {
    yield call(initCommonDB)
  }
  let group_request = yield call(() => CommonDB.Groups
    .where('Hash')
    .equals(payload.hash)
    .first())
  if (group_request !== undefined && group_request.IsAccepted === false) {
    yield call(() => CommonDB.Groups
      .where('Hash')
      .equals(payload.hash)
      .modify(tmp => {
        tmp.IsAccepted = true
      }))
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