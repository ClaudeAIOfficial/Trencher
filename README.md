# Trencher 🪖

**The first AI Memecoin trader coded with Cursor.**

Trencher is an autonomous agent that trades Solana memecoins. It hunts for
opportunities with a momentum strategy, routes swaps through the
[Jupiter](https://jup.ag) aggregator for best execution, reads live market data
from [DexScreener](https://dexscreener.com), and manages risk with
take-profit / stop-loss and a hard exposure cap.

It ships in **dry-run mode by default** — it will never send a real transaction
until you give it a private key *and* explicitly turn dry-run off.

## Wallet

Trencher's default wallet:

```
7Q67jA54qLFVaDyZDUGYRXbFyc6w2qE9MvgSwaXSV2hK
```

The public key is enough for read-only operation (balances, portfolio, scanning,
and simulated trades). To let Trencher actually sign and send swaps, supply the
matching private key via `WALLET_PRIVATE_KEY` and set `DRY_RUN=false`.

## Quick start

```bash
npm install
cp .env.example .env      # then edit .env
npm run build

# Read-only: wallet + config + open positions
npm run trencher -- status

# Hunt for buy signals
npm run trencher -- scan dog --limit 5

# Simulated buy / sell (dry-run uses real Jupiter quotes, sends nothing)
npm run trencher -- buy <MINT> --size 0.05
npm run trencher -- sell <MINT>

# Autonomous loop: scan → buy best fit → manage TP/SL
npm run trencher -- run dog --interval 60 --max-buys 1
```

> During development you can skip the build step and run directly with
> `npm run dev -- <command>` (uses `ts-node`).

## Commands

| Command            | Description                                                |
| ------------------ | --------------------------------------------------------- |
| `status`           | Wallet, balance, config, and open positions               |
| `scan <query>`     | Rank tradeable candidates matching a query                |
| `buy <mint>`       | Buy a token with SOL via Jupiter (`--size <sol>`)         |
| `sell <mint>`      | Sell the full balance of a held token back to SOL         |
| `manage`           | One-shot take-profit / stop-loss check on open positions  |
| `run <query>`      | Autonomous trading loop (`--interval`, `--max-buys`)      |

## Configuration

All settings live in `.env` (see `.env.example`):

| Variable             | Default                                | Purpose                                  |
| -------------------- | -------------------------------------- | ---------------------------------------- |
| `SOLANA_RPC_URL`     | mainnet-beta public RPC                | Solana RPC endpoint (use a private one)  |
| `WALLET_PUBLIC_KEY`  | the wallet above                       | Wallet to monitor / trade from           |
| `WALLET_PRIVATE_KEY` | *(empty)*                              | Required only to sign real trades        |
| `TRADE_SIZE_SOL`     | `0.05`                                 | Default buy size per trade               |
| `SLIPPAGE_BPS`       | `100`                                  | Max slippage (100 = 1%)                  |
| `TAKE_PROFIT_PCT`    | `50`                                   | Auto-sell when a position is up this %   |
| `STOP_LOSS_PCT`      | `25`                                   | Auto-sell when a position is down this % |
| `MAX_SOL_EXPOSURE`   | `0.5`                                  | Hard cap on total deployed SOL           |
| `DRY_RUN`            | `true`                                 | Simulate everything; send nothing        |
| `JUPITER_API_URL`    | `https://lite-api.jup.ag/swap/v1`      | Jupiter swap API base                    |

`WALLET_PRIVATE_KEY` accepts either a base58 string (Phantom "Export Private
Key") or a JSON byte array (`solana-keygen` format).

## How it works

```
DexScreener ──▶ MomentumStrategy ──▶ candidates
                                        │
Trencher loop ── manage TP/SL ◀── Portfolio (.trencher/positions.json)
     │
     └─▶ buy/sell ──▶ Jupiter quote ──▶ build tx ──▶ sign ──▶ send (Solana)
```

- **Strategy** (`src/strategy/momentum.ts`): filters out illiquid / low-volume /
  too-fresh / oversized tokens and scores positive short-term momentum. Tune the
  thresholds or drop in your own `Strategy` implementation.
- **Risk**: every buy checks the exposure cap; `manage`/`run` enforce
  take-profit and stop-loss against live DexScreener prices.
- **Persistence**: the open-positions book is saved to `.trencher/positions.json`
  so the agent survives restarts.

## Project layout

```
src/
  index.ts             CLI entrypoint (commander)
  config.ts            env-driven configuration
  agent/
    Trencher.ts        the agent: status/scan/buy/sell/manage/run
    portfolio.ts       open-positions tracking + persistence
  solana/
    connection.ts      RPC connection
    wallet.ts          keypair / read-only wallet handling
    jupiter.ts         Jupiter quote + swap client
    tokens.ts          well-known mints (WSOL, USDC)
  market/
    dexscreener.ts     market-data client
  strategy/
    types.ts           Strategy / Signal interfaces
    momentum.ts        default momentum strategy
  utils/               logger + formatting helpers
```

## Disclaimer

Memecoin trading is extremely high risk. Trencher is provided **as-is, for
educational purposes**, and is not financial advice. You are solely responsible
for any funds you let it manage. Start in dry-run, use a burner wallet, and only
risk what you can afford to lose.
