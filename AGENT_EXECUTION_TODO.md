# Agent Execution — Implementation TODO

> Everything needed to make agents functionally execute via manual trigger, polling, webhook, and schedule/heartbeat. Based on codebase scan (March 2025).

---

## What You Need To Do

### Polling triggers (Option A) — DONE

The code changes for Option A are complete. **You must run the migration** for polling to work:

```bash
# Run in Supabase SQL Editor, or via psql:
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres -f database/migrations/add_polling_triggers_agent_support.sql
```

Or copy the contents of `database/migrations/add_polling_triggers_agent_support.sql` into the Supabase Dashboard → SQL Editor and run it.

After the migration, redeploy the Cloudflare Worker so it uses the updated schema.

### Still to do

- **§2** Manual run API + Run button
- **§3** Pause button handler

---

## Summary

| Trigger Type      | Status   | Blocker / Fix |
|-------------------|----------|---------------|
| Webhook           | Working  | None          |
| Schedule/Heartbeat| Working  | None          |
| Polling           | Fixed*   | Run migration (see above) |
| Manual            | Missing  | No API + Run button not wired (see §2) |

---

## 1. Polling Triggers — Fix FK Constraint

**Problem:** `polling_triggers.workflow_id` has `REFERENCES workflows(id) ON DELETE CASCADE`. Agents pass `agentId` (from `agents` table) as `workflow_id`, so inserts fail with a foreign key violation.

**Impact:** Agents with polling behaviours (Gmail, Slack, Discord, Google Sheets, etc.) never get polling triggers created. The Cloudflare Worker never picks them up.

**Fix:** Add a migration that allows `workflow_id` to reference either workflows or agents.

### Option A — Add `agent_id` column (recommended)

Add a nullable `agent_id` column for agent triggers. When present, the Worker uses it instead of `workflow_id` for agent routing.

```sql
-- database/migrations/add_polling_triggers_agent_support.sql

-- Add agent_id for agent polling triggers (workflow_id stays for workflows)
ALTER TABLE public.polling_triggers
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE;

-- Make workflow_id nullable so agent triggers can use agent_id only
ALTER TABLE public.polling_triggers
  ALTER COLUMN workflow_id DROP NOT NULL;

-- Add check: either workflow_id or agent_id must be set
ALTER TABLE public.polling_triggers
  ADD CONSTRAINT polling_triggers_workflow_or_agent
  CHECK (
    (workflow_id IS NOT NULL AND agent_id IS NULL) OR
    (workflow_id IS NULL AND agent_id IS NOT NULL)
  );

-- Unique constraint: per trigger type, either per workflow or per agent
-- Drop old unique if it exists, add new one
ALTER TABLE public.polling_triggers
  DROP CONSTRAINT IF EXISTS polling_triggers_workflow_id_trigger_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_polling_triggers_workflow_trigger
  ON public.polling_triggers(workflow_id, trigger_type)
  WHERE workflow_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_polling_triggers_agent_trigger
  ON public.polling_triggers(agent_id, trigger_type)
  WHERE agent_id IS NOT NULL;

COMMENT ON COLUMN public.polling_triggers.agent_id IS 'For agent polling triggers; when set, workflow_id is null';
```

Then update:

- **`createPollingTrigger`** (`src/lib/workflows/polling-triggers.ts`): Accept an optional `agentId`. When provided, insert with `agent_id: agentId`, `workflow_id: null`. Upsert key becomes `(agent_id, trigger_type)`.
- **`createAgentBehaviours`** (`src/lib/agents/behaviour-manager.ts`): Call `createPollingTrigger` with `agentId` and a flag like `{ isAgent: true, agentId, ... }` so the polling-triggers layer uses `agent_id`.
- **Cloudflare Worker** (`cloudflare-worker/src/index.ts`): When processing a trigger, use `workflowId: trigger.agent_id ?? trigger.workflow_id` when calling the execute-trigger API (so agent rows pass `agent_id`). The execute-trigger route already handles `config.isAgent` and uses `config.agentId ?? workflowId` for the agent path.
- **RLS policies** (`database/migrations/fix_security_warnings.sql` or new migration): Add policies for `agent_id` — e.g. allow when `agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())`. The Worker uses service role and bypasses RLS, but app access may need it.

