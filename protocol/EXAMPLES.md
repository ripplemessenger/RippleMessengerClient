# 协议共享包迁移示例

本文档提供具体的代码迁移示例，展示如何将现有代码迁移到 `@ripplemessenger/protocol`。

> **状态**：包内 Schema 已完整（36 个导出，与 Server 逐字节一致，`npm test` 全绿），
> 本文档的示例可以直接照做。迁移顺序与时间表见 `MIGRATION.md`。

## 示例 1: Server 消息校验

### 迁移前（Server/main.js）

```javascript
import { ActionCode, ObjectType, MessageCode } from './msg_const.js';
import { MsgValidate } from './msg_schema.js';

async function checkMessage(ws, message, isFromNode = false) {
  const connAddress = fetchConnAddress(ws);
  ConsoleInfo(`Client Message from ${connAddress}:`, message);
  
  const json = MsgValidate(message);
  if (json === false) {
    ConsoleWarn('Schema validation FAILED');
    ws.send(GenServerNotifyError(
      MessageCode.JsonSchemaInvalid,
      'JSON schema validation failed'
    ));
    terminateConn(ws, 'schema_validation_failed');
    return;
  }
  
  if (json.ObjectType) {
    await handleObject(connAddress, message, json, isFromNode);
  } else if (json.Action) {
    await handleAction(connAddress, message, json);
  }
}
```

### 迁移后

```javascript
import { ActionCode, ObjectType, MessageCode, validateMessage } from '@ripplemessenger/protocol';

async function checkMessage(ws, message, isFromNode = false) {
  const connAddress = fetchConnAddress(ws);
  ConsoleInfo(`Client Message from ${connAddress}:`, message);
  
  let json;
  try {
    json = JSON.parse(message);
  } catch {
    ConsoleWarn('JSON parse failed');
    ws.send(GenServerNotifyError(
      MessageCode.JsonSchemaInvalid,
      'Invalid JSON format'
    ));
    terminateConn(ws, 'json_parse_failed');
    return;
  }
  
  if (!validateMessage(json)) {
    ConsoleWarn('Schema validation FAILED');
    ws.send(GenServerNotifyError(
      MessageCode.JsonSchemaInvalid,
      'JSON schema validation failed'
    ));
    terminateConn(ws, 'schema_validation_failed');
    return;
  }
  
  if (json.ObjectType) {
    await handleObject(connAddress, message, json, isFromNode);
  } else if (json.Action) {
    await handleAction(connAddress, message, json);
  }
}
```

### 关键变化

1. 导入从本地文件改为协议包
2. `MsgValidate(message)` 改为 `JSON.parse() + validateMessage()`
3. 显式处理 JSON 解析失败

---

## 示例 2: Client WebSocket 消息处理

### 迁移前（Client/src/store/sagas/messenger.ws.js）

```javascript
import { ActionCode, ObjectType, MessageCode } from '../../lib/MessengerConst';
import { checkBulletinSchema, checkPrivateMessageSchema } from '../../lib/MessageSchemaVerifier';

function* handleWebSocketMessage(message) {
  let json;
  try {
    json = JSON.parse(message.data);
  } catch (e) {
    Logger.error('[WS] Invalid JSON:', e);
    return;
  }
  
  if (json.ObjectType === ObjectType.Bulletin) {
    if (!checkBulletinSchema(json)) {
      Logger.warn('[WS] Invalid bulletin schema');
      return;
    }
    yield call(CacheBulletin, json);
  } else if (json.ObjectType === ObjectType.PrivateMessage) {
    if (!checkPrivateMessageSchema(json)) {
      Logger.warn('[WS] Invalid private message schema');
      return;
    }
    yield call(processPrivateMessage, json);
  }
}
```

### 迁移后

