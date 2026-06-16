import * as dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";

dotenv.config();

/** Default wallet shipped with Trencher. Override via WALLET_PUBLIC_KEY. */
export const DEFAULT_WALLET = "7Q67jA54qLFVaDyZDUGYRXbFyc6w2qE9MvgSwaXSV2hK";

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

export interface TrencherConfig {
  rpcUrl: string;
  walletPublicKey: string;
  walletPrivateKey: string | undefined;
  tradeSizeSol: number;
  slippageBps: number;
  takeProfitPct: number;
  stopLossPct: number;
  maxSolExposure: number;
  dryRun: boolean;
}

export function loadConfig(): TrencherConfig {
  const walletPublicKey = process.env.WALLET_PUBLIC_KEY?.trim() || DEFAULT_WALLET;

  // Fail fast on an obviously malformed public key.
  try {
    new PublicKey(walletPublicKey);
  } catch {
    throw new Error(`Invalid WALLET_PUBLIC_KEY: "${walletPublicKey}"`);
  }

  const privateKey = process.env.WALLET_PRIVATE_KEY?.trim();

  return {
    rpcUrl: process.env.SOLANA_RPC_URL?.trim() || "https://api.mainnet-beta.solana.com",
    walletPublicKey,
    walletPrivateKey: privateKey ? privateKey : undefined,
    tradeSizeSol: num("TRADE_SIZE_SOL", 0.05),
    slippageBps: num("SLIPPAGE_BPS", 100),
    takeProfitPct: num("TAKE_PROFIT_PCT", 50),
    stopLossPct: num("STOP_LOSS_PCT", 25),
    maxSolExposure: num("MAX_SOL_EXPOSURE", 0.5),
    // If a private key is present we still default to DRY_RUN unless explicitly disabled.
    dryRun: bool("DRY_RUN", true),
  };
}
