import type { TokenMarket } from "../market/dexscreener";
import type { TrencherConfig } from "../config";

export type Action = "buy" | "skip";

export interface Signal {
  action: Action;
  /** 0..1 confidence score, used to rank candidates. */
  score: number;
  reason: string;
}

export interface Strategy {
  readonly name: string;
  evaluate(market: TokenMarket, config: TrencherConfig): Signal;
}
