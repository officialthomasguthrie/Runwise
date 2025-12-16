# Complete Cloudflare Worker Setup Guide

## 🎯 What We're Setting Up

A Cloudflare Worker that runs every 1 minute to poll external APIs for workflow triggers. It only triggers workflows when new data is detected, making it highly efficient.

## ✅ What's Already Done (By Me)

1. ✅ Database migration SQL file created
2. ✅ Cloudflare Worker code written
3. ✅ Integration with workflow activation
4. ✅ All code files created and configured
5. ✅ Old Vercel Cron code removed

## 📋 What You Need to Do

---

## STEP 1: Run Database Migration ⚠️ REQUIRED

**What it does**: Creates the `polling_triggers` table in your database.

**How to do it**:

### Option A: Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**
5. Open the file: `database/migrations/create_polling_triggers_table.sql`
6. **Copy the entire contents** of that file
7. **Paste it into the SQL Editor**
8. Click **"Run"** (or press Ctrl+Enter)
9. You should see: "Success. No rows returned"

**Verify it worked**:
- In SQL Editor, run: `SELECT * FROM polling_triggers LIMIT 1;`
- Should return: "Success. No rows returned" (not an error)

### Option B: Command Line (If you have psql)

```bash
psql -h your-db-host.supabase.co -U postgres -d postgres -f database/migrations/create_polling_triggers_table.sql
```

**Can I do this for you?**: ❌ No - I can't access your database directly. You must run this yourself.

---

## STEP 2: Get Your Environment Variables

You'll need these values to configure the Cloudflare Worker.

### 2.1: Supabase URL and Key

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"Settings"** (gear icon) → **"API"**
4. Find:
   - **Project URL** → Copy this (e.g., `https://xxxxx.supabase.co`)
   - **service_role key** → Click "Reveal" and copy (starts with `eyJ...`)

**Save these somewhere safe!**

### 2.2: Inngest Event Key

1. Go to https://app.inngest.com
2. Click **"Settings"** (or your account icon)
3. Go to **"Event Keys"** or **"API Keys"**
4. Copy your **Event Key** (or create one if needed)

**Save this too!**

**Can I do this for you?**: ❌ No - These are your secrets, I can't access them.

---

## STEP 3: Install Cloudflare Worker Dependencies

**What it does**: Installs the packages needed to deploy the worker.

**How to do it**:

1. Open terminal/command prompt
2. Navigate to your project:
   ```bash
   cd C:\Users\drtho\OneDrive\Runwise
   ```
3. Go to the worker directory:
   ```bash
   cd cloudflare-worker
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Wait for it to finish (should see "added X packages")

**Verify it worked**:
- Check that `cloudflare-worker/node_modules` folder exists
- No error messages

**Can I do this for you?**: ✅ Yes! I can run this command for you. Just ask me to "install the Cloudflare Worker dependencies".

---

## STEP 4: Set Cloudflare Secrets (Environment Variables)

**What it does**: Stores your database and Inngest credentials securely in Cloudflare.

**How to do it**:

1. Make sure you're logged in:
   ```bash
   wrangler login
   ```
   (If already logged in, this will just confirm)

2. Navigate to worker directory:
   ```bash
   cd cloudflare-worker
   ```

3. Set each secret (you'll be prompted to paste the value):

   ```bash
   wrangler secret put SUPABASE_URL
   ```
   - When prompted, paste your Supabase Project URL
   - Press Enter

   ```bash
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   ```
   - When prompted, paste your Supabase service_role key
   - Press Enter

   ```bash
   wrangler secret put INNGEST_EVENT_KEY
   ```
   - When prompted, paste your Inngest Event Key
   - Press Enter

   ```bash
   wrangler secret put INNGEST_BASE_URL
   ```
   - When prompted, paste: `https://api.inngest.com`
   - Press Enter (or your custom Inngest URL if different)

**Verify it worked**:
- No error messages
- Each command should say "✨ Successfully put secret"

**Can I do this for you?**: ❌ No - I can't access your secrets or paste them securely. You must do this yourself.

---

## STEP 5: Deploy the Worker

