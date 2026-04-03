# $RUNWISE Token Holder Utility System — Full Implementation Plan

**Version:** 2.0 (Linear Accrual Model)  
**Last Updated:** April 3, 2026  
**Estimated Total Build Time:** 10–14 hours (broken into prompts below)  
**Stack:** Next.js 15 / Supabase (PostgreSQL) / Solana / Phantom Wallet

---

## How To Use This Document

This file is your single source of truth for the entire implementation. It is structured into three types of steps:

- **YOU DO** — Things only you can do (external accounts, keys, SQL in Supabase dashboard, etc.)
- **AGENT DOES** — A prompt you paste into the Cursor agent to make it write the code
- **VERIFY** — Things you check/test yourself after a step is complete

Work through the phases in order. Do not skip ahead. Each phase builds on the last.

---

## Economics & Linear Credit Model (Locked In)

### Token Decimal Places
**Token Decimals = 6** (confirmed)  
All raw thresholds = display amount × 1,000,000

### How It Works

Instead of fixed monthly tiers, users earn credits **passively over time** based on how many tokens they hold. They can claim their accrued credits at any time.

**Core formula:**
```
credits_per_day = floor(token_balance_display / TOKEN_TO_CREDIT_RATIO)
credits_per_day = min(credits_per_day, DAILY_CREDIT_CAP)

If token_balance_display < MIN_TOKEN_THRESHOLD → credits_per_day = 0 (ineligible)

accrued_credits = floor(credits_per_day × min(days_since_last_claim, MAX_ACCRUAL_DAYS))
```

### Configuration Variables (env vars — no code change needed to adjust)

#### Accrual / Token Model
| Variable | Default | Meaning |
|----------|---------|---------|
| `TOKEN_TO_CREDIT_RATIO` | `120000` | Tokens required per 1 credit/day |
| `DAILY_CREDIT_CAP` | `200` | Max credits any wallet can earn per day |
| `MIN_TOKEN_THRESHOLD` | `1000000` | Min display tokens required to earn anything |
| `MAX_ACCRUAL_DAYS` | `3` | Credits stop accumulating after this many days unclaimed |

#### Credit Spend Model (Dynamic — not flat fees)
| Variable | Default | Meaning |
|----------|---------|---------|
| `EXECUTION_BASE_CREDIT_COST` | `3` | Flat base cost charged for every workflow execution attempt |
| `EXECUTION_CREDIT_PER_NODE` | `1` | Additional credit per node that successfully executed |
| `EXECUTION_CREDIT_CAP` | `25` | Hard cap per execution regardless of node count (protects against retry abuse) |
| `AGENT_RUN_MIN_CREDITS` | `5` | Minimum credits required before an agent run is even allowed to start |
| `AGENT_RUN_CREDIT_CAP` | `80` | Hard cap per agent run (protects against runaway loops) |

> **Why different models per action type?** See "Dynamic Credit Cost Model" section below for the full explanation.

### Example Earnings at Current Price ($0.00001522/token)

| Display Balance | USD Cost to Hold | credits/day | Max claimable (3 days) | Your OpenAI cost |
|----------------|-----------------|-------------|----------------------|-----------------|
| 1,000,000 (min) | $15.22 | 8 | 24 | ~$0.24 |
| 5,000,000 | $76.10 | 41 | 123 | ~$1.23 |
| 10,000,000 | $152.20 | 83 | 249 (capped at 600) | ~$2.49 |
| 24,000,000+ | $365.28+ | 200 (cap hit) | 600 | ~$6.00 |

**Why this is sustainable:** At the daily cap (200 credits = $2.00 OpenAI cost/day), a user must hold ~$365 worth of $RUNWISE. Even with execution costs (10 credits each), you retain margin because execution costs are metered separately and always deducted from their balance. The worst case (all users at max cap) is fully bounded and predictable.

**Execution cost model:** A workflow execution costs 10 credits = $0.10 in your billing model. Since execution does not inherently call OpenAI (it calls user-configured integrations like Slack, Google Sheets, etc.), your actual OpenAI cost per execution is typically $0.00–$0.05 for any AI nodes in the workflow. This gives you strong margin on executions.

---

## Dynamic Credit Cost Model

This section explains **why each action type is costed differently** and what drives the cost calculation.

### Why Not a Flat Fee?

A flat fee of "10 credits per execution" is fine if all executions are equal — but they're not. A 2-node workflow that runs in 200ms is not the same as a 15-node workflow that retries 3 times. With flat fees, you either overcharge simple users or get destroyed by power users.

More critically: **your `workflowExecutor` Inngest function has `retries: 3`**. Without a per-attempt cost, a user whose badly-configured workflow fails 4 times in a row pays the same as someone whose workflow succeeds in one shot — while you absorb 4× the Inngest + infrastructure cost.

### Action-by-Action Breakdown

#### AI Generation (`/api/ai/generate-workflow`, `/api/ai/chat`)
- **Your cost driver:** OpenAI API tokens on your key
- **Calculation:** Already fully dynamic in the codebase — uses `calculateCreditsFromTokens(inputTokens, outputTokens)` on the actual OpenAI response usage. **No change needed to the formula.**
- **Addition needed:** A per-generation credit cap (`GENERATION_CREDIT_CAP`) as a safety ceiling in case of unexpectedly large prompts.
- **Cost scale:** ~2–10 credits per generation (a few cents)

#### Workflow Execution (`workflowExecutor` Inngest function)
- **Your cost driver:** Inngest function invocations + infrastructure. Note: workflow nodes that call OpenAI use the **user's own integration API key** (verified in `src/lib/nodes/registry.ts`) — so you do NOT pay OpenAI for those. Your cost is purely infrastructure.
- **Calculation:** `cost = min(EXECUTION_BASE_CREDIT_COST + (nodesExecuted × EXECUTION_CREDIT_PER_NODE), EXECUTION_CREDIT_CAP)`
- **`nodesExecuted`** comes from `executionResult.nodeResults.length` (actual nodes that ran, not planned)
- **Retries are intentionally expensive:** each Inngest retry attempt charges the base cost again. This discourages poorly-written workflows from hammering your infrastructure.
- **Example:** A 5-node workflow: `3 + (5 × 1) = 8 credits`. A 20-node workflow: capped at 25 credits.
- **Cost scale:** 4–25 credits per execution attempt

#### Agent Runs (`agentRun` Inngest function → `runAgentLoop`)
- **Your cost driver:** Your `OPENAI_API_KEY` — agents use `process.env.OPENAI_API_KEY` directly in `src/lib/agents/runtime.ts`. Every GPT-4o call in the loop is billed to you.
- **Calculation:** `cost = min(estimateAgentRunCredits(tokensUsed), AGENT_RUN_CREDIT_CAP)` where `tokensUsed` is tracked in real time in `runAgentLoop` and returned in the result.
- **`estimateAgentRunCredits`** is already in `src/lib/credits/calculator.ts` — uses 70/30 input/output token split formula.
- **Pre-run check:** Require `AGENT_RUN_MIN_CREDITS` upfront before starting the loop at all. If they can't afford it, block the run.
- **The loop risk:** `max_steps` (default 10) already caps the loop. With GPT-4o at ~$2.50/1M input + $10/1M output, a 10-step agent using ~2000 tokens/step = ~20,000 tokens ≈ $0.07 ≈ 7 credits. The 80-credit cap is generous headroom.
- **`retries: 1`** on agent runs — each failed+retried run deducts credits for tokens actually used.
- **Cost scale:** 5–80 credits per agent run

### Pre-Check vs Post-Deduction Split

The system uses a two-phase approach to handle dynamic costs safely:

| Phase | Where | What |
|-------|-------|------|
| **Pre-check** (reserve) | HTTP route (`/api/workflow/execute`, `/api/agents/[id]/run`) | Check user has ≥ worst-case cost (`EXECUTION_CREDIT_CAP` or `AGENT_RUN_MIN_CREDITS`). Fail fast before queuing async work. |
| **Post-deduction** (exact) | Inngest function (after execution completes) | Deduct the actual calculated cost based on real nodes/tokens used. |

