# 🔧 Workflow Persistence Fix - "Workflow not found" Error

## ❌ **Problem**

When generating an AI workflow for the first time in a workspace, you got this error:

```
Console Error: Workflow not found
at updateWorkflow (src\lib\workflows\client.ts:100:11)
at async handleWorkflowGenerated (src\app\workspace\[id]\page.tsx:94:33)
```

---

## 🔍 **Root Cause**

The system was trying to **UPDATE** a workflow that didn't exist yet:

1. User opens `/workspace/test-workspace-1`
2. Workspace ID = `"test-workspace-1"` (just a string)
3. AI generates workflow
4. System tries to save with `saveWorkflowFromEditor("test-workspace-1", ...)`
5. Function assumes workflow exists and tries to **UPDATE** it
6. ❌ **Error**: Workflow with ID `"test-workspace-1"` doesn't exist in database
7. In reality, database uses auto-generated **UUIDs** for workflow IDs

**The Mismatch:**
- URL uses: `"test-workspace-1"` (arbitrary string)
- Database needs: `"550e8400-e29b-41d4-a716-446655440000"` (UUID)

---

## ✅ **Solution**

### **Part 1: Smart Save Function**

Updated `src/lib/workflows/client.ts` → `saveWorkflowFromEditor()` to:

1. **Try to GET the workflow first** (check if it exists)
2. **If exists** → UPDATE it ✅
3. **If doesn't exist** → CREATE a new one ✅

```typescript
// Before: Blindly tried to update
if (workflowId) {
  return updateWorkflow(workflowId, { ... }); // ❌ Fails if workflow doesn't exist
}

// After: Check first, then decide
if (workflowId) {
  try {
    const existingWorkflow = await getWorkflow(workflowId);
    // Exists → Update
    return updateWorkflow(workflowId, { ... }); ✅
  } catch (error) {
    // Doesn't exist → Create
    return createWorkflow({ ... }); ✅
  }
}
```

### **Part 2: Track Real Workflow ID**

Updated `src/app/workspace/[id]/page.tsx` to:

1. **Store the database-generated UUID** after first save
2. **Use that UUID** for all subsequent saves
3. **Pass it to ReactFlowEditor** for auto-saves

```typescript
// New state to track real workflow ID
const [actualWorkflowId, setActualWorkflowId] = useState<string | null>(null);

// After saving, store the real ID
const savedWorkflow = await saveWorkflowFromEditor(...);
setActualWorkflowId(savedWorkflow.id); // UUID from database

// Use actualWorkflowId for future operations
<ReactFlowEditor workflowId={actualWorkflowId || workflowId} />
```

---

## 🎯 **How It Works Now**

### **Scenario: First Time Creating Workflow**

```
1. User opens: /workspace/my-project
   - workflowId = "my-project"
   - actualWorkflowId = null

2. AI generates workflow
   - Calls: saveWorkflowFromEditor("my-project", ...)

3. Save function logic:
   ✅ Try GET /api/workflows/my-project
   ❌ Doesn't exist (404 error)
   ✅ Catch error → CREATE new workflow
   ✅ Database generates UUID: "a1b2c3d4-..."
   ✅ Returns workflow with ID "a1b2c3d4-..."

4. Store the real ID:
   - actualWorkflowId = "a1b2c3d4-..."

5. User makes manual edits:
   - Auto-save uses: "a1b2c3d4-..."
   - Now workflow EXISTS → UPDATE succeeds ✅
```

### **Scenario: Loading Existing Workflow**

```
1. User opens: /workspace/my-project
   - workflowId = "my-project"
   - actualWorkflowId = null

2. ReactFlowEditor loads workflow:
   - Tries to load "my-project" from database
   - If exists → Loads it
   - onWorkflowLoaded() → setActualWorkflowId(workflow.id)

3. Now actualWorkflowId = "a1b2c3d4-..."
   - All operations use the UUID
```

### **Scenario: Reloading Page**

