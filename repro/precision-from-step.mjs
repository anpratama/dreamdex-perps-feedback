// Repro for: precisionFromStep undercounts decimals for non-power-of-10 steps
// Run: node repro/precision-from-step.mjs   (from ~/workspace/dreamdex-bounty)
import { precisionFromStep } from '../sdk/package/dist/unified/structs.js';

// expected = smallest d such that every multiple of `step` is representable
// in d decimals = decimals - trailingDecimalZeros(step)
const cases = [
  ['250', 6, 5],
  ['125', 6, 6],
  ['15', 6, 6],
  ['1000', 6, 3],
  ['500', 6, 4],
  ['100', 6, 4],
  ['10', 6, 5],
  ['1', 6, 6],
];
let bad = 0;
for (const [step, dec, expected] of cases) {
  const got = precisionFromStep(step, dec);
  const ok = got === expected;
  if (!ok) bad++;
  console.log(`precisionFromStep("${step}", ${dec}) = ${got}  expected ${expected}  ${ok ? 'OK' : 'BUG'}`);
}
console.log(bad ? `\nRESULT: ${bad} case(s) wrong` : '\nRESULT: all correct');
process.exit(bad ? 1 : 0);
