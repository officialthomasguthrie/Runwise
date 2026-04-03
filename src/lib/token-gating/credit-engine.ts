/**
 * Linear token → daily credits accrual (single source of truth, no tiers).
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
    maxAccrualDays: parseEnvInt('MAX_ACCRUAL_DAYS', '3'),
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

export function getMaxUnclaimed(creditsPerDay: number): number {
  const { maxAccrualDays } = getCreditConfig();
  return creditsPerDay * maxAccrualDays;
}

export function calculateAccruedCredits(
  rawBalance: bigint,
  accrualStartAt: Date,
  now: Date,
): {
  accrued: number;
  creditsPerDay: number;
  hoursElapsed: number;
  daysElapsed: number;
  cappedAt: string | null;
} {
  const { maxAccrualDays } = getCreditConfig();
  const creditsPerDay = getCreditsPerDay(rawBalance);

  const ms = now.getTime() - accrualStartAt.getTime();
  const hoursElapsed = Math.max(0, ms / 3600000);
  const daysElapsed = hoursElapsed / 24;

  if (creditsPerDay === 0) {
    return {
      accrued: 0,
      creditsPerDay: 0,
      hoursElapsed,
      daysElapsed,
      cappedAt: null,
    };
  }

  const effectiveDays = Math.min(daysElapsed, maxAccrualDays);
  const rawAccrued = creditsPerDay * effectiveDays;
  let accrued = Math.floor(rawAccrued);
  const maxCap = getMaxUnclaimed(creditsPerDay);
  accrued = Math.min(accrued, maxCap);

  const cappedAt = daysElapsed >= maxAccrualDays ? 'max_accrual_days' : null;

  return {
    accrued,
    creditsPerDay,
    hoursElapsed,
    daysElapsed,
    cappedAt,
  };
}

export function getMinimumTokenThresholdRaw(): bigint {
  const { minTokenThreshold } = getCreditConfig();
  return BigInt(minTokenThreshold) * BigInt(10 ** TOKEN_DECIMALS);
}
