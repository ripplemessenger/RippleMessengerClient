import * as path from '@tauri-apps/api/path'
import { mkdir, readFile, writeFile, stat } from '@tauri-apps/plugin-fs'
import * as rippleKeyPairs from 'ripple-keypairs'
import { call, fork, put, select } from 'redux-saga/effects'

import { SendMessage, genFileNonce, pushFileRequest } from './messenger.core'
import { FetchBulletinFile } from './messenger.file'
import { dbAPI } from '../../db'
import { AvatarDir, BulletinPageSize, FileChunkSize, FileDir, FileMaxSize, FLASH_DURATION_MS, Hour } from '../../lib/AppConst'
import { AesDecryptBuffer, filesize_format, QuarterSHA512Message } from '../../lib/AppUtil'
import Logger from '../../lib/Logger'
import { mgAPI } from '../../lib/MessageGenerator'
import { Epoch, FileRequestType, GenesisHash, ListItemMax, ObjectType } from '../../lib/MessengerConst'
import { calcTotalPage, FileHash, buildFileSubPath } from '../../lib/MessengerUtil'
import { setFlashNoticeMessage } from '../slices/CommonSlice'
import { setCurrentBulletinSequence, setPublishFileList, setPublishQuoteList, setFollowBulletinList, setPublishFlag, setPublishTagList, setDisplayBulletin, setDisplayBulletinReplyList, setTagBulletinList, setBookmarkBulletinList, setPortalBulletinList, setAddressBulletinList, setRandomBulletinList } from '../slices/MessengerSlice'

// ==================== Bulletin Cache & Upload ====================

export function* CacheBulletin(bulletin_json) {
  try {
    const address = rippleKeyPairs.deriveAddress(bulletin_json.PublicKey)
    let bulletin_db = yield call(() => dbAPI.getBulletinBySequence(address, bulletin_json.Sequence))
    if (bulletin_db === null) {
      const new_bulletin_hash = QuarterSHA512Message(bulletin_json)
      const result = yield call(() => dbAPI.addBulletin(new_bulletin_hash, address, bulletin_json.Sequence, bulletin_json.PreHash, bulletin_json.Content, bulletin_json, bulletin_json.Timestamp))
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
            const chunk_length = Math.ceil(f.Size / FileChunkSize)
            const file = yield call(() => dbAPI.getFileByHash(f.Hash))
            if (file === null) {
              yield call(() => dbAPI.addFile(f.Hash, f.Size, Date.now(), chunk_length, 0, false))
            }
            yield fork(FetchBulletinFile, { payload: { hash: f.Hash } })
          }
          yield call(() => dbAPI.addFilesToBulletin(new_bulletin_hash, bulletin_json.File))
        }
        yield fork(RefreshPortalBulletin)
        yield fork(RefreshFollowBulletin)
      }
      bulletin_db = yield call(() => dbAPI.getBulletinBySequence(address, bulletin_json.Sequence))
    }
    return bulletin_db
  } catch (e) {
    Logger.error('[CacheBulletin] failed for', bulletin_json.Hash, e.message)
    return null
  }
}

export function* UploadBulletin({ payload }) {
  const bulletin = yield call(CacheBulletin, payload.json)
  if (bulletin !== null) {
    yield put(setFlashNoticeMessage({ message: 'bulletin saved', duration: FLASH_DURATION_MS }))
  } else {
    yield put(setFlashNoticeMessage({ message: 'bulletin not saved...', duration: FLASH_DURATION_MS }))
  }
}

// ==================== Avatar ====================

export function* CheckAvatar({ payload }) {
  const db_avatar = yield call(() => dbAPI.getAvatarByAddress(payload.address))
  if (db_avatar === null) {
    yield call(() => dbAPI.addAvatar(payload.address, GenesisHash, 0, Epoch, Epoch, null, false))
  } else if (db_avatar.is_saved === false && db_avatar.json !== null) {
    yield call(RequestAvatarFile, { address: db_avatar.address, hash: db_avatar.hash })
  }
}

