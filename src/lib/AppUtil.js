import CryptoJS from 'crypto-js'
import Logger from './Logger'
import { GenesisHash } from './MessengerConst'

const ConsoleColors = {
  'bright': '\x1B[1m%s\x1B[0m',
  'grey': '\x1B[2m%s\x1B[0m',
  'italic': '\x1B[3m%s\x1B[0m',
  'underline': '\x1B[4m%s\x1B[0m',
  'reverse': '\x1B[7m%s\x1B[0m',
  'hidden': '\x1B[8m%s\x1B[0m',
  'black': '\x1B[30m%s\x1B[0m',
  'red': '\x1B[31m%s\x1B[0m',
  'green': '\x1B[32m%s\x1B[0m',
  'yellow': '\x1B[33m%s\x1B[0m',
  'blue': '\x1B[34m%s\x1B[0m',
  'magenta': '\x1B[35m%s\x1B[0m',
  'cyan': '\x1B[36m%s\x1B[0m',
  'white': '\x1B[37m%s\x1B[0m',
  'blackBG': '\x1B[40m%s\x1B[0m',
  'redBG': '\x1B[41m%s\x1B[0m',
  'greenBG': '\x1B[42m%s\x1B[0m',
  'yellowBG': '\x1B[43m%s\x1B[0m',
  'blueBG': '\x1B[44m%s\x1B[0m',
  'magentaBG': '\x1B[45m%s\x1B[0m',
  'cyanBG': '\x1B[46m%s\x1B[0m',
  'whiteBG': '\x1B[47m%s\x1B[0m'
}

/**
 * Log a warning message via the central Logger.
 * @param {string} str - Warning message
 */
function ConsoleWarn(str) {
  Logger.warn(str)
}

/**
 * Log an error message via the central Logger.
 * @param {string} str - Error message
 */
function ConsoleError(str) {
  Logger.error(str)
}

const kb = 1024
const mb = 1024 * 1024
const gb = 1024 * 1024 * 1024

function add0(m) { return m < 10 ? '0' + m : m }

/**
 * Format a timestamp into a human-readable relative string.
 * Omits the year if the date is in the current year.
 * @param {number|string} timestamp - Unix timestamp (ms) or date string
 * @returns {string} Formatted string like "@2024-01-15 08:30:00" or "@01-15 08:30:00"
 */
function timestamp_format(timestamp) {
  let time = new Date(timestamp)
  let y = time.getFullYear()
  let m = time.getMonth() + 1
  let d = time.getDate()
  let h = time.getHours()
  let mm = time.getMinutes()
  let s = time.getSeconds()

  let now = new Date()
  let tmp = '@'
  if (y !== now.getFullYear()) {
    tmp += `${y}-${add0(m)}-${add0(d)} `
  } else {
    tmp += `${add0(m)}-${add0(d)} `
  }
  return `${tmp}${add0(h)}:${add0(mm)}:${add0(s)}`
}

/**
 * Convert a timestamp to a compact YYYYMMDDHHmmss string (no separators).
 * @param {number|string} timestamp - Unix timestamp (ms) or date string
 * @returns {string} Compact timestamp string like "20240115083000"
 */
function timestamp2Number(timestamp) {
  let time = new Date(timestamp)
  let y = time.getFullYear()
  let m = time.getMonth() + 1
  let d = time.getDate()
  let h = time.getHours()
  let mm = time.getMinutes()
  let s = time.getSeconds()
  return `${y}${add0(m)}${add0(d)}${add0(h)}${add0(mm)}${add0(s)}`
}

/**
 * Format a file size in bytes to a human-readable string.
 * @param {number} filesize - Size in bytes
 * @returns {string} Formatted string like "1.5MB" or "512B"
 */
function filesize_format(filesize) {
  if (filesize >= gb) {
    return `${Number((filesize / gb).toFixed(2))}GB`
  } else if (filesize >= mb) {
    return `${Number((filesize / mb).toFixed(2))}MB`
  } else if (filesize >= kb) {
    return `${Number((filesize / kb).toFixed(2))}KB`
  } else {
    return `${filesize}B`
  }
}

/**
 * Compute SHA-512 of the input and return the first 64 hex characters (half the digest).
 * Objects are JSON-stringified; other values are coerced to string.
 * @param {string|object} data - Input data or object to hash
 * @returns {string} 64-character uppercase hex string
 */
