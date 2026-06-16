import * as fs from "fs";
import * as path from "path";

export interface Position {
  mint: string;
  symbol: string;
  /** Entry price in USD at the time of the buy. */
  entryPriceUsd: number;
  /** SOL spent acquiring this position. */
  sizeSol: number;
  openedAt: number;
  signature?: string;
  dryRun: boolean;
}

/**
 * Tracks open positions and total SOL exposure. Persists to a JSON file so the
 * agent can be stopped and resumed without losing its book.
 */
export class Portfolio {
  private positions = new Map<string, Position>();
  private readonly file: string;

  constructor(file = path.join(process.cwd(), ".trencher", "positions.json")) {
    this.file = file;
    this.load();
  }

  list(): Position[] {
    return [...this.positions.values()];
  }

  has(mint: string): boolean {
    return this.positions.has(mint);
  }

  get(mint: string): Position | undefined {
    return this.positions.get(mint);
  }

  totalExposureSol(): number {
    return this.list().reduce((sum, p) => sum + p.sizeSol, 0);
  }

  open(position: Position): void {
    this.positions.set(position.mint, position);
    this.save();
  }

  close(mint: string): Position | undefined {
    const pos = this.positions.get(mint);
    if (pos) {
      this.positions.delete(mint);
      this.save();
    }
    return pos;
  }

  private load(): void {
    try {
      if (fs.existsSync(this.file)) {
        const raw = fs.readFileSync(this.file, "utf8");
        const data = JSON.parse(raw) as Position[];
        for (const p of data) this.positions.set(p.mint, p);
      }
    } catch {
      // Corrupt or missing file — start with an empty book.
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.list(), null, 2));
    } catch {
      // Persistence is best-effort; never crash the agent over it.
    }
  }
}
