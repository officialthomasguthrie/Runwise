# Cloudflare Worker Deployment Checklist

> **📖 For a complete detailed guide, see `COMPLETE_SETUP_GUIDE.md`**

# Cloudflare Worker Deployment Checklist

## ✅ What's Been Implemented

1. ✅ Database schema (`polling_triggers` table)
2. ✅ Cloudflare Worker code (cron every 1 minute)
3. ✅ Batching (50 triggers per run)
4. ✅ Idempotent event IDs
5. ✅ Workflow activation integration
6. ✅ Polling service for all trigger types
7. ✅ Worker limit handling
8. ✅ Vercel Cron removed

## 📋 Step-by-Step Deployment

### Step 1: Run Database Migration ⚠️ REQUIRED

**Location**: `database/migrations/create_polling_triggers_table.sql`

**How to run**:
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database/migrations/create_polling_triggers_table.sql`
4. Click "Run"

**Or via command line**:
```bash
psql -h your-db-host -U your-user -d your-database -f database/migrations/create_polling_triggers_table.sql
```

**Verify it worked**:
```sql
SELECT * FROM polling_triggers LIMIT 1;
```
(Should return empty result, not an error)

---

### Step 2: Install Worker Dependencies

```bash
cd cloudflare-worker
npm install
```

**Verify**: Should see `node_modules` folder created

---

### Step 3: Set Environment Variables

#### For Local Development (Optional)

Create `cloudflare-worker/.dev.vars`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
INNGEST_EVENT_KEY=your-inngest-event-key-here
INNGEST_BASE_URL=https://api.inngest.com
```

#### For Production (REQUIRED)

Set secrets in Cloudflare:

```bash
cd cloudflare-worker

# Set each secret (will prompt for value)
wrangler secret put SUPABASE_URL
# Paste: https://your-project.supabase.co

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste: Your Supabase service role key

wrangler secret put INNGEST_EVENT_KEY
# Paste: Your Inngest event key

wrangler secret put INNGEST_BASE_URL
# Paste: https://api.inngest.com (or your Inngest URL)
```

**Where to find these values**:
- **SUPABASE_URL**: Supabase dashboard → Settings → API → Project URL
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase dashboard → Settings → API → service_role key (secret)
- **INNGEST_EVENT_KEY**: Inngest dashboard → Settings → Event Key
- **INNGEST_BASE_URL**: Usually `https://api.inngest.com` (or your custom domain)

---

### Step 4: Deploy the Worker

```bash
cd cloudflare-worker
wrangler deploy
```

**Expected output**:
```
✨ Compiled Worker successfully
✨ Uploaded runwise-polling-triggers
✨ Published runwise-polling-triggers
```

---

### Step 5: Verify Deployment

#### Check Worker is Running

```bash
wrangler tail
```

You should see logs every minute when the cron fires:
```
[Polling Worker] Cron triggered at 2024-...
[Polling Worker] Found 0 due triggers
[Polling Worker] Completed: Polled 0, Triggered 0, Errors 0
```

#### Check in Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Select your account
3. Go to Workers & Pages
4. Find `runwise-polling-triggers`
5. Check "Triggers" tab - should show cron: `* * * * *`

---

### Step 6: Test with a Workflow

1. **Create a workflow** with a polling trigger (e.g., Google Forms)
2. **Configure the trigger** with API keys
3. **Activate the workflow**
4. **Check database**:
   ```sql
   SELECT * FROM polling_triggers WHERE workflow_id = 'your-workflow-id';
   ```
   Should see an entry with `enabled = true` and `next_poll_at` set

5. **Wait for next poll** (up to 1 minute)
6. **Check logs**: `wrangler tail`
7. **Check Inngest dashboard** for events (only if new data found)

---

## 🔍 How to Verify Everything Works

### 1. Check Database

```sql
-- See all polling triggers
SELECT 
  id, 
  workflow_id, 
  trigger_type, 
  enabled, 
  next_poll_at, 
  poll_interval 
FROM polling_triggers;
```

### 2. Check Worker Logs

```bash
wrangler tail
```

Look for:
- ✅ "Cron triggered" every minute
- ✅ "Found X due triggers"
- ✅ No errors

### 3. Check Inngest Events

- Go to Inngest dashboard
- Look for `workflow/execute` events
- Should only see events when new data is detected

### 4. Test Workflow Execution

- Activate a workflow with polling trigger
- Add new data to the external service (e.g., submit a form)
- Wait up to `poll_interval` seconds
- Workflow should execute

---

## 🐛 Troubleshooting

### Worker Not Deploying

**Error**: "Authentication required"
- **Fix**: Run `wrangler login` again

**Error**: "Invalid secret"
- **Fix**: Check secret names match exactly (case-sensitive)

### No Triggers Being Polled

**Check**:
1. Are there enabled triggers in database?
   ```sql
   SELECT COUNT(*) FROM polling_triggers WHERE enabled = true;
   ```

2. Are any triggers due?
   ```sql
   SELECT * FROM polling_triggers 
   WHERE enabled = true 
   AND next_poll_at <= NOW();
   ```

3. Check logs for errors: `wrangler tail`

### Worker Timeout Errors

**Symptom**: Worker fails or times out
- **Fix**: Reduce batch size in `cloudflare-worker/src/index.ts` (line with `limit: 50`)

### Duplicate Workflow Runs

**Symptom**: Same workflow runs multiple times
- **Check**: Event IDs should be unique: `${triggerId}:${cursor}`
- **Verify**: Inngest event deduplication is working

### API Polling Errors

**Symptom**: Errors in logs about API calls
- **Check**: API keys are correct in trigger config
- **Check**: API rate limits not exceeded
- **Check**: External service is accessible

---

## 📊 Monitoring

### Daily Checks

1. **Worker logs**: `wrangler tail` (check for errors)
2. **Database**: Check trigger counts
3. **Inngest**: Check event counts

### Weekly Checks

1. **Cost**: Cloudflare dashboard (should be $0 on free tier)
2. **Performance**: Check average polling time
3. **Errors**: Review error logs

---

## 🎯 What Happens Next

Once deployed:

1. **Every 1 minute**: Cloudflare Worker cron fires
2. **Queries database**: Gets due triggers (next_poll_at <= now)
3. **Polls APIs**: Only for due triggers
4. **Compares state**: Uses last_cursor/last_seen_timestamp
5. **Emits events**: Only if new data found (idempotent)
6. **Updates schedule**: Sets next_poll_at = now + poll_interval

---

## ✅ Success Criteria

You'll know it's working when:

- ✅ Worker logs show "Cron triggered" every minute
- ✅ Database has polling trigger entries
- ✅ Workflows execute when new data is detected
- ✅ No duplicate workflow runs
- ✅ Inngest events only appear when data changes

---

## 📞 Need Help?

1. Check `CLOUDFLARE_WORKER_SETUP.md` for detailed docs
2. Review `wrangler tail` logs
3. Check database state
4. Verify environment variables

---

## 🚀 You're Ready!

Follow the steps above in order. The most important steps are:
1. **Database migration** (Step 1)
2. **Set secrets** (Step 3)
3. **Deploy** (Step 4)

Good luck! 🎉