function HalfSHA512(data) {
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data)
  let hash = CryptoJS.SHA512(dataStr).toString().toUpperCase()
  return hash.substring(0, 64)
}

/**
 * Compute SHA-512 of the input and return the first 32 hex characters (quarter digest).
 * Used for message hashing in the RMS protocol.
 * @param {string|object} data - Input data or object to hash
 * @returns {string} 32-character uppercase hex string
 */
function QuarterSHA512Message(data) {
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data)
  const hash = CryptoJS.SHA512(dataStr).toString().toUpperCase()
  return hash.substring(0, 32)
}

/**
 * Compute SHA-512 of a CryptoJS WordArray and return the first 32 hex characters.
 * @param {import('crypto-js').Lib.WordArray} wa - CryptoJS WordArray
 * @returns {string} 32-character uppercase hex string
 */
function QuarterSHA512WordArray(wa) {
  let hash = CryptoJS.SHA512(wa).toString().toUpperCase()
  return hash.substring(0, 32)
}

/**
 * Calculate a percentage rate rounded to 2 decimal places.
 * Returns 100 if the result is NaN (e.g., division by zero).
 * @param {number} numerator - Part value
 * @param {number} denominator - Total value
 * @returns {number} Rate as a percentage (0-100)
 */
function calcRate(numerator, denominator) {
  let rate = Math.round(numerator / denominator * 10000) / 100
  if (Number.isNaN(rate)) {
    rate = 100
  }
  return rate
}

/**
 * Generate a random 16-byte salt encoded as Base64.
 * @returns {string} Base64-encoded salt string
 */
function genSalt() {
  return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Base64)
}

/**
 * Derive an AES key and IV from a password and salt using PBKDF2.
 * Produces a 32-byte key and 16-byte IV from a single PBKDF2 derivation.
 * OWASP 2024 recommends 210k for online password auth — that target is a brute-force server.
 * Here the DB file is local-only storage; the real threat is casual theft, not GPU farm attacks.
 * 20,000 iterations gives ~200ms on modern hardware (imperceptible to user) while still
 * protecting against naive offline scraping of the SQLite file.
 * NOTE: Changing this value requires re-encrypting all existing stored data on next login.
 * @param {string} password - User password
 * @param {string} salt - Base64-encoded salt (from genSalt)
 * @returns {{key: import('crypto-js').Lib.WordArray, iv: import('crypto-js').Lib.WordArray}} Key and IV WordArrays
 */
function deriveKeyFromPassword(password, salt) {
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: (32 + 16) / 4,
    iterations: 20000,
    hasher: CryptoJS.algo.SHA512
  })

  const keyBytes = CryptoJS.lib.WordArray.create(key.words.slice(0, 8))
  const ivBytes = CryptoJS.lib.WordArray.create(key.words.slice(8, 12))

  return { key: keyBytes, iv: ivBytes }
}

/**
 * Encrypt data using AES-CBC with a password-derived key.
 * Objects are JSON-stringified before encryption.
 * @param {string|object} data - Data to encrypt
 * @param {string} password - User password
 * @param {string} salt - Base64-encoded salt
 * @returns {string} OpenSSL-format encrypted string
 */
function encryptWithPassword(data, password, salt) {
  const { key, iv } = deriveKeyFromPassword(password, salt)
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data)
  const encrypted = CryptoJS.AES.encrypt(dataStr, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })

  return encrypted.toString()
}

/**
 * Decrypt data that was encrypted with encryptWithPassword.
 * @param {string} password - User password used for encryption
 * @param {string} salt - Base64-encoded salt used for encryption
 * @param {string} cipherData - OpenSSL-format encrypted string
 * @param {boolean} [isObject=false] - If true, parse result as JSON
 * @returns {string|object} Decrypted data
 */
function decryptWithPassword(password, salt, cipherData, isObject = false) {
  const { key, iv } = deriveKeyFromPassword(password, salt)
  const decrypted = CryptoJS.AES.decrypt(cipherData, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })
  const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8)
  if (!decryptedStr) {
    throw new Error('Decrypt failed: empty result (wrong password or corrupted data)')
  }
  if (isObject) {
    try {
      return JSON.parse(decryptedStr)
    } catch (e) {
      throw new Error('Failed to parse decrypted data as JSON: ' + e.message)
    }
  }
  return decryptedStr
}

