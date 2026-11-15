# 协议共享包迁移指南

本文档说明如何将 Client、App、Server 从各自维护的协议定义迁移到统一的 `@ripplemessenger/protocol` 包。

## 迁移状态（2026-11-13）

**✅ 三端迁移全部完成**，采用「薄 re-export shim」方案：

| 项目 | 文件 | 状态 |
| --- | --- | --- |
| Server | `msg_const.js` | ✅ re-export from `@ripplemessenger/protocol` |
| Server | `msg_schema.js` | ✅ re-export from `@ripplemessenger/protocol/schema` |
| Server | `msg_validator.js` | ✅ re-export `MsgValidate` from `@ripplemessenger/protocol/validator` |
| Client | `src/lib/MessengerConst.js` | ✅ re-export from `@ripplemessenger/protocol` |
| Client | `src/lib/MessageSchema.js` | ✅ re-export from `@ripplemessenger/protocol/schema` |
| Client | `src/lib/MessageSchemaVerifier.js` | ✅ import schemas from `@ripplemessenger/protocol/schema` |
| App | `src/lib/MessengerConst.js` | ✅ re-export from `@ripplemessenger/protocol` |
| App | `src/lib/MessageSchema.js` | ✅ re-export from `@ripplemessenger/protocol/schema` |
| App | `src/lib/MessageSchemaVerifier.js` | ✅ import schemas from `@ripplemessenger/protocol/schema` |

**方案说明：** 旧文件保留为薄 re-export，所有调用方（`messenger.*.js`、`MessageGenerator.js` 等 20+ 文件）零改动。单一事实源是 `packages/protocol/`，修改协议只需改共享包。

**依赖方式：** `file:../packages/protocol`（本地符号链接，开发期）

**验证：**
- `packages/protocol/scripts/schema-parity.mjs` — 43/43 通过
- `packages/protocol/scripts/parity-test.mjs` — 100/100 通过
- 三端 `node -e "import(...)"` 全部成功

## 迁移前的准备

### 1. Schema 文件 —— ✅ 已完成

`packages/protocol/src/schema.js` 已包含 **36 个 Schema 导出**，与 Server 的
`msg_schema.js`（1049 行，最完整的那份）**逐字节一致**，不是"大致对齐"。

校验方式（随时可重跑）：

```bash
cd packages/protocol
npm run test:schema      # 35 schema + 8 常量表深比较 → 43/43 通过
```

调度表条目数：

| 表 | 条目数 |
| --- | --- |
| `ActionSchemas` | 14 |
| `ObjectSchemas` | 14 |
| `MessageObjectSchemas` | 3 |

> 唯一"多出来"的导出是 `BulletinListItemSchema`。Server 把列表项形状内联在
> `ReplyBulletinListSchema` / `TagBulletinListSchema` / `RandomBulletinListSchema` 里，
> 共享包把它提成具名导出以便复用。**不是新语义**，深比较已确认展开后完全相同。

**源文件位置（仅作参考，不要再从这些文件复制）：**
- Server: `RippleMessengerServer/msg_schema.js` (1049 行)
- Client: `RippleMessengerClient/src/lib/MessageSchema.js` (725 行)

### 2. 发布到 npm 或本地链接

**方式 A：本地链接（开发期）**
```bash
cd packages/protocol
npm link

cd ../../RippleMessengerClient
npm link @ripplemessenger/protocol

cd ../RippleMessengerApp
npm link @ripplemessenger/protocol

cd ../RippleMessengerServer
npm link @ripplemessenger/protocol
```

**方式 B：发布到私有 npm（生产）**
```bash
cd packages/protocol
npm publish --access private
```

## 迁移步骤（实际执行记录）

> 原计划是「替换所有 import + 删旧文件」的 6 周方案。实际执行时改用更安全的「薄 re-export shim」方案：旧文件变成 re-export，所有调用方零改动。以下记录实际做法。

### 共享包补充

- `ControlActionCode`（8xx 控制平面）加入 `constants.js` + `index.js` + `types/constants.d.ts`，作为 Client/App 的单一事实源

### Server 迁移

**1. 安装依赖**（`package.json` 加 `@ripplemessenger/protocol`）

**2. 转换三个文件为 re-export：**
- `msg_const.js` → `export { ... } from "@ripplemessenger/protocol"`
- `msg_schema.js` → `export { ... } from "@ripplemessenger/protocol/schema"`
- `msg_validator.js` → `export { MsgValidate } from "@ripplemessenger/protocol/validator"`

**3. 验证：** `main.js` 的 `import { MsgValidate } from "./msg_validator.js"` 无需改动，直接工作

### Client 迁移

**1. 安装依赖**（`package.json` 加 `"@ripplemessenger/protocol": "file:../packages/protocol"`）