```javascript
import { ActionCode, ObjectType, MessageCode, validateObject } from '@ripplemessenger/protocol';

function* handleWebSocketMessage(message) {
  let json;
  try {
    json = JSON.parse(message.data);
  } catch (e) {
    Logger.error('[WS] Invalid JSON:', e);
    return;
  }
  
  if (!validateObject(json)) {
    Logger.warn('[WS] Invalid object schema');
    return;
  }
  
  if (json.ObjectType === ObjectType.Bulletin) {
    yield call(CacheBulletin, json);
  } else if (json.ObjectType === ObjectType.PrivateMessage) {
    yield call(processPrivateMessage, json);
  }
}
```

### 关键变化

1. 导入统一到协议包
2. 多个 `check*Schema()` 函数合并为一个 `validateObject()`
3. 校验逻辑集中到一处，不再有 27 个 `chk*` 包装函数

> **注意**：Server 侧入口应继续用 `MsgValidate`（返回解析后的对象），因为现有代码
> 依赖它的返回值；`validateObject()` 返回布尔值，适合新写的判断分支。
> 两者语义差异见 `README.md` 的 "Semantics note"。

---

## 示例 3: 消息生成器

### 迁移前（Client/src/lib/MessageGenerator.js）

```javascript
import { ActionCode, Epoch } from './MessengerConst';
import * as rippleKeyPairs from 'ripple-keypairs';

export function genDeclare(publicKey, privateKey, url) {
  const message = {
    Action: ActionCode.Declare,
    Timestamp: Date.now(),
    PublicKey: publicKey,
  };
  
  if (url) {
    message.URL = url;
  }
  
  const hash = /* 计算签名 */;
  message.Signature = rippleKeyPairs.sign(hash, privateKey);
  
  return JSON.stringify(message);
}
```

### 迁移后

```javascript
import { ActionCode, Epoch } from '@ripplemessenger/protocol';
import * as rippleKeyPairs from 'ripple-keypairs';

export function genDeclare(publicKey, privateKey, url) {
  const message = {
    Action: ActionCode.Declare,
    Timestamp: Date.now(),
    PublicKey: publicKey,
  };
  
  if (url) {
    message.URL = url;
  }
  
  const hash = /* 计算签名 */;
  message.Signature = rippleKeyPairs.sign(hash, privateKey);
  
  return JSON.stringify(message);
}
```

### 关键变化

1. 只改导入路径，函数逻辑不变
2. 保持与现有代码的兼容性

---

## 示例 4: 错误消息显示

### 迁移前（Client/src/store/slices/CommonSlice.js）

```javascript
import { MessageCode } from '../../lib/MessengerConst';

const ErrorMessages = {
  [MessageCode.KickedByNewConn]: 'Disconnected — new login detected',
  [MessageCode.ServerShutdown]: 'Server is shutting down',
  // ...
};

export function showError(code) {
  const message = ErrorMessages[code] || 'Unknown error';
  // 显示错误消息
}
```

### 迁移后

```javascript
import { MessageCode, ErrorMessageMap } from '@ripplemessenger/protocol';

export function showError(code) {
  const message = ErrorMessageMap[code] || 'Unknown error';
  // 显示错误消息
}
```

### 关键变化

1. 使用协议包提供的 `ErrorMessageMap`
2. 删除本地的错误消息映射

---

## 示例 5: App 消息校验（React Native）

### 迁移前（App/src/store/sagas/messenger.ws.js）

```javascript
import { ActionCode, ObjectType } from '../../lib/MessengerConst';
import { checkGroupMessageSchema } from '../../lib/MessageSchemaVerifier';

function* handleGroupMessage(json) {
  if (!checkGroupMessageSchema(json)) {
    Logger.warn('[GroupMsg] Invalid schema');
    return;
  }
  
  // 处理群消息
  yield call(cacheGroupMessage, json);
}
```

### 迁移后

```javascript
import { ActionCode, ObjectType, validateObject } from '@ripplemessenger/protocol';

function* handleGroupMessage(json) {
  if (!validateObject(json)) {
    Logger.warn('[GroupMsg] Invalid schema');
    return;
  }
  
  // 处理群消息
  yield call(cacheGroupMessage, json);
}
```

### 关键变化

1. 统一校验函数接口
2. 与 Client 保持一致

---

## 示例 6: 批量迁移脚本

为了加速迁移，可以使用脚本批量替换导入语句：

