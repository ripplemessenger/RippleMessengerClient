# RippleMessenger 系统设计文档

> 范围: RippleMessengerClient + RippleMessengerServer 的通讯协议与去中心化实现
> 目的: 记录系统自身的设计思想、密码学原则和实现逻辑

---

## 目录

1. [身份系统 — 密码学即注册](#1-身份系统--密码学即注册)
2. [签名机制 — Zero Trust 消息验证](#2-签名机制--zero-trust-消息验证)
3. [公告链 — Hash-Linked Per-Address Chain](#3-公告链--hash-linked-per-address-chain)
4. [DHSequence 分区系统 — 确定性密钥轮换](#4-dhsequence-分区系统--确定性密钥轮换)
5. [ECDH 握手协议 — 私聊与群聊端到端加密](#5-eecd-握手协议--私聊与群聊端到端加密)
6. [消息链验证 — 私聊完整性保证](#6-消息链验证--私聊完整性保证)
7. [文件传输协议 — Nonce-based 分块加密传输](#7-文件传输协议--nonce-based-分块加密传输)
8. [协议路由矩阵 — ActionCode/ObjectType 双轴分发](#8-协议路由矩阵--actioncodeobjecttype-双轴分发)
9. **[数据层设计 — Client SQLite + Server PostgreSQL 双存储](#9-数据层设计---client-sqlite--server-postgresql-双存储)**
10. **[消息交互与同步协议 — 从登录到离线恢复的完整生命周期](#10-消息交互与同步协议---从登录到离线恢复的完整生命周期)**
11. [联邦网络 — Declare 双重用途与节点同步](#11-联邦网络--declare-双重用途与节点同步)
12. [安全模型与设计权衡](#12-安全模型与设计权衡)
13. [设计核心思想总结](#13-设计核心思想总结)

---

## 1. 身份系统 — 密码学即注册

### 1.1 Seed 即身份

```
用户拥有: XRPL Seed (私钥助记词)
  ↓ ripple-keypairs.deriveKeypair()
公钥 (PublicKey, hex)
  ↓ ripple-keypairs.deriveAddress()
XRPL 地址 (rXXXXXXXXXXXXXXXXXXXXX)
```

**无注册机制。** RippleMessenger 没有用户表、没有邮箱验证、没有密码重置。身份完全由密码学密钥对定义:

- `ripple-keypairs` (XRPL 库) 基于 secp256k1 EdDSA (主网) 或 Ed25519 (测试网)
- Seed → PublicKey → Address 的派生是确定性的，全球唯一
- 谁持有私钥，谁就是该地址。私钥永不离开客户端

### 1.2 登录 = 自认证

```javascript
// Client 启动流程
localStorage 恢复 Seed/AES 加密种子
  ↓
handleLogin():
  updateAccountUpdatedAt()        // 本地 SQLite 标记活跃
  loginSuccess({seed, addr})       // Redux: 有私钥 = 已登录
  LoadContactList / LoadServerList // 从本地 DB 恢复社交图
  ↓
Declare → Server:
  { Action: 100, PublicKey, Signature: EdDSA(sign(PublicKey)) }
```

**关键区别:**

| 传统系统 | RippleMessenger |
|---------|----------------|
| 注册中心 (user 表 + email 验证) | **无注册** — Seed 即身份 |
| Server 发放 session token / JWT | **Server 不发放任何凭证** |
| 账号可被封禁 | **不可封禁** — 身份不在服务端数据库中 |
| 用户名可能重复/抢注 | XRPL 地址密码学唯一 |

Server 对 Declare 消息只验证签名有效，不注册、不授权。`Conns[address] = ws` 只是记录 WebSocket 连接，不做任何认证状态的持久化。

### 1.3 去中心化意义

身份系统借鉴了 **比特币的地址模型**: 全球唯一、无需许可、抗审查。任何持有 XRPL 私钥的人都能使用 RippleMessenger，不需要 Server 批准。

---

## 2. 签名机制 — Zero Trust 消息验证

### 2.1 每条消息必须签名

```javascript
// MessageGenerator.signJson()
function signJson(json) {
  let json_hash = QuarterSHA512Message(json)   // SHA-512 前 32 hex char
  let sig = rippleKeyPairs.sign(json_hash, privateKey)
  json.Signature = sig
  return json
}
```

签名覆盖消息全部内容 (JSON.stringify 后 SHA-512 截断哈希)。验证方用 `ripple-keypairs.verify(hash, sig, publicKey)` 确认来源。

### 2.2 双层验证流水线

**Server 端:**
```
WS 收到文本消息
  ↓
Phase 1: JSON.parse() → object
  ↓
Phase 2: MsgValidate(strJson) — AJV Schema 验证
  (根据 Action 或 ObjectType 选对应 Schema)
  ↓
Phase 3: VerifyJsonSignature(json) — EdDSA 签名验证
  ↓
Phase 4: Route to business logic
```

**Client 端:**
```
WS 收到消息
  ↓
checkBulletinSchema(json) && VerifyJsonSignature(json)
  ↓ (任一失败 → 丢弃)
路由到对应处理函数
```

### 2.3 QuarterSHA512 — 有意识的碰撞风险取舍

```javascript
// SHA-512 全输出 = 128 hex char (512 bits)
// QuarterSHA512 = 前 32 hex char (128 bits) 用于签名哈希
// 显示 Hash = 前 10 hex char (40 bits) 用于 UI 展示

function QuarterSHA512Message(data) {
  const hash = SHA512(JSON.stringify(data)).toUpperCase()
  return hash.substring(0, 32)  // 128 bits — 签名足够安全
}
```

| 用途 | 截断长度 | 碰撞风险 |
|------|---------|---------|
| 消息签名哈希 | 32 hex (128 bit) | 可忽略 |
| 文件/公告展示 Hash | 10 hex (40 bit) | ~100万条后 50% — 但**签名是安全底线** |

**设计逻辑:** 即使 hash 碰撞，伪造者也无法生成有效 EdDSA 签名。Hash 仅用于去重和 UI 引用，签名才是防篡改的真实防线。这是 **Usability > Pure Cryptography 的有意识 trade-off**。

---

## 3. 公告链 — Hash-Linked Per-Address Chain

### 3.1 链结构

```
每个 XRPL 地址独立维护一条公告链:

Genesis Hash "44F8764BCACFF5424D4044B784549A1B"
  │
  ▼
┌─────────────────────────────┐
│ sequence_number: 1          │
│ content: "Hello World!"     │
│ pre_hash: GenesisHash      │ ◄── 指向创世
│ hash: H1 = QuarterSHA512(   │
│    full_json_without_sig)   │ ◄── 内容哈希
│ signature: EdDSA(H1)       │ ◄── 私钥签名
│ timestamp                  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ sequence_number: 2          │
│ content: "Second post"      │
│ pre_hash: H1               │ ◄── 指向上一条的 hash
│ hash: H2                   │
│ signature: EdDSA(H2)       │
│ tag: ["news"]              │
│ quote: [{hash: H1}]        │ ◄── 引用其他公告
│ file: [{hash, size}]       │
└──────────┬──────────────────┘
```

### 3.2 Server 端的链维护

```javascript
// CacheBulletin() — main.js
async function CacheBulletin(from, bulletin, isFromNode) {
  let hash = QuarterSHA512Message(bulletin)
  let address = deriveAddress(bulletin.PublicKey)

  // upsert — hash 唯一键，幂等写入
  await prisma.Bulletin.upsert({
    where: { hash },
    update: {},
    create: { hash, pre_hash, address, sequence, content, json, ... }
  })

  // 新记录才链接: 更新上一条的 next_hash → 当前 hash
  if (isNewRecord && bulletin.Sequence !== 1) {
    await prisma.Bulletin.update({
      where: { hash: bulletin.PreHash },
      data: { next_hash: hash }
    })
  }

  // 白名单地址才广播到其他节点
  if (isAddressAllowed(address)) {
    broadcastBulletinToNodes(bulletin)
  }
}
```

### 3.3 "去共识区块链"设计

```
Blockchain:     hash-linking + signature + consensus + mining + incentive
Bulletin Chain: hash-linking + signature + [单写者, 无需共识]
```

**为什么不需要共识?** 每条链只有一个合法生产者——一个地址只对应一个私钥持有者。无竞争 = 无需 PoW/PoS。这是 **Blockchain 思想的"单写者模式"**。

### 3.4 完整性保证

| 属性 | 实现 | 效果 |
|------|------|------|
| 不可篡改 | pre_hash → next_hash 双向链接 | 改一条则整条链断裂 |
| 有序性 | sequence_number 单调递增 | 消息不可重排 |
| 来源可验证 | EdDSA 签名, PublicKey → Address | 任何人都能验签 |
| 去重 | QuarterSHA512 hash 作为唯一键 | 同内容公告只存一次 |
| 引用追溯 | `quote` 字段存被引用公告的 hash | 类似 Quote-tweet |

---

## 4. DHSequence 分区系统 — 确定性密钥轮换

### 4.1 核心问题

ECDH 握手需要双方协商一个 `sequence` 编号来派生 AES 密钥。如果双方时间不同步或 sequence 不匹配，就算出不同的密钥，消息无法解密。**如何让两个独立客户端算出相同的 sequence？**

### 4.2 DHSequence 函数

```javascript
// MessengerUtil.js — Client 端与 Server 端逻辑一致
const Epoch = 1320981071000  // 2011-11-11 11:11:11 UTC
const DefaultPartition = 90 * 24 * 3600  // 90 天 (秒)

function DHSequence(partition, timestamp, address1, address2) {
  // 1. 地址对称化: 字典序排序，确保双方结果一致
  let tmpStr = address1 > address2
    ? address1 + address2
    : address2 + address1

  // 2. 从地址对派生确定性 cursor (0 ~ partition-1 的偏移)
  let tmpInt = parseInt(HalfSHA512(tmpStr).substring(0, 6), 16)
  let cursor = (tmpInt % partition) * 1000

  // 3. 计算当前时间落在第几个分区周期
  let seq = parseInt((timestamp - (Epoch + cursor)) / (partition * 1000))

  return seq
}
```

### 4.3 设计精妙之处

**确定性:** 双方输入相同的 `(partition, timestamp, addrA, addrB)` → 输出相同的 `seq`。地址对排序消除顺序依赖，SHA512 cursor 使每对用户有独特的时间偏移。

**时间分区轮换:** `DefaultPartition = 90天`。每 90 天，`seq` 自动递增，派生新的 AES 密钥。旧密钥不再使用，实现 **周期性的前向安全轮换**。

**cursor 的作用:** `HalfSHA512(addrA + addrB)` 的不同值意味着每对用户有唯一的时间偏移。避免所有用户在同一时刻轮换密钥，分散握手流量。

### 4.4 AES 密钥派生链

```javascript
// AppUtil.js
function genAESKey(shared_secret, address1, address2, sequence) {
  // 地址对称化 (同 DHSequence)
  let addrPair = address1 > address2
    ? address1 + address2 : address2 + address1

  // salt = SHA512(GenesisHash + addrPair + sequence)
  const salt = SHA512(GenesisHash + addrPair + sequence)

  // HKDF-DH: 从 ECDH shared secret 派生 AES key
  const aesKey = hkdf(shared_secret, salt, 32)  // 256 bits
  return aesKey.toString()  // hex string
}
```

密钥派生公式: `AES-Key = HKDF(ECDH-Shared-Secret, SHA512(Genesis + AddrPair + Seq))`

双方独立计算，结果相同。Server 不存储、不传输 AES 密钥。

---

## 5. ECDH 握手协议 — 私聊与群聊端到端加密

### 5.1 握手消息格式

```javascript
// ObjectType.ECDH (101)
{
  ObjectType: 101,
  Partition: 90 * 24 * 3600,      // 分区周期 (秒)
  Sequence: DHSequence(),          // 当前分区序列号
  Self: ecdh_public_key_hex,       // 本次握手的 ECDH 公钥
  Pair: "",                        // 对方公钥 (首轮空，回执时填入)
  To: destination_address,
  Timestamp: Date.now(),
  PublicKey: xrpl_public_key,      // XRPL 身份公钥
  Signature: EdDSA(sign(json))     // 签名覆盖全部内容
}
```

### 5.2 私聊握手流程

```
User A (发起方)                          User B (接收方)
  │                                          │
  │── ECDH { Self: pubA, Pair: "", Seq } ──▶│
  │                                         │── db.getHandshake(A, B, partition, seq)
  │                                         │   → null (首次)
  │                                         │
  │                                         │── ecdh_private = HalfSHA512(Genesis + seedB + addrB + seq)
  │                                         │── ecdh_pubB = derivePublic(ecdh_private)
  │                                          │── shared = ECDH(pubA, privB)
  │                                          │── aesKey = HKDF(shared, salt)
  │                                          │── db.initHandshakeFromRemote(B, A, ..., aesKey, pubB, pair=pubA)
  │                                          │
  │◄── ECDH { Self: pubB, Pair: pubA } ────│
  │                                          │
  │── db.updateHandshake(A, B, ..., aesKey, Pair=pubB)
  │    (Pair ≠ "" → 握手完成，不再回传)
  │
  │── 此后 AES-CBC(aesKey) 加密所有私聊消息
```

**确定性私钥派生:** `ecdh_private = HalfSHA512(GenesisHash + seed + address + sequence)`

同一 sequence 内，ECDH 私钥可以从 XRPL Seed 重新派生，无需持久化 ECDH 私钥本身。这简化了密钥管理——SQLite 只存 AES key 和握手 JSON。

### 5.3 加密/解密路径

```javascript
// 发送私聊消息:
const content_json = { ObjectType: 102, Content: "hello", ... }
const encrypted = AesEncrypt(JSON.stringify(content_json), ecdh.aes_key)
send({ ObjectType: 500, Sequence: next_seq, PreHash: last_hash,
       Content: encrypted, To: partner })

// 接收私聊消息:
const ecdh = db.getHandshake(self, remote, partition, DHSequence(partition, timestamp, self, remote))
const decrypted = AesDecrypt(json.Content, ecdh.aes_key)
```

**Server 的角色:** 收到 ObjectType.PrivateMessage → AJV Schema 验证 → EdDSA 签名验证 → `CachePrivateMessage()` 存密文 → 转发给 `json.To`。**Server 只存密文，不解密。**

### 5.4 群聊 Mesh Topology (全网状)

```
         AES-A↔B     AES-B↔C
      A ──────── B ──────── C
       ╱    │      ╱    │
      /     │     /     │
  AES-A↔D  AES-A↔C AES-B↔D
      \     │     \     │
       ╲    │      ╲    │
         D ──────────── E
          AES-D↔E
```

对于 N 成员的群，每对成员之间均有一条独立的 ECDH 链路：

- **握手:** 任意两个成员之间建立 ECDH 握手（与私聊相同的流程），通过 `DHSequence(timestamp, addrA, addrB)` 派生 AES 密钥。`handshakes` 表按 `(self_address, pair_address, partition, sequence)` 存储每对成员的 ECDH 状态
- **消息发送:** 发送者向群中每个其他成员分别用自己与该成员的 pairwise AES key 加密消息后通过 WebSocket 发送（`SendGroupContent` → `SendGroupMessageToMember`，遍历 member list 并发 fork）。Server 收到后转发给 `json.To` 指定的目标成员
- **消息接收:** 接收方用与**该消息的发送者**的 pairwise AES key 解密（`handleGroupMessageListObject`：查 `DHSequence(timestamp, self, sender)` → `getHandshake(self, sender)` → `AesDecrypt(content, ecdh.aes_key)`）
- **O(n²) key 管理:** N 成员需 N×(N-1)/2 条 pairwise ECDH 链路（例如 4 人 = 6 条链路）。最多 16 人限制因此更严格——ECDH 握手数量、消息分发成本（每人发送需加密 15 次）、SQLite handshake 查询复杂度均随人数平方增长
- **消息同步 (GroupMessageSync):** 当检测到链断裂时，双方逐对进行增量同步。与私聊 `PrivateMessageSync` 类似的机制，每个成员对其他成员的未读消息分别发起同步请求

### 5.5 群聊消息同步

```javascript
// GroupMessageSync — 向特定成员同步缺失消息
ActionCode.GroupMessageSync → Server 转发给目标成员
  ↓
Client 收到:
  1. DHSequence(timestamp, self, that_member) → 找 AES key
  2. db.getUnsyncGroupSession(groupHash, sinceTimestamp)
  3. 逐条 AesEncrypt() → 打包 GroupMessageList → 发送
```

---

## 6. 消息链验证 — 私聊完整性保证

### 6.1 私聊消息也是 Hash-Linked Chain

```javascript
// MessengerSaga.js — 接收私聊消息的验证逻辑
let last_msg = db.getLastPrivateMessage(remote, self)

if (last_msg === null) {
  // 第一条消息: Sequence=1, PreHash=GenesisHash
  if (json.Sequence === 1 && json.PreHash === GenesisHash) {
    db.addPrivateMessage(...)         // ✓ 保存
  } else {
    SyncPrivateMessage(...)           // ⚠ 请求同步缺失消息
  }
} else {
  // 链式验证: sequence 连续 + PreHash 匹配
  if (last_msg.sequence + 1 === json.Sequence
      && last_msg.hash === json.PreHash) {
    db.addPrivateMessage(...)         // ✓ 保存
  } else if (last_msg.sequence + 1 < json.Sequence) {
    SyncPrivateMessage(...)           // ⚠ 有gap, 请求同步
  }
  // else: sequence ≤ last → 旧消息，丢弃
}
```

私聊公告链与公告链采用**相同的完整性验证模式**: `PreHash + Sequence` 双条件检查。任何消息注入、重放、乱序都会被检测。

### 6.2 自修复同步

当检测到链断裂时，Client 发送 `PrivateMessageSync` 请求:
```
{ Action: 501, To: partner, PairSequence: 我方已知的对方最大 sequence,
   SelfSequence: 我希望对方知道的我方最大 sequence }
```

Server 查询数据库，返回缺失的消息窗口。这是一个 **双向增量同步协议**。

---

## 7. 文件传输协议 — Nonce-based 分块加密传输

### 7.1 参数

| 参数 | 值 |
|------|-----|
| 最大文件大小 | 64 MB |
| 分块大小 | 1 MB |
| 最大分块数 | 64 |
| Nonce 范围 | 0 ~ 2³²-1 |
| 传输通道 | WebSocket binary frame |

### 7.2 帧格式

```
Binary WS Frame:
┌─────────────┬──────────────────┐
│ 4-byte nonce│ chunk data       │
│ (big-endian)│ (encrypted if E2E│
│ Uint32 BE   │  private/group)  │
└─────────────┴──────────────────┘
```

### 7.3 协议分离设计

```
Text WS Frame  → JSON 控制消息 (公告、握手、请求)
Binary WS Frame → 文件分块数据 (头像、公告附件、聊天文件)
```

**互不阻塞:** 控制信令走文本帧，文件传输走二进制帧。即使大文件正在传输，握手和公告仍能即时送达。

### 7.4 私聊/群聊文件加密

```javascript
// Client 发送私聊文件:
const ecdh = db.getHandshake(self, remote, partition, DHSequence(...))
const encrypted_chunk = AesEncryptBuffer(chunk, ecdh.aes_key)
ws.send(Buffer.concat([nonce, encrypted_chunk]))

// Server 转发 (不解密):
if (request.Type === PrivateChatFile || GroupChatFile) {
  SendMessage(request.From, data)   // 原封不动转发 binary frame
}
```

### 7.5 Nonce 匹配接收

```javascript
// FileRequestList 维护 pending 请求
ws.on('message', (data, isBinary) => {
  if (isBinary) {
    const nonce = BufferToUint32(data.slice(0, 4))
    const content = data.slice(4)
    FileRequestList.forEach(request => {
      if (request.Nonce === nonce) {
        // 匹配 → 写入磁盘 / 转发
      }
    })
  }
})
```

Nonce 是请求方生成的随机数，响应方原样返回。120秒 TTL 自动清理过期请求。

---

## 8. 协议路由矩阵 — ActionCode/ObjectType 双轴分发

### 8.1 双轴设计

每条 JSON 消息携带 **Action** (动词) 或 **ObjectType** (名词)，互斥:

```javascript
// Action — 客户端发起的请求
100 Declare              // 身份宣告 / 节点发现
200 AvatarRequest        // 头像拉取
300 FileRequest          // 文件分块请求
400 BulletinRequest      // 公告获取
401 BulletinSubscribe    // 公告订阅推送
402 RandomBulletinRequest// 随机公告
403 ServerAddressRequest // 活跃地址列表
404 ReplyBulletinRequest // 回复列表
405 TagBulletinRequest   // 标签搜索
500 FriendRequest        // 好友添加
501 PrivateMessageSync   // 私聊消息同步
600 GroupSync            // 群列表同步
601 GroupMessageSync     // 群消息同步

// ObjectType — 数据对象 / 响应
100 Nothing              // 空响应
101 ECDH                 // 密钥交换握手
200 Avatar               // 头像数据
201 AvatarList           // 头像列表
400 Bulletin             // 公告内容
403 ServerAddressList    // 地址列表
404 ReplyBulletinList    // 回复列表
405 TagBulletinList      // 标签结果
406 RandomBulletinList   // 随机公告
500 PrivateMessage       // 私聊消息
600 GroupCreate          // 建群
601 GroupDelete          // 删群
602 GroupList            // 群列表
603 GroupMessage         // 群消息
604 GroupMessageList     // 群消息列表
```

### 8.2 Server 端路由逻辑

```javascript
// checkMessage() → MsgValidate() 解析 JSON
if (json.ObjectType) {
  handleObject(from, message, json, isFromNode)   // 数据对象路由
} else if (json.Action) {
  handleAction(from, message, json)               // 请求路由
}

// handleObject — 核心转发逻辑
async function handleObject(from, message, json, isFromNode) {
  if (json.To != null) {
    SendMessage(json.To, message)   // 有目标地址 → 转发
  }
  switch (json.ObjectType) {
    case Bulletin:    CacheBulletin(from, json)   // 持久化 + 拉更多
    case PrivateMessage: CachePrivateMessage()    // 存密文 + 转发
    case ECDH:        CacheECDH(json)             // 配对握手记录
    case GroupCreate: CacheGroup(json)            // 注册群成员映射
    ...
  }
}
```

**设计要点:** Server 对 `ObjectType.Bulletin` 做 `VerifyJsonSignature()` 后才持久化，但对 `ObjectType.PrivateMessage` 只做签名验证后存密文转发——不解密、不解析内容。

---

## 9. 数据层设计 — Client SQLite + Server PostgreSQL 双存储

### 9.1 架构总览

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   RippleMessengerClient │         │   RippleMessengerServer │
│                         │         │                         │
│  Tauri SQLite (app.db)  │ ◄WS►   │  PostgreSQL (Prisma)    │
│                         │         │                         │
│  18 Tables              │         │  8 Models               │
│  Local-First 缓存       │         │  Store-and-Forward      │
└─────────────────────────┘         └─────────────────────────┘
```

**设计哲学:** Client SQLite 是 UI 的真实数据源 (Local-First)，Server PostgreSQL 是消息中继与存证。两者不是主从关系，而是 **各自维护完整的业务副本**。Client 断开网络后仍能读取全部历史。

### 9.2 Server 端 PostgreSQL — Prisma Schema (8 Models)

```prisma
// ─── Avatar ───
model Avatar {
  address   String  @id          // XRPL 地址 = PK
  hash      String                 // 头像文件 SHA512-32
  size      Int
  json      String                 // 完整签名 JSON (stringified)
  signed_at BigInt
  is_saved  Boolean @default(false) // 图片二进制是否已下载到磁盘
}

// ─── Bulletin ───
model Bulletin {
  hash       String  @id          // QuarterSHA512(bulletin_json)
  address    String                 // 发布者 XRPL 地址
  sequence   Int                    // 链上位置
  content    String                 // 明文内容 (Server 可索引搜索)
  json       String                 // 完整签名 JSON 原封不动存储
  signed_at  BigInt                // 消息自带时间戳
  created_at BigInt                // Server 入库时间
  pre_hash   String                 // 前驱公告 hash
  next_hash  String?               // 后继公告 hash (回填)

  tags       Tag[]                  // N:M 标签关联
  files      File[]                // 1:N 附件关联
}

// ─── Tag + Bulletin 多对多 ───
model Tag {
  name      String  @id
  bulletins Bulletin[]
}

// ─── File (公告附件) ───
model File {
  hash         String  @id          // 文件 SHA512-32
  size         Int                    // 总字节数
  chunk_length Int                    // 分块总数 (ceil(size/1MB))
  chunk_cursor Int                    // 已接收块数
  updated_at   BigInt
  is_saved     Boolean @default(false) // 全部块下载完成且校验通过
  bulletins    Bulletin[]            // 反向关联
}

// ─── Reply (引用回复关系) ───
model Reply {
  post_hash   String                 // 被引用公告 hash
  reply_hash  String                // 引用方公告 hash
  signed_at   BigInt
  @@id([post_hash, reply_hash])     // 组合 PK 防重复引用
}

// ─── ECDH (握手记录) ───
model ECDH {
  address1  String                 // 字典序较大地址
  address2  String                 // 字典序较小地址
  partition Int                    // 时间分区
  sequence  Int                    // 序列号
  json1     String?                // address1 方向的握手 JSON
  json2     String?                // address2 方向的握手 JSON
  @@id([address1, address2, partition, sequence])
}

// ─── PrivateMessage (私聊密文) ───
model PrivateMessage {
  hash         String  @id          // QuarterSHA512(message_json)
  sour_address String                 // 发送者地址
  dest_address String                 // 接收者地址
  sequence     Int                    // 消息链位置
  signed_at    BigInt
  json         String                 // 完整密文 JSON (不解密)
}

// ─── Group ───
model Group {
  hash        String  @id
  created_by  String                 // 创建者地址
  created_at  BigInt
  create_json String                 // 建群 JSON 原文
  member      String                 // JSON array (成员地址列表)
  deleted_at  BigInt?               // 软删除时间
  delete_json String?               // 删群 JSON 原文
}
```

### 9.3 Client 端 SQLite — 18 Tables

#### 身份与社交

| 表名 | PK | 用途 |
|------|-----|------|
| `servers` | url | WebSocket 服务器配置，优先级排序 (default 64) |
| `contacts` | address | 通讯录：昵称→XRPL地址映射 |
| `accounts` | address | 多账号存储，含 salt + cipher_data (AES 加密的 Seed) |
| `follows` | (local, remote) | 单向关注关系 |
| `friends` | (local, remote) | 双向好友关系 (私聊前提条件) |

#### 头像与文件

| 表名 | PK | 用途 |
|------|-----|------|
| `avatar_files` | address | 头像元数据 (hash, size, is_saved)。实际图片在 `<resourceDir>/avatar/` 磁盘目录 |
| `files` | hash | 公告附件下载进度追踪 (chunk_length, chunk_cursor, is_saved) |
| `private_chat_files` | ehash | 私聊文件映射表：加密 hash → 真实 hash + size |
| `group_chat_files` | ehash | 群聊文件映射表：加密 hash → group_hash + 真实 hash + size |

#### 公告与标签

| 表名 | PK | 用途 |
|------|-----|------|
| `bulletins` | hash | **核心表** — 公告链副本，含 pre_hash/next_hash 双向链接 |
| `bulletin_replys` | (bulletin_hash, reply_hash) | 回复关系映射，CASCADE DELETE |
| `bulletin_files` | (bulletin_hash, file_hash) | 公告→附件关联 |
| `tags` | id (自增) | 标签名注册表 |
| `bulletin_tags` | (bulletin_hash, tag_id) | 公告→标签 N:M 关联 |

#### 加密握手与消息

| 表名 | PK | 用途 |
|------|-----|------|
| `handshakes` | (self_address, pair_address, partition, sequence) | ECDH 握手状态：aes_key, private_key, public_key, self_json, pair_json |
| `private_messages` | hash | 私聊消息：**解密后**的明文存 content 列，原文 JSON 存 json 列 |
| `group_messages` | hash | 群聊消息：同私聊结构 |

#### 群聊定义

| 表名 | PK | 用途 |
|------|-----|------|
| `groups` | hash | 群元数据：name, member (JSON array), is_accepted, deleted_at (软删除) |

### 9.4 Client vs Server 存储差异 — 设计取舍

```
                  Client SQLite                    Server PostgreSQL
                  ────────────────                 ───────────────────
PrivateMessage   存解密后的明文 content           只存密文 json 原文
GroupMessage     存解密后的明文 content           不持久化，纯转发
ECDH             存完整握手记录 + AES key        只存双方 JSON 对 (json1/json2)
Bulletin         存明文 content                  存明文 content (可搜索)
Group            有 is_accepted 本地状态          有 GroupMap 内存映射
```

**关键取舍 — 私聊消息的双重存储策略:**

| 层面 | 存什么 | 为什么 |
|------|--------|--------|
| Server | 密文 json | **Store-and-forward** — 消息投递后保留副本，支持客户端重连同步。但 Server 无 AES key → 永远不可见明文 |
| Client | 解密后的明文 content + 原文 json | UI 展示需要读取明文；原文 json 保留用于签名验证和转发 |

**关键取舍 — 群聊消息只存 Client:**

Server 对群聊不做任何持久化，只做内存转发 (`GroupMap[hash] = members`)。理由：
- 群聊有 E2E 加密，Server 存的密文对其他成员无用
- 每个成员用自己的 AES key 解密 → 数据天然属于 Client
- 减少 Server 存储压力 (N 成员的群有 N 份不同密文)

### 9.5 Handshake 存储 — Client 端是加密基础设施的核心

```javascript
// handshakes 表核心字段:
self_address, pair_address    // 通信双方
partition, sequence           // 时间分区定位
aes_key                       // HKDF-DH 派生的 AES key (null = 握手未完成)
private_key                   // ECDH secp256k1 私钥 hex (确定性派生)
public_key                    // 对应公钥 hex
self_json                     // 我方发出的 ECDH 消息 JSON
pair_json                     // 对方回复的 ECDH 消息 JSON (null = 未收到)
```

Client 每次发/收私聊或群消息时，通过 `DHSequence(timestamp, self, partner)` 定位正确的 handshake 行 → 取出 `aes_key` → AES-CBC 加解密。这是 Local-First 架构的关键：离线时仍能从 SQLite 完整还原所有加密密钥。

### 9.6 File 下载进度追踪

```
                    chunk_length          chunk_cursor            is_saved
File ───────────────┬─────────────        ─────────────           ─────────
公告附件 (明文)       Server + Client      每收1MB加1               全部块到且 hash 校验通过 → true
头像 (明文)          Server + Client      N/A (单文件一次性)        文件写入磁盘成功 → true
私聊文件 (E2E加密)   Client 仅 (private_chat_files)     ehash 映射, 不走 chunk 追踪
群聊文件 (E2E加密)   Client 仅 (group_chat_files)       ehash 映射, 走 Server 转发
```

---

## 10. 消息交互与同步协议 — 从登录到离线恢复的完整生命周期

### 10.1 Client 登录 → 全量数据恢复流程

```
用户输入密码解密 Seed
  │
  ├─ dbAPI.updateAccountUpdatedAt()      // SQLite: 标记活跃时间
  │
  ├─ LoadContactList                     // SQLite: contacts + follows + friends
  │
  ├─ LoadMineBulletinSequence            // SQLite: getAddressBulletinCount()
  │
  ├─ LoadGroupList                       // SQLite: groups WHERE is_accepted=1
  │
  ├─ LoadSessionList                     // 每个好友/群查 unread count + last timestamp
  │
  └─ LoadServerList                      // SQLite: servers WHERE is_connect=1, ORDER BY priority DESC
       │
       └─ WebsocketUtil.connect(url)     // 按优先级连接 WebSocket
            │
            ├─ Declare { PublicKey }    // 身份宣告
            │   Server 回应: Declare { URL } + SyncClientRequest()
            │
            ├─ AvatarRequest({flag})     // 拉取过期头像
            │
            └─ SubscribeFollow           // BulletinSubscribe → SubscribeMap[address].push(client)
                 │
                 └─ FetchFollowBulletin   // 遍历 follow list, 查本地 DB 最大 sequence
                      │                   → genBulletinRequest(address, localSeq+1, ...)
                      │                   → 请求缺失公告
```

**SyncClientRequest — Server 对新连接的一次性数据推送:**

| 步骤 | Server 动作 | Client 收到什么 |
|------|------------|----------------|
| ① Bulletin 缺口检测 | 遍历我方已存的该地址所有公告 sequence → 找第一个断裂点 | `BulletinRequest(address, missing_seq+1)` — 告诉 Client "你的链断了，从这条开始发给我" |
| ② 文件断点续传 | 查询 `File WHERE is_saved=false` → 对每个未完成文件发分块请求 | 二进制 chunk 逐步补齐 |
| ③ ECDH 握手配对 | 查 `ECDH WHERE (address1\|=addr OR address2\|=addr) AND json≠empty AND counterpart=""` → 对方有未完成的握手 | 对方的 ECDH JSON — Client 补全 AES key |
| ④ 群列表同步 | `GenGroupSync()` (请求 Client 上报自身群) + `HandelGroupSync(addr)` (推送 Server 已知的群) | GroupList 响应 — 建群/删群 JSON |

### 10.2 Bulletin 缓存完整数据流

```
WebSocket 收到 ObjectType.Bulletin
  │
  ├─ Phase 1: checkBulletinSchema(json) && VerifyJsonSignature(json)
  │   → 失败 → 丢弃
  │
  ├─ CacheBulletin Saga (Client 端):
  │   dbAPI.getLastBulletin(address)
  │     → null?
  │       ├─ Yes: json.Sequence===1 && json.PreHash===GenesisHash → addBulletin()
  │       └─ No: last.sequence + 1 === json.Sequence → addBulletin()
  │               last.sequence ≠ json.Sequence → RequestNextBulletin (请求中间缺失的)
  │
  │   addBulletin():
  │     INSERT OR IGNORE INTO bulletins (hash, address, sequence, content, json, signed_at, pre_hash)
  │
  │   关联操作:
  │     ↳ tags[]?       → INSERT OR IGNORE INTO tags → addTagsToBulletin()
  │     ↳ quote[]?      → addReplyToBulletins(bulletin_hash, reply_hash pairs)
  │     ↳ file[]?       → addFile({hash, size, chunk_length, chunk_cursor=0, is_saved=false})
  │                       ↳ FetchBulletinFile — 通过 WebSocket 二进制帧下载
  │
  └─ UI 刷新:
      ↳ RefreshPortalBulletin()          // 首页公告流更新
      ↳ RefreshFollowBulletin()          // 关注页公告流更新
```

### 10.3 Private Message 发送完整数据流

```
用户输入文本 → SendContent Saga
  │
  ├─ dbAPI.getLastConfirmPrivateMessage(self, remote)
  │   → 有未确认消息? → confirmPrivateMessage(hash, true) + 发送确认回执
  │
  ├─ 计算下一个 sequence:
  │   last_confirm ? last_confirm.sequence + 1 : (last_unconfirm ? last_unconfirm.sequence + 1 : 1)
  │
  ├─ genPrivateMessage(seed, sequence, preHash, null, content, remote)
  │
  ├─ dbAPI.addPrivateMessage(hash, sour, dest, seq, preHash, content, json, ...)
  │   → 本地先存 (Offline-First: UI 立即显示消息)
  │
  └─ WebSocket.send(encrypted_json)
       │
       └─ Server 收到 ObjectType.PrivateMessage:
           ├─ VerifyJsonSignature(json)
           ├─ CachePrivateMessage(json):
           │   last_msg = SELECT sequence, hash FROM PrivateMessage ORDER BY sequence DESC LIMIT 1
           │   → chain check: sequence === last.sequence + 1 && preHash === last.hash
           │     ✓ INSERT (hash, sour, dest, sequence, json)
           │     ✗ GenPrivateMessageSync() → 告诉 Client "你断了，补发"
           │
           └─ SendMessage(json.To, message)     // 转发给接收方
```

**设计要点 — Offline-First 写入:** Client 在发送 WebSocket 之前就把消息存入本地 SQLite。即使网络断开，消息已经出现在 UI 中。这是 Local-First 架构的核心行为。

### 10.4 私聊消息双向同步协议 — PrivateMessageSync

```
Client A                          Server                        Client B
  │                                 │                              │
  │── PrivateMessageSync ──────────▶│                                │
  │   { To: B,                       │                               │
  │     PairSequence: 10,            │  查询 OR:                      │
  │     SelfSequence: 8 }            │    sour=A,dest=B,seq>8         │
  │                                 │    sour=B,dest=A,seq>10        │
  │◄── PrivateMessage ──────────────│                                │
  │   (A→B seq=9, delay 1s)         │      ORDER BY sequence ASC     │
  │                                 │       逐条推送,间隔 1s          │
  │◄── PrivateMessage ──────────────│                                │
  │   (A→B seq=10, delay 1s)        │                                │
  │                                 │                                │
  │◄── PrivateMessage ──────────────│                                │
  │   (B→A seq=11, delay 1s)        │  Server 每秒延迟推送            │
  │                                 │  → 避免洪水攻击                 │
  │◄── PrivateMessage ──────────────│                                │
  │   (B→A seq=12, delay 1s)        │                                │
```

**PrivateMessageSync 请求内容:**

| 字段 | 含义 |
|------|------|
| `To` | 通信对方地址 |
| `PairSequence` | "我知道对方最多发到第几条" (sour=partner, dest=self 的最大 sequence) |
| `SelfSequence` | "我发出去的消息最大序列号是多少" (sour=self, dest=partner 的最大 sequence) |

Server 返回两个方向的缺失消息窗口，按 sequence ASC 排序，1 秒/条限速。

### 10.5 Server CachePrivateMessage — 链验证细节

```javascript
// Server side: main.js CachePrivateMessage()
async function CachePrivateMessage(json) {
  const hash = QuarterSHA512Message(json)
  const sour = deriveAddress(json.PublicKey)
  const dest = json.To

  const last_msg = await prisma.PrivateMessage.findFirst({
    where: { sour_address: sour, dest_address: dest },
    orderBy:  { sequence: 'desc' },
    select:   { sequence: true, hash: true }
  })

  // Chain check — 三种合法情况:
  if (last_msg === null) {
    // ① 首条消息: seq=1, preHash=GenesisHash
    if (json.Sequence === 1 && json.PreHash === GenesisHash) {
      prisma.PrivateMessage.create({ hash, sour, dest, sequence, json })
    } else {
      GenPrivateMessageSync(dest, 0)    // ✗ 链起点不匹配 → 触发同步
    }
  } else if (json.Sequence === last_msg.sequence + 1
             && json.PreHash === last_msg.hash) {
    // ② 正常续链: seq 连续 + preHash 匹配
    prisma.PrivateMessage.create({ hash, sour, dest, sequence, json })
  } else {
    // ③ 断裂: 请求重同步
    GenPrivateMessageSync(dest, last_msg.sequence)
  }
}
```

**Server 和 Client 执行相同的链验证逻辑。** Server 端验证通过后才持久化，否则拒绝存储并发出同步请求。这是 **两端对称的完整性检查**。

### 10.6 ECDH 握手 — Server 端 Rendezvous 模式

```
ECDH 表: json1 (address1 方向) + json2 (address2 方向)

User A 先发:                              User B 后发:
  ────────────                             ────────────
Server 收到 ECDH from A                    Server 收到 ECDH from B
  → address1 = max(A,B), json1=A          → 查找同一 PK (address1,address2,partition,sequence)
  → INSERT json1=A, json2=empty           → UPDATE json2=B

CacheECDH() 关键逻辑:
  - address1 > address2 规则 → 双方映射到同一条记录
  - timestamp 比较: 新消息时间戳 >= 旧消息 → 跳过 (防重放)
  - SyncClientRequest 时检测: 如果 counterpart JSON 为空, 推送配对消息
```

Server 端的 ECDH 表是一个 **双向 Rendezvous Buffer**: 每一方写入自己方向的 JSON，当另一方到达时取出。AES key 永远不在 Server 上计算或存储。

### 10.7 Client 断线重连行为

```
WebSocket.onclose → WebsocketListener Saga:
  │
  ├─ clearInterval(keepAliveTimer)        // 清除心跳
  │
  ├─ Retry connect (exponential backoff):
  │   servers = getServerListByPriority()
  │   for (server in servers):
  │     ws.connect(url) → Declare → SyncClientRequest
  │
  └─ 重连后自动触发:
      ↳ AvatarRequest — 补拉过期头像
      ↳ SubscribeFollow — 重新注册推送订阅
      ↳ FetchFollowBulletin — 补齐离线期间的公告
      ↳ PrivateMessageSync — 断链时自动修复
```

**无状态连接:** WebSocket 是纯传输层。每次重连都走完整的 Declare → SyncClientRequest 流程。Server 不保留任何会话状态 (Conns[address] 只是内存映射，WS 断开即丢失)。所有恢复数据来自 PostgreSQL 持久层。

### 10.8 Client 多服务器连接策略

```
servers 表:
┌──────────────┬──────────┬──────────┐
│ url          │ priority │ is_connect│
├──────────────┼──────────┼──────────┤
│ wss://jp...  │   128    │     1     ◄── 最高优先级, 优先连接
│ wss://uk...  │    64    │     1     ◄── 备份节点
│ wss://us...  │    32    │     0     ◄── 禁用中
└──────────────┴──────────┴──────────┘

priority 更新规则: updateServerPriority() — 成功连接则加分，失败则减分
```

Client 可同时维持多个 WS 连接 (通过 `WebsocketUtil.js` 管理多实例)，每个连接有独立的 keepalive timer。公告推送到任何一个连接都会触发 CacheBulletin → SQLite upsert by hash (幂等，不会重复)。

---

## 11. 联邦网络 — Declare 双重用途与节点同步

### 11.1 Declare 消息的双重身份

```
Declare { Action: 100, PublicKey, Signature, URL? }
                    │
                    ├─ Client 发送 (无 URL) → 身份认证宣告
                    │   Server: Conns[address] = ws (注册连接)
                    │
                    └─ Server 发送 (带 URL)  → 节点互发现
                        Server: NodeList.push({URL})  (加入联邦)
```

**一条消息类型，两种语义:** Client 用 Declare 证明身份；Server 用 Declare 交换自己的 WebSocket URL，实现节点互发现。`json.URL` 的有无是区分标准。

### 11.2 节点互联拓扑

```
Client A ──wss──► Node JP ◄──Declare(URL_UK)──► Node UK
                      │                        │
                      │    SyncNodeData()       │
                      │   (pull + push + file)  │
                      └─────5min delta sync────┘
```

### 11.3 SyncNodeData — 三管齐下

```javascript
function SyncNodeData(url) {
  pullBulletin(url)        // 拉: 从对方获取我方缺失的公告
  pushBulletin(url)        // 推: 向对方推送我方有的公告
  downloadBulletinFile(url)// 文件: 同步未完成的附件下载
}
```

**增量同步:** `pullBulletin` 先请求对方的地址列表，再按每个地址的 `sequence + 1` 拉取增量。不是全量 dump，是精准的 delta sync。

### 11.4 同步周期

| 事件 | 间隔 | 行为 |
|------|------|------|
| 节点首次连接 | immediate | `SyncNodeData(url)` |
| 定时心跳 | 5 min | `keepNodeSync()` → 遍历 NodeList |
| 断线重连 | 5 s | `keepNodeConn()` → 随机选未连节点 |

### 11.5 SubscribeMap — 服务端推送

```javascript
// BulletinSubscribe (Action: 401)
function HandelBulletinSubscribe(request, from) {
  SubscribeMap[address] = [subscriber1, subscriber2, ...]
}

// CacheBulletin() 新公告时:
if (SubscribeMap[from] && SubscribeMap[from].length > 0) {
  for (const sub of SubscribeMap[from]) {
    SendMessage(sub, JSON.stringify(bulletin))
  }
}
```

Client 声明要订阅的地址列表，Server 内存维护 `SubscribeMap`。当这些地址发布新公告时，主动推送给订阅者。**这是 push 补充 pull 的混合模式。**

---

## 12. 安全模型与设计权衡

### 12.1 三层安全防线

```
Layer 1: 身份
  XRPL KeyPairs — Seed(私钥) + Address(公钥派生)
  私钥不出 Client, Server 不托管任何密码材料

Layer 2: 完整性
  EdDSA Signature 每条消息必签
  AJV JSON Schema 结构校验
  PreHash + Sequence 链式验证 (公告 + 私聊)
  → 来源可验证 + 内容不可篡改

Layer 3: 保密性
  ECDH secp256k1 密钥交换 → HKDF → AES-CBC 加密
  Server 仅存密文并转发
  → 端到端加密, Server 不可见内容
```

### 12.2 权衡表

| 设计选择 | 优势 | 代价/风险 |
|---------|------|----------|
| QuarterSHA512 (40-bit 展示 hash) | 人类可读，易复制搜索 | 碰撞概率高 — **但 EdDSA 签名兜底** |
| AES-CBC (非 GCM) | crypto-js 兼容性好 | 无 authenticated encryption — 依赖外层 hash chain 防篡改 |
| Seed 存 localStorage (AES 加密) | 重启恢复 | XSS 可窃取 — Tauri WebView 缩小攻击面 |
| ECDH on secp256k1 | 与 XRPL 统一曲线 | NIST 对 secp256k1 有质疑 (但比特币/以太坊使用) |
| HKDF-DH 密钥派生 | 标准化 KDF，防弱 shared secret | 实现复杂度高 |
| 确定性 ECDH 私钥派生 | 无需持久化 ECDH 私钥 | Seed 泄露 → 所有历史密钥可还原 (无前向安全) |
| 90天密钥轮换 | 定期自动轮换 | 轮换窗口内消息可被新泄露的 Seed 解密 |

### 12.3 去中心化程度分层评估

```
Layer              程度        实现方式
─────────────────────────────────────────────────
Identity           ████████░░ 80%  XRPL KeyPairs, 无注册 (但 GenesisHash 硬编码)
Privacy            █████████░ 90%  E2E AES-CBC, 密钥不出 Client
Network Topology   ██████░░░░ 60%  联邦多节点, 用户自配列表, 共享数据库
Content Integrity  █████████░ 90%  Hash-linked chain + EdDSA (但存储集中化)
Data Storage       ███░░░░░░░ 30%  PostgreSQL (同一 DB 实例)
```

这是一个 **"身份和隐私去中心化、网络联邦化、数据集中化"** 的混合模型。有意选择这条路径——用 XRPL 获得无摩擦的全球唯一身份，用联邦节点获得可用性冗余，但放弃数据层的去中心化以换取一致性和查询能力。

---

## 13. 设计核心思想总结

### 13.1 十大设计原则

| # | 原则 | 体现 |
|---|------|------|
| 1 | **密码学即身份** | XRPL 密钥对 = 全球唯一 ID，免注册、免托管、不可封禁 |
| 2 | **Hash-Linking 即完整性** | Bulletin Chain + Private Message Chain，去共识化区块链思想，单写者无需 PoW |
| 3 | **确定性密钥派生** | DHSequence 时间分区系统，双方独立计算相同 AES key，无协商开销 |
| 4 | **Zero Trust 消息验证** | AJV Schema + EdDSA Signature 双重门控，不信任传输层 |
| 5 | **E2E 加密是底线** | 私聊/群聊端到端 AES-CBC，Server 仅存密文并转发 |
| 6 | **Declare 双重语义** | Client 身份认证 + Server 节点发现，一条消息两种用途 |
| 7 | **混合推拉同步** | SubscribeMap push + sequence-based pull，兼顾实时与一致性 |
| 8 | **协议帧分离** | Text WS frame 控制信令 / Binary WS frame 文件数据，互不阻塞 |
| 9 | **Local-First UI 状态** | Client SQLite = UI truth，Server 离线仍可读全部历史 |
| 10 | **Usability > Cryptography (有意识取舍)** | QuarterSHA512 牺牲碰撞抗性换取可读性；EdDSA 签名兜底 |

### 13.2 一句话总结

> RippleMessenger 的设计哲学是 **"区块链思维 + 即时通讯体验"的融合**: 用密码学身份消除注册摩擦，用 hash-linked chain 实现发布存证，用确定性 DHSequence 分区系统驱动 ECDH 密钥轮换保护隐私，用 Declare 双重语义构建联邦网络——但整个系统在存储层拥抱集中化 PostgreSQL，以换取查询能力和数据一致性。这是一条**实用主义的去中心化路径**。
