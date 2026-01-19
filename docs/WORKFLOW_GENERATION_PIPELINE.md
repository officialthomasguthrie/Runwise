# Workflow Generation Pipeline Implementation Guide

## Overview

This document outlines the step-by-step implementation of a multi-stage pipeline for AI workflow generation. The pipeline uses different OpenAI models optimized for each task, improving both cost efficiency and quality.

## Why a Pipeline?

**Current Approach:**
- Single-step generation using `gpt-4o` for everything
- One large system prompt handling all concerns
- Higher costs (premium model for all tasks)

**Pipeline Approach:**
- **Step 1: Intent Analysis** (`gpt-4o-mini`) - Parse user intent, extract requirements
- **Step 2: Node Matching** (`gpt-4o-mini`) - Match requirements to library nodes
- **Step 3: Workflow Generation** (`gpt-4o`) - Generate complete workflow JSON structure
- **Step 4: Code Generation** (`gpt-4o`) - Generate custom code for custom nodes
- **Step 5: Validation** (`gpt-4o-mini`) - Validate and refine the workflow

**Benefits:**
- 60-70% cost reduction by using cheaper models for simpler tasks
- Better quality: GPT-4o focuses only on critical generation tasks
- Easier debugging with isolated, testable steps
- Better observability with step-by-step progress
- Maintainable and extensible architecture

## Architecture

```
User Prompt
    ↓
┌─────────────────────────────────────────┐
│ Step 1: Intent Analysis (gpt-4o-mini)  │
│ - Parse user intent                     │
│ - Extract requirements                  │
│ - Break into logical steps              │
└──────────────┬──────────────────────────┘
               ↓ IntentAnalysis
┌─────────────────────────────────────────┐
│ Step 2: Node Matching (gpt-4o-mini)    │
│ - Match requirements to library nodes   │
│ - Identify custom node needs           │
│ - Plan connections                      │
└──────────────┬──────────────────────────┘
               ↓ WorkflowPlan
┌─────────────────────────────────────────┐
│ Step 3: Workflow Generation (gpt-4o)   │
│ - Generate complete workflow JSON       │
│ - Create nodes, edges, connections      │
│ - Set up data flow                      │
└──────────────┬──────────────────────────┘
               ↓ WorkflowStructure
┌─────────────────────────────────────────┐
│ Step 4: Code Generation (gpt-4o)       │
│ - Generate custom code for custom nodes │
│ - Create config schemas                 │
│ - (Only if custom nodes exist)          │
└──────────────┬──────────────────────────┘
               ↓ AIGeneratedWorkflow
┌─────────────────────────────────────────┐
│ Step 5: Validation (gpt-4o-mini)       │
│ - Validate JSON structure               │
│ - Check required fields                 │
│ - Minor refinements if needed           │
└──────────────┬──────────────────────────┘
               ↓
         Final Workflow
```

## Implementation Steps

### Step 1: Create Type Definitions

**File:** `src/lib/ai/pipeline/types.ts`

**What to create:**
- Interface for each pipeline step's input/output
- Pipeline context type
- Step result types

**Testing:**
- Verify TypeScript compiles without errors
- No runtime testing needed at this stage

---

### Step 2: Implement Intent Analysis Step

**File:** `src/lib/ai/pipeline/steps/intent-analysis.ts`

**Purpose:** Parse user prompt, extract requirements, break into logical workflow steps

**Model:** `gpt-4o-mini` (cheap, fast, sufficient for parsing)

**Input:** User prompt string, existing workflow context

**Output:** Structured intent with:
- Workflow goal
- Required triggers
- Required actions
- Transformations needed
- Custom functionality needed

**Testing Prompt:**
```
Test with: "Create a workflow that sends me an email when a new row is added to my Google Sheet"

Expected output:
- Intent: automate email notifications
- Trigger: new row in Google Sheet
- Action: send email
- No transforms needed
- No custom code needed
```

**How to Test:**
1. Call the step function directly with test input
2. Verify JSON output structure
3. Check that requirements are correctly extracted

---

### Step 3: Implement Node Matching Step

**File:** `src/lib/ai/pipeline/steps/node-matching.ts`

