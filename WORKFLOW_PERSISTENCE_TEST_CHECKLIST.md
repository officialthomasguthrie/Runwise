# ✅ Workflow Persistence - Quick Test Checklist

Run through this checklist to verify workflow persistence is working correctly.

---

## 🗄️ **Pre-Test: Database Setup**

### **Step 1: Verify Workflows Table**
- [ ] Go to Supabase Dashboard
- [ ] Navigate to Table Editor
- [ ] Confirm `workflows` table exists
- [ ] If not, run `database/schema.sql` in SQL Editor

### **Step 2: Verify RLS Policies**
- [ ] Go to Supabase Dashboard → Authentication → Policies
- [ ] Find `workflows` table policies
- [ ] Confirm these policies exist:
  - ✅ "Users can view own workflows" (SELECT)
  - ✅ "Users can create workflows" (INSERT)
  - ✅ "Users can update own workflows" (UPDATE)
  - ✅ "Users can delete own workflows" (DELETE)

---

## 🧪 **Test Suite**

### **TEST 1: AI-Generated Workflow Persistence**

**Goal**: Verify AI-generated workflows save and reload

**Steps:**
1. [ ] Open browser to `http://localhost:3000/workspace/test-workspace-1`
2. [ ] Log in if not already authenticated
3. [ ] Open AI chat sidebar (right side)
4. [ ] Type: *"Create a workflow to send an email when a form is submitted"*
5. [ ] Press Enter and wait for AI response
6. [ ] Verify workflow appears on canvas (nodes + edges)
7. [ ] Check browser console:
   ```
   🔥 Workflow generated in page.tsx
   💾 Saving AI-generated workflow to database...
   ✅ AI-generated workflow saved successfully
   ```
8. [ ] Wait 5 seconds
9. [ ] **Reload page** (F5 or Ctrl+R)
10. [ ] Verify workflow reappears on canvas
11. [ ] ✅ **PASS** if workflow persists after reload

**Expected Console Output:**
```
🔥 Workflow generated in page.tsx: {...}
🔥 Nodes received: (3) [{...}, {...}, {...}]
🔥 Edges received: (2) [{...}, {...}]
💾 Saving AI-generated workflow to database...
✅ AI-generated workflow saved successfully: test-workspace-1
```

---

### **TEST 2: Navigation Persistence**

**Goal**: Verify workflow survives navigation

**Steps:**
1. [ ] Open workspace with saved workflow
2. [ ] Verify workflow is visible on canvas
3. [ ] Click site logo (top-left) to go to homepage
4. [ ] Verify you're on homepage
5. [ ] Click back button or navigate back to `/workspace/test-workspace-1`
6. [ ] Verify workflow reappears on canvas
7. [ ] ✅ **PASS** if workflow persists after navigation

---

### **TEST 3: Auto-Save (Manual Edits)**

**Goal**: Verify manual changes auto-save after 30 seconds

**Steps:**
1. [ ] Open workspace with workflow
2. [ ] Look at top-right corner (initially should be no indicator)
3. [ ] **Drag a node** to a new position
4. [ ] Verify "Unsaved changes" indicator appears (top-right, orange)
5. [ ] Wait 30-35 seconds without making more changes
6. [ ] Watch indicator change: "Unsaved changes" → "Saving..." → disappears
7. [ ] Check console for: `💾 Saving workflow:` and `✅ Workflow saved successfully`
8. [ ] **Reload page**
9. [ ] Verify node is in new position
10. [ ] ✅ **PASS** if changes persist after auto-save + reload

**Timeline:**
- **0s**: Move node → "Unsaved changes" appears
- **30s**: Auto-save triggers → "Saving..." appears
- **31s**: Save complete → Indicator disappears

---

### **TEST 4: Database Verification**

**Goal**: Verify workflow data is actually in Supabase

**Steps:**
1. [ ] Generate a workflow via AI (Test 1)
2. [ ] Open Supabase Dashboard in new tab
3. [ ] Navigate to **Table Editor** → `workflows`
4. [ ] Find row where `id` = "test-workspace-1" (or your workspace ID)
5. [ ] Verify row exists
6. [ ] Click to expand `workflow_data` column
7. [ ] Verify JSON contains:
   ```json
   {
     "nodes": [...],  // Array of node objects
     "edges": [...],  // Array of edge objects
     "viewport": {...}
   }
   ```
8. [ ] Verify `name` column has workflow name
9. [ ] Verify `user_id` column has your user ID
10. [ ] ✅ **PASS** if workflow data exists and is valid JSON

---

### **TEST 5: Multiple Workspaces Isolation**

**Goal**: Verify each workspace has its own workflow

**Steps:**
1. [ ] Open `http://localhost:3000/workspace/workspace-a`
2. [ ] Generate workflow: *"Create a simple hello world workflow"*
3. [ ] Wait for workflow to appear + save
4. [ ] Open new tab: `http://localhost:3000/workspace/workspace-b`
5. [ ] Verify canvas is **empty** (no workflow from workspace-a)
6. [ ] Generate different workflow: *"Create a data processing workflow"*
7. [ ] Wait for workflow to appear + save
8. [ ] Go back to first tab (workspace-a)
9. [ ] Verify original "hello world" workflow is still there
10. [ ] Go back to second tab (workspace-b)
11. [ ] Verify "data processing" workflow is still there
12. [ ] ✅ **PASS** if each workspace has its own isolated workflow

---

### **TEST 6: User Isolation (Multi-User)**

**Goal**: Verify workflows are user-specific

