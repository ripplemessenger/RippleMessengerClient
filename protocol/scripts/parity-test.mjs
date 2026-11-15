/**
 * Behaviour test for @ripplemessenger/protocol's validator.
 *
 * GOLDEN EXPECTATIONS, not an old-vs-new comparison.
 *
 * History: this used to import the server's `msg_validator.js` and diff the two
 * implementations. That stopped being meaningful once the server file became a
 * re-export of this package — it would compare the package against itself and
 * pass even if the validator were gutted.
 *
 * So each sample below now declares its own expected outcome explicitly. The
 * expectations were captured from the original 1049-line server implementation
 * before it was replaced, so this still pins the real wire behaviour.
 *
 * Run: node scripts/parity-test.mjs   (from packages/protocol)
 */

import { MsgValidate, validateMessage } from '../src/index.js';

const PK = 'ED' + 'A'.repeat(64);
const SIG = 'B'.repeat(128);
const ADDR = 'rBTC99bat6K8LAMWoxSvBxWw3HtVpSQLAV';
const ADDR2 = 'rLondondYY5Tf1T9fcRMP9KDF9ZS2dUHZZ';
const TS = 1700000000000;

/**
 * Samples. `expect: 'accept'` means MsgValidate returns the parsed object;
 * `expect: 'reject'` means it returns exactly `false`.
 */
