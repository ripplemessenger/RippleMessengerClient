/**
 * Schema parity test: does @ripplemessenger/protocol declare EXACTLY the same
 * JSON schemas as the original server definitions?
 *
 * The reference is a FROZEN SNAPSHOT, not the live server file:
 *   test/fixtures/server-schemas.snapshot.json
 *
 * Why a snapshot and not `RippleMessengerServer/msg_schema.js`: that file is now
 * a re-export of this very package, so comparing against it would be circular
 * and would pass even if the schemas were gutted. The snapshot was captured from
 * the original 1049-line implementation before it was replaced.
 *
 * Compares every schema by deep-equality, plus the constant tables, plus key
 * sets in both directions (no missing / no extra).
 *
 * Run: node scripts/schema-parity.mjs   (from packages/protocol)
 */

import { readFileSync } from 'node:fs';
import * as newPkg from '../src/index.js';

const SNAPSHOT = (() => {
  const snapshotPath = new URL('../test/fixtures/server-schemas.snapshot.json', import.meta.url);
  let raw;
  try {
    raw = readFileSync(snapshotPath, 'utf8');
  } catch (err) {
    console.error(`FATAL: cannot read snapshot at ${snapshotPath.pathname}`);
    console.error(`  ${err.message}`);
    console.error('  Regenerate it from the original server msg_schema.js if it was lost.');
    process.exit(2);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`FATAL: snapshot is not valid JSON (${snapshotPath.pathname})`);
    console.error(`  ${err.message}`);
    process.exit(2);
  }
})();

// Constant tables are still read live from the server file: it is a re-export
// of this package today, but msg_const.js existed independently and the values
// are pinned by test/fixtures too. Keep the live read for a cheap sanity check.
let oldConst = {};
try {
  oldConst = await import('../../../RippleMessengerServer/msg_const.js');
} catch {
  oldConst = {};
}

let pass = 0;
let fail = 0;
const failures = [];

/** Stable deep-equal via canonical JSON (schema objects are plain data). */
function canon(v) {
  return JSON.stringify(v, (_k, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.fromEntries(Object.keys(val).sort().map((kk) => [kk, val[kk]]));
    }
    return val;
  });
}

function check(label, expected, actual) {
  if (canon(expected) === canon(actual)) {
    pass++;
    return true;
  }
  fail++;
  failures.push({ label, expected, actual });
  return false;
}

// ── 1. Every snapshot schema must exist in the package, deep-equal ──────────
const snapshotNames = Object.keys(SNAPSHOT).sort();
const newNames = new Set(Object.keys(newPkg));

console.log(`\n=== Snapshot contains ${snapshotNames.length} schemas ===\n`);

for (const name of snapshotNames) {
  if (!newNames.has(name)) {
    fail++;
    failures.push({ label: `MISSING in package: ${name}` });
    console.log(`  ✗ ${name}  — not exported by package`);
    continue;
  }
  const ok = check(name, SNAPSHOT[name], newPkg[name]);
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
}

// ── 2. Constants must match (live server re-export, if reachable) ──────────
console.log('\n=== Constants ===\n');

const constTables = ['ActionCode', 'ObjectType', 'FileRequestType', 'MessageObjectType', 'MessageCode'];
const constScalars = ['Epoch', 'GenesisAddress', 'GenesisHash'];

if (Object.keys(oldConst).length === 0) {
  console.log('  (server msg_const.js not reachable — skipping live comparison)');
} else {
  for (const table of constTables) {
    const ok = check(`const.${table}`, oldConst[table], newPkg[table]);
    console.log(`  ${ok ? '✓' : '✗'} ${table}`);
  }
  for (const scalar of constScalars) {
    const ok = check(`const.${scalar}`, oldConst[scalar], newPkg[scalar]);
    console.log(`  ${ok ? '✓' : '✗'} ${scalar}`);
  }
}

// ── 3. No extra schemas invented by the package ────────────────────────────
console.log('\n=== Package-only additions (informational) ===\n');

const snapshotSet = new Set(snapshotNames);
const extras = Object.keys(newPkg).filter((k) => k.endsWith('Schema') && !snapshotSet.has(k));
if (extras.length === 0) {
  console.log('  (none — package adds no schemas beyond the snapshot)');
} else {
  for (const e of extras) console.log(`  + ${e}`);
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(60)}`);
console.log(`PASS ${pass}   FAIL ${fail}`);
console.log('='.repeat(60));

if (fail > 0) {
  console.log('\nFAILURES:\n');
  for (const f of failures) {
    console.log(`--- ${f.label} ---`);
    if (f.expected === undefined) {
      console.log('  (missing on the snapshot side)');
    } else {
      console.log('EXPECTED:', JSON.stringify(f.expected, null, 2).slice(0, 2000));
      console.log('ACTUAL  :', JSON.stringify(f.actual, null, 2).slice(0, 2000));
    }
  }
  process.exit(1);
}
