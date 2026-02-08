import CryptoJS from 'crypto-js'
import { Wallet, ECDSA } from 'xrpl'
import { GenesisHash } from './MessengerConst'

const ConsoleColors = {
  'bright': '\x1B[1m%s\x1B[0m',
  'grey': '\x1B[2m%s\x1B[0m',
  'italic': '\x1B[3m%s\x1B[0m',
  'underline': '\x1B[4m%s\x1B[0m',
  'reverse': '\x1B[7m%s\x1B[0m',
  'hidden': '\x1B[8m%s\x1B[0m',
  'black': '\x1B[30m%s\x1B[0m',
  'red': '\x1B[31m%s\x1B[0m',
  'green': '\x1B[32m%s\x1B[0m',
  'yellow': '\x1B[33m%s\x1B[0m',
  'blue': '\x1B[34m%s\x1B[0m',
  'magenta': '\x1B[35m%s\x1B[0m',
  'cyan': '\x1B[36m%s\x1B[0m',
  'white': '\x1B[37m%s\x1B[0m',
  'blackBG': '\x1B[40m%s\x1B[0m',
  'redBG': '\x1B[41m%s\x1B[0m',
  'greenBG': '\x1B[42m%s\x1B[0m',
  'yellowBG': '\x1B[43m%s\x1B[0m',
  'blueBG': '\x1B[44m%s\x1B[0m',
  'magentaBG': '\x1B[45m%s\x1B[0m',
  'cyanBG': '\x1B[46m%s\x1B[0m',
  'whiteBG': '\x1B[47m%s\x1B[0m'
}

function ConsoleInfo(str) {
  console.log(ConsoleColors.green, str)
}

function ConsoleWarn(str) {
  console.log(ConsoleColors.yellow, str)
}

function ConsoleError(str) {
  console.log(ConsoleColors.red, str)
}

function ConsoleDebug(str) {
  console.log(ConsoleColors.redBG, str)
}

const kb = 1024
const mb = 1024 * 1024
const gb = 1024 * 1024 * 1024

function add0(m) { return m < 10 ? '0' + m : m }

function timestamp_format(timestamp) {
  let time = new Date(timestamp)
  let y = time.getFullYear()
  let m = time.getMonth() + 1
  let d = time.getDate()
  let h = time.getHours()
  let mm = time.getMinutes()
  let s = time.getSeconds()

  timestamp = new Date()
  let tmp = '@'
  if (y != timestamp.getFullYear()) {
    tmp += y + '-' + add0(m) + '-' + add0(d) + ' '
  } else {
    tmp += add0(m) + '-' + add0(d) + ' '
  }
  return tmp + add0(h) + ':' + add0(mm) + ':' + add0(s)
}

function timestamp_for_short(timestamp) {
  let now = Date.now()
  let time = new Date(timestamp)
  let y = time.getFullYear()
  let m = time.getMonth() + 1
  let d = time.getDate()
  let h = time.getHours()
  let mm = time.getMinutes()
  let s = time.getSeconds()

  timestamp = new Date()
  let tmp = '@'
  if (y != timestamp.getFullYear()) {
    tmp += y + '-' + add0(m) + '-' + add0(d) + ' '
  } else {
    tmp += add0(m) + '-' + add0(d) + ' '
  }
  return tmp + add0(h) + ':' + add0(mm) + ':' + add0(s)
}

function timestamp2Number(timestamp) {
  let time = new Date(timestamp)
  let y = time.getFullYear()
  let m = time.getMonth() + 1
  let d = time.getDate()
  let h = time.getHours()
  let mm = time.getMinutes()
  let s = time.getSeconds()
  let tmp = ''
  return tmp + y + add0(m) + add0(d) + add0(h) + add0(mm) + add0(s)
}

function filesize_format(filesize) {
  if (filesize >= gb) {
    return `${Number((filesize / gb).toFixed(2))}GB`
  } else if (filesize >= mb) {
    return `${Number((filesize / mb).toFixed(2))}MB`
  } else if (filesize >= kb) {
    return `${Number((filesize / kb).toFixed(2))}KB`
  } else {
    return `${filesize}B`
  }
}

function Str2Hex(str) {
  let arr = []
  let length = str.length
  for (let i = 0; i < length; i++) {
    arr[i] = (str.charCodeAt(i).toString(16))
  }
  return arr.join('').toUpperCase()
}

function HalfSHA512(data) {
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data)
  let hash = CryptoJS.SHA512(dataStr).toString().toUpperCase()
  return hash.substring(0, 64)
}

function QuarterSHA512Message(data) {
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data)
  const hash = CryptoJS.SHA512(dataStr).toString().toUpperCase()
  return hash.substring(0, 32)
}

function QuarterSHA512WordArray(wa) {
  let hash = CryptoJS.SHA512(wa).toString().toUpperCase()
  return hash.substring(0, 32)
}

function calcRate(numerator, denominator) {
  let rate = Math.round(numerator / denominator * 10000) / 100
  if (Number.isNaN(rate)) {
    rate = 100
  }
  return rate
}

async function safeAddItem(db, table_name, key, data) {
  const table = db.table(table_name)
  return db.transaction('rw', table, async () => {
    const exists = await table
      .where(key).equals(data[key])
      .count()
      .then(count => count > 0)

    if (!exists) {
      table.add(data)
      return true
    } else {
      return false
    }
  })
}

