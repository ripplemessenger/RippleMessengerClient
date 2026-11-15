import * as rippleKeyPairs from 'ripple-keypairs'

/**
 * Derive an XRPL account (address + keypair) from a seed string.
 *
 * Previously this wrapped `Wallet.fromSeed()` from the `xrpl` package, but the
 * only field any caller uses is `classicAddress`, and both branches of the old
 * if/else were identical. `ripple-keypairs` already provides exactly this
 * derivation and is the library used everywhere else in the app, so depending
 * on the multi-megabyte `xrpl` bundle just for this was pure weight.
 *
 * Throws if the seed is malformed — callers rely on that (OpenPage and
 * AddAccountModal catch the error and surface `error.message` to the user).
 *
 * @param {string} seed - XRPL seed string (sEd…/sn… family)
 * @returns {{seed: string, publicKey: string, privateKey: string, classicAddress: string}}
 */
function getWallet(seed) {
  const keypair = rippleKeyPairs.deriveKeypair(seed)
  return {
    seed,
    publicKey: keypair.publicKey,
    privateKey: keypair.privateKey,
    classicAddress: rippleKeyPairs.deriveAddress(keypair.publicKey)
  }
}

/**
 * Generate a brand-new XRPL seed.
 * @param {'ed25519'|'secp256k1'} [algorithm='ed25519'] - Signing algorithm
 * @returns {string} Newly generated seed string
 */
function generateSeed(algorithm = 'ed25519') {
  return rippleKeyPairs.generateSeed({ algorithm })
}

export { getWallet, generateSeed }
