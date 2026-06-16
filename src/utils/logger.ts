/* Minimal, dependency-free colored logger. */

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

type Color = keyof typeof COLORS;

function paint(text: string, color: Color): string {
  if (process.env.NO_COLOR) return text;
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function stamp(): string {
  return paint(new Date().toISOString(), "gray");
}

export const logger = {
  info(msg: string, ...rest: unknown[]): void {
    console.log(`${stamp()} ${paint("•", "cyan")} ${msg}`, ...rest);
  },
  success(msg: string, ...rest: unknown[]): void {
    console.log(`${stamp()} ${paint("✓", "green")} ${msg}`, ...rest);
  },
  warn(msg: string, ...rest: unknown[]): void {
    console.warn(`${stamp()} ${paint("!", "yellow")} ${msg}`, ...rest);
  },
  error(msg: string, ...rest: unknown[]): void {
    console.error(`${stamp()} ${paint("✗", "red")} ${msg}`, ...rest);
  },
  trade(msg: string, ...rest: unknown[]): void {
    console.log(`${stamp()} ${paint("⇄", "magenta")} ${msg}`, ...rest);
  },
  banner(msg: string): void {
    console.log(paint(msg, "magenta"));
  },
};

export { paint };
