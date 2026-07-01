import { Wallet, ECDSA } from 'xrpl'
import { TestNetURL } from './RippleConst.js'
import { DefaultServer } from './MessengerConst.js'

/**
 * Create an XRPL Wallet from a seed string.
 * Uses Ed25519 for testnet and secp256k1 for mainnet.
 * Defaults to mainnet (secp256k1) when server_url is not specified.
 * @param {string} seed - ED- prefixed seed string
 * @param {string} [server_url=DefaultServer] - Server URL to determine network type
 * @returns {Wallet} XRPL Wallet instance
 */
function getWallet(seed, server_url = DefaultServer) {
  if (server_url === TestNetURL) {
    return Wallet.fromSeed(seed)
  } else {
    return Wallet.fromSeed(seed, { algorithm: ECDSA.secp256k1 })
  }
}

export {
  getWallet
}