### replace-imports.js

```javascript
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 查找所有需要迁移的文件
const files = glob.sync('src/**/*.js');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  // 替换常量导入
  if (content.includes("from '../../lib/MessengerConst'") ||
      content.includes("from '../lib/MessengerConst'")) {
    content = content.replace(
      /from ['"]\.\.\/\.\.\/lib\/MessengerConst['"]/g,
      "from '@ripplemessenger/protocol'"
    );
    content = content.replace(
      /from ['"]\.\.\/lib\/MessengerConst['"]/g,
      "from '@ripplemessenger/protocol'"
    );
    modified = true;
  }
  
  // 替换 Schema 校验函数
  if (content.includes('checkBulletinSchema')) {
    content = content.replace(/checkBulletinSchema/g, 'validateObject');
    content = content.replace(
      /from ['"]\.\.\/\.\.\/lib\/MessageSchemaVerifier['"]/g,
      "from '@ripplemessenger/protocol'"
    );
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${file}`);
  }
});
```

### 使用方法

```bash
# 在 Client 或 App 目录下运行
node scripts/replace-imports.js
```

---

## 迁移检查清单

完成迁移后，使用以下清单验证：

### 1. 导入检查

```bash
# 检查是否还有旧导入
grep -r "from '.*MessengerConst'" src/
grep -r "from '.*MessageSchema'" src/
grep -r "from './msg_const'" .
grep -r "from './msg_schema'" .

# 应该返回空结果
```

### 2. 构建检查

```bash
# Server
cd RippleMessengerServer
node main.js
# 应该正常启动，无导入错误

# Client
cd RippleMessengerClient
npm run build
# 应该构建成功

# App
cd RippleMessengerApp
npm run android
# 应该正常运行
```

### 3. 功能检查

测试以下场景：

- [ ] Declare 消息（连接服务器）
- [ ] 发送/接收公告
- [ ] 发送/接收私聊
- [ ] 发送/接收群聊
- [ ] 文件上传/下载
- [ ] 错误消息显示正确

### 4. 性能检查

- [ ] 消息校验性能无明显下降
- [ ] WebSocket 消息处理正常
- [ ] 无内存泄漏

---

## 回滚步骤

如果迁移出现问题，按以下步骤回滚：

```bash
# 1. 恢复旧文件
git checkout HEAD -- src/lib/MessengerConst.js
git checkout HEAD -- src/lib/MessageSchema.js
git checkout HEAD -- src/lib/MessageSchemaVerifier.js

# 2. 恢复旧导入
git checkout HEAD -- src/store/sagas/

# 3. 卸载协议包
npm uninstall @ripplemessenger/protocol

# 4. 重新安装依赖
npm install

# 5. 重新构建
npm run build
```

---

## 常见问题解决

### Q1: 构建失败 - 找不到模块

**错误信息：**
```
Error: Cannot find module '@ripplemessenger/protocol'
```

**解决方法：**
```bash
# 确认包已安装
npm list @ripplemessenger/protocol

# 如果未安装，重新链接或安装
npm link @ripplemessenger/protocol
# 或
npm install @ripplemessenger/protocol
```

### Q2: 运行时错误 - 校验失败

**错误信息：**
```
[WS] Schema validation FAILED
```

**解决方法：**
1. 检查协议包的 Schema 是否完整
2. 对比旧 Schema 和新 Schema
3. 补充缺失的可选字段

### Q3: TypeScript 类型错误

**错误信息：**
```
Could not find a declaration file for module '@ripplemessenger/protocol'
```

**解决方法：**

创建临时类型定义：

```typescript
// types/protocol.d.ts
declare module '@ripplemessenger/protocol' {
  export const ActionCode: {
    Declare: number;
    AvatarRequest: number;
    // ... 其他常量
  };
  
  export const ObjectType: {
    Nothing: number;
    ECDH: number;
    // ... 其他常量
  };
  
  export function validateMessage(message: any): boolean;
  export function validateAction(message: any): boolean;
  export function validateObject(message: any): boolean;
}
```

---

最后更新：2024-11-12
