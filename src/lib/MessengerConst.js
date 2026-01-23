//1000*60*60*24=86400000
//const Epoch = Date.parse('2011-11-11 11:11:11')
const Epoch = 1320981071000

const GenesisAddress = 'rBTC99bat6K8LAMWoxSvBxWw3HtVpSQLAV'
//const GenesisHash = QuarterSHA512Message('rBTC99bat6K8LAMWoxSvBxWw3HtVpSQLAV')
const GenesisHash = '44F8764BCACFF5424D4044B784549A1B'

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
  BulletinRandomRequest: 402,
  BulletinAddressRequest: 403,
  ReplyBulletinRequest: 404,
  TagBulletinRequest: 405,

  // private
  FriendRequest: 500,
  PrivateMessageSync: 501,

  // group
  GroupSync: 600,
  GroupMessageSync: 601,

  // asset
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
  BulletinAddressList: 403,
  ReplyBulletinList: 404,
  TagBulletinList: 405,

  // private
  PrivateMessage: 500,

  // group
  GroupCreate: 600,
  GroupDelete: 601,
  GroupList: 602,
  GroupMessage: 603,
  GroupMessageList: 604,

  // asset
  Send: 800,
  Receive: 801,
  ReceiveConfirm: 801,
  OfferCreate: 810,
  OfferCancel: 811,
  OfferTake: 812,
  OfferTakeConfirm: 813
}

const FileRequestType = {
  Avatar: 100,
  File: 101,
  ChatFile: 102
}

const MessageObjectType = {
  NotObject: 100,
  Bulletin: 101,
  ChatFile: 102
}

export {
  Epoch,
  GenesisAddress,
  GenesisHash,

  ActionCode,
  ObjectType,
  FileRequestType,
  MessageObjectType
}