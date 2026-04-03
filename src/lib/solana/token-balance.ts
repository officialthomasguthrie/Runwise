/**
 * Solana SPL token balance helpers for $RUNWISE (server-side RPC).
 */

import { Connection, PublicKey, type AccountInfo } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';

export const TOKEN_DECIMALS = 6;

function balanceDebugEnabled(): boolean {
  return process.env.RUNWISE_BALANCE_DEBUG === '1' || process.env.RUNWISE_BALANCE_DEBUG === 'true';
}

function balanceDebugLog(...args: unknown[]) {
  if (balanceDebugEnabled()) console.error('[runwise-balance]', ...args);
}

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

type ParsedTokenOwnerRow = {
  account: AccountInfo<{ program: string; parsed: unknown; space: number }>;
};

function sumParsedTokenAmountsForMint(accounts: ParsedTokenOwnerRow[]): bigint {
  let total = BigInt(0);
  for (const { account } of accounts) {
    const parsedRoot = account.data?.parsed;
    if (!parsedRoot || typeof parsedRoot !== 'object') continue;
    const inner = parsedRoot as { type?: string; info?: { tokenAmount?: { amount?: string } } };
    if (inner.type !== 'account') continue;
    const amt = inner.info?.tokenAmount?.amount;
    if (amt == null || amt === '') continue;
    try {
      total += BigInt(amt);
    } catch {
      continue;
    }
  }
  return total;
}

async function readAtaBalance(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  tokenProgramId: PublicKey,
): Promise<bigint> {
  const ata = await getAssociatedTokenAddress(mint, owner, false, tokenProgramId);
  const account = await getAccount(connection, ata, 'confirmed', tokenProgramId);
  return account.amount;
}

/**
 * Fetches raw token amount (base units) for all of the wallet's token accounts for this mint.
 * Uses getParsedTokenAccountsByOwner (legacy + Token-2022, any token account — not only ATA).
 * Falls back to ATA lookup per program if the index returns nothing.
 */
export async function getRunwiseTokenBalance(walletAddress: string): Promise<bigint> {
  try {
    const connection = getConnection();
    const mint = getMint();
    if (!connection || !mint) {
      balanceDebugLog('missing connection or mint (check SOLANA_RPC_URL / RUNWISE_TOKEN_MINT_ADDRESS)');
      return BigInt(0);
    }

    const owner = new PublicKey(walletAddress);

    try {
      const { value: rows } = await connection.getParsedTokenAccountsByOwner(
        owner,
        { mint },
        'confirmed',
      );
      balanceDebugLog('getParsedTokenAccountsByOwner rowCount=', rows?.length ?? 0);
      if (balanceDebugEnabled() && rows?.length) {
        const sample = rows[0]?.account?.data;
        balanceDebugLog('firstRow.program=', sample?.program, 'parsed.type=', (sample?.parsed as { type?: string })?.type);
      }
      const fromParsed = sumParsedTokenAmountsForMint(rows as ParsedTokenOwnerRow[]);
      balanceDebugLog('sumParsedTokenAmounts raw total=', fromParsed.toString());
      if (fromParsed > BigInt(0)) return fromParsed;
    } catch (e) {
      balanceDebugLog('getParsedTokenAccountsByOwner failed:', e instanceof Error ? e.message : e);
    }

    for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
      const label = programId.equals(TOKEN_PROGRAM_ID) ? 'legacy' : 'token2022';
      try {
        const amount = await readAtaBalance(connection, mint, owner, programId);
        balanceDebugLog(`ATA ${label} amount=`, amount.toString());
        if (amount > BigInt(0)) return amount;
      } catch (e) {
        balanceDebugLog(`ATA ${label} failed:`, e instanceof Error ? e.message : e);
      }
    }
    balanceDebugLog('final balance 0 for wallet', walletAddress.slice(0, 8) + '…');
    return BigInt(0);
  } catch (e) {
    balanceDebugLog('getRunwiseTokenBalance outer catch:', e instanceof Error ? e.message : e);
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
