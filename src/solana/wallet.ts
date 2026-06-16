import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { LAMPORTS_PER_SOL } from "./tokens";

/**
 * Trencher's wallet. Always knows its public key; only holds a signer when a
 * private key was supplied. Without a signer the agent is read-only.
 */
export class Wallet {
  readonly publicKey: PublicKey;
  private readonly keypair: Keypair | undefined;

  private constructor(publicKey: PublicKey, keypair?: Keypair) {
    this.publicKey = publicKey;
    this.keypair = keypair;
  }

  static fromConfig(publicKey: string, privateKey?: string): Wallet {
    const pk = new PublicKey(publicKey);
    if (!privateKey) {
      return new Wallet(pk);
    }

    const keypair = parseKeypair(privateKey);
    if (!keypair.publicKey.equals(pk)) {
      throw new Error(
        `WALLET_PRIVATE_KEY does not match WALLET_PUBLIC_KEY ` +
          `(${keypair.publicKey.toBase58()} vs ${pk.toBase58()})`,
      );
    }
    return new Wallet(pk, keypair);
  }

  get canSign(): boolean {
    return this.keypair !== undefined;
  }

  get signer(): Keypair {
    if (!this.keypair) {
      throw new Error("No private key loaded — cannot sign transactions.");
    }
    return this.keypair;
  }

  /** Native SOL balance in lamports. */
  async getLamports(connection: Connection): Promise<number> {
    return connection.getBalance(this.publicKey);
  }

  async getSolBalance(connection: Connection): Promise<number> {
    const lamports = await this.getLamports(connection);
    return lamports / LAMPORTS_PER_SOL;
  }
}

/** Accepts either a base58 secret key (Phantom export) or a JSON byte array. */
function parseKeypair(secret: string): Keypair {
  const trimmed = secret.trim();
  if (trimmed.startsWith("[")) {
    const bytes = Uint8Array.from(JSON.parse(trimmed) as number[]);
    return Keypair.fromSecretKey(bytes);
  }
  return Keypair.fromSecretKey(bs58.decode(trimmed));
}