This means users are never charged more than they used, but can't start work they definitely can't afford.

### Free Plan Users with Token Credits

All of the above applies equally to free-plan users who have claimed token credits. There is no difference in the deduction logic — the same `deductCredits()` function is called regardless of subscription tier. The only difference is the pre-check that bypasses the subscription gate if `credits_balance > 0`.

---

### Minimum Threshold Raw Value (6 decimals)
- `MIN_TOKEN_THRESHOLD` display = 1,000,000
- Raw bigint = `1_000_000_000_000n` (1,000,000 × 10^6)

---

## Pre-Implementation Checklist

Complete every item in this section before writing a single line of code.

---

### PRE-1 — YOU DO: Verify Your Token Mint Address

1. Open [Solana Explorer](https://explorer.solana.com) or [Solscan](https://solscan.io)
2. Search for `$RUNWISE` or paste your token mint address
3. Confirm it is on **Mainnet** (not devnet)
4. Copy the full **Mint Address** (looks like `AbCd1234...`)
5. Confirm **Decimals = 6**

**Write it here:**
- Mint Address: `7mHDBU9Jo8NwWcnJFK3W2kjLVaKV4ZNbjkyG2PqHpump`
- Decimals: `6` ✓

---

### PRE-2 — YOU DO: Create a Helius Account (Solana RPC)

The public Solana RPC endpoint is rate-limited and unreliable for production. You need a paid RPC.

1. Go to [helius.dev](https://helius.dev)
2. Create an account (free tier gives 100k requests/day — enough for early launch)
3. Create a new project → select **Mainnet**
4. Copy your **RPC URL** (looks like `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`)
5. Save this — it goes into your environment variables

RPC URL: https://mainnet.helius-rpc.com/?api-key=a02c1dcc-4b4c-4d5e-bf6e-f40e027a07fa

**When to upgrade:** Once you have more than ~200 active wallet users claiming credits daily, upgrade to the $49/month Growth plan.

---

### PRE-3 — YOU DO: Add Environment Variables

Add the following to your `.env.local` file (and to your Vercel project environment variables).

**Server-side only (never expose to client):**
```
# Solana / token identity
RUNWISE_TOKEN_MINT_ADDRESS=7mHDBU9Jo8NwWcnJFK3W2kjLVaKV4ZNbjkyG2PqHpump
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=a02c1dcc-4b4c-4d5e-bf6e-f40e027a07fa

# Token accrual model
TOKEN_TO_CREDIT_RATIO=120000
DAILY_CREDIT_CAP=200
MIN_TOKEN_THRESHOLD=1000000
MAX_ACCRUAL_DAYS=3

# Dynamic credit spend model
EXECUTION_BASE_CREDIT_COST=3
EXECUTION_CREDIT_PER_NODE=1
EXECUTION_CREDIT_CAP=25
AGENT_RUN_MIN_CREDITS=5
AGENT_RUN_CREDIT_CAP=80
GENERATION_CREDIT_CAP=20
```

**Client-safe (prefix with NEXT_PUBLIC_):**
```
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**Vercel:** Go to your Vercel project → Settings → Environment Variables → add all of these for Production, Preview, and Development. The `NEXT_PUBLIC_` variable is safe to expose. The others must never be set as `NEXT_PUBLIC_`.

**Verify locally:** Restart your dev server after adding to `.env.local`.

---

### PRE-4 — YOU DO: Run the Database Migration in Supabase

1. Go to [supabase.com](https://supabase.com) → your Runwise project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Paste the following SQL exactly and run it:

```sql
-- ============================================
-- $RUNWISE Token Holder Tables
-- Migration: token-holder-utility-v2 (linear accrual model)
-- ============================================

-- Table 1: Wallet connections
-- One wallet per user, one user per wallet (enforced by unique constraints)
-- last_claim_at: tracks when accrual period resets (NULL = never claimed, use connected_at)
CREATE TABLE IF NOT EXISTS wallet_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'solana',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified_at TIMESTAMPTZ,
  last_claim_at TIMESTAMPTZ DEFAULT NULL,
  token_balance BIGINT DEFAULT 0,
  balance_last_checked TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wallet_connections_wallet_address_unique UNIQUE (wallet_address),
  CONSTRAINT wallet_connections_user_id_unique UNIQUE (user_id)
);

-- Table 2: Credit claim history (audit trail)
-- Stores every individual claim event with full calculation context
CREATE TABLE IF NOT EXISTS token_credit_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  credits_granted INT NOT NULL,
  tokens_held_at_claim BIGINT NOT NULL,
  credits_per_day_at_claim INT NOT NULL,
  accrual_start_at TIMESTAMPTZ NOT NULL,
  accrual_hours NUMERIC(10,4) NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index: look up claims by user (for history and rate limiting)
CREATE INDEX IF NOT EXISTS idx_token_claims_user
  ON token_credit_claims (user_id, claimed_at DESC);

-- Index: look up wallet by user
CREATE INDEX IF NOT EXISTS idx_wallet_connections_user
  ON wallet_connections (user_id);

-- Row Level Security
ALTER TABLE wallet_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_credit_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only see their own rows
DROP POLICY IF EXISTS "Users can manage their own wallet" ON wallet_connections;
CREATE POLICY "Users can manage their own wallet"
  ON wallet_connections FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own claims" ON token_credit_claims;
CREATE POLICY "Users can view their own claims"
  ON token_credit_claims FOR SELECT
  USING (auth.uid() = user_id);
```

5. Click **Run** — you should see "Success. No rows returned"
6. Go to **Table Editor** and verify both `wallet_connections` and `token_credit_claims` appear

---

### PRE-5 — YOU DO: Update TypeScript Database Types

After running the SQL migration, the new tables must exist in `src/types/database.ts`.

**Option A — Supabase CLI (if set up):**
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```
*(Warning: this overwrites the whole file — only use if you normally regenerate from Supabase.)*

**Option B — Manual (your path):** ✅ **Done in repo** — `token_credit_claims` and `wallet_connections` are already defined under `Database['public']['Tables']` in `src/types/database.ts`. If you add or rename columns in Supabase later, update those blocks to match.

**Still required:** Run PRE-4 SQL in Supabase first so the live database matches these types.

---

### PRE-6 — YOU DO: Install Required npm Packages

Run the following in your project root terminal (not the running dev server — open a new terminal tab):

```bash
npm install @solana/web3.js @solana/spl-token @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-phantom tweetnacl
```

Wait for the install to complete (1–3 minutes). Peer dependency warnings can be ignored unless the install fails.

**Verify:** Check `package.json` — all 7 packages should appear in `dependencies`.

---

## Phase 1 — Solana Backend Infrastructure

**Estimated time:** 1.5 hours  
**What gets built:** Solana balance fetching, the credit calculation engine, signature verification, and DB type definitions

---

### PHASE-1A — AGENT DOES: Core Backend Libraries

Paste this prompt into the Cursor agent:

---
> **PROMPT 1A:**
>
> I am building a linear, time-based token credit system for my $RUNWISE Solana token. I need you to create the backend infrastructure files. Do not use any tier-based logic — everything is linear and continuous.
>
> **Context about the codebase:**
> - Next.js 15, Supabase (no ORM, raw Supabase JS client), TypeScript
> - Admin client is at `src/lib/supabase-admin.ts` using service role key
> - Credits system: `credits_balance` on the `users` table, 1 credit = $0.01 OpenAI spend
> - Token: Solana SPL token, 6 decimals. `RUNWISE_TOKEN_MINT_ADDRESS` and `SOLANA_RPC_URL` are server-side env vars.
>
> **Create the following files:**
>
> **1. `src/lib/solana/token-balance.ts`**
>
> Exports:
> - `TOKEN_DECIMALS = 6` (constant)
> - `getRunwiseTokenBalance(walletAddress: string): Promise<bigint>` — uses `@solana/web3.js` Connection (commitment: `'confirmed'`) and `@solana/spl-token` `getAssociatedTokenAddress` + `getAccount` to fetch the raw token balance. Returns `0n` on any error including ATA not found. Uses env vars `SOLANA_RPC_URL` and `RUNWISE_TOKEN_MINT_ADDRESS`. Never throws.
> - `toDisplayBalance(rawBalance: bigint): number` — divides raw by 10^TOKEN_DECIMALS, returns a JS number.
> - `formatDisplayBalance(rawBalance: bigint): string` — returns the display amount formatted with commas (e.g., "1,250,000").
>
> **2. `src/lib/token-gating/credit-engine.ts`**
>
> This is the single source of truth for all credit calculation logic. No tier logic — purely linear formula.
>
> Read all config from environment variables with these defaults:
> ```
> TOKEN_TO_CREDIT_RATIO = parseInt(process.env.TOKEN_TO_CREDIT_RATIO ?? '120000')
> DAILY_CREDIT_CAP = parseInt(process.env.DAILY_CREDIT_CAP ?? '200')
> MIN_TOKEN_THRESHOLD = parseInt(process.env.MIN_TOKEN_THRESHOLD ?? '1000000')  // display units
> MAX_ACCRUAL_DAYS = parseInt(process.env.MAX_ACCRUAL_DAYS ?? '3')
> ```
>
> Exports:
>
> - `getCreditConfig()` — returns all 4 config values as an object (for logging/debugging)
>
> - `getCreditsPerDay(rawBalance: bigint): number` — converts raw balance to display units (divide by 10^6), checks if below MIN_TOKEN_THRESHOLD (return 0 if so), otherwise computes `Math.floor(displayBalance / TOKEN_TO_CREDIT_RATIO)`, caps at `DAILY_CREDIT_CAP`, returns result.
>
> - `getMaxUnclaimed(creditsPerDay: number): number` — returns `creditsPerDay * MAX_ACCRUAL_DAYS`. This is the absolute maximum a user can ever accumulate.
>
> - `calculateAccruedCredits(rawBalance: bigint, accrualStartAt: Date, now: Date): { accrued: number, creditsPerDay: number, hoursElapsed: number, daysElapsed: number, cappedAt: string | null }`:
>   1. Compute `creditsPerDay = getCreditsPerDay(rawBalance)`. If 0, return accrued: 0.
>   2. Compute `hoursElapsed = (now.getTime() - accrualStartAt.getTime()) / 3600000`. Never negative (floor to 0 if somehow negative).
>   3. Compute `daysElapsed = hoursElapsed / 24`.
>   4. Cap days at `MAX_ACCRUAL_DAYS`: `effectiveDays = Math.min(daysElapsed, MAX_ACCRUAL_DAYS)`.
>   5. Compute `rawAccrued = creditsPerDay * effectiveDays`.
>   6. `accrued = Math.floor(rawAccrued)`.
>   7. Cap accrued at `getMaxUnclaimed(creditsPerDay)`.
>   8. Return `{ accrued, creditsPerDay, hoursElapsed, daysElapsed, cappedAt: daysElapsed >= MAX_ACCRUAL_DAYS ? 'max_accrual_days' : null }`.
>
> - `getMinimumTokenThresholdRaw(): bigint` — returns `BigInt(MIN_TOKEN_THRESHOLD) * BigInt(10 ** 6)`. This is the raw bigint threshold to compare against on-chain balance.
>
> **3. `src/lib/token-gating/verify-signature.ts`**
>
> Exports:
> - `verifyWalletSignature(walletAddress: string, message: string, signatureBase64: string): boolean` — uses `tweetnacl` `nacl.sign.detached.verify`. Encodes message as UTF-8 bytes. Derives public key from the base58 wallet address using `@solana/web3.js` `PublicKey`. Returns `false` on any error — never throws.
> - `buildOwnershipMessage(userId: string, timestamp: number): string` — returns: `"Connect wallet to Runwise account ${userId} at timestamp ${timestamp}. This request will expire in 5 minutes."`
> - `buildClaimMessage(userId: string, walletAddress: string, timestamp: number): string` — returns: `"Claim Runwise credits for account ${userId} wallet ${walletAddress} at timestamp ${timestamp}. This claim will expire in 5 minutes."` (separate message for claim vs connect — prevents signature replay from connect being used for claim)

---

### PHASE-1B — AGENT DOES: Update Database Types

Paste this prompt into the Cursor agent:

---
> **PROMPT 1B:**
>
> I've added two new tables to my Supabase database via SQL migration. I need you to add their TypeScript type definitions to `src/types/database.ts`.
>
> Read the current `src/types/database.ts` to understand the existing `Row` / `Insert` / `Update` pattern. Then add the following two tables into the `Tables` object inside the `public` object:
>
> **Table 1: `wallet_connections`**
> Row columns:
> - `id: string`
> - `user_id: string`
> - `wallet_address: string`
> - `chain: string`
> - `connected_at: string`
> - `last_verified_at: string | null`
> - `last_claim_at: string | null`
> - `token_balance: number`
> - `balance_last_checked: string | null`
> - `is_active: boolean`
> - `created_at: string`
> - `updated_at: string`
>
> **Table 2: `token_credit_claims`**
> Row columns:
> - `id: string`
> - `user_id: string`
> - `wallet_address: string`
> - `credits_granted: number`
> - `tokens_held_at_claim: number`
> - `credits_per_day_at_claim: number`
> - `accrual_start_at: string`
> - `accrual_hours: number`
> - `claimed_at: string`
> - `created_at: string`
>
> For `Insert` types: all fields with DB defaults (id, timestamps) are optional. For `Update` types: all fields optional. Do not change anything else in the file.

---

### PHASE-1C — VERIFY

1. Check `src/lib/solana/token-balance.ts` exists and imports from `@solana/web3.js` and `@solana/spl-token`
2. Check `src/lib/token-gating/credit-engine.ts` exists with the 4 exported functions and reads from env vars
3. Check `src/lib/token-gating/verify-signature.ts` exports both `buildOwnershipMessage` AND `buildClaimMessage`
4. Check `src/types/database.ts` has both new tables including `last_claim_at` on `wallet_connections`
5. Run `npm run build` — fix any TypeScript errors before proceeding

---

## Phase 2 — API Routes

**Estimated time:** 2.5 hours  
**What gets built:** 4 API routes — connect, status (with accrual info), claim (time-based with signature), disconnect

---

### PHASE-2A — AGENT DOES: Wallet Connect Route

Paste this prompt into the Cursor agent:

---
> **PROMPT 2A:**
>
> Create the API route `src/app/api/wallet/connect/route.ts`.
>
> **Codebase context:**
> - Auth: use `createClient` from `@/lib/supabase-server` (cookie-based SSR session)
> - Admin DB: use `createAdminClient` from `@/lib/supabase-admin` (bypasses RLS)
> - Reference `src/app/api/credits/route.ts` for the auth pattern
>
> **Route: POST /api/wallet/connect**
>
> Request body: `{ walletAddress: string, signature: string, message: string, timestamp: number }`
>
> Logic:
> 1. Authenticate via Supabase SSR client. Return 401 if not authenticated.
> 2. Validate all 4 fields present. Return 400 if any missing.
> 3. Validate `timestamp` is within 5 minutes of `Date.now()`. Return 400 `"Signature expired"` if stale.
> 4. Reconstruct expected message using `buildOwnershipMessage(user.id, timestamp)` from `@/lib/token-gating/verify-signature`. Verify it matches the `message` param **exactly**. Return 400 if mismatch.
> 5. Verify signature using `verifyWalletSignature` from `@/lib/token-gating/verify-signature`. Return 400 `"Invalid signature"` if fails.
> 6. Query `wallet_connections` by `wallet_address`. If it belongs to a **different** `user_id`, return 409 `"Wallet already connected to another account"`.
> 7. Upsert into `wallet_connections` with admin client: `user_id`, `wallet_address`, `chain: 'solana'`, `connected_at: now`, `is_active: true`, `updated_at: now`. Use `onConflict: 'user_id'` to replace any existing wallet for this user. When replacing, also reset `last_claim_at: null` (a new wallet connection resets accrual).
> 8. Return 200 `{ success: true, walletAddress }`.
>
> Wrap in try/catch, return 500 on unexpected errors. Log with `console.error`.

---

### PHASE-2B — AGENT DOES: Wallet Status Route

Paste this prompt into the Cursor agent:

---
> **PROMPT 2B:**
>
> Create the API route `src/app/api/wallet/status/route.ts`.
>
> **Route: GET /api/wallet/status**
>
> Logic:
> 1. Authenticate user via Supabase SSR client. Return 401 if not authenticated.
> 2. Query `wallet_connections` for this `user_id` using admin client. If no active row (`is_active = true`), return `{ connected: false }`.
> 3. Use the **stored** `token_balance` (not a live RPC call — status is read-only and uses cached data). Convert to bigint for calculations.
> 4. Import `calculateAccruedCredits`, `getCreditsPerDay`, `getMaxUnclaimed`, `getMinimumTokenThresholdRaw` from `@/lib/token-gating/credit-engine`.
> 5. Import `formatDisplayBalance` from `@/lib/solana/token-balance`.
> 6. Compute `accrualStartAt`:
>    - If `last_claim_at` is not null, use that as the start.
>    - If `last_claim_at` is null, use `connected_at` as the start.
> 7. Run `calculateAccruedCredits(BigInt(row.token_balance ?? 0), accrualStartAt, new Date())`.
> 8. Return:
> ```json
> {
>   "connected": true,
>   "walletAddress": "...",
>   "tokenBalanceRaw": "1000000000000",
>   "tokenBalanceDisplay": "1,000,000",
>   "eligible": true,
>   "creditsPerDay": 8,
>   "maxUnclaimed": 24,
>   "accruedCredits": 16,
>   "accrualStartAt": "2026-04-01T10:00:00.000Z",
>   "cappedAt": null,
>   "balanceLastChecked": "...",
>   "lastClaimAt": null
> }
> ```
> `eligible = token_balance >= getMinimumTokenThresholdRaw()`. `tokenBalanceRaw` as string (bigint serialization). `cappedAt` is `'max_accrual_days'` or `null`.

---

### PHASE-2C — AGENT DOES: Claim Credits Route

This is the most critical route. Paste this prompt into the Cursor agent:

---
> **PROMPT 2C:**
>
> Create the API route `src/app/api/wallet/claim-credits/route.ts`.
>
> This route implements time-based linear credit accrual. It must be fully server-side, abuse-resistant, and atomic.
>
> **Codebase context:**
> - `users.credits_balance` (number) — increment this on successful claim
> - Admin client bypasses RLS for all DB writes
> - `src/lib/credits/tracker.ts` — reference for credit balance pattern
> - `src/lib/token-gating/credit-engine.ts` — all credit math
> - `src/lib/solana/token-balance.ts` — live RPC balance fetch
> - `src/lib/token-gating/verify-signature.ts` — signature verification
>
> **Route: POST /api/wallet/claim-credits**
>
> Request body: `{ signature: string, timestamp: number }`
> (A fresh wallet signature is required on EVERY claim, not just on connect. This prevents hijacked sessions from draining credits.)
>
> Logic:
> 1. Authenticate user via Supabase SSR client. Return 401 if not authenticated.
> 2. Validate `signature` and `timestamp` are present. Return 400 if missing.
> 3. Validate `timestamp` is within 5 minutes of now. Return 400 `"Claim signature expired"` if stale.
> 4. Fetch user's `wallet_connections` row (admin client, `is_active = true`). Return 404 `"No wallet connected"` if none.
> 5. Reconstruct the expected claim message using `buildClaimMessage(user.id, walletAddress, timestamp)` from `@/lib/token-gating/verify-signature`. Verify `signature` using `verifyWalletSignature`. Return 400 `"Invalid signature"` if fails.
> 6. **Minimum claim interval check:** If `last_claim_at` is not null AND `(now - last_claim_at) < 1 hour`, return 429 with `{ error: "Claim too soon", nextClaimAt: last_claim_at + 1 hour ISO string }`. This is server-enforced — never trust client time.
> 7. Fetch **live** token balance from Solana using `getRunwiseTokenBalance(walletAddress)`. This is always a fresh RPC call.
> 8. Update `wallet_connections`: set `token_balance = Number(liveBalance)`, `balance_last_checked: now`, `last_verified_at: now`.
> 9. Compute `accrualStartAt` = `last_claim_at ?? connected_at`.
> 10. Run `calculateAccruedCredits(liveBalance, accrualStartAt, now)` from `@/lib/token-gating/credit-engine`. If `result.accrued === 0`, return 400 `{ error: "No credits accrued yet", creditsPerDay: result.creditsPerDay, hoursElapsed: result.hoursElapsed }`.
> 11. **Atomic write:** In sequence using admin client:
>     a. `INSERT INTO token_credit_claims` with: `user_id`, `wallet_address`, `credits_granted: result.accrued`, `tokens_held_at_claim: Number(liveBalance)`, `credits_per_day_at_claim: result.creditsPerDay`, `accrual_start_at: accrualStartAt.toISOString()`, `accrual_hours: result.hoursElapsed`.
>     b. `UPDATE wallet_connections SET last_claim_at = now, updated_at = now WHERE user_id = user.id`.
>     c. Fetch current `credits_balance` from `users`. Compute `newBalance = current + result.accrued`. `UPDATE users SET credits_balance = newBalance, updated_at = now WHERE id = user.id`.
>     If step (a) fails, do NOT proceed to (b) or (c). Return 500.
> 12. Return 200:
> ```json
> {
>   "success": true,
>   "creditsGranted": 16,
>   "creditsPerDay": 8,
>   "hoursAccrued": 48.2,
>   "newCreditsBalance": 91,
>   "nextClaimAvailableAt": "<now + 1 hour ISO string>"
> }
> ```
>
> Wrap entire function in try/catch. Log all errors with `console.error`. Never expose internal error details to client on 500.

---

### PHASE-2D — AGENT DOES: Wallet Disconnect Route

Paste this prompt into the Cursor agent:

---
> **PROMPT 2D:**
>
> Create the API route `src/app/api/wallet/disconnect/route.ts`.
>
> **Route: POST /api/wallet/disconnect**
>
> Logic:
> 1. Authenticate via Supabase SSR client. Return 401 if not authenticated.
> 2. Update `wallet_connections` for this `user_id`: set `is_active: false`, `updated_at: now`. (Soft delete — keep row for audit history.)
> 3. Return 200 `{ success: true }`. Return 404 if no wallet was found for this user.
>
> Note: Disconnecting does NOT remove previously claimed credits. Accrual stops from the moment of disconnect. If the user reconnects a wallet later, `last_claim_at` resets to null (accrual starts fresh from reconnect time).

---

### PHASE-2E — VERIFY

1. All 4 routes exist:
   - `src/app/api/wallet/connect/route.ts`
   - `src/app/api/wallet/status/route.ts`
   - `src/app/api/wallet/claim-credits/route.ts`
   - `src/app/api/wallet/disconnect/route.ts`
2. Test `GET /api/wallet/status` while logged in — returns `{ connected: false }`
3. Run `npm run build` — zero TypeScript errors

---

## Phase 3 — Frontend Wallet Provider Setup

**Estimated time:** 1 hour  
**What gets built:** The Solana wallet adapter provider wrapping the app

---

### PHASE-3A — AGENT DOES: Wallet Provider Component

Paste this prompt into the Cursor agent:

---
> **PROMPT 3A:**
>
> I need to set up the Solana wallet adapter provider for my Next.js 15 App Router app.
>
> **Context:**
> - Root layout is at `src/app/layout.tsx` — read it first to understand current providers
> - Installed packages: `@solana/wallet-adapter-react`, `@solana/wallet-adapter-base`, `@solana/wallet-adapter-phantom`
> - Must be a Client Component
>
> **Create** `src/components/providers/solana-wallet-provider.tsx`:
> - `"use client"` component
> - Uses `ConnectionProvider` from `@solana/wallet-adapter-react` with endpoint `process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com'`
> - Uses `WalletProvider` from `@solana/wallet-adapter-react` with `wallets={[new PhantomWalletAdapter()]}` and `autoConnect={false}`
> - Wraps `children`
> - No CSS imports — we build our own UI
>
> **Update** `src/app/layout.tsx` to wrap children with `SolanaWalletProvider`. Place it inside any existing auth/theme providers.

---

### PHASE-3B — VERIFY

1. `src/components/providers/solana-wallet-provider.tsx` exists
2. `src/app/layout.tsx` includes `SolanaWalletProvider`
3. Dev server runs without errors

---

## Phase 4 — Settings UI: Token Tab

**Estimated time:** 3 hours  
**What gets built:** A new "Token" tab in Settings with the full accrual-based wallet UI

---

### PHASE-4A — AGENT DOES: Token Holder Settings Component

Paste this prompt into the Cursor agent:

---
> **PROMPT 4A:**
>
> I need to build a `TokenHolderSettings` React component for my Runwise settings page. This uses a **linear, time-based credit accrual model** — not tiers. There are no "Holder/Supporter/Believer" tiers. Credits accrue continuously based on token balance.
>
> **Codebase context:**
> - Settings page: `src/app/settings/page.tsx` — read it for tab pattern
> - Style reference: read `src/components/ui/usage-settings.tsx` and match exactly — card layouts, headings, spacing
> - Tailwind CSS + Radix UI
> - Auth context: `useAuth` from `@/contexts/auth-context` gives `{ user, loading }`
>
> **Create** `src/components/ui/token-holder-settings.tsx`:
>
> **Data:** On mount, fetch `GET /api/wallet/status`. The response includes:
> `{ connected, walletAddress, tokenBalanceDisplay, eligible, creditsPerDay, maxUnclaimed, accruedCredits, accrualStartAt, cappedAt, lastClaimAt }`
>
> **UI States:**
>
> **State 1: Loading** — skeleton cards while fetching status
>
> **State 2: No wallet connected**
> - Heading: "Connect Your Wallet"
> - Explain: "$RUNWISE holders earn generation credits continuously based on their token balance. Connect your wallet to start accruing."
> - Formula explainer card: "Earning rate: floor(your tokens ÷ 120,000) credits per day, up to 200 per day"
> - Minimum requirement callout: "Minimum: 1,000,000 $RUNWISE to earn credits"
> - Examples table:
>   | Tokens Held | Credits/day | Max claimable |
>   |-------------|------------|---------------|
>   | 1,000,000 | 8 | 24 |
>   | 5,000,000 | 41 | 123 |
>   | 10,000,000 | 83 | 249 |
>   | 24,000,000+ | 200 (max) | 600 |
> - "Connect Phantom Wallet" button — calls `useWallet().connect()`, then `signMessage` with `buildOwnershipMessage(userId, Date.now())` from the message builder (call the backend or replicate the message format client-side: `"Connect wallet to Runwise account ${userId} at timestamp ${timestamp}. This request will expire in 5 minutes."`), then POST to `/api/wallet/connect`
>
> **State 3: Connected, below threshold (< 1,000,000 tokens)**
> - Show wallet address (truncated: first 4...last 4 chars)
> - Show current balance: "Your balance: X $RUNWISE"
> - Show how many more tokens needed: "Need Y more $RUNWISE to start earning"
> - Earning rate if they hit threshold: "At 1,000,000 tokens you'd earn 8 credits/day"
> - "Disconnect Wallet" link
>
> **State 4: Connected, eligible, has accrued credits to claim**
> - Show wallet address
> - Show balance: "X $RUNWISE"
> - Earning rate chip: "Earning X credits/day"
> - Accrual progress card: "You have **N credits** ready to claim" (large, prominent)
> - Sub-text: "Accruing since [accrualStartAt formatted as date]. Max accumulation: [maxUnclaimed] credits ([MAX_ACCRUAL_DAYS] days)"
> - If `cappedAt === 'max_accrual_days'`: show a warning banner: "You've hit the 3-day cap. Claim now to avoid losing accrual time."
> - "Claim Credits" button — opens a confirm modal OR inline step that:
>   1. Calls `useWallet().signMessage` with the claim message: `"Claim Runwise credits for account ${userId} wallet ${walletAddress} at timestamp ${Date.now()}. This claim will expire in 5 minutes."`
>   2. POSTs to `/api/wallet/claim-credits` with `{ signature: base64sig, timestamp }`
>   3. Shows loading state during the RPC + claim process
>   4. On success: shows a brief animated "+N credits" success flash, then refreshes status
> - "Disconnect Wallet" link
>
> **State 5: Connected, eligible, recently claimed (accrued = 0 or too soon)**
> - Show wallet address and balance
> - Earning rate chip
> - "No credits to claim yet" card with: "You've claimed recently. Credits are accruing at X per day. Next meaningful claim in approx. Y hours."
> - Show a small progress indicator of accrued credits since last claim (can be 0 initially)
> - "Disconnect Wallet" link
>
> **Technical requirements:**
> - Use `useWallet` from `@solana/wallet-adapter-react`
> - Signature bytes (Uint8Array) → base64: `btoa(String.fromCharCode(...new Uint8Array(sig)))`
> - Store `timestamp` as `Date.now()` at click time, use the same value for both message construction and the POST body
> - Fetch status on mount and after every action
> - All API calls: `fetch` with `credentials: 'include'`
> - Inline error display (no `alert()`)
> - Self-contained, no required props
>
> Match card/section styling exactly from `usage-settings.tsx`.

---

### PHASE-4B — AGENT DOES: Add Token Tab to Settings Page

Paste this prompt into the Cursor agent:

---
> **PROMPT 4B:**
>
> Read `src/app/settings/page.tsx`. Add a "Token" tab:
> 1. Import `TokenHolderSettings` from `@/components/ui/token-holder-settings`
> 2. Import `Coins` or `Wallet` from `lucide-react`
> 3. Add `{ id: "token", label: "Token", icon: Coins }` to the `tabs` array after the "usage" tab
> 4. Add `<Tabs.Panel id="token"><TokenHolderSettings /></Tabs.Panel>` with the other panels
>
> Do not change anything else.

---

### PHASE-4C — VERIFY

1. Navigate to `/settings?tab=token`
2. "Token" tab appears in the sidebar
3. Component renders "no wallet connected" state
4. Formula explainer and examples table are visible
5. No console errors

---

## Phase 5 — Dynamic Credit Deduction (All Plan Types)

**Estimated time:** 2 hours  
**What gets built:**
- Free plan users with token credits can bypass the subscription gate
- Workflow executions deduct credits dynamically based on actual nodes run (with retry protection)
- Agent runs deduct credits dynamically based on actual tokens used (capped to protect against runaway loops)
- AI generation gets a hard safety cap on top of existing dynamic deduction

---

### PHASE-5A — AGENT DOES: Free Plan Override + Pre-Execution Credit Gate

Paste this prompt into the Cursor agent:

---
> **PROMPT 5A:**
>
> I need to make two targeted changes to allow free-plan users with token-holder credits to use the platform, and to add a pre-execution credit check for all users.
>
> **Context:**
> - `users.credits_balance` — the credit balance column
> - `checkCreditsAvailable(userId, amount)` and `deductCredits(userId, amount, reason, metadata)` are in `src/lib/credits/tracker.ts`
> - `createAdminClient` from `@/lib/supabase-admin`
> - **Pre-check amount for executions:** read `parseInt(process.env.EXECUTION_CREDIT_CAP ?? '25')` — this is the worst-case cost. We check they can afford the worst case before queuing async work. Actual deduction happens in Inngest after execution (a separate phase).
>
> **Change 1: `src/app/api/workflow/execute/route.ts`**
>
> Read the full file first. Currently free users are **always** blocked with a 402 based on `subscription_tier === 'free'`. Make these changes:
>
> 1. Before the 402 block for free users, fetch `users.credits_balance` via admin client.
> 2. If `credits_balance >= EXECUTION_CREDIT_CAP` (worst-case reserve), allow the request through — skip the 402 entirely.
> 3. If `credits_balance > 0` but `< EXECUTION_CREDIT_CAP`, also allow through — they may be able to afford a small execution (actual cost is calculated post-run). The post-execution deduction in Inngest will handle the exact amount.
> 4. If `credits_balance === 0`, keep the existing 402 block unchanged.
>
> For **all** users (free and paid), after the Inngest `send()` call succeeds, add a comment: `// Credit deduction happens post-execution in Inngest workflowExecutor — see src/inngest/functions.ts`
>
> Do NOT add any `deductCredits` call in this HTTP route — deduction is handled in Inngest.
>
> **Change 2: `src/app/api/ai/generate-workflow/route.ts`**
>
> Read the full file first. Currently free users are blocked if `has_used_free_action === true`. Add a bypass:
> - If `has_used_free_action === true` AND `credits_balance > 0`, allow through (token holder credits override the free gate).
> - The existing credit deduction logic later in the file already handles charging for generation — leave that intact.
> - Add a safety cap: after the existing `creditsUsed` calculation, also enforce: `creditsUsed = Math.min(creditsUsed, parseInt(process.env.GENERATION_CREDIT_CAP ?? '20'))`. This prevents an unexpectedly large prompt from draining the balance in one shot.
>
> **Important:** Read both files fully before editing. Do not break any existing paid-user logic. Changes are additive.

---

### PHASE-5B — AGENT DOES: Dynamic Workflow Execution Credit Deduction (Inngest)

Paste this prompt into the Cursor agent:

---
> **PROMPT 5B:**
>
> I need to add dynamic, post-execution credit deduction to the `workflowExecutor` Inngest function in `src/inngest/functions.ts`.
>
> **Read `src/inngest/functions.ts` fully first.** Then read `src/lib/credits/tracker.ts` to understand `deductCredits` and `checkCreditsAvailable`.
>
> **Context — how cost is calculated:**
> ```
> EXECUTION_BASE = parseInt(process.env.EXECUTION_BASE_CREDIT_COST ?? '3')
> EXECUTION_PER_NODE = parseInt(process.env.EXECUTION_CREDIT_PER_NODE ?? '1')
> EXECUTION_CAP = parseInt(process.env.EXECUTION_CREDIT_CAP ?? '25')
>
> nodesExecuted = executionResult.nodeResults.length  // actual nodes that ran
> cost = Math.min(EXECUTION_BASE + (nodesExecuted * EXECUTION_PER_NODE), EXECUTION_CAP)
> ```
>
> **Why per-node and capped?** Workflow nodes use the user's own OpenAI integration key — Runwise doesn't pay OpenAI for those calls. The credit charge covers Inngest infrastructure cost (per function invocation + per step). The cap protects against large workflows over-charging. Each retry attempt by Inngest (the function has `retries: 3`) charges the base cost again — this is intentional and fair since each retry consumes infrastructure.
>
> **What to add to `workflowExecutor`:**
>
> After the existing "Step 4: Increment usage" (`increment-usage` step), add a new Inngest step: **"Step 5: Deduct execution credits"** (`deduct-execution-credits`):
>
> ```
> await step.run("deduct-execution-credits", async () => {
>   // Calculate dynamic cost
>   const nodesExecuted = executionResult.nodeResults?.length ?? 0
>   const cost = Math.min(EXECUTION_BASE + (nodesExecuted * EXECUTION_PER_NODE), EXECUTION_CAP)
>
>   // Always deduct — applies to free-tier token holders and paid users alike
>   const deduction = await deductCredits(
>     userId,
>     cost,
>     'workflow_execution',
>     { workflowId, executionId: executionResult.executionId, nodesExecuted }
>   )
>
>   if (!deduction.success) {
>     // Log but do not throw — execution already completed, we can't undo it.
>     // The pre-check in the HTTP route is the primary guard.
>     console.warn(`[Credits] Failed to deduct ${cost} credits for execution ${workflowId}:`, deduction.error)
>   }
>
>   return { cost, nodesExecuted, newBalance: deduction.newBalance }
> })
> ```
>
> Import `deductCredits` from `@/lib/credits/tracker` at the top of `functions.ts`. Do not add a `checkCreditsAvailable` call here — the pre-check already happened in the HTTP route. If they're out of credits, we log and move on; we do not fail the execution retroactively.

---

### PHASE-5C — AGENT DOES: Dynamic Agent Run Credit Deduction (Inngest)

Paste this prompt into the Cursor agent:

---
> **PROMPT 5C:**
>
> I need to add dynamic, token-based credit deduction to the `agentRun` Inngest function in `src/inngest/functions.ts`.
>
> **Context — why this is the most important one:** Agent runs call `process.env.OPENAI_API_KEY` directly in `src/lib/agents/runtime.ts`. Every GPT-4o call in the agent loop is billed to Runwise. The `runAgentLoop` function already tracks `totalTokens` and returns it as `result.tokensUsed`. We must charge for this real cost.
>
> **Read `src/inngest/functions.ts` fully** (particularly the `agentRun` function). **Read `src/lib/credits/calculator.ts`** — specifically `estimateAgentRunCredits(totalTokens)` and `AGENT_RUN_MIN_CREDITS`. **Read `src/lib/credits/tracker.ts`** for `deductCredits` and `checkCreditsAvailable`.
>
> **Cost calculation:**
> ```
> AGENT_MIN = parseInt(process.env.AGENT_RUN_MIN_CREDITS ?? '5')
> AGENT_CAP = parseInt(process.env.AGENT_RUN_CREDIT_CAP ?? '80')
>
> rawCost = estimateAgentRunCredits(result.tokensUsed)  // from calculator.ts
> cost = Math.min(rawCost, AGENT_CAP)
> cost = Math.max(cost, 1)  // always charge at least 1 credit even for trivial runs
> ```
>
> **What to add to `agentRun`:**
>
> **1. Pre-run credit check** — add BEFORE the `step.run("run-agent-loop", ...)` call:
>
> ```
> await step.run("check-agent-credits", async () => {
>   const { checkCreditsAvailable } = await import('@/lib/credits/tracker')
>   const check = await checkCreditsAvailable(userId, AGENT_MIN)
>   if (!check.available) {
>     throw new Error(`Insufficient credits to run agent. Need at least ${AGENT_MIN} credits, have ${check.balance}.`)
>   }
>   return { creditsAvailable: check.balance }
> })
> ```
>
> This throws and fails the Inngest job (with the error visible in the dashboard) before the agent runs at all.
>
> **2. Post-run credit deduction** — add AFTER the existing `step.run("run-agent-loop", ...)` and after the `if (!result.success)` throw block:
>
> ```
> await step.run("deduct-agent-credits", async () => {
>   const { deductCredits } = await import('@/lib/credits/tracker')
>   const { estimateAgentRunCredits } = await import('@/lib/credits/calculator')
>
>   const rawCost = estimateAgentRunCredits(result.tokensUsed ?? 0)
>   const cost = Math.max(1, Math.min(rawCost, AGENT_CAP))
>
>   const deduction = await deductCredits(
>     userId,
>     cost,
>     'agent_run',
>     { agentId, tokensUsed: result.tokensUsed, actionsCount: result.actionsCount }
>   )
>
>   if (!deduction.success) {
>     console.warn(`[Credits] Failed to deduct ${cost} agent run credits for user ${userId}:`, deduction.error)
>   }
>
>   return { cost, tokensUsed: result.tokensUsed, newBalance: deduction.newBalance }
> })
> ```
>
> Use dynamic imports for the credit functions (already a pattern in this file with `import('@/lib/agents/runtime')`).
>
> Do not modify `runAgentLoop` in `src/lib/agents/runtime.ts` — all credit logic stays in the Inngest layer.

---

### PHASE-5D — VERIFY

1. Manually set a free-plan test user's `credits_balance` to 50 in Supabase Table Editor, `has_used_free_action` to `true`
2. Generate a workflow — should succeed, credits deducted (check `credit_usage_logs` for `workflow_generation` entry)
3. Execute a workflow with ~3 nodes — should succeed; check `credit_usage_logs` for `workflow_execution` entry with cost of `3 + (3 × 1) = 6 credits`
4. Run an agent — should first check credits, then after completion deduct based on token usage; check `credit_usage_logs` for `agent_run` entry
5. Set `credits_balance` to 0, try executing — should be allowed through the HTTP route (balance was 0 already blocked from the pre-check), but confirm the Inngest log shows the warning and execution still completes
6. Set `credits_balance` to 2 (below `AGENT_RUN_MIN_CREDITS`), try running an agent — should fail in Inngest at the `check-agent-credits` step with "Insufficient credits" error visible in Inngest dashboard

---

## Phase 6 — Security Hardening

**Estimated time:** 45 minutes  
**What gets built:** Rate limiting on all wallet API endpoints

---

### PHASE-6A — AGENT DOES: Rate Limiting

Paste this prompt into the Cursor agent:

---
> **PROMPT 6A:**
>
> I need to add rate limiting to my wallet API routes.
>
> **Context:** Next.js 15 App Router, no existing rate limiting library. Use in-memory rate limiting (appropriate for single-instance; upgrade to Redis if multi-instance later).
>
> **Create** `src/lib/rate-limiter.ts`:
> - Export `createRateLimiter({ windowMs: number, maxRequests: number })` returning a function `checkLimit(identifier: string): { allowed: boolean, retryAfter?: number }`
> - Internally use a `Map<string, { count: number, resetAt: number }>`. Auto-clean expired entries on each call (delete entries where `resetAt < Date.now()`).
> - `retryAfter` = seconds until the window resets
>
> **Apply to these routes (add check immediately after auth check, using `user.id` as identifier):**
>
> 1. `src/app/api/wallet/connect/route.ts` — 5 attempts per 15 minutes
> 2. `src/app/api/wallet/claim-credits/route.ts` — 10 attempts per hour (belt-and-suspenders; the 1-hour minimum interval in the route logic is the primary guard)
> 3. `src/app/api/wallet/status/route.ts` — 60 requests per minute
>
> Return 429 `{ error: "Too many requests", retryAfter: N }` on limit exceeded.

---

### PHASE-6B — VERIFY

1. Rapidly hit `GET /api/wallet/status` 60+ times in a minute — should get 429
2. Try `POST /api/wallet/connect` 6 times quickly — rate limited on 6th

---

## Phase 7 — End-to-End Testing

**Estimated time:** 1 hour

---

### PHASE-7A — YOU DO: Full Flow Test

Use your Phantom wallet and a Runwise account (free plan preferred for testing override logic).

**Checklist:**

- [ ] Navigate to `/settings?tab=token`
- [ ] "Token" tab appears
- [ ] Formula explainer and examples table visible
- [ ] Click "Connect Phantom Wallet" — Phantom opens, sign the connection message
- [ ] UI transitions to connected state showing wallet address
- [ ] Balance displays correctly (verify against Solscan)
- [ ] If balance < 1,000,000: shows "below threshold" state with tokens needed
- [ ] If balance ≥ 1,000,000: shows earning rate (credits/day) and accrued amount
- [ ] Click "Claim Credits" — Phantom prompts to sign the **claim** message (different from connect)
- [ ] On success: credits flash animation shows, `users.credits_balance` increases in Supabase
- [ ] `token_credit_claims` table has a new row with correct `accrual_hours`, `credits_per_day_at_claim`
- [ ] Try claiming again immediately — gets 429 "Claim too soon" (1-hour minimum enforced)
- [ ] As a free user with > 0 credits: generate a workflow — succeeds, credits deducted
- [ ] Execute a workflow — succeeds, 10 credits deducted
- [ ] Check `credit_usage_logs` for both `workflow_generation` and `workflow_execution` entries

---

### PHASE-7B — YOU DO: Edge Case Tests

- [ ] Wait 3+ days (or manually set `last_claim_at` to 3 days ago in Supabase), claim — should cap at `creditsPerDay * 3`
- [ ] Set `token_balance` manually to a high value but `last_claim_at` to 1 hour ago — claim should be blocked (too soon)
- [ ] Disconnect wallet → is_active = false, UI shows disconnected
- [ ] Reconnect same wallet — `last_claim_at` resets to null, accrual restarts from now
- [ ] Try connecting a wallet already linked to another account — 409 error
- [ ] Reduce credits to 0, try executing — 402 insufficient credits
- [ ] With 5 credits (less than 10 required for execution), try executing — 402

---

## Phase 8 — Dashboard Credit Balance Display

**Estimated time:** 1 hour

---

### PHASE-8A — AGENT DOES: Credits & Accrual Badge in Sidebar/Dashboard

Paste this prompt into the Cursor agent:

---
> **PROMPT 8A:**
>
> I want users to see their token holder earnings status at a glance without going to the settings page.
>
> **What to build:**
>
> 1. Read `src/components/ui/collapsible-sidebar.tsx` to understand the sidebar structure.
>
> 2. If there is a user profile section or bottom area in the sidebar, add a compact token indicator:
>    - If wallet connected + eligible: show a small green dot labeled "Earning X credits/day" with a subtle accrual counter
>    - If no wallet or ineligible: show nothing (do not nag the user)
>
> 3. Fetch from `GET /api/wallet/status` on mount. Cache in local component state — no polling. Show nothing while loading.
>
> 4. If the sidebar is complex and would require large refactoring, instead add a new section to the **top** of `src/components/ui/usage-settings.tsx` showing:
>    - Token wallet status: connected wallet address (truncated) + earning rate
>    - Current accrued credits ready to claim (with a "Claim" quick-link to `/settings?tab=token`)
>
> Choose whichever approach is cleaner. Prioritize non-disruptive placement.

---

## Phase 9 — Production Deployment

**Estimated time:** 30 minutes

---

### PHASE-9A — YOU DO: Vercel Environment Variables

Go to Vercel → your Runwise project → Settings → Environment Variables. Add/verify for **Production**:

| Variable | Value | Visibility |
|----------|-------|-----------|
| `RUNWISE_TOKEN_MINT_ADDRESS` | your mint address | Server only |
| `SOLANA_RPC_URL` | Helius RPC URL | Server only |
| `TOKEN_TO_CREDIT_RATIO` | `120000` | Server only |
| `DAILY_CREDIT_CAP` | `200` | Server only |
| `MIN_TOKEN_THRESHOLD` | `1000000` | Server only |
| `MAX_ACCRUAL_DAYS` | `3` | Server only |
| `EXECUTION_BASE_CREDIT_COST` | `3` | Server only |
| `EXECUTION_CREDIT_PER_NODE` | `1` | Server only |
| `EXECUTION_CREDIT_CAP` | `25` | Server only |
| `AGENT_RUN_MIN_CREDITS` | `5` | Server only |
| `AGENT_RUN_CREDIT_CAP` | `80` | Server only |
| `GENERATION_CREDIT_CAP` | `20` | Server only |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | Public (NEXT_PUBLIC_ prefix) |

Redeploy after adding variables.

---

### PHASE-9B — YOU DO: Monitor Helius Quota

- Free tier: 100,000 requests/day
- Each claim = 1 RPC call. Status page = 0 (uses cached balance). Connect = 0.
- At 1,000 active users claiming daily = 1,000 RPC calls/day — well within free tier
- Upgrade to Helius Growth ($49/month) at ~50,000 active daily claimers

---

### PHASE-9C — YOU DO: Set OpenAI Budget Alert

1. Log into [platform.openai.com](https://platform.openai.com)
2. Go to Settings → Billing → Usage limits
3. Set monthly soft limit at **$100** and hard limit at **$300**

---

## Post-Launch Monitoring

### What to Watch in Supabase

```sql
-- Credits accrued today (rough cost exposure estimate)
SELECT
  COUNT(DISTINCT user_id) as claimers,
  SUM(credits_granted) as total_credits,
  SUM(credits_granted) * 0.01 as estimated_openai_cost_usd
FROM token_credit_claims
WHERE claimed_at >= NOW() - INTERVAL '24 hours';

-- Active wallets and their earning rates
SELECT
  wallet_address,
  token_balance / 1000000 as display_balance,
  FLOOR((token_balance / 1000000) / 120000) as credits_per_day
FROM wallet_connections
WHERE is_active = true
  AND token_balance >= 1000000000000  -- min threshold raw
ORDER BY token_balance DESC
LIMIT 50;

-- Total credits granted this month vs executions cost estimate
SELECT
  SUM(credits_granted) as total_granted,
  SUM(credits_granted) * 0.01 as generation_cost_usd
FROM token_credit_claims
WHERE claimed_at >= DATE_TRUNC('month', NOW());

-- Worst case daily cap exposure
-- (if N users all hit the 200/day cap)
SELECT
  COUNT(*) as eligible_wallets,
  COUNT(*) * 200 as max_credits_per_day,
  COUNT(*) * 200 * 0.01 as max_openai_cost_per_day_usd
FROM wallet_connections
WHERE is_active = true
  AND token_balance >= 1000000000000;
```

---

## Files Created / Modified — Complete Reference

### New Files (Agent Creates)
| File | Phase | Purpose |
|------|-------|---------|
| `src/lib/solana/token-balance.ts` | 1A | Solana RPC balance fetch + display helpers |
| `src/lib/token-gating/credit-engine.ts` | 1A | Linear accrual math, all config, caps |
| `src/lib/token-gating/verify-signature.ts` | 1A | Wallet signature verification (connect + claim messages) |
| `src/lib/rate-limiter.ts` | 6A | In-memory rate limiting |
| `src/app/api/wallet/connect/route.ts` | 2A | Wallet ownership proof + upsert |
| `src/app/api/wallet/status/route.ts` | 2B | Accrual status read (no RPC call) |
| `src/app/api/wallet/claim-credits/route.ts` | 2C | Time-based claim with live RPC + signature |
| `src/app/api/wallet/disconnect/route.ts` | 2D | Soft wallet disconnect |
| `src/components/providers/solana-wallet-provider.tsx` | 3A | Phantom wallet adapter |
| `src/components/ui/token-holder-settings.tsx` | 4A | Full settings UI (accrual model) |

### Modified Files (Agent Modifies)
| File | Phase | Change |
|------|-------|--------|
| `src/types/database.ts` | 1B | Add wallet_connections + token_credit_claims types |
| `src/app/layout.tsx` | 3A | Wrap with SolanaWalletProvider |
| `src/app/settings/page.tsx` | 4B | Add Token tab + panel |
| `src/app/api/workflow/execute/route.ts` | 5A | Free plan override via credits_balance check |
| `src/app/api/ai/generate-workflow/route.ts` | 5A | Free plan credit bypass + generation cap |
| `src/inngest/functions.ts` | 5B, 5C | Dynamic deduction steps in workflowExecutor + agentRun |
| `src/components/ui/collapsible-sidebar.tsx` OR `usage-settings.tsx` | 8A | Token earning status badge |

### Database Changes (You Run in Supabase)
| Table | Phase | Purpose |
|-------|-------|---------|
| `wallet_connections` | PRE-4 | Wallet + accrual state (`last_claim_at` column) |
| `token_credit_claims` | PRE-4 | Full claim audit trail with accrual context |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| User sells tokens between accrual and claim | Live RPC balance check at claim time — calculation uses live balance |
| User claims, sells, reconnects to re-accrue | Reconnect resets `last_claim_at` to null — they start fresh, no backdating |
| Wallet splitting (spreading tokens across wallets) | One wallet per account enforced by `UNIQUE(user_id)`. They can't double-dip. |
| Same wallet on multiple accounts | `UNIQUE(wallet_address)` DB constraint |
| Rapid sequential claims | 1-hour minimum interval enforced server-side via `last_claim_at` check |
| Concurrent duplicate claim requests | Race condition safe: DB write is sequential, `last_claim_at` update prevents second claim within 1 hour |
| Fake/replayed connect signature used for claim | Separate message format for connect vs claim — `buildClaimMessage` ≠ `buildOwnershipMessage` |
| Timestamp spoofing | Server always uses `new Date()` — client-provided timestamp only validated within ±5 min window |
| Uncapped credit accumulation | `MAX_ACCRUAL_DAYS = 3` enforced in `calculateAccruedCredits` — mathematically impossible to exceed |
| **Workflow retry drain** (`retries: 3` in Inngest) | Each retry charges `EXECUTION_BASE_CREDIT_COST` — intentionally discourages broken workflows hammering infrastructure |
| **Runaway agent loops** | `max_steps` cap (default 10) in agent + `AGENT_RUN_CREDIT_CAP = 80` ensures max $0.80 OpenAI cost per run |
| **Large generation prompt drain** | `GENERATION_CREDIT_CAP = 20` enforced on top of actual token count — single generation can never cost more than 20 credits |
| Flat fee abuse (cheap vs expensive executions) | Cost is dynamic: `base + nodesExecuted × perNode` — heavy users pay proportionally more |
| Free user running agent with 0 credits | Pre-run check in Inngest `check-agent-credits` step throws before any OpenAI call is made |
| OpenAI cost spike from agents | `AGENT_RUN_CREDIT_CAP = 80` caps per-run cost + OpenAI hard limit at $300/month |
| Helius RPC downtime | `getRunwiseTokenBalance` returns `0n` on any error → claim is blocked → user retries |
| Config misconfiguration | All config vars have hardcoded defaults — system remains safe even if env vars are missing |

---

## Prompt Order Summary (Quick Reference)

| Prompt | Phase | What It Does |
|--------|-------|-------------|
| **1A** | Phase 1 | Creates `token-balance.ts`, `credit-engine.ts`, `verify-signature.ts` |
| **1B** | Phase 1 | Adds DB types to `database.ts` |
| **2A** | Phase 2 | Creates `/api/wallet/connect` (signature verify + upsert) |
| **2B** | Phase 2 | Creates `/api/wallet/status` (accrual info, no RPC) |
| **2C** | Phase 2 | Creates `/api/wallet/claim-credits` (live RPC + claim signature + atomic write) |
| **2D** | Phase 2 | Creates `/api/wallet/disconnect` |
| **3A** | Phase 3 | Creates wallet provider + updates layout |
| **4A** | Phase 4 | Creates `TokenHolderSettings` UI (accrual-based, 5 states) |
| **4B** | Phase 4 | Adds Token tab to settings page |
| **5A** | Phase 5 | Free plan credit bypass in HTTP routes + generation cap |
| **5B** | Phase 5 | Dynamic workflow execution deduction in `functions.ts` (post-run, node-based) |
| **5C** | Phase 5 | Pre-run credit gate + dynamic agent run deduction in `functions.ts` (token-based) |
| **6A** | Phase 6 | Rate limiting on wallet routes |
| **8A** | Phase 8 | Token earning badge in sidebar/dashboard |

---

*Total: 12 agent prompts + 8 manual YOU DO steps + verification checkpoints at each phase.*