function genSalt() {
  return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Base64)
}

function deriveKeyFromPassword(password, salt) {
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: (32 + 16) / 4,
    iterations: 1000,
    hasher: CryptoJS.algo.SHA512
  })

  const keyBytes = CryptoJS.lib.WordArray.create(key.words.slice(0, 8))
  const ivBytes = CryptoJS.lib.WordArray.create(key.words.slice(8, 12))

  return { key: keyBytes, iv: ivBytes }
}

function encryptWithPassword(data, password, salt) {
  const { key, iv } = deriveKeyFromPassword(password, salt)
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data)
  const encrypted = CryptoJS.AES.encrypt(dataStr, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })

  return encrypted.toString()
}

function decryptWithPassword(password, salt, cipherData, isObject = false) {
  const { key, iv } = deriveKeyFromPassword(password, salt)
  const decrypted = CryptoJS.AES.decrypt(cipherData, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })
  const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8)
  return isObject ? JSON.parse(decryptedStr) : decryptedStr
}

function getWallet(seed) {
  return Wallet.fromSeed(seed, { algorithm: ECDSA.secp256k1 })
}

function AesEncrypt(content, aes_key) {
  let key = aes_key.slice(0, 32)
  let iv = aes_key.slice(32, 48)
  const dataStr = typeof content === 'object' ? JSON.stringify(content) : String(content)
  const encrypted = CryptoJS.AES.encrypt(dataStr, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })
  return encrypted.toString()
}

function AesDecrypt(cipherData, aes_key) {
  let key = aes_key.slice(0, 32)
  let iv = aes_key.slice(32, 48)
  const decrypted = CryptoJS.AES.decrypt(cipherData, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })
  const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8)
  return decryptedStr
}

function hkdf(ikm, salt, length) {
  if (!salt || salt.sigBytes === 0) {
    salt = CryptoJS.lib.WordArray.create(new Uint8Array(32));
  }
  const prk = CryptoJS.HmacSHA256(ikm, salt)

  let t = CryptoJS.lib.WordArray.create([])
  let lastBlock = CryptoJS.lib.WordArray.create([])
  const hashLength = 32

  const rounds = Math.ceil(length / hashLength)

  for (let i = 0; i < rounds; i++) {
    const input = CryptoJS.lib.WordArray.create()
      .concat(lastBlock)
      .concat(CryptoJS.lib.WordArray.create([(i + 1) << 24]))

    lastBlock = CryptoJS.HmacSHA256(input, prk)
    t = t.concat(lastBlock);
  }

  return CryptoJS.lib.WordArray.create(t.words, length)
}

function genAESKey(shared_key, address1, address2, sequence) {
  let address12 = ''
  if (address1 > address2) {
    address12 = address1 + address2
  } else if (address2 > address1) {
    address12 = address2 + address1
  }
  const salt = CryptoJS.SHA512(GenesisHash + address12 + sequence)
  const derivedKeyLength = 32

  const aesKey = hkdf(shared_key, salt, derivedKeyLength)
  return aesKey.toString()
}

function wordArrayToUint8Array(wordArray) {
  const words = wordArray.words;
  const sigBytes = wordArray.sigBytes;
  const u8 = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return u8;
}

function uint8ArrayToWordArray(u8arr) {
  const words = [];
  for (let i = 0; i < u8arr.length; i++) {
    words[i >>> 2] |= (u8arr[i] & 0xff) << (24 - (i % 4) * 8);
  }
  return CryptoJS.lib.WordArray.create(words, u8arr.length);
}

function AesEncryptBuffer(buffer, aes_key) {
  let key = aes_key.slice(0, 32)
  key = uint8ArrayToWordArray(key)
  let iv = aes_key.slice(32, 48)
  iv = uint8ArrayToWordArray(iv)
  const wordArray = CryptoJS.lib.WordArray.create(buffer)
  const encrypted = CryptoJS.AES.encrypt(wordArray, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })
  let encrypted_buffer = wordArrayToUint8Array(encrypted.ciphertext)
  return encrypted_buffer
}

function AesDecryptBuffer(buffer, aes_key) {
  let key = aes_key.slice(0, 32)
  key = uint8ArrayToWordArray(key)
  let iv = aes_key.slice(32, 48)
  iv = uint8ArrayToWordArray(iv)
  try {
    const wordArray = CryptoJS.lib.WordArray.create(buffer)
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: wordArray
    })
    const decrypted = CryptoJS.AES.decrypt(
      cipherParams,
      key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })

    let decrypted_buffer = wordArrayToUint8Array(decrypted)
    return decrypted_buffer
  } catch (error) {
    console.log(error)
  }
}

function Int2Bool(int) {
  if (int === 1) {
    return true
  }
  return false
}

function Bool2Int(bool) {
  if (bool === true) {
    return 1
  }
  return 0
}

export {
  ConsoleInfo,
  ConsoleWarn,
  ConsoleError,
  ConsoleDebug,
  timestamp_format,
  timestamp2Number,
  filesize_format,

  HalfSHA512,
  QuarterSHA512Message,
  QuarterSHA512WordArray,

  calcRate,
  safeAddItem,

  genSalt,
  encryptWithPassword,
  decryptWithPassword,
  getWallet,
  AesEncrypt,
  AesDecrypt,

  genAESKey,

  AesEncryptBuffer,
  AesDecryptBuffer,

  Int2Bool,
  Bool2Int
}