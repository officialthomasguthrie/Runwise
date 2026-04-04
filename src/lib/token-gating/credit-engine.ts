/**
 * Token → daily credits: rate from holdings, hard daily cap from env.
 * Claims use a UTC calendar-day allowance (not linear time accrual).
 */

import { TOKEN_DECIMALS } from '@/lib/solana/token-balance';

function parseEnvInt(key: string, fallback: string): number {
  const v = process.env[key] ?? fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : parseInt(fallback, 10);
}

export function getCreditConfig() {
  return {
    tokenToCreditRatio: parseEnvInt('TOKEN_TO_CREDIT_RATIO', '120000'),
    dailyCreditCap: parseEnvInt('DAILY_CREDIT_CAP', '200'),
    minTokenThreshold: parseEnvInt('MIN_TOKEN_THRESHOLD', '1000000'),
  };
}

export function getCreditsPerDay(rawBalance: bigint): number {
  const { tokenToCreditRatio, dailyCreditCap } = getCreditConfig();
  if (rawBalance < getMinimumTokenThresholdRaw()) return 0;

  const divisor = BigInt(10 ** TOKEN_DECIMALS);
  const displayWhole = rawBalance / divisor;
  const displayNum = Number(displayWhole);
  if (!Number.isFinite(displayNum)) return 0;

  const credits = Math.floor(displayNum / tokenToCreditRatio);
  return Math.min(Math.max(0, credits), dailyCreditCap);
}

/** Start (inclusive) and end (exclusive) of the UTC calendar day containing `now`, as ISO strings. */
export function getUtcDayBoundsIso(now: Date): { startIso: string; endIso: string } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** ISO timestamp when the current UTC day ends (next midnight UTC). */
export function getNextUtcMidnightIso(now: Date): string {
  return getUtcDayBoundsIso(now).endIso;
}

/** Whole credits still claimable today given today's running total. */
export function getClaimableToday(creditsPerDay: number, alreadyClaimedToday: number): number {
  if (creditsPerDay <= 0) return 0;
  return Math.max(0, creditsPerDay - Math.max(0, alreadyClaimedToday));
}

export function getMinimumTokenThresholdRaw(): bigint {
  const { minTokenThreshold } = getCreditConfig();
  return BigInt(minTokenThreshold) * BigInt(10 ** TOKEN_DECIMALS);
}