### Option B — Relax workflow_id FK

Make `workflow_id` reference a polymorphic source (e.g. a view or drop the FK). Simpler but less type-safe. Not recommended.

---

## 2. Manual Run — Add API + Wire Run Button

**Problem:** Manual-only agents (or any agent) cannot be run from the UI. The Run button in `agent-tab-content.tsx` has no `onClick` handler.

**Fix:**

### 2.1 Create `POST /api/agents/[id]/run`

New file: `src/app/api/agents/[id]/run/route.ts`

- Auth: require logged-in user
- Ownership: verify `agent.user_id === user.id`
- Status: verify `agent.status === 'active'` (optional: allow paused for "test run"?)
- Send Inngest event: `agent/run` with `{ agentId, userId, behaviourId: null, triggerType: 'manual', triggerData: {} }`
- Return: `{ success: true, eventId?: string }` or error

```ts
// Pseudocode
const agent = await getAgent(agentId, userId);
if (!agent || agent.status !== 'active') return 403/404;
await inngest.send({ name: 'agent/run', data: { agentId, userId, behaviourId: null, triggerType: 'manual', triggerData: {} } });
return NextResponse.json({ success: true });
```

### 2.2 Wire Run button in `agent-tab-content.tsx`

- Add `onClick` to the Run button (~line 1279)
- Call `POST /api/agents/[id]/run`
- Show loading state (e.g. spinner) while request in flight
- On success: optionally refresh activity feed or show toast
- On error: show error message

### 2.3 Optional: Disable when already running

If you track "running" state (e.g. from activity or a separate flag), disable the button while a run is in progress to avoid duplicate triggers.

---

## 3. Pause Button — Wire Handler

**Problem:** The Pause button in `agent-tab-content.tsx` has no `onClick` handler.

**Fix:** There is already `PATCH /api/agents/[id]/pause` (or similar). Wire the Pause button to call it and update local state / refetch agent.

---

## 4. Verification Checklist

After implementing:

- [ ] **Manual:** Click Run on an active agent → Inngest receives `agent/run` → `runAgentLoop` executes → activity appears in feed
- [ ] **Polling:** Create agent with Gmail trigger → `polling_triggers` row exists with `agent_id` → Worker polls → on new email, `agent/run` fires
- [ ] **Webhook:** Create agent with webhook behaviour → POST to webhook path → `agent/run` fires
- [ ] **Schedule/Heartbeat:** Create agent with schedule → wait for cron (or test via Inngest dashboard) → `agent/run` fires
- [ ] **Pause:** Click Pause → agent status → paused → no triggers fire

---

## 5. Files to Touch

| File | Change |
|------|--------|
| `database/migrations/add_polling_triggers_agent_support.sql` | New migration (Option A) |
| `src/lib/workflows/polling-triggers.ts` | Support `agentId` in create/upsert |
| `src/lib/agents/behaviour-manager.ts` | Pass `agentId` to createPollingTrigger for agent polling |
| `cloudflare-worker/src/index.ts` | Query/use `agent_id` for agent triggers |
| `src/app/api/agents/[id]/run/route.ts` | New route for manual run |
| `src/components/ui/agent-tab-content.tsx` | Wire Run + Pause buttons |
| RLS migration (if needed) | Policies for `polling_triggers` when `agent_id` is set |

---

## 6. Inngest (No Changes Needed)

- `agentRun` and `agentHeartbeat` are already registered and working.
- Event shape `{ agentId, userId, behaviourId?, triggerType, triggerData }` is correct.
- `runAgentLoop` handles all trigger types including `manual`.
