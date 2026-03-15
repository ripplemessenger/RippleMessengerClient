const DefaultServer = 'wss://jp.ripplemessenger.com'

//1000*60*60*24=86400000
//const Epoch = Date.parse('2011-11-11 11:11:11')
const Epoch = 1320981071000

const GenesisAddress = 'rBTC99bat6K8LAMWoxSvBxWw3HtVpSQLAV'
//const GenesisHash = QuarterSHA512Message('rBTC99bat6K8LAMWoxSvBxWw3HtVpSQLAV')
const GenesisHash = '44F8764BCACFF5424D4044B784549A1B'

const MasterAddress = 'rBoy4AAAAA9qxv7WANSdP5j5y59NP6soJS'

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

  // private
  FriendRequest: 500,
  PrivateMessageSync: 501,

  // group
  GroupSync: 600,
  GroupMessageSync: 601
}

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

const FileRequestType = {
  Avatar: 100,
  File: 101,
  PrivateChatFile: 102,
  GroupChatFile: 103
}

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

  ActionCode,
  ObjectType,
  FileRequestType,
  MessageObjectType
}