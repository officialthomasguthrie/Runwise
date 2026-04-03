# Runwise Agent — End-to-End Testing Plan

This document is your complete testing playbook. Work through each section in order. After each test, record the result in the reporting template at the bottom and send the completed report back so we can pinpoint exactly where things break.

---

## How the system works (quick reference)

Before you test, here is the simplified flow so you know what you are looking at:

**Agent creation:**
User prompt → Builder chat (SSE) → Plan generated → `POST /api/agents/build` → agent row + behaviours + polling triggers → status `active` (or `pending_integrations` if OAuth needed)

**Manual run:**
Click "Run" → `POST /api/agents/{id}/run` → Inngest event `agent/run` → `agentRun` function → `runAgentLoop` (OpenAI + tools) → `agent_activity` row written

**Scheduled/heartbeat run:**
Inngest cron (every 5 min) → `agentHeartbeat` checks `agent_behaviours` → fires `agent/run` events for due behaviours → same loop as manual

**Polling run (Gmail, Slack, etc.):**
Cloudflare Worker (every 1 min) → checks `polling_triggers` → calls `POST /api/polling/execute-trigger` → if new data found → Worker sends `agent/run` to Inngest → same loop

**Webhook run:**
External HTTP POST → `/api/webhooks/{path}` → matches `agent_behaviours` → fires `agent/run` → same loop

**Inbound email (Resend):**
Email arrives → Resend webhook → `/api/webhooks/resend-inbound` → writes memory + fires `agent/run`

---

## Prerequisites — check these FIRST

Before running any tests, verify these are in place. If any are missing, the system cannot work.

### Environment variables

Open your `.env.local` (or wherever your env is stored) and confirm each of these exists and has a value:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `INTEGRATION_ENCRYPTION_KEY` (must be a 64-character hex string)
- `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000` for local)

Optional but needed for specific features:
- `RESEND_API_KEY` + `RESEND_FROM_DOMAIN` (for agent email)
- `GOOGLE_INTEGRATION_CLIENT_ID` + `GOOGLE_INTEGRATION_CLIENT_SECRET` (for Gmail/Sheets/Calendar/Drive)
- `SLACK_CLIENT_ID` + `SLACK_CLIENT_SECRET` (for Slack tools)
- Any other OAuth provider keys for integrations you want to test

### Inngest

- Confirm Inngest dev server is running: visit `http://localhost:8288` in your browser
- If it is not running, start it with: `npx inngest-cli@latest dev`
- Confirm your Next.js app is connected: in the Inngest dashboard, you should see registered functions including `agent-run` and `agent-heartbeat`

### Supabase

- Confirm you can query your database (e.g. through the Supabase dashboard or `psql`)
- You will need to check tables directly during testing

### Record the following

**For your report, note:**
- Which env vars are present (just say "all present" or list missing ones)
- Whether Inngest dev server is reachable at port 8288
- Whether `agent-run` and `agent-heartbeat` appear in the Inngest function list
- Your Next.js dev server URL

---

## Phase 1: Agent Creation

### Test 1.1 — Create a simple agent via the builder

**Steps:**
1. Go to `/agents/new` in your browser
2. In the chat input, type: `Create an agent that checks my Gmail inbox every hour and summarizes new emails in a Slack message to #general`
3. Wait for the builder to ask clarification questions
4. Answer the questions (any reasonable answer is fine)
5. When a plan appears, click "Build Agent" (or whatever the deploy button says)

**What to observe:**
- Does the chat respond at all? (if blank/error, the SSE stream from `/api/agents/chat` is broken)
- Does a plan eventually appear? (if not, the planning pipeline is broken)
- Does the build process start? (look for a progress indicator)
- Does the build complete? (if it hangs, check the browser console and network tab)
- After build, does the agent appear in your agent list?