const samples = [
  // ── Valid ────────────────────────────────────────────────────────────────
  ['Declare', 'accept', { Action: 100, Timestamp: TS, PublicKey: PK, Signature: SIG }],
  ['Declare with URL', 'accept', { Action: 100, URL: 'wss://x.example', Timestamp: TS, PublicKey: PK, Signature: SIG }],
  ['FileRequest', 'accept', {
    Action: 300, FileType: 102, To: ADDR2, Hash: 'H1', Nonce: 7, ChunkCursor: 0,
    Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['FileRequest to group', 'accept', {
    Action: 300, FileType: 103, GroupHash: 'G', Hash: 'H1', Nonce: 7, ChunkCursor: 0,
    Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['AvatarRequest', 'accept', {
    Action: 200, List: [{ Address: ADDR, SignedAt: TS }], Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['Bulletin', 'accept', {
    ObjectType: 400, Sequence: 1, PreHash: '44F8764BCACFF5424D4044B784549A1B',
    Content: 'hello', Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['Bulletin with tag/quote/file', 'accept', {
    ObjectType: 400, Sequence: 2, PreHash: 'X', Content: 'hi',
    Tag: ['a', 'b'], Quote: [{ Address: ADDR2, Sequence: 1, Hash: 'Q' }],
    File: [{ Name: 'n', Ext: 'txt', Size: 12, Hash: 'F' }],
    Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['BulletinRequest by address+sequence', 'accept', {
    Action: 400, To: ADDR2, Address: ADDR, Sequence: 3, Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['BulletinRequest by hash', 'accept', {
    Action: 400, To: ADDR2, Hash: 'H', Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['BulletinSubscribe', 'accept', {
    Action: 401, List: [ADDR, ADDR2], Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['BulletinSubscribe empty', 'accept', {
    Action: 401, List: [], Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['RandomBulletinRequest', 'accept', { Action: 402, Timestamp: TS, PublicKey: PK, Signature: SIG }],
  ['ServerAddressRequest', 'accept', { Action: 403, Page: 1, Timestamp: TS, PublicKey: PK, Signature: SIG }],
  ['ReplyBulletinRequest', 'accept', { Action: 404, Hash: 'H', Page: 1, Timestamp: TS, PublicKey: PK, Signature: SIG }],
  ['TagBulletinRequest', 'accept', { Action: 405, Tag: ['x'], Page: 1, Timestamp: TS, PublicKey: PK, Signature: SIG }],
  ['BulletinAddressListRequest', 'accept', { Action: 406, Page: 1, Timestamp: TS, PublicKey: PK, Signature: SIG }],
  ['PrivateMessageSync', 'accept', {
    Action: 501, To: ADDR2, PairSequence: 1, SelfSequence: 2, Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['GroupSync', 'accept', { Action: 600, Timestamp: TS, PublicKey: PK, Signature: SIG }],
  ['GroupMessageSync', 'accept', {
    Action: 601, Hash: 'G', Address: ADDR, Sequence: 1, Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['ECDH', 'accept', {
    ObjectType: 101, Partition: 1, Sequence: 0, Self: 'PK1', Pair: 'PK2', To: ADDR2,
    Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['PrivateMessage', 'accept', {
    ObjectType: 500, Sequence: 1, PreHash: 'P', Content: 'c', To: ADDR2,
    Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['PrivateMessage with Confirm', 'accept', {
    ObjectType: 500, Sequence: 2, PreHash: 'P', Content: 'c', To: ADDR2,
    Confirm: { Sequence: 1, Hash: 'H' }, Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['AvatarList', 'accept', {
    ObjectType: 201,
    List: [{ ObjectType: 200, Hash: 'H', Size: 10, Timestamp: TS, PublicKey: PK, Signature: SIG }]
  }],
  ['ServerAddressList', 'accept', {
    ObjectType: 403, Page: 1, TotalPage: 2, List: [{ Address: ADDR, Count: 5 }]
  }],
  ['ReplyBulletinList', 'accept', {
    ObjectType: 404, Hash: 'H', Page: 1, TotalPage: 1,
    List: [{ ObjectType: 400, Sequence: 1, PreHash: 'P', Content: 'c', Timestamp: TS, PublicKey: PK, Signature: SIG }]
  }],
  ['TagBulletinList', 'accept', {
    ObjectType: 405, Tag: ['x'], Page: 1, TotalPage: 1,
    List: [{ ObjectType: 400, Sequence: 1, PreHash: 'P', Content: 'c', Timestamp: TS, PublicKey: PK, Signature: SIG }]
  }],
  ['RandomBulletinList', 'accept', {
    ObjectType: 406,
    List: [{ ObjectType: 400, Sequence: 1, PreHash: 'P', Content: 'c', Timestamp: TS, PublicKey: PK, Signature: SIG }]
  }],
  ['GroupCreate', 'accept', {
    ObjectType: 600, Hash: 'G', Name: 'g', Member: [ADDR, ADDR2], Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['GroupDelete', 'accept', { ObjectType: 601, Hash: 'G', Timestamp: TS, PublicKey: PK, Signature: SIG }],
  ['GroupList', 'accept', {
    ObjectType: 602,
    List: [{ ObjectType: 600, Hash: 'G', Name: 'g', Member: [ADDR, ADDR2], Timestamp: TS, PublicKey: PK, Signature: SIG }]
  }],
  ['GroupMessage', 'accept', {
    ObjectType: 603, GroupHash: 'G', Sequence: 1, PreHash: 'P', Content: 'c', To: ADDR2,
    Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['GroupMessageList', 'accept', {
    ObjectType: 604, GroupHash: 'G', To: ADDR2, Timestamp: TS, PublicKey: PK,
    List: [{ Sequence: 1, PreHash: 'P', Content: 'c', Timestamp: TS, PublicKey: PK, Signature: SIG }]
  }],

  // ── Invalid ──────────────────────────────────────────────────────────────
  ['not json', 'reject', '{{{'],
  ['empty string', 'reject', ''],
  ['json array', 'reject', '[]'],
  ['json null', 'reject', 'null'],
  ['no Action no ObjectType', 'reject', { Timestamp: TS }],
  ['unknown Action', 'reject', { Action: 999, Timestamp: TS, PublicKey: PK, Signature: SIG }],
  ['unknown ObjectType', 'reject', { ObjectType: 999 }],
  ['Declare missing Signature', 'reject', { Action: 100, Timestamp: TS, PublicKey: PK }],
  ['Bulletin wrong Sequence type', 'reject', {
    ObjectType: 400, Sequence: '1', PreHash: 'P', Content: 'c', Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['Bulletin missing PreHash', 'reject', {
    ObjectType: 400, Sequence: 1, Content: 'c', Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['FileRequest both To and GroupHash', 'reject', {
    Action: 300, FileType: 102, To: ADDR2, GroupHash: 'G', Hash: 'H', Nonce: 1,
    ChunkCursor: 0, Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['BulletinRequest neither Hash nor Address', 'reject', {
    Action: 400, To: ADDR2, Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['GroupCreate too few members', 'reject', {
    ObjectType: 600, Hash: 'G', Name: 'g', Member: [ADDR], Timestamp: TS, PublicKey: PK, Signature: SIG
  }],
  ['PrivateMessageSync missing To', 'reject', {
    Action: 501, PairSequence: 1, SelfSequence: 2, Timestamp: TS, PublicKey: PK, Signature: SIG
  }],

  // ── Known quirks (documented, intentionally preserved) ───────────────────
  // DeclareSchema uses maxProperties:5, not additionalProperties:false, so one
  // extra non-required field slips through. Pre-existing wire behaviour.
  ['QUIRK Declare extra prop (accepted by design)', 'accept', {
    Action: 100, Timestamp: TS, PublicKey: PK, Signature: SIG, Bogus: 1
  }],
  // Dispatch uses truthiness, so Action:0 is treated as absent.
  ['QUIRK Action 0 treated as absent', 'reject', { Action: 0, Timestamp: TS }],
  ['QUIRK ObjectType 0 treated as absent', 'reject', { ObjectType: 0 }],
  ['raw string with surrounding whitespace', 'accept',
    '  {"Action":600,"Timestamp":1,"PublicKey":"x","Signature":"y"}  ']
];

let pass = 0;
let fail = 0;
const failures = [];

for (const [name, expect, raw] of samples) {
  const input = typeof raw === 'string' ? raw : JSON.stringify(raw);

  let result;
  let threw = null;
  try {
    result = MsgValidate(input);
  } catch (e) {
    threw = e.message;
  }

  const ok = threw === null && (result !== false) === (expect === 'accept');

  // On accept, the returned value must be the parsed object (not `true`).
  let payloadOk = true;
  if (ok && expect === 'accept') {
    let expectedPayload;
    try {
      expectedPayload = JSON.parse(input);
    } catch {
      expectedPayload = undefined;
    }
    payloadOk =
      expectedPayload !== undefined &&
      result !== null &&
      typeof result === 'object' &&
      JSON.stringify(result) === JSON.stringify(expectedPayload);
  }

  if (ok && payloadOk) {
    pass++;
    console.log(`  ✓ ${name}  (${expect})`);
  } else {
    fail++;
    failures.push({ name, expect, input, threw, result, payloadOk });
    console.log(`  ✗ ${name}  expected=${expect} got=${threw ? 'THREW' : result === false ? 'reject' : 'accept'}`);
  }
}

// ── validateMessage() must agree with MsgValidate on every sample ──────────
console.log('\n=== validateMessage() agrees with MsgValidate ===\n');
for (const [name, expect, raw] of samples) {
  const input = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const boolResult = validateMessage(input);
  const expectedBool = expect === 'accept';
  if (boolResult === expectedBool) {
    pass++;
  } else {
    fail++;
    failures.push({ name: `validateMessage: ${name}`, expect: expectedBool, actual: boolResult });
    console.log(`  ✗ ${name}: validateMessage=${boolResult} expected=${expectedBool}`);
  }
}
console.log(`  (${samples.length} samples cross-checked)`);

console.log(`\n${'='.repeat(60)}`);
console.log(`PASS ${pass}   FAIL ${fail}   TOTAL ${pass + fail}`);
console.log('='.repeat(60));

if (fail > 0) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(JSON.stringify(f, null, 2));
  process.exit(1);
}
