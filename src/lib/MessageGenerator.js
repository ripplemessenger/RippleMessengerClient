import * as rippleKeyPairs from 'ripple-keypairs'
import { QuarterSHA512Message } from './AppUtil'
import { ActionCode, FileRequestType, ObjectType } from './MessengerConst'
import { Sign } from './MessengerUtil'

let mgInstance = null

export function initMessageGenerator(seed) {
  const keypair = rippleKeyPairs.deriveKeypair(seed)
  return new MessageGenerator(seed, keypair.publicKey, keypair.privateKey)
}

export function getMessageGenerator(seed) {
  if (mgInstance === null) {
    mgInstance = initMessageGenerator(seed)
  } else if (mgInstance.Seed !== seed) {
    mgInstance = initMessageGenerator(seed)
  }
  return mgInstance
}

class MessageGenerator {
  constructor(seed, public_key, private_key) {
    this.Seed = seed
    this.PublicKey = public_key
    this.PrivateKey = private_key
  }

  // sign(msg) {
  //   return Sign(msg, mg.PrivateKey)
  // }

  signJson(json) {
    let json_hash = QuarterSHA512Message(json)
    let sig = Sign(json_hash, this.PrivateKey)
    json.Signature = sig
    return json
  }
}


export const mgAPI = {
  // server
  genDeclare(seed) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.Declare,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey
    }
    return JSON.stringify(mg.signJson(json))
  },

  // avatar
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

  // bulletin
  genBulletinRandomRequest(seed) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.BulletinRandomRequest,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey
    }
    return JSON.stringify(mg.signJson(json))
  },

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

  genBulletinAddressRequest(seed, page) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.BulletinAddressRequest,
      Page: page,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey
    }
    json = mg.signJson(json)
    return JSON.stringify(json)
  },

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

  // not a message, a bulletin json
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
    if (tag === null || tag.length == 0) {
      delete tmp_json["Tag"]
    }
    if (quote === null || quote.length == 0) {
      delete tmp_json["Quote"]
    }
    if (file === null || file.length == 0) {
      delete tmp_json["File"]
    }
    return mg.signJson(tmp_json)
  },

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
  genGroupSync(seed) {
    const mg = getMessageGenerator(seed)
    let json = {
      Action: ActionCode.GroupSync,
      Timestamp: Date.now(),
      PublicKey: mg.PublicKey,
    }
    return mg.signJson(json)
  },

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