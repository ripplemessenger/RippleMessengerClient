/**
 * LAN Sync Import Verification bridge (Client side).
 *
 * The Rust HTTP server (sync_server.rs) receives pushed messages (private/group)
 * and emits a `sync-verify-request` event. This module listens for that event,
 * runs schema + signature verification on each message (same code paths as
 * normal message handling), and answers via the `sync_verify_response` Tauri
 * command with the list of message hashes that passed.
 *
 * Design: article-22-app-backup.md step 6 —
 *   "messages: VerifyJsonSignature(json) + schema check"
 */

import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

import { checkPrivateMessageSchema, checkGroupMessageSchema } from './MessageSchemaVerifier'
import { VerifyJsonSignature } from './MessengerUtil'
import Logger from './Logger'

let unlistenFn = null

/**
 * Verify one message JSON string.
 * @param {string} jsonStr - The message JSON (string)
 * @param {string} kind - 'private' or 'group'
 * @returns {boolean} true if schema + signature both pass
 */
function verifyOne(jsonStr, kind) {
  let parsed
  try {
    parsed = JSON.parse(jsonStr)
    // Handle double-serialized JSON (string containing a JSON object)
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed)
    }
  } catch (e) {
    return false
  }

  try {
    const schemaOk = kind === 'group' ? checkGroupMessageSchema(parsed) : checkPrivateMessageSchema(parsed)
    if (!schemaOk) {
      Logger.warn(
        `[SyncVerify] ${kind} schema FAIL, keys=${Object.keys(parsed).join(',')}, json=${jsonStr.substring(0, 200)}`
      )
      return false
    }
    const sigOk = VerifyJsonSignature(parsed)
    if (!sigOk) {
      Logger.warn(`[SyncVerify] ${kind} signature FAIL`)
    }
    return sigOk
  } catch (e) {
    Logger.warn(`[SyncVerify] ${kind} verify error:`, e.message || e)
    return false
  }
}

/**
 * Register the sync-verify listener (idempotent).
 * @returns {Promise<Function|null>} unlisten function, or null if unavailable
 */
export async function setupSyncVerifyListener() {
  if (unlistenFn) {
    return unlistenFn
  }

  unlistenFn = await listen('sync-verify-request', async (event) => {
    const { id, kind, items } = event.payload || {}
    const valid = []
    try {
      for (const item of items || []) {
        if (verifyOne(item.json || '', kind)) {
          valid.push(item.hash)
        }
      }
      await invoke('sync_verify_response', { id, ok: true, valid })
    } catch (e) {
      Logger.error('[SyncVerify] error:', e.message || e)
      try {
        await invoke('sync_verify_response', { id, ok: false, valid: [] })
      } catch (_) {
        /* ignore */
      }
    }
  })

  return unlistenFn
}