**What to record:**
- Time from prompt to first response
- Any errors in the browser console (open DevTools → Console tab)
- Any failed network requests (DevTools → Network tab, filter by "agents")
- The final agent status shown in the UI
- The agent ID (visible in the URL after creation, e.g. `/agents/new?agentId=xxx`)

### Test 1.2 — Create a minimal agent (no integrations)

**Steps:**
1. Go to `/agents/new`
2. Type: `Create an agent that runs every day at 9am and remembers what day it is`
3. Go through the builder flow
4. Deploy the agent

**Why this matters:** This agent does not need any OAuth integrations. If this fails, the problem is in the core creation flow, not in integration gating.

**What to record:**
- Same observations as 1.1
- Did it ask you to connect any integrations? (it should NOT for this prompt)
- What status did the agent end up in? (should be `active`, not `pending_integrations`)

### Test 1.3 — Check agent in database

**Steps:**
1. After creating an agent, note the agent ID
2. In your Supabase dashboard, go to the SQL editor and run:

```sql
-- Replace YOUR_AGENT_ID with the actual ID
SELECT id, name, status, persona, instructions, model, max_steps, email_sending_mode
FROM agents
WHERE id = 'YOUR_AGENT_ID';
```

3. Then check behaviours:

```sql
SELECT id, behaviour_type, trigger_type, schedule_cron, enabled, config
FROM agent_behaviours
WHERE agent_id = 'YOUR_AGENT_ID';
```

4. If the agent uses polling (Gmail, Slack, etc.), check polling triggers:

```sql
SELECT id, agent_id, trigger_type, config, enabled, next_poll_at, poll_interval
FROM polling_triggers
WHERE agent_id = 'YOUR_AGENT_ID';
```

**What to record:**
- The full output of each query (copy-paste the results)
- Is `status` what you expect? (`active` or `pending_integrations`)
- Are there behaviour rows? How many?
- For scheduled agents: is `schedule_cron` populated and does it look correct?
- For polling agents: is there a `polling_triggers` row with `enabled = true`?

---

## Phase 2: Manual Execution

This is the most important test. If manual run does not work, nothing else will either.

### Test 2.1 — Manual run from the UI

**Steps:**
1. Open the agent you created in Test 1.2 (the simple schedule agent with no integrations)
2. Find and click the "Run" or "Run Now" button
3. Watch for any response in the UI

**What to observe:**
- Does the button do anything when clicked?
- Does the UI show a loading/running state?
- Do you see any error messages?
- After a few seconds, does an activity entry appear?

**What to record:**
- What the button does (nothing? loading spinner? error toast?)
- Any errors in the browser console
- Open DevTools → Network tab, find the `POST` request to `/api/agents/{id}/run` and record:
  - The HTTP status code (200? 400? 500? 502?)
  - The response body (copy it)
- Check the Inngest dashboard at `http://localhost:8288`: do you see a new `agent-run` function execution? What is its status?

### Test 2.2 — Manual run API directly

This bypasses the UI entirely to isolate frontend vs backend issues.

**Steps:**
1. Open a terminal
2. Run this curl command (replace the placeholders):

```bash
curl -X POST http://localhost:3000/api/agents/YOUR_AGENT_ID/run \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE" \
  -v
```

To get your auth cookie:
- Open DevTools → Application tab → Cookies → find the cookie starting with `sb-` (Supabase auth cookie)
- Copy the full `name=value` string

**What to record:**
- The HTTP status code
- The full response body
- If it returned `{ "success": true, "eventId": "..." }`, copy the eventId

### Test 2.3 — Check Inngest execution

**Steps:**
1. After triggering a manual run, go to `http://localhost:8288` (Inngest dashboard)
2. Click on "Runs" or "Functions" → `agent-run`
3. Find the most recent run

**What to record:**
- Is the run visible?
- What is its status? (Running / Completed / Failed / Cancelled)
- If Failed: click into it and copy the FULL error message and stack trace
- If Completed: copy the output/return value
- How long did it take?

### Test 2.4 — Check activity log in database

