/**
 * Typings parity test: do the .d.ts enum literals match runtime values?
 *
 * The .d.ts files are hand-written, so they can silently drift from
 * src/constants.js. This script parses the declarations and diffs them against
 * the real objects, in both directions (missing keys AND extra keys).
 *
 * Run: node scripts/types-parity.mjs   (from packages/protocol)
 */

import { readFileSync } from 'node:fs';
import * as constants from '../src/constants.js';

const dts = readFileSync(new URL('../types/constants.d.ts', import.meta.url), 'utf8');

const TABLES = ['ActionCode', 'ObjectType', 'FileRequestType', 'MessageObjectType', 'MessageCode'];

let bad = 0;
let checked = 0;

for (const table of TABLES) {
  // Grab the object body of: export declare const TABLE: { ... };
  const blockRe = new RegExp(
    `declare const ${table}:\\s*\\{([\\s\\S]*?)\\n\\};`
  );
  const m = dts.match(blockRe);
  if (!m) {
    console.log(`  ✗ ${table}: no declaration block found in .d.ts`);
    bad++;
    continue;
  }

  const declared = {};
  for (const line of m[1].split('\n')) {
    const km = line.match(/readonly\s+(\w+):\s*(-?\d+)\s*;/);
    if (km) declared[km[1]] = Number(km[2]);
  }

  const actual = constants[table];
  const dKeys = Object.keys(declared).sort();
  const aKeys = Object.keys(actual).sort();

  const onlyDts = dKeys.filter((k) => !aKeys.includes(k));
  const onlyRuntime = aKeys.filter((k) => !dKeys.includes(k));

  if (onlyDts.length || onlyRuntime.length) {
    console.log(`  ✗ ${table}: key mismatch`);
    if (onlyDts.length) console.log(`      only in .d.ts : ${onlyDts.join(', ')}`);
    if (onlyRuntime.length) console.log(`      only at runtime: ${onlyRuntime.join(', ')}`);
    bad++;
  }

  for (const k of dKeys) {
    if (!aKeys.includes(k)) continue;
    checked++;
    if (declared[k] !== actual[k]) {
      console.log(`  ✗ ${table}.${k}: .d.ts=${declared[k]} runtime=${actual[k]}`);
      bad++;
    }
  }

  if (!onlyDts.length && !onlyRuntime.length) {
    console.log(`  ✓ ${table} (${dKeys.length} entries)`);
  }
}

// Scalar declarations must exist too.
for (const scalar of [
  'Epoch',
  'GenesisAddress',
  'GenesisHash',
  'MasterAddress',
  'PostAddress',
  'ListItemMax',
  'GroupMemberMin',
  'GroupMemberMax',
  'DefaultServer'
]) {
  if (!new RegExp(`declare const ${scalar}\\s*:`).test(dts)) {
    console.log(`  ✗ ${scalar}: not declared in .d.ts`);
    bad++;
  } else if (constants[scalar] === undefined) {
    console.log(`  ✗ ${scalar}: declared in .d.ts but undefined at runtime`);
    bad++;
  } else {
    checked++;
  }
}
console.log('  ✓ scalars declared and defined at runtime');

console.log(`\n${'='.repeat(60)}`);
console.log(`checked ${checked} values, ${bad} problem(s)`);
console.log('='.repeat(60));
process.exit(bad ? 1 : 0);