export function* SaveSelfAvatar({ payload }) {
  try {
    const seed = yield select(state => state.User.Seed)
    if (!seed) {
      return
    }
    const address = yield select(state => state.User.Address)
    const db_avatar = yield call(() => dbAPI.getAvatarByAddress(address))
    const avatar_json = yield call(() => mgAPI.genAvatarJson(seed, payload.hash, payload.size, payload.timestamp))
    if (db_avatar !== null) {
      yield call(() => dbAPI.updateAvatar(address, payload.hash, payload.size, payload.timestamp, payload.timestamp, avatar_json, true))
    } else {
      yield call(() => dbAPI.addAvatar(address, payload.hash, payload.size, payload.timestamp, payload.timestamp, avatar_json, true))
    }

    const avatar_response = {
      ObjectType: ObjectType.AvatarList,
      List: [avatar_json]
    }
    yield call(SendMessage, { msg: JSON.stringify(avatar_response) })
  } catch (e) {
    Logger.error('[SaveSelfAvatar] failed:', e.message)
  }
}

export function* AvatarRequest({ payload }) {
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    return
  }
  let timestamp = Date.now()
  const old_avatar_list = yield call(() => dbAPI.getAvatarOldList())
  let list = []
  for (let i = 0; i < old_avatar_list.length; i++) {
    const avatar = old_avatar_list[i]
    if (avatar.updated_at < timestamp - Hour || payload.flag) {
      list.push({ Address: avatar.address, SignedAt: avatar.signed_at })
      yield call(() => dbAPI.updateAvatarUpdatedAt(avatar.address, timestamp))
    }
  }
  if (list.length > 0) {
    const avatar_request = yield call(() => mgAPI.genAvatarRequest(seed, list))
    yield call(SendMessage, { msg: avatar_request })
  }
}

export function* RequestAvatarFile(payload) {
  if (payload.hash === GenesisHash) {
    return
  }
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    return
  }

  const nonce = genFileNonce()
  const tmp = {
    Type: FileRequestType.Avatar,
    Nonce: nonce,
    Hash: payload.hash,
    Address: payload.address,
    Timestamp: Date.now()
  }
  pushFileRequest(tmp)

  const avatar_file_request = yield call(() => mgAPI.genFileRequest(seed, FileRequestType.Avatar, payload.hash, nonce, 1))
  yield call(SendMessage, { key: payload.key, msg: avatar_file_request })
}

// ==================== Bulletin Loading ====================

export function* RequestNextBulletin({ payload }) {
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    return
  }
  const last_bulletin = yield call(() => dbAPI.getLastBulletin(payload.address))
  let request_sequence = 1
  if (last_bulletin !== null) {
    request_sequence = last_bulletin.sequence + 1
  }
  const bulletin_request = yield call(() => mgAPI.genBulletinRequest(seed, payload.address, request_sequence, payload.address))
  yield call(SendMessage, { key: payload.key, msg: bulletin_request })
}

export function* LoadPortalBulletin({ payload }) {
  try {
    const bulletins = yield call(() => dbAPI.getPortalBulletins(payload.page))
    const total = yield call(() => dbAPI.getPortalBulletinCount())
    const total_page = calcTotalPage(total, BulletinPageSize)
    yield put(setPortalBulletinList({ List: bulletins, Page: payload.page, TotalPage: total_page }))
  } catch (e) {
    Logger.error('[LoadPortalBulletin] failed:', e.message)
  }
}

export function* RefreshPortalBulletin() {
  const page = yield select(state => state.Messenger.PortalBulletinPage)
  yield fork(LoadPortalBulletin, { payload: { page: page } })
}

export function* LoadMineBulletinSequence() {
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    return
  }
  const address = yield select(state => state.User.Address)
  const bulletin_count = yield call(() => dbAPI.getAddressBulletinCount(address))
  yield put(setCurrentBulletinSequence(bulletin_count))
  // Also request own bulletins from server (for first login on new device or after DB clear)
  yield call(FetchMineBulletin)
}

/**
 * Fetch the current user's own bulletins from the server.
 * Requests the next sequence number that is missing from local DB,
 * so the server can push any bulletins not yet cached locally.
 */
export function* FetchMineBulletin() {
  try {
    const seed = yield select(state => state.User.Seed)
    const address = yield select(state => state.User.Address)
    if (!seed || !address) return

    const local_last = yield call(() => dbAPI.getLastBulletin(address))
    const request_sequence = local_last === null ? 1 : local_last.sequence + 1

    // Request from server starting at the next missing sequence
    const bulletin_request = yield call(() => mgAPI.genBulletinRequest(seed, address, request_sequence, address))
    yield call(SendMessage, { msg: bulletin_request })
  } catch (e) {
    Logger.error('[FetchMineBulletin] failed:', e.message)
  }
}

