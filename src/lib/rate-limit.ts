interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;

export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests. Please try again shortly.");
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const getClientId = (headers: Headers): string => {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "anonymous";
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "anonymous";
};

export const assertWithinRateLimit = (clientId: string): void => {
  const now = Date.now();
  const bucket = buckets.get(clientId);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(clientId, {
      count: 1,
      resetAt: now + WINDOW_MS
    });
    return;
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    throw new RateLimitError(Math.max(retryAfterSeconds, 1));
  }

  bucket.count += 1;
  buckets.set(clientId, bucket);
};
