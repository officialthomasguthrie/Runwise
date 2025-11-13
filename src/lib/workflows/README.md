# Workflow Storage System

Complete workflow storage system with Supabase integration and CRUD API routes.

## Features

- ✅ **JSON Storage**: Workflows stored as JSONB in Supabase
- ✅ **CRUD API**: Full Create, Read, Update, Delete operations
- ✅ **Auto-save**: Automatic workflow saving with configurable intervals
- ✅ **Load/Save Integration**: Seamless integration with React Flow Editor
- ✅ **Type Safety**: Full TypeScript support

## Database Setup

Run the migration to add the `workflow_data` column:

```sql
-- See: database/migrations/add_workflow_data_column.sql
```

This adds:
- `workflow_data JSONB` column to `workflows` table
- GIN index for efficient JSON queries
- Comment documentation

## API Routes

### `GET /api/workflows`
List all workflows for the authenticated user.

**Query Parameters:**
- `status` (optional): Filter by status (`draft`, `active`, `paused`, `archived`)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "workflows": [...],
  "count": 10
}
```

### `GET /api/workflows/[id]`
Get a single workflow by ID.

**Response:**
```json
{
  "workflow": {
    "id": "uuid",
    "name": "My Workflow",
    "workflow_data": { "nodes": [...], "edges": [...] },
    ...
  }
}
```

### `POST /api/workflows`
Create a new workflow.

**Body:**
```json
{
  "name": "My Workflow",
  "description": "Optional description",
  "workflow_data": {
    "nodes": [...],
    "edges": [...]
  },
  "ai_prompt": "Optional AI prompt",
  "status": "draft"
}
```

### `PUT /api/workflows/[id]`
Update an existing workflow.

**Body:**
```json
{
  "name": "Updated Name",
  "workflow_data": { "nodes": [...], "edges": [...] }
}
```

### `DELETE /api/workflows/[id]`
Delete a workflow.

**Response:**
```json
{
  "message": "Workflow deleted successfully"
}
```

## Client Functions

### `listWorkflows(params?)`
List workflows with optional filters.

```typescript
const { workflows, count } = await listWorkflows({
  status: 'active',
  limit: 10,
  offset: 0
});
```

### `getWorkflow(id)`
Get a single workflow.

```typescript
const workflow = await getWorkflow('workflow-id');
```

### `createWorkflow(input)`
Create a new workflow.

```typescript
const workflow = await createWorkflow({
  name: 'My Workflow',
  workflow_data: { nodes: [], edges: [] }
});
```

### `updateWorkflow(id, input)`
Update a workflow.

```typescript
const workflow = await updateWorkflow('workflow-id', {
  name: 'Updated Name'
});
```

### `deleteWorkflow(id)`
Delete a workflow.

```typescript
await deleteWorkflow('workflow-id');
```

### `saveWorkflowFromEditor(...)`
Convenience function to save from React Flow editor.

```typescript
const workflow = await saveWorkflowFromEditor(
  workflowId, // null for new workflow
  'Workflow Name',
  nodes,
  edges,
  { description: 'Optional description' }
);
```

## React Flow Editor Integration

The `ReactFlowEditor` component now supports:

```typescript
<ReactFlowEditor
  workflowId="workflow-id" // Optional: loads workflow on mount
  workflowName="My Workflow" // Name for saving
  autoSave={true} // Enable auto-save
  autoSaveInterval={30000} // 30 seconds
  onWorkflowLoaded={(workflow) => {
    console.log('Workflow loaded:', workflow);
  }}
  onWorkflowSaved={(workflow) => {
    console.log('Workflow saved:', workflow);
  }}
/>
```

## Workflow Data Structure

Workflows are stored with the following structure:

```typescript
{
  nodes: [
    {
      id: "node-1",
      type: "workflow-node",
      position: { x: 100, y: 100 },
      data: {
        nodeId: "send-email", // From node library
        config: { to: "...", subject: "..." }
      }
    }
  ],
  edges: [
    {
      id: "edge-1",
      source: "node-1",
      target: "node-2",
      type: "buttonedge",
      animated: true,
      style: { stroke: "...", strokeWidth: 2 }
    }
  ]
}
```

## Utility Functions

### `serializeWorkflow(nodes, edges)`
Convert React Flow nodes/edges to serializable format.

### `deserializeWorkflow(workflowData)`
Convert stored workflow data to React Flow format.

### `validateWorkflowData(data)`
Validate workflow data structure.

### `createEmptyWorkflow()`
Create an empty workflow structure.

## Security

- All API routes require authentication
- Users can only access their own workflows
- RLS policies enforce data isolation
- Input validation on all endpoints

## Error Handling

All API functions throw errors that can be caught:

```typescript
try {
  const workflow = await getWorkflow('id');
} catch (error) {
  console.error('Error:', error.message);
}
```

