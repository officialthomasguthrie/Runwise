"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";

const ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

/**
 * Phantom (and other wallets) register via the Wallet Standard. Passing a legacy
 * `PhantomWalletAdapter` alongside duplicates the wallet and is known to cause flaky
 * connects / generic "Unexpected error" from the extension.
 * @see https://github.com/anza-xyz/wallet-adapter — "Phantom was registered as a Standard Wallet…"
 */
export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={[]} autoConnect={false}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
