# Polling Trigger Debugging Guide

This guide walks you through collecting every piece of information needed to fully
diagnose and fix all polling trigger issues. Follow every section in order and paste
the results back. Screenshots are fine where noted.

---

## Section 1 — Inngest Dashboard

### 1a. Is the `workflow-executor` function synced and active?

1. Go to **https://app.inngest.com**
2. Click your app → **Functions** tab
3. Find `workflow-executor`
4. Tell me:
   - Is it listed?
   - What is the **trigger** shown (should say `workflow/execute`)?
   - Is there a red/yellow warning badge on it?
   - When was **Last synced** (shown at the top of the app page)?

### 1b. Check the specific event that "sent but didn't trigger a run"

1. Go to **Events** tab in Inngest
2. Find the `workflow/execute` event (the one you shared the payload for)
3. Click it
4. On the right side, there is a **"Functions triggered"** panel
5. Tell me:
   - Does it say "0 functions triggered" or similar?
   - Is there any error message shown on the event page?
6. Also: roughly how large is the event payload? (You can see the raw JSON size in
   the payload viewer — it will be very long due to the `raw` field containing the
   full Gmail HTML)

### 1c. Check Inngest event size

The payload you shared contains a `raw` field with base64-encoded HTML that is
**thousands of characters long**. Inngest has a **256KB event payload limit** —
exceeding this silently prevents the function from firing (the event appears in the
dashboard but triggers nothing).

To confirm: in the event you shared, scroll to the `raw` field inside
`triggerData.items[0]`. Count roughly how many characters the `payload.parts[1].body.data`
value is. If it's more than a few thousand characters, the event is likely over the limit.

---

## Section 2 — Supabase: `polling_triggers` Table

This table controls when and how often each trigger polls.

1. Go to **https://supabase.com** → your project → **Table Editor** → `polling_triggers`
2. Find the row for your Gmail workflow
3. Screenshot the entire row, or paste the values for these columns:
   - `id`
   - `workflow_id`
   - `trigger_type`
   - `enabled`
   - `poll_interval` (this is in seconds — e.g. 60 = every minute, 300 = every 5 min)
   - `last_seen_timestamp`
   - `next_poll_at`
   - `last_cursor`
   - `config` (the JSON object)
4. Also check: is `enabled = true`?

**Why this matters:**
- If `poll_interval` is 180, polls only happen every 3 minutes (explains the delay)
- If `next_poll_at` is far in the future, the Worker skips it entirely (explains "No due triggers")
- If `last_seen_timestamp` is wrong or very old, old emails keep getting re-fetched

---

## Section 3 — Supabase: `workflows` Table

1. Go to **Table Editor** → `workflows`
2. Find the row for your Gmail polling workflow
3. Tell me:
   - `status` — must be `active` for polling to work
   - `id`

---

## Section 4 — Cloudflare Worker Logs (Detailed)

You need to run `wrangler tail` in your terminal to see live logs.

