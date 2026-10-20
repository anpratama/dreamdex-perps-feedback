// Live read-only example: use @somnia-chain/markets-sdk against the Somnia
// Tokyo testnet (Hideki, chainId 50383). No wallet, no transactions — this
// script only reads on-chain state through the SDK client.
//
// Run:
//   npm install @somnia-chain/markets-sdk viem
//   node examples/read-live-perp-state.mjs
import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";

// The SDK's chain reads run over a WebSocket transport. Behind an HTTP(S)
// proxy (e.g. corporate networks), hand it a WebSocket constructor that
// routes through the proxy; with no proxy env set, the default is used.
let rpcWebSocketConstructor;
const proxy = process.env.https_proxy ?? process.env.HTTPS_PROXY;
if (proxy) {
  const { default: WebSocket } = await import("ws");
  const { HttpsProxyAgent } = await import("https-proxy-agent");
  const agent = new HttpsProxyAgent(proxy);
  rpcWebSocketConstructor = class extends WebSocket {
    constructor(url, protocols, options) {
      super(url, protocols, { ...(options ?? {}), agent });
    }
  };
  await new Promise((resolve) => {
    const warm = new rpcWebSocketConstructor("wss://api.hideki2.infra.testnet.somnia.network/ws");
    warm.addEventListener("open", () => { warm.close(); resolve(); });
    warm.addEventListener("error", () => resolve());
    setTimeout(resolve, 20000);
  });
}

const exchange = new SomniaMarkets({
  chain: hidekiTestnet,
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  ...(rpcWebSocketConstructor ? { rpcWebSocketConstructor } : {}),
});
const client = exchange.client; // raw engine: bigint-exact, address-keyed

const factory = SOMNIA_HIDEKI_TESTNET_ADDRESSES.perpPoolFactory;
console.log(`chain: ${hidekiTestnet.name} (id ${hidekiTestnet.id})`);
console.log(`perpPoolFactory: ${factory}`);

const pools = await client.listTradeablePerpPools({ factory });
console.log(`tradeable perp pools: ${pools.length}`);

for (const pool of pools.slice(0, 3)) {
  const s = await client.getPerpState(pool);
  console.log(`pool ${pool}`);
  console.log(`  markPrice=${s.markPrice} markPriceOk=${s.markPriceOk}`);
  console.log(`  indexPrice=${s.indexPrice} fundingRate=${s.fundingRate}`);
  console.log(`  openInterest=${s.openInterest ?? s.totalOpenInterest ?? "n/a"}`);
}
console.log("done");