**What it does**: Uploads and activates your Cloudflare Worker with the cron trigger.

**How to do it**:

1. Make sure you're in the worker directory:
   ```bash
   cd cloudflare-worker
   ```

2. Deploy:
   ```bash
   wrangler deploy
   ```

3. Wait for it to finish. You should see:
   ```
   ✨ Compiled Worker successfully
   ✨ Uploaded runwise-polling-triggers
   ✨ Published runwise-polling-triggers
   ```

**Verify it worked**:
- No error messages
- Success message shown

**Can I do this for you?**: ✅ Yes! I can run this command for you. Just ask me to "deploy the Cloudflare Worker".

---

## STEP 6: Verify Deployment

**What it does**: Confirms the worker is running and the cron is active.

### 6.1: Check in Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Click **"Workers & Pages"** in the left sidebar
3. Find **"runwise-polling-triggers"**
4. Click on it
5. Go to **"Triggers"** tab
6. You should see:
   - **Cron Trigger**: `* * * * *` (every 1 minute)
   - Status: Active

### 6.2: Check Logs

In terminal:
```bash
cd cloudflare-worker
wrangler tail
```

You should see logs every minute:
```
[Polling Worker] Cron triggered at 2024-...
[Polling Worker] Found 0 due triggers
[Polling Worker] Completed: Polled 0, Triggered 0, Errors 0
```

Press `Ctrl+C` to stop watching logs.

**Can I do this for you?**: ⚠️ Partially - I can run `wrangler tail` for you, but you need to check the dashboard yourself.

---

## STEP 7: Test with a Workflow

**What it does**: Verifies the entire system works end-to-end.

### 7.1: Create a Test Workflow

1. Go to your app (localhost or production)
2. Create a new workflow
3. Add a **polling trigger** (e.g., "New Form Submission" or "New Email Received")
4. **Configure the trigger** with:
   - API keys
   - Form ID / Email account / etc.
   - **Poll Interval** (optional, defaults to 5 minutes)
5. Add an action node (e.g., "Send Email")
6. **Save the workflow**

### 7.2: Activate the Workflow

1. Click the **"Active" toggle** to activate
2. Check the browser console for logs:
   ```
   [Activation] Created polling trigger for workflow xxx, type new-form-submission, interval 300s
   ```

### 7.3: Verify in Database

In Supabase SQL Editor, run:
```sql
SELECT * FROM polling_triggers WHERE enabled = true;
```

You should see:
- Your workflow_id
- trigger_type (e.g., "new-form-submission")
- next_poll_at (should be recent timestamp)
- poll_interval (e.g., 300 for 5 minutes)
- enabled = true

### 7.4: Wait for Poll

1. Wait up to 1 minute (for the cron to fire)
2. Check Cloudflare Worker logs: `wrangler tail`
3. You should see:
   ```
   [Polling Worker] Found 1 due triggers
   [Polling Worker] Polled 1, Triggered 0, Errors 0
   ```

### 7.5: Test with New Data

1. Add new data to the external service:
   - Submit a new form (if using Google Forms)
   - Send a new email (if using Gmail)
   - Add a new row (if using Google Sheets)
   - etc.

2. Wait for next poll cycle (up to `poll_interval` seconds)

3. Check logs: `wrangler tail`
   - Should see: "New data found for workflow..."
   - Should see: "Triggered 1"

4. Check Inngest dashboard:
   - Should see `workflow/execute` event
   - Workflow should execute

**Can I do this for you?**: ❌ No - This requires your app and external services. You need to test this yourself.

---

## 🎯 Quick Checklist

Use this to track your progress:

- [ ] **Step 1**: Database migration run successfully
- [ ] **Step 2**: Got all environment variables (Supabase URL, key, Inngest key)
- [ ] **Step 3**: Installed npm dependencies (`npm install` in cloudflare-worker)
- [ ] **Step 4**: Set all 4 Cloudflare secrets
- [ ] **Step 5**: Deployed worker (`wrangler deploy`)
- [ ] **Step 6**: Verified in Cloudflare dashboard (cron trigger active)
- [ ] **Step 7**: Tested with a workflow (created, activated, verified in DB, tested polling)

