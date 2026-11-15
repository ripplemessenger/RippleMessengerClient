/**
 * @ripplemessenger/protocol — typed message interfaces
 *
 * Optional strongly-typed views over the wire format. The validators return
 * `ProtocolMessage` (loose), but call sites that know which code they are
 * handling can cast to these for autocomplete.
 *
 * These mirror `src/schema.js`. They are documentation-grade types, not
 * runtime-checked — the JSON Schema is the authority.
 */

import type {
  ActionCodeValue,
  ObjectTypeValue,
  FileRequestTypeValue,
  MessageObjectTypeValue
} from './constants.js';

/** Common signature envelope carried by every signed message. */
export interface SignedEnvelope {
  Timestamp: number;
  PublicKey: string;
  Signature: string;
}

// ── Declare ─────────────────────────────────────────────────────────────────

export interface DeclareMessage extends SignedEnvelope {
  Action: 100;
  URL?: string;
}

// ── File ────────────────────────────────────────────────────────────────────

export interface FileRequestMessage extends SignedEnvelope {
  Action: 300;
  FileType: FileRequestTypeValue;
  Hash: string;
  Nonce: number;
  ChunkCursor: number;
  /** Exactly one of `To` / `GroupHash` is present. */
  To?: string;
  GroupHash?: string;
}

// ── Avatar ──────────────────────────────────────────────────────────────────

export interface AvatarRequestMessage extends SignedEnvelope {
  Action: 200;
  List: Array<{ Address: string; SignedAt: number }>;
}

export interface AvatarObject {
  ObjectType: 200;
  Hash: string;
  Size: number;
  Timestamp: number;
  PublicKey: string;
  Signature: string;
}

export interface AvatarListMessage {
  ObjectType: 201;
  List: AvatarObject[];
}

// ── Bulletin ────────────────────────────────────────────────────────────────

export interface BulletinQuote {
  Address: string;
  Sequence: number;
  Hash: string;
}

export interface BulletinFileRef {
  Name: string;
  Ext: string;
  Size: number;
  Hash: string;
}

export interface BulletinItem {
  ObjectType: 400;
  Sequence: number;
  PreHash: string;
  Content: string;
  Tag?: string[];
  Quote?: BulletinQuote[];
  File?: BulletinFileRef[];
  Timestamp: number;
  PublicKey: string;
  Signature: string;
}

/** A bulletin object on the wire is the item shape itself. */
export type BulletinMessage = BulletinItem;

export interface BulletinRequestMessage extends SignedEnvelope {
  Action: 400;
  To: string;
  /** Exactly one of `Hash` / (`Address` + `Sequence`) is present. */
  Hash?: string;
  Address?: string;
  Sequence?: number;
}

export interface BulletinSubscribeMessage extends SignedEnvelope {
  Action: 401;
  List: string[];
}

export interface RandomBulletinRequestMessage extends SignedEnvelope {
  Action: 402;
}

export interface ServerAddressRequestMessage extends SignedEnvelope {
  Action: 403;
  Page: number;
}

export interface BulletinAddressListRequestMessage extends SignedEnvelope {
  Action: 406;
  Page: number;
}

export interface AddressCount {
  Address: string;
  Count: number;
}

export interface ServerAddressListMessage {
  ObjectType: 403;
  Page: number;
  TotalPage: number;
  List: AddressCount[];
}

export interface ReplyBulletinRequestMessage extends SignedEnvelope {
  Action: 404;
  Hash: string;
  Page: number;
}

export interface ReplyBulletinListMessage {
  ObjectType: 404;
  Hash: string;
  Page: number;
  TotalPage: number;
  List: BulletinItem[];
}

export interface TagBulletinRequestMessage extends SignedEnvelope {
  Action: 405;
  Tag: string[];
  Page: number;
}

export interface TagBulletinListMessage {
  ObjectType: 405;
  Tag: string[];
  Page: number;
  TotalPage: number;
  List: BulletinItem[];
}

export interface RandomBulletinListMessage {
  ObjectType: 406;
  List: BulletinItem[];
}

// ── ECDH handshake ──────────────────────────────────────────────────────────

export interface ECDHHandshakeMessage extends SignedEnvelope {
  ObjectType: 101;
  Partition: number;
  Sequence: number;
  Self: string;
  Pair: string;
  To: string;
}

// ── Private messages ────────────────────────────────────────────────────────

export interface PrivateMessageConfirm {
  Sequence: number;
  Hash: string;
}

export interface PrivateMessage extends SignedEnvelope {
  ObjectType: 500;
  Sequence: number;
  PreHash: string;
  Confirm?: PrivateMessageConfirm;
  Content: string;
  To: string;
}

export interface PrivateMessageSyncMessage extends SignedEnvelope {
  Action: 501;
  To: string;
  PairSequence: number;
  SelfSequence: number;
}

// ── Group ───────────────────────────────────────────────────────────────────

export interface GroupSyncMessage extends SignedEnvelope {
  Action: 600;
}

export interface GroupMessageSyncMessage extends SignedEnvelope {
  Action: 601;
  Hash: string;
  Address: string;
  Sequence: number;
  To?: string;
}

export interface GroupCreateObject {
  ObjectType: 600;
  Hash: string;
  Name: string;
  Member: string[];
  Timestamp: number;
  PublicKey: string;
  Signature: string;
}

export interface GroupDeleteObject {
  ObjectType: 601;
  Hash: string;
  Timestamp: number;
  PublicKey: string;
  Signature: string;
}

export interface GroupListMessage {
  ObjectType: 602;
  List: Array<GroupCreateObject | GroupDeleteObject>;
  Timestamp?: number;
  PublicKey?: string;
  Signature?: string;
}

export interface GroupMessageConfirm {
  Address: string;
  Sequence: number;
  Hash: string;
}

export interface GroupMessage extends SignedEnvelope {
  ObjectType: 603;
  GroupHash: string;
  Sequence: number;
  PreHash: string;
  Confirm?: GroupMessageConfirm;
  Content: string;
  To: string;
}

export interface GroupMessageListMessage {
  ObjectType: 604;
  GroupHash: string;
  To: string;
  Timestamp: number;
  PublicKey: string;
  List: Array<{
    Sequence: number;
    PreHash: string;
    Confirm?: GroupMessageConfirm;
    Content: string;
    Timestamp: number;
    PublicKey: string;
    Signature: string;
  }>;
}

// ── Message objects (embedded refs) ─────────────────────────────────────────

export interface MessageObjectBulletin {
  ObjectType: MessageObjectTypeValue;
  Address: string;
  Sequence: number;
  Hash: string;
}

export interface MessageObjectFile {
  ObjectType: MessageObjectTypeValue;
  Name: string;
  Ext: string;
  Size: number;
  Hash: string;
}

// ── Control plane ───────────────────────────────────────────────────────────

export interface ServerNotifyMessage {
  ActionCode: 800;
  MessageCode: number;
  ErrorMessage?: string;
  Hash?: string;
  ProgressInfo?: { ReceivedBytes: number; TotalBytes: number };
}

export interface ClientAckMessage {
  ActionCode: 810;
  AckFor: number;
}

// ── Union ───────────────────────────────────────────────────────────────────

/** Any message with an `Action` code. */
export interface ActionMessage {
  Action: ActionCodeValue;
}

/** Any message with an `ObjectType` code. */
export interface ObjectMessage {
  ObjectType: ObjectTypeValue;
}
