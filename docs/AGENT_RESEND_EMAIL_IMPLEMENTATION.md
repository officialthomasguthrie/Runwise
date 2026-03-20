# Agent-scoped email via Resend (platform-owned account)

This document describes how to add **per-agent outbound email** using **your own Resend account** (single API key, platform-paid), **without** requiring users to connect Resend. It also keeps **Gmail** as an option for “send from the user’s inbox.”

**Related code today**

- Agents are **user-owned** (`user_id` on `agents`). See `src/lib/agents/types.ts`.
- Outbound Gmail today: `send_email_gmail` in `src/lib/agents/tools.ts` (uses user’s Google OAuth via `getGoogleAccessToken(context.userId, …)`).
- Questionnaire / clarification: `src/lib/ai/clarification.ts` (multi-round rules: no conditional phrasing in round 1; follow-ups in round 2).

---

## Goals

1. **Platform Resend**: One `RESEND_API_KEY` in server env; you pay Resend; users do **not** connect Resend.
2. **Per-agent sender identity**: e.g. `agent-<uuid>@agents.yourdomain.com` (or similar), stored on the agent (or a side table).
3. **Coexist with Gmail**: If the user connects Gmail, they can still send via `send_email_gmail`; new tool or branch for **agent Resend** send.
4. **Questionnaire**: When the planned agent **sends email**, the AI should clarify: **send from user’s email (Gmail)** vs **dedicated agent address (Resend)** — using **round 2** follow-up if round 1 already established that email is involved (per `clarification.ts` rules).

---

## Non-goals (initially)

- Inbound mail parsing / full mailbox per agent (can be a later phase via Resend inbound webhooks).
- Users bringing their own Resend API keys (optional future).

---

## Architecture summary

| Concern | Approach |
|--------|----------|
| **Auth** | Server-only `RESEND_API_KEY`; never expose to client. |
| **Identity** | Unique `from` per agent on a domain you verify in Resend. |
| **Data** | New columns or `agent_email_identities` table linked to `agent_id`. |
| **Runtime** | New tool e.g. `send_email_resend` that reads agent row + platform key; **no** user OAuth. |
| **Gmail** | Unchanged; planner/tools continue to use `google-gmail` when user connects Google. |

---

## Phase 0 — Resend dashboard & DNS (manual)

**You do this outside the repo.**

1. Create a Resend account (your org).
2. Add and verify a **sending domain** (e.g. `agents.runwise.ai` or a subdomain of your main site).
3. Complete **SPF / DKIM** (and ideally **DMARC**) for that domain.
4. Create an API key with permission to send; store as `RESEND_API_KEY` in:
   - Local `.env.local`
   - Production host (Vercel / etc.)
5. Decide the **address pattern**, e.g.:
   - `agent-{shortId}@agents.runwise.ai`, or
   - `{slug}-{uuid-prefix}@agents.runwise.ai`
6. (Optional) Configure **Resend webhooks** for delivery events later.

**Prompt to use (optional — for documentation only):**

```text
Document in README or .env.example:
RESEND_API_KEY=re_...
RESEND_FROM_DOMAIN=agents.runwise.ai
RESEND_FROM_LOCAL_PART_PREFIX=agent
```

---

## Phase 1 — Database

**Add persistence for agent Resend identity.**

Options (pick one):

**A. Columns on `agents` (simplest)**

- `email_sending_mode`: `'none' | 'user_gmail' | 'agent_resend' | 'both'` (or enum in DB)
- `resend_from_email`: `text | null` (full address)
- `resend_from_name`: `text | null` (display name)
- `resend_provisioned_at`: `timestamptz | null`

**B. Table `agent_email_identities` (cleaner if you add more later)**

- `id`, `agent_id`, `user_id` (owner), `from_email`, `from_name`, `provider` (`'resend'`), `created_at`
- Unique constraint on `from_email`

**Migration**

- Add SQL under `database/migrations/`.
- Update generated types in `src/types/database.ts` (or your codegen flow).

**Prompt for implementation:**

