# Runwise Agent Debug Notes (User-Filled)

This file is a running snapshot of what you’ve observed so far, so we can reference it later while debugging agent execution failures.

## Source
- Created: 2026-03-30
- Based on user messages in this chat

## Phase 1 — Agent Creation

### Test 1.1 — Create a real agent (with integrations + trigger)
- Result: PASS
- Observations:
  - Chat responds properly
  - Plan appears and is “PERFECT” (no changes needed)
  - Build completes
  - Agent appears after build
- Agent ID: `dc517431-d545-4c23-b35c-26c3d5ab8648`
- UI status after build: `active` (even though not all integrations are connected)
- DB facts (as provided):
  - `agents.status`: `active`
  - `agent_behaviours`: `1`

### Test 1.2 — Create a minimal agent (no integrations)
- Result: PASS
- Observations:
  - User reported “1.2 is all good too”
- Agent ID: `4f4102aa-21fd-44b9-ba52-693d279865fb`
- UI status after build: (not explicitly restated by user in latest message; Phase 1.3 was reported “all good too”)

### Test 1.3 — Supabase DB verification
- Result: PASS / “all good too”
- Notes:
  - User confirmed Phase 1.3 was “all good too”.
  - Additional explicit DB outputs were not pasted; the only explicit DB values provided are for Test 1.1:
    - `agents.status = active`
    - behaviour count = `1`

## Phase 2 — Manual Execution

### Test 2.1 — Manual run from UI (Test 1.2 agent)
- Result: FAIL
- Agent ID: `4f4102aa-21fd-44b9-ba52-693d279865fb`
- UI behavior: "Running" loader for 1-2 seconds, then green message "Agent run triggered — results will appear in the activity feed shortly."
- Network: `POST https://runwiseai.app/api/agents/4f4102aa.../run` → 200 → `{"success":true,"eventId":"01KMZ324KD9JA3KD76KWMRSS2A"}`
- Inngest local dashboard: NO execution appeared
- Activity feed: Nothing ever appeared (even after hours)

### Root Cause Found
**Two issues identified:**

1. **Local dev:** `.env.local` had **production** `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` set.
   - When `inngest.send()` runs from an API route, the SDK sees the prod key and sends the event to **Inngest Cloud** (not the local dev server).
   - The event vanishes because Inngest Cloud doesn't have `agent-run` registered (see #2).
   - **Fix applied:** Commented out prod keys, added `INNGEST_DEV=1` to `.env.local`.

2. **Production Inngest Cloud:** `agent-run` and `agent-heartbeat` functions are **NOT registered**.
   - Inngest Cloud only has: hello-world, monthly-credit-reset, Scheduled Workflow Trigger, send-test-notification, test-workflow, workflow-executor.
   - Production agents cannot execute until these functions are synced/deployed.
   - **Fix needed:** Redeploy the app so the serve endpoint re-registers all functions with Inngest Cloud.

## Current Next Step
- User needs to restart `npm run dev` (to pick up env change), then re-run Test 2.1 on localhost:3000.

## Phase 3 — Scheduled / Heartbeat (Tests 3.2 & 3.3)

**Validated 2026-04-03** — User confirmed the plan’s “what to record” checklists for **Test 3.2** (lines 289–294 in `AGENT_TESTING_PLAN.md`) and **Test 3.3** (lines 296–308) are correct, and that scheduling behaviour matches expectations in practice.

### Test 3.2 — Fast-schedule agent (“every 5 minutes + memory with current time”)
- **Result:** PASS (criteria verified good; runs observed in Inngest and activity ~every 5 minutes)
- **What to record (all confirmed as the right things to check):**
  - `schedule_cron` in `agent_behaviours`
  - `enabled = true`
  - Heartbeat picked it up (Inngest logs)
  - `agent_activity` row created
  - `status` and `actions_taken` on that activity

### Test 3.3 — Cron expression validation (crontab.guru)
- **Result:** PASS (process is correct: copy `schedule_cron` from 3.2 → crontab.guru → confirm meaning vs intent)
- **What to record:** cron string, crontab.guru interpretation, match to intent

### Issues found during 3.2-style testing (and fixes shipped)

**Problem:** The same scheduled agent produced **many duplicate memory rows** (dozens per run window) — often the same timestamp repeated — while activity correctly showed ~one run per interval (e.g. 8 runs in 40 minutes vs ~30 memory entries).

**Root causes:**
1. System prompt told the model to **always** and **proactively** use `remember`, so it called the tool many times per run (including batched tool calls and multiple loop steps).
2. **`writeMemory`** always did a plain `INSERT` with **no deduplication**.
3. **No within-run guard** — the same content could be written many times in one execution.

**Fixes (code, pushed to `main`):**
- **`src/lib/agents/memory.ts`:** Before insert, look up existing row with same agent/user and **case-insensitive matching** content (whitespace-normalised); if found, return it instead of inserting.
- **`src/lib/agents/runtime.ts`:** Skip `remember` tool calls when that normalised content was **already written in the current run**; tell the model it was skipped.
- **`src/lib/agents/runtime.ts`:** System prompt updated to **selective** memory use (no re-saving what’s already in “WHAT YOU KNOW”, consolidate, cap guidance at ~1–2 `remember` calls per run).

**Commit:** `fix: prevent duplicate memory writes from agent runs` (e.g. `2a7995c` on `main`).

---