**Steps:**
1. After a run completes (or fails), check the activity:

```sql
SELECT id, status, trigger_summary, actions_taken, error_message, tokens_used, created_at
FROM agent_activity
WHERE agent_id = 'YOUR_AGENT_ID'
ORDER BY created_at DESC
LIMIT 5;
```

**What to record:**
- Is there a row for this run?
- What is the `status`? (`success`, `error`, `skipped`)
- If `error`: what is the `error_message`?
- What is in `actions_taken`? (copy the JSON)
- How many `tokens_used`?

### Test 2.5 — Check server logs

**Steps:**
1. Look at the terminal where `npm run dev` is running
2. Search for lines containing `[AgentRuntime]` or `[POST /api/agents`

**What to record:**
- Copy ALL log lines that mention `AgentRuntime`, `agent/run`, or the agent name
- Look specifically for:
  - `"Agent not found"` → agent ID mismatch or user_id mismatch
  - `"Agent is paused"` or `"Agent is pending_integrations"` → wrong status
  - `"Inngest send failed"` → Inngest connection issue
  - Any OpenAI errors → API key issue or model error
  - Any tool execution errors

---

## Phase 3: Scheduled / Heartbeat Execution

### Test 3.1 — Verify heartbeat is running

**Steps:**
1. Go to Inngest dashboard → Functions → `agent-heartbeat`
2. Wait 5 minutes (the heartbeat runs every 5 minutes on cron)

**What to record:**
- Does `agent-heartbeat` execute every ~5 minutes?
- What does it return? (should show `{ fired: N }` where N is the number of due agents)
- If it returns `{ fired: 0 }`: check that your agent has a `schedule` or `heartbeat` behaviour that is `enabled = true` in `agent_behaviours`

### Test 3.2 — Create a fast-schedule agent for testing

**Steps:**
1. Create an agent with a prompt like: `Create an agent that runs every 5 minutes and writes a memory note with the current time`
2. Check the database:

```sql
SELECT id, behaviour_type, schedule_cron, enabled, last_run_at
FROM agent_behaviours
WHERE agent_id = 'YOUR_AGENT_ID'
AND behaviour_type IN ('schedule', 'heartbeat');
```

3. Wait 5-10 minutes
4. Check Inngest dashboard for `agent-run` executions triggered by the heartbeat
5. Check activity:

```sql
SELECT status, trigger_summary, actions_taken, created_at
FROM agent_activity
WHERE agent_id = 'YOUR_AGENT_ID'
ORDER BY created_at DESC
LIMIT 5;
```

**What to record:**
- The `schedule_cron` value in `agent_behaviours`
- Whether `enabled` is `true`
- Whether the heartbeat picked it up (check Inngest logs)
- Whether an `agent_activity` row was created
- The `status` and `actions_taken` of that activity

### Test 3.3 — Cron expression validation

**Steps:**
1. Check the `schedule_cron` value from 3.2
2. Go to https://crontab.guru and paste it in
3. Verify it matches what you asked for

**What to record:**
- The cron expression
- What crontab.guru says it means
- Whether it matches your intent

---

## Phase 4: Webhook Execution

### Test 4.1 — Find the webhook path

**Steps:**
1. Check agent behaviours for a webhook type:

```sql
SELECT id, config
FROM agent_behaviours
WHERE agent_id = 'YOUR_AGENT_ID'
AND behaviour_type = 'webhook';
```

2. The `config` JSON should contain a `path` field — that is your webhook URL path.
3. If no webhook behaviour exists, create an agent with a webhook trigger: `Create an agent that listens for webhook events and logs them to memory`

**What to record:**
- The webhook `path` from the config
- Whether the behaviour exists and is `enabled`

### Test 4.2 — Fire a webhook

**Steps:**
1. Send a test webhook:

```bash
curl -X POST http://localhost:3000/api/webhooks/YOUR_WEBHOOK_PATH \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "message": "Hello from webhook test", "timestamp": "2026-03-30T12:00:00Z"}'
```