### How to open the terminal:
1. In VS Code/Cursor, press `` Ctrl+` `` to open a terminal
2. Type this and press Enter:

```
cd "c:\Users\drtho\OneDrive\Runwise Codebase\cloudflare-worker"
npx wrangler tail
```

3. Leave this running. Now trigger your Gmail polling workflow (send yourself an email)
4. Watch the logs and copy everything that appears for the next 5 minutes

**What to look for:**
- `[Polling] Found X due triggers` — how many?
- `[Polling] Exception for trigger ...` — any errors?
- `[Polling] Done: triggered=X, errors=X` — note both numbers
- Any timestamps on when things fire

### Alternative: Cloudflare Dashboard logs
If `wrangler tail` doesn't work:
1. Go to **https://dash.cloudflare.com**
2. Workers & Pages → `runwise-polling-triggers`
3. Click **Logs** tab (or Observability)
4. Set time range to last 30 minutes
5. Screenshot the log entries

---

## Section 5 — A Controlled Test

Do this test so we can compare exact timestamps:

1. Make sure your Gmail polling workflow is **active** in Runwise
2. Note the exact time (e.g. "2:35:00 PM NZT")
3. Send yourself an email from a **different** email address (so it's definitely new)
4. Note the exact time the email arrived in Gmail
5. Watch the Cloudflare Worker logs (`wrangler tail`)
6. Note exactly when the Worker logs `[Polling] Found 1 due triggers`
7. Note when the Inngest event appears in the Inngest Events tab
8. Note if a function run starts in Inngest → Runs tab
9. Record all of this as a timeline, e.g.:
   ```
   2:35:00 - Email sent
   2:35:10 - Email arrived in Gmail
   2:36:03 - Worker fires (cron)
   2:36:05 - Worker: "No due triggers"  ← why?
   2:37:03 - Worker fires again
   2:37:05 - Worker: "Found 1 due triggers"
   2:37:08 - Inngest event appears
   2:37:09 - No function run started  ← why?
   ```

---

## Section 6 — The "triggered=2" Issue

When you see `triggered=2`, do this:

1. Go to Inngest → **Events** tab
2. Filter by `workflow/execute` around that time
3. How many events appeared? (Should be 2 if triggered=2)
4. Click each event — do they have the **same** or **different** event IDs?
5. Do they contain the **same email** or different emails in `triggerData.items`?

Also check Cloudflare logs at that exact time — does the Worker log show one trigger
with 2 items, or two separate trigger firings?

---

## Section 7 — Check the `workflow/execute` Function Registration

1. Go to **https://runwiseai.app/api/inngest** in your browser
2. You should see a JSON response listing registered functions
3. Is `workflow-executor` (or `workflow/execute`) in the list?
4. Screenshot or paste the JSON

---

## Section 8 — Check Vercel Deployment

1. Go to **https://vercel.com** → your project → **Deployments**
2. Is the latest deployment showing as **Ready** (green)?
3. When was it deployed? (Must be after the last code push — check if it's after the
   commits we made today)
4. Click the deployment → **Functions** tab → look for any build errors

---

## Summary Checklist

When you come back, paste/screenshot all of the following:

| # | Item | Where to find it |
|---|------|-----------------|
| 1 | `workflow-executor` function status in Inngest | Inngest → Functions |
| 2 | Event page showing "0 functions triggered" | Inngest → Events |
| 3 | Approximate size of the event payload (is `raw` field huge?) | Inngest → Events → payload |
| 4 | Full `polling_triggers` row for your workflow | Supabase → Table Editor |
| 5 | `status` of workflow in `workflows` table | Supabase → Table Editor |
| 6 | Cloudflare `wrangler tail` output during the test | Terminal |
| 7 | Controlled test timeline (Section 5) | Your observation |
| 8 | triggered=2 investigation (Section 6) | Inngest + Cloudflare logs |
| 9 | `/api/inngest` JSON output | Browser |
| 10 | Vercel deployment status | Vercel dashboard |

---

## What I Already Suspect (Based on What You've Shared)

These are my current hypotheses. The debugging above will confirm or rule out each one:

### Hypothesis 1 (HIGH CONFIDENCE): Event payload too large → no function triggered
The `raw` field in each polling item contains the **entire Gmail API response**, including
base64-encoded HTML email bodies that can be hundreds of KB alone. The whole event
payload is likely well over Inngest's 256KB limit. When this happens, Inngest accepts
the event (you see it in the dashboard) but silently refuses to trigger any function.

**Fix**: Strip the `raw` field from items before sending to Inngest — only keep the
flat normalised fields (`from`, `fromEmail`, `subject`, `body`, `snippet`, etc.)

### Hypothesis 2 (HIGH CONFIDENCE): 3-minute delay = poll_interval setting
If `poll_interval` in the `polling_triggers` row is 180 (seconds), the Worker only
polls every 3 minutes for that trigger — not every minute.

**Fix**: Set `poll_interval = 60` so it polls every time the Worker's 1-minute cron fires.

### Hypothesis 3 (MEDIUM CONFIDENCE): triggered=2 = same email in two polls
The `after:timestamp +1` fix we applied should prevent re-fetching, but if
`last_seen_timestamp` wasn't updated correctly after the first poll, the same email
appears in the next poll too. This sends two events to Inngest with slightly different
IDs (or the same ID, causing one to be deduplicated and silently dropped).

### Hypothesis 4 (MEDIUM CONFIDENCE): "No due triggers" = next_poll_at in the future
After a successful poll, `next_poll_at` is set to `now + poll_interval`. If
`poll_interval` is large, the trigger won't be "due" for several minutes. This explains
why the Worker correctly says "No due triggers" even though you just sent an email.

### Hypothesis 5 (LOW CONFIDENCE): Inngest function not synced after latest code changes
If the Vercel deployment after our recent changes hasn't triggered a re-sync with
Inngest, the running function code could be outdated and not handling the event
correctly.