**2. 转换三个文件：**
- `MessengerConst.js` → `export { ... } from '@ripplemessenger/protocol'`
- `MessageSchema.js` → `export { ... } from '@ripplemessenger/protocol/schema'`
- `MessageSchemaVerifier.js` → 把 `import { ... } from './MessageSchema'` 改成 `import { ... } from '@ripplemessenger/protocol/schema'`（`check*Schema` 函数保留不变）

**3. 验证：** 20+ 调用方（`messenger.*.js`、`MessageGenerator.js` 等）无需改动

### App 迁移

与 Client 完全相同，文件路径不同。

## 迁移验证

### 1. 构建测试

**Server:**
```bash
cd RippleMessengerServer
node main.js
# 检查启动日志，确认没有导入错误
```

**Client:**
```bash
cd RippleMessengerClient
npm run build
# 检查构建输出，确认没有错误
```

**App:**
```bash
cd RippleMessengerApp
npm run android  # 或 npm run ios
# 检查构建和运行时日志
```

### 2. 功能测试

**测试场景：**
1. 连接服务器（Declare 消息）
2. 发送/接收公告（Bulletin 消息）
3. 发送/接收私聊（PrivateMessage 消息）
4. 发送/接收群聊（GroupMessage 消息）
5. 文件传输（FileRequest 消息）

**验证点：**
- 消息校验通过
- ActionCode / ObjectType 正确识别
- 错误消息正确显示（ErrorMessageMap）

### 3. 回归测试

运行现有的测试套件（如果有）：
```bash
# Server
npm test

# Client
npm test

# App
npm test
```

## 常见问题

### Q1: 导入路径错误

**问题：** `Cannot find module '@ripplemessenger/protocol'`

**解决：**
```bash
# 检查 node_modules
ls node_modules/@ripplemessenger/protocol

# 重新链接
npm link @ripplemessenger/protocol

# 或重新安装
npm install @ripplemessenger/protocol
```

### Q2: 常量值不匹配

**问题：** 旧代码中的常量值与协议包不一致

**解决：**
检查协议包的常量定义是否完整。对比：
- `packages/protocol/src/constants.js`
- `RippleMessengerServer/msg_const.js`
- `RippleMessengerClient/src/lib/MessengerConst.js`

确保所有常量都已迁移。

### Q3: 校验失败但旧代码通过

**问题：** 使用协议包校验后，某些消息校验失败

**解决：**
1. 检查 Schema 定义是否完整（可能缺少某些可选字段）
2. 对比 `msg_schema.js` 和 `protocol/src/schema.js`
3. 补充缺失的 Schema

### Q4: TypeScript 类型错误

**问题：** TypeScript 项目中缺少类型定义

**解决：**
~~为协议包添加 `.d.ts` 文件~~ —— ✅ 已完成（`types/`，`tsc --strict` 零错误，`scripts/types-parity.mjs` 62/62 通过）

临时方案：
```typescript
// types/protocol.d.ts
declare module '@ripplemessenger/protocol' {
  export const ActionCode: any;
  export const ObjectType: any;
  // ... 其他导出
}
```

## 迁移时间表

**建议顺序：**

1. **Week 1: 准备阶段**
   - 补齐 Schema 文件（约 40 个）
   - 本地测试协议包完整性
   - 创建单元测试

2. **Week 2: Server 迁移**
   - 迁移 Server 代码
   - 功能测试
   - 部署到测试环境

3. **Week 3: Client 迁移**
   - 迁移 Client 代码
   - 功能测试
   - 构建测试版本

4. **Week 4: App 迁移**
   - 迁移 App 代码
   - 功能测试
   - 构建测试版本

5. **Week 5: 集成测试**
   - 三端联调
   - 回归测试
   - 性能测试

6. **Week 6: 发布**
   - 删除旧代码
   - 更新文档
   - 正式发布

## 回滚方案

如果迁移过程中遇到阻塞问题，可以临时回滚：

**1. 恢复旧文件**
```bash
git checkout main -- RippleMessengerServer/msg_const.js
git checkout main -- RippleMessengerServer/msg_schema.js
# 对 Client 和 App 做同样操作
```

**2. 恢复旧导入**
```bash
git checkout main -- src/store/sagas/
```

**3. 重新安装依赖**
```bash
npm install
```

## 后续维护

迁移完成后，协议定义的维护流程：

**修改协议时：**
1. 只修改 `packages/protocol/src/constants.js` 或 `schema.js`
2. 更新版本号（`package.json`）
3. 发布新版本
4. 各子项目更新依赖版本

**版本管理：**
- 补丁更新（Bug 修复）：0.1.0 → 0.1.1
- 次要更新（新增 Schema）：0.1.0 → 0.2.0
- 主要更新（Breaking change）：0.1.0 → 1.0.0

---

最后更新：2026-11-13（三端迁移完成，re-export shim 方案，parity 43/43 + 100/100 全绿）
