import { call, delay, fork, select } from 'redux-saga/effects'
import Logger from '../../lib/Logger'
import { dbAPI } from '../../db'
import { createMultiWsChannel, sendToAllConn, sendToFirstConn, sendToSingleConn } from '../../lib/WebsocketUtil'
import { genNonce } from '../../lib/MessengerUtil'
import { FILE_REQUEST_TTL_MS } from '../../lib/AppConst'

/** Module-level mutable state for tracking active file transfer requests. */
let _FileRequestList = []

export function getFileRequestList() {
  return _FileRequestList
}

export function setFileRequestList(value) {
  _FileRequestList = value
}

export function pushFileRequest(item) {
  const now = Date.now()
  _FileRequestList = _FileRequestList.filter(r => r.Timestamp + FILE_REQUEST_TTL_MS > now)
  _FileRequestList.push(item)
}

/**
 * Safe fork wrapper — runs a saga in the background and catches any errors.
 * `fork` never rejects its Task, so errors in forked sagas are silently swallowed.
 * Use as: yield fork(safeFork, sagaFn, ...args)
 */
export function* safeFork(sagaFn, ...args) {
  try {
    yield call(sagaFn, ...args)
  } catch (e) {
    Logger.error(`[safeFork] error in ${sagaFn.name}:`, e.message)
  }
}

/**
 * Unified message sender.
 * Routes to a specific connection (payload.key), highest-priority server (payload.flag), or all connections.
 */
export function* SendMessage(payload) {
  try {
    Logger.debug('!!!send message: ', payload)
    if (payload.key) {
      yield call(sendToSingleConn, payload.key, payload.msg)
    } else if (payload.flag) {
      const priority_server_list = yield call(() => dbAPI.getServerListByPriority())
      yield call(sendToFirstConn, priority_server_list, payload.msg)
    } else {
      yield call(sendToAllConn, payload.msg)
    }
  } catch (e) {
    Logger.error('[SendMessage] failed to send message:', e.message, { key: payload.key, flag: payload.flag })
  }
}

/** Connect to all servers marked as is_connect in the ServerList. */
export function* ConnectServer() {
  try {
    const ServerList = yield select(state => state.Messenger.ServerList)
    const configs = ServerList.filter(s => s.is_connect)
    // 500ms grace before opening WebSocket connections: allows any pending
    // Redux actions (e.g., server list updates from a prior navigation) to
    // settle so we connect against the latest config rather than a stale one.
    yield delay(500)
    yield call(createMultiWsChannel, configs)
  } catch (e) {
    Logger.error('[ConnectServer] failed to connect servers:', e.message)
  }
}

/** Generate a unique nonce that does not collide with existing file requests. */
export function genFileNonce() {
  for (let attempts = 0; attempts < 10; attempts++) {
    let nonce = genNonce()
    let collision = false
    for (let i = 0; i < _FileRequestList.length; i++) {
      if (_FileRequestList[i].Nonce === nonce) {
        collision = true
        break
      }
    }
    if (!collision) return nonce
  }
  throw new Error('Cannot generate unique file nonce after 10 attempts')
}
