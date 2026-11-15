# @ripplemessenger/protocol

Unified protocol constants, JSON schemas, and validators for RippleMessenger.

**Status: v0.1.0 — schemas complete and verified against the server.** The
package is ready to consume; what remains is wiring the four projects onto it
(see `MIGRATION.md`).

## Why this package exists

Protocol definitions were hand-copied into four places and had already drifted:

- `RippleMessengerClient/src/lib/` — `MessengerConst.js` + `MessageSchema.js` + `MessageSchemaVerifier.js`
- `RippleMessengerApp/src/lib/` — same two files, copied from Client
- `RippleMessengerServer/` — `msg_const.js` + `msg_schema.js` + `msg_validator.js`
- `RippleMessengerSite/` — reuses Server's definitions

Concrete drift that already happened:

| Item | Drift |
| --- | --- |
| `ActionCode.BulletinAddressListRequest` (406) | present on Client, missing from Server's const file for a while |
| `FileRequestType` values | actual values are `Avatar:100, File:101, PrivateChatFile:102, GroupChatFile:103` — **not** the 2xx/3xx ranges you would guess |
| `MessageObjectType` values | `NotObject:100, Bulletin:101, PrivateChatFile:102, GroupChatFile:103` |
| Prisma schema | Server on v6, Site on v7 |

Import from here instead of a local copy.

## Installation

```bash
npm install @ripplemessenger/protocol
```

Link locally during development:

```bash
cd packages/protocol && npm link

cd ../../RippleMessengerServer  && npm link @ripplemessenger/protocol
cd ../RippleMessengerClient     && npm link @ripplemessenger/protocol
cd ../RippleMessengerApp        && npm link @ripplemessenger/protocol
```

## Usage

### Constants

```javascript
import { ActionCode, ObjectType, MessageCode, Epoch } from '@ripplemessenger/protocol';

ActionCode.Declare;              // 100
ObjectType.Bulletin;             // 400
MessageCode.KickedByNewConn;     // 710
```

### Validate a raw frame — `MsgValidate` (drop-in for the server)

```javascript
import { MsgValidate } from '@ripplemessenger/protocol';

ws.on('message', (frame) => {
  const json = MsgValidate(frame);   // parsed object, or false
  if (json === false) { terminate(); return; }
  if (json.ObjectType) handleObject(json);   // uses the parsed object
});
```

> **Semantics note.** `MsgValidate` returns the **parsed object** on success, not
> `true`. Every existing server call site depends on this (`if (json.ObjectType)`),
> so the shared package preserves it exactly. This was verified by
> `scripts/parity-test.mjs`, which runs both implementations over the same corpus
> and compares the returned payloads, not just the accept/reject decision.

### Validate with a boolean — for new code

```javascript
import { validateMessage, validateAction, validateObject } from '@ripplemessenger/protocol';

validateMessage(frame);        // boolean, accepts string or object
validateAction(actionMessage); // boolean, requires an Action code
validateObject(objectMessage); // boolean, requires an ObjectType code
```

### Validate an already-parsed object

```javascript
import { validateParsed } from '@ripplemessenger/protocol';

const json = validateParsed(parsed);
if (json === false) { /* reject */ }
```

### Access schemas directly

```javascript
import { BulletinSchema, ActionSchemas, ObjectSchemas } from '@ripplemessenger/protocol';

const schema = ActionSchemas[ActionCode.Declare];
```

## API Reference

### Constants

| Export | Meaning |
| --- | --- |
| `Epoch` | Unix ms timestamp of the RMS network epoch |
| `GenesisAddress` | XRPL address of the genesis account |
| `GenesisHash` | `44F8764BCACFF5424D4044B784549A1B` |
| `MasterAddress` | Master/admin account |
| `PostAddress` | Official post/bot account |
| `ListItemMax` | Max entries in batch request lists (16) |
| `GroupMemberMin` / `GroupMemberMax` | 2 / 16 |
| `DefaultServer` | Production WebSocket URL (client-side only) |
| `ActionCode` | Top-level routing enum |
| `ObjectType` | Payload type discriminator |
| `FileRequestType` | File kind enum |
| `MessageObjectType` | Embedded object references |
| `MessageCode` | Server→client notifications/errors (7xx) |
| `ErrorMessageMap` | Error text for UI (client-side only) |

### Schemas (36 exports)

All Ajv-compatible JSON Schema objects. Grouped:

