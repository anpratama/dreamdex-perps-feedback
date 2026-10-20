// Repro for: unknown binary OrderKind is reported as "BUY_YES"
// Run: node repro/side-of-kind.mjs   (from ~/workspace/dreamdex-bounty)
import { sideOfKind } from '../sdk/package/dist/store.js';

// Known kinds 0..3 must map to their documented sides; anything else must NOT
// collapse into a concrete side.
const known = ['BUY_YES', 'SELL_YES', 'BUY_NO', 'SELL_NO'];
const unknownInputs = [4, 99, -1, 2 ** 31];
let bad = 0;

for (let i = 0; i < 4; i++) {
  const got = sideOfKind(i);
  const ok = got === known[i];
  if (!ok) bad++;
  console.log(`sideOfKind(${i}) = "${got}"  expected "${known[i]}"  ${ok ? 'OK' : 'BUG'}`);
}
for (const k of unknownInputs) {
  const got = sideOfKind(k);
  const ok = got !== 'BUY_YES' && got !== 'SELL_YES' && got !== 'BUY_NO' && got !== 'SELL_NO';
  if (!ok) bad++;
  console.log(`sideOfKind(${k}) = "${got}"  expected unknown-marker  ${ok ? 'OK' : 'BUG (folded into a concrete side)'}`);
}
console.log(bad ? `\nRESULT: ${bad} case(s) wrong` : '\nRESULT: all correct');
process.exit(bad ? 1 : 0);
