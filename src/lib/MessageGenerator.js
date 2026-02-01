import { QuarterSHA512Message } from './AppUtil'
import { ActionCode, FileRequestType, ObjectType } from './MessengerConst'
import { Sign } from './MessengerUtil'

export default class MessageGenerator {
  constructor(public_key, private_key) {
    this.PublicKey = public_key
    this.PrivateKey = private_key
  }

  sign(msg) {
    return Sign(msg, this.PrivateKey)
  }

  signJson(json) {
    let json_hash = QuarterSHA512Message(json)
    let sig = Sign(json_hash, this.PrivateKey)
    json.Signature = sig
    return json
  }

  genDeclare() {
    let json = {
      Action: ActionCode.Declare,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey
    }
    return JSON.stringify(this.signJson(json))
  }

  // avatar
  genAvatarRequest(list) {
    let json = {
      Action: ActionCode.AvatarRequest,
      List: list,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey
    }
    return JSON.stringify(this.signJson(json))
  }

  genAvatarJson(hash, size, timestamp) {
    let json = {
      ObjectType: ObjectType.Avatar,
      Hash: hash,
      Size: size,
      Timestamp: timestamp,
      PublicKey: this.PublicKey
    }
    return this.signJson(json)
  }

  // bulletin
  genBulletinRandomRequest() {
    let json = {
      Action: ActionCode.BulletinRandomRequest,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey
    }
    return JSON.stringify(this.signJson(json))
  }

  genBulletinAddressListRequest(page) {
    let json = {
      Action: ActionCode.BulletinAddressListRequest,
      Page: page,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey
    }
    return JSON.stringify(this.signJson(json))
  }

  genBulletinRequest(address, sequence, to) {
    let json = {
      Action: ActionCode.BulletinRequest,
      Address: address,
      Sequence: sequence,
      To: to,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey
    }
    json = this.signJson(json)
    return JSON.stringify(json)
  }

  genBulletinAddressRequest(page) {
    let json = {
      Action: ActionCode.BulletinAddressRequest,
      Page: page,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey
    }
    json = this.signJson(json)
    return JSON.stringify(json)
  }

  genReplyBulletinRequest(hash, page) {
    let json = {
      Action: ActionCode.ReplyBulletinRequest,
      Hash: hash,
      Page: page,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey
    }
    json = this.signJson(json)
    return JSON.stringify(json)
  }

  genTagBulletinRequest(tag, page) {
    let json = {
      Action: ActionCode.TagBulletinRequest,
      Tag: tag,
      Page: page,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey
    }
    json = this.signJson(json)
    return JSON.stringify(json)
  }

  genFileRequest(type, hash, nonce, chunk_cursor, to) {
    let json = {
      Action: ActionCode.FileRequest,
      FileType: type,
      To: to,
      Hash: hash,
      Nonce: nonce,
      ChunkCursor: chunk_cursor,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey
    }
    return JSON.stringify(this.signJson(json))
  }

  genGroupFileRequest(group_hash, hash, nonce, chunk_cursor) {
    let json = {
      Action: ActionCode.FileRequest,
      FileType: FileRequestType.GroupChatFile,
      GroupHash: group_hash,
      Hash: hash,
      Nonce: nonce,
      ChunkCursor: chunk_cursor,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey
    }
    return JSON.stringify(this.signJson(json))
  }

  // not a message, a bulletin json
  genBulletinJson(sequence, pre_hash, tag, quote, file, content, timestamp) {
    let tmp_json = {
      ObjectType: ObjectType.Bulletin,
      Sequence: sequence,
      PreHash: pre_hash,
      Tag: tag,
      Quote: quote,
      File: file,
      Content: content,
      Timestamp: timestamp,
      PublicKey: this.PublicKey
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
    return this.signJson(tmp_json)
  }

  genBulletinSubscribe(list) {
    let tmp_json = {
      Action: ActionCode.BulletinSubscribe,
      List: list,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey
    }
    return this.signJson(tmp_json)
  }

  // chat
  genECDHHandshake(partition, sequence, ecdh_pk, pair, address, timestamp) {
    let json = {
      ObjectType: ObjectType.ECDH,
      Partition: partition,
      Sequence: sequence,
      Self: ecdh_pk,
      Pair: pair,
      To: address,
      Timestamp: timestamp,
      PublicKey: this.PublicKey
    }
    return this.signJson(json)
  }

  genPrivateMessageSync(pair_address, pair_sequence, self_sequence) {
    let json = {
      Action: ActionCode.PrivateMessageSync,
      To: pair_address,
      PairSequence: pair_sequence,
      SelfSequence: self_sequence,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey,
    }
    return JSON.stringify(this.signJson(json))
  }

  genPrivateMessage(sequence, pre_hash, confirm, content, dest_address, timestamp) {
    let json = {
      ObjectType: ObjectType.PrivateMessage,
      Sequence: sequence,
      PreHash: pre_hash,
      Confirm: confirm,
      Content: content,
      To: dest_address,
      Timestamp: timestamp,
      PublicKey: this.PublicKey,
    }
    if (confirm === null) {
      delete json["Confirm"]
    }
    return this.signJson(json)
  }

  // Group
  genGroupSync() {
    let json = {
      Action: ActionCode.GroupSync,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey,
    }
    return this.signJson(json)
  }

  genGroupCreate(hash, name, member) {
    let json = {
      ObjectType: ObjectType.GroupCreate,
      Hash: hash,
      Name: name,
      Member: member,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey,
    }
    return this.signJson(json)
  }

  genGroupDelete(hash) {
    let json = {
      ObjectType: ObjectType.GroupDelete,
      Hash: hash,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey,
    }
    return this.signJson(json)
  }

  genGroupMessageSync(hash, address, sequence, to) {
    let json = {
      Action: ActionCode.GroupMessageSync,
      Hash: hash,
      Address: address,
      Sequence: sequence,
      To: to,
      Timestamp: Date.now(),
      PublicKey: this.PublicKey,
    }
    return this.signJson(json)
  }

  genGroupMessage(group_hash, sequence, pre_hash, confirm, content, timestamp) {
    let tmp = {
      ObjectType: ObjectType.GroupMessage,
      GroupHash: group_hash,
      Sequence: sequence,
      PreHash: pre_hash,
      Confirm: confirm,
      Content: content,
      Timestamp: timestamp,
      PublicKey: this.PublicKey
    }
    if (confirm === null) {
      delete tmp["Confirm"]
    }
    tmp = this.signJson(tmp)
    tmp.Content = content
    return tmp
  }
}