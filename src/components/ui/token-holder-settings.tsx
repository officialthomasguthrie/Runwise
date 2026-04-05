'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnectionError } from '@solana/wallet-adapter-base';
import { PhantomWalletName } from '@solana/wallet-adapter-phantom';
import { useAuth } from '@/contexts/auth-context';
import {
  getPhantomInjectedProvider,
  normalizePhantomSignMessageResult,
  phantomPublicKeyToBase58,
} from '@/lib/solana/phantom-injected';
import { AlertCircle, Wallet, CheckCircle2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WalletStatus {
  connected: boolean;
  walletAddress?: string;
  tokenBalanceDisplay?: string;
  eligible?: boolean;
  creditsPerDay?: number;
  creditsClaimedToday?: number;
  claimableCredits?: number;
  dailyLimitResetsAt?: string;
  lastClaimAt?: string | null;
  balanceLastChecked?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function formatWalletError(err: unknown): string {
  const raw = err as { code?: number; message?: string };
  if (raw?.code === 4001) return 'Connection was cancelled in Phantom.';
  if (raw?.code === -32603) {
    return 'Phantom hit an internal error. Update Phantom, turn off other Solana wallet extensions for this site, then try again.';
  }
  if (err instanceof WalletConnectionError) {
    const cause = (err as WalletConnectionError & { error?: { code?: number; message?: string } }).error;
    const code = cause?.code;
    if (code === 4001) return 'Connection was cancelled in Phantom.';
    if (code === -32603) {
      return 'Phantom hit an internal error. Update Phantom, turn off other Solana wallet extensions for this site, then try again.';
    }
    if (err.message && err.message !== 'Unexpected error') return err.message;
    if (cause?.message && cause.message !== 'Unexpected error') return cause.message;
    return 'Could not connect to Phantom. Try again or refresh the page.';
  }
  if (err instanceof Error) return err.message;
  return 'Could not connect wallet.';
}

/** Brandfetch Logo API — hotlinked per https://docs.brandfetch.com/logo-api/guidelines */
const PHANTOM_SYMBOL_SRC =
  'https://cdn.brandfetch.io/idf5VaJxyT/theme/dark/symbol.svg?c=1dxbfHSJFAPEGdCLU4o5B';

/** Single panel style — one border, light blur, no stacked “glass” effects */
const panel =
  'rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-sm dark:bg-card/80';

const panelSubtle = 'rounded-lg border border-border bg-muted/30 dark:bg-muted/20';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40';

const btnPrimaryWide =
  'w-full inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-4 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40';

/** Gray liquid glass — frosted panel + specular edge, connect CTA only */
const btnPhantomGlass =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300/70 bg-gradient-to-b from-zinc-100/90 via-zinc-200/55 to-zinc-300/45 px-4 py-2.5 text-sm font-medium text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.04),0_4px_20px_-6px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-[box-shadow,background-color,border-color,transform] hover:border-zinc-400/80 hover:from-white/95 hover:via-zinc-200/65 hover:to-zinc-300/55 hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_8px_28px_-6px_rgba(0,0,0,0.14)] active:scale-[0.99] dark:border-zinc-500/35 dark:from-zinc-800/55 dark:via-zinc-800/35 dark:to-zinc-950/50 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(0,0,0,0.35),0_4px_24px_-4px_rgba(0,0,0,0.5)] dark:hover:border-zinc-400/40 dark:hover:from-zinc-700/50 dark:hover:via-zinc-800/40 dark:hover:to-zinc-950/55 disabled:pointer-events-none disabled:opacity-40';