```text
Implement Phase 1 of docs/AGENT_RESEND_EMAIL_IMPLEMENTATION.md.

Add a Supabase migration for agent Resend email identity (choose columns on agents OR new table as described in the doc). Update TypeScript types in src/types/database.ts to match. Do not implement sending yet.

After: summarize schema and any RLS policies if the table is user-facing from the client.
```

---

## Phase 2 — Environment & config module

**Files (suggested)**

- `src/lib/email/resend.ts` — thin wrapper: `sendResendEmail({ from, to, subject, html, text, replyTo })` using `resend` npm package or `fetch` to Resend API.
- `src/lib/email/agent-address.ts` — pure functions: `buildAgentFromAddress(agentId, domain)`, validate uniqueness.

**Env vars**

- `RESEND_API_KEY` (required for send)
- `RESEND_FROM_DOMAIN` (verified domain)
- Optional: `RESEND_DEFAULT_FROM_NAME=Runwise Agents`

**Prompt:**

```text
Implement Phase 2 of docs/AGENT_RESEND_EMAIL_IMPLEMENTATION.md.

1. Add src/lib/email/resend.ts using the official Resend SDK or fetch, reading RESEND_API_KEY from process.env.
2. Add src/lib/email/agent-address.ts to build deterministic from addresses from agent id + RESEND_FROM_DOMAIN.
3. Add RESEND_* to .env.example with comments (no real secrets).
4. Export types for send payload and errors.

Run TypeScript check. No API routes yet.
```

---

## Phase 3 — Provision identity when agent is created/updated

**When to provision**

- On **deploy/finalize** of an agent whose plan says **agent Resend** mode (see Phase 5), or when user toggles in settings later.
- Idempotent: if `resend_from_email` already set, skip.

**Logic**

1. Generate `from_email` + optional `from_name` (agent name).
2. Persist to DB.
3. **No separate “Resend account per agent”** — you only store the address string; Resend sends as long as domain is verified.

**Prompt:**

```text
Implement Phase 3 of docs/AGENT_RESEND_EMAIL_IMPLEMENTATION.md.

When an agent is inserted or updated with email_sending_mode including agent_resend:
- Compute and save resend_from_email (and from_name) using agent-address helpers.
- Make provisioning idempotent.
- Wire this into the existing agent deploy path (find where agents are created from the builder — e.g. API routes under src/app/api/agents/).

Do not add the send tool yet if Phase 4 is separate; at minimum persist fields.
```

---

## Phase 4 — Agent tool: `send_email_resend`

**Behaviour**

- Tool name e.g. `send_email_resend` (parallel to `send_email_gmail` in `src/lib/agents/tools.ts`).
- **Parameters**: `to`, `subject`, `body` (and optional `html`, `replyTo`).
- **Context**: `agentId` + `userId` from `AgentRunContext`.
- Load agent row; verify `resend_from_email` exists; call Resend with `from: resend_from_email`.
- If mode is wrong or missing, return a clear error (“Agent not configured for platform email”).

**Security**

- Rate limit per agent/user (optional first pass: log + soft cap in code).
- Never pass user-controlled `from` without verifying it matches stored agent identity.

**Prompt:**

```text
Implement Phase 4 of docs/AGENT_RESEND_EMAIL_IMPLEMENTATION.md.

1. Add send_email_resend to AGENT_TOOLS in src/lib/agents/tools.ts (mirror send_email_gmail structure).
2. Implement executeAgentTool branch: load agent by context.agentId, check resend fields, call src/lib/email/resend.ts.
3. Register the tool in runtime if needed (same file / runtime.ts patterns).

Add minimal unit or manual test notes in the PR description.
```

### Phase 4 — Manual test notes (PR / QA)

1. **Prereqs:** DB migration (Phase 1), `RESEND_API_KEY`, `RESEND_FROM_DOMAIN`, agent with `email_sending_mode` `agent_resend` or `both` and provisioned `resend_from_email` (Phase 3).
2. **Happy path:** Trigger an agent run that calls `send_email_resend` with `to` / `subject` / `body`; confirm delivery in Resend dashboard and inbox.
3. **HTML:** Same with optional `html` and short `body` as plain-text alternative.
4. **Misconfigured agent:** `email_sending_mode` `none` or `user_gmail` only → tool returns error mentioning platform email / Gmail (no Resend call).
5. **Missing address:** Mode allows Resend but `resend_from_email` null → clear provision error string.
6. **Rate limit:** Fire &gt;30 sends in ~1 minute for the same agent → expect rate-limit error from the tool (in-process cap; resets per minute window).