---

## 🆘 Troubleshooting

### "wrangler: command not found"

**Fix**: Install Wrangler:
```bash
npm install -g wrangler
```

### "Authentication required" when deploying

**Fix**: Login again:
```bash
wrangler login
```

### "Failed to put secret"

**Fix**: Make sure you're in the `cloudflare-worker` directory:
```bash
cd cloudflare-worker
wrangler secret put SUPABASE_URL
```

### Worker not showing in dashboard

**Fix**: 
1. Check you're in the right Cloudflare account
2. Wait a few seconds and refresh
3. Check `wrangler deploy` output for errors

### No logs appearing

**Fix**:
1. Wait 1-2 minutes (cron runs every minute)
2. Check cron trigger is active in dashboard
3. Try `wrangler tail --format pretty`

### Database query errors

**Fix**:
1. Verify migration ran successfully
2. Check table exists: `SELECT * FROM polling_triggers LIMIT 1;`
3. Verify column names match

### Workflow not creating trigger

**Fix**:
1. Check browser console for errors
2. Verify workflow has a polling trigger node
3. Check trigger is configured (has API keys, etc.)
4. Verify workflow activation succeeded

---

## 📊 How to Monitor

### Daily Checks

1. **Worker logs**: `wrangler tail` (check for errors)
2. **Database**: Check trigger counts
3. **Inngest**: Check event counts

### Weekly Checks

1. **Cost**: Cloudflare dashboard (should be $0 on free tier)
2. **Performance**: Check average polling time
3. **Errors**: Review error logs

---

## 🔍 How It All Works Together

```
1. User activates workflow with polling trigger
   ↓
2. createPollingTrigger() creates entry in polling_triggers table
   - next_poll_at = now() (immediate first poll)
   - poll_interval = from config (default 300s = 5 min)
   - enabled = true
   ↓
3. Cloudflare Worker cron fires (every 1 minute)
   ↓
4. Queries: SELECT * FROM polling_triggers 
            WHERE next_poll_at <= NOW() AND enabled = true
            LIMIT 50
   ↓
5. For each due trigger:
   - Polls external API
   - Compares with last_cursor/last_seen_timestamp
   - If new data found:
     * Fetches workflow data (nodes, edges)
     * Sends Inngest event with idempotent ID
   - Updates next_poll_at = now() + poll_interval
   - Updates last_cursor/last_seen_timestamp
   ↓
6. Inngest receives event
   ↓
7. Workflow executes
```

---

## 🎓 Understanding the Architecture

### Database Table: `polling_triggers`

Each row represents one polling trigger for one workflow:

- `workflow_id`: Which workflow this trigger belongs to
- `trigger_type`: What type (e.g., "new-form-submission")
- `config`: API keys, form IDs, etc. (stored as JSON)
- `next_poll_at`: When to poll next (used by worker)
- `poll_interval`: How often to poll (in seconds)
- `last_cursor`: Last seen ID/cursor (for idempotency)
- `enabled`: Whether this trigger is active

### Cloudflare Worker

- Runs every 1 minute via cron
- Queries database for due triggers
- Polls external APIs
- Only emits Inngest events when new data found
- Updates database with new state

### Idempotency

Event IDs are: `${triggerId}:${cursor}`

This ensures:
- If cron fires twice → same event ID → Inngest deduplicates
- No duplicate workflow runs

---

## ✅ Success Criteria

You'll know everything is working when:

1. ✅ Worker logs show "Cron triggered" every minute
2. ✅ Database has polling trigger entries when workflows are activated
3. ✅ Workflows execute when new data is detected
4. ✅ No duplicate workflow runs
5. ✅ Inngest events only appear when data changes

---

## 🚀 Ready to Start?

Begin with **Step 1** (Database Migration) and work through each step. If you get stuck, refer to the troubleshooting section or ask for help!

**Remember**: Steps 1, 2, and 4 require your secrets - I can't do those for you. But I can help with Steps 3 and 5 (installing dependencies and deploying)!

Good luck! 🎉

