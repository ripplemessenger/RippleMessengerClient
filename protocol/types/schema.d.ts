/**
 * @ripplemessenger/protocol — schema typings
 *
 * The schemas are plain JSON-Schema objects. They are intentionally typed
 * loosely (`JSONSchema`) because the protocol is JSON-on-the-wire and the
 * individual shapes are documented in `src/schema.js`. Typed message
 * interfaces live in `./messages.d.ts` if you need them.
 */

/** A JSON Schema document (draft-07 subset used by the protocol). */
export type JSONSchema = Record<string, unknown>;

// ── Declare ─────────────────────────────────────────────────────────────────
export declare const DeclareSchema: JSONSchema;

// ── File ────────────────────────────────────────────────────────────────────
export declare const FileRequestSchema: JSONSchema;

// ── Avatar ──────────────────────────────────────────────────────────────────
export declare const AvatarRequestSchema: JSONSchema;
export declare const AvatarSchema: JSONSchema;
export declare const AvatarListSchema: JSONSchema;

// ── Bulletin ────────────────────────────────────────────────────────────────
export declare const BulletinSchema: JSONSchema;
export declare const BulletinListItemSchema: JSONSchema;
export declare const BulletinRequestSchema: JSONSchema;
export declare const BulletinSubscribeSchema: JSONSchema;
export declare const RandomBulletinRequestSchema: JSONSchema;
export declare const ServerAddressRequestSchema: JSONSchema;
export declare const ServerAddressListSchema: JSONSchema;
export declare const BulletinAddressListRequestSchema: JSONSchema;
export declare const ReplyBulletinRequestSchema: JSONSchema;
export declare const ReplyBulletinListSchema: JSONSchema;
export declare const TagBulletinRequestSchema: JSONSchema;
export declare const TagBulletinListSchema: JSONSchema;
export declare const RandomBulletinListSchema: JSONSchema;

// ── Chat handshake ──────────────────────────────────────────────────────────
export declare const ECDHHandshakeSchema: JSONSchema;

// ── Private ─────────────────────────────────────────────────────────────────
export declare const PrivateMessageSchema: JSONSchema;
export declare const PrivateMessageSyncSchema: JSONSchema;

// ── Group ───────────────────────────────────────────────────────────────────
export declare const GroupSyncSchema: JSONSchema;
export declare const GroupMessageSyncSchema: JSONSchema;
export declare const GroupListSchema: JSONSchema;
export declare const GroupCreateSchema: JSONSchema;
export declare const GroupDeleteSchema: JSONSchema;
export declare const GroupMessageSchema: JSONSchema;
export declare const GroupMessageListSchema: JSONSchema;

// ── Message objects ─────────────────────────────────────────────────────────
export declare const MessageObjectBulletinSchema: JSONSchema;
export declare const MessageObjectPrivateChatFileSchema: JSONSchema;
export declare const MessageObjectGroupChatFileSchema: JSONSchema;

// ── Control plane ───────────────────────────────────────────────────────────
export declare const ServerNotifyErrorSchema: JSONSchema;
export declare const ServerNotifyInfoSchema: JSONSchema;
export declare const ServerNotifyCacheSchema: JSONSchema;
export declare const ServerNotifyFileProgressSchema: JSONSchema;
export declare const ClientAckSchema: JSONSchema;

// ── Dispatch tables ─────────────────────────────────────────────────────────
export declare const ActionSchemas: Record<number, JSONSchema>;
export declare const ObjectSchemas: Record<number, JSONSchema>;
export declare const MessageObjectSchemas: Record<number, JSONSchema>;
