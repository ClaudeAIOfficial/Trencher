import {
  Connection,
  Keypair,
  VersionedTransaction,
} from "@solana/web3.js";

/**
 * Thin client over the Jupiter aggregator API — the standard way to route
 * memecoin swaps on Solana for best execution across every DEX/AMM.
 */

// Jupiter's free "lite" host. Use https://api.jup.ag/swap/v1 with an API key
// for higher rate limits, overridable via JUPITER_API_URL.
const DEFAULT_API = process.env.JUPITER_API_URL?.trim() || "https://lite-api.jup.ag/swap/v1";

export interface QuoteParams {
  inputMint: string;
  outputMint: string;
  /** Amount of the input token in its smallest unit (e.g. lamports for SOL). */
  amount: number;
  slippageBps: number;
}

export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  priceImpactPct: string;
  routePlan: unknown[];
  [key: string]: unknown;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Jupiter API ${res.status} ${res.statusText}: ${body}`);
  }
  return (await res.json()) as T;
}

export async function getQuote(params: QuoteParams): Promise<JupiterQuote> {
  const url = new URL(`${DEFAULT_API}/quote`);
  url.searchParams.set("inputMint", params.inputMint);
  url.searchParams.set("outputMint", params.outputMint);
  url.searchParams.set("amount", String(Math.floor(params.amount)));
  url.searchParams.set("slippageBps", String(params.slippageBps));
  url.searchParams.set("onlyDirectRoutes", "false");

  const res = await fetch(url.toString());
  return asJson<JupiterQuote>(res);
}

interface SwapResponse {
  swapTransaction: string;
  lastValidBlockHeight?: number;
}

/** Ask Jupiter to build a signable swap transaction for a given quote. */
export async function buildSwapTransaction(
  quote: JupiterQuote,
  userPublicKey: string,
): Promise<VersionedTransaction> {
  const res = await fetch(`${DEFAULT_API}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });

  const { swapTransaction } = await asJson<SwapResponse>(res);
  const buf = Buffer.from(swapTransaction, "base64");
  return VersionedTransaction.deserialize(buf);
}

/** Sign, send and confirm a swap transaction. Returns the signature. */
export async function executeSwap(
  connection: Connection,
  tx: VersionedTransaction,
  signer: Keypair,
): Promise<string> {
  tx.sign([signer]);
  const signature = await connection.sendTransaction(tx, {
    maxRetries: 3,
    skipPreflight: false,
  });

  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      signature,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    },
    "confirmed",
  );
  return signature;
}
