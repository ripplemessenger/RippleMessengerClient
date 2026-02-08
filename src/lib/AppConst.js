const DefaultServer = 'wss://jp.ripplemessenger.com'

const Minute = 60 * 1000
const Hour = 60 * Minute
const Day = 24 * Hour

const FileDir = 'file'
const AvatarDir = 'avatar'

const BulletinPageTab = {
  Mine: 'Mine',
  Follow: 'Follow',
  Channel: 'Channel',
  Tag: 'Tag',
  Random: 'Random',
  Bookmark: 'Bookmark',
  Address: 'Address',
}

const OpenPageTab = {
  GenNew: 'Generate',
  Temp: 'Temp',
  Saved: 'Saved',
  Add: 'Add',
}

const SettingPageTab = {
  Me: 'Me',
  Contact: 'Contact',
  Group: 'Group',
  Channel: 'Channel',
  MessengerNetwork: 'Messenger Network',
}

const CommonDBSchame = {
  Servers: `URL&, UpdatedAt`,
  Avatars: `Address&, Hash, Size, SignedAt, UpdatedAt, Json, IsSaved, [Hash+IsSaved]`,
  Contacts: `Address&, Nickname, UpdatedAt`,
  Follows: `[Local+Remote]&, Local, Remote, UpdatedAt`,
  Friends: `[Local+Remote]&, Local, Remote, UpdatedAt`,
  Channels: `Name&, CreatedBy, Speaker, CreatedAt`,
  LocalAccounts: `Address&, Salt, CipherData, UpdatedAt`,

  // TODO
  Files: `Hash&, Size, UpdatedAt, ChunkLength, ChunkCursor, IsSaved, [Hash+IsSaved]`,

  Bulletins: `Hash&, Address, Sequence, Content, Tag, Quote, File, Json, SignedAt, PreHash, NextHash, IsMark, [Address+Sequence]`,
  BulletinReplys: `[Hash+ReplyHash]&, SignedAt`,

  ECDHS: `[SelfAddress+PairAddress+Partition+Sequence]&, SelfAddress, PairAddress, Partition, Sequence, AesKey, PrivateKey, PublicKey, SelfJson, PairJson`,

  PrivateMessages: `Hash&, Sour, Dest, Sequence, PreHash, Content, SignedAt, Json, Confirmed, Readed, IsObject, ObjectType, [Sour+Dest+Confirmed]`,
  // TODO
  PrivateChatFiles: `EHash&, Hash, Size, Address1, Address2`,

  Groups: `Hash&, Name, CreatedBy, Member, CreatedAt, CreateJson, DeleteddAt, DeleteJson, IsAccepted`,
  GroupMessages: `Hash&, GroupHash, Address, Sequence, PreHash, Content, SignedAt, Json, Confirmed, Readed, IsObject, ObjectType, [GroupHash+Address], [GroupHash+Confirmed]`,
  GroupChatFiles: `EHash&, Hash, Size, GroupHash`,
}

const DefaultBulletinCacheSize = 0

const MaxSpeaker = 64
const MaxMember = 16

const SessionType = {
  Private: 0,
  Group: 1,
  Channel: 2
}

const DefaultPartition = 90 * 24 * 3600

const NonceMax = 2 ** 32 - 1
const FileChunkSize = 1024 * 1024
const FileMaxSize = 64 * 1024 * 1024
const FileImageExtRegex = /^(png|jpe?g|gif|webp)$/i

//Bulletin
const BulletinPageSize = 20
const BulletinContentPreviewSize = 256

//Message
const MessageInterval = 1000
const MessagePageSize = 50

export {
  DefaultServer,

  Minute,
  Hour,
  Day,

  FileDir,
  AvatarDir,

  OpenPageTab,
  BulletinPageTab,
  SettingPageTab,

  CommonDBSchame,

  DefaultBulletinCacheSize,
  MessageInterval,
  MaxSpeaker,
  MaxMember,
  NonceMax,
  FileChunkSize,
  FileMaxSize,
  DefaultPartition,
  FileImageExtRegex,
  SessionType,
  BulletinPageSize,
  BulletinContentPreviewSize,
  MessagePageSize,
}