function ProgressTrack({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-foreground/70 transition-[width] duration-300 dark:bg-foreground/50"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function formatShortDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Extra context shown whenever a wallet is linked (below main status panels). */
function ConnectedWalletContext({ status }: { status: WalletStatus }) {
  const checked = formatShortDateTime(status.balanceLastChecked);
  const lastClaim = formatShortDateTime(status.lastClaimAt);

  return (
    <div className={`${panel} p-5 space-y-4`}>
      <div>
        <h4 className="text-sm font-medium text-foreground">UTC day &amp; claims</h4>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          Your daily allowance is based on the UTC calendar day (midnight UTC), not your local date.
          Each claim applies to whatever credits you still have left for that UTC day.
        </p>
      </div>
      {(checked || lastClaim) && (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {checked && (
            <div>
              <dt className="text-muted-foreground">Balance last synced</dt>
              <dd className="mt-0.5 font-medium text-foreground tabular-nums">{checked}</dd>
              <dd className="mt-1 text-xs text-muted-foreground">
                Updated when you connect or complete a claim.
              </dd>
            </div>
          )}
          {lastClaim && (
            <div>
              <dt className="text-muted-foreground">Last claim</dt>
              <dd className="mt-0.5 font-medium text-foreground tabular-nums">{lastClaim}</dd>
            </div>
          )}
        </dl>
      )}
      <p className="text-xs text-muted-foreground border-t border-border pt-3">
        To use a different wallet, disconnect above, then connect again with Phantom.
      </p>
    </div>
  );
}

function TokenTabDisconnectedHelp() {
  return (
    <div className="space-y-4">
      <div className={`${panel} p-5 space-y-3`}>
        <h4 className="text-sm font-medium text-foreground">How linking works</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground leading-relaxed">
          <li>
            <span className="text-foreground">Connect Phantom</span> — approve the connection in the
            extension.
          </li>
          <li>
            <span className="text-foreground">Sign the message</span> — proves you control the wallet
            and ties it to your Runwise login. The text includes your user id and a short timestamp.
          </li>
          <li>
            <span className="text-foreground">We read $RUNWISE on-chain</span> — your SPL balance sets
            how many credits you may earn per UTC day (after the 1M minimum).
          </li>
          <li>
            <span className="text-foreground">Claim when you want</span> — credits are not auto-deposited;
            open this tab and claim to add them to your Runwise balance.
          </li>
        </ol>
      </div>

      <div className={`${panel} p-5 space-y-2`}>
        <h4 className="text-sm font-medium text-foreground">What signing does not do</h4>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <li>
            Connect and claim flows only ask for <span className="text-foreground">signatures</span>, not
            token transfers. We never move $RUNWISE out of your wallet.
          </li>
          <li>
            We store your linked address and a balance snapshot for allowance math. You can disconnect
            anytime from this screen.
          </li>
        </ul>
      </div>

      <div className={`${panel} p-5 space-y-2`}>
        <h4 className="text-sm font-medium text-foreground">If Phantom won&apos;t connect</h4>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <li>Update Phantom to the latest version.</li>
          <li>
            Disable other Solana wallet extensions for this site — multiple injectors often conflict.
          </li>
          <li>
            If the popup closes without connecting, wait a moment and press Connect again; we reset
            the wallet session before each attempt.
          </li>
        </ul>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TokenHolderSettings() {
  const { user } = useAuth();
  const {
    publicKey,
    connect,
    select,
    disconnect: walletDisconnect,
    signMessage,
    connected: walletConnected,
  } = useWallet();

  // Refs avoid stale closures: after flushSync(select), we must call the latest connect()
  // from context (the one that closes over the newly selected wallet).
  const connectRef = useRef(connect);
  const selectRef = useRef(select);
  const disconnectRef = useRef(walletDisconnect);
  connectRef.current = connect;
  selectRef.current = select;
  disconnectRef.current = walletDisconnect;

  const pause = useCallback((ms: number) => new Promise<void>((r) => setTimeout(r, ms)), []);

  /**
   * Closing the Phantom popup without approving can leave the Wallet Standard bridge stuck;
   * disconnect + clear selection + re-select forces a clean session before connect().
   */
  const hardResetPhantomSelection = useCallback(async () => {
    try {
      await disconnectRef.current();
    } catch {
      /* already disconnected or nothing to tear down */
    }
    flushSync(() => {
      selectRef.current(null);
    });
    await pause(60);
    flushSync(() => {
      selectRef.current(PhantomWalletName);
    });
    await pause(120);
  }, [pause]);

  /** `connect()` throws WalletNotSelectedError until a wallet is selected. */
  const selectPhantomAndConnect = useCallback(async () => {
    // Always reset before opening Phantom. Dismissing the popup leaves many setups in a bad
    // state; the *next* button press is a new call (catch retries do not run), so this must
    // happen up front, not only after an error.
    await hardResetPhantomSelection();
    await pause(120);

    const runConnect = () => connectRef.current();

    try {
      await runConnect();
    } catch (first) {
      if (!(first instanceof WalletConnectionError)) throw first;
      const code = (first as WalletConnectionError & { error?: { code?: number } }).error?.code;
      if (code === 4001) throw first;

      await hardResetPhantomSelection();
      await pause(250);
      await runConnect();
    }
  }, [hardResetPhantomSelection, pause]);

  // Keep a ref to publicKey so async callbacks can read the latest value after
  // a connect() call without being stuck on a stale closure.
  const publicKeyRef = useRef(publicKey);
  useEffect(() => {
    publicKeyRef.current = publicKey;
  }, [publicKey]);

  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<number | null>(null);

  // ── Status fetch ────────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet/status', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch wallet status');
      setStatus(data);
      setFetchError(null);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load wallet status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchStatus();
    else setLoading(false);
  }, [user, fetchStatus]);

  // ── Connect flow ────────────────────────────────────────────────────────────

  const doSignAndConnect = useCallback(async () => {
    const pk = publicKeyRef.current;
    if (!pk || !user) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (!signMessage) throw new Error('Wallet does not support message signing');
      const walletAddress = pk.toBase58();
      const timestamp = Date.now();
      const message = `Connect wallet to Runwise account ${user.id} at timestamp ${timestamp}. This request will expire in 5 minutes.`;
      const msgBytes = new TextEncoder().encode(message);
      const sigBytes = await signMessage(msgBytes);
      const signature = bytesToBase64(sigBytes);

      const res = await fetch('/api/wallet/connect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature, message, timestamp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect wallet');
      await fetchStatus();
    } catch (err: any) {
      setActionError(err.message || 'Failed to connect wallet');
    } finally {
      setActionLoading(false);
    }
  }, [user, signMessage, fetchStatus]);

  const handleConnect = async () => {
    if (!user) return;
    setActionError(null);

    if (walletConnected && publicKey) {
      await doSignAndConnect();
      return;
    }

    const injected = getPhantomInjectedProvider();
    if (injected) {
      setActionLoading(true);
      setActionError(null);
      try {
        if (!injected.isConnected) {
          await injected.connect();
        }
        const walletAddress = phantomPublicKeyToBase58(injected.publicKey);
        const timestamp = Date.now();
        const message = `Connect wallet to Runwise account ${user.id} at timestamp ${timestamp}. This request will expire in 5 minutes.`;
        const msgBytes = new TextEncoder().encode(message);
        const signed = await injected.signMessage(msgBytes);
        const sigBytes = normalizePhantomSignMessageResult(signed);
        const signature = bytesToBase64(sigBytes);

        const res = await fetch('/api/wallet/connect', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress, signature, message, timestamp }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to connect wallet');
        await fetchStatus();
      } catch (err: unknown) {
        setActionError(formatWalletError(err));
      } finally {
        setActionLoading(false);
      }
      return;
    }

    setActionLoading(true);
    try {
      await selectPhantomAndConnect();
      await new Promise<void>((r) => setTimeout(r, 150));
      await doSignAndConnect();
    } catch (err: unknown) {
      setActionError(formatWalletError(err));
      setActionLoading(false);
    }
  };

  // ── Claim flow ──────────────────────────────────────────────────────────────

  const handleClaim = async () => {
    if (!user || !status?.walletAddress) return;
    setActionError(null);
    setClaimSuccess(null);
    setActionLoading(true);
    try {
      const linked = status.walletAddress;
      const timestamp = Date.now();
      const message = `Claim Runwise credits for account ${user.id} wallet ${linked} at timestamp ${timestamp}. This claim will expire in 5 minutes.`;
      const msgBytes = new TextEncoder().encode(message);

      let sigBytes: Uint8Array;
      const injected = getPhantomInjectedProvider();

      if (injected) {
        if (!injected.isConnected) {
          await injected.connect();
        }
        const active = phantomPublicKeyToBase58(injected.publicKey);
        if (active !== linked) {
          throw new Error(
            `Switch Phantom to your linked wallet (${truncateAddress(linked)}). Currently: ${truncateAddress(active)}.`
          );
        }
        const signed = await injected.signMessage(msgBytes);
        sigBytes = normalizePhantomSignMessageResult(signed);
      } else {
        if (!walletConnected) {
          await selectPhantomAndConnect();
          await pause(150);
        }
        if (!signMessage) throw new Error('Wallet does not support message signing');
        sigBytes = await signMessage(msgBytes);
      }

      const signature = bytesToBase64(sigBytes);
      const res = await fetch('/api/wallet/claim-credits', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature, timestamp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim credits');
      setClaimSuccess(typeof data.creditsGranted === 'number' ? data.creditsGranted : 0);
      await fetchStatus();
    } catch (err: unknown) {
      setActionError(formatWalletError(err));
    } finally {
      setActionLoading(false);
    }
  };

  // ── Disconnect flow ─────────────────────────────────────────────────────────

  const handleDisconnect = async () => {
    setActionError(null);
    setActionLoading(true);
    try {
      const res = await fetch('/api/wallet/disconnect', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disconnect');
      try { await walletDisconnect(); } catch { /* adapter might not be connected */ }
      await fetchStatus();
    } catch (err: any) {
      setActionError(err.message || 'Failed to disconnect wallet');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Reusable sub-elements ───────────────────────────────────────────────────

  const ActionError = actionError ? (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex gap-2.5">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{actionError}</span>
    </div>
  ) : null;

  const DisconnectLink = (
    <button
      type="button"
      onClick={handleDisconnect}
      disabled={actionLoading}
      className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-40"
    >
      Disconnect
    </button>
  );

  // ── STATE 1: Loading ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="w-full min-w-0 space-y-6">
        <div className={`${panel} p-6 space-y-4`}>
          <div className="flex gap-4">
            <div className="h-12 w-12 shrink-0 rounded-md bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-muted rounded animate-pulse" />
              <div className="h-3 w-full max-w-sm bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="h-10 w-44 bg-muted rounded-md animate-pulse" />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="w-full min-w-0">
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{fetchError}</span>
        </div>
      </div>
    );
  }

  // ── STATE 2: No wallet connected ────────────────────────────────────────────

  if (!status?.connected) {
    return (
      <div className="w-full min-w-0 space-y-6">
        <div className={`${panel} p-6 sm:p-7 space-y-5`}>
          <div className="flex gap-4">
            <img
              src={PHANTOM_SYMBOL_SRC}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 object-contain"
              aria-hidden
            />
            <div className="min-w-0 space-y-2">
              <h3 className="text-base font-semibold text-foreground">Connect Phantom</h3>
              <p className="text-sm text-muted-foreground max-w-lg">
                Sign a message to prove you control the wallet. We read your $RUNWISE balance and set
                your daily credits from that.
              </p>
            </div>
          </div>

          <div className={`${panelSubtle} p-4 space-y-2 text-sm text-muted-foreground`}>
            <p>
              <span className="font-medium text-foreground">Allowance:</span>{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                floor(tokens ÷ 120,000)
              </code>{' '}
              credits per UTC day, max 200. You need at least 1,000,000 $RUNWISE to earn any.
            </p>
          </div>

          <button
            type="button"
            onClick={handleConnect}
            disabled={actionLoading}
            className={btnPhantomGlass}
          >
            <img
              src={PHANTOM_SYMBOL_SRC}
              alt=""
              width={18}
              height={18}
              className="h-[18px] w-[18px] shrink-0 object-contain opacity-90"
              aria-hidden
            />
            {actionLoading ? 'Opening wallet…' : 'Connect with Phantom'}
          </button>
        </div>

        {ActionError}

        <TokenTabDisconnectedHelp />
      </div>
    );
  }

  // ── Connected states shared values ──────────────────────────────────────────

  const walletAddress = status.walletAddress!;
  const truncated = truncateAddress(walletAddress);

  // ── STATE 3: Below threshold ────────────────────────────────────────────────

  if (!status.eligible) {
    const balanceNum = parseFloat((status.tokenBalanceDisplay ?? '0').replace(/,/g, ''));
    const needed = Math.max(0, 1_000_000 - balanceNum);

    return (
      <div className="w-full min-w-0 space-y-6">
        <div className={`${panel} p-6 sm:p-7 space-y-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1 font-mono text-xs text-muted-foreground">
              <Wallet className="h-3.5 w-3.5 shrink-0" />
              {truncated}
            </div>
            {DisconnectLink}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Balance</p>
            <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground tabular-nums">
              {status.tokenBalanceDisplay ?? '0'}
              <span className="ml-2 text-lg font-normal text-muted-foreground">$RUNWISE</span>
            </p>
          </div>

          <div className="flex gap-3 rounded-md border border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/10 px-4 py-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">
                Need {needed.toLocaleString()} more $RUNWISE for daily credits
              </p>
              <p className="text-muted-foreground">
                Minimum 1M $RUNWISE (8+ credits/day once you cross the threshold).
              </p>
            </div>
          </div>
        </div>
        <ConnectedWalletContext status={status} />
        {ActionError}
      </div>
    );
  }

  // ── STATE 4 & 5: Eligible ───────────────────────────────────────────────────

  const claimableCredits = status.claimableCredits ?? 0;
  const creditsClaimedToday = status.creditsClaimedToday ?? 0;
  const creditsPerDay = status.creditsPerDay ?? 0;
  const resetsLabel = status.dailyLimitResetsAt
    ? new Date(status.dailyLimitResetsAt).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : null;

  const EarningHeader = (
    <div className={`${panel} p-6 sm:p-7`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1 font-mono text-xs text-muted-foreground">
              <Wallet className="h-3.5 w-3.5 shrink-0" />
              {truncated}
            </div>
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:text-emerald-200">
              {creditsPerDay} credits / UTC day
            </span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Token balance</p>
            <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground tabular-nums">
              {status.tokenBalanceDisplay ?? '0'}
              <span className="ml-2 text-lg font-normal text-muted-foreground">$RUNWISE</span>
            </p>
          </div>
        </div>
        <div className="flex lg:pt-0.5">{DisconnectLink}</div>
      </div>
    </div>
  );

  // ── STATE 4: Has credits to claim ───────────────────────────────────────────

  if (claimableCredits > 0) {
    return (
      <div className="w-full min-w-0 space-y-6">
        {EarningHeader}

        <div className={`${panel} p-6 sm:p-7 space-y-5`}>
          <div>
            <h3 className="text-sm font-medium text-foreground">Claim credits</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Approve the signature in Phantom to add credits to your account.
            </p>
          </div>

          {claimSuccess !== null && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200 flex gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="font-medium">+{claimSuccess} credits added.</span>
            </div>
          )}

          <div className={`${panelSubtle} px-5 py-6 text-center`}>
            <p className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground tabular-nums">
              {claimableCredits}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">credits ready to claim</p>
          </div>

          <div className={`${panelSubtle} px-4 py-3 text-sm text-muted-foreground space-y-1`}>
            <p>
              Today (UTC): allowance <span className="tabular-nums font-medium text-foreground">{creditsPerDay}</span>
              , claimed{' '}
              <span className="tabular-nums font-medium text-foreground">{creditsClaimedToday}</span>.
            </p>
            <p>One claim uses your remaining allowance for the day.</p>
          </div>

          <button type="button" onClick={handleClaim} disabled={actionLoading} className={btnPrimaryWide}>
            {actionLoading
              ? 'Waiting for signature…'
              : `Claim ${claimableCredits} credit${claimableCredits === 1 ? '' : 's'}`}
          </button>
        </div>

        <ConnectedWalletContext status={status} />
        {ActionError}
      </div>
    );
  }

  // ── STATE 5: Recently claimed / no credits yet ──────────────────────────────

  return (
    <div className="w-full min-w-0 space-y-6">
      {EarningHeader}

      <div className={`${panel} p-6 sm:p-7 space-y-5`}>
        <div className="min-w-0 space-y-2">
          <h3 className="text-sm font-medium text-foreground">No credits left to claim</h3>
          <p className="text-sm text-muted-foreground">
              {creditsPerDay > 0 && creditsClaimedToday >= creditsPerDay ? (
                <>
                  You&apos;ve used your full daily allowance (
                  <span className="font-medium text-foreground tabular-nums">{creditsPerDay}</span>{' '}
                  credits). Next allowance after UTC midnight
                  {resetsLabel ? (
                    <>
                      {' '}
                      (<span className="font-medium text-foreground">{resetsLabel}</span> local).
                    </>
                  ) : (
                    '.'
                  )}
                </>
              ) : (
                <>
                  No remaining credits for this UTC day. Your tier allows up to{' '}
                  <span className="font-medium text-foreground tabular-nums">{creditsPerDay}</span>{' '}
                  credits/day.
                  {resetsLabel && (
                    <>
                      {' '}
                      Refreshes{' '}
                      <span className="font-medium text-foreground">{resetsLabel}</span>.
                    </>
                  )}
                </>
              )}
            </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Today&apos;s allowance</span>
            <span className="tabular-nums text-foreground">
              {creditsPerDay > 0 ? `${creditsClaimedToday} / ${creditsPerDay}` : '—'}
            </span>
          </div>
          <ProgressTrack value={creditsClaimedToday} max={creditsPerDay || 1} />
        </div>
      </div>

      <ConnectedWalletContext status={status} />
      {ActionError}
    </div>
  );
}