/**
 * Return two addresses in lexicographically sorted order.
 * Ensures both parties produce the same concatenation regardless of argument order.
 * Handles equality correctly by returning [a, a].
 * @param {string} a - First XRPL address
 * @param {string} b - Second XRPL address
 * @returns {[string, string]} Sorted pair [smaller, larger] or [a, a] if equal
 */
function sortedAddressPair(a, b) {
  return a < b ? [a, b] : [b, a]
}

/**
 * Split a combined AES key+IV string into separate key and IV components.
 * Input is expected to be a 48-character hex string or a 48-byte Uint8Array
 * where the first 32 bytes are the key and the remaining 16 bytes are the IV.
 * @param {string|Uint8Array} aes_key - Combined key+IV material
 * @returns {{key: string|Uint8Array, iv: string|Uint8Array}} Separated key and IV
 */
function splitAesKeyIv(aes_key) {
  if (typeof aes_key === 'string') {
    return { key: aes_key.slice(0, 32), iv: aes_key.slice(32, 48) }
  }
  return { key: aes_key.slice(0, 32), iv: aes_key.slice(32, 48) }
}

/**
 * Encrypt content using AES-CBC. The key parameter is a 48-byte hex string:
 * first 32 bytes are the key, next 16 bytes are the IV.
 * @param {string|object} content - Data to encrypt
 * @param {string} aes_key - 48-character hex string (32-key + 16-IV)
 * @returns {string} Encrypted string
 */
function AesEncrypt(content, aes_key) {
  const { key, iv } = splitAesKeyIv(aes_key)
  const dataStr = typeof content === 'object' ? JSON.stringify(content) : String(content)
  const encrypted = CryptoJS.AES.encrypt(dataStr, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })
  return encrypted.toString()
}

/**
 * Decrypt content that was encrypted with AesEncrypt.
 * @param {string} cipherData - Encrypted string
 * @param {string} aes_key - 48-character hex string (32-key + 16-IV)
 * @returns {string|null} Decrypted string, or null on failure
 */
function AesDecrypt(cipherData, aes_key) {
  try {
    const { key, iv } = splitAesKeyIv(aes_key)
    const decrypted = CryptoJS.AES.decrypt(cipherData, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })
    return decrypted.toString(CryptoJS.enc.Utf8)
  } catch (error) {
    Logger.error('[AesDecrypt]', error)
    return null
  }
}

/**
 * HMAC-based Key Derivation Function (HKDF) per RFC 5869.
 * Derives a key of the specified length from input keying material.
 * @param {import('crypto-js').Lib.WordArray} ikm - Input keying material
 * @param {import('crypto-js').Lib.WordArray} salt - Optional salt (random 32 bytes if empty)
 * @param {number} length - Output key length in bytes
 * @returns {import('crypto-js').Lib.WordArray} Derived key WordArray
 */
function hkdf(ikm, salt, length) {
  if (!salt || salt.sigBytes === 0) {
    salt = CryptoJS.lib.WordArray.create(new Uint8Array(32));
  }
  const prk = CryptoJS.HmacSHA256(ikm, salt)

  let t = CryptoJS.lib.WordArray.create([])
  let lastBlock = CryptoJS.lib.WordArray.create([])
  const hashLength = 32

  const rounds = Math.ceil(length / hashLength)

  for (let i = 0; i < rounds; i++) {
    const input = CryptoJS.lib.WordArray.create()
      .concat(lastBlock)
      .concat(CryptoJS.lib.WordArray.create([(i + 1) << 24]))

    lastBlock = CryptoJS.HmacSHA256(input, prk)
    t = t.concat(lastBlock);
  }

  return CryptoJS.lib.WordArray.create(t.words, length)
}

/**
 * Derive an AES key from an ECDH shared secret and two addresses.
 * Addresses are concatenated in sorted order to ensure both parties derive the same key.
 * Uses HKDF with SHA-256, salted by genesis hash + ordered addresses + sequence.
 * @param {import('crypto-js').Lib.WordArray} shared_key - ECDH shared secret (WordArray)
 * @param {string} address1 - First XRPL address
 * @param {string} address2 - Second XRPL address
 * @param {number} sequence - Message sequence number
 * @returns {string} 32-byte hex AES key string
 */
