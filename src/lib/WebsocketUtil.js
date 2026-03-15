import { eventChannel, END } from 'redux-saga'

const manager = {
  channels: new Map(),
  messageSubscribers: [],
  RETRY_DELAY: 5000,
  MAX_RETRIES: 8
}

let globalEmitter = null
export const globalWsChannel = eventChannel(emitter => {
  globalEmitter = emitter
  return () => { globalEmitter = null }
})

function emitToGlobal(action) {
  if (globalEmitter) {
    globalEmitter(action)
  }
}

export function cleanupRemovedConnections(configs) {
  const currentKeys = new Set(manager.channels.keys())
  const keepKeys = new Set(configs.map(c => c.key))

  currentKeys.forEach(key => {
    if (!keepKeys.has(key)) {
      const entry = manager.channels.get(key)
      if (entry && entry.ws) {
        console.log(`[WS] Closing removed connection: ${key}`)
        entry.ws.close(1000, 'Removed from new config')
      }
      manager.channels.delete(key)
    }
  })
}

export function disconnectAllWebsockets() {
  manager.channels.forEach((entry) => {
    if (entry.ws) {
      entry.ws.close(1000, 'Intentional disconnect all')
    }
  })
  manager.channels.clear()
}

export function createMultiWsChannel(configs) {
  cleanupRemovedConnections(configs)

  configs.forEach((cfg) => {
    const { key, url } = cfg
    const existing = manager.channels.get(key)
    if (existing && existing.ws && existing.ws.readyState === WebSocket.OPEN) {
      console.log(`[WS] Keeping existing connection: ${key}`)
      return
    }

    let retryCount = 0

    function connect() {
      const ws = new WebSocket(url)
      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        manager.channels.set(key, { ws, config: cfg, retryCount: 0 })
        emitToGlobal({ type: 'status', key, status: WebSocket.OPEN })
        console.log(`[WS] Connected: ${key} → ${url}`)
      }

      ws.onclose = (e) => {
        manager.channels.delete(key)
        emitToGlobal({ type: 'status', key, status: WebSocket.CLOSED, code: e.code, wasClean: e.wasClean })
        console.log(`[WS] Closed: ${key} (code: ${e.code})`)

        if (!e.wasClean && retryCount < manager.MAX_RETRIES) {
          retryCount++
          console.log(`[WS] Reconnecting ${key} in ${manager.RETRY_DELAY / 1000}s (attempt ${retryCount})`)
          setTimeout(connect, manager.RETRY_DELAY)
        }
      }

      ws.onerror = (err) => {
        emitToGlobal({ type: 'status', key, status: 'error', error: err })
        console.error(`[WS] Error: ${key}`, err)
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

export function sendToSingleConn(key, payload) {
  const entry = manager.channels.get(key)
  if (!entry || entry.ws.readyState !== WebSocket.OPEN) {
    console.warn(`[WS] Send failed: ${key} not open`)
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

export function sendToFirstConn(server_list, payload) {
  for (let i = 0; i < server_list.length; i++) {
    const server = server_list[i]
    const entry = manager.channels.get(server.url)
    if (!entry || entry.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[WS] Send failed: ${key} not open`)
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