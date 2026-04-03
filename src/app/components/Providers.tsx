"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "next-themes";
import { SolanaWalletProvider } from "@/components/providers/solana-wallet-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AuthProvider>
        <SolanaWalletProvider>
          {children}
        </SolanaWalletProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

