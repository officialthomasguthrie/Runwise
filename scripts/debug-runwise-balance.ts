/**
 * Run from repo root (same env as production server):
 *
 *   RUNWISE_BALANCE_DEBUG=true \
 *   SOLANA_RPC_URL="https://..." \
 *   RUNWISE_TOKEN_MINT_ADDRESS="..." \
 *   npx tsx scripts/debug-runwise-balance.ts <WALLET_PUBKEY>
 *
 * Paste full terminal output when asking for a balance fix.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import {
  getRunwiseTokenBalance,
  formatDisplayBalance,
  TOKEN_DECIMALS,
} from '../src/lib/solana/token-balance';

async function main() {
  const wallet = process.argv[2];
  const rpc = process.env.SOLANA_RPC_URL;
  const mintStr = process.env.RUNWISE_TOKEN_MINT_ADDRESS;

  console.log('--- Runwise balance debug ---');
  console.log('WALLET_ARG:', wallet ?? '(missing)');
  console.log('SOLANA_RPC_URL set:', Boolean(rpc), rpc ? `(host: ${tryHost(rpc)})` : '');
  console.log('RUNWISE_TOKEN_MINT_ADDRESS:', mintStr ?? '(missing)');
  console.log('TOKEN_DECIMALS (app constant):', TOKEN_DECIMALS);

  if (!wallet || !rpc || !mintStr) {
    console.error('\nUsage: set SOLANA_RPC_URL, RUNWISE_TOKEN_MINT_ADDRESS, then pass wallet pubkey.\n');
    process.exit(1);
  }

  let mintPk: PublicKey;
  let ownerPk: PublicKey;
  try {
    mintPk = new PublicKey(mintStr);
    ownerPk = new PublicKey(wallet);
  } catch (e) {
    console.error('Invalid mint or wallet pubkey:', e);
    process.exit(1);
  }

  const connection = new Connection(rpc, 'confirmed');

  console.log('\n--- Mint account (which program owns this mint?) ---');
  try {
    const info = await connection.getParsedAccountInfo(mintPk);
    const owner = info.value?.owner?.toBase58?.() ?? info.value?.owner;
    const data = info.value?.data;
    if (data && typeof data === 'object' && 'parsed' in data) {
      const p = (data as { parsed: { type?: string } }).parsed;
      console.log('mint owner program:', owner, 'parsed.type:', p?.type);
    } else {
      console.log('mint owner program:', owner, '(raw or missing)');
    }
  } catch (e) {
    console.log('ERROR:', e instanceof Error ? e.message : e);
  }

  console.log('\n--- getParsedTokenAccountsByOwner({ mint }) ---');
  try {
    const { value: rows } = await connection.getParsedTokenAccountsByOwner(
      ownerPk,
      { mint: mintPk },
      'confirmed',
    );
    console.log('rowCount:', rows.length);
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const d = rows[i].account.data;
      const p = d.parsed as { type?: string; info?: Record<string, unknown> };
      console.log(`  [${i}] program=${d.program} parsed.type=${p?.type}`);
      console.log(`      tokenAmount:`, p?.info && (p.info as { tokenAmount?: unknown }).tokenAmount);
    }
    if (rows.length > 5) console.log(`  ... and ${rows.length - 5} more`);
  } catch (e) {
    console.log('ERROR:', e instanceof Error ? e.message : e);
  }

  console.log('\n--- ATA addresses (for manual explorer check) ---');
  for (const [name, programId] of [
    ['legacy', TOKEN_PROGRAM_ID],
    ['token2022', TOKEN_2022_PROGRAM_ID],
  ] as const) {
    const ata = await getAssociatedTokenAddress(mintPk, ownerPk, false, programId);
    console.log(`${name} ATA:`, ata.toBase58());
  }

  console.log('\n--- getRunwiseTokenBalance() ---');
  process.env.RUNWISE_BALANCE_DEBUG = 'true';
  const raw = await getRunwiseTokenBalance(wallet);
  console.log('raw (base units):', raw.toString());
  console.log('formatDisplayBalance (uses TOKEN_DECIMALS=' + TOKEN_DECIMALS + '):', formatDisplayBalance(raw));
  console.log('--- end ---\n');
}

function tryHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '(unparseable URL)';
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
