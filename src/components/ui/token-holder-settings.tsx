'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnectionError } from '@solana/wallet-adapter-base';
import { PhantomWalletName } from '@solana/wallet-adapter-phantom';
import { useAuth } from '@/contexts/auth-context';
import {
  AlertCircle,
  Wallet,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  Info,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WalletStatus {
  connected: boolean;
  walletAddress?: string;
  tokenBalanceDisplay?: string;
  eligible?: boolean;
  creditsPerDay?: number;
  maxUnclaimed?: number;
  accruedCredits?: number;
  accrualStartAt?: string;
  cappedAt?: string | null;
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
  if (err instanceof WalletConnectionError) {
    const cause = (err as WalletConnectionError & { error?: { code?: number; message?: string } }).error;
    const code = cause?.code;
    if (code === 4001) return 'Connection was cancelled in Phantom.';
    if (code === -32603) {
      return 'Phantom reported an internal error. Try again, update Phantom, or disable other Solana wallet extensions for this site.';
    }
    if (err.message && err.message !== 'Unexpected error') return err.message;
    if (cause?.message && cause.message !== 'Unexpected error') return cause.message;
    return 'Could not connect to Phantom. Try again or refresh the page.';
  }
  if (err instanceof Error) return err.message;
  return 'Could not connect wallet.';
}

// Shared card class, matching usage-settings.tsx exactly
const CARD =
  'rounded-lg backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]';

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
    // Adapter not yet connected: connect first, then sign once publicKey is
    // available. The publicKeyRef effect will have the updated value by the time
    // the connect() Promise resolves and React has re-rendered.
    setActionLoading(true);
    try {
      await selectPhantomAndConnect();
      // Small yield so publicKey ref updates after the adapter connects.
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
      if (!walletConnected) {
        await selectPhantomAndConnect();
        await new Promise<void>((r) => setTimeout(r, 150));
      }
      if (!signMessage) throw new Error('Wallet does not support message signing');

      const timestamp = Date.now();
      const message = `Claim Runwise credits for account ${user.id} wallet ${status.walletAddress} at timestamp ${timestamp}. This claim will expire in 5 minutes.`;
      const msgBytes = new TextEncoder().encode(message);
      const sigBytes = await signMessage(msgBytes);
      const signature = bytesToBase64(sigBytes);

      const res = await fetch('/api/wallet/claim-credits', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature, timestamp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Claim failed');

      setClaimSuccess(data.creditsGranted);
      await fetchStatus();
      setTimeout(() => setClaimSuccess(null), 4000);
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
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {actionError}
    </div>
  ) : null;

  const DisconnectLink = (
    <button
      onClick={handleDisconnect}
      disabled={actionLoading}
      className="text-xs text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2 disabled:opacity-50"
    >
      Disconnect wallet
    </button>
  );

  // ── STATE 1: Loading ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className={`${CARD} p-6 space-y-4`}>
          <div className="space-y-2">
            <div className="h-4 w-40 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
            <div className="h-10 w-56 bg-gray-300 dark:bg-[#303030] rounded-md animate-pulse" />
          </div>
          <div className="h-4 w-full bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
          <div className="h-4 w-3/4 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`${CARD} p-4 space-y-2`}>
            <div className="h-4 w-28 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
            <div className="h-8 w-20 bg-gray-300 dark:bg-[#303030] rounded-md animate-pulse" />
          </div>
          <div className={`${CARD} p-4 space-y-2`}>
            <div className="h-4 w-28 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
            <div className="h-8 w-20 bg-gray-300 dark:bg-[#303030] rounded-md animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Fetch error
  if (fetchError) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {fetchError}
        </div>
      </div>
    );
  }

  // ── STATE 2: No wallet connected ────────────────────────────────────────────

  if (!status?.connected) {
    const examples = [
      { tokens: '1,000,000', cpd: 8, max: 24 },
      { tokens: '5,000,000', cpd: 41, max: 123 },
      { tokens: '10,000,000', cpd: 83, max: 249 },
      { tokens: '24,000,000+', cpd: 200, max: 600 },
    ];

    return (
      <div className="space-y-6">
        {/* Header + connect card */}
        <div className={`${CARD} p-6 space-y-4`}>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Connect Your Wallet</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            $RUNWISE holders earn generation credits continuously based on their token balance.
            Connect your wallet to start accruing.
          </p>

          {/* Formula explainer */}
          <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1.5">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 flex-shrink-0" />
              Earning rate:{' '}
              <code className="font-mono bg-muted px-1 rounded text-xs">
                floor(tokens ÷ 120,000)
              </code>{' '}
              credits/day, up to 200/day
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              Minimum: 1,000,000 $RUNWISE to earn credits
            </p>
          </div>

          <button
            onClick={handleConnect}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/80 transition-colors disabled:opacity-50"
          >
            <Wallet className="w-4 h-4" />
            {actionLoading ? 'Connecting…' : 'Connect Phantom Wallet'}
          </button>
        </div>

        {ActionError}

        {/* Earning examples table */}
        <div className={`${CARD} p-4 space-y-3`}>
          <h3 className="text-sm font-semibold text-foreground">Earning Examples</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs border-b border-border/50">
                  <th className="text-left pb-2 font-medium">Tokens Held</th>
                  <th className="text-left pb-2 font-medium">Credits/day</th>
                  <th className="text-left pb-2 font-medium">Max claimable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {examples.map((row) => (
                  <tr key={row.tokens}>
                    <td className="py-2 font-mono text-xs text-foreground">{row.tokens}</td>
                    <td className="py-2 text-foreground">
                      <span className="font-medium">{row.cpd}</span>
                      {row.cpd === 200 && (
                        <span className="ml-1 text-xs text-muted-foreground">(max)</span>
                      )}
                    </td>
                    <td className="py-2 text-muted-foreground">{row.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
      <div className="space-y-6">
        <div className={`${CARD} p-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-mono">{truncated}</span>
            </div>
            {DisconnectLink}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Your balance</p>
            <p className="text-3xl font-semibold text-foreground">
              {status.tokenBalanceDisplay ?? '0'}
              <span className="text-lg text-muted-foreground font-normal ml-2">$RUNWISE</span>
            </p>
          </div>

          <div className="rounded-lg bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-500 space-y-1">
            <p className="font-medium">
              Need {needed.toLocaleString()} more $RUNWISE to start earning
            </p>
            <p className="text-xs opacity-80">
              At 1,000,000 tokens you'd earn 8 credits/day
            </p>
          </div>
        </div>
        {ActionError}
      </div>
    );
  }

  // ── STATE 4 & 5: Eligible ───────────────────────────────────────────────────

  const accruedCredits = status.accruedCredits ?? 0;
  const creditsPerDay = status.creditsPerDay ?? 0;
  const maxUnclaimed = status.maxUnclaimed ?? 0;
  const accrualStart = status.accrualStartAt ? new Date(status.accrualStartAt) : null;
  const formattedStart = accrualStart
    ? accrualStart.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';
  const hoursUntilMeaningful = creditsPerDay > 0 ? Math.ceil((1 / creditsPerDay) * 24) : 0;

  const EarningHeader = (
    <div className={`${CARD} p-6 space-y-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-mono">{truncated}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground">
            <Zap className="w-3 h-3" />
            Earning {creditsPerDay} credits/day
          </span>
        </div>
        {DisconnectLink}
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-1">Token balance</p>
        <p className="text-2xl font-semibold text-foreground">
          {status.tokenBalanceDisplay ?? '0'}
          <span className="text-base text-muted-foreground font-normal ml-2">$RUNWISE</span>
        </p>
      </div>
    </div>
  );

  // ── STATE 4: Has credits to claim ───────────────────────────────────────────

  if (accruedCredits > 0) {
    return (
      <div className="space-y-6">
        {EarningHeader}

        {status.cappedAt === 'max_accrual_days' && (
          <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-500 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              You've hit the 3-day cap. Claim now to avoid losing accrual time.
            </span>
          </div>
        )}

        <div className={`${CARD} p-6 space-y-4`}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Ready to Claim</h3>
          </div>

          {claimSuccess !== null && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              +{claimSuccess} credits added to your balance!
            </div>
          )}

          <div className="text-center py-2">
            <p className="text-5xl font-semibold text-foreground">{accruedCredits}</p>
            <p className="text-sm text-muted-foreground mt-1">credits ready to claim</p>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Accruing since {formattedStart} · Max accumulation: {maxUnclaimed} credits (3 days)
          </p>

          <button
            onClick={handleClaim}
            disabled={actionLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/80 transition-colors disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            {actionLoading
              ? 'Claiming — sign in your wallet…'
              : `Claim ${accruedCredits} Credits`}
          </button>
        </div>

        {ActionError}
      </div>
    );
  }

  // ── STATE 5: Recently claimed / no credits yet ──────────────────────────────

  return (
    <div className="space-y-6">
      {EarningHeader}

      <div className={`${CARD} p-6 space-y-3`}>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">No Credits to Claim Yet</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          You've claimed recently. Credits are accruing at{' '}
          <span className="font-medium text-foreground">{creditsPerDay}</span> per day.
          {hoursUntilMeaningful > 0 && (
            <>
              {' '}
              Next meaningful claim in approx.{' '}
              <span className="font-medium text-foreground">{hoursUntilMeaningful}h</span>.
            </>
          )}
        </p>

        {/* Mini progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Accrued so far</span>
            <span>
              {accruedCredits} / {maxUnclaimed} max
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground/60 rounded-full transition-all duration-300"
              style={{
                width: `${maxUnclaimed > 0 ? Math.min((accruedCredits / maxUnclaimed) * 100, 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {ActionError}
    </div>
  );
}
