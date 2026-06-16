import { Connection } from "@solana/web3.js";

let cached: Connection | undefined;

export function getConnection(rpcUrl: string): Connection {
  if (!cached) {
    cached = new Connection(rpcUrl, "confirmed");
  }
  return cached;
}
