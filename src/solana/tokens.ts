/* Well-known mints used as quote/base assets. */

export const WSOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const LAMPORTS_PER_SOL = 1_000_000_000;

export interface TokenRef {
  mint: string;
  symbol?: string;
  decimals?: number;
}

export function isSol(mint: string): boolean {
  return mint === WSOL_MINT;
}