**Purpose:** Match requirements to library nodes or identify custom node needs

**Model:** `gpt-4o-mini` (cheap, fast, sufficient for matching)

**Input:** Intent analysis result, available nodes list

**Output:** Workflow plan with:
- Selected library nodes (with IDs)
- Custom nodes needed (with requirements)
- Connection plan
- Data flow mapping

**Testing Prompt:**
```
Use intent from Step 2 test

Expected output:
- Library nodes: ["new-row-in-google-sheet", "send-email"]
- Custom nodes: []
- Connections: trigger → action
```

**How to Test:**
1. Pass intent from Step 2 test
2. Verify node IDs match library
3. Verify connection plan is logical

---

### Step 4: Implement Workflow Generation Step

**File:** `src/lib/ai/pipeline/steps/workflow-generation.ts`

**Purpose:** Generate complete workflow JSON structure

**Model:** `gpt-4o` (critical step, needs high quality)

**Input:** Workflow plan from Step 3, available nodes, existing workflow

**Output:** Complete workflow JSON with:
- All nodes (with positions, config templates)
- All edges (with proper connections)
- Workflow name
- Reasoning

**Testing Prompt:**
```
Use plan from Step 3 test

Expected output:
- Valid JSON matching AIGeneratedWorkflow interface
- Nodes with correct structure
- Edges connecting nodes properly
- Template syntax in configs ({{inputData.field}})
```

**How to Test:**
1. Pass plan from Step 3
2. Verify JSON structure matches type
3. Check node IDs are valid
4. Verify edges connect properly
5. Test with streaming (should stream JSON chunks)

---

### Step 5: Implement Code Generation Step

**File:** `src/lib/ai/pipeline/steps/code-generation.ts`

**Purpose:** Generate custom code for custom nodes (only if needed)

**Model:** `gpt-4o` (critical for code quality)

**Input:** Workflow with custom nodes, requirements for each

**Output:** Updated workflow with:
- Complete customCode for each custom node
- Complete configSchema for each custom node
- Proper error handling

**Testing Prompt:**
```
Use workflow with custom nodes from Step 4 (if any)
Or test with: "Create a workflow that fetches Bitcoin price from CoinGecko API"

Expected output:
- Custom node with valid JavaScript code
- ConfigSchema matching code requirements
- Proper async/await usage
- Error handling included
```

**How to Test:**
1. Pass workflow with custom nodes
2. Verify customCode is valid JavaScript
3. Check configSchema matches code (if code uses `config.apiKey`, schema must have `apiKey`)
4. Test code syntax (try to parse it)
5. Verify error handling present

---

### Step 6: Implement Validation Step

**File:** `src/lib/ai/pipeline/steps/validation.ts`

**Purpose:** Validate and refine the workflow

**Model:** `gpt-4o-mini` (quick validation, minor fixes)

**Input:** Complete workflow from Step 5

**Output:** Validated/refined workflow with:
- All required fields present
- Node IDs validated against library
- Edges properly formed
- Config schemas complete

**Testing Prompt:**
```
Use complete workflow from Step 5

Expected output:
- Same or improved workflow structure
- All validation checks passed
- No missing required fields
```

**How to Test:**
1. Pass complete workflow
2. Verify no validation errors
3. Check all required fields present
4. Verify structure still valid

---

### Step 7: Create Pipeline Orchestrator

**File:** `src/lib/ai/pipeline/orchestrator.ts`

**Purpose:** Coordinate all steps, handle streaming, error handling

**Key Features:**
- Execute steps sequentially
- Stream progress updates
- Handle errors gracefully
- Support both streaming and non-streaming modes
- Maintain backward compatibility

**Testing:**
1. Test full pipeline with simple workflow
2. Test with complex workflow (custom nodes)
3. Test error handling at each step
4. Test streaming progress updates
5. Compare output with old implementation

---

### Step 8: Update Main Generation Function

**File:** `src/lib/ai/workflow-generator.ts`

**Purpose:** Replace `generateWorkflowFromPromptStreaming` to use pipeline

**Changes:**
- Call pipeline orchestrator instead of single-step generation
- Maintain same function signature (backward compatible)
- Pass through all callbacks (onChunk, onComplete, onError)
- Map pipeline step progress to existing stream format