**What to record:**
- The HTTP status code of the response
- The response body
- Check Inngest dashboard: was an `agent-run` event fired?
- Check `agent_activity`: was a row created with `trigger_summary` mentioning "Webhook"?
- Check server logs for `[AgentRuntime]` lines

### Test 4.3 — Webhook with agent not active

**Steps:**
1. Pause the agent first (via UI or API)
2. Fire the same webhook again
3. Check what happens

**What to record:**
- Does the webhook endpoint still return 200?
- Is an Inngest event fired?
- If yes: does the agent loop skip with status `skipped`?
- Check `agent_activity` for a `skipped` row

---

## Phase 5: Polling Triggers (Gmail, Slack, etc.)

### Test 5.1 — Check Cloudflare Worker status

**Steps:**
1. Check if the Cloudflare Worker is deployed and running
2. Look at `polling_triggers` for your agent:

```sql
SELECT id, agent_id, trigger_type, config, enabled, next_poll_at, last_polled_at, poll_interval
FROM polling_triggers
WHERE agent_id = 'YOUR_AGENT_ID';
```

**What to record:**
- Is there a `polling_triggers` row?
- Is `enabled` = `true`?
- What is `next_poll_at`? Is it in the past (should fire soon) or far future?
- What is the `trigger_type`? (e.g. `new-email-received`, `new-message-in-slack`)
- Is `config` populated with `isAgent: true`?

### Test 5.2 — Simulate a polling trigger locally

If the Cloudflare Worker is not running locally, you can simulate what it does:

**Steps:**
1. Run this curl (replace values):

```bash
curl -X POST http://localhost:3000/api/polling/execute-trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -d '{
    "triggerId": "YOUR_POLLING_TRIGGER_ID",
    "workflowId": "YOUR_AGENT_ID",
    "triggerType": "new-email-received",
    "config": {
      "isAgent": true,
      "userId": "YOUR_USER_ID"
    }
  }'
```

**What to record:**
- The HTTP response status and body
- Did it report `hasNewData: true` or `hasNewData: false`?
- If `true`: check Inngest for a new `agent-run` event
- Any errors in the server logs

### Test 5.3 — Integration credentials check

For polling to work, the agent needs valid OAuth tokens for the service it is polling.

**Steps:**
1. Check if the user has the integration connected:

```sql
SELECT service_name, status, created_at, updated_at
FROM user_integrations
WHERE user_id = 'YOUR_USER_ID'
AND service_name IN ('google-gmail', 'slack', 'discord', 'github');
```

2. If the integration is connected, try to verify the token is still valid by checking if the polling endpoint can actually fetch data (this happens when `execute-trigger` runs)

**What to record:**
- Which integrations are connected?
- Are any showing stale `updated_at` dates (tokens may have expired)?
- Did the polling trigger successfully fetch data or return an auth error?

---

## Phase 6: Tool Execution (within a running agent)

These tests verify that individual tools work when the agent calls them.

### Test 6.1 — Memory tools (no integrations needed)

**Steps:**
1. Create an agent: `Create an agent that remembers important facts I tell it`
2. Run it manually
3. Check memory:

```sql
SELECT id, memory_type, content, source, created_at
FROM agent_memory
WHERE agent_id = 'YOUR_AGENT_ID'
ORDER BY created_at DESC
LIMIT 10;
```

**What to record:**
- Did the agent try to use the `remember` tool? (check `actions_taken` in `agent_activity`)
- Were memory rows created?
- What is in the memory `content`?

### Test 6.2 — Gmail tools (requires Google OAuth)

**Steps:**
1. Make sure Google/Gmail is connected in your integrations
2. Create an agent that reads emails: `Create an agent that reads my latest 3 emails and summarizes them`
3. Run it manually
4. Check `agent_activity.actions_taken` for `read_emails` tool calls