---

## Phase 5 — Planner & capabilities: when to require Gmail vs Resend

**Intent**

- If user wants **“from my email”** → need **`google-gmail`** integration + `send_email_gmail`.
- If user wants **agent address** → need **Resend fields provisioned** + `send_email_resend` (no Gmail required for *sending* from that address).

**Files to touch (typical)**

- `src/lib/agents/planner.ts` — instructions/examples for the model.
- `src/lib/agents/capabilities-spec.ts` — optional new “capability” or document that Resend is platform-provided.
- `src/lib/agents/chat-pipeline.ts` — integration checklist: Gmail still listed for user inbox; add note that platform email doesn’t use OAuth.

**Prompt:**

```text
Implement Phase 5 of docs/AGENT_RESEND_EMAIL_IMPLEMENTATION.md.

Update planner and capability mapping so that:
- Sending from user Gmail still requires google-gmail and send_email_gmail.
- Sending from dedicated agent address uses send_email_resend and does NOT require Gmail for that path.
- Deployed agent instructions mention which sender applies based on user choice.

Search for send_email_gmail and duplicate patterns carefully.
```

---

## Phase 6 — Questionnaire & clarification (your product ask)

**Requirement**

> If the agent sends emails, ask something like: send from **your own email** vs **an address specific to the agent** — without removing Gmail.

**How this fits `clarification.ts`**

- **Round 1**: If the user says they want email sending but hasn’t chosen *whose* address, you may ask a **single_choice** with options like:
  - “My Gmail (I’ll connect Google)”
  - “A dedicated address for this agent (Runwise-provided)”
- **Do not** use conditional wording in one question (“If you chose Gmail…”) — that’s forbidden in round 1.
- **Round 2**: After they pick, ask follow-ups (e.g. “What display name for the agent address?”) as **direct** questions.

**Implementation**

1. Extend the system prompt in `analyzeClarificationNeeds` (`src/lib/ai/clarification.ts`) under **AGENT-SPECIFIC ANALYSIS CHECKLIST** with:
   - **EMAIL SENDER**: If outbound email is needed, determine whether the user wants **user mailbox (Gmail)** vs **dedicated agent address (platform Resend)** — use round 1 single_choice when both are relevant; otherwise defer detail to round 2.
2. Optionally add a **keyword hint** in the same file or in `mergeQuestionnaireIntoPrompt` / `buildEnrichedPrompt` so the **deploy planner** sees the choice in `USER-CONFIRMED DETAILS`.
3. Map questionnaire answer → `email_sending_mode` (and/or `initialRules`) when building `DeployAgentPlan` (see `src/lib/agents/types.ts` — you may add `emailSendingMode` to the plan type).

**Prompt:**

```text
Implement Phase 6 of docs/AGENT_RESEND_EMAIL_IMPLEMENTATION.md.

1. Update src/lib/ai/clarification.ts so that when email sending is involved, the model asks (round 1 single_choice when appropriate) whether to use the user's Gmail vs a dedicated agent address via platform Resend. Follow existing NO CONDITIONAL IN ROUND 1 rules; use round 2 for dependent details.
2. Thread the answer into the enriched prompt / DeployAgentPlan (extend types in src/lib/agents/types.ts if needed).
3. Ensure Gmail connection flow is unchanged for the Gmail path.

Do not remove or break send_email_gmail.
```

---

## Phase 7 — UI (optional but recommended)

- **Agent settings**: read-only display of **agent from address** when in Resend mode.
- **Integration card**: clarify “Gmail — send from your inbox” vs “Agent email — provided by Runwise” (copy only).

**Prompt:**

```text
Implement Phase 7 of docs/AGENT_RESEND_EMAIL_IMPLEMENTATION.md.

Update agent settings or deploy summary UI to show:
- email_sending_mode
- resend_from_email when applicable
Short copy that Gmail is optional for user-owned send, and agent address is platform-managed.

Use existing components patterns under src/components/ui/agent-*.
```

