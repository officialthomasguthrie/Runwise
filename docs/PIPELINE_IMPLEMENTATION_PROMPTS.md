# Pipeline Implementation Prompts

Copy and paste these prompts one at a time to implement each step of the workflow generation pipeline.

---

## Prompt Template (Copy this and fill in Step #)

```
I want to implement Step [NUMBER] of the workflow generation pipeline as described in docs/WORKFLOW_GENERATION_PIPELINE.md.

[STEP DESCRIPTION FROM GUIDE]

Please:
1. Create/update the necessary file(s) as specified in the guide
2. Follow the exact requirements from the guide
3. Ensure TypeScript types are correct
4. Handle errors gracefully
5. Test the implementation by [TESTING INSTRUCTIONS]
6. Verify it compiles without errors

After implementation, show me:
- What file(s) were created/modified
- How to test it
- Any issues or considerations

Do not proceed to the next step - I'll tell you when to continue.
```

---

## Step 1: Create Type Definitions

```
I want to implement Step 1 of the workflow generation pipeline as described in docs/WORKFLOW_GENERATION_PIPELINE.md.

Create a new file `src/lib/ai/pipeline/types.ts` with TypeScript interfaces for:

1. IntentAnalysis - Result from intent analysis step containing:
   - goal: string (what the workflow should do)
   - triggers: string[] (required trigger types)
   - actions: string[] (required action types)
   - transforms: string[] (transformations needed)
   - customRequirements: string[] (custom functionality needed)
   - isModification: boolean (is this modifying existing workflow?)
   - existingContext?: { nodes: any[], edges: any[] }

2. WorkflowPlan - Result from node matching step containing:
   - libraryNodes: Array<{ id: string, role: string, reason: string }>
   - customNodes: Array<{ name: string, type: 'trigger'|'action'|'transform', requirements: string, reason: string }>
   - connections: Array<{ from: string, to: string, reason: string }>
   - dataFlow: Array<{ source: string, target: string, field: string }>

3. PipelineContext - Context passed between steps containing:
   - userPrompt: string
   - availableNodes: any[]
   - existingNodes?: Node[]
   - existingEdges?: Edge[]
   - integrationContext?: any
   - intent?: IntentAnalysis
   - plan?: WorkflowPlan
   - workflow?: AIGeneratedWorkflow

4. StepResult<T> - Generic result wrapper:
   - success: boolean
   - data?: T
   - error?: string
   - tokenUsage?: { inputTokens: number, outputTokens: number }

Please:
1. Create the file with proper TypeScript interfaces
2. Import necessary types from existing files (Node, Edge from '@xyflow/react', AIGeneratedWorkflow from '@/lib/ai/types')
3. Export all types
4. Ensure TypeScript compiles without errors

After implementation:
- Verify the file compiles with `npm run build`
- Show me the created file structure
```

---

## Step 2: Implement Intent Analysis Step

```
I want to implement Step 2 of the workflow generation pipeline as described in docs/WORKFLOW_GENERATION_PIPELINE.md.

Create a new file `src/lib/ai/pipeline/steps/intent-analysis.ts` that:

1. Exports function `analyzeIntent(context: PipelineContext): Promise<StepResult<IntentAnalysis>>`

2. Uses `gpt-4o-mini` model with a focused system prompt that:
   - Analyzes user prompt for workflow automation intent
   - Extracts: goal, triggers needed, actions needed, transforms, custom requirements
   - Detects if modifying existing workflow vs creating new
   - Returns structured JSON matching IntentAnalysis interface

3. System prompt should be concise and focused only on intent analysis (not full workflow generation)

4. Uses OpenAI with response_format: { type: 'json_object' }

5. Handles errors gracefully and returns StepResult with error if failed

6. Tracks token usage and includes in result

7. Uses the OpenAI client from environment (process.env.OPENAI_API_KEY)

Please:
1. Create the file with the function implementation
2. Import necessary types from '@/lib/ai/pipeline/types'
3. Import OpenAI from 'openai'
4. Follow the example prompt structure from the guide
5. Handle JSON parsing errors
6. Ensure TypeScript compiles

After implementation:
- Create a simple test by calling the function with a test prompt
- Verify output has all IntentAnalysis fields
- Check that it extracts goal, triggers, actions correctly
- Show me how to test it manually
```

---

## Step 3: Implement Node Matching Step