**What to record:**
- Did the agent attempt `read_emails`?
- Did the tool succeed or fail? (look at the result in `actions_taken`)
- If failed: what was the error? (common: expired OAuth token, missing scopes)

### Test 6.3 — Slack tools (requires Slack OAuth)

**Steps:**
1. Connect Slack in integrations
2. Create an agent: `Create an agent that posts a daily summary to #general in Slack`
3. Run it manually
4. Check `agent_activity` for `send_slack_message` tool calls

**What to record:**
- Did the agent attempt `send_slack_message`?
- Did a message actually appear in Slack?
- If not: what error appeared in `actions_taken`?

### Test 6.4 — Web search (requires SERPER_API_KEY)

**Steps:**
1. Create an agent: `Create an agent that searches the web for the latest AI news and remembers the top 3 headlines`
2. Run it manually
3. Check `agent_activity` for `web_search` tool calls

**What to record:**
- Did the agent call `web_search`?
- Did it return results or an error?
- Is `SERPER_API_KEY` set in your env?

### Test 6.5 — HTTP request tool

**Steps:**
1. Create an agent: `Create an agent that fetches the JSONPlaceholder API at https://jsonplaceholder.typicode.com/posts/1 and remembers the title`
2. Run it manually

**What to record:**
- Did the agent call `http_request`?
- Did it get data back?
- Any errors?

---

## Phase 7: Agent State Management

### Test 7.1 — Pause and resume

**Steps:**
1. Take an active agent
2. Pause it (via UI button or `POST /api/agents/{id}/pause`)
3. Check database: `SELECT status FROM agents WHERE id = 'YOUR_AGENT_ID'` — should be `paused`
4. Try to run it manually — should fail with "Agent must be active to run"
5. Resume it (same button/endpoint)
6. Check database again — should be `active`
7. Run it manually — should work

**What to record:**
- Does pause change status to `paused`?
- Does the manual run correctly reject a paused agent?
- Does resume change status back to `active`?
- Does a run after resume succeed?
- Check `agent_behaviours`: does `enabled` toggle with pause/resume?

### Test 7.2 — Pending integrations flow

**Steps:**
1. Create an agent that requires Gmail (e.g. email monitoring) but do NOT connect Gmail first
2. Check the agent status — should be `pending_integrations`
3. Try to run it — should fail
4. Now connect Gmail through the integrations page
5. Activate the agent (there should be an activate button or `POST /api/agents/{id}/activate`)
6. Check status — should now be `active`

**What to record:**
- Does the agent correctly start in `pending_integrations` when OAuth is missing?
- Does activation work after connecting the integration?
- Does the UI show a clear message about what integrations are needed?

---

## Phase 8: Failure Scenarios (intentional breakage)

### Test 8.1 — Missing OpenAI API key

**Steps:**
1. Temporarily remove or invalidate `OPENAI_API_KEY` in your env
2. Restart the dev server
3. Try to run an agent manually

**What to record:**
- What error do you get?
- Is the error surfaced to the UI?
- Is it logged in `agent_activity` with `status: 'error'`?
- What does the `error_message` say?

*Remember to restore the key after this test.*

### Test 8.2 — Expired OAuth token

**Steps:**
1. Find a connected integration in the database
2. Manually corrupt the token (or wait for it to expire naturally)
3. Run an agent that uses that integration
4. Check if the error is handled gracefully

**What to record:**
- Does the agent crash entirely or does just that tool fail?
- Is the tool error passed back to the LLM for it to handle?
- What shows in `agent_activity`?

### Test 8.3 — Agent hits max_steps

**Steps:**
1. Create an agent with complex instructions that would require many steps
2. Set `max_steps` to 2 in the database: `UPDATE agents SET max_steps = 2 WHERE id = 'YOUR_AGENT_ID'`
3. Run the agent

**What to record:**
- Does the agent stop after 2 tool calls?
- Is there a warning in the logs about hitting max_steps?
- Is the activity logged as `success` (it should be — max_steps is not an error)?

