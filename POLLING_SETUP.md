# Polling Triggers Setup Guide

## Overview

Polling triggers have been migrated from Inngest to Vercel Cron for better efficiency and cost savings. The new architecture:

1. **Detection Layer (Vercel Cron)**: Polls external APIs, compares state, emits events only when new data is found
2. **Execution Layer (Inngest)**: Only runs when actual work exists

## What Changed

- ✅ Polling now runs on Vercel Cron (cheaper, more efficient)
- ✅ State tracking in database (avoids duplicate triggers)
- ✅ Only emits Inngest events when new data is detected
- ✅ Removed Inngest polling function (no longer needed)

## Setup Steps

### 1. Run Database Migration

Execute the SQL migration to create the polling state table:

```bash
# Run this in your Supabase SQL editor or via psql
psql -h your-db-host -U your-user -d your-database -f database/migrations/add_workflow_polling_state.sql
```

Or manually run the SQL from `database/migrations/add_workflow_polling_state.sql` in your Supabase dashboard.

### 2. Add Environment Variable

Add to your `.env.local` and Vercel environment variables:

```env
CRON_SECRET=your-random-secret-here
```

Generate a secure random secret:
```bash
openssl rand -hex 32
```

### 3. Deploy to Vercel

The `vercel.json` file is already configured with:
- Cron schedule: Every 15 minutes (`*/15 * * * *`)
- Endpoint: `/api/cron/poll-triggers`

After deploying, Vercel will automatically set up the cron job.

### 4. Verify Setup

1. Activate a workflow with a polling trigger
2. Check logs in Vercel dashboard for cron executions
3. Verify polling state is created in database
4. Test by adding new data to the external service

## How It Works

### Workflow Activation

When a workflow with a polling trigger is activated:
1. Polling state is initialized in the database
2. Vercel Cron will start checking this workflow on the next cycle

### Polling Cycle (Every 15 minutes)

1. Vercel Cron calls `/api/cron/poll-triggers`
2. Fetches all active workflows with polling triggers
3. For each workflow:
   - Gets last seen state from database
   - Polls external API
   - Compares with last state
   - **Only if new data found**: Emits Inngest event
   - Updates state in database

### Supported Trigger Types

- `new-form-submission` - Google Forms
- `new-email-received` - Gmail
- `new-row-in-google-sheet` - Google Sheets
- `new-message-in-slack` - Slack
- `new-github-issue` - GitHub
- `file-uploaded` - Google Drive

## Monitoring

### Check Cron Execution

View logs in Vercel dashboard:
- Go to your project → Functions → `/api/cron/poll-triggers`
- Check execution logs for polling results

### Check Polling State

Query the database:
```sql
SELECT * FROM workflow_polling_state 
WHERE workflow_id = 'your-workflow-id';
```

### Check Inngest Events

Only events with new data should appear in Inngest dashboard.

## Troubleshooting

### Cron Not Running

1. Check `vercel.json` is deployed
2. Verify cron is configured in Vercel dashboard
3. Check Vercel plan supports cron jobs (Pro plan required for frequent schedules)

### Polling Not Detecting New Data

1. Check API credentials are correct in workflow config
2. Verify polling state is being updated
3. Check cron execution logs for errors
4. Ensure workflow is active (`status = 'active'`)

### Too Many Inngest Events

If you see duplicate events:
1. Check polling state is being updated correctly
2. Verify `lastSeenTimestamp` or `lastSeenId` is being tracked
3. Check for race conditions (shouldn't happen with proper state tracking)

## Cost Comparison

### Before (Inngest Polling)
- 288 executions/day minimum (every 5 min)
- 8,640 executions/month
- Uses Inngest quota (expensive)

### After (Vercel Cron)
- 96 executions/day (every 15 min)
- 2,880 executions/month
- Uses Vercel quota (1M free on Hobby plan)
- Only emits Inngest events when data changes

**Savings**: ~99% reduction in unnecessary executions!

## Customization

### Change Polling Interval

Edit `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/poll-triggers",
      "schedule": "*/30 * * * *"  // Every 30 minutes
    }
  ]
}
```

### Add New Trigger Type

1. Add trigger type to `POLLING_TRIGGER_TYPES` in `/api/cron/poll-triggers/route.ts`
2. Add polling function in `src/lib/workflows/polling-service.ts`
3. Update workflow activation to recognize new type

## Security

The cron endpoint is protected by:
1. Vercel Cron header (`x-vercel-cron`)
2. Optional `CRON_SECRET` for manual testing

For production, rely on Vercel's cron header. The secret is mainly for local testing.


