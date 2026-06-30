import { eventChannel } from 'redux-saga'
import Logger from './Logger'

const manager = {
  channels: new Map(),
  messageSubscribers: [],
  RETRY_DELAY: 5000,
  MAX_RETRIES: 12
  // MAX_RETRIES: 12 * 60 * 24
}

let globalEmitter = null
/** Redux-Saga event channel that receives all WebSocket messages and status events. */
export const globalWsChannel = eventChannel(emitter => {
  globalEmitter = emitter
  return () => { globalEmitter = null }
})

function emitToGlobal(action) {
  if (globalEmitter) {
    globalEmitter(action)
  }
}

/**
 * Close WebSocket connections that are no longer in the config list.
 * @param {Array<{key: string, url: string}>} configs - Current connection configurations
 */
export function cleanupRemovedConnections(configs) {
  const currentKeys = new Set(manager.channels.keys())
  const keepKeys = new Set(configs.map(c => c.key))

  currentKeys.forEach(key => {
    if (!keepKeys.has(key)) {
      const entry = manager.channels.get(key)
      if (entry && entry.ws) {
        Logger.info(`[WS] Closing removed connection: ${key}`)
        entry.ws.close(1000, 'Removed from new config')
      }
      manager.channels.delete(key)
    }
  })
}

/**
 * Close all managed WebSocket connections and clear the channel map.
 */
export function disconnectAllWebsockets() {
  manager.channels.forEach((entry) => {
    if (entry.ws) {
      entry.ws.close(1000, 'Intentional disconnect all')
    }
  })
  manager.channels.clear()
}

/**
 * Create or maintain WebSocket connections for the given server configurations.
 * Reuses existing open connections; reconnects dropped ones with exponential backoff.
 * Returns a Redux-Saga event channel (no-op events) for lifecycle management.
 * @param {Array<{key: string, url: string}>} configs - Server connection configurations
 * @returns {import('redux-saga').EventChannel} Event channel for saga consumption
 */
export function createMultiWsChannel(configs) {
  cleanupRemovedConnections(configs)

  configs.forEach((cfg) => {
    const { key, url } = cfg
    const existing = manager.channels.get(key)
    if (existing && existing.ws && existing.ws.readyState === WebSocket.OPEN) {
      Logger.info(`[WS] Keeping existing connection: ${key}`)
      return
    }

    let retryCount = 0

    function connect() {
      const ws = new WebSocket(url)
      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        manager.channels.set(key, { ws, config: cfg, retryCount: 0 })
        Logger.info(`[WS] Connected: ${key} → ${url}`)
        emitToGlobal({ type: 'status', key, status: WebSocket.OPEN })
      }

      ws.onclose = (ev) => {
        Logger.info(`[WS] Closed: ${key} (code: ${ev.code}) (wasClean: ${ev.wasClean})`)
        emitToGlobal({ type: 'status', key, status: WebSocket.CLOSED, code: ev.code, wasClean: ev.wasClean })
        manager.channels.delete(key)

        if ((!ev.wasClean || (ev.code !== 1000 && ev.code !== 1001)) && retryCount < manager.MAX_RETRIES) {
          retryCount++
          Logger.info(`[WS] Reconnecting ${key} in ${manager.RETRY_DELAY / 1000}s (attempt ${retryCount})`)
          setTimeout(connect, manager.RETRY_DELAY)
        }
      }

      ws.onerror = (err) => {
        emitToGlobal({ type: 'status', key, status: 'error', error: err })
        Logger.error(`[WS] Error: ${key}`, err)
      }

      ws.onmessage = (event) => {
        let data = event.data
        let isBinary = false

        if (data instanceof ArrayBuffer) {
          isBinary = true
        } else if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch {

          }
        } else if (data instanceof Blob) {
          isBinary = true
        }

        emitToGlobal({ type: 'message', key, data, isBinary })
        manager.messageSubscribers.forEach(cb => cb(key, data, isBinary))
      }
    }

    connect()
  })

  return eventChannel(() => () => { })
}

/**
 * Send a payload to a specific WebSocket connection by key.
 * Automatically handles binary (ArrayBuffer/Blob/TypedArray) and text (string/object) payloads.
 * @param {string} key - Connection identifier
 * @param {string|object|ArrayBuffer|Blob|ArrayBufferView} payload - Data to send
 * @returns {boolean} True if sent successfully
 */
export function sendToSingleConn(key, payload) {
  const entry = manager.channels.get(key)
  if (!entry || entry.ws.readyState !== WebSocket.OPEN) {
    Logger.warn(`[WS] Send failed: ${key} not open`)
    return false
  }

  if (payload instanceof ArrayBuffer || payload instanceof Blob || ArrayBuffer.isView(payload)) {
    entry.ws.send(payload)
  } else {
    const msg = typeof payload === 'string' ? payload : JSON.stringify(payload)
    entry.ws.send(msg)
  }
  return true
}

/**
 * Send a payload to all open WebSocket connections.
 * @param {string|object|ArrayBuffer|Blob|ArrayBufferView} payload - Data to send
 * @returns {number} Count of successfully sent connections
 */
export function sendToAllConn(payload) {
  let count = 0
  manager.channels.forEach((entry, key) => {
    if (entry.ws && entry.ws.readyState === WebSocket.OPEN) {
      if (sendToSingleConn(key, payload)) {
        count++
      }
    }
  })
  return count
}

/**
 * Send a payload to the first open server from a server list.
 * Iterates until it finds an open connection and sends.
 * @param {Array<{url: string}>} server_list - List of server configurations with URL keys
 * @param {string|object|ArrayBuffer|Blob|ArrayBufferView} payload - Data to send
 */
export function sendToFirstConn(server_list, payload) {
  for (let i = 0; i < server_list.length; i++) {
    const server = server_list[i]
    const entry = manager.channels.get(server.url)
    if (!entry || entry.ws.readyState !== WebSocket.OPEN) {
      Logger.warn(`[WS] Send failed: ${server.url} not open`)
      continue
    }

    if (payload instanceof ArrayBuffer || payload instanceof Blob || ArrayBuffer.isView(payload)) {
      entry.ws.send(payload)
    } else {
      const msg = typeof payload === 'string' ? payload : JSON.stringify(payload)
      entry.ws.send(msg)
    }
    return true
  }
}