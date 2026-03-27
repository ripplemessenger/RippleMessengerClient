const Minute = 60 * 1000
const Hour = 60 * Minute
const Day = 24 * Hour

const FileDir = 'file'
const AvatarDir = 'avatar'

const SettingPageTab = {
  Me: 'Me',
  Contact: 'Contact',
  Group: 'Group',
  Channel: 'Channel',
  MessengerNetwork: 'Messenger Network',
}

const DefaultBulletinCacheSize = 0

const MaxSpeaker = 64

const SessionType = {
  Private: 0,
  Group: 1,
  Channel: 2
}

const DefaultPartition = 90 * 24 * 3600

const NonceMax = 2 ** 32 - 1
// 1M
const FileChunkSize = 1024 * 1024
// 64M
const FileMaxSize = 64 * 1024 * 1024
const FileImageExtRegex = /^(png|jpe?g|gif|webp)$/i

//Bulletin
const BulletinPageSize = 20
const BulletinContentPreviewSize = 256

//Message
const MessageInterval = 1000
const MessagePageSize = 50

export {
  Minute,
  Hour,
  Day,

  FileDir,
  AvatarDir,

  SettingPageTab,

  DefaultBulletinCacheSize,
  MessageInterval,
  MaxSpeaker,
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