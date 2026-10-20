# dreamDEX Perps Builder Bounty — Feedback Track Submission

Feedback reports for `@somnia-chain/markets-sdk` v0.32.1 (Somnia Markets SDK),
submitted to the dreamDEX Perps Builder Bounty (DoraHacks) Feedback track.

Reports live in `feedback/` (one file per issue, program format).
Runnable repro scripts for the unit-level findings live in `repro/`
(run with `node`, after installing the SDK + peer deps `viem`).
A live read-only example that uses the SDK against the Somnia Tokyo testnet
(Hideki) lives in `examples/` — it lists the tradeable perp pools from the
PerpPoolFactory and reads live mark/index/funding state via the SDK client:

    npm install @somnia-chain/markets-sdk viem ws https-proxy-agent
    node examples/read-live-perp-state.mjs
    # chain: Hideki Testnet (id 50383) — tradeable perp pools: 21 (at time of writing)

- `feedback/001-precision-from-step-undercounts-decimals.md` — normal — repro: `repro/precision-from-step.mjs`
- `feedback/002-buy-no-negative-escrow-commitment.md` — normal — repro: `repro/buy-no-negative-escrow.mjs`
- `feedback/003-unknown-margin-status-reported-healthy.md` — major — anvil mock steps in report
- `feedback/004-unknown-closing-state-reported-open.md` — major — anvil mock steps in report
- `feedback/005-unknown-orderkind-reported-buy-yes.md` — major — repro: `repro/side-of-kind.mjs`
