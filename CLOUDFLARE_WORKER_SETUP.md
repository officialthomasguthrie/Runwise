# Cloudflare Worker Setup Guide

## Overview

Polling triggers are now handled by a Cloudflare Worker that runs every 1 minute. It uses database-backed scheduling where each trigger has its own `next_poll_at` and `poll_interval`.

## Architecture

```
Cloudflare Worker (Cron: Every 1 minute)
  ↓
Query: SELECT triggers WHERE next_poll_at <= now() AND enabled = true
  ↓
Poll each due trigger (max 50 per run)
  ↓
Compare with last_cursor/last_seen_timestamp
  ↓
Only if new data → Send Inngest event (idempotent)
  ↓
Update next_poll_at = now() + poll_interval
```

## Prerequisites

✅ Cloudflare account (free)
✅ Node.js installed
✅ Wrangler CLI installed (`npm install -g wrangler`)
✅ Logged in to Cloudflare (`wrangler login`)

## Setup Steps

### 1. Run Database Migration

Execute the SQL migration to create the `polling_triggers` table:

```sql
-- Run this in your Supabase SQL editor
-- File: database/migrations/create_polling_triggers_table.sql
```

Or via command line:
```bash
psql -h your-db-host -U your-user -d your-database -f database/migrations/create_polling_triggers_table.sql
```

### 2. Install Dependencies

Navigate to the cloudflare-worker directory:

```bash
cd cloudflare-worker
npm install
```

### 3. Configure Environment Variables

Create a `.dev.vars` file for local development:

```bash
# cloudflare-worker/.dev.vars
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_BASE_URL=https://api.inngest.com
```

**For production**, set these as secrets in Cloudflare:

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put INNGEST_EVENT_KEY
wrangler secret put INNGEST_BASE_URL  # Optional, defaults to https://api.inngest.com
```

### 4. Deploy the Worker

```bash
cd cloudflare-worker
wrangler deploy
```

The worker will be deployed and the cron trigger will start running automatically.

### 5. Verify Deployment

Check the worker is running:

```bash
wrangler tail
```

You should see logs every minute when the cron fires.

## How It Works

### Workflow Activation

When a workflow with a polling trigger is activated:

1. `createPollingTrigger()` is called
2. Entry created in `polling_triggers` table with:
   - `next_poll_at` = now() (immediate first poll)
   - `poll_interval` = from config (default 300 seconds = 5 minutes)
   - `enabled` = true
   - `config` = trigger configuration (API keys, etc.)

### Polling Cycle (Every 1 minute)

1. Cloudflare Worker cron fires
2. Queries database: `SELECT * FROM polling_triggers WHERE next_poll_at <= now() AND enabled = true LIMIT 50`
3. For each due trigger:
   - Polls external API
   - Compares with `last_cursor` or `last_seen_timestamp`
   - If new data found:
     - Fetches workflow data (nodes, edges)
     - Sends Inngest event with idempotent event ID
   - Updates `next_poll_at = now() + poll_interval`
   - Updates `last_cursor` or `last_seen_timestamp`

### Idempotency

Event IDs are formatted as: `${triggerId}:${cursor}`

This ensures:
- If Cloudflare cron fires twice → same event ID → Inngest deduplicates
- If worker retries → same event ID → no duplicate workflow runs

## Configuration

### Poll Interval

Users can configure poll interval per trigger:

- Default: 300 seconds (5 minutes)
- Configurable via trigger node config: `pollInterval` (in minutes)
- Stored in `poll_interval` column (in seconds)

### Supported Trigger Types

- `new-form-submission` - Google Forms
- `new-email-received` - Gmail
- `new-row-in-google-sheet` - Google Sheets
- `new-message-in-slack` - Slack
- `new-github-issue` - GitHub
- `file-uploaded` - Google Drive

## Monitoring

### View Logs

```bash
wrangler tail
```

### Check Database

Query active triggers:
```sql
SELECT * FROM polling_triggers WHERE enabled = true;
```

Query due triggers:
```sql
SELECT * FROM polling_triggers 
WHERE enabled = true 
AND next_poll_at <= NOW()
ORDER BY next_poll_at ASC;
```

### Check Inngest Events

Only events with new data should appear in Inngest dashboard.

## Troubleshooting

### Worker Not Running

1. Check deployment: `wrangler deployments list`
2. Check logs: `wrangler tail`
3. Verify cron is configured: Check `wrangler.toml`

### No Triggers Being Polled

1. Check database: Are there enabled triggers?
2. Check `next_poll_at`: Are any triggers due?
3. Check logs for errors

### Duplicate Workflow Runs

1. Verify event IDs are unique: `${triggerId}:${cursor}`
2. Check Inngest event deduplication
3. Verify `last_cursor` is being updated

### Worker Timeout

1. Reduce batch size (currently 50)
2. Check individual API polling times
3. Consider pagination limits

## Cost

### Cloudflare Workers Free Tier

- **100,000 requests/day** (free)
- **10ms CPU time** per request (free)
- **Cron triggers**: Free

### Usage Estimate

- 1 cron per minute = 1,440 requests/day
- Well within 100K free tier
- **Cost: $0**

## Migration from Vercel Cron

If you previously used Vercel Cron:

1. ✅ Database migration already includes new table
2. ✅ Workflow activation updated to use new system
3. ⚠️ Remove Vercel Cron configuration from `vercel.json`
4. ⚠️ Remove `/api/cron/poll-triggers` route (optional, can keep for manual testing)

## Next Steps

1. Run database migration
2. Deploy Cloudflare Worker
3. Test with a workflow
4. Monitor logs
5. Verify Inngest events

## Support

If you encounter issues:
1. Check `wrangler tail` for errors
2. Check database for trigger state
3. Verify environment variables
4. Check Inngest dashboard for events