- **Declare** — `DeclareSchema`
- **File** — `FileRequestSchema`
- **Avatar** — `AvatarRequestSchema`, `AvatarSchema`, `AvatarListSchema`
- **Bulletin** — `BulletinSchema`, `BulletinListItemSchema`, `BulletinRequestSchema`,
  `BulletinSubscribeSchema`, `RandomBulletinRequestSchema`, `ServerAddressRequestSchema`,
  `ServerAddressListSchema`, `BulletinAddressListRequestSchema`, `ReplyBulletinRequestSchema`,
  `ReplyBulletinListSchema`, `TagBulletinRequestSchema`, `TagBulletinListSchema`,
  `RandomBulletinListSchema`
- **Handshake** — `ECDHHandshakeSchema`
- **Private** — `PrivateMessageSchema`, `PrivateMessageSyncSchema`
- **Group** — `GroupSyncSchema`, `GroupMessageSyncSchema`, `GroupListSchema`,
  `GroupCreateSchema`, `GroupDeleteSchema`, `GroupMessageSchema`, `GroupMessageListSchema`
- **Message objects** — `MessageObjectBulletinSchema`,
  `MessageObjectPrivateChatFileSchema`, `MessageObjectGroupChatFileSchema`
- **Control plane** — `ServerNotifyErrorSchema`, `ServerNotifyInfoSchema`,
  `ServerNotifyCacheSchema`, `ServerNotifyFileProgressSchema`, `ClientAckSchema`

Dispatch tables:

| Table | Entries | Purpose |
| --- | --- | --- |
| `ActionSchemas` | 14 | ActionCode → schema |
| `ObjectSchemas` | 14 | ObjectType → schema |
| `MessageObjectSchemas` | 3 | MessageObjectType → schema |

### Validators

| Export | Signature | Notes |
| --- | --- | --- |
| `MsgValidate` | `(strJson) => object \| false` | drop-in for the server; returns parsed object |
| `validateParsed` | `(json) => object \| false` | already-parsed input |
| `validateMessage` | `(str \| object) => boolean` | general purpose |
| `validateAction` | `(str \| object) => boolean` | Action only |
| `validateObject` | `(str \| object) => boolean` | ObjectType only |
| `getErrors` | `(code, kind?) => array` | best-effort Ajv errors |

### TypeScript

Full typings ship in `types/`. Both loose and typed views are available:

```typescript
import { MsgValidate, ActionCode } from '@ripplemessenger/protocol';
import type { BulletinItem, PrivateMessage, GroupMessage } from '@ripplemessenger/protocol';
```

`types/messages.d.ts` contains typed interfaces for each message shape. They are
documentation-grade — the JSON Schema remains the runtime authority.

## Verification

Three scripts, all of which exit non-zero on failure, so they can go straight
into CI:

```bash
npm run test:schema        # 35 schemas + 8 constant tables vs the server (43 assertions)
npm run test:behavior      # 49 sample messages through old & new validator (49 assertions)
node scripts/types-parity.mjs   # .d.ts literals vs runtime values (62 assertions)
```

Current results: **43/43, 49/49, 62/62 — all green.**

What each one protects against:

- **`test:schema`** — catches a schema being edited on one side only. Deep-compares
  every exported schema against `RippleMessengerServer/msg_schema.js`.
- **`test:behavior`** — catches semantic drift the schema diff would miss (dispatch
  order, falsy-code handling, returned payload). Compares accept/reject **and**
  the returned object.
- **`types-parity.mjs`** — catches hand-written `.d.ts` literals drifting from
  runtime. This one earned its keep: the first draft of `constants.d.ts` had wrong
  `FileRequestType` / `MessageObjectType` values and a non-existent
  `ActionCode.AvatarUpload`, all caught immediately.

> `test:behavior` imports the server's `msg_validator.js`, which needs `ajv` and
> `ripple-keypairs` resolvable from `RippleMessengerServer/`. `MsgValidate` never
> calls the signing functions, so a stub is enough; `node_modules` is gitignored.

## Known protocol quirks (preserved, not fixed)

These are existing wire behaviours. The package reproduces them exactly so
migration is behaviour-neutral. Changing any of them is a protocol change and
needs its own discussion:

1. **`DeclareSchema` uses `maxProperties: 5`, not `additionalProperties: false`.**
   An extra non-required field is accepted as long as the count stays under the
   cap. Verified: the `Declare extra prop` case is accepted by both implementations.
2. **Dispatch uses truthiness** (`if (json.Action)`), so `Action: 0` is treated as
   absent. All real codes are ≥ 100, so this is harmless — but do not "fix" it
   without checking every caller.
3. **`Action 500` (`FriendRequest`)** is dead: never implemented, and sending it
   fails schema validation, which drops the connection.

## Development

```bash
npm install
npm test
```

## License

MIT