export function* LoadAddressBulletin({ payload }) {
  try {
    const bulletins = yield call(() => dbAPI.getAddressBulletins(payload.address, payload.page))
    const total = yield call(() => dbAPI.getAddressBulletinCount(payload.address))
    const total_page = calcTotalPage(total, BulletinPageSize)
    yield put(setAddressBulletinList({ List: bulletins, Page: payload.page, TotalPage: total_page }))
  } catch (e) {
    Logger.error('[LoadAddressBulletin] failed:', e.message)
  }
}

export function* FetchFollowBulletin() {
  try {
    const address = yield select(state => state.User.Address)
    const follow_list = yield call(() => dbAPI.getMyFollows(address))
    for (let i = 0; i < follow_list.length; i++) {
      const remote_last_bulletin = yield call(() => dbAPI.getLastBulletin(follow_list[i].remote))
      const remote_bulletin_count = yield call(() => dbAPI.getBulletinCountByAddresses([follow_list[i].remote]))
      if (remote_last_bulletin === null) {
        yield fork(RequestNextBulletin, { payload: { address: follow_list[i].remote } })
      } else if (remote_last_bulletin.sequence === remote_bulletin_count) {
        yield fork(RequestNextBulletin, { payload: { address: follow_list[i].remote } })
      } else {
        for (let j = 1; j <= remote_last_bulletin.sequence; j++) {
          const tmp = yield call(() => dbAPI.getBulletinBySequence(follow_list[i].remote), j)
          if (tmp === null) {
            const seed = yield select(state => state.User.Seed)
            const bulletin_request = yield call(() => mgAPI.genBulletinRequest(seed, follow_list[i].remote, j, follow_list[i].remote))
            yield call(SendMessage, { msg: bulletin_request })
          }
        }
      }
    }
  } catch (e) {
    Logger.error('[FetchFollowBulletin] failed:', e.message)
  }
}

export function* LoadFollowBulletin({ payload }) {
  try {
    const address = yield select(state => state.User.Address)
    const follow_list = yield call(() => dbAPI.getMyFollows(address))
    if (follow_list.length > 0) {
      const follow_address_list = []
      for (let i = 0; i < follow_list.length; i++) {
        const follow = follow_list[i]
        follow_address_list.push(follow.remote)
      }
      const bulletins = yield call(() => dbAPI.getBulletinListByAddresses(follow_address_list, payload.page, 'DESC'))
      const total = yield call(() => dbAPI.getBulletinCountByAddresses(follow_address_list))
      const total_page = calcTotalPage(total, BulletinPageSize)
      yield put(setFollowBulletinList({ List: bulletins, Page: payload.page, TotalPage: total_page }))
    } else {
      yield put(setFollowBulletinList({ List: [], Page: 0, TotalPage: 0 }))
    }
  } catch (e) {
    Logger.error('[LoadFollowBulletin] failed:', e.message)
  }
}

export function* RefreshFollowBulletin() {
  const page = yield select(state => state.Messenger.FollowBulletinPage)
  yield fork(LoadFollowBulletin, { payload: { page: page } })
}

export function* LoadBookmarkBulletin({ payload }) {
  try {
    const bulletins = yield call(() => dbAPI.getBulletinListByIsmark(payload.page))
    const total = yield call(() => dbAPI.getBulletinCountByIsmark())
    const total_page = calcTotalPage(total, BulletinPageSize)
    yield put(setBookmarkBulletinList({ List: bulletins, Page: payload.page, TotalPage: total_page }))
  } catch (e) {
    Logger.error('[LoadBookmarkBulletin] failed:', e.message)
  }
}

export function* LoadBulletin(action) {
  try {
    yield put(setDisplayBulletin(null))
    const seed = yield select(state => state.User.Seed)
    if (!seed) {
      return
    }

    const bulletin = yield call(() => dbAPI.getBulletinByHash(action.payload.hash))
    if (bulletin === null) {
      let to = action.payload.address
      if (action.payload.to) {
        to = action.payload.to
      }
      const msg = yield call(() => mgAPI.genBulletinRequest(seed, action.payload.address, action.payload.sequence, to))
      yield call(SendMessage, { msg: msg })
    }
    yield put(setDisplayBulletin(bulletin))
  } catch (e) {
    Logger.error('[LoadBulletin] failed for', action.payload.hash, e.message)
  }
}

export function* RequestRandomBulletin() {
  yield put(setRandomBulletinList([]))
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    return
  }
  const random_bulletin_request = yield call(() => mgAPI.genRandomBulletinRequest(seed))
  yield call(SendMessage, { flag: true, msg: random_bulletin_request })
}