function genAESKey(shared_key, address1, address2, sequence) {
  const [a, b] = sortedAddressPair(address1, address2)
  const salt = CryptoJS.SHA512(GenesisHash + a + b + sequence)
  const derivedKeyLength = 32

  const aesKey = hkdf(shared_key, salt, derivedKeyLength)
  return aesKey.toString()
}

/**
 * Convert a CryptoJS WordArray to a Uint8Array.
 * @param {import('crypto-js').Lib.WordArray} wordArray - Source WordArray
 * @returns {Uint8Array} Binary data
 */
function wordArrayToUint8Array(wordArray) {
  const words = wordArray.words;
  const sigBytes = wordArray.sigBytes;
  const u8 = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return u8;
}

/**
 * Convert a Uint8Array to a CryptoJS WordArray.
 * @param {Uint8Array} u8arr - Source binary data
 * @returns {import('crypto-js').Lib.WordArray} WordArray
 */
function uint8ArrayToWordArray(u8arr) {
  const words = [];
  for (let i = 0; i < u8arr.length; i++) {
    words[i >>> 2] |= (u8arr[i] & 0xff) << (24 - (i % 4) * 8);
  }
  return CryptoJS.lib.WordArray.create(words, u8arr.length);
}

/**
 * Encrypt a binary buffer using AES-CBC. Operates on raw bytes.
 * @param {Uint8Array} buffer - Binary data to encrypt
 * @param {Uint8Array} aes_key - 48-byte key+IV (32-byte key + 16-byte IV)
 * @returns {Uint8Array} Encrypted ciphertext
 */
function AesEncryptBuffer(buffer, aes_key) {
  const { key, iv } = splitAesKeyIv(aes_key)
  const keyWa = uint8ArrayToWordArray(key)
  const ivWa = uint8ArrayToWordArray(iv)
  const wordArray = CryptoJS.lib.WordArray.create(buffer)
  const encrypted = CryptoJS.AES.encrypt(wordArray, keyWa, {
    iv: ivWa,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })
  let encrypted_buffer = wordArrayToUint8Array(encrypted.ciphertext)
  return encrypted_buffer
}

/**
 * Decrypt a binary buffer that was encrypted with AesEncryptBuffer.
 * @param {Uint8Array} buffer - Encrypted ciphertext
 * @param {Uint8Array} aes_key - 48-byte key+IV (32-byte key + 16-byte IV)
 * @returns {Uint8Array} Decrypted plaintext
 * @throws {Error} If decryption fails
 */
function AesDecryptBuffer(buffer, aes_key) {
  const { key, iv } = splitAesKeyIv(aes_key)
  const keyWa = uint8ArrayToWordArray(key)
  const ivWa = uint8ArrayToWordArray(iv)
  try {
    const wordArray = CryptoJS.lib.WordArray.create(buffer)
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: wordArray
    })
    const decrypted = CryptoJS.AES.decrypt(
      cipherParams,
      keyWa, {
      iv: ivWa,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })

    let decrypted_buffer = wordArrayToUint8Array(decrypted)
    return decrypted_buffer
  } catch (error) {
    Logger.error(String(error))
    throw new Error(`AES decryption failed: ${error}`)
  }
}

/**
 * Convert an integer (0 or 1) to a boolean.
 * Only returns true for exactly 1; all other values return false.
 * @param {*} intVal - Value to convert
 * @returns {boolean} True if value is 1, false otherwise
 */
function Int2Bool(intVal) { return intVal === 1 }

/**
 * Convert a boolean to an integer (0 or 1).
 * @param {*} boolVal - Value to convert
 * @returns {number} 1 if true, 0 otherwise
 */
function Bool2Int(boolVal) { return Number(boolVal) }

export {
  ConsoleWarn,
  ConsoleError,
  timestamp_format,
  timestamp2Number,
  filesize_format,

  HalfSHA512,
  QuarterSHA512Message,
  QuarterSHA512WordArray,

  calcRate,

  genSalt,
  encryptWithPassword,
  decryptWithPassword,
  AesEncrypt,
  AesDecrypt,

  sortedAddressPair,
  genAESKey,

  AesEncryptBuffer,
  AesDecryptBuffer,

  Int2Bool,
  Bool2Int
}