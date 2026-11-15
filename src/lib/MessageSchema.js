// JSON schemas.
//
// The canonical schemas live in @ripplemessenger/protocol. This file is a thin
// re-export so existing `import { DeclareSchema } from "./MessageSchema"` call
// sites keep working unchanged.
//
// Verified identical to the old local copy by
// packages/protocol/scripts/schema-parity.mjs (35 schemas, 43 assertions).
export {
  DeclareSchema,
  FileRequestSchema,

  // Avatar
  AvatarRequestSchema,
  AvatarSchema,
  AvatarListSchema,

  // Bulletin
  BulletinSchema,
  BulletinSubscribeSchema,
  BulletinRequestSchema,
  ServerAddressRequestSchema,
  ServerAddressListSchema,
  ReplyBulletinRequestSchema,
  ReplyBulletinListSchema,
  TagBulletinRequestSchema,
  TagBulletinListSchema,
  RandomBulletinRequestSchema,
  RandomBulletinListSchema,

  // Chat Handshake
  ECDHHandshakeSchema,

  // Private
  PrivateMessageSchema,
  PrivateMessageSyncSchema,

  // Group
  GroupSyncSchema,
  GroupMessageSyncSchema,
  GroupListSchema,
  GroupCreateSchema,
  GroupDeleteSchema,
  GroupMessageSchema,
  GroupMessageListSchema,

  // Message Object
  MessageObjectBulletinSchema,
  MessageObjectPrivateChatFileSchema,
  MessageObjectGroupChatFileSchema
} from '@ripplemessenger/protocol/schema'
