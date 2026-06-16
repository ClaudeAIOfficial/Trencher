/**
 * Market-data client backed by the public DexScreener API. Used to discover
 * trending memecoins and to read live price/liquidity/volume for risk checks.
 */

const BASE = "https://api.dexscreener.com";

export interface TokenMarket {
  chainId: string;
  pairAddress: string;
  baseMint: string;
  baseSymbol: string;
  baseName: string;
  priceUsd: number;
  priceNative: number;
  liquidityUsd: number;
  fdv: number;
  volume24h: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange24h: number;
  pairCreatedAt: number;
  url: string;
}

interface RawPair {
  chainId: string;
  pairAddress: string;
  url?: string;
  baseToken: { address: string; name?: string; symbol?: string };
  priceUsd?: string;
  priceNative?: string;
  liquidity?: { usd?: number };
  fdv?: number;
  volume?: { h24?: number };
  priceChange?: { m5?: number; h1?: number; h24?: number };
  pairCreatedAt?: number;
}

function toMarket(p: RawPair): TokenMarket {
  return {
    chainId: p.chainId,
    pairAddress: p.pairAddress,
    baseMint: p.baseToken.address,
    baseSymbol: p.baseToken.symbol ?? "?",
    baseName: p.baseToken.name ?? "Unknown",
    priceUsd: Number(p.priceUsd ?? 0),
    priceNative: Number(p.priceNative ?? 0),
    liquidityUsd: p.liquidity?.usd ?? 0,
    fdv: p.fdv ?? 0,
    volume24h: p.volume?.h24 ?? 0,
    priceChange5m: p.priceChange?.m5 ?? 0,
    priceChange1h: p.priceChange?.h1 ?? 0,
    priceChange24h: p.priceChange?.h24 ?? 0,
    pairCreatedAt: p.pairCreatedAt ?? 0,
    url: p.url ?? "",
  };
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`DexScreener ${res.status} ${res.statusText} for ${path}`);
  }
  return (await res.json()) as T;
}

/** Search Solana pairs by a free-text query (symbol, name, mint, etc.). */
export async function searchSolana(query: string): Promise<TokenMarket[]> {
  const data = await getJson<{ pairs?: RawPair[] }>(
    `/latest/dex/search?q=${encodeURIComponent(query)}`,
  );
  return (data.pairs ?? [])
    .filter((p) => p.chainId === "solana")
    .map(toMarket);
}

/** Look up the best (most liquid) Solana pair for a specific mint address. */
export async function getTokenMarket(mint: string): Promise<TokenMarket | undefined> {
  const data = await getJson<{ pairs?: RawPair[] }>(`/latest/dex/tokens/${mint}`);
  const pairs = (data.pairs ?? []).filter((p) => p.chainId === "solana").map(toMarket);
  if (pairs.length === 0) return undefined;
  return pairs.sort((a, b) => b.liquidityUsd - a.liquidityUsd)[0];
}
