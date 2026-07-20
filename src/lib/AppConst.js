// Time constants (milliseconds)
/** @type {number} Milliseconds in one minute */
const Minute = 60 * 1000
/** @type {number} Milliseconds in one hour */
const Hour = 60 * Minute
/** @type {number} Milliseconds in one day */
const Day = 24 * Hour

// Storage directory names
/** @type {string} Directory name for file attachments */
const FileDir = 'file'
/** @type {string} Directory name for avatar images */
const AvatarDir = 'avatar'

// Settings page tab identifiers
/** @type {{Me: string, Contact: string, Group: string, MessengerNetwork: string, Storage: string}} */
const SettingPageTab = {
  Me: 'Me',
  Contact: 'Contact',
  Group: 'Group',
  MessengerNetwork: 'Messenger Network',
  Storage: 'Storage',
}

/** @type {number} Maximum bulletin cache entries; 0 means no caching */
const DefaultBulletinCacheSize = 0

/** @type {number} Maximum concurrent audio speakers in the app */
const MaxSpeaker = 64

// Session type enum — distinguishes private chat from group chat
/** @type {{Private: number, Group: number}} */
const SessionType = {
  Private: 0,
  Group: 1
}

// Partition constants
/** @type {number} Default partition window in seconds (90 days) for ECDH key derivation */
const DefaultPartition = 90 * 24 * 3600

// File transfer limits
/** @type {number} Maximum nonce value (2^32 - 1) used to identify file transfer sessions */
const NonceMax = 2 ** 32 - 1
/** @type {number} File chunk size: 1 MB per WebSocket frame */
const FileChunkSize = 1024 * 1024
/** @type {number} Maximum file size: 64 MB */
const FileMaxSize = 64 * 1024 * 1024
/** @type {RegExp} Regex matching image file extensions for inline preview */
const FileImageExtRegex = /^(png|jpe?g|gif|webp)$/i

// Bulletin pagination
/** @type {number} Bulletins returned per page */
const BulletinPageSize = 20
/** @type {number} Characters shown in bulletin content previews */
const BulletinContentPreviewSize = 256

// Message timing and pagination
/** @type {number} Minimum interval (ms) between outgoing messages to throttle sends */
const MessageInterval = 1000
/** @type {number} Messages returned per sync page */
const MessagePageSize = 50

// Confirm dialog content type identifiers
/** @type {{RemoveAccount: string, DelContact: string, DelGroup: string, DelServer: string, DelBulletin: string, DelFile: string, ClearOrphanedFiles: string}} */
const ConfirmContentOptions = {
  RemoveAccount: 'RemoveAccount',
  DelContact: 'DelContact',
  DelGroup: 'DelGroup',
  DelServer: 'DelServer',
  DelBulletin: 'DelBulletin',
  DelFile: 'DelFile',
  ClearOrphanedFiles: 'ClearOrphanedFiles',
}

// UI timing
/** @type {number} Flash notification duration in milliseconds */
const FLASH_DURATION_MS = 3000
/** @type {number} File request time-to-live in milliseconds (120 seconds) */
const FILE_REQUEST_TTL_MS = 120 * 1000

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

  ConfirmContentOptions,

  FLASH_DURATION_MS,
  FILE_REQUEST_TTL_MS
}