# Unknown closing-price capture state is reported as "OPEN"

**Severity:** major
**Area:** SDK

## Steps to reproduce

The bug is latent against today's deployed pools (which return state 0–3), so the smallest proof is a local mock. With `anvil` running:

1. Deploy a minimal contract implementing `closingPrice()` returning `(closingMid, oneCollateral, 4)` — state index 4, i.e. a capture/terminal state the SDK does not know.
2. Call `getClosingPrice(pool, client)` from `@somnia-chain/markets-sdk@0.32.1`.
3. Observe `state === "OPEN"`.

Root cause in code (`src/orders.ts:796`):
```ts
const CLOSE_STATES = ["OPEN", "CAPTURED", "CAPTURED_DEGENERATE", "TERMINAL_LATCH"] as const;
// ...
return { closingMid, oneCollateral, state: CLOSE_STATES[state] ?? "OPEN" };
```
`CLOSE_STATES[4]` is `undefined`, so the fallback reports `"OPEN"`.

## Expected

Per the function's own docblock (`src/orders.ts:751–761`), `"OPEN"` means "no capture yet — post-expiry removals of alive-at-close orders revert `CloseNotCaptured` while the market is not terminal." An unknown state must surface as unknown (or carry the raw index) — the one case where the honest answer matters most is the case the code answers `"OPEN"` to. This matches the SDK's own decode doctrine elsewhere (`src/perp/stops.ts:380–396`: "treating an unrecognized member as the default is a claim, not a decode… the else-branch of that ternary is the UNSAFE direction").

## Actual

`getClosingPrice` reports `state: "OPEN"` for a capture state it has never seen.

## Evidence

Code-level: the `?? "OPEN"` fallback is unconditional. The function's own *Gotchas* (`src/orders.ts`, above `getClosingPrice`) warns that misreading this surface has payout stakes — a `CLOB_SNAPSHOT` void would "pay the uniform half-refund instead of the captured mid" — and this fallback feeds exactly the `captureClose`/void payout branches that read `ClosingPriceState.state`. Anvil-mock verification per the steps above is the minimal live proof.

## Impact

`getClosingPrice` is a public client method and feeds `Trader.captureClose` and the void-settlement path, where the state's reading decides payout branches. Reporting an unrecognized terminal/capture state as "OPEN" makes a captured-or-terminal market indistinguishable from a live uncaptured one — the wrong direction for the state that gates settlement money.

## Environment

- SDK version: 0.32.1 (npm)
- Network: local anvil mock (bug is latent against deployed pools returning 0–3)
- Wallet: N/A
