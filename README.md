# RippleMessengerClient

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

去中心化桌面即时通讯应用 — Tauri + React 19 + Vite + Redux Toolkit + SQLite。

**项目矩阵:** [Client](https://github.com/ripplemessenger/RippleMessengerClient) · [Server](https://github.com/ripplemessenger/RippleMessengerServer) · [Site](https://github.com/ripplemessenger/RippleMessengerSite)

---

## 快速开始

```bash
npm install
npm run tauri dev      # 开发模式
npm run tauri build    # 生产构建
```

**环境要求:** Node.js, Rust (Tauri), SQLite

---

## 特点

1. **密码学即身份** — XRPL Seed 本地生成，无需手机认证、邮箱验证。谁持有私钥谁就是该地址，使用得当可对所有人匿名；
2. **数据本地存储** — 公告、私聊、群聊及文件全部存储在本地 SQLite，数据跟着个人走；
3. **服务可私有部署** — Server 源码开源，部署简单、成本低廉。基于公告数据可搭建只读[网站](https://ripplemessenger.com)；
4. **公告功能** — 实现推特/微博/博客/论坛功能，基于 hash-linked chain 不可篡改；
5. **端到端加密聊天** — 256位 AES-CBC 加密，私聊和群聊内容仅在参与方可见；
6. **文件传输** — 公告和聊天均支持文件传输，最大 64MB，聊天文件同样端到端加密；
7. **小体积** — 客户端 exe 仅 5MB，源码开源绿色安全。

---

## 架构

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   RippleMessengerClient │         │   RippleMessengerServer │
│                         │         │                         │
│  React 19 + Vite        │◄──WS──►│  Node.js + ws            │
│  Tauri (Rust)           │         │  Prisma + PostgreSQL     │
│  Redux Toolkit + Saga   │         │                          │
│  SQLite (18 tables)     │         │  Store-and-Forward       │
└─────────────────────────┘         └─────────────────────────┘
```

### 核心模块

| 模块 | 文件 | 说明 |
|------|------|------|
| 入口 | `src/main.jsx` → `src/App.jsx` | React 挂载 + Redux Provider + 路由 |
| WebSocket 消息 | `src/store/sagas/MessengerSaga.js` | ~1954行，所有 bulletin/私聊/群聊/文件分发 |
| 用户流程 | `src/store/sagas/UserSaga.js` | 登录/登出、联系人、关注 |
| Redux State | `src/store/slices/` | UserSlice / MessengerSlice / CommonSlice |
| SQLite  schema | `src/db.js` | 18张表：公告链、握手、消息、文件 |
| Rust 后端 | `src-tauri/src/lib.rs` | 系统托盘、单实例、通知图标闪烁 |
| 协议常量 | `src/lib/MessengerConst.js` | ActionCode / ObjectType 数值枚举 |
| 消息签名 | `src/lib/MessageGenerator.js` | EdDSA 签名 + 消息 JSON 构造 |
| 消息验证 | `src/lib/MessageSchemaVerifier.js` | AJV JSON Schema 校验 |
| 多WS管理 | `src/lib/WebsocketUtil.js` | 多服务器连接、断线重连 |
| 密码学工具 | `src/lib/RippleUtil.js`, `AppUtil.js`, `MessengerUtil.js` | XRPL密钥、SHA512、ECDH |

---

## 通讯协议

### 身份系统 — 无注册

```
XRPL Seed (私钥助记词)
  ↓ ripple-keypairs.deriveKeypair()
PublicKey (hex, secp256k1 EdDSA/Ed25519)
  ↓ ripple-keypairs.deriveAddress()
Address (rXXXXXXXXXXXXXXXXXXXXX) — 全球唯一，确定性派生
```

Server 不发放任何凭证。`Declare { Action: 100, PublicKey, Signature }` 是唯一身份宣告，Server 只验证签名有效即注册 WebSocket 连接。

### 签名机制 — Zero Trust

每条消息必须签名：`SHA-512(JSON.stringify(msg))` 取前32 hex char (128 bit)，用 XRPL 私钥 EdDSA 签名。验证方用 `ripple-keypairs.verify(hash, sig, publicKey)` 确认来源。

**双层验证流水线：**
```
收到文本消息 → JSON.parse() → AJV Schema 验证 → EdDSA 签名验证 → 路由到业务逻辑
```

### 公告链 — Hash-Linked Per-Address Chain

每个 XRPL 地址维护一条独立的公告链：

```
GenesisHash "44F8764BCACFF5424D4044B784549A1B"
  │
  ▼
┌───────────────────────────┐
│ sequence: 1               │
│ content: "Hello World!"   │
│ pre_hash → GenesisHash    │ ◄── 指向创世
│ hash = QuarterSHA512(...) │ ◄── 内容哈希(签名不含自身)
│ signature: EdDSA(hash)   │ ◄── 私钥签名
└──────────┬────────────────┘
           ▼
┌───────────────────────────┐
│ sequence: 2               │
│ content: "Second post"    │
│ pre_hash → H1             │ ◄── 指向上一条的hash
│ tag: ["news"]             │
│ quote: [{hash: H1}]       │ ◄── 引用其他公告(类似 quote-tweet)
│ file: [{hash, size}]      │
└───────────────────────────┘
```

**"去共识区块链"设计:** 每条链只有一个合法生产者——一个地址只对应一个私钥持有者。无竞争 = 无需 PoW/PoS。保留 hash-linking + signature，去除 consensus + mining + incentive。

**存储前校验：**
1. 验签确认发布者和完整性
2. 确认数据链最后一条 sequence = N-1，下一个应为 N
3. 确认第 N-1 条的 hash === PreHash，才能从尾部插入

### DHSequence 分区系统 — 确定性密钥轮换

让两个独立客户端算出相同的 ECDH sequence，无需协商：

```javascript
Epoch = 1320981071000       // 2011-11-11 11:11:11 UTC
DefaultPartition = 90天     // 密钥轮换周期

function DHSequence(partition, timestamp, addrA, addrB):
  addrPair = sort(addrA, addrB).join("")       // 字典序排序，确保对称
  cursor = HalfSHA512(addrPair)[:6] % partition * 1000  // 确定性偏移
  seq = (timestamp - Epoch - cursor) / (partition * 1000)
  return seq
```

- **确定性:** 双方独立计算，结果相同
- **90天自动轮换:** 新 sequence → 新 AES key，周期性前向安全
- **cursor 分散流量:** 每对用户有唯一时间偏移，避免同时握手

### ECDH 握手 — 私聊/群聊端到端加密

**密钥派生链：**
```
Seed + sequence → HalfSHA512(Genesis + seed + addr + seq) → ECDH 私钥
对方的ECDH公钥 + 自己的ECDH私钥 → shared_secret
HKDF(shared_secret, SHA512(Genesis + addrPair + seq)) → AES-256-CBC key (hex string)
```

**握手流程：**
```
User A                            User B
  │── ECDH { Self: pubA } ──────▶│
  │                              │── db 无此握手 → 生成 pubB
  │◄── ECDH { Self: pubB,       │    shared = ECDH(pubA, privB)
  │     Pair: pubA } ───────────│    aesKey = HKDF(shared, salt)
  │── Pair ≠ "" → 握手完成      │── db.initHandshakeFromRemote(...)
  │── AES-CBC(aesKey) 加密消息
```

Server 只存储密文 json，不计算也不存储 AES key。

**群聊 Mesh Topology (全网状):**
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
任意两个成员之间均有独立的 ECDH 握手 + AES 密钥。发送者向每个成员用自己的 pairwise AES key 加密消息后分别发送，接收方用与该发送者的 pairwise key 解密。O(n²) key 管理，最多 16 人。

### 私聊消息链

私聊消息和公告一样采用 `PreHash + Sequence` 双条件链式验证。检测到链断裂时自动触发 `PrivateMessageSync` 双向增量同步。

**Offline-First:** Client 在发送 WebSocket 之前就将消息存入本地 SQLite，UI 立即显示。

### 文件传输 — Nonce-based 分块

| 参数 | 值 |
|------|-----|
| 最大文件大小 | 64 MB |
| 分块大小 | 1 MB |
| 传输通道 | WebSocket binary frame |

```
Binary Frame: [4-byte nonce (big-endian)] [chunk data]
Text   Frame: JSON 控制消息 (公告、握手、请求)
```

控制信令和文件数据走不同帧类型，互不阻塞。

### 协议路由矩阵

| Action (动词) | ObjectType (名词) |
|---|---|
| 100 Declare | 100 Nothing |
| 200 AvatarRequest | 101 ECDH |
| 300 FileRequest | 400 Bulletin |
| 400 BulletinRequest | 403 ServerAddressList |
| 401 BulletinSubscribe | 404 ReplyBulletinList |
| 402 RandomBulletinRequest | 500 PrivateMessage |
| 403 ServerAddressRequest | 600 GroupCreate |
| 404 ReplyBulletinRequest | 601 GroupDelete |
| 405 TagBulletinRequest | 602 GroupList / 603 GroupMessage |
| 500 FriendRequest | 604 GroupMessageList |
| 501 PrivateMessageSync | |
| 600 GroupSync | |
| 601 GroupMessageSync | |

---

## 数据层

### Client SQLite (18 tables)

| 分类 | 表 | 用途 |
|------|-----|------|
| 身份社交 | `servers`, `contacts`, `accounts`, `follows`, `friends` | 多账号、关注/好友关系 |
| 公告 | `bulletins`, `tags`, `bulletin_tags`, `bulletin_replys`, `bulletin_files` | 公告链副本，含双向链接 |
| 加密 | `handshakes`, `private_messages`, `group_messages` | ECDH 状态、AES key、解密后明文 |
| 文件 | `avatar_files`, `files`, `private_chat_files`, `group_chat_files` | 下载进度追踪，E2E加密文件映射 |
| 群聊 | `groups` | 群元数据，软删除支持 |

### Server PostgreSQL (8 Prisma models)

`Avatar` · `Bulletin` · `Tag` · `File` · `Reply` · `ECDH` · `PrivateMessage` · `Group`

**关键差异：** Client 存解密后的明文 content；Server 只存密文 json，永远不可见明文。群聊消息 Server 不持久化，纯内存转发。

---

## 安全模型

| 防线 | 实现 | 效果 |
|------|------|------|
| Layer 1: 身份 | XRPL KeyPairs, 私钥不出 Client | 无注册、不可封禁、抗审查 |
| Layer 2: 完整性 | EdDSA 签名 + AJV Schema + PreHash 链 | 来源可验证，内容不可篡改 |
| Layer 3: 保密性 | ECDH secp256k1 → HKDF → AES-CBC | Server 仅存密文转发 |

**设计权衡 (有意识取舍):**
- QuarterSHA512 展示 hash 仅 40-bit — 可读性优先，但 EdDSA 签名是安全底线
- AES-CBC 而非 GCM — crypto-js 兼容性好，依赖外层 hash chain 防篡改
- Seed 存 localStorage (AES 加密) — Tauri WebView 缩小 XSS 攻击面

---

## 完整设计文档

如需深入了解通讯协议和密码学细节，请参阅根目录的设计文档：

- **[RippleMessenger-Design.md](./RippleMessenger-Design.md)** — 13章系统级分析
  - 身份系统、签名机制、公告链完整性保证
  - DHSequence 分区系统、ECDH 握手全流程
  - 私聊/群聊消息链验证、自修复同步协议
  - 文件传输 Nonce-based 分块加密
  - 协议路由矩阵、数据层对比、联邦网络
  - 安全模型权衡表、十大设计原则

---

## Donate

XRP: `rBoy4AAAAA9qxv7WANSdP5j5y59NP6soJS`

---

欢迎 star、fork、贡献代码、推荐、捐赠，谢谢！