**Steps:**
1. [ ] User A: Open `http://localhost:3000/workspace/shared-workspace`
2. [ ] User A: Generate workflow: *"Create an email workflow"*
3. [ ] User A: Wait for save
4. [ ] User A: Log out
5. [ ] User B: Log in (different account)
6. [ ] User B: Open `http://localhost:3000/workspace/shared-workspace`
7. [ ] User B: Verify canvas is **empty** (doesn't see User A's workflow)
8. [ ] User B: Generate different workflow: *"Create a slack workflow"*
9. [ ] User B: Log out
10. [ ] User A: Log back in
11. [ ] User A: Open same workspace
12. [ ] User A: Verify still sees original "email workflow"
13. [ ] ✅ **PASS** if each user only sees their own workflows

---

### **TEST 7: Error Handling (Database Offline)**

**Goal**: Verify app doesn't crash if save fails

**Steps:**
1. [ ] Open browser DevTools → Network tab
2. [ ] Click "Offline" mode (throttle to offline)
3. [ ] Generate a workflow via AI
4. [ ] Verify workflow still appears on canvas
5. [ ] Check console: Should see error but app still works
6. [ ] Verify no alert popup (graceful failure)
7. [ ] Re-enable network
8. [ ] Wait 30 seconds
9. [ ] Verify auto-save triggers and succeeds
10. [ ] ✅ **PASS** if app handles network errors gracefully

---

### **TEST 8: Empty Workflow (Edge Case)**

**Goal**: Verify empty canvas doesn't save unnecessarily

**Steps:**
1. [ ] Open new workspace: `http://localhost:3000/workspace/empty-test`
2. [ ] Canvas should be empty (no nodes)
3. [ ] Wait 35 seconds
4. [ ] Check console: Should NOT see save attempts
5. [ ] Verify no "Saving..." indicator
6. [ ] Check Supabase Table Editor → `workflows`
7. [ ] Verify no row exists for "empty-test"
8. [ ] ✅ **PASS** if empty workflows don't trigger saves

---

## 🐛 **Common Issues & Quick Fixes**

### **Issue: Console Error "relation workflows does not exist"**
**Fix:**
```sql
-- Run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  workflow_data JSONB NOT NULL,
  ai_prompt TEXT,
  ai_generated BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
```

### **Issue: Workflow saves but doesn't load on refresh**
**Check:**
1. Browser console for load errors
2. Supabase Table Editor - verify `workflow_data` is valid JSON
3. Network tab - check if API call succeeds
4. User ID matches between session and database

**Fix:**
```javascript
// In browser console
fetch('/api/workflows/test-workspace-1')
  .then(r => r.json())
  .then(console.log);
// Should return workflow object
```

### **Issue: "Unsaved changes" never disappears**
**Check:**
1. Browser console for save errors
2. Network tab for failed POST/PUT requests
3. Supabase RLS policies (might be blocking update)

**Fix:**
```sql
-- Verify update policy exists
SELECT * FROM pg_policies WHERE tablename = 'workflows';
```

---

## ✅ **Test Results Summary**

Mark each test as you complete it:

| Test | Description | Status | Notes |
|------|-------------|--------|-------|
| 1 | AI Generation Persistence | ⬜ PASS / ❌ FAIL | |
| 2 | Navigation Persistence | ⬜ PASS / ❌ FAIL | |
| 3 | Auto-Save (Manual Edits) | ⬜ PASS / ❌ FAIL | |
| 4 | Database Verification | ⬜ PASS / ❌ FAIL | |
| 5 | Multiple Workspaces | ⬜ PASS / ❌ FAIL | |
| 6 | User Isolation | ⬜ PASS / ❌ FAIL | |
| 7 | Error Handling | ⬜ PASS / ❌ FAIL | |
| 8 | Empty Workflow | ⬜ PASS / ❌ FAIL | |

**Overall Status**: ⬜ ALL PASS / ⚠️ PARTIAL / ❌ FAIL

---

## 📊 **Expected Console Output (Full Test)**

```javascript
// When AI generates workflow:
🔥 Workflow generated in page.tsx: {nodes: Array(3), edges: Array(2), workflowName: "Email Form Workflow"}
🔥 Nodes received: (3) [{id: "trigger_1", ...}, {id: "condition_1", ...}, {id: "action_1", ...}]
🔥 Edges received: (2) [{id: "edge_1", ...}, {id: "edge_2", ...}]
🔥 updateWorkflowRef.current exists? true
🔥 Setting workflow name to: Email Form Workflow
🔥 Calling updateWorkflowRef.current with: 3 nodes and 2 edges
💾 Saving AI-generated workflow to database...
💾 Saving workflow: {id: "test-workspace-1", name: "Email Form Workflow", nodeCount: 3, edgeCount: 2}
✅ AI-generated workflow saved successfully: test-workspace-1
✅ Workflow saved successfully: test-workspace-1

// When page reloads:
Loading workflow: test-workspace-1
Loaded workflow: {id: "test-workspace-1", name: "Email Form Workflow", workflow_data: {...}}
React Flow initialized with 3 nodes

// When manually editing:
💾 Saving workflow: {id: "test-workspace-1", name: "Email Form Workflow", nodeCount: 3, edgeCount: 2}
✅ Workflow saved successfully: test-workspace-1
```

---

## 🎯 **Quick Test (2 Minutes)**

**Minimal test to verify core functionality:**

1. ✅ Open workspace
2. ✅ Generate workflow via AI
3. ✅ Wait for save (check console)
4. ✅ Reload page (F5)
5. ✅ Workflow reappears → **SUCCESS!** 🎉

---

**Status**: Ready to test! 🧪
**Date**: November 1, 2025

Start with the Quick Test, then run full suite if you want comprehensive verification.

