/**
 * @ripplemessenger/protocol
 *
 * Single source of truth for RippleMessenger protocol constants and schemas.
 *
 * Before this package existed, the same enums and JSON schemas were hand-copied
 * into four places (Client, App, Server, Site) and had already drifted:
 *   - ActionCode.BulletinAddressListRequest (406) existed on the client but was
 *     missing from the server's const file for a while.
 *   - FileMaxSize was 64MB on the client and 1GB on the server.
 *   - Prisma schemas diverged (Server v6, Site v7).
 *
 * Import from here instead of a local copy.
 *
 * @version 0.1.0
 * @license MIT
 */

// ── constants ────────────────────────────────────────────────────────────────
export {
  Epoch,
  GenesisAddress,
  GenesisHash,
  MasterAddress,
  PostAddress,
  ListItemMax,
  GroupMemberMin,
  GroupMemberMax,
  ActionCode,
  ObjectType,
  FileRequestType,
  MessageObjectType,
  MessageCode,
  ControlActionCode,
  ErrorMessageMap
} from './constants.js';

// ── schemas ──────────────────────────────────────────────────────────────────
export {
  // declare
  DeclareSchema,
  // file
  FileRequestSchema,
  // avatar
  AvatarRequestSchema,
  AvatarSchema,
  AvatarListSchema,
  // bulletin
  BulletinSchema,
  BulletinListItemSchema,
  BulletinRequestSchema,
  BulletinSubscribeSchema,
  RandomBulletinRequestSchema,
  ServerAddressRequestSchema,
  ServerAddressListSchema,
  BulletinAddressListRequestSchema,
  ReplyBulletinRequestSchema,
  ReplyBulletinListSchema,
  TagBulletinRequestSchema,
  TagBulletinListSchema,
  RandomBulletinListSchema,
  // chat handshake
  ECDHHandshakeSchema,
  // private
  PrivateMessageSchema,
  PrivateMessageSyncSchema,
  // group
  GroupSyncSchema,
  GroupMessageSyncSchema,
  GroupListSchema,
  GroupCreateSchema,
  GroupDeleteSchema,
  GroupMessageSchema,
  GroupMessageListSchema,
  // message objects
  MessageObjectBulletinSchema,
  MessageObjectPrivateChatFileSchema,
  MessageObjectGroupChatFileSchema,
  // control plane
  ServerNotifyErrorSchema,
  ServerNotifyInfoSchema,
  ServerNotifyCacheSchema,
  ServerNotifyFileProgressSchema,
  ClientAckSchema,
  // dispatch tables
  ActionSchemas,
  ObjectSchemas,
  MessageObjectSchemas
} from './schema.js';

// ── validators ───────────────────────────────────────────────────────────────
export {
  MsgValidate,
  validateMessage,
  validateAction,
  validateObject,
  validateParsed,
  getErrors
} from './validator.js';

export { default as protocol } from './validator.js';
