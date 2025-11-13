# Supabase Setup Guide for Workflow Storage

This guide walks you through setting up Supabase for the workflow storage system.

## Prerequisites

- A Supabase account and project
- Access to your Supabase project dashboard
- Your Supabase project URL and anon key

## Step 1: Environment Variables

First, make sure your `.env.local` file has your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### How to Get These Values:

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 2: Run the Initial Database Schema (If Not Already Done)

If you haven't already set up your database schema:

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy and paste the entire contents of `database/schema.sql`
4. Click **Run** (or press `Ctrl/Cmd + Enter`)

This creates:
- All necessary tables
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers and functions
- Initial seed data

## Step 3: Add the `workflow_data` Column

This is the most important step for workflow storage. You need to add a JSONB column to store the workflow structure.

### Option A: Using SQL Editor (Recommended)

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy and paste the entire contents of `database/migrations/add_workflow_data_column.sql`
4. Click **Run**

This will:
- Add the `workflow_data` JSONB column to the `workflows` table
- Create a GIN index on `workflow_data` for efficient querying
- Add a helpful comment explaining the column

### Option B: Using Table Editor

1. Go to **Table Editor** in your Supabase dashboard
2. Find the `workflows` table and click on it
3. Click **Add Column**
4. Configure:
   - **Name**: `workflow_data`
   - **Type**: `jsonb`
   - **Default value**: `{}`
   - **Is nullable**: No (uncheck)
5. Click **Save**

Then you'll need to create the index manually:
1. Go to **SQL Editor**
2. Run:
```sql
CREATE INDEX IF NOT EXISTS idx_workflows_workflow_data 
ON public.workflows USING GIN(workflow_data);
```

## Step 4: Verify Row Level Security (RLS)

RLS policies should already be set up from Step 2, but let's verify:

1. Go to **Authentication** → **Policies** in your Supabase dashboard
2. Select the `workflows` table
3. You should see these policies:
   - ✅ `Users can view own workflows` (SELECT)
   - ✅ `Users can view public workflows` (SELECT)
   - ✅ `Users can create workflows` (INSERT)
   - ✅ `Users can update own workflows` (UPDATE)
   - ✅ `Users can delete own workflows` (DELETE)

If these policies are missing, go to **SQL Editor** and run:

```sql
-- Workflows policies
CREATE POLICY "Users can view own workflows" ON public.workflows
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public workflows" ON public.workflows
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can create workflows" ON public.workflows
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflows" ON public.workflows
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workflows" ON public.workflows
    FOR DELETE USING (auth.uid() = user_id);
```

## Step 5: Verify the Migration Was Successful

Run this query in the SQL Editor to verify everything is set up correctly:

```sql
-- Check if workflow_data column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'workflows'
    AND column_name = 'workflow_data';

-- Check if index exists
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE tablename = 'workflows' 
    AND indexname = 'idx_workflows_workflow_data';

-- Test workflow_data structure (should return empty results if no workflows exist)
SELECT 
    id, 
    name, 
    jsonb_typeof(workflow_data) as data_type,
    workflow_data
FROM public.workflows
LIMIT 5;
```

Expected results:
- ✅ Column should show `workflow_data | jsonb | NO | '{}'::jsonb`
- ✅ Index should be listed
- ✅ Query should run without errors

## Step 6: Test the API

After completing the above steps, restart your Next.js dev server and test:

1. **Create a workflow**:
   - Navigate to `/workspace` or create a new workflow
   - Make some changes to the workflow
   - Wait 30 seconds (auto-save) or manually save

2. **Check Supabase**:
   - Go to **Table Editor** → `workflows` table
   - You should see your workflow with a populated `workflow_data` column

3. **Verify Loading**:
   - Refresh the page
   - The workflow should load automatically from the database

## Troubleshooting

### Error: "column workflow_data does not exist"

**Solution**: Run the migration in Step 3 again. Make sure you're connected to the correct database.

### Error: "new row violates row-level security policy"

**Solution**: Check that RLS policies are correctly set up (Step 4). Also ensure:
- You're logged in to your app
- The user ID matches the `user_id` in the workflow

### Error: "permission denied for table workflows"

**Solution**: 
1. Verify your environment variables are correct (Step 1)
2. Check that RLS policies allow the current user to access the table
3. Make sure you're using the server-side Supabase client in API routes

### Workflows not saving

**Solution**:
1. Check browser console for errors
2. Check Next.js terminal for API errors
3. Verify `workflow_data` column exists and is JSONB type
4. Check RLS policies allow INSERT/UPDATE

### Workflows not loading

**Solution**:
1. Verify the workflow exists in the database
2. Check that `workflowId` in the URL matches a workflow ID in the database
3. Verify RLS policies allow SELECT
4. Check browser console and network tab for API errors

## What the `workflow_data` Column Stores

The `workflow_data` column stores a JSON structure like this:

```json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "workflow-node",
      "position": { "x": 100, "y": 100 },
      "data": {
        "nodeId": "send-email",
        "config": { "to": "user@example.com", "subject": "Hello" }
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "type": "buttonedge",
      "animated": true,
      "style": { "stroke": "hsl(var(--primary))", "strokeWidth": 2 }
    }
  ]
}
```

This format is automatically serialized/deserialized by the code in `src/lib/workflows/utils.ts`.

## Next Steps

Once this is set up:
- ✅ Workflows will auto-save every 30 seconds
- ✅ Workflows will load automatically when opening `/workspace/[id]`
- ✅ All workflow data (nodes, edges, positions) will persist in the database
- ✅ Each user will only see their own workflows (via RLS)

## Support

If you encounter any issues, check:
1. Supabase dashboard logs: **Logs** → **Postgres Logs**
2. Next.js terminal output for API errors
3. Browser console for client-side errors
4. Network tab in browser DevTools for failed API requests