**Testing:**
1. Test existing API route still works
2. Test streaming still works
3. Verify output format unchanged
4. Test with various workflow types

---

### Step 9: Update Streaming Format (Optional Enhancement)

**File:** `src/app/api/ai/generate-workflow/route.ts`
**File:** `src/components/ui/ai-chat-sidebar.tsx`

**Purpose:** Add step progress indicators to UI (optional)

**Changes:**
- Add step progress events to stream
- Update UI to show step progress
- Keep backward compatible (ignore unknown events)

**Testing:**
1. Test with updated client (should show progress)
2. Test with old client (should still work)
3. Verify step indicators display correctly

---

### Step 10: Add Monitoring & Logging

**Purpose:** Track pipeline performance and costs

**What to Add:**
- Log each step's execution time
- Log token usage per step
- Log model used per step
- Track success/failure rates per step

**Testing:**
1. Generate workflows and check logs
2. Verify token usage tracking
3. Verify execution time tracking

---

## Detailed Implementation Prompts

Use these prompts when implementing each step:

### Prompt 1: Create Type Definitions

```
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
```

**Test:** Verify file compiles with `npm run build`

---

### Prompt 2: Implement Intent Analysis Step

```
Create a new file `src/lib/ai/pipeline/steps/intent-analysis.ts` that:

1. Exports function `analyzeIntent(context: PipelineContext): Promise<StepResult<IntentAnalysis>>`

2. Uses `gpt-4o-mini` model with a focused system prompt that:
   - Analyzes user prompt for workflow automation intent
   - Extracts: goal, triggers needed, actions needed, transforms, custom requirements
   - Detects if modifying existing workflow vs creating new
   - Returns structured JSON matching IntentAnalysis interface

3. System prompt should be concise and focused only on intent analysis

4. Uses OpenAI with response_format: { type: 'json_object' }

5. Handles errors gracefully and returns StepResult with error if failed

6. Tracks token usage and includes in result

Example prompt structure:
System: "You are a workflow intent analyzer. Analyze user prompts and extract workflow requirements..."
User: {context.userPrompt} + existing workflow context if present
```

**Test:** 
- Call function with test prompt: "Create a workflow that sends me an email when a new row is added to my Google Sheet"
- Verify output has all IntentAnalysis fields
- Verify goal is extracted correctly
- Verify triggers/actions identified

---

### Prompt 3: Implement Node Matching Step

```
Create a new file `src/lib/ai/pipeline/steps/node-matching.ts` that:

1. Exports function `matchNodes(context: PipelineContext & { intent: IntentAnalysis }): Promise<StepResult<WorkflowPlan>>`

2. Uses `gpt-4o-mini` model with system prompt that:
   - Takes intent analysis and available nodes list
   - Matches requirements to library nodes (prefer library over custom)
   - Identifies when custom nodes are truly needed
   - Plans logical connections between nodes
   - Maps data flow between nodes

3. System prompt should include the available nodes list (same format as current system)

4. Returns WorkflowPlan with library node IDs, custom node requirements, and connection plan

5. Handles errors gracefully

Example:
System: "You are a workflow planner. Match workflow requirements to available nodes..."
User: Intent analysis JSON + Available nodes list
```

**Test:**
- Pass intent from Step 2 test
- Verify library node IDs match actual node IDs
- Verify custom nodes only identified when truly needed
- Verify connections are logical

---

### Prompt 4: Implement Workflow Generation Step

```
Create a new file `src/lib/ai/pipeline/steps/workflow-generation.ts` that:

1. Exports function `generateWorkflowStructure(context: PipelineContext & { plan: WorkflowPlan }): Promise<StepResult<AIGeneratedWorkflow>>`

2. Uses `gpt-4o` model (same as current implementation) with system prompt that:
   - Takes workflow plan and generates complete workflow JSON
   - Creates nodes with correct structure (id, type, position, data)
   - Creates edges with correct structure (source, target, type, animated, style)
   - Uses template syntax for config values ({{inputData.field}})
   - Includes descriptions for all nodes
   - Sets all positions to {x: 0, y: 0} (auto-layout handles positioning)

3. System prompt should be similar to current one but focused on structure generation (can reference the plan)

4. Supports streaming via onChunk callback (optional parameter)

5. Returns complete AIGeneratedWorkflow matching current type

6. Uses response_format: { type: 'json_object' }

7. Handles errors and JSON parsing errors

This step is critical and should maintain high quality output.
```