```
I want to implement Step 3 of the workflow generation pipeline as described in docs/WORKFLOW_GENERATION_PIPELINE.md.

Create a new file `src/lib/ai/pipeline/steps/node-matching.ts` that:

1. Exports function `matchNodes(context: PipelineContext & { intent: IntentAnalysis }): Promise<StepResult<WorkflowPlan>>`

2. Uses `gpt-4o-mini` model with system prompt that:
   - Takes intent analysis and available nodes list
   - Matches requirements to library nodes (prefer library over custom)
   - Identifies when custom nodes are truly needed
   - Plans logical connections between nodes
   - Maps data flow between nodes

3. System prompt should include the available nodes list (same format as current system prompt in workflow-generator.ts)

4. Returns WorkflowPlan with library node IDs, custom node requirements, and connection plan

5. Handles errors gracefully

6. Tracks token usage

Please:
1. Create the file with the function implementation
2. Import types from '@/lib/ai/pipeline/types'
3. Import OpenAI from 'openai'
4. Reference the available nodes format from workflow-generator.ts (getSimplifiedNodeList format)
5. Validate that library node IDs exist (warn if not found, but don't fail)
6. Ensure TypeScript compiles

After implementation:
- Test with intent from Step 2 (or mock intent)
- Verify library node IDs match actual node IDs from the registry
- Verify custom nodes only identified when truly needed
- Verify connections are logical
- Show me how to test it with the intent analysis step
```

---

## Step 4: Implement Workflow Generation Step

```
I want to implement Step 4 of the workflow generation pipeline as described in docs/WORKFLOW_GENERATION_PIPELINE.md.

Create a new file `src/lib/ai/pipeline/steps/workflow-generation.ts` that:

1. Exports function `generateWorkflowStructure(context: PipelineContext & { plan: WorkflowPlan }, onChunk?: (chunk: string, isComplete: boolean) => void): Promise<StepResult<AIGeneratedWorkflow>>`

2. Uses `gpt-4o` model (same as current implementation) with system prompt that:
   - Takes workflow plan and generates complete workflow JSON
   - Creates nodes with correct structure (id, type, position, data)
   - Creates edges with correct structure (source, target, type, animated, style)
   - Uses template syntax for config values ({{inputData.field}})
   - Includes descriptions for all nodes
   - Sets all positions to {x: 0, y: 0} (auto-layout handles positioning)

3. System prompt should be similar to current one in workflow-generator.ts but:
   - Can reference the plan from previous step
   - Focused on structure generation (not planning)
   - Maintains all current rules about descriptions, configSchema, customCode, etc.

4. Supports streaming via optional onChunk callback (stream JSON chunks as they're generated)

5. Returns complete AIGeneratedWorkflow matching current type from '@/lib/ai/types'

6. Uses response_format: { type: 'json_object' }

7. Handles errors and JSON parsing errors

8. Uses OpenAI streaming API when onChunk is provided

Please:
1. Create the file with the function implementation
2. Import types from '@/lib/ai/pipeline/types' and '@/lib/ai/types'
3. Reference the current system prompt structure from workflow-generator.ts
4. Support both streaming and non-streaming modes
5. Ensure output matches AIGeneratedWorkflow interface exactly
6. Ensure TypeScript compiles

After implementation:
- Test with plan from Step 3 (or mock plan)
- Verify output matches AIGeneratedWorkflow interface
- Verify all nodes have required fields
- Verify edges connect properly
- Test streaming (should stream JSON chunks)
- Verify template syntax used in configs ({{inputData.field}})
- Show me how to test it
```

---

## Step 5: Implement Code Generation Step

