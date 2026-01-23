import CryptoJS from 'crypto-js'
import { Buffer } from 'buffer'
import * as rippleKeyPairs from 'ripple-keypairs'
import { Epoch } from './MessengerConst'
import { ConsoleWarn, HalfSHA512, QuarterSHA512Message, QuarterSHA512WordArray } from './AppUtil'
import { NonceMax } from './AppConst'

function AddressToName(address_map, address) {
  if (!address) {
    return 'not a address'
  }
  if (address_map[address] != null) {
    return address_map[address]
  } else {
    return `${address.substring(0, 7)}...${address.substring(address.length - 5)}`
  }
}

//input encode:'utf-8', 'ascii', 'binary'
//output encode:'hex', 'binary', 'base64'
var encrypt = function (key, iv, data) {
  var cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  var crypted = cipher.update(data, 'utf8', 'base64')
  crypted += cipher.final('base64')
  return crypted
}

var decrypt = function (key, iv, crypted) {
  var decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  var decoded = decipher.update(crypted, 'base64', 'utf8')
  decoded += decipher.final('utf8')
  return decoded
}

function FileHash(buffer) {
  const wordArray = CryptoJS.lib.WordArray.create(buffer)
  const hash = QuarterSHA512WordArray(wordArray)
  return hash
}

function FileEHash(address1, address2, hash) {
  let tmpStr = ''
  if (address1 > address2) {
    tmpStr = address1 + address2 + hash
  } else {
    tmpStr = address2 + address1 + hash
  }
  const ehash = QuarterSHA512WordArray(tmpStr)
  return ehash
}

function DHSequence(partition, timestamp, address1, address2) {
  let tmpStr = ''
  if (address1 > address2) {
    tmpStr = address1 + address2
  } else {
    tmpStr = address2 + address1
  }
  let tmpInt = parseInt(HalfSHA512(tmpStr).substring(0, 6), 16)
  let cursor = (tmpInt % partition) * 1000
  let seq = parseInt((timestamp - (Epoch + cursor)) / (partition * 1000))
  return seq
}

function Sign(msg, sk) {
  let sig = rippleKeyPairs.sign(msg, sk)
  return sig
}

function VerifyJsonSignature(json) {
  const sig = json["Signature"]
  delete json["Signature"]
  const json_hash = QuarterSHA512Message(json)
  if (rippleKeyPairs.verify(json_hash, sig, json.PublicKey)) {
    json["Signature"] = sig
    return true
  } else {
    ConsoleWarn('signature invalid...')
    console.log(json)
    return false
  }
}

function Uint32ToBuffer(num, isBigEndian = true) {
  if (num < 0 || num > 4294967295) {
    return false
  }
  const buf = Buffer.alloc(4)
  if (isBigEndian) {
    buf.writeUInt32BE(num, 0)
  } else {
    buf.writeUInt32LE(num, 0)
  }
  return buf
}

async function BlobToUint32(blob, isBigEndian = true) {
  const arrayBuffer = await blob.arrayBuffer()
  const buf = Buffer.from(arrayBuffer)
  return isBigEndian
    ? buf.readUInt32BE(0)
    : buf.readUInt32LE(0)
}

function genRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function genNonce() {
  return genRandomInt(0, NonceMax)
}

function calcTotalPage(total, page_size) {
  let total_page = Math.floor(total / page_size)
  if (total_page !== total / page_size) {
    total_page + 1
  }
  return total_page
}

function trimEndCommasAndValidate(str) {
  if (typeof str !== 'string' || str === '') {
    return false
  }
  const endCommaReg = /,+$/
  const resultStr = str.replace(endCommaReg, '')
  const isEndWithComma = endCommaReg.test(str)
  return isEndWithComma && resultStr.length > 0 ? resultStr : false
}

export {
  AddressToName,

  FileHash,
  FileEHash,
  encrypt,
  decrypt,

  Sign,
  VerifyJsonSignature,

  DHSequence,

  Uint32ToBuffer,
  BlobToUint32,
  genNonce,
  calcTotalPage,
  trimEndCommasAndValidate
}