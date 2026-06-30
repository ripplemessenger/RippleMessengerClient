import CryptoJS from 'crypto-js'
import { Buffer } from 'buffer'
import * as rippleKeyPairs from 'ripple-keypairs'
import Logger from './Logger'
import { Epoch } from './MessengerConst'
import { ConsoleWarn, HalfSHA512, Int2Bool, QuarterSHA512Message, QuarterSHA512WordArray } from './AppUtil'
import { NonceMax } from './AppConst'

/**
 * Look up a display name for an address from the map.
 * Falls back to a truncated address if no name is registered.
 * @param {Object.<string, string>} address_map - Map of addresses to names
 * @param {string} [address] - XRPL address to look up
 * @returns {string} Display name or truncated address
 */
function AddressToName(address_map, address) {
  if (!address) {
    return 'not a address'
  }
  if (address_map[address] != null) {
    return address_map[address]
  } else {
    return `${address.substring(0, 7)}...${address.substring(address.length - 5)}`
  }
}

/**
 * Compute the file hash (Quarter SHA-512) of a binary buffer.
 * @param {Uint8Array} buffer - Raw file data
 * @returns {string} 32-character uppercase hex hash
 */
function FileHash(buffer) {
  const wordArray = CryptoJS.lib.WordArray.create(buffer)
  const hash = QuarterSHA512WordArray(wordArray)
  return hash
}

/**
 * Compute the encrypted hash for a private file.
 * Uses sorted address concatenation to ensure both parties get the same result.
 * @param {string} address1 - First XRPL address
 * @param {string} address2 - Second XRPL address
 * @param {string} hash - Original file hash
 * @returns {string} 32-character uppercase hex encrypted hash
 */
function PrivateFileEHash(address1, address2, hash) {
  let tmpStr = ''
  if (address1 > address2) {
    tmpStr = address1 + address2 + hash
  } else {
    tmpStr = address2 + address1 + hash
  }
  const ehash = QuarterSHA512Message(tmpStr)
  return ehash
}

/**
 * Compute the encrypted hash for a group file.
 * @param {string} group_hash - Group identifier hash
 * @param {string} file_hash - Original file hash
 * @returns {string} 32-character uppercase hex encrypted hash
 */
function GroupFileEHash(group_hash, file_hash) {
  const ehash = QuarterSHA512Message(group_hash + file_hash)
  return ehash
}

/**
 * Calculate the DH (Diffie-Hellman) sequence number for a private message.
 * Used to partition messages into time-based buckets for sync efficiency.
 * @param {number} partition - Partition count (e.g., 1000)
 * @param {number} timestamp - Message timestamp in milliseconds
 * @param {string} address1 - First XRPL address
 * @param {string} address2 - Second XRPL address
 * @returns {number} Sequence number for the time partition
 */
function DHSequence(partition, timestamp, address1, address2) {
  let tmpStr = ''
  if (address1 > address2) {
    tmpStr = address1 + address2
  } else {
    tmpStr = address2 + address1
  }
  let tmpInt = parseInt(HalfSHA512(tmpStr).substring(0, 6), 16)
  let cursor = (tmpInt % partition) * 1000
  let seq = parseInt((timestamp - (Epoch + cursor)) / (partition * 1000))
  return seq
}

/**
 * Sign a message string using the Ripple keypairs library with a private key.
 * @param {string} msg - Message to sign (typically a hash hex string)
 * @param {string} sk - Private key string
 * @returns {string} Signature string
 */
function Sign(msg, sk) {
  let sig = rippleKeyPairs.sign(msg, sk)
  return sig
}

/**
 * Verify the digital signature of a JSON message object.
 * Temporarily removes the Signature field, hashes the remaining JSON, and verifies against the PublicKey.
 * Mutates the input by restoring/deleting the Signature field.
 * @param {object} json - Message object with Signature and PublicKey fields
 * @returns {boolean} True if the signature is valid
 */
function VerifyJsonSignature(json) {
  const sig = json["Signature"]
  delete json["Signature"]
  const json_hash = QuarterSHA512Message(json)
  if (rippleKeyPairs.verify(json_hash, sig, json.PublicKey)) {
    json["Signature"] = sig
    return true
  } else {
    ConsoleWarn('signature invalid...')
    Logger.debug(json)
    return false
  }
}

/**
 * Convert a Uint32 number to a 4-byte Buffer.
 * @param {number} num - Unsigned 32-bit integer (0-4294967295)
 * @param {boolean} [isBigEndian=true] - Byte order
 * @returns {Buffer|false} 4-byte buffer, or false if out of range
 */
function Uint32ToBuffer(num, isBigEndian = true) {
  if (num < 0 || num > 4294967295) {
    return false
  }
  const buf = Buffer.alloc(4)
  if (isBigEndian) {
    buf.writeUInt32BE(num, 0)
  } else {
    buf.writeUInt32LE(num, 0)
  }
  return buf
}

/**
 * Read the first 4 bytes of an ArrayBuffer as a Uint32.
 * @param {ArrayBuffer} arrayBuffer - Buffer containing at least 4 bytes
 * @param {boolean} [isBigEndian=true] - Byte order
 * @returns {number} Unsigned 32-bit integer
 */
async function ArrayBufferToUint32(arrayBuffer, isBigEndian = true) {
  const buf = Buffer.from(arrayBuffer)
  return isBigEndian
    ? buf.readUInt32BE(0)
    : buf.readUInt32LE(0)
}

/**
 * Generate a random integer in the inclusive range [min, max].
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer
 */
function genRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Generate a random nonce value in the range [0, NonceMax].
 * Used to identify file transfer chunks.
 * @returns {number} Random nonce integer
 */
