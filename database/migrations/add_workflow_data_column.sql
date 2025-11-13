-- Migration: Add workflow_data JSONB column to workflows table
-- This allows storing complete workflow structure (nodes + edges) as JSON

-- Add workflow_data column if it doesn't exist
ALTER TABLE public.workflows 
ADD COLUMN IF NOT EXISTS workflow_data JSONB DEFAULT '{}';

-- Add index on workflow_data for efficient querying
CREATE INDEX IF NOT EXISTS idx_workflows_workflow_data 
ON public.workflows USING GIN(workflow_data);

-- Add comment
COMMENT ON COLUMN public.workflows.workflow_data IS 'Complete workflow structure stored as JSON, including nodes and edges';

-- Example workflow_data structure:
-- {
--   "nodes": [
--     {
--       "id": "node-1",
--       "type": "workflow-node",
--       "position": { "x": 100, "y": 100 },
--       "data": {
--         "nodeId": "send-email",
--         "config": { "to": "user@example.com", "subject": "Hello", "body": "World" }
--       }
--     }
--   ],
--   "edges": [
--     {
--       "id": "edge-1",
--       "source": "node-1",
--       "target": "node-2",
--       "type": "buttonedge",
--       "animated": true,
--       "style": { "stroke": "hsl(var(--primary))", "strokeWidth": 2 }
--     }
--   ]
-- }