```
I want to implement Step 5 of the workflow generation pipeline as described in docs/WORKFLOW_GENERATION_PIPELINE.md.

Create a new file `src/lib/ai/pipeline/steps/code-generation.ts` that:

1. Exports function `generateCustomCode(context: PipelineContext & { workflow: AIGeneratedWorkflow }): Promise<StepResult<AIGeneratedWorkflow>>`

2. Uses `gpt-4o` model (critical for code quality) with system prompt that:
   - Takes workflow with CUSTOM_GENERATED nodes that need code
   - Generates customCode as JavaScript async function
   - Creates complete configSchema that matches ALL config values used in code
   - Includes proper error handling (try/catch)
   - Uses context.http.get/post/put/delete for HTTP requests
   - Returns structured data objects

3. Only processes nodes where nodeId === "CUSTOM_GENERATED" and customCode is missing or incomplete

4. If no custom nodes exist or all have code, returns workflow unchanged

5. Can process multiple custom nodes sequentially

6. System prompt should focus on code generation rules:
   - Format: async (inputData, config, context) => { ... }
   - Use async/await for API calls
   - Access config via config object
   - Access previous node output via inputData
   - Return structured objects
   - Include error handling
   - ConfigSchema must match ALL config values used in code

7. After generating code, validates that configSchema matches code requirements (if code uses config.apiKey, schema must have apiKey field)

8. Handles errors gracefully

9. Tracks token usage

Please:
1. Create the file with the function implementation
2. Import types from '@/lib/ai/pipeline/types' and '@/lib/ai/types'
3. Parse customCode to extract config references (simple regex is fine)
4. Validate configSchema matches code requirements
5. Ensure TypeScript compiles

After implementation:
- Test with workflow containing CUSTOM_GENERATED nodes without code
- Verify customCode is valid JavaScript (try to parse it)
- Verify configSchema has all fields used in code
- Test with workflow with no custom nodes (should pass through unchanged)
- Verify error handling in generated code
- Show me how to test it
```

---

## Step 6: Implement Validation Step

```
I want to implement Step 6 of the workflow generation pipeline as described in docs/WORKFLOW_GENERATION_PIPELINE.md.

Create a new file `src/lib/ai/pipeline/steps/validation.ts` that:

1. Exports function `validateWorkflow(context: PipelineContext & { workflow: AIGeneratedWorkflow }): Promise<StepResult<AIGeneratedWorkflow>>`

2. Uses `gpt-4o-mini` model (quick validation) with system prompt that:
   - Takes complete workflow JSON
   - Validates structure matches AIGeneratedWorkflow interface
   - Checks all required fields present
   - Validates node IDs exist in library (for library nodes, warn if not found but don't fail for custom nodes)
   - Validates edges reference valid node IDs
   - Makes minor refinements if needed (add missing descriptions, fix edge styles)

3. Also includes programmatic validation (TypeScript validation):
   - Check all nodes have id, type, position, data
   - Check all edges have id, source, target, type
   - Check node.data has nodeId and description
   - Check CUSTOM_GENERATED nodes have customCode and configSchema

4. Returns validated/refined workflow

5. Handles errors gracefully (should report validation errors but not crash)

6. This step should be fast and lightweight - if validation fails, report error rather than trying to fix major issues

7. Tracks token usage (might be minimal for quick validation)

Please:
1. Create the file with the function implementation
2. Import types from '@/lib/ai/pipeline/types' and '@/lib/ai/types'
3. Import nodeRegistry from '@/lib/nodes' to validate library node IDs
4. Implement both AI validation (via gpt-4o-mini) and programmatic validation
5. Ensure TypeScript compiles

After implementation:
- Test with complete valid workflow from Step 4
- Verify validation catches missing required fields
- Verify validation checks node IDs (for library nodes)
- Verify validation checks edge references
- Test with invalid workflow (should return error in StepResult)
- Test with valid workflow (should pass through or minor refinements)
- Show me how to test it
```

---

## Step 7: Create Pipeline Orchestrator

