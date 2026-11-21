/**
 * @ripplemessenger/protocol - Constants
 * 
 * Unified protocol constants for RippleMessenger.
 * Used by Client, App, Server, and Site.
 * 
 * @version 0.1.0
 */

// Epoch timestamp — base time for partition calculations
// 1000*60*60*24=86400000
export const Epoch = 1320981071000; // 2011-11-11 11:11:11 UTC

// Genesis account — seed of the bulletin chain
export const GenesisAddress = 'rBTC99bat6K8LAMWoxSvBxWw3HtVpSQLAV';
export const GenesisHash = '44F8764BCACFF5424D4044B784549A1B';

// Special system addresses
export const MasterAddress = 'rBoy4AAAAA9qxv7WANSdP5j5y59NP6soJS';
export const PostAddress = 'rLondondYY5Tf1T9fcRMP9KDF9ZS2dUHZZ';

// List and group size limits
export const ListItemMax = 16;
export const GroupMemberMin = 2;
export const GroupMemberMax = 16;

/**
 * ActionCode enum — top-level routing field in WebSocket JSON messages.
 * Values: 1xx common, 2xx avatar, 3xx file, 4xx bulletin, 5xx private, 6xx group, 8xx control
 */
export const ActionCode = {
  // common
  Declare: 100,

  // avatar
  AvatarRequest: 200,

  // file
  FileRequest: 300,

  // bulletin
  BulletinRequest: 400,
  BulletinSubscribe: 401,
  RandomBulletinRequest: 402,
  ServerAddressRequest: 403,
  ReplyBulletinRequest: 404,
  TagBulletinRequest: 405,
  BulletinAddressListRequest: 406,
  MediaBulletinRequest: 407,

  // private
  // NOTE: 500 was previously `FriendRequest`. It was never implemented on any
  // side (no schema, no validator case, no server handler, no generator), so
  // sending it would fail schema validation and get the connection terminated.
  // Friend relationships are established via contacts + ECDH handshake instead.
  // The value 500 is still used by ObjectType.PrivateMessage below.
  PrivateMessageSync: 501,

  // group
  GroupSync: 600,
  GroupMessageSync: 601,

  // Control-plane ActionCode extensions (8xx) — unsigned, server-initiated or client ack
  ServerNotify: 800,
  ServerNotifyAckReq: 801,
  ClientAck: 810
};

/**
 * ObjectType enum — payload type discriminator (responses from server).
 */
export const ObjectType = {
  // common
  Nothing: 100,
  ECDH: 101,

  // avatar
  Avatar: 200,
  AvatarList: 201,

  // bulletin
  Bulletin: 400,
  ServerAddressList: 403,
  ReplyBulletinList: 404,
  TagBulletinList: 405,
  RandomBulletinList: 406,

  // private
  PrivateMessage: 500,

  // group
  GroupCreate: 600,
  GroupDelete: 601,
  GroupList: 602,
  GroupMessage: 603,
  GroupMessageList: 604
};

/**
 * FileRequestType — specifies which kind of file is being requested over the transfer channel.
 */
export const FileRequestType = {
  Avatar: 100,
  File: 101,
  PrivateChatFile: 102,
  GroupChatFile: 103
};

/**
 * MessageObjectType — embedded object references inside messages (not top-level routing).
 */
export const MessageObjectType = {
  NotObject: 100,
  Bulletin: 101,
  PrivateChatFile: 102,
  GroupChatFile: 103
};

/**
 * MessageCode (7xx) — server-to-client notifications/errors.
 */
export const MessageCode = {
  // Error codes (701-704) — server reports validation failure -> may disconnect
  JsonSchemaInvalid: 701,
  SignatureInvalid: 702,
  TimestampInvalid: 703,
  AddressMismatch: 704,

  // Notification codes (710-713) — informational, may disconnect
  KickedByNewConn: 710,
  ServerShutdown: 711,
  SyncComplete: 712,
  NotAllowed: 713,

  // Cache success codes (720-723) — server local operation confirmation
  BulletinCached: 720,
  PrivateMsgCached: 721,
  HandshakeCached: 723,

  // File transfer progress (730-732)
  FileChunkReceived: 730,
  FileTransferComplete: 731,
  FileTransferFailed: 732
};

/**
 * ControlActionCode — convenience alias for the 8xx control-plane subset of
 * ActionCode. Both Client and App reference these as `ControlActionCode.*`
 * (e.g. `ControlActionCode.ServerNotify`), so they live here as the single
 * source of truth rather than being hand-copied into each client.
 *
 * Values are identical to the corresponding ActionCode entries.
 */
export const ControlActionCode = {
  ServerNotify: ActionCode.ServerNotify, // 800
  ServerNotifyAckReq: ActionCode.ServerNotifyAckReq, // 801
  ClientAck: ActionCode.ClientAck // 810
};

/**
 * Error messages mapping for UI display (client-side only).
 */
export const ErrorMessageMap = {
  [MessageCode.JsonSchemaInvalid]: 'Invalid message format',
  [MessageCode.SignatureInvalid]: 'Message signature verification failed',
  [MessageCode.TimestampInvalid]: 'Message timestamp out of range',
  [MessageCode.AddressMismatch]: 'Address mismatch detected',
  [MessageCode.KickedByNewConn]: 'Disconnected — new login detected',
  [MessageCode.ServerShutdown]: 'Server is shutting down',
  [MessageCode.SyncComplete]: 'Synchronization complete',
  [MessageCode.NotAllowed]: 'You are not allowed to perform this action'
};


