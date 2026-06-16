import { Connection, PublicKey } from "@solana/web3.js";

import { loadConfig, type TrencherConfig } from "../config";
import { getConnection } from "../solana/connection";
import { Wallet } from "../solana/wallet";
import { WSOL_MINT, LAMPORTS_PER_SOL } from "../solana/tokens";
import {
  getQuote,
  buildSwapTransaction,
  executeSwap,
} from "../solana/jupiter";
import {
  searchSolana,
  getTokenMarket,
  type TokenMarket,
} from "../market/dexscreener";
import { Portfolio, type Position } from "./portfolio";
import { MomentumStrategy } from "../strategy/momentum";
import type { Strategy, Signal } from "../strategy/types";
import { logger } from "../utils/logger";
import {
  formatPct,
  formatUsd,
  shortAddress,
  sleep,
} from "../utils/format";

export interface Candidate {
  market: TokenMarket;
  signal: Signal;
}

export interface BuyResult {
  mint: string;
  symbol: string;
  sizeSol: number;
  signature?: string;
  dryRun: boolean;
}

export interface SellResult {
  mint: string;
  symbol: string;
  pnlPct: number;
  signature?: string;
  dryRun: boolean;
}

export class Trencher {
  readonly name = "Trencher";
  readonly config: TrencherConfig;
  readonly wallet: Wallet;
  readonly connection: Connection;
  private readonly portfolio: Portfolio;
  private readonly strategy: Strategy;

  constructor(config: TrencherConfig = loadConfig(), strategy: Strategy = new MomentumStrategy()) {
    this.config = config;
    this.connection = getConnection(config.rpcUrl);
    this.wallet = Wallet.fromConfig(config.walletPublicKey, config.walletPrivateKey);
    this.portfolio = new Portfolio();
    this.strategy = strategy;
  }

  /** Print a human-readable snapshot of the agent and its book. */
  async status(): Promise<void> {
    logger.banner(BANNER);
    logger.info(`Agent      : ${this.name} 🪖  (strategy: ${this.strategy.name})`);
    logger.info(`Wallet     : ${this.wallet.publicKey.toBase58()}`);
    logger.info(`Mode       : ${this.config.dryRun ? "DRY RUN (no real trades)" : "LIVE"}`);
    logger.info(`Can sign   : ${this.wallet.canSign ? "yes" : "no (read-only)"}`);
    logger.info(`RPC        : ${this.config.rpcUrl}`);

    try {
      const sol = await this.wallet.getSolBalance(this.connection);
      logger.info(`SOL balance: ${sol.toFixed(4)} SOL`);
    } catch (err) {
      logger.warn(`Could not fetch SOL balance: ${describe(err)}`);
    }

    const positions = this.portfolio.list();
    logger.info(
      `Exposure   : ${this.portfolio.totalExposureSol().toFixed(4)} / ` +
        `${this.config.maxSolExposure} SOL across ${positions.length} position(s)`,
    );
    for (const p of positions) {
      logger.info(
        `  • ${p.symbol} (${shortAddress(p.mint)}) ` +
          `entry ${formatUsd(p.entryPriceUsd)} · ${p.sizeSol} SOL`,
      );
    }
  }

  /** Discover and rank tradeable candidates for a search query. */
  async scan(query: string, limit = 10): Promise<Candidate[]> {
    logger.info(`Scanning the trenches for "${query}"…`);
    const markets = await searchSolana(query);

    const candidates: Candidate[] = markets
      .map((market) => ({ market, signal: this.strategy.evaluate(market, this.config) }))
      .filter((c) => c.signal.action === "buy")
      .sort((a, b) => b.signal.score - a.signal.score)
      .slice(0, limit);

    if (candidates.length === 0) {
      logger.warn(`No buy signals out of ${markets.length} pair(s) for "${query}".`);
    }
    for (const c of candidates) {
      logger.success(
        `${c.market.baseSymbol} (${shortAddress(c.market.baseMint)}) ` +
          `score ${(c.signal.score * 100).toFixed(0)} — ${c.signal.reason}`,
      );
    }
    return candidates;
  }

  /** Buy a token with SOL via Jupiter. Honors exposure cap and dry-run mode. */
  async buy(mint: string, sizeSol = this.config.tradeSizeSol): Promise<BuyResult> {
    new PublicKey(mint); // validate

    if (this.portfolio.has(mint)) {
      throw new Error(`Already holding ${shortAddress(mint)} — skipping duplicate buy.`);
    }
    const projected = this.portfolio.totalExposureSol() + sizeSol;
    if (projected > this.config.maxSolExposure) {
      throw new Error(
        `Exposure cap hit: ${projected.toFixed(4)} SOL > ${this.config.maxSolExposure} SOL.`,
      );
    }

    const market = await getTokenMarket(mint);
    const symbol = market?.baseSymbol ?? shortAddress(mint);
    const amountLamports = Math.floor(sizeSol * LAMPORTS_PER_SOL);

    logger.trade(`BUY ${symbol} for ${sizeSol} SOL (slippage ${this.config.slippageBps}bps)…`);
    const quote = await getQuote({
      inputMint: WSOL_MINT,
      outputMint: mint,
      amount: amountLamports,
      slippageBps: this.config.slippageBps,
    });
    logger.info(
      `Route: ${sizeSol} SOL → ${quote.outAmount} ${symbol} ` +
        `(price impact ${Number(quote.priceImpactPct).toFixed(2)}%)`,
    );

    const position: Position = {
      mint,
      symbol,
      entryPriceUsd: market?.priceUsd ?? 0,
      sizeSol,
      openedAt: Date.now(),
      dryRun: this.config.dryRun,
    };

    if (this.config.dryRun || !this.wallet.canSign) {
      logger.warn(`DRY RUN — not sending. ${this.wallet.canSign ? "" : "(no signer)"}`);
      this.portfolio.open(position);
      return { mint, symbol, sizeSol, dryRun: true };
    }

    const tx = await buildSwapTransaction(quote, this.wallet.publicKey.toBase58());
    const signature = await executeSwap(this.connection, tx, this.wallet.signer);
    position.signature = signature;
    this.portfolio.open(position);
    logger.success(`Bought ${symbol} — https://solscan.io/tx/${signature}`);
    return { mint, symbol, sizeSol, signature, dryRun: false };
  }

