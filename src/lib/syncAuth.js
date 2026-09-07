/**
 * LAN Sync Auth bridge (Client side).
 *
 * The Rust HTTP server (sync_server.rs) receives POST /v1/auth and emits a
 * `sync-auth-request` event. This module listens for that event, does the
 * crypto with `ripple-keypairs` (same library the App uses, so signatures are
 * guaranteed compatible), and answers via the `sync_auth_response` Tauri
 * command.
 *
 * Flow (bidirectional challenge-response):
 *   1. App signs a random nonce with the account seed → {account, nonce, sig}
 *   2. We verify sig against the pubkey derived from the seed (proves App holds seed)
 *   3. We sign a fresh nonce2 with the seed → {ok, nonce2, sig2}
 *   4. App verifies sig2 (proves we hold the seed — prevents fake server)
 */

import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import * as rippleKeyPairs from 'ripple-keypairs'

import { store } from '../store'
import Logger from './Logger'

/**
 * Generate a random hex string of the given byte length.
 * @param {number} bytes - Number of random bytes
 * @returns {string} Hex string (2*bytes chars)
 */
function randomHex(bytes) {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

let unlistenFn = null
let unlistenDeviceFn = null

/**
 * Register the sync-device listener (idempotent).
 * Responds to `sync-device-request` with the current logged-in address.
 * @returns {Promise<Function|null>} unlisten function, or null if unavailable
 */
export async function setupSyncDeviceListener() {
  if (unlistenDeviceFn) {
    return unlistenDeviceFn
  }

  unlistenDeviceFn = await listen('sync-device-request', async (event) => {
    const { id } = event.payload || {}
    try {
      const seed = store.getState().User.Seed
      if (!seed) {
        await invoke('sync_device_response', { id, address: '' })
        return
      }
      const keypair = rippleKeyPairs.deriveKeypair(seed)
      const address = rippleKeyPairs.deriveAddress(keypair.publicKey)
      await invoke('sync_device_response', { id, address })
    } catch (e) {
      Logger.error('[SyncDevice] error:', e.message || e)
      try {
        await invoke('sync_device_response', { id, address: '' })
      } catch (_) {
        /* ignore */
      }
    }
  })

  return unlistenDeviceFn
}

/**
 * Register the sync-auth listener (idempotent).
 * @returns {Promise<Function|null>} unlisten function, or null if unavailable
 */
export async function setupSyncAuthListener() {
  if (unlistenFn) {
    return unlistenFn
  }

  unlistenFn = await listen('sync-auth-request', async (event) => {
    const { id, account, nonce, sig } = event.payload || {}
    try {
      const seed = store.getState().User.Seed
      if (!seed) {
        Logger.warn('[SyncAuth] no seed in store, rejecting')
        await invoke('sync_auth_response', { id, ok: false, nonce2: '', sig2: '' })
        return
      }

      const keypair = rippleKeyPairs.deriveKeypair(seed)

      // The account must match the address derived from the logged-in seed
      // (shared account = trust anchor; reject if the App claims a different account)
      const derivedAddress = rippleKeyPairs.deriveAddress(keypair.publicKey)
      if (derivedAddress !== account) {
        Logger.warn(`[SyncAuth] account mismatch: claimed=${account} derived=${derivedAddress}`)
        await invoke('sync_auth_response', { id, ok: false, nonce2: '', sig2: '' })
        return
      }

      // Verify the App's signature (proves App holds the seed)
      let valid = false
      try {
        valid = rippleKeyPairs.verify(nonce, sig, keypair.publicKey)
      } catch (e) {
        valid = false
      }
      if (!valid) {
        Logger.warn(`[SyncAuth] invalid signature from ${account}`)
        await invoke('sync_auth_response', { id, ok: false, nonce2: '', sig2: '' })
        return
      }

      // Sign a fresh nonce2 with the seed (proves we hold the seed)
      const nonce2 = randomHex(16)
      const sig2 = rippleKeyPairs.sign(nonce2, keypair.privateKey)
      await invoke('sync_auth_response', { id, ok: true, nonce2, sig2 })
    } catch (e) {
      Logger.error('[SyncAuth] error:', e.message || e)
      try {
        await invoke('sync_auth_response', { id, ok: false, nonce2: '', sig2: '' })
      } catch (_) {
        /* ignore */
      }
    }
  })

  return unlistenFn
}
