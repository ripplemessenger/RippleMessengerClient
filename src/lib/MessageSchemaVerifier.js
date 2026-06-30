import Ajv from 'ajv'
import Logger from './Logger'
import {
  AvatarListSchema,
  AvatarRequestSchema,
  ReplyBulletinListSchema,
  BulletinRequestSchema,
  BulletinSchema,
  TagBulletinListSchema,
  DeclareSchema,
  ECDHHandshakeSchema,
  FileRequestSchema,
  GroupSyncSchema,
  GroupListSchema,
  GroupMessageListSchema,
  GroupMessageSchema,
  GroupMessageSyncSchema,
  MessageObjectBulletinSchema,
  MessageObjectGroupChatFileSchema,
  MessageObjectPrivateChatFileSchema,
  PrivateMessageSchema,
  PrivateMessageSyncSchema,
  RandomBulletinListSchema,
  ServerAddressListSchema
} from './MessageSchema'

const ajv = new Ajv({ allErrors: true })

/**
 * Parse a JSON string, returning the parsed object or false on failure.
 * @param {string} str - JSON string to parse
 * @returns {object|false} Parsed object, or false if parsing failed
 */
function deriveJson(str) {
  try {
    return JSON.parse(str)
  } catch {
    Logger.debug('not a json')
    return false
  }
}

const schemaMap = {
  DeclareSchema,
  AvatarRequestSchema,
  AvatarListSchema,
  FileRequestSchema,
  BulletinSchema,
  BulletinRequestSchema,
  ServerAddressListSchema,
  ReplyBulletinListSchema,
  TagBulletinListSchema,
  RandomBulletinListSchema,
  ECDHHandshakeSchema,
  PrivateMessageSchema,
  PrivateMessageSyncSchema,
  GroupSyncSchema,
  GroupMessageSyncSchema,
  GroupListSchema,
  GroupMessageSchema,
  GroupMessageListSchema
}

const compiled = Object.fromEntries(
  Object.entries(schemaMap).map(([name, schema]) => [name, ajv.compile(schema)])
)

/**
 * Internal validator delegate. Compiles and runs the named AJV schema against a JSON object.
 * @param {string} name - Schema name key in compiled map
 * @param {object} json - Object to validate
 * @returns {boolean} True if valid
 */
function validate(name, json) {
  try {
    if (compiled[name](json)) return true
    Logger.warn(`${name} invalid`)
    return false
  } catch {
    return false
  }
}

/** @param {object} json @returns {boolean} */
function checkDeclareSchema(json) {
  return validate('DeclareSchema', json)
}

/** @param {object} json @returns {boolean} */
function checkAvatarRequestSchema(json) {
  return validate('AvatarRequestSchema', json)
}

/** @param {object} json @returns {boolean} */
function checkAvatarListSchema(json) {
  return validate('AvatarListSchema', json)
}

/** @param {object} json @returns {boolean} */
function checkFileRequestSchema(json) {
  return validate('FileRequestSchema', json)
}

/** @param {object} json @returns {boolean} */
function checkBulletinSchema(json) {
  return validate('BulletinSchema', json)
}

/** @param {object} json @returns {boolean} */
function checkBulletinRequestSchema(json) {
  return validate('BulletinRequestSchema', json)
}

/** @param {object} json @returns {boolean} */
function checkServerAddressListSchema(json) {
  return validate('ServerAddressListSchema', json)
}

/** @param {object} json @returns {boolean} */
function checkReplyBulletinListSchema(json) {
  return validate('ReplyBulletinListSchema', json)
}

/** @param {object} json @returns {boolean} */
function checkTagBulletinListSchema(json) {
  return validate('TagBulletinListSchema', json)
}

/** @param {object} json @returns {boolean} */
function checkRandomBulletinListSchema(json) {
  return validate('RandomBulletinListSchema', json)
}

// Chat Handshake
/** @param {object} json @returns {boolean} */
function checkECDHHandshakeSchema(json) {
  return validate('ECDHHandshakeSchema', json)
}

// Private
/** @param {object} json @returns {boolean} */
function checkPrivateMessageSchema(json) {
  return validate('PrivateMessageSchema', json)
}

/** @param {object} json @returns {boolean} */
function checkPrivateMessageSyncSchema(json) {
  return validate('PrivateMessageSyncSchema', json)
}

// Group
/** @param {object} json @returns {boolean} */
function checkGroupSyncSchema(json) {
  return validate('GroupSyncSchema', json)
}

/** @param {object} json @returns {boolean} */
function checkGroupMessageSyncSchema(json) {
  return validate('GroupMessageSyncSchema', json)
}

/** @param {object} json @returns {boolean} */
function checkGroupListSchema(json) {
  return validate('GroupListSchema', json)
}

/** @param {object} json @returns {boolean} */
function checkGroupMessageSchema(json) {
  return validate('GroupMessageSchema', json)
}

/** @param {object} json @returns {boolean} */
function checkGroupMessageListSchema(json) {
  return validate('GroupMessageListSchema', json)
}

const vMessageObjectBulletinSchema = ajv.compile(MessageObjectBulletinSchema)
const vMessageObjectPrivateChatFileSchema = ajv.compile(MessageObjectPrivateChatFileSchema)
const vMessageObjectGroupChatFileSchema = ajv.compile(MessageObjectGroupChatFileSchema)

/**
 * Validate an incoming message object against the union of Bulletin, PrivateChatFile, and GroupChatFile schemas.
 * Returns true if the object matches any one of them.
 * @param {object} json - Message object to validate
 * @returns {boolean} True if valid
 */
function checkMessageObjectSchema(json) {
  try {
    if (vMessageObjectBulletinSchema(json) || vMessageObjectPrivateChatFileSchema(json) || vMessageObjectGroupChatFileSchema(json)) {
      Logger.debug('MessageObject schema ok')
      return true
    } else {
      Logger.warn('MessageObject schema invalid')
      return false
    }
  } catch {
    return false
  }
}

export {
  deriveJson,
  checkDeclareSchema,

  checkAvatarRequestSchema,
  checkAvatarListSchema,

  checkFileRequestSchema,

  checkBulletinRequestSchema,
  checkBulletinSchema,
  // checkBulletinAddressRequestSchema,
  checkServerAddressListSchema,
  // checkReplyBulletinRequestSchema,
  checkReplyBulletinListSchema,
  // checkTagBulletinRequestSchema,
  checkTagBulletinListSchema,
  checkRandomBulletinListSchema,

  checkECDHHandshakeSchema,

  // private chat
  checkPrivateMessageSchema,
  checkPrivateMessageSyncSchema,

  // group chat
  checkGroupSyncSchema,
  checkGroupListSchema,
  checkGroupMessageSyncSchema,
  checkGroupMessageSchema,
  checkGroupMessageListSchema,

  checkMessageObjectSchema
}
