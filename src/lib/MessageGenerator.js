import * as rippleKeyPairs from 'ripple-keypairs'
import { QuarterSHA512Message } from './AppUtil'
import { ActionCode, FileRequestType, ObjectType } from './MessengerConst'
import { Sign } from './MessengerUtil'

let mgInstance = null

/**
 * Initialize a new MessageGenerator from a seed.
 * Derives the public/private keypair using the XRPL ripple-keypairs library.
 * @param {string} seed - XRPL seed string
 * @returns {MessageGenerator} New generator instance
 */
export function initMessageGenerator(seed) {
  const keypair = rippleKeyPairs.deriveKeypair(seed)
  return new MessageGenerator(seed, keypair.publicKey, keypair.privateKey)
}

/**
 * Get the singleton MessageGenerator, initializing or re-initializing if the seed changed.
 * @param {string} seed - XRPL seed string
 * @returns {MessageGenerator} Generator instance
 */
export function getMessageGenerator(seed) {
  if (mgInstance === null) {
    mgInstance = initMessageGenerator(seed)
  } else if (mgInstance.Seed !== seed) {
    mgInstance = initMessageGenerator(seed)
  }
  return mgInstance
}

/**
 * Generates signed JSON messages for the RMS WebSocket protocol.
 * All public methods on mgAPI delegate to this class.
 */
class MessageGenerator {
  constructor(seed, public_key, private_key) {
    this.Seed = seed
    this.PublicKey = public_key
    this.PrivateKey = private_key
  }

  // sign(msg) {
  //   return Sign(msg, mg.PrivateKey)
  // }

  /**
   * Sign a JSON object by hashing it (QuarterSHA512), signing with the private key,
   * and attaching the Signature field. Returns a new object; input is not mutated.
   * @param {object} json - Message object to sign
   * @returns {object} Signed message object (new reference)
   */
  signJson(json) {
    let json_hash = QuarterSHA512Message(json)
    let sig = Sign(json_hash, this.PrivateKey)
    return { ...json, Signature: sig }
  }
}


/**
 * Facade for generating signed RMS protocol messages.
 * Each function takes a seed, derives the keypair, and returns a JSON-stringified signed message.
 */
