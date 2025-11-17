# Guide to Re-wire Inngest and Workflow Execution

This guide explains how to re-enable Inngest and workflow execution functionality that was temporarily disabled.

## What Was Disabled

1. **Inngest API Route** (`src/app/api/inngest/route.ts`)
   - Returns 503 error for all requests
   - Original code is commented out at the bottom

2. **Workflow Execution API Route** (`src/app/api/workflow/execute/route.ts`)
   - Returns 503 error for all requests
   - Original code is commented out

3. **Test Workflow Button** (`src/components/ui/react-flow-editor.tsx`)
   - Shows alert when clicked
   - Original `executeWorkflow` function is commented out

4. **Scheduled Workflow Executor** (`src/inngest/functions.ts`)
   - Cron trigger is disabled (commented out)
   - Changed to manual event trigger

## Steps to Re-enable

### Step 1: Re-enable Inngest API Route

1. Open `src/app/api/inngest/route.ts`
2. Remove the disabled GET/POST/PUT handlers (lines 16-35)
3. Uncomment the original code at the bottom (lines 37-60)
4. Remove the comment block markers

### Step 2: Re-enable Workflow Execution API Route

1. Open `src/app/api/workflow/execute/route.ts`
2. Remove the early return statement (lines 20-27)
3. Uncomment all the imports at the top (lines 13-17)
4. Uncomment the original code block (lines 29-131)
5. Remove the comment block markers

### Step 3: Re-enable Test Workflow Button

1. Open `src/components/ui/react-flow-editor.tsx`
2. Find the `executeWorkflow` function (around line 790)
3. Remove the early return and alert (lines 791-793)
4. Uncomment the original code block (lines 795-996)
5. Remove the comment block markers

### Step 4: Re-enable Scheduled Workflow Executor (Optional)

1. Open `src/inngest/functions.ts`
2. Find `scheduledWorkflowExecutor` (around line 262)
3. Uncomment the cron trigger (lines 268-270)
4. Remove the manual event trigger line (line 272)
5. Remove the comment markers

### Step 5: Verify Configuration

1. **Check Environment Variables:**
   - `INNGEST_EVENT_KEY` - Your Inngest event key
   - `INNGEST_SIGNING_KEY` - Your Inngest signing key
   - `INNGEST_SERVE_PATH` - Should be `/api/inngest`

2. **Check Middleware:**
   - Ensure `src/middleware.ts` excludes `/api/inngest` from auth checks
   - This should already be done (line 85)

3. **Test Locally:**
   - Start Inngest dev server: `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`
   - Test workflow execution button
   - Check Inngest dashboard for executions

4. **Test in Production:**
   - Deploy to staging first
   - Verify Inngest dashboard shows your functions
   - Test a simple workflow execution
   - Monitor for any retry loops or errors

## Important Notes

- **Before re-enabling scheduled workflows:** Make sure the cron trigger logic is fixed to prevent infinite retry loops
- **Monitor closely:** Watch the Inngest dashboard for the first few hours after re-enabling
- **Error handling:** The code now has comprehensive error handling, but test thoroughly
- **Gradual rollout:** Consider enabling features one at a time (API route → test button → scheduled workflows)

## Files Modified

- `src/app/api/inngest/route.ts` - Inngest webhook endpoint
- `src/app/api/workflow/execute/route.ts` - Workflow execution endpoint
- `src/components/ui/react-flow-editor.tsx` - Test workflow button
- `src/inngest/functions.ts` - Scheduled workflow executor
- `src/middleware.ts` - Already excludes `/api/inngest`

## Troubleshooting

If you encounter issues after re-enabling:

1. **404 errors on `/api/inngest`:**
   - Check middleware configuration
   - Verify route file exists and is properly exported
   - Check Next.js build logs

2. **Infinite retry loops:**
   - Check scheduled workflow executor cron logic
   - Verify error handling in functions
   - Check Inngest dashboard for error patterns

3. **Workflow execution not working:**
   - Verify Inngest is connected and synced
   - Check function registration in Inngest dashboard
   - Review server logs for errors

4. **Test button shows error:**
   - Check browser console for errors
   - Verify API route is accessible
   - Check network tab for failed requests