---

## Phase 8 — Inbound (Resend inbound webhooks)

Implemented for MVP to support an “agent inbox” behavior:

- Resend **Inbound** → `src/app/api/webhooks/resend-inbound/route.ts`
- Webhook signature verification (Svix headers) using `RESEND_WEBHOOK_SECRET`
- Resolve inbound recipient address → `agents.resend_from_email` → `agent_id`
- Idempotency via `agent_resend_inbound_events.resend_email_id` (dedupe duplicates)
- Write inbound content into `agent_memory` (`memory_type = 'event'`)
- Trigger `agent/run` via Inngest for agents with `status = 'active'`

Key env vars:
- `RESEND_API_KEY` (already used for sending + fetching received emails)
- `RESEND_WEBHOOK_SECRET` (signature verification; add to `.env.local`)

Manual test:
- Configure `email_sending_mode` to include `agent_resend` (Phase 3 provisioning) so `resend_from_email` is set.
- Send an email to the agent’s provisioned address.
- Verify:
  - The webhook returns 200
  - `agent_memory` gets a new `event` entry
  - The agent executes `agent/run` and can respond using `send_email_resend`

---

## Legal, abuse, and product notes

- **You are the sender platform** for Resend sends; publish acceptable-use and anti-spam rules.
- **Rate limits** and monitoring on `/api` and on send tool.
- **DMARC alignment**: use a subdomain dedicated to agent mail if you want to isolate reputation from your marketing domain.

---

## Testing checklist

- [ ] Agent with `agent_resend` sends mail and `from` matches stored address.
- [ ] Inbound webhook: sending an email to the agent's provisioned `resend_from_email` writes a new `agent_memory` entry (`memory_type = 'event'`).
- [ ] Inbound webhook: duplicate webhook deliveries (same `email_id`) do not create duplicate memories or duplicate `agent/run` triggers.
- [ ] Inbound webhook: misconfigured agents (mode doesn't include agent Resend / no `resend_from_email`) are ignored (200 OK).
- [ ] Agent with user Gmail still uses `send_email_gmail` when Google connected.
- [ ] Questionnaire: email agent → round 1 offers Gmail vs agent address where appropriate; no conditional wording violations.
- [ ] Missing `RESEND_API_KEY`: tool fails gracefully with operator-facing error, not silent send.
- [ ] Missing `RESEND_WEBHOOK_SECRET`: inbound route returns operator-facing error.

---

## Copy-paste master prompt (full feature, multi-step)

Use this when you want the implementer to **follow the doc in order** without skipping:

```text
Implement the full "Agent Resend email" feature as described in docs/AGENT_RESEND_EMAIL_IMPLEMENTATION.md.

Work in order: Phase 1 → 2 → 3 → 4 → 5 → 6 → 7 (skip 8 unless asked).

Constraints:
- Single platform RESEND_API_KEY; users never OAuth to Resend.
- Keep Gmail + send_email_gmail for "send from my inbox."
- Add send_email_resend for platform-managed per-agent from address.
- Questionnaire must ask (when email sending is needed) whether the user wants Gmail vs dedicated agent address, respecting clarification.ts round 1/2 rules.

After each phase, list files changed and how to test. Stop after each phase if I say continue.
```

---

## Quick reference: files you will likely touch

| Area | Files |
|------|--------|
| Types / plan | `src/lib/agents/types.ts` |
| Tools | `src/lib/agents/tools.ts`, `src/lib/agents/runtime.ts` |
| Clarification | `src/lib/ai/clarification.ts`, `src/lib/ai/types.ts` |
| Planner | `src/lib/agents/planner.ts`, `src/lib/agents/chat-pipeline.ts` |
| Agent create API | `src/app/api/agents/**` (deploy/build routes) |
| DB | `database/migrations/*.sql`, `src/types/database.ts` |
| Email helper | `src/lib/email/resend.ts`, `src/lib/email/agent-address.ts` |

---

*Last updated: aligns with questionnaire rules in `src/lib/ai/clarification.ts` and agent tools in `src/lib/agents/tools.ts`.*