**Test:**
- Pass plan from Step 3 test
- Verify output matches AIGeneratedWorkflow interface
- Verify all nodes have required fields
- Verify edges connect properly
- Test streaming (should stream JSON chunks)
- Verify template syntax used in configs

---

### Prompt 5: Implement Code Generation Step

```
Create a new file `src/lib/ai/pipeline/steps/code-generation.ts` that:

1. Exports function `generateCustomCode(context: PipelineContext & { workflow: AIGeneratedWorkflow }): Promise<StepResult<AIGeneratedWorkflow>>`

2. Uses `gpt-4o` model (critical for code quality) with system prompt that:
   - Takes workflow with CUSTOM_GENERATED nodes that need code
   - Generates customCode as JavaScript async function
   - Creates complete configSchema that matches all config values used in code
   - Includes proper error handling (try/catch)
   - Uses context.http.get/post/put/delete for HTTP requests
   - Returns structured data objects

3. Only processes nodes where nodeId === "CUSTOM_GENERATED"

4. If no custom nodes exist, returns workflow unchanged

5. Can process multiple custom nodes (either sequentially or in parallel)

6. System prompt should focus on code generation rules:
   - Format: async (inputData, config, context) => { ... }
   - Use async/await for API calls
   - Access config via config object
   - Access previous node output via inputData
   - Return structured objects
   - Include error handling
   - ConfigSchema must match ALL config values used in code

7. Validates that configSchema matches code requirements (if code uses config.apiKey, schema must have apiKey field)

8. Handles errors gracefully
```

**Test:**
- Test with workflow containing custom nodes
- Verify customCode is valid JavaScript (try to parse it)
- Verify configSchema has all fields used in code
- Test with workflow with no custom nodes (should pass through unchanged)
- Verify error handling in generated code

---

### Prompt 6: Implement Validation Step

```
Create a new file `src/lib/ai/pipeline/steps/validation.ts` that:

1. Exports function `validateWorkflow(context: PipelineContext & { workflow: AIGeneratedWorkflow }): Promise<StepResult<AIGeneratedWorkflow>>`

2. Uses `gpt-4o-mini` model (quick validation) with system prompt that:
   - Takes complete workflow JSON
   - Validates structure matches AIGeneratedWorkflow interface
   - Checks all required fields present
   - Validates node IDs exist in library (for library nodes)
   - Validates edges reference valid node IDs
   - Makes minor refinements if needed (add missing descriptions, fix edge styles)

3. Can also use programmatic validation (TypeScript validation)

4. Returns validated/refined workflow

5. Handles errors gracefully

This step should be fast and lightweight - if validation fails, it should report the error rather than trying to fix major issues.
```

**Test:**
- Pass complete workflow from Step 5
- Verify validation catches missing required fields
- Verify validation checks node IDs
- Verify validation checks edge references
- Test with invalid workflow (should return error)
- Test with valid workflow (should pass through or minor refinements)

---

### Prompt 7: Create Pipeline Orchestrator

