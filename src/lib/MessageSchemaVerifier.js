import Ajv from 'ajv'
import { AvatarListSchema, AvatarRequestSchema, ReplyBulletinListSchema, BulletinRequestSchema, BulletinSchema, TagBulletinListSchema, DeclareSchema, ECDHHandshakeSchema, FileRequestSchema, GroupSyncSchema, GroupListSchema, GroupMessageListSchema, GroupMessageSchema, GroupMessageSyncSchema, MessageObjectBulletinSchema, MessageObjectPrivateChatFileSchema, MessageObjectGroupChatFileSchema, PrivateMessageSchema, PrivateMessageSyncSchema, RandomBulletinListSchema, ServerAddressListSchema } from './MessageSchema'
const ajv = new Ajv({ allErrors: true })

function deriveJson(str) {
  try {
    let json = JSON.parse(str)
    return json
  } catch (e) {
    console.log(`not a json`)
    return false
  }
}

const vDeclareSchema = ajv.compile(DeclareSchema)
function checkDeclareSchema(json) {
  try {
    if (vDeclareSchema(json)) {
      console.log(`DeclareSchema ok`)
      return true
    } else {
      console.log(`DeclareSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vAvatarRequestSchema = ajv.compile(AvatarRequestSchema)
function checkAvatarRequestSchema(json) {
  try {
    if (vAvatarRequestSchema(json)) {
      console.log(`AvatarRequestSchema ok`)
      return true
    } else {
      console.log(`AvatarRequestSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vAvatarListSchema = ajv.compile(AvatarListSchema)
function checkAvatarListSchema(json) {
  try {
    if (vAvatarListSchema(json)) {
      console.log(`AvatarListSchema ok`)
      return true
    } else {
      console.log(`AvatarListSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vFileRequestSchema = ajv.compile(FileRequestSchema)
function checkFileRequestSchema(json) {
  try {
    if (vFileRequestSchema(json)) {
      console.log(`FileRequestSchema ok`)
      return true
    } else {
      console.log(`FileRequestSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vBulletinSchema = ajv.compile(BulletinSchema)
function checkBulletinSchema(json) {
  try {
    if (vBulletinSchema(json)) {
      console.log(`BulletinSchema ok`)
      return true
    } else {
      console.log(`BulletinSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vBulletinRequestSchema = ajv.compile(BulletinRequestSchema)
function checkBulletinRequestSchema(json) {
  try {
    if (vBulletinRequestSchema(json)) {
      console.log(`BulletinRequestSchema ok`)
      return true
    } else {
      console.log(`BulletinRequestSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vServerAddressListSchema = ajv.compile(ServerAddressListSchema)
function checkServerAddressListSchema(json) {
  try {
    if (vServerAddressListSchema(json)) {
      console.log(`ServerAddressListSchema ok`)
      return true
    } else {
      console.log(`ServerAddressListSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vReplyBulletinListSchema = ajv.compile(ReplyBulletinListSchema)
function checkReplyBulletinListSchema(json) {
  try {
    if (vReplyBulletinListSchema(json)) {
      console.log(`ReplyBulletinListSchema ok`)
      return true
    } else {
      console.log(`ReplyBulletinListSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vTagBulletinListSchema = ajv.compile(TagBulletinListSchema)
function checkTagBulletinListSchema(json) {
  try {
    if (vTagBulletinListSchema(json)) {
      console.log(`TagBulletinListSchema ok`)
      return true
    } else {
      console.log(`TagBulletinListSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vRandomBulletinListSchema = ajv.compile(RandomBulletinListSchema)
function checkRandomBulletinListSchema(json) {
  try {
    if (vRandomBulletinListSchema(json)) {
      console.log(`RandomBulletinListSchema ok`)
      return true
    } else {
      console.log(`RandomBulletinListSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

// Chat Handshake 
const vECDHHandshakeSchema = ajv.compile(ECDHHandshakeSchema)
function checkECDHHandshakeSchema(json) {
  try {
    if (vECDHHandshakeSchema(json)) {
      console.log(`ECDHHandshakeSchema ok`)
      return true
    } else {
      console.log(`ECDHHandshakeSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

// Private
const vPrivateMessageSchema = ajv.compile(PrivateMessageSchema)
function checkPrivateMessageSchema(json) {
  try {
    if (vPrivateMessageSchema(json)) {
      console.log(`PrivateMessageSchema ok`)
      return true
    } else {
      console.log(`PrivateMessageSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vPrivateMessageSyncSchema = ajv.compile(PrivateMessageSyncSchema)
function checkPrivateMessageSyncSchema(json) {
  try {
    if (vPrivateMessageSyncSchema(json)) {
      console.log(`PrivateMessageSyncSchema ok`)
      return true
    } else {
      console.log(`PrivateMessageSyncSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

// Group
const vGroupSyncSchema = ajv.compile(GroupSyncSchema)
function checkGroupSyncSchema(json) {
  try {
    if (vGroupSyncSchema(json)) {
      console.log(`GroupSyncSchema ok`)
      return true
    } else {
      console.log(`GroupSyncSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vGroupMessageSyncSchema = ajv.compile(GroupMessageSyncSchema)
function checkGroupMessageSyncSchema(json) {
  try {
    if (vGroupMessageSyncSchema(json)) {
      console.log(`GroupMessageSyncSchema ok`)
      return true
    } else {
      console.log(`GroupMessageSyncSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vGroupListSchema = ajv.compile(GroupListSchema)
function checkGroupListSchema(json) {
  try {
    if (vGroupListSchema(json)) {
      console.log(`GroupListSchema ok`)
      return true
    } else {
      console.log(`GroupListSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}
const vGroupMessageSchema = ajv.compile(GroupMessageSchema)
function checkGroupMessageSchema(json) {
  try {
    if (vGroupMessageSchema(json)) {
      console.log(`GroupMessageSchema ok`)
      return true
    } else {
      console.log(`GroupMessageSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vGroupMessageListSchema = ajv.compile(GroupMessageListSchema)
function checkGroupMessageListSchema(json) {
  try {
    if (vGroupMessageListSchema(json)) {
      console.log(`GroupMessageListSchema ok`)
      return true
    } else {
      console.log(`GroupMessageListSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vMessageObjectBulletinSchema = ajv.compile(MessageObjectBulletinSchema)
const vMessageObjectPrivateChatFileSchema = ajv.compile(MessageObjectPrivateChatFileSchema)
const vMessageObjectGroupChatFileSchema = ajv.compile(MessageObjectGroupChatFileSchema)

function checkMessageObjectSchema(json) {
  try {
    if (vMessageObjectBulletinSchema(json) || vMessageObjectPrivateChatFileSchema(json) || vMessageObjectGroupChatFileSchema(json)) {
      console.log(`MessageObject schema ok`)
      return true
    } else {
      console.log(`MessageObject schema invalid`)
      return false
    }
  } catch (e) {
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