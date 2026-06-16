import type { Strategy, Signal } from "./types";
import type { TokenMarket } from "../market/dexscreener";
import type { TrencherConfig } from "../config";

/**
 * MomentumStrategy — a sane, conservative default for the trenches.
 *
 * It hunts for tokens that are heating up (positive short-term momentum and
 * real volume) while filtering out the obvious rugs/illiquid traps. This is a
 * starting point, not financial advice: tune the thresholds to your risk.
 */
export class MomentumStrategy implements Strategy {
  readonly name = "momentum";

  // Risk guardrails.
  private readonly minLiquidityUsd = 15_000;
  private readonly minVolume24hUsd = 50_000;
  private readonly maxFdvUsd = 50_000_000;
  private readonly minAgeMinutes = 15;

  evaluate(market: TokenMarket, _config: TrencherConfig): Signal {
    const reasons: string[] = [];

    if (market.liquidityUsd < this.minLiquidityUsd) {
      return skip(`liquidity too low ($${Math.round(market.liquidityUsd)})`);
    }
    if (market.volume24h < this.minVolume24hUsd) {
      return skip(`24h volume too low ($${Math.round(market.volume24h)})`);
    }
    if (market.fdv > this.maxFdvUsd) {
      return skip(`FDV too high ($${Math.round(market.fdv)})`);
    }

    const ageMinutes = market.pairCreatedAt
      ? (Date.now() - market.pairCreatedAt) / 60_000
      : Number.POSITIVE_INFINITY;
    if (ageMinutes < this.minAgeMinutes) {
      return skip(`too fresh (${ageMinutes.toFixed(0)}m old) — avoiding snipe traps`);
    }

    // Momentum must be positive on the 5m and 1h windows.
    if (market.priceChange5m <= 0 || market.priceChange1h <= 0) {
      return skip(
        `no momentum (5m ${market.priceChange5m}% / 1h ${market.priceChange1h}%)`,
      );
    }

    reasons.push(`5m ${market.priceChange5m}%`, `1h ${market.priceChange1h}%`);

    // Build a bounded confidence score from momentum, volume and liquidity.
    const momentumScore = clamp01((market.priceChange5m + market.priceChange1h) / 100);
    const volumeScore = clamp01(market.volume24h / 1_000_000);
    const liqScore = clamp01(market.liquidityUsd / 250_000);
    const score = clamp01(0.5 * momentumScore + 0.3 * volumeScore + 0.2 * liqScore);

    return {
      action: "buy",
      score,
      reason: `momentum buy (${reasons.join(", ")}, vol $${Math.round(market.volume24h)})`,
    };
  }
}

function skip(reason: string): Signal {
  return { action: "skip", score: 0, reason };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
