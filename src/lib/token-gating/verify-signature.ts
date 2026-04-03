/**
 * Phantom / Solana wallet message signature verification (ed25519).
 */

import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';

export function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signatureBase64: string,
): boolean {
  try {
    const publicKey = new PublicKey(walletAddress).toBytes();
    const messageBytes = new TextEncoder().encode(message);
    let signature: Uint8Array;
    try {
      const buf = Buffer.from(signatureBase64, 'base64');
      if (buf.length !== nacl.sign.signatureLength) return false;
      signature = new Uint8Array(buf);
    } catch {
      return false;
    }
    return nacl.sign.detached.verify(messageBytes, signature, publicKey);
  } catch {
    return false;
  }
}

export function buildOwnershipMessage(userId: string, timestamp: number): string {
  return `Connect wallet to Runwise account ${userId} at timestamp ${timestamp}. This request will expire in 5 minutes.`;
}

export function buildClaimMessage(
  userId: string,
  walletAddress: string,
  timestamp: number,
): string {
  return `Claim Runwise credits for account ${userId} wallet ${walletAddress} at timestamp ${timestamp}. This claim will expire in 5 minutes.`;
}
