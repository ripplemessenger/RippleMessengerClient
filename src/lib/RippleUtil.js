import { Wallet, ECDSA } from 'xrpl'
import { TestNetURL } from './RippleConst.js'

function getWallet(seed, server_url) {
  if (server_url === TestNetURL) {
    return Wallet.fromSeed(seed)
  } else {
    return Wallet.fromSeed(seed, { algorithm: ECDSA.secp256k1 })
  }
}

export {
  getWallet
}