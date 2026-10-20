# `precisionFromStep` undercounts decimal places for non-power-of-10 step sizes

**Severity:** normal
**Area:** SDK

## Steps to reproduce

1. Install `@somnia-chain/markets-sdk@0.32.1` and its peer deps (`viem`).
2. Run:
   ```js
   import { precisionFromStep } from '@somnia-chain/markets-sdk/dist/unified/structs.js';
   console.log(precisionFromStep("250", 6));  // -> 4
   console.log(precisionFromStep("125", 6));  // -> 4
   console.log(precisionFromStep("15", 6));   // -> 5
   console.log(precisionFromStep("1000", 6)); // -> 3
   ```
   (Standalone repro script: `repro/precision-from-step.mjs` in the submission repo.)

## Expected

Per the function's docblock — "Decimal places implied by a raw step size (tick/lot) at `decimals` scale" — the answer is the smallest `d` such that every multiple of the step is representable in `d` decimals, i.e. `d = decimals − trailingDecimalZeros(step)`:
- step 250 @ 6dp → **5** (multiples end in …25×10⁻⁶)
- step 125 @ 6dp → **6**
- step 15 @ 6dp → **6**
- step 1000 @ 6dp → 3 (correct)

## Actual

`src/unified/structs.ts:865-872` computes `Math.ceil(-Math.log10(step / 10 ** decimals))`, which equals the true required places only when the step is a power of 10. For non-power-of-10 steps it returns 1–2 places too few:
- step 250 @ 6dp → **4** (wrong, expected 5)
- step 125 @ 6dp → **4** (wrong, expected 6)
- step 15 @ 6dp → **5** (wrong, expected 6)

## Evidence

Actual run output against the published package:
```
precisionFromStep("250", 6) = 4  expected 5  BUG
precisionFromStep("125", 6) = 4  expected 6  BUG
precisionFromStep("15", 6) = 5  expected 6  BUG
precisionFromStep("1000", 6) = 3  expected 3  OK
precisionFromStep("500", 6) = 4  expected 4  OK
precisionFromStep("100", 6) = 4  expected 4  OK
precisionFromStep("10", 6) = 5  expected 5  OK
precisionFromStep("1", 6) = 6  expected 6  OK
```

## Impact

`precisionFromStep` feeds the ccxt-facing `market.precision.price/amount` metadata (`src/unified/exchange.ts`, used at the `market.precision` construction sites). External tooling formatting prices against that metadata will chop the last digit(s) off grid prices for any venue whose tick/lot is not a power of 10, producing values that are not on the tick grid. (Checked: the SDK's own write path is unaffected — `priceToPrecision`/`amountToPrecision` use raw steps + bigint `snapToGrid` — so this is metadata-level.)

## Environment

- SDK version: 0.32.1 (npm)
- Network: N/A (pure unit-level repro, no chain interaction)
- Wallet: N/A