  /** Sell the full balance of a held token back to SOL. */
  async sell(mint: string): Promise<SellResult> {
    const position = this.portfolio.get(mint);
    const market = await getTokenMarket(mint);
    const symbol = position?.symbol ?? market?.baseSymbol ?? shortAddress(mint);

    const pnlPct =
      position && position.entryPriceUsd > 0 && market
        ? ((market.priceUsd - position.entryPriceUsd) / position.entryPriceUsd) * 100
        : 0;

    logger.trade(`SELL ${symbol} (PnL ${formatPct(pnlPct)})…`);

    if (this.config.dryRun || !this.wallet.canSign) {
      logger.warn("DRY RUN — not sending sell order.");
      this.portfolio.close(mint);
      return { mint, symbol, pnlPct, dryRun: true };
    }

    const tokenAmount = await this.getTokenBalanceRaw(mint);
    if (tokenAmount <= 0) {
      this.portfolio.close(mint);
      throw new Error(`No balance of ${symbol} to sell.`);
    }

    const quote = await getQuote({
      inputMint: mint,
      outputMint: WSOL_MINT,
      amount: tokenAmount,
      slippageBps: this.config.slippageBps,
    });
    const tx = await buildSwapTransaction(quote, this.wallet.publicKey.toBase58());
    const signature = await executeSwap(this.connection, tx, this.wallet.signer);
    this.portfolio.close(mint);
    logger.success(`Sold ${symbol} (PnL ${formatPct(pnlPct)}) — https://solscan.io/tx/${signature}`);
    return { mint, symbol, pnlPct, signature, dryRun: false };
  }

  /** Check open positions and exit any that hit take-profit or stop-loss. */
  async manage(): Promise<void> {
    const positions = this.portfolio.list();
    if (positions.length === 0) return;

    for (const pos of positions) {
      const market = await getTokenMarket(pos.mint);
      if (!market || pos.entryPriceUsd <= 0) continue;

      const pnlPct = ((market.priceUsd - pos.entryPriceUsd) / pos.entryPriceUsd) * 100;
      if (pnlPct >= this.config.takeProfitPct) {
        logger.success(`${pos.symbol} hit take-profit (${formatPct(pnlPct)}). Selling.`);
        await this.sell(pos.mint).catch((e) => logger.error(describe(e)));
      } else if (pnlPct <= -Math.abs(this.config.stopLossPct)) {
        logger.warn(`${pos.symbol} hit stop-loss (${formatPct(pnlPct)}). Selling.`);
        await this.sell(pos.mint).catch((e) => logger.error(describe(e)));
      } else {
        logger.info(`${pos.symbol}: ${formatPct(pnlPct)} (holding)`);
      }
    }
  }

  /**
   * Main loop: repeatedly scan for opportunities, buy the best candidates that
   * fit the budget, and manage open positions against TP/SL.
   */
  async run(query: string, opts: { intervalSec?: number; maxBuysPerCycle?: number } = {}): Promise<void> {
    const intervalSec = opts.intervalSec ?? 60;
    const maxBuys = opts.maxBuysPerCycle ?? 1;
    logger.banner(BANNER);
    logger.info(`${this.name} is live. Hunting "${query}" every ${intervalSec}s. Ctrl+C to stop.`);

    let stop = false;
    process.on("SIGINT", () => {
      logger.warn("Shutting down — positions are saved to .trencher/positions.json");
      stop = true;
    });

    while (!stop) {
      try {
        await this.manage();
        const candidates = await this.scan(query);
        let bought = 0;
        for (const c of candidates) {
          if (bought >= maxBuys) break;
          if (this.portfolio.has(c.market.baseMint)) continue;
          if (this.portfolio.totalExposureSol() + this.config.tradeSizeSol > this.config.maxSolExposure) {
            logger.warn("Exposure cap reached — not opening new positions.");
            break;
          }
          await this.buy(c.market.baseMint).then(() => bought++).catch((e) => logger.error(describe(e)));
        }
      } catch (err) {
        logger.error(`Cycle error: ${describe(err)}`);
      }
      if (stop) break;
      await sleep(intervalSec * 1000);
    }
  }

  private async getTokenBalanceRaw(mint: string): Promise<number> {
    const accounts = await this.connection.getParsedTokenAccountsByOwner(this.wallet.publicKey, {
      mint: new PublicKey(mint),
    });
    let total = 0;
    for (const { account } of accounts.value) {
      const amount = (account.data as any)?.parsed?.info?.tokenAmount?.amount;
      if (amount) total += Number(amount);
    }
    return total;
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const BANNER = `
╔══════════════════════════════════════════════╗
║   TRENCHER 🪖  — AI memecoin trader (Solana)   ║
╚══════════════════════════════════════════════╝`;
