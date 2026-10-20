# Binary BUY_NO with price above `oneCollateral` computes a negative escrow commitment instead of failing validation

**Severity:** normal
**Area:** SDK

## Steps to reproduce

1. Install `@somnia-chain/markets-sdk@0.32.1` and its peer deps (`viem`).
2. Call the exported escrow math the way the BUY_NO path does (`src/writer.ts:711-716`: `escrow` uses `bidCommitment(p.quantity, oneCollateral - p.price, oneCollateral)` for `BUY_NO`):
   ```js
   import { bidCommitment } from '@somnia-chain/markets-sdk/dist/writer.js';
   const oneCollateral = 1000000n; // 6dp collateral scale
   // price = oneCollateral + 1  =>  unitPrice = oneCollateral - price = -1
   console.log(bidCommitment(100n, -1n, oneCollateral));            // -> 0
   console.log(bidCommitment(100000000n, -500000n, oneCollateral)); // -> -49999999
   ```
   (Standalone repro script: `repro/buy-no-negative-escrow.mjs` in the submission repo.)

## Expected

A YES price is a probability on the scale `0 … oneCollateral`. An out-of-range price should be rejected client-side with `InvalidInputError` (the codebase already validates `p.price <= 0n` at `src/orders.ts:1803` — the natural home for the upper-bound check), or at minimum produce a non-negative commitment.

## Actual

The only validation on the binary write path is `if (p.price <= 0n || p.quantity <= 0n) throw new InvalidInputError(...)` (`src/orders.ts:1803`, also `:1956`, `:2421`). A BUY_NO with `price > oneCollateral` passes that guard; the escrow then computes `oneCollateral - price < 0` and `bidCommitment` (`src/writer.ts:80-88`) returns a **negative** commitment (BigInt division truncates toward zero — verified: `-49,999,999n`; the minimal over-range case yields `0n` instead of a rejection).

The negative amount flows into `approvalIfNeeded`, where `allowance >= required` is trivially true for any non-negative allowance — so no approval is built — and into the facade's collateral pre-check, which (per its own docstring) shares `bidCommitment` and would report a negative "collateral required". The tx then goes to the pool, whose uint256 commitment math reverts (underflow panic), and the user pays gas for a transaction the SDK could have rejected client-side.

## Evidence

Actual run output against the published package:
```
bidCommitment(100n, -1n, 1e6) = 0   (expected: InvalidInputError or >= 0)
bidCommitment(100000000n, -500000n, 1e6) = -49999999   (expected: InvalidInputError or >= 0)
RESULT: BUG — negative escrow commitment computed
```

## Impact

Invalid input produces a nonsense negative/zero escrow value instead of a clean `InvalidInputError`. Users discover the mistake only via an on-chain revert with wasted gas, and the pre-check reports a meaningless number. (BUY_YES with an over-range price over-reserves rather than going negative, so BUY_NO is the path where the SDK's own arithmetic is wrong, not merely imprecise.)

## Environment

- SDK version: 0.32.1 (npm)
- Network: N/A (pure unit-level repro, no chain interaction)
- Wallet: N/A
