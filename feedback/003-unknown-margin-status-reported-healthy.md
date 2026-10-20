# Unknown margin status is reported as "Healthy"

**Severity:** major
**Area:** SDK

## Steps to reproduce

The bug is latent against today's deployed MarginBank (which returns 0–3), so the smallest proof is a local mock. With `anvil` running:

1. Deploy a mock MarginBank whose `getMarginStatus(address)` returns `4` (any index outside the known 0–3 enum), implementing the other views `getMarginAccount`/`getAccountHealth` read.
2. Call `getMarginAccount(account, client)` / `getAccountHealth(account, client)` from `@somnia-chain/markets-sdk@0.32.1` pointed at the mock.
3. Observe `marginStatus === "Healthy"`.

Root cause in code (`src/perp/margin.ts:99` and `:213`):
```ts
export const MARGIN_STATUS: readonly MarginStatus[] = ["Healthy", "MarginCall", "PartialLiquidation", "CloseOut"];
// ...
marginStatus: MARGIN_STATUS[Number(statusRaw)] ?? "Healthy",
```
`MARGIN_STATUS[4]` is `undefined`, so the `?? "Healthy"` fallback labels an unrecognized on-chain state with the most reassuring label.

## Expected

An unrecognized on-chain enum value must surface as *unknown* — never as the safe default. This is the SDK's own documented doctrine elsewhere in the same codebase:
- `src/perp/stops.ts:380–396` (`decodeIntent`): "treating an unrecognized member as the default is a claim, not a decode… the else-branch of that ternary is the UNSAFE direction" → returns `null`.
- `src/perp/stops.ts:337`: `dropReason: … ?? null` ("must not be reported as one").
- `src/perp/history.ts:183–189` (`isLiquidationKind`): "the false branch is the honest 'a kind this version does not know' rather than a cast over it."

The consistent fix: widen the type with an `"Unknown"` member (or carry the raw index, e.g. `marginStatusRaw`), so callers can distinguish "bank said 4" from "bank said 0".

## Actual

`marginStatus` comes back `"Healthy"` for a status the SDK has never seen.

## Evidence

Code-level: the fallback is unconditional — any out-of-range index collapses to `"Healthy"`, and the type (`MarginStatus`, a closed 4-member union) makes the unknown state unrepresentable downstream. Anvil-mock verification per the steps above is the minimal live proof; the code path needs no live testnet interaction beyond the mock.

## Impact

`marginStatus` is the health indicator every perp UI/badge/monitoring bot reads (`getMarginAccount` is the hot read on every perp page; docs direct users to it for margin health). An account in an unrecognized state being shown "Healthy" suppresses exactly the actions the status exists to trigger (deposit, de-lever, close). It cannot fire today only because the deployed bank returns 0–3; it fires the moment the contract appends a member — a realistic event on a testnet iterating toward mainnet.

## Environment

- SDK version: 0.32.1 (npm)
- Network: local anvil mock (bug is latent against deployed contracts returning 0–3)
- Wallet: N/A
