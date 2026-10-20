# Unknown binary OrderKind is reported as "BUY_YES"

**Severity:** major
**Area:** SDK

## Steps to reproduce

Pure-function proof, no chain needed — against `@somnia-chain/markets-sdk@0.32.1`:

```js
import { sideOfKind } from '@somnia-chain/markets-sdk';

sideOfKind(0);   // "BUY_YES" — correct
sideOfKind(3);   // "SELL_NO" — correct
sideOfKind(4);   // "BUY_YES" — BUG: unknown kind folded into a concrete side
sideOfKind(99);  // "BUY_YES" — BUG
sideOfKind(-1);  // "BUY_YES" — BUG
```

Root cause in code (`src/store.ts:541–553`):
```ts
export const ORDER_KIND_SIDE: readonly BinarySide[] = ["BUY_YES", "SELL_YES", "BUY_NO", "SELL_NO"];

export function sideOfKind(kind: number | bigint): BinarySide {
  return ORDER_KIND_SIDE[Number(kind)] ?? "BUY_YES";
}
```
`ORDER_KIND_SIDE[4]` is `undefined`, so the `?? "BUY_YES"` fallback silently labels an unrecognized on-chain `OrderKind` as BUY_YES.

## Expected

An unrecognized on-chain enum value must surface as *unknown* — never as a concrete side. This is the SDK's own documented doctrine elsewhere in the same codebase:
- `src/perp/stops.ts:380–396` (`decodeIntent`): "treating an unrecognized member as the default is a claim, not a decode… the else-branch of that ternary is the UNSAFE direction" → returns `null`.
- `src/perp/history.ts:183–189` (`isLiquidationKind`): "the false branch is the honest 'a kind this version does not know' rather than a cast over it."

The consistent fix: return an `"Unknown"` side (or throw / carry the raw kind index), so downstream code can tell "pool said 4" apart from "pool said 0".

## Actual

Any out-of-range `OrderKind` index is decoded as `BUY_YES`.

## Evidence

Code-level: the fallback is unconditional — any out-of-range index collapses to `"BUY_YES"`, and the return type (`BinarySide`, a closed 4-member union) makes the unknown state unrepresentable downstream. Direct node evaluation of the published dist build confirms: `sideOfKind(4)`, `sideOfKind(99)`, `sideOfKind(-1)` all return `"BUY_YES"` (see `repro/side-of-kind.mjs`).

## Impact

`sideOfKind` is documented as "the ONLY authoritative side-attribution source" for binary orders — v2 no longer encodes the side in `userData`, so the pool's `BinaryOrderPlaced(orderId, kind)` event is all the SDK has. `onBinaryOrderPlaced` (`src/reducer.ts:241`) writes the folded value into the live order row's `side` (or the pending-kinds bridge). From there it corrupts:

- **Fill classification** (`src/store.ts:1661`): `kind: f.kind ?? (makerSide && takerSide ? fillKind(takerSide, makerSide) : undefined)` — the folded side feeds `fillKind`, which decides DIRECT_YES/DIRECT_NO vs mint/burn — settlement-extraction semantics with payout stakes.
- **Outcome attribution** (`src/unified/exchange.ts:4199`): `o.side === "BUY_YES" || o.side === "SELL_YES" ? "YES" : "NO"` — an order of unknown kind is attributed to the YES outcome, misstating PnL attribution for every consumer of the unified order/fill views.

It cannot fire today only because the deployed pools emit kinds 0–3; it fires the moment the pool contract appends an `OrderKind` member — a realistic event on a testnet iterating toward mainnet, and the same latent-but-real class as the unknown-margin-status and unknown-closing-state findings.

## Environment

- SDK version: 0.32.1 (npm)
- Network: N/A (pure function)
- Wallet: N/A