export function* RequestServerAddress({ payload }) {
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    return
  }
  const bulletin_address_request = yield call(() => mgAPI.genServerAddressRequest(seed, payload.page))
  yield call(SendMessage, { key: payload.url, msg: bulletin_address_request })
}

export function* RequestReplyBulletin({ payload }) {
  try {
    yield put(setDisplayBulletinReplyList({ List: [], Page: 1, TotalPage: 1 }))
    const connect_status = yield select(state => state.Messenger.MessengerConnStatus)
    if (!connect_status) {
      const display_bulletin = yield select(state => state.Messenger.DisplayBulletin)
      const reply_hash_list = yield call(() => dbAPI.getReplyHashListByBulletinHash(display_bulletin.hash, payload.page))
      const replys = yield call(() => dbAPI.getBulletinListByHash(reply_hash_list))
      const reply_count = yield call(() => dbAPI.getReplyCount(display_bulletin.hash))
      const total_page = calcTotalPage(reply_count, BulletinPageSize)
      yield put(setDisplayBulletinReplyList({ List: replys, Page: 1, TotalPage: total_page }))
    } else {
      const seed = yield select(state => state.User.Seed)
      if (!seed) {
        return
      }
      const reply_bulletin_request = yield call(() => mgAPI.genReplyBulletinRequest(seed, payload.hash, payload.page))
      yield call(SendMessage, { msg: reply_bulletin_request })
    }
  } catch (e) {
    Logger.error('[RequestReplyBulletin] failed:', e.message)
  }
}

export function* RequestTagBulletin({ payload }) {
  try {
    yield put(setTagBulletinList({ List: [], Page: 1, TotalPage: 1 }))
    const connect_status = yield select(state => state.Messenger.MessengerConnStatus)
    if (!connect_status) {
      const tag_ids = yield call(() => dbAPI.getTagIdListByName(payload.tag))
      const bulletin_hashes = yield call(() => dbAPI.getBulletinHashListByTagId(tag_ids, payload.page))
      const bulletins = yield call(() => dbAPI.getBulletinListByHash(bulletin_hashes))
      const total = yield call(() => dbAPI.getBulletinHashCountByTagId(tag_ids))
      const total_page = calcTotalPage(total, BulletinPageSize)
      yield put(setTagBulletinList({ List: bulletins, Page: 1, TotalPage: total_page }))
    } else {
      const seed = yield select(state => state.User.Seed)
      if (!seed) {
        return
      }
      const tag_bulletin_request = yield call(() => mgAPI.genTagBulletinRequest(seed, payload.tag, payload.page))
      yield call(SendMessage, { msg: tag_bulletin_request })
    }
  } catch (e) {
    Logger.error('[RequestTagBulletin] failed:', e.message)
  }
}

// ==================== Bulletin Publish ====================

export function* PublishBulletin(action) {
  try {
    const seed = yield select(state => state.User.Seed)
    if (!seed) {
      return
    }
    const address = yield select(state => state.User.Address)
    const tag = yield select(state => state.Messenger.PublishTagList)
    const quote = yield select(state => state.Messenger.PublishQuoteList)
    const file = yield select(state => state.Messenger.PublishFileList)
    const last_bulletin = yield call(() => dbAPI.getLastBulletin(address))
    let bulletin_json
    let timestamp = Date.now()
    if (last_bulletin === null) {
      bulletin_json = yield call(() => mgAPI.genBulletinJson(seed, 1, GenesisHash, tag, quote, file, action.payload.content, timestamp))
    } else {
      bulletin_json = yield call(() => mgAPI.genBulletinJson(seed, last_bulletin.sequence + 1, last_bulletin.hash, tag, quote, file, action.payload.content, timestamp))
    }
    const bulletin_json_hash = QuarterSHA512Message(bulletin_json)
    const result = yield call(() => dbAPI.addBulletin(bulletin_json_hash, address, bulletin_json.Sequence, bulletin_json.PreHash, bulletin_json.Content, bulletin_json, bulletin_json.Timestamp))
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
    yield fork(RefreshPortalBulletin)
    const bulletin_address = yield select(state => state.Messenger.BulletinAddress)
    if (bulletin_address === address) {
      yield fork(LoadAddressBulletin, { payload: { address: address, page: 1 } })
    }
    yield call(SendMessage, { msg: JSON.stringify(bulletin_json) })
  } catch (e) {
    Logger.error('[PublishBulletin] failed:', e.message)
  }
}