```
1. User generates workflow
   - Saves with UUID "a1b2c3d4-..."
   - actualWorkflowId = "a1b2c3d4-..."

2. User reloads page (F5)
   - workflowId = "my-project" (from URL)
   - actualWorkflowId = null (state reset)

3. ReactFlowEditor tries to load:
   - GET /api/workflows/my-project
   - If workflow was saved with UUID, this fails
   
4. Solution: Need to associate workspace ID with workflow UUID
```

---

## ⚠️ **Remaining Issue: Workspace ↔ Workflow Mapping**

Currently, there's still a small gap:

**Problem:**
- Workspace ID: `"my-project"` (from URL)
- Workflow ID: `"a1b2c3d4-..."` (UUID in database)
- ❓ How does the system know which UUID belongs to `"my-project"`?

**Current Workaround:**
- First save creates a NEW workflow every time
- Each workspace can have multiple workflows in database
- Need a way to link workspace ID → workflow UUID

**Potential Solutions:**

### **Option 1: Add workspace_id column** (RECOMMENDED)
```sql
ALTER TABLE workflows ADD COLUMN workspace_id TEXT;
CREATE INDEX idx_workflows_workspace_id ON workflows(workspace_id);

-- Save workflow with workspace reference
INSERT INTO workflows (id, workspace_id, name, ...) 
VALUES (uuid_generate_v4(), 'my-project', 'Email Workflow', ...);

-- Load workflow by workspace
SELECT * FROM workflows 
WHERE user_id = ? AND workspace_id = 'my-project'
ORDER BY updated_at DESC LIMIT 1;
```

### **Option 2: Use workspace ID as primary key**
```sql
-- Allow custom IDs instead of auto-generated UUIDs
INSERT INTO workflows (id, name, ...) 
VALUES ('my-project', 'Email Workflow', ...)
ON CONFLICT (id) DO UPDATE ...;
```

### **Option 3: Store mapping in localStorage**
```typescript
// After first save
localStorage.setItem(
  `workflow_${workspaceId}_${userId}`, 
  savedWorkflow.id
);

// On load
const storedId = localStorage.getItem(`workflow_${workspaceId}_${userId}`);
const actualId = storedId || workspaceId;
```

---

## ✅ **What's Fixed Now**

- ✅ No more "Workflow not found" error on first save
- ✅ AI-generated workflows save successfully
- ✅ Manual edits auto-save after first save
- ✅ Create vs Update logic works correctly

## ⚠️ **What Still Needs Work**

- ⚠️ Workflow persistence across page reloads (needs workspace mapping)
- ⚠️ Multiple workflows per workspace not fully supported
- ⚠️ No way to list/switch between workflows in same workspace

---

## 🧪 **Testing Instructions**

### **Test 1: First Save (Fixed!)**

1. Open new workspace: `http://localhost:3000/workspace/test-fix-1`
2. Open AI chat
3. Generate workflow: *"Create email workflow"*
4. Check console:
   ```
   ✨ Creating new workflow (ID not found)
   ✅ AI-generated workflow saved successfully: a1b2c3d4-...
   ```
5. ✅ **Should succeed without errors**

### **Test 2: Subsequent Saves**

1. With workflow from Test 1 still on canvas
2. Drag a node to new position
3. Wait 30 seconds for auto-save
4. Check console:
   ```
   🔄 Updating existing workflow: a1b2c3d4-...
   ✅ Workflow saved successfully
   ```
5. ✅ **Should update without creating duplicate**

### **Test 3: Database Verification**

1. Go to Supabase Dashboard → Table Editor → `workflows`
2. ✅ Should see ONE workflow (not multiple duplicates)
3. ✅ ID should be a UUID (e.g., `a1b2c3d4-...`)
4. ✅ `workflow_data` should contain nodes/edges

---

## 🎉 **Summary**

**Before:**
- ❌ Tried to update non-existent workflow → Error

**After:**
- ✅ Checks if workflow exists
- ✅ Creates if missing
- ✅ Updates if exists
- ✅ Tracks real UUID from database
- ✅ Uses UUID for subsequent operations

**Status:** ✅ **CORE ERROR FIXED!**

**Next Steps:** Consider implementing workspace ↔ workflow mapping for full persistence across reloads.

---

**Date:** November 1, 2025  
**Issue:** "Workflow not found" error  
**Status:** ✅ Resolved

