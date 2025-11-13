# React Hooks Order Error Fix

## Problem

**Error:** "React has detected a change in the order of Hooks called by WorkspacePage"

**Cause:** `useCallback` hooks were being called inline within the JSX, which violates React's Rules of Hooks. Hooks must always be called in the same order on every render.

## The Issue

**Before (WRONG):**
```typescript
<ReactFlowEditor
  onRegisterUpdateCallback={useCallback((callback: any) => {
    updateWorkflowRef.current = callback;
  }, [])}
  onConfigurationStatusChange={useCallback((status: any) => {
    setConfigStatus(status);
  }, [])}
  onRegisterConfigureCallback={useCallback((callback: any) => {
    configureCallbackRef.current = callback;
  }, [])}
/>
```

**Problem:**
- Hooks were called conditionally (inside JSX rendering)
- Hook order could change between renders
- Violates React's Rules of Hooks

## The Solution

**After (CORRECT):**

### 1. Define callbacks at component level (before JSX)
```typescript
// Define callbacks at component level (before JSX)
const handleRegisterUpdateCallback = useCallback((callback: any) => {
  console.log('🎯 Registering workflow update callback');
  updateWorkflowRef.current = callback;
}, []);

const handleConfigurationStatusChange = useCallback((status: any) => {
  setConfigStatus(status);
}, []);

const handleRegisterConfigureCallback = useCallback((callback: any) => {
  configureCallbackRef.current = callback;
}, []);
```

### 2. Use the callbacks in JSX
```typescript
<ReactFlowEditor
  onRegisterUpdateCallback={handleRegisterUpdateCallback}
  onConfigurationStatusChange={handleConfigurationStatusChange}
  onRegisterConfigureCallback={handleRegisterConfigureCallback}
/>
```

## React's Rules of Hooks

From [React documentation](https://react.dev/link/rules-of-hooks):

1. ✅ **Only call Hooks at the top level**
   - Don't call Hooks inside loops, conditions, or nested functions
   - Always use Hooks at the top level of your React function

2. ✅ **Only call Hooks from React functions**
   - Call them from React function components
   - Call them from custom Hooks

## Why This Matters

React relies on the order of Hook calls to preserve state between renders. If Hook calls can be skipped or occur in a different order, React can't match up the state correctly, leading to bugs.

### Bad Example (Hook Order Changes):
```typescript
if (someCondition) {
  const [state, setState] = useState(0); // ❌ Conditional hook
}
```

### Good Example (Hook Order Consistent):
```typescript
const [state, setState] = useState(0); // ✅ Always called
if (someCondition) {
  // Use state here
}
```

## Testing

After the fix:
1. ✅ No console errors about Hook order
2. ✅ Configuration status updates correctly
3. ✅ No infinite loops
4. ✅ All callbacks work as expected

## Files Modified

- `src/app/workspace/[id]/page.tsx`
  - Moved `useCallback` hooks to component top level
  - Created named callback handlers
  - Used callback references in JSX props

## Summary

✅ **Hook Order Fixed!**

Moved all `useCallback` hooks from inline JSX to the component's top level, ensuring they are always called in the same order on every render. This follows React's Rules of Hooks and prevents runtime errors.

---

**Key Takeaway:** Always define hooks at the top level of your component, never inside JSX or conditionally.

