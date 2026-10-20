// Repro for: binary BUY_NO escrow can compute a NEGATIVE commitment
// The BUY_NO escrow path calls bidCommitment(quantity, oneCollateral - price, oneCollateral).
// A caller passing price > oneCollateral (only guarded by `price > 0` upstream)
// makes unitPrice negative -> negative commitment -> approval skipped, pool reverts.
// Run: node repro/buy-no-negative-escrow.mjs   (from ~/workspace/dreamdex-bounty)
import { bidCommitment } from '../sdk/package/dist/writer.js';

const oneCollateral = 1000000n; // 6dp collateral scale

// Case 1: minimal over-range price (price = oneCollateral + 1 => unitPrice = -1)
const c1 = bidCommitment(100n, -1n, oneCollateral);
console.log(`bidCommitment(100n, -1n, 1e6) = ${c1}   (expected: InvalidInputError or >= 0)`);

// Case 2: larger over-range price
const c2 = bidCommitment(100000000n, -500000n, oneCollateral);
console.log(`bidCommitment(100000000n, -500000n, 1e6) = ${c2}   (expected: InvalidInputError or >= 0)`);

const bad = (c1 < 0n || c2 < 0n);
console.log(bad ? '\nRESULT: BUG — negative escrow commitment computed' : '\nRESULT: no negative commitment');
process.exit(bad ? 1 : 0);
