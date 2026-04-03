/**
 * Solana SPL token balance helpers for $RUNWISE (server-side RPC).
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

export const TOKEN_DECIMALS = 6;

function getConnection(): Connection | null {
  const url = process.env.SOLANA_RPC_URL;
  if (!url) return null;
  return new Connection(url, 'confirmed');
}

function getMint(): PublicKey | null {
  const mintStr = process.env.RUNWISE_TOKEN_MINT_ADDRESS;
  if (!mintStr) return null;
  try {
    return new PublicKey(mintStr);
  } catch {
    return null;
  }
}

/**
 * Fetches raw token amount (base units) for the wallet's ATA. Returns 0n on any error.
 */
export async function getRunwiseTokenBalance(walletAddress: string): Promise<bigint> {
  try {
    const connection = getConnection();
    const mint = getMint();
    if (!connection || !mint) return BigInt(0);

    const owner = new PublicKey(walletAddress);
    const ata = await getAssociatedTokenAddress(mint, owner);
    const account = await getAccount(connection, ata, 'confirmed');
    return account.amount;
  } catch {
    return BigInt(0);
  }
}

/**
 * Converts raw balance to human display units (may lose precision for extremely large balances).
 */
export function toDisplayBalance(rawBalance: bigint): number {
  const divisor = BigInt(10 ** TOKEN_DECIMALS);
  const whole = rawBalance / divisor;
  return Number(whole);
}

/**
 * Formats raw balance as a comma-separated display string (whole tokens only).
 */
export function formatDisplayBalance(rawBalance: bigint): string {
  const whole = rawBalance / BigInt(10 ** TOKEN_DECIMALS);
  return whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