```
I want to implement Step 7 of the workflow generation pipeline as described in docs/WORKFLOW_GENERATION_PIPELINE.md.

Create a new file `src/lib/ai/pipeline/orchestrator.ts` that:

1. Exports function `runWorkflowGenerationPipeline(request: WorkflowGenerationRequest & { onChunk?: (chunk: string, isComplete: boolean) => void, onComplete: (workflow: AIGeneratedWorkflow, tokenUsage?: { inputTokens: number, outputTokens: number }) => void, onError: (error: Error) => void }): Promise<void>`

2. Orchestrates all 5 steps sequentially:
   - Step 1: analyzeIntent() - Import from './steps/intent-analysis'
   - Step 2: matchNodes() - Import from './steps/node-matching' (only if Step 1 succeeds)
   - Step 3: generateWorkflowStructure() - Import from './steps/workflow-generation' (only if Step 2 succeeds)
   - Step 4: generateCustomCode() - Import from './steps/code-generation' (only if Step 3 succeeds, and only if custom nodes exist)
   - Step 5: validateWorkflow() - Import from './steps/validation' (only if Step 4 succeeds)

3. Maintains PipelineContext across steps, accumulating results:
   - Start with userPrompt, availableNodes, existingNodes, existingEdges, integrationContext
   - Add intent after Step 1
   - Add plan after Step 2
   - Add workflow after Step 3
   - Update workflow after Step 4 (if custom code generated)
   - Update workflow after Step 5 (if validated)

4. Emits progress updates via onChunk callback (optional):
   - Step progress: JSON.stringify({ type: 'step-progress', step: 'intent', stepNumber: 1, totalSteps: 5 })
   - JSON chunks from Step 3 (workflow generation) streaming
   - Pass onChunk to Step 3's generateWorkflowStructure

5. Aggregates token usage from all steps

6. Handles errors at any step:
   - If any step fails: return error via onError
   - Log errors for debugging with step context

7. Calls onComplete with final workflow and total token usage (sum of all steps)

8. Supports streaming (streams from Step 3, emits progress updates)

9. Backward compatible: same interface as generateWorkflowFromPromptStreaming

Please:
1. Create the file with orchestrator function
2. Import all step functions from './steps/*'
3. Import types from '@/lib/ai/pipeline/types' and '@/lib/ai/types'
4. Handle errors gracefully at each step
5. Aggregate token usage properly
6. Emit progress updates if onChunk provided
7. Ensure TypeScript compiles

After implementation:
- Test full pipeline with simple workflow (no custom nodes)
- Test full pipeline with complex workflow (custom nodes)
- Test error handling at Step 1 (should call onError)
- Test error handling at Step 3 (should call onError)
- Test streaming (should stream progress + JSON chunks from Step 3)
- Test token usage aggregation (should sum all steps)
- Show me how to test it end-to-end
```

---

## Step 8: Update Main Generation Function

```
I want to implement Step 8 of the workflow generation pipeline as described in docs/WORKFLOW_GENERATION_PIPELINE.md.

Update `src/lib/ai/workflow-generator.ts`:

1. Modify `generateWorkflowFromPromptStreaming` function to call pipeline orchestrator instead of single-step generation

2. Keep the exact same function signature:
   ```typescript
   export async function generateWorkflowFromPromptStreaming(
     request: WorkflowGenerationRequest & {
       onChunk: (jsonChunk: string, isComplete: boolean) => void;
       onComplete: (workflow: AIGeneratedWorkflow, tokenUsage?: { inputTokens: number; outputTokens: number }) => void;
       onError: (error: Error) => void;
     }
   ): Promise<void>
   ```

3. Import pipeline orchestrator:
   ```typescript
   import { runWorkflowGenerationPipeline } from './pipeline/orchestrator';
   ```

4. Map pipeline callbacks to existing callbacks:
   - Pipeline's onChunk → request.onChunk (filter to only pass JSON chunks, optionally pass step-progress messages too)
   - Pipeline's onComplete → request.onComplete
   - Pipeline's onError → request.onError

5. Comment out or keep old implementation for reference (add comment like "// Old single-step implementation - replaced by pipeline")

6. Ensure backward compatibility - all existing callers should work without changes

7. The function should now just be a thin wrapper around the pipeline orchestrator

Please:
1. Update the file to use pipeline orchestrator
2. Keep old implementation commented for reference
3. Ensure function signature is exactly the same
4. Map callbacks correctly
5. Ensure TypeScript compiles

After implementation:
- Test existing API route `/api/ai/generate-workflow` still works (check the route file)
- Test with dashboard workflow generation
- Test with workspace workflow generation
- Verify output format unchanged (should still be AIGeneratedWorkflow)
- Test streaming behavior (should still stream JSON chunks)
- Test error handling (should still call onError correctly)
- Show me what was changed and how to test
```

---

## Step 9: Update Streaming Format (Optional Enhancement)

```
I want to implement Step 9 (optional) of the workflow generation pipeline as described in docs/WORKFLOW_GENERATION_PIPELINE.md.

This step enhances the streaming format to include step progress:

1. Update `src/app/api/ai/generate-workflow/route.ts`:
   - The orchestrator already emits step-progress events
   - Make sure the route passes through step-progress events in the stream:
     - Stream step progress: `{ type: 'step-progress', step: string, stepNumber: number, totalSteps: number }`
     - Stream JSON chunks: `{ type: 'json-chunk', content: string, isComplete: boolean }`
     - Stream complete: `{ type: 'complete', success: true, workflow: ... }`
   - Keep existing format for backward compatibility (can add step-progress alongside)

2. Update `src/components/ui/ai-chat-sidebar.tsx`:
   - Handle step-progress events to show progress indicator (optional UI enhancement)
   - Keep handling json-chunk events for streaming workflow
   - Backward compatible: ignore unknown event types gracefully

3. Optional: Add progress UI component showing "Step X/5: Step Name..." above the Generate Workflow button or in the chat

Please:
1. Update the API route to handle step-progress events
2. Update the UI component to optionally display step progress
3. Ensure backward compatibility (old clients should still work)
4. Ensure TypeScript compiles

After implementation:
- Test with updated client (should show step progress if UI added)
- Test with workflow generation (step progress should appear in stream)
- Verify backward compatibility (should still work without step-progress handling)
- Show me what was changed and how to test
```

