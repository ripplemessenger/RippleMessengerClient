import Ajv from 'ajv'
import { AvatarListSchema, AvatarRequestSchema, BulletinAddressListSchema, ReplyBulletinListSchema, BulletinRequestSchema, BulletinSchema, TagBulletinListSchema, DeclareSchema, ECDHHandshakeSchema, FileRequestSchema, GroupSyncSchema, GroupListSchema, GroupMessageListSchema, GroupMessageSchema, GroupMessageSyncSchema, MessageObjectBulletinSchema, MessageObjectChatFileSchema, OfferCancelSchema, OfferCreateSchema, OfferTakeConfirmSchema, OfferTakeSchema, PrivateMessageSchema, PrivateMessageSyncSchema, ReceiveSchema, SendSchema } from './MessageSchema'
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

const vBulletinAddressListSchema = ajv.compile(BulletinAddressListSchema)
function checkBulletinAddressListSchema(json) {
  try {
    if (vBulletinAddressListSchema(json)) {
      console.log(`BulletinAddressListSchema ok`)
      return true
    } else {
      console.log(`BulletinAddressListSchema invalid`)
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

// Asset
const vSendSchema = ajv.compile(SendSchema)
function checkSendSchema(json) {
  try {
    if (vSendSchema(json)) {
      console.log(`SendSchema ok`)
      return true
    } else {
      console.log(`SendSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vReceiveSchema = ajv.compile(ReceiveSchema)
function checkReceiveSchema(json) {
  try {
    if (vReceiveSchema(json)) {
      console.log(`ReceiveSchema ok`)
      return true
    } else {
      console.log(`ReceiveSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vOfferCreateSchema = ajv.compile(OfferCreateSchema)
function checkOfferCreateSchema(json) {
  try {
    if (vOfferCreateSchema(json)) {
      console.log(`OfferCreateSchema ok`)
      return true
    } else {
      console.log(`OfferCreateSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vOfferCancelSchema = ajv.compile(OfferCancelSchema)
function checkOfferCancelSchema(json) {
  try {
    if (vOfferCancelSchema(json)) {
      console.log(`OfferCancelSchema ok`)
      return true
    } else {
      console.log(`OfferCancelSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vOfferTakeSchema = ajv.compile(OfferTakeSchema)
function checkOfferTakeSchema(json) {
  try {
    if (vOfferTakeSchema(json)) {
      console.log(`OfferTakeSchema ok`)
      return true
    } else {
      console.log(`OfferTakeSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vOfferTakeConfirmSchema = ajv.compile(OfferTakeConfirmSchema)
function checkOfferTakeConfirmSchema(json) {
  try {
    if (vOfferTakeConfirmSchema(json)) {
      console.log(`OfferTakeConfirmSchema ok`)
      return true
    } else {
      console.log(`OfferTakeConfirmSchema invalid`)
      return false
    }
  } catch (e) {
    return false
  }
}

const vMessageObjectBulletinSchema = ajv.compile(MessageObjectBulletinSchema)
const vMessageObjectChatFileSchema = ajv.compile(MessageObjectChatFileSchema)

function checkMessageObjectSchema(json) {
  try {
    if (vMessageObjectBulletinSchema(json) || vMessageObjectChatFileSchema(json)) {
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
  checkBulletinAddressListSchema,
  // checkReplyBulletinRequestSchema,
  checkReplyBulletinListSchema,
  // checkTagBulletinRequestSchema,
  checkTagBulletinListSchema,

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

  checkMessageObjectSchema,

  // asset
  checkSendSchema,
  checkReceiveSchema,
  checkOfferCreateSchema,
  checkOfferCancelSchema,
  checkOfferTakeSchema,
  checkOfferTakeConfirmSchema
}