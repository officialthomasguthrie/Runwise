# Inngest Usage Monitoring

## Overview

This monitoring system tracks all Inngest function executions to help you:
- Monitor quota usage
- Track costs
- Identify performance issues
- Debug failures
- Analyze usage patterns

## Setup

### 1. Run Database Migration

Execute the SQL migration to create the monitoring table:

```bash
# Run this in your Supabase SQL editor or via psql
psql -h your-db-host -U your-user -d your-database -f database/migrations/create_inngest_monitoring_table.sql
```

Or manually run the SQL from `database/migrations/create_inngest_monitoring_table.sql` in your Supabase dashboard.

### 2. Verify Monitoring is Active

The monitoring is automatically integrated into Inngest functions:
- `workflow-executor` - Tracks all workflow executions
- `scheduled-workflow-trigger` - Tracks scheduled workflow triggers

## What Gets Tracked

For each Inngest function execution, we track:

- **Function Info**: ID, name, event ID, run ID
- **User Context**: User ID, workflow ID, execution ID
- **Trigger Type**: manual, scheduled, webhook, polling, test
- **Execution Metrics**: 
  - Status (started, completed, failed, cancelled)
  - Duration (milliseconds)
  - Step count (number of `step.run()` calls - affects quota)
  - Error messages and stack traces
- **Timestamps**: Started at, completed at
- **Metadata**: Additional context (node count, cron expression, etc.)

## Viewing Usage Statistics

### API Endpoint

Get usage statistics via the API:

```bash
# Get all stats (requires authentication for user-specific stats)
GET /api/inngest/monitoring

# Filter by date range
GET /api/inngest/monitoring?startDate=2024-01-01&endDate=2024-01-31

# Filter by function
GET /api/inngest/monitoring?functionId=workflow-executor

# Filter by user (only your own stats)
GET /api/inngest/monitoring?userId=your-user-id
```

### Response Format

```json
{
  "totalExecutions": 150,
  "successfulExecutions": 145,
  "failedExecutions": 5,
  "totalSteps": 750,
  "totalDurationMs": 45000,
  "averageDurationMs": 300,
  "byFunction": [
    {
      "functionId": "workflow-executor",
      "functionName": "Workflow Executor",
      "count": 100,
      "steps": 500,
      "avgDuration": 250
    },
    {
      "functionId": "scheduled-workflow-trigger",
      "functionName": "Scheduled Workflow Trigger",
      "count": 50,
      "steps": 250,
      "avgDuration": 350
    }
  ],
  "byTriggerType": [
    {
      "triggerType": "manual",
      "count": 80
    },
    {
      "triggerType": "scheduled",
      "count": 50
    },
    {
      "triggerType": "webhook",
      "count": 20
    }
  ]
}
```

## Understanding Quota Usage

### Inngest Quota Calculation

Inngest charges based on:
- **Function executions**: Each time a function runs
- **Steps**: Each `step.run()` call within a function
- **Sleep time**: `step.sleepUntil()` is **FREE** (doesn't count)

### Your Current Architecture

✅ **Efficient**:
- **Scheduled workflows**: Use `step.sleepUntil()` which is FREE
- **Webhooks**: Only trigger when webhook is received (event-driven)
- **Polling**: Handled by Cloudflare Worker (not Inngest), only sends events when new data found

### Monitoring Step Counts

The `step_count` field in the monitoring table shows how many `step.run()` calls were made. This directly correlates to quota usage.

**Example**:
- `workflow-executor` typically has 4-5 steps per execution
- `scheduled-workflow-trigger` typically has 3-4 steps per execution

## Querying the Database Directly

### Get Recent Executions

```sql
SELECT 
  function_name,
  status,
  step_count,
  duration_ms,
  trigger_type,
  started_at
FROM inngest_function_executions
ORDER BY started_at DESC
LIMIT 50;
```

### Get Daily Usage

```sql
SELECT 
  DATE(started_at) as date,
  function_id,
  COUNT(*) as executions,
  SUM(step_count) as total_steps,
  AVG(duration_ms) as avg_duration_ms
FROM inngest_function_executions
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(started_at), function_id
ORDER BY date DESC;
```

### Get Failed Executions

```sql
SELECT 
  function_name,
  error_message,
  workflow_id,
  started_at
FROM inngest_function_executions
WHERE status = 'failed'
ORDER BY started_at DESC
LIMIT 20;
```

### Get Quota Usage by User

```sql
SELECT 
  user_id,
  COUNT(*) as executions,
  SUM(step_count) as total_steps
FROM inngest_function_executions
WHERE started_at >= NOW() - INTERVAL '1 month'
  AND user_id IS NOT NULL
GROUP BY user_id
ORDER BY total_steps DESC;
```

## Cost Estimation

Based on Inngest pricing (as of 2024):
- Each step costs ~$0.0001 (varies by plan)
- Example: 1000 executions × 5 steps = 5000 steps = ~$0.50

Use the monitoring data to:
1. Calculate actual costs: `SUM(step_count) * cost_per_step`
2. Identify high-usage users
3. Optimize functions to reduce step counts

## Troubleshooting

### No Data in Monitoring Table

1. Check if migration was run
2. Verify functions are executing (check Inngest dashboard)
3. Check for errors in function logs

### High Step Counts

- Review function code for unnecessary `step.run()` calls
- Consider batching operations
- Use `step.sleepUntil()` instead of multiple delayed events

### Missing Executions

- Monitoring failures don't block function execution
- Check console logs for `[Monitoring] Failed to log` errors
- Verify database connection and permissions

## Next Steps

1. **Set up alerts**: Create database triggers or scheduled queries to alert on high usage
2. **Build dashboard**: Create a UI to visualize usage stats
3. **Cost tracking**: Integrate with billing system to track costs per user
4. **Optimization**: Use monitoring data to identify and optimize high-cost functions