---

## Step 10: Add Monitoring & Logging

```
I want to implement Step 10 of the workflow generation pipeline as described in docs/WORKFLOW_GENERATION_PIPELINE.md.

Add monitoring and logging to track pipeline performance:

1. In `src/lib/ai/pipeline/orchestrator.ts`:
   - Log each step start/complete with timestamp
   - Track execution time per step
   - Log token usage per step
   - Log model used per step

2. Add summary log at end:
   ```typescript
   console.log('[Pipeline] Completed:', {
     steps: ['intent', 'matching', 'generation', 'code', 'validation'],
     executionTime: { step1: ms, step2: ms, ... },
     tokenUsage: { step1: tokens, step2: tokens, ... },
     models: { step1: 'gpt-4o-mini', step2: 'gpt-4o-mini', ... },
     totalTime: ms,
     totalTokens: tokens
   });
   ```

3. Track errors per step for debugging (log step context when errors occur)

4. Use console.log with consistent format: `[Pipeline] Step X: message`

Please:
1. Update orchestrator to add timing, logging, and monitoring
2. Log at start and end of each step
3. Log summary at end with aggregated metrics
4. Ensure logging doesn't break functionality
5. Ensure TypeScript compiles

After implementation:
- Generate a workflow and check console logs
- Verify timing is logged correctly (executionTime per step)
- Verify token usage is tracked (tokenUsage per step)
- Verify errors are logged with step context
- Verify summary log appears at end
- Show me example log output
```

---

## Testing the Complete Pipeline

```
I want to test the complete workflow generation pipeline end-to-end.

Please:

1. Test with a simple workflow (no custom nodes):
   - Prompt: "Create a workflow that sends me an email when a new row is added to my Google Sheet"
   - Verify all 5 steps execute
   - Verify output is valid AIGeneratedWorkflow
   - Check console logs for timing and token usage

2. Test with a complex workflow (with custom nodes):
   - Prompt: "Create a workflow that fetches Bitcoin price from CoinGecko API and sends it to me via email"
   - Verify all 5 steps execute
   - Verify custom code is generated correctly
   - Verify configSchema matches code
   - Check console logs

3. Test error handling:
   - Test with invalid prompt (should handle gracefully)
   - Verify errors are logged with step context

4. Compare with old implementation:
   - Generate same workflow with old method (if still available)
   - Compare output quality
   - Compare execution time
   - Compare token usage

5. Test in UI:
   - Test dashboard workflow generation
   - Test workspace workflow generation
   - Verify streaming works
   - Verify user experience is same or better

6. Check for any TypeScript errors or build issues

Please run through these tests and report results.
```

---

## Usage Instructions

1. **Start with Step 1** - Copy the Step 1 prompt above and paste it here
2. **Wait for completion** - I'll implement the step and show you how to test it
3. **Test the step** - Follow the testing instructions
4. **Proceed to next step** - Once Step 1 works, copy Step 2 prompt and repeat
5. **Continue sequentially** - Work through Steps 1-10 in order
6. **Final testing** - Use the "Testing the Complete Pipeline" prompt at the end

**Important Notes:**
- Each step builds on the previous one
- Test after each step before moving to the next
- If a step fails, fix it before proceeding
- Keep the old implementation commented until the pipeline is fully working

---

## Quick Reference: What Each Step Does

- **Step 1**: Create TypeScript types (no logic, just types)
- **Step 2**: Intent analysis (parse user prompt → structured intent)
- **Step 3**: Node matching (match intent → library nodes)
- **Step 4**: Workflow generation (plan → complete workflow JSON)
- **Step 5**: Code generation (workflow → add custom code if needed)
- **Step 6**: Validation (workflow → validate and refine)
- **Step 7**: Orchestrator (coordinate all steps, handle streaming)
- **Step 8**: Update main function (use orchestrator instead of old method)
- **Step 9**: UI enhancements (optional: show step progress)
- **Step 10**: Monitoring (add logging and metrics)