function genNonce() {
  return genRandomInt(0, NonceMax)
}

/**
 * Calculate the total number of pages for pagination.
 * @param {number|string} total - Total item count
 * @param {number|string} page_size - Items per page
 * @returns {number} Total page count (minimum 1)
 */
function calcTotalPage(total, page_size) {
  const t = Number(total)
  const p = Number(page_size)
  if (!Number.isInteger(t) || !Number.isInteger(p) || t < 0 || p <= 0) {
    return 1
  }
  return Math.ceil(t / p)
}

/**
 * Parse a comma-separated tag string, trimming whitespace and filtering empties.
 * Only succeeds if the string ends with a comma (user signal of completion).
 * @param {string} str - Comma-separated tag input
 * @returns {string[]|false} Array of trimmed tags, or false if invalid/incomplete
 */
function trimEndCommasAndValidate(str) {
  if (typeof str !== 'string' || str === '') {
    return false
  }
  const endCommaReg = /,+$/
  const resultStr = str.replace(endCommaReg, '')
  const isEndWithComma = endCommaReg.test(str)
  const tmp_tag_list = resultStr.split(',')
  let tag_list = []
  for (let i = 0; i < tmp_tag_list.length; i++) {
    const tag = tmp_tag_list[i].trim()
    if (tag !== '') {
      tag_list.push(tag)
    }
  }
  return isEndWithComma && tag_list.length > 0 ? tag_list : false
}

/**
 * Get the index of a member in a sorted group member list.
 * @param {string[]} members - Array of XRPL addresses
 * @param {string} member - Address to find
 * @returns {number} Index in sorted order, or -1 if not found
 */
function getMemberIndex(members, member) {
  const sortedMembers = [...members]
  sortedMembers.sort()
  const index = sortedMembers.findIndex(m => m === member)
  return index
}

/**
 * Get the member at a given index from a sorted group member list.
 * @param {string[]} members - Array of XRPL addresses
 * @param {number} index - Index in sorted order
 * @returns {string} XRPL address at the given index
 */
function getMemberByIndex(members, index) {
  const sortedMembers = [...members]
  sortedMembers.sort()
  return sortedMembers[index]
}

/**
 * Transform a raw bulletin record into a display-ready object.
 * Parses JSON payload and extracts content, tags, files, and quotes.
 * @param {object} bulletin - Raw bulletin database record with json string field
 * @returns {object} Display-ready bulletin object
 */
function bulletin2Display(bulletin) {
  bulletin.json = JSON.parse(bulletin.json)
  bulletin.content = bulletin.json.Content
  bulletin.is_marked = Int2Bool(bulletin.is_marked)
  bulletin.tag = []
  bulletin.file = []
  bulletin.quote = []
  if (bulletin.json.Tag !== undefined) {
    bulletin.tag = bulletin.json.Tag
  }
  if (bulletin.json.File !== undefined) {
    bulletin.file = bulletin.json.File
  }
  if (bulletin.json.Quote !== undefined) {
    bulletin.quote = bulletin.json.Quote
  }
  return bulletin
}

/**
 * Transform a raw private message record into a display-ready object.
 * Parses JSON payload and converts integer flags to booleans.
 * @param {object} msg - Raw private message database record
 * @returns {object} Display-ready message object (mutates input)
 */
function privateMessage2Display(msg) {
  msg.json = JSON.parse(msg.json)
  msg.is_confirmed = Int2Bool(msg.is_confirmed)
  msg.is_marked = Int2Bool(msg.is_marked)
  msg.is_readed = Int2Bool(msg.is_readed)
  msg.is_object = Int2Bool(msg.is_object)
  if (msg.is_object) {
    msg.content = JSON.parse(msg.content)
  }
  return msg
}

/**
 * Transform a raw group message record into a display-ready object.
 * Parses JSON payload and converts integer flags to booleans.
 * @param {object} msg - Raw group message database record
 * @returns {object} Display-ready message object (mutates input)
 */
function groupMessage2Display(msg) {
  msg.json = JSON.parse(msg.json)
  msg.is_confirmed = Int2Bool(msg.is_confirmed)
  msg.is_marked = Int2Bool(msg.is_marked)
  msg.is_readed = Int2Bool(msg.is_readed)
  msg.is_object = Int2Bool(msg.is_object)
  if (msg.is_object) {
    msg.content = JSON.parse(msg.content)
  }
  return msg
}

/**
 * Build the subdirectory path for a file hash. Splits hash into 3-char segments.
 * @param {string} hash - File hash string
 * @returns {string[]} Two-element array of subdirectory names
 */
function buildFileSubPath(hash) {
  return [hash.substring(0, 3), hash.substring(3, 6)]
}

/**
 * Build the full file path segments from base directories and a file hash.
 * @param {string} baseDir - Base storage directory
 * @param {string} fileDir - File category directory (e.g., "avatars", "private")
 * @param {string} hash - File hash string
 * @returns {string[]} Array of path segments
 */
function buildFileFullPath(baseDir, fileDir, hash) {
  const parts = buildFileSubPath(hash)
  return [baseDir, fileDir, ...parts, hash]
}

export {
  AddressToName,

  FileHash,
  PrivateFileEHash,
  GroupFileEHash,

  Sign,
  VerifyJsonSignature,

  DHSequence,

  buildFileSubPath,
  buildFileFullPath,

  Uint32ToBuffer,
  ArrayBufferToUint32,
  genNonce,
  calcTotalPage,
  trimEndCommasAndValidate,
  getMemberIndex,
  getMemberByIndex,
  bulletin2Display,
  privateMessage2Display,
  groupMessage2Display
}