export function* BulletinTagAdd({ payload }) {
  const old_list = yield select(state => state.Messenger.PublishTagList)
  let new_list = [...old_list, ...payload.tag_list]
  new_list = [...new Set(new_list)]
  if (new_list.length > ListItemMax) {
    new_list.shift()
  }
  yield put(setPublishTagList(new_list))
}

export function* BulletinTagDel({ payload }) {
  const old_list = yield select(state => state.Messenger.PublishTagList)
  let new_list = [...old_list]
  new_list = new_list.filter(t => t !== payload.Tag)
  yield put(setPublishTagList(new_list))
}

export function* BulletinQuoteAdd({ payload }) {
  const old_list = yield select(state => state.Messenger.PublishQuoteList)
  for (let i = 0; i < old_list.length; i++) {
    const quote = old_list[i]
    if (quote.Hash === payload.Hash) {
      return
    }
  }
  const new_list = [...old_list, payload]
  if (new_list.length > ListItemMax) {
    new_list.shift()
  }
  yield put(setPublishQuoteList(new_list))
}

export function* BulletinQuoteDel({ payload }) {
  const old_list = yield select(state => state.Messenger.PublishQuoteList)
  let new_list = [...old_list]
  new_list = new_list.filter(q => q.Hash !== payload.Hash)
  yield put(setPublishQuoteList(new_list))
}

export function* BulletinReply({ payload }) {
  yield call(BulletinQuoteAdd, { payload: payload })
  yield put(setPublishFlag(true))
}

export function* BulletinQuote({ payload }) {
  yield call(BulletinQuoteAdd, { payload: payload })
  yield put(setFlashNoticeMessage({ message: 'quote success', duration: FLASH_DURATION_MS }))
}

export function* saveLocalFile(hash, content) {
  const base_dir = yield select(state => state.Common.AppBaseDir)
  const hash_subpath = buildFileSubPath(hash)
  const file_dir = yield call(() => path.join(base_dir, FileDir, ...hash_subpath))
  yield call(() => mkdir(file_dir, { recursive: true }))
  const save_file_path = yield call(() => path.join(file_dir, hash))
  yield call(() => writeFile(save_file_path, content))
}

export function* BulletinFileAdd({ payload }) {
  try {
    const file_path = payload.file_path
    const fileNameWithExt = yield call(() => path.basename(file_path))
    const ext = yield call(() => path.extname(fileNameWithExt))
    const name = yield call(() => path.basename(fileNameWithExt, ext))
    const file_info = yield call(() => stat(file_path))
    if (file_info.size > FileMaxSize) {
      yield put(setFlashNoticeMessage({ message: `file size too large(more than ${filesize_format(FileMaxSize)})...`, duration: FLASH_DURATION_MS }))
    } else {
      const content = yield call(() => readFile(file_path))
      const hash = FileHash(content)

      const chunk_length = Math.ceil(file_info.size / FileChunkSize)
      const file = yield call(() => dbAPI.getFileByHash(hash))
      if (file === null) {
        yield call(() => saveLocalFile(hash, content))
        yield call(() => dbAPI.addFile(hash, file_info.size, Date.now(), chunk_length, chunk_length, true))
      } else {
        yield call(() => saveLocalFile(hash, content))
        yield call(() => dbAPI.localFileSaved(hash, chunk_length, Date.now()))
      }

      const new_file = {
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
      if (new_list.length > ListItemMax) {
        new_list.shift()
      }
      yield put(setPublishFileList(new_list))
    }
  } catch (e) {
    Logger.error('[BulletinFileAdd] failed:', e.message)
  }
}

export function* BulletinFileDel({ payload }) {
  const old_list = yield select(state => state.Messenger.PublishFileList)
  let new_list = [...old_list]
  new_list = new_list.filter(f => f.Hash !== payload.Hash)
  yield put(setPublishFileList(new_list))
}

export function* BulletinMarkToggle({ payload }) {
  const bulletin_db = yield call(() => dbAPI.getBulletinByHash(payload.hash))
  if (bulletin_db !== null) {
    yield call(() => dbAPI.toggleBulletinMark(payload.hash, !bulletin_db.is_marked))
  }
}

export function* SubscribeFollow() {
  const seed = yield select(state => state.User.Seed)
  if (!seed) {
    return
  }
  const follow_list = yield select(state => state.User.FollowList)
  const subscribe_request = yield call(() => mgAPI.genBulletinSubscribe(seed, follow_list))
  yield call(SendMessage, { msg: JSON.stringify(subscribe_request) })
}
