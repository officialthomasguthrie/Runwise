# Workflow Execution System - Database Setup

This guide will help you set up the database tables required for workflow execution tracking.

## Prerequisites

- Supabase project already set up
- Database connection established
- Authentication tables (`users`) already created

## Setup Steps

### 1. Run the Schema SQL

**⚠️ Important:** This SQL will **drop existing tables** if they exist to ensure correct data types.

Execute the SQL file in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of workflow-execution-schema.sql
-- Located at: database/workflow-execution-schema.sql
```

**What this does:**
1. Drops existing `execution_logs`, `node_execution_results`, `workflow_executions` tables (if they exist)
2. Creates fresh tables with correct TEXT data types

This will create:
- ✅ `workflow_executions` table
- ✅ `node_execution_results` table
- ✅ `execution_logs` table
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Automatic triggers

### 2. Verify Tables Created

Run this query to verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('workflow_executions', 'node_execution_results', 'execution_logs');
```

You should see all 3 tables listed.

### 3. Verify RLS Policies

Check that RLS policies are active:

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('workflow_executions', 'node_execution_results', 'execution_logs');
```

You should see multiple policies for each table.

## Tables Overview

### `workflow_executions`
Main table tracking workflow execution records.

**Columns:**
- `id` (TEXT, PRIMARY KEY) - Execution ID
- `workflow_id` (TEXT) - Workflow being executed
- `user_id` (UUID, FK to users) - User who ran the workflow
- `status` (TEXT) - 'queued', 'running', 'success', 'failed', or 'partial'
- `started_at` (TIMESTAMPTZ) - When execution started
- `completed_at` (TIMESTAMPTZ) - When execution completed
- `duration_ms` (INTEGER) - Execution duration in milliseconds
- `final_output` (JSONB) - Final workflow output
- `error` (TEXT) - Error message if failed

### `node_execution_results`
Stores individual node execution results within a workflow.

**Columns:**
- `id` (TEXT, PRIMARY KEY) - Result ID
- `execution_id` (TEXT, FK to workflow_executions) - Parent execution
- `node_id` (TEXT) - Node identifier
- `node_name` (TEXT) - Human-readable node name
- `status` (TEXT) - 'success', 'failed', or 'skipped'
- `output_data` (JSONB) - Node output data
- `error` (TEXT) - Error message if failed
- `duration_ms` (INTEGER) - Node execution duration

### `execution_logs`
Stores logs generated during execution.

**Columns:**
- `id` (TEXT, PRIMARY KEY) - Log ID
- `execution_id` (TEXT, FK to workflow_executions) - Parent execution
- `node_result_id` (TEXT, FK to node_execution_results) - Optional node result
- `level` (TEXT) - 'info', 'warn', 'error', or 'debug'
- `message` (TEXT) - Log message
- `data` (JSONB) - Additional log data
- `timestamp` (TIMESTAMPTZ) - When log was created

## Security

All tables have Row Level Security (RLS) enabled:
- Users can only view/edit their own execution data
- Policies enforce `user_id` matching `auth.uid()`
- Cascading deletes maintain referential integrity

## Querying Execution Data

### Get user's recent executions:
```sql
SELECT * FROM workflow_executions 
WHERE user_id = auth.uid() 
ORDER BY created_at DESC 
LIMIT 10;
```

### Get execution details with node results:
```sql
SELECT 
  e.*,
  json_agg(nr.*) as node_results
FROM workflow_executions e
LEFT JOIN node_execution_results nr ON nr.execution_id = e.id
WHERE e.id = 'execution-id-here'
GROUP BY e.id;
```

### Get execution logs:
```sql
SELECT * FROM execution_logs 
WHERE execution_id = 'execution-id-here' 
ORDER BY timestamp ASC;
```

## Troubleshooting

### Error: "foreign key constraint cannot be implemented" (Type mismatch)
**Fixed!** ✅ The schema now uses TEXT for all ID columns to match the execution ID format.
- If you see this error, you're using an old version of the schema
- Make sure to use the updated `workflow-execution-schema.sql` file
- All ID columns are now TEXT (not UUID) for consistency

### Error: "relation does not exist"
- Make sure you ran the schema SQL file
- Check that you're connected to the correct Supabase project

### Error: "new row violates row-level security policy"
- Verify RLS policies are created
- Check that `user_id` is being set correctly
- Ensure user is authenticated

### Error: "extension pgcrypto does not exist"
- The schema automatically creates it
- If you get this error, run: `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`
- This is required for `gen_random_uuid()` function

### Performance Issues
- Indexes are automatically created
- For large datasets, consider partitioning by date
- Monitor query performance in Supabase Dashboard

## Next Steps

After setup:
1. ✅ Test workflow execution from the UI
2. ✅ Check that execution records appear in database
3. ✅ Verify logs are being saved
4. ✅ Test viewing execution history

## Support

If you encounter issues:
1. Check Supabase logs in Dashboard
2. Verify authentication is working
3. Test RLS policies with sample queries
4. Check browser console for API errors