```
Create a new file `src/lib/ai/pipeline/orchestrator.ts` that:

1. Exports function `runWorkflowGenerationPipeline(request: WorkflowGenerationRequest & { onChunk?: (chunk: string, isComplete: boolean) => void, onComplete: (workflow: AIGeneratedWorkflow, tokenUsage?: { inputTokens: number, outputTokens: number }) => void, onError: (error: Error) => void }): Promise<void>`

2. Orchestrates all 5 steps sequentially:
   - Step 1: analyzeIntent() 
   - Step 2: matchNodes() (only if Step 1 succeeds)
   - Step 3: generateWorkflowStructure() (only if Step 2 succeeds)
   - Step 4: generateCustomCode() (only if Step 3 succeeds, and only if custom nodes exist)
   - Step 5: validateWorkflow() (only if Step 4 succeeds)

3. Maintains PipelineContext across steps, accumulating results

4. Emits progress updates via onChunk callback:
   - "Step 1/5: Analyzing intent..."
   - "Step 2/5: Matching nodes..."
   - etc.
   - JSON chunks from Step 3 (workflow generation) streaming
   - Final complete workflow

5. Aggregates token usage from all steps

6. Handles errors at any step:
   - If Step 1-2 fail: return error via onError
   - If Step 3-5 fail: return error via onError
   - Log errors for debugging

7. Calls onComplete with final workflow and total token usage

8. Supports streaming (streams from Step 3, emits progress updates)

9. Backward compatible: same interface as generateWorkflowFromPromptStreaming
```

**Test:**
- Test full pipeline with simple workflow (no custom nodes)
- Test full pipeline with complex workflow (custom nodes)
- Test error handling at Step 1
- Test error handling at Step 3
- Test streaming (should stream progress + JSON chunks)
- Test token usage aggregation
- Compare output with old implementation (should be similar or better)

---

### Prompt 8: Update Main Generation Function

```
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
   - Pipeline's onChunk → request.onChunk (filter out progress messages if needed, or include them)
   - Pipeline's onComplete → request.onComplete
   - Pipeline's onError → request.onError

5. Keep old implementation commented out for reference during testing

6. Ensure backward compatibility - all existing callers should work without changes
```

**Test:**
- Test existing API route `/api/ai/generate-workflow` still works
- Test with dashboard workflow generation
- Test with workspace workflow generation
- Verify output format unchanged
- Test streaming behavior
- Test error handling

---

### Prompt 9: Update Streaming Format (Optional Enhancement)

```
Optionally enhance the streaming format to include step progress:

1. Update `src/app/api/ai/generate-workflow/route.ts`:
   - Stream step progress events: `{ type: 'step-progress', step: string, progress: number }`
   - Stream JSON chunks: `{ type: 'json-chunk', content: string, isComplete: boolean }`
   - Stream complete: `{ type: 'complete', success: true, workflow: ... }`

2. Update `src/components/ui/ai-chat-sidebar.tsx`:
   - Handle step-progress events to show progress indicator
   - Keep handling json-chunk events for streaming workflow
   - Backward compatible: ignore unknown event types

3. Optional: Add progress UI component showing "Step X/5: Step Name..."

This is optional - the pipeline will work without this enhancement.
```

**Test:**
- Test with updated client (should show step progress)
- Test with old client code (should still work, just ignore progress events)
- Verify step indicators display correctly

---

### Prompt 10: Add Monitoring & Logging

```
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

3. Track errors per step for debugging

This helps with optimization and debugging.
```

**Test:**
- Generate workflows and check console logs
- Verify timing is logged correctly
- Verify token usage is tracked
- Verify errors are logged with step context

---

## Testing Strategy

### After Each Step Implementation:

1. **Unit Test the Step:**
   ```typescript
   // Test intent analysis
   const result = await analyzeIntent({
     userPrompt: "Create workflow that sends email when new row in sheet",
     availableNodes: [...],
   });
   expect(result.success).toBe(true);
   expect(result.data?.goal).toBeDefined();
   ```

2. **Integration Test:**
   - Pass test input through the step
   - Verify output structure
   - Verify output correctness

3. **Manual Test:**
   - Create a test script that calls the step directly
   - Verify output in console
   - Check for errors

### After Pipeline Completion:

1. **End-to-End Test:**
   - Test full pipeline with simple workflow
   - Test full pipeline with complex workflow (custom nodes)
   - Test with existing workflow modification

2. **Regression Test:**
   - Compare output with old implementation
   - Verify all existing features still work
   - Test error cases

3. **Performance Test:**
   - Measure execution time
   - Measure token usage
   - Compare with old implementation

4. **User Acceptance Test:**
   - Test in UI with real workflows
   - Verify user experience is same or better
   - Check streaming behavior

## Rollback Plan

If the pipeline causes issues:

1. **Quick Rollback:**
   - Revert `generateWorkflowFromPromptStreaming` to old implementation
   - Keep pipeline code in place (commented out)
   - Old code is still in git history

