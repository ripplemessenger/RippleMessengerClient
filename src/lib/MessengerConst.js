// Default WebSocket server for production
/** @type {string} Production RMS server WebSocket URL */
const DefaultServer = 'wss://jp.ripplemessenger.com'

// Epoch timestamp — base time for partition calculations
// 1000*60*60*24=86400000
//const Epoch = Date.parse('2011-11-11 11:11:11')
/** @type {number} Unix timestamp (ms) of the RMS network epoch (2011-11-11 11:11:11 UTC) */
const Epoch = 1320981071000

// Genesis account — seed of the bulletin chain
/** @type {string} XRPL address of the genesis account whose hash seeded Bulletin #1 */
const GenesisAddress = 'rBTC99bat6K8LAMWoxSvBxWw3HtVpSQLAV'
/** @type {string} QuarterSHA512 hash of GenesisAddress; used as the first bulletin's PreHash */
const GenesisHash = '44F8764BCACFF5424D4044B784549A1B'

// Special system addresses
/** @type {string} Master/admin account address */
const MasterAddress = 'rBoy4AAAAA9qxv7WANSdP5j5y59NP6soJS'
/** @type {string} Official post/bot account address */
const PostAddress = 'rLondondYY5Tf1T9fcRMP9KDF9ZS2dUHZZ'

// List and group size limits
/** @type {number} Maximum entries in batch request lists (e.g. avatar sync, server list) */
const ListItemMax = 16
/** @type {number} Minimum members required to create a group */
const GroupMemberMin = 2
/** @type {number} Maximum members allowed in a group */
const GroupMemberMax = 16

// ActionCode enum — top-level routing field in WebSocket JSON messages.
// Values 100-199: common, 2xx: avatar, 3xx: file, 4xx: bulletin, 5xx: private, 6xx: group.
/** @type {{Declare: number, AvatarRequest: number, FileRequest: number, BulletinRequest: number, BulletinSubscribe: number, RandomBulletinRequest: number, ServerAddressRequest: number, ReplyBulletinRequest: number, TagBulletinRequest: number, BulletinAddressListRequest: number, FriendRequest: number, PrivateMessageSync: number, GroupSync: number, GroupMessageSync: number}} */
const ActionCode = {
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

  // private
  FriendRequest: 500,
  PrivateMessageSync: 501,

  // group
  GroupSync: 600,
  GroupMessageSync: 601
}

// ObjectType enum — payload type discriminator (responses from server).
/** @type {{Nothing: number, ECDH: number, Avatar: number, AvatarList: number, Bulletin: number, ServerAddressList: number, ReplyBulletinList: number, TagBulletinList: number, RandomBulletinList: number, PrivateMessage: number, GroupCreate: number, GroupDelete: number, GroupList: number, GroupMessage: number, GroupMessageList: number}} */
const ObjectType = {
  // common
  Nothing: 100,
  ECDH: 101,

  // avatar
  Avatar: 200,
  AvatarList: 201,

  // bulletin
  Bulletin: 400,
  // 401
  // 402
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
}

// FileRequestType — specifies which kind of file is being requested over the transfer channel.
/** @type {{Avatar: number, File: number, PrivateChatFile: number, GroupChatFile: number}} */
const FileRequestType = {
  Avatar: 100,
  File: 101,
  PrivateChatFile: 102,
  GroupChatFile: 103
}

// MessageObjectType — embedded object references inside messages (not top-level routing).
/** @type {{NotObject: number, Bulletin: number, PrivateChatFile: number, GroupChatFile: number}} */
const MessageObjectType = {
  NotObject: 100,
  Bulletin: 101,
  PrivateChatFile: 102,
  GroupChatFile: 103
}

export {
  DefaultServer,
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
  MessageObjectType
}