### Test 8.4 — Inngest is down

**Steps:**
1. Stop the Inngest dev server
2. Try to run an agent manually

**What to record:**
- What HTTP status does `/api/agents/{id}/run` return? (should be 502)
- What error message is returned?
- Is the error clear enough to diagnose?

*Restart Inngest after this test.*

### Test 8.5 — Run a non-existent agent

**Steps:**
1. Call the run endpoint with a fake agent ID:

```bash
curl -X POST http://localhost:3000/api/agents/00000000-0000-0000-0000-000000000000/run \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE" \
  -v
```

**What to record:**
- HTTP status (should be 404)
- Error message

---

## Phase 9: End-to-End Scenario Tests

### Test 9.1 — Full Gmail monitoring agent

**Steps:**
1. Connect Gmail integration
2. Create agent: `Monitor my Gmail inbox. When I get a new email, summarize it and save the summary to memory.`
3. Deploy the agent (should be `active`)
4. Send yourself a test email from another account
5. Wait for the polling cycle (1-5 minutes depending on worker config)
6. Check `agent_activity` for a run triggered by the email
7. Check `agent_memory` for the summary

**What to record for EACH step:**
- Did it work? Yes/No
- If no: what went wrong?
- What is the exact error or unexpected behavior?

### Test 9.2 — Full webhook agent

**Steps:**
1. Create agent: `Listen for webhook events. When one comes in, extract the "message" field and save it to memory.`
2. Deploy the agent
3. Find the webhook path from `agent_behaviours`
4. Send a webhook:
```bash
curl -X POST http://localhost:3000/api/webhooks/YOUR_PATH \
  -H "Content-Type: application/json" \
  -d '{"message": "Test webhook message", "source": "curl"}'
```
5. Check `agent_activity` for the run
6. Check `agent_memory` for the saved message

**What to record for EACH step:**
- Did it work? Yes/No
- If no: what went wrong?

### Test 9.3 — Full scheduled agent

**Steps:**
1. Create agent: `Run every 5 minutes. Search the web for "Runwise AI" and save the top result to memory.`
2. Deploy the agent
3. Wait 10 minutes
4. Check `agent_activity` for scheduled runs
5. Check `agent_memory` for saved results

**What to record:**
- Did the schedule trigger fire?
- Did the agent execute successfully?
- Were tools called and did they work?

---

## Phase 10: UI / UX Observations

While running the tests above, also note these:

- **Agent list page:** Does it load? Do agents show correct status? Can you click into them?
- **Agent detail page:** Does it show activity? Memory? Behaviours?
- **Activity feed:** Does it update after a run? Does it show errors clearly?
- **Run button:** Is it visible? Does it give feedback (loading state)?
- **Pause/resume:** Does the UI update immediately?
- **Integration connection prompts:** Are they clear about what is needed?
- **Error messages:** Are they human-readable or raw stack traces?
- **Build process:** Does the progress indicator work? Does it ever hang?

---

## Debugging Isolation Strategy

When something fails, use this flowchart to narrow down where:

### Is it a frontend problem?
- Open DevTools → Console. Any red errors?
- Open DevTools → Network. Any failed requests (red rows)?
- Try the same operation via curl. If curl works but the UI does not, it is a frontend bug.

### Is it an API route problem?
- Check the HTTP status code from the API call
- Check the response body for error details
- Check the terminal running `npm run dev` for server-side errors
- Common issues: auth failures (401), missing agent (404), validation errors (400), Inngest failures (502)

### Is it an Inngest problem?
- Go to `http://localhost:8288`
- Is the function registered?
- Is the event being received?
- Is the run starting? Completing? Failing?
- Click into a failed run to see the full error

### Is it an OpenAI problem?
- Check server logs for OpenAI error messages
- Common: rate limits, invalid API key, model not available
- The error will appear in `agent_activity.error_message`