export const mgAPI = {
  /**
   * Generate a Declare message to authenticate with the server.
   * @param {string} seed - XRPL seed string
   * @returns {string} Signed JSON string
   */
  genDeclare(seed) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.Declare,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey
    }
    return JSON.stringify(mg.signJson(json))
  },

  /**
   * Generate an avatar request for a list of addresses.
   * @param {string} seed - XRPL seed string
   * @param {string[]} list - Array of addresses to request avatars for
   * @returns {string} Signed JSON string
   */
  genAvatarRequest(seed, list) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.AvatarRequest,
      List: list,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey
    }
    return JSON.stringify(mg.signJson(json))
  },

  /**
   * Generate an avatar JSON response (not a WebSocket message).
   * @param {string} seed - XRPL seed string
   * @param {string} hash - Avatar file hash
   * @param {number} size - Avatar file size in bytes
   * @param {number} timestamp - Timestamp of the avatar
   * @returns {object} Signed avatar JSON object
   */
  genAvatarJson(seed, hash, size, timestamp) {
    const mg = getMessageGenerator(seed)
    let json = {
      ObjectType: ObjectType.Avatar,
      Hash: hash,
      Size: size,
      Timestamp: timestamp,
      PublicKey: mg.PublicKey
    }
    return mg.signJson(json)
  },

  /**
   * Generate a request for random bulletins.
   * @param {string} seed - XRPL seed string
   * @returns {string} Signed JSON string
   */
  genRandomBulletinRequest(seed) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.RandomBulletinRequest,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey
    }
    return JSON.stringify(mg.signJson(json))
  },

  /**
   * Generate a request for the bulletin address list (leaderboard).
   * @param {string} seed - XRPL seed string
   * @param {number} page - Page number
   * @returns {string} Signed JSON string
   */
  genBulletinAddressListRequest(seed, page) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.BulletinAddressListRequest,
      Page: page,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey
    }
    return JSON.stringify(mg.signJson(json))
  },

  /**
   * Generate a request for bulletins from a specific address and sequence.
   * @param {string} seed - XRPL seed string
   * @param {string} address - Target account address
   * @param {number} sequence - Starting sequence number
   * @param {number|boolean} to - Number of bulletins or false
   * @returns {string} Signed JSON string
   */
  genBulletinRequest(seed, address, sequence, to) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.BulletinRequest,
      Address: address,
      Sequence: sequence,
      To: to,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey
    }
    json = mg.signJson(json)
    return JSON.stringify(json)
  },

  /**
   * Generate a request for the server address list.
   * @param {string} seed - XRPL seed string
   * @param {number} page - Page number
   * @returns {string} Signed JSON string
   */
  genServerAddressRequest(seed, page) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.ServerAddressRequest,
      Page: page,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey
    }
    json = mg.signJson(json)
    return JSON.stringify(json)
  },

  /**
   * Generate a request for replies to a specific bulletin.
   * @param {string} seed - XRPL seed string
   * @param {string} hash - Bulletin hash to fetch replies for
   * @param {number} page - Page number
   * @returns {string} Signed JSON string
   */
  genReplyBulletinRequest(seed, hash, page) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.ReplyBulletinRequest,
      Hash: hash,
      Page: page,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey
    }
    json = mg.signJson(json)
    return JSON.stringify(json)
  },

  /**
   * Generate a request for bulletins matching a tag.
   * @param {string} seed - XRPL seed string
   * @param {string} tag - Tag to filter by
   * @param {number} page - Page number
   * @returns {string} Signed JSON string
   */
  genTagBulletinRequest(seed, tag, page) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.TagBulletinRequest,
      Tag: tag,
      Page: page,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey
    }
    json = mg.signJson(json)
    return JSON.stringify(json)
  },

  /**
   * Generate a file download request.
   * @param {string} seed - XRPL seed string
   * @param {number} type - FileRequestType enum value
   * @param {string} hash - File hash
   * @param {number} nonce - Random nonce for the transfer session
   * @param {number} chunk_cursor - Starting chunk index
   * @param {string} to - Destination address
   * @returns {string} Signed JSON string
   */
  genFileRequest(seed, type, hash, nonce, chunk_cursor, to) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.FileRequest,
      FileType: type,
      To: to,
      Hash: hash,
      Nonce: nonce,
      ChunkCursor: chunk_cursor,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey
    }
    return JSON.stringify(mg.signJson(json))
  },

  /**
   * Generate a group file download request.
   * @param {string} seed - XRPL seed string
   * @param {string} group_hash - Group identifier hash
   * @param {string} hash - File hash
   * @param {number} nonce - Random nonce for the transfer session
   * @param {number} chunk_cursor - Starting chunk index
   * @returns {string} Signed JSON string
   */
  genGroupFileRequest(seed, group_hash, hash, nonce, chunk_cursor) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.FileRequest,
      FileType: FileRequestType.GroupChatFile,
      GroupHash: group_hash,
      Hash: hash,
      Nonce: nonce,
      ChunkCursor: chunk_cursor,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey
    }
    return JSON.stringify(mg.signJson(json))
  },

  /**
   * Generate a signed bulletin JSON object (not a WebSocket message string).
   * Omits Tag, Quote, and File fields when empty.
   * @param {string} seed - XRPL seed string
   * @param {number} sequence - Bulletin sequence number in the chain
   * @param {string} pre_hash - Previous bulletin hash (chain link)
   * @param {string[]} [tag] - Tags array or null/empty to omit
   * @param {object[]} [quote] - Quote references or null/empty to omit
   * @param {object[]} [file] - File attachments or null/empty to omit
   * @param {string} content - Bulletin content text
   * @param {number} timestamp - Bulletin creation timestamp
   * @returns {object} Signed bulletin JSON object
   */
  genBulletinJson(seed, sequence, pre_hash, tag, quote, file, content, timestamp) {
    const mg = getMessageGenerator(seed)
    let tmp_json = {
      ObjectType: ObjectType.Bulletin,
      Sequence: sequence,
      PreHash: pre_hash,
      Tag: tag,
      Quote: quote,
      File: file,
      Content: content,
      Timestamp: timestamp,
      PublicKey: mg.PublicKey
    }
    if (tag === null || tag.length === 0) {
      delete tmp_json["Tag"]
    }
    if (quote === null || quote.length === 0) {
      delete tmp_json["Quote"]
    }
    if (file === null || file.length === 0) {
      delete tmp_json["File"]
    }
    return mg.signJson(tmp_json)
  },

  /**
   * Generate a bulletin subscription message.
   * @param {string} seed - XRPL seed string
   * @param {object[]} list - Array of address/sequence pairs to subscribe to
   * @returns {object} Signed subscription object
   */
  genBulletinSubscribe(seed, list) {
    const mg = getMessageGenerator(seed)
    let tmp_json = {
      Action: ActionCode.BulletinSubscribe,
      List: list,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey
    }
    return mg.signJson(tmp_json)
  },

  // chat
  /**
   * Generate an ECDH handshake message for establishing a private session.
   * @param {string} seed - XRPL seed string
   * @param {number} partition - Partition number for key derivation
   * @param {number} sequence - Handshake sequence number
   * @param {string} ecdh_pk - Base64-encoded ECDH public key
   * @param {string} pair - Pair identifier
   * @param {string} address - Recipient address
   * @param {number} timestamp - Timestamp
   * @returns {object} Signed handshake object
   */
  genECDHHandshake(seed, partition, sequence, ecdh_pk, pair, address, timestamp) {
    const mg = getMessageGenerator(seed)
    let json = {
      ObjectType: ObjectType.ECDH,
      Partition: partition,
      Sequence: sequence,
      Self: ecdh_pk,
      Pair: pair,
      To: address,
      Timestamp: timestamp,
      PublicKey: mg.PublicKey
    }
    return mg.signJson(json)
  },

  /**
   * Generate a private message sync request to exchange sequence numbers.
   * @param {string} seed - XRPL seed string
   * @param {string} pair_address - Conversation partner's address
   * @param {number} pair_sequence - Last known partner sequence number
   * @param {number} self_sequence - Own current sequence number
   * @returns {string} Signed JSON string
   */
  genPrivateMessageSync(seed, pair_address, pair_sequence, self_sequence) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.PrivateMessageSync,
      To: pair_address,
      PairSequence: pair_sequence,
      SelfSequence: self_sequence,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey,
    }
    return JSON.stringify(mg.signJson(json))
  },

  /**
   * Generate a private chat message object (not stringified).
   * @param {string} seed - XRPL seed string
   * @param {number} sequence - Message sequence number in the chain
   * @param {string} pre_hash - Previous message hash (chain link)
   * @param {string|null} [confirm] - Confirmation hash or null to omit
   * @param {string} content - Encrypted message content
   * @param {string} dest_address - Recipient address
   * @param {number} timestamp - Timestamp
   * @returns {object} Signed private message object
   */
  genPrivateMessage(seed, sequence, pre_hash, confirm, content, dest_address, timestamp) {
    const mg = getMessageGenerator(seed)
    let json = {
      ObjectType: ObjectType.PrivateMessage,
      Sequence: sequence,
      PreHash: pre_hash,
      Confirm: confirm,
      Content: content,
      To: dest_address,
      Timestamp: timestamp,
      PublicKey: mg.PublicKey,
    }
    if (confirm === null) {
      delete json["Confirm"]
    }
    return mg.signJson(json)
  },

  // Group
  /**
   * Generate a group sync request to fetch all group memberships.
   * @param {string} seed - XRPL seed string
   * @returns {object} Signed sync object
   */
  genGroupSync(seed) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.GroupSync,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey,
    }
    return mg.signJson(json)
  },

  /**
   * Generate a group creation message.
   * @param {string} seed - XRPL seed string
   * @param {string} hash - Group hash identifier
   * @param {string} name - Group display name
   * @param {object[]} member - Array of group member entries
   * @returns {object} Signed group creation object
   */
  genGroupCreate(seed, hash, name, member) {
    const mg = getMessageGenerator(seed)
    let json = {
      ObjectType: ObjectType.GroupCreate,
      Hash: hash,
      Name: name,
      Member: member,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey,
    }
    return mg.signJson(json)
  },

  /**
   * Generate a group deletion message.
   * @param {string} seed - XRPL seed string
   * @param {string} hash - Group hash to delete
   * @returns {object} Signed group deletion object
   */
  genGroupDelete(seed, hash) {
    const mg = getMessageGenerator(seed)
    let json = {
      ObjectType: ObjectType.GroupDelete,
      Hash: hash,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey,
    }
    return mg.signJson(json)
  },

  /**
   * Generate a group message sync request.
   * @param {string} seed - XRPL seed string
   * @param {string} hash - Group hash identifier
   * @param {string} address - Target member address
   * @param {number} sequence - Starting sequence number
   * @param {number|boolean} to - Number of messages or false
   * @returns {object} Signed sync object
   */
  genGroupMessageSync(seed, hash, address, sequence, to) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.GroupMessageSync,
      Hash: hash,
      Address: address,
      Sequence: sequence,
      To: to,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey,
    }
    return mg.signJson(json)
  },

  /**
   * Generate a group chat message object. Content is NOT signed (restored after signing).
   * @param {string} seed - XRPL seed string
   * @param {string} group_hash - Group hash identifier
   * @param {number} sequence - Message sequence number
   * @param {string} pre_hash - Previous message hash (chain link)
   * @param {string|null} [confirm] - Confirmation hash or null to omit
   * @param {string} content - Encrypted message content (not signed)
   * @param {number} timestamp - Timestamp
   * @returns {object} Signed group message object with content restored
   */
  genGroupMessage(seed, group_hash, sequence, pre_hash, confirm, content, timestamp) {
    const mg = getMessageGenerator(seed)
    let tmp = {
      ObjectType: ObjectType.GroupMessage,
      GroupHash: group_hash,
      Sequence: sequence,
      PreHash: pre_hash,
      Confirm: confirm,
      Content: content,
      Timestamp: timestamp,
      PublicKey: mg.PublicKey
    }
    if (confirm === null) {
      delete tmp["Confirm"]
    }
    tmp = mg.signJson(tmp)
    tmp.Content = content
    return tmp
  },

  /**
   * Generate a group message list response object.
   * @param {string} seed - XRPL seed string
   * @param {string} group_hash - Group hash identifier
   * @param {string} to - Recipient address
   * @param {object[]} list - Array of message entries
   * @param {number} timestamp - Timestamp
   * @returns {object} Message list object (not signed)
   */
  genGroupMessageList(seed, group_hash, to, list, timestamp) {
    const mg = getMessageGenerator(seed)
    let tmp = {
      ObjectType: ObjectType.GroupMessageList,
      GroupHash: group_hash,
      To: to,
      List: list,
      Timestamp: timestamp,
      PublicKey: mg.PublicKey
    }
    return tmp
  }
}