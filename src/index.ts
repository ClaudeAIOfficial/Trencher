#!/usr/bin/env node
import { Command } from "commander";
import { Trencher } from "./agent/Trencher";
import { loadConfig } from "./config";
import { logger } from "./utils/logger";

function makeAgent(): Trencher {
  return new Trencher(loadConfig());
}

const program = new Command();

program
  .name("trencher")
  .description("Trencher 🪖 — an AI agent that trades Solana memecoins.")
  .version("0.1.0");

program
  .command("status")
  .description("Show wallet, balance, config and open positions.")
  .action(async () => {
    await makeAgent().status();
  });

program
  .command("scan")
  .description("Scan the trenches for buy signals matching a query.")
  .argument("<query>", "search term (symbol, name, or theme)")
  .option("-l, --limit <n>", "max candidates to show", "10")
  .action(async (query: string, opts: { limit: string }) => {
    await makeAgent().scan(query, Number(opts.limit));
  });

program
  .command("buy")
  .description("Buy a token by mint address using SOL.")
  .argument("<mint>", "token mint address")
  .option("-s, --size <sol>", "size in SOL (defaults to TRADE_SIZE_SOL)")
  .action(async (mint: string, opts: { size?: string }) => {
    const agent = makeAgent();
    await agent.buy(mint, opts.size ? Number(opts.size) : undefined);
  });

program
  .command("sell")
  .description("Sell the full balance of a held token back to SOL.")
  .argument("<mint>", "token mint address")
  .action(async (mint: string) => {
    await makeAgent().sell(mint);
  });

program
  .command("manage")
  .description("Run a single take-profit / stop-loss check on open positions.")
  .action(async () => {
    await makeAgent().manage();
  });

program
  .command("run")
  .description("Run the autonomous trading loop.")
  .argument("<query>", "what to hunt for (e.g. 'SOL', 'dog', 'AI')")
  .option("-i, --interval <sec>", "seconds between cycles", "60")
  .option("-m, --max-buys <n>", "max new buys per cycle", "1")
  .action(async (query: string, opts: { interval: string; maxBuys: string }) => {
    await makeAgent().run(query, {
      intervalSec: Number(opts.interval),
      maxBuysPerCycle: Number(opts.maxBuys),
    });
  });

program.parseAsync(process.argv).catch((err) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