2. **Gradual Rollout:**
   - Feature flag to switch between old and new
   - Test with subset of users
   - Monitor errors and performance

## Cost Analysis

**Current Implementation:**
- Single `gpt-4o` call: ~2000-4000 tokens input, ~2000-4000 tokens output
- Cost: ~$0.03-0.06 per workflow

**Pipeline Implementation:**
- Step 1 (`gpt-4o-mini`): ~500-1000 tokens input, ~200-500 tokens output → ~$0.0005-0.001
- Step 2 (`gpt-4o-mini`): ~1000-2000 tokens input, ~300-600 tokens output → ~$0.001-0.002
- Step 3 (`gpt-4o`): ~2000-3000 tokens input, ~2000-4000 tokens output → ~$0.03-0.05
- Step 4 (`gpt-4o`): ~1000-2000 tokens input, ~500-2000 tokens output → ~$0.01-0.03 (only if custom nodes)
- Step 5 (`gpt-4o-mini`): ~2000-3000 tokens input, ~200-500 tokens output → ~$0.001-0.002

**Total Pipeline Cost:**
- Without custom nodes: ~$0.032-0.055 (similar or slightly cheaper)
- With custom nodes: ~$0.042-0.082 (slightly more expensive)

**Note:** Actual savings come from:
- Better quality (less re-generation needed)
- Faster Step 1-2 (gpt-4o-mini is faster)
- Better debugging (can identify issues earlier)

## Migration Checklist

- [ ] Step 1: Create type definitions
- [ ] Step 2: Implement intent analysis
- [ ] Step 3: Implement node matching
- [ ] Step 4: Implement workflow generation
- [ ] Step 5: Implement code generation
- [ ] Step 6: Implement validation
- [ ] Step 7: Create pipeline orchestrator
- [ ] Step 8: Update main generation function
- [ ] Step 9: (Optional) Update streaming format
- [ ] Step 10: Add monitoring & logging
- [ ] Test: Unit tests for each step
- [ ] Test: Integration tests
- [ ] Test: End-to-end tests
- [ ] Test: Performance comparison
- [ ] Test: User acceptance testing
- [ ] Deploy: Gradual rollout with feature flag
- [ ] Monitor: Track errors and performance
- [ ] Optimize: Fine-tune prompts based on results

## Questions to Consider

1. **Should Step 4 (code generation) run in parallel for multiple custom nodes?**
   - Yes: Faster, but more complex
   - No: Simpler, sequential is fine

2. **Should we cache Step 1-2 results for similar prompts?**
   - Could cache intent/plan for cost savings
   - But adds complexity

3. **Should we allow skipping steps for simple workflows?**
   - Very simple workflows might not need all steps
   - But consistency is valuable

4. **How to handle streaming through pipeline?**
   - Only Step 3 (workflow generation) needs streaming
   - Other steps are fast, don't need streaming

## Support & Troubleshooting

### Common Issues:

1. **Step 1 fails to extract intent:**
   - Improve system prompt
   - Add examples to prompt
   - Check input format

2. **Step 2 matches wrong nodes:**
   - Provide better node descriptions in prompt
   - Add examples of good matches
   - Validate node IDs exist

3. **Step 3 generates invalid JSON:**
   - Use JSON mode (already doing this)
   - Add validation in prompt
   - Better error handling

4. **Step 4 generates invalid code:**
   - Add code validation
   - Test code execution in sandbox
   - Improve code generation prompt

5. **Step 5 validation too strict:**
   - Balance validation strictness
   - Allow minor issues
   - Focus on critical errors

### Debugging Tips:

- Log intermediate results between steps
- Test each step independently
- Compare outputs between steps
- Use TypeScript types for validation
- Add unit tests for edge cases

## Conclusion

This pipeline approach improves workflow generation by:
- Using appropriate models for each task (cost efficiency)
- Breaking complex problem into manageable steps (maintainability)
- Providing better observability (debugging)
- Maintaining quality where it matters (gpt-4o for critical steps)

Follow the prompts in order, test after each step, and verify backward compatibility throughout.

