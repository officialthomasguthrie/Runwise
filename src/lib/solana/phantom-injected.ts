/**
 * Direct Phantom browser injection — avoids @solana/wallet-adapter-react's Wallet Standard
 * path, which often surfaces Phantom -32603 / "Unexpected error" in Chrome with multiple
 * extensions or certain Phantom builds.
 *
 * @see https://docs.phantom.com/solana/detecting-the-provider
 */

export type PhantomInjectedProvider = {
  isPhantom?: boolean;
  isConnected: boolean;
  publicKey: { toBase58(): string; toBytes(): Uint8Array } | null;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey?: { toBytes(): Uint8Array } } | void>;
  disconnect(): Promise<void>;
  signMessage(
    message: Uint8Array,
    display?: string
  ): Promise<{ signature: Uint8Array } | Uint8Array>;
};

export function getPhantomInjectedProvider(): PhantomInjectedProvider | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    phantom?: { solana?: PhantomInjectedProvider };
    solana?: PhantomInjectedProvider;
  };
  const fromPhantom = w.phantom?.solana;
  if (fromPhantom?.isPhantom) return fromPhantom;
  const legacy = w.solana;
  if (legacy?.isPhantom) return legacy;
  return null;
}

export function phantomPublicKeyToBase58(pk: unknown): string {
  if (pk == null) throw new Error('Wallet has no public key');
  const o = pk as { toBase58?: () => string; toString?: () => string };
  if (typeof o.toBase58 === 'function') return o.toBase58();
  if (typeof o.toString === 'function') {
    const s = o.toString();
    if (s && !s.startsWith('[object ')) return s;
  }
  throw new Error('Could not read wallet address from Phantom');
}

export function normalizePhantomSignMessageResult(result: unknown): Uint8Array {
  if (result instanceof Uint8Array) return result;
  if (result && typeof result === 'object' && 'signature' in result) {
    const s = (result as { signature: unknown }).signature;
    if (s instanceof Uint8Array) return s;
    if (s instanceof ArrayBuffer) return new Uint8Array(s);
    if (Array.isArray(s)) return new Uint8Array(s);
  }
  throw new Error('Unexpected response from Phantom when signing');
}