### Is it a tool/integration problem?
- Check `agent_activity.actions_taken` — each tool call has a `result` field
- If a tool returns `{ "error": "..." }`, the integration or credential is the issue
- Check `user_integrations` for the relevant service
- Try re-connecting the integration through the UI

### Is it a database problem?
- Check if expected rows exist (agents, behaviours, activity, memory)
- Check if rows have the right values (status, enabled, config)
- Look for null values where there should not be any

---

## Reporting Template

After completing each test, fill in this format and send it back. Copy and paste this structure for each test.

### Per-Test Report

```
TEST: [Test number and name, e.g. "2.1 — Manual run from UI"]
RESULT: [PASS / FAIL / PARTIAL / BLOCKED]
WHAT HAPPENED: [1-3 sentences describing what you observed]
ERRORS: [Copy any error messages — from browser console, network response, server logs, or Inngest]
DATABASE STATE: [Paste relevant query results if applicable]
INNGEST: [What did the Inngest dashboard show for this run? Status, duration, errors]
SCREENSHOTS: [If relevant, describe what the UI showed]
```

### Summary Report

After all tests, also include:

```
ENVIRONMENT:
- Node.js version: [run `node --version`]
- Next.js dev server: [running? URL?]
- Inngest dev server: [running? URL?]
- Cloudflare Worker: [deployed? running locally?]
- Key env vars present: [list any MISSING ones]

OVERALL STATUS:
- Agent creation: [WORKING / BROKEN / PARTIAL]
- Manual execution: [WORKING / BROKEN / PARTIAL]
- Scheduled execution: [WORKING / BROKEN / PARTIAL]
- Webhook execution: [WORKING / BROKEN / PARTIAL]
- Polling execution: [WORKING / BROKEN / PARTIAL]
- Tool execution: [list each tool tested and status]
- State management (pause/resume): [WORKING / BROKEN / PARTIAL]
- Activity logging: [WORKING / BROKEN / PARTIAL]
- Memory system: [WORKING / BROKEN / PARTIAL]
- Error handling: [WORKING / BROKEN / PARTIAL]

TOP BLOCKERS (most critical failures first):
1. [Description of most critical failure]
2. [Next most critical]
3. [etc.]

UNEXPECTED BEHAVIORS (not errors, but things that seem wrong):
1. [Description]
2. [etc.]

THINGS THAT WORKED WELL:
1. [Description]
2. [etc.]
```

---

## Priority Order

If you are short on time, test in this order (most critical first):

1. **Prerequisites** — if these fail, nothing else matters
2. **Phase 2 (Manual execution)** — this is the core loop; everything depends on it
3. **Phase 6.1 (Memory tools)** — simplest tool test, no integrations needed
4. **Phase 1 (Agent creation)** — can you even make agents?
5. **Phase 7 (State management)** — pause/resume
6. **Phase 4 (Webhooks)** — second simplest trigger after manual
7. **Phase 3 (Scheduled)** — needs the heartbeat to be working
8. **Phase 5 (Polling)** — most complex trigger path
9. **Phase 8 (Failure scenarios)** — important but lower priority than getting the happy path working
10. **Phase 9 (End-to-end)** — full integration tests, only after individual pieces work

---

## Quick Reference: Key URLs

- **Next.js app:** `http://localhost:3000`
- **Inngest dashboard:** `http://localhost:8288`
- **Agent list:** `http://localhost:3000/dashboard` (or `/agents` if there is a dedicated page)
- **New agent:** `http://localhost:3000/agents/new`
- **Supabase dashboard:** Check your `NEXT_PUBLIC_SUPABASE_URL` — the dashboard is at the same domain without the `/rest` path

## Quick Reference: Key Database Tables

- `agents` — agent definitions and status
- `agent_behaviours` — triggers/schedules per agent
- `agent_activity` — run logs (the most important table for debugging)
- `agent_memory` — what agents remember
- `polling_triggers` — polling schedule state
- `user_integrations` — OAuth connections
