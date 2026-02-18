# Workflow Generation Pipeline — Improvement Plan

> Based on 9 end-to-end test results. Each phase targets a specific root cause and lists exactly what needs to change, in which files, and why.

---

## Test Results Summary

| Test | Prompt | Key Failures |
|------|--------|-------------|
| 1 | Sign-up → welcome email + CRM + Slack | Custom OpenAI node instead of `generate-ai-content`; wrong config fields |
| 2 | New lead → enrich + score + Slack | Suspicious config fields on custom nodes |
| 3 | Tweet → 3 LinkedIn versions + schedule | Wrong trigger (Slack instead of X); custom AI node instead of `generate-ai-content`; duplicate HTTP nodes |
| 4 | Shopify out-of-stock → pause ads + notify | Custom nodes with zero config fields |
| 5 | Nightly calendar + notes summary | Used Google Calendar node for summarization instead of `generate-ai-content` |
| 6 | Daily Stripe revenue → Slack summary | Used Slack node for formatting instead of `generate-ai-content` |
| 7 | Auto-reply pricing emails by company size | Non-functional "Evaluate Company Size" node; should use AI; no AI-generated email |
| 8 | Track tweet replies + daily sentiment | ✅ No issues |
| 9 | Sales call → summarise + extract + CRM + score | Custom AI node; wrong flow topology; overcomplicated |

### Recurring Failure Patterns

1. **Custom node created instead of library node** — 6/9 tests (Tests 1, 3, 5, 6, 7, 9)
2. **Empty or wrong config schemas on custom nodes** — 5/9 tests (Tests 1, 2, 3, 4, 7)
3. **Wrong trigger selected** — 1/9 tests (Test 3)
4. **Wrong workflow topology (edges/flow)** — 2/9 tests (Tests 3, 9)
5. **Overcomplicated workflow** — 1/9 tests (Test 9)

---

## Phase 1 — Fix Node Matching (Highest Impact)

**File:** `src/lib/ai/pipeline/steps/node-matching.ts`
**Fixes:** Tests 1, 3, 5, 6, 7, 9 (the custom-instead-of-library problem)
**Root cause:** The AI at Step 2 keeps generating custom nodes even though library nodes exist that fulfill the requirement. Three sub-causes:

### 1A. Upgrade model from `gpt-4o-mini` to `gpt-4o`

- **Line ~210–225**: Change `model: 'gpt-4o-mini'` → `model: 'gpt-4o'`
- Node matching is the single most important decision in the pipeline. Using the weaker model here causes missed library nodes.
- The cost difference is minimal (~$0.02–0.05 more per generation) vs. the accuracy gain.

### 1B. Add action/transform pattern mappings

The current `COMMON PATTERN MAPPINGS` section (lines ~84–95) only covers **triggers**. There are zero mappings for actions or transforms. Add these mappings:

```
COMMON ACTION/TRANSFORM PATTERN MAPPINGS:
- "generate content", "AI-generated", "use ChatGPT", "use GPT", "use OpenAI to write/generate/create", "AI-powered content" → Use "generate-ai-content" (library transform node)
- "summarize", "summary", "summarise", "recap", "digest" → Use "generate-summary-with-ai" (library transform node)
- "summarize with AI", "AI summary" → Use "generate-summary-with-ai"
- "classify", "categorize", "sort into categories" → Use "classify-text" (library transform node)
- "extract entities", "extract names/dates/places", "NER" → Use "extract-entities" (library transform node)
- "sentiment", "analyze sentiment", "positive/negative" → Use "sentiment-analysis" (library transform node)
- "translate", "convert language" → Use "translate-text" (library transform node)
- "post to X", "post tweet", "tweet" → Use "post-to-x" (library action node)
- "HTTP request", "call API", "fetch from API", "REST call" → Use "http-request" (library action node)
- "send email" → Use "send-email" (library action node)
- "post to Slack", "Slack message", "Slack alert/notification" → Use "post-to-slack-channel" (library action node)
- "create Notion page", "add to Notion", "Notion CRM" → Use "create-notion-page" (library action node)
- "generate image", "create image", "AI image" → Use "generate-image" (library transform node)
- "text to speech", "read aloud" → Use "text-to-speech" (library transform node)
- "speech to text", "transcribe" → Use "speech-to-text" (library transform node)
- "format text", "format data", "template" → Use "format-text" (library transform node... note: this node doesn't exist in registry but "find-replace-text" or "string-operations" may be alternatives)
- "delay", "wait", "pause" → Use "delay-execution" (library transform node)
- "math", "calculate", "sum", "average" → Use "math-operations" (library transform node)
- "update database", "update record", "update CRM fields" → Use "update-database-record" (library action node)
```

### 1C. Restructure the available nodes list by category

Currently all ~60 nodes are dumped as a flat text list. The AI skims past important nodes. Restructure the list into clear sections:

```
## AI & ML NODES (USE THESE for any AI/content generation task):
- generate-ai-content: Generates content using OpenAI based on a custom prompt (USE THIS for any "AI-generated" content)
- generate-summary-with-ai: Generates summaries using OpenAI
- classify-text: Classifies text into categories
- extract-entities: Extracts named entities
- sentiment-analysis: Analyzes text sentiment
- translate-text: Translates between languages
- generate-image: Generates images with AI
- image-recognition: Analyzes images with AI
- text-to-speech: Converts text to audio
- speech-to-text: Converts audio to text

## COMMUNICATION NODES:
- send-email: Sends email via SendGrid
- post-to-slack-channel: Posts to Slack
- send-discord-message: Sends Discord messages
- send-sms-via-twilio: Sends SMS
- post-to-x: Posts to X/Twitter

## DATA & INTEGRATION NODES:
- create-notion-page: Creates Notion pages
- http-request: Makes HTTP requests to any API
- update-database-record / insert-database-record / database-query
... etc.

## TRIGGER NODES:
... etc.
```

### 1D. Add a simplicity principle

Add this to the system prompt:

```
SIMPLICITY RULE (CRITICAL):
- Prefer fewer nodes that do more over many specialized nodes.
- The "generate-ai-content" node can handle summarization, classification, extraction, formatting, scoring, and content creation — ALL in one prompt. Use it instead of chaining multiple specialized nodes.
- Only use specialized AI nodes (classify-text, extract-entities, sentiment-analysis) when the user specifically needs structured, programmatic output that must be parsed downstream.
- Target: Most workflows should have 3-5 nodes. Rarely more than 7.
- If you can accomplish a task with one "generate-ai-content" node and a good prompt, DO THAT instead of creating a custom node or chaining 3 specialized nodes.
```

### 1E. Add explicit anti-pattern examples

```
ANTI-PATTERNS (NEVER DO THESE):
❌ Creating a custom "Generate AI Content" or "OpenAI Content Generation" node → ALWAYS use "generate-ai-content" from the library
❌ Creating a custom "Summarize Text" node → ALWAYS use "generate-summary-with-ai" from the library  
❌ Creating a custom "Send Email" node → ALWAYS use "send-email" from the library
❌ Creating a custom "Post to Slack" node → ALWAYS use "post-to-slack-channel" from the library
❌ Using a Slack/Google Calendar/other integration node for data formatting → Use "generate-ai-content" or a transform node instead
❌ Creating two instances of the same node type (e.g., two HTTP Request nodes) when one would suffice
```

---

## Phase 2 — Fix Intent Analysis

**File:** `src/lib/ai/pipeline/steps/intent-analysis.ts`
**Fixes:** Test 3 (wrong trigger), improves all tests by giving node matching better input
**Root cause:** Intent analysis has no knowledge of what library nodes exist, so it outputs abstract requirement strings that don't map to real node IDs.

### 2A. Inject available node IDs into intent analysis

Add the list of **trigger node IDs** and **key action/transform node IDs** to the intent analysis system prompt. The AI should output IDs that match real library nodes wherever possible.

Add to the system prompt:

```
AVAILABLE TRIGGER NODES (use these exact IDs when possible):
- "scheduled-time-trigger" — cron-based scheduled triggers
- "webhook-trigger" — generic webhook endpoint (use for any external event like signups, orders, API calls)
- "new-form-submission" — Google Forms submissions
- "new-email-received" — new Gmail messages
- "new-row-in-google-sheet" — new rows in Google Sheets
- "new-message-in-slack" — new Slack messages
- "new-discord-message" — new Discord messages
- "new-github-issue" — new GitHub issues
- "file-uploaded" — file uploaded to Google Drive
- "manual-trigger" — manual execution

KEY ACTION/TRANSFORM NODES:
- "generate-ai-content" — AI content generation with custom prompt (use for ANY AI-generated content, emails, summaries, analysis)
- "generate-summary-with-ai" — AI-powered text summarization
- "send-email" — send email via SendGrid
- "post-to-slack-channel" — post message to Slack
- "create-notion-page" — create Notion page
- "http-request" — make HTTP requests to any API
- "post-to-x" — post to X/Twitter
- "classify-text", "extract-entities", "sentiment-analysis" — specialized AI transforms
- "update-database-record", "insert-database-record" — database operations

RULES FOR TRIGGERS AND ACTIONS ARRAYS:
- Use exact library node IDs whenever possible (e.g., "scheduled-time-trigger" not just "scheduled")
- If no library trigger exists for the user's event (e.g., "new tweet on X", "Shopify inventory change"), use "webhook-trigger" and describe the event in the goal
- For AI content generation needs, put "generate-ai-content" in actions or transforms, NOT in customRequirements
- Only put genuinely novel functionality in customRequirements — things that no library node covers at all
```

### 2B. Reduce false positives in `customRequirements`

Update the prompt to clarify:

```
customRequirements RULES:
- NEVER put AI content generation, summarization, classification, entity extraction, or sentiment analysis in customRequirements — these are ALL covered by library nodes
- NEVER put email sending, Slack posting, Notion page creation, or HTTP requests in customRequirements
- Only include truly unique functionality: specific third-party API integrations not in the library, complex business logic, custom data transformations with no library equivalent
- When in doubt, leave customRequirements EMPTY — it's better to have fewer custom requirements than too many
```

### 2C. Add trigger gap awareness

```
TRIGGER GAPS (no library trigger exists for these — use webhook-trigger):
- X/Twitter events (new tweet, new reply, new mention) → use "webhook-trigger"
- Shopify events (inventory change, new order, product update) → use "webhook-trigger"
- Stripe events (payment, subscription, invoice) → use "webhook-trigger" (note: "payment-completed" library node exists for simple payment webhooks)
- Any third-party service not listed above → use "webhook-trigger"
```

---

## Phase 3 — Fix Code Generation for Custom Nodes

**File:** `src/lib/ai/pipeline/steps/code-generation.ts`
**Fixes:** Tests 1, 2, 3, 4, 7 (empty/wrong config schemas)
**Root cause:** Code generation only receives the node's description and requirements — it has no awareness of the workflow context, data flow, or what the previous/next nodes expect.

### 3A. Pass full workflow context to code generation

Currently code generation receives:
```
Description: ${nodeDescription}
Requirements: ${nodeRequirements}
```

Change it to also include:
```
Original User Prompt: ${context.userPrompt}

Full Workflow Context:
- This node's position in the flow: Node ${index + 1} of ${totalNodes}
- Previous node(s): ${previousNodes.map(n => `${n.label} (${n.nodeId}) — outputs: ${n.outputs}`).join(', ')}
- Next node(s): ${nextNodes.map(n => `${n.label} (${n.nodeId}) — expects inputs: ${n.inputs}`).join(', ')}
- Data flowing into this node: ${incomingDataFlow}
- Data expected from this node: ${outgoingDataFlow}
```

This gives the code generation AI the context it needs to create correct config fields and proper input/output handling.

### 3B. Enforce minimum config fields for common patterns

Add rules to the code generation prompt:

```
MINIMUM CONFIG FIELDS BY PATTERN:
If generating a node that calls OpenAI/GPT:
  REQUIRED fields: prompt (textarea, required), model (select with options: gpt-4o, gpt-4o-mini, gpt-3.5-turbo)
  
If generating a node that sends HTTP requests:
  REQUIRED fields: url (string, required), method (select: GET/POST/PUT/DELETE), headers (textarea, optional), body (textarea, optional)

If generating a node that interacts with an external service API:
  REQUIRED fields: At minimum, every parameter needed to make the API call functional
  NEVER leave configSchema empty — every custom node MUST have at least one config field

If generating a trigger node:
  REQUIRED fields: At minimum, the connection/endpoint/URL needed to receive events
  Trigger nodes should NEVER have an empty configSchema
```

### 3C. Add config schema validation sub-step

After generating code, programmatically validate:
1. Every `config.X` reference in the generated code has a matching field in `configSchema`
2. Every field in `configSchema` has a sensible `type` (model selection should be `select` with options, not a text `string`)
3. `configSchema` is not empty (every custom node must have at least one field)
4. If any validation fails, regenerate with explicit error feedback

### 3D. Add `select` field enforcement

When a config field represents a selection from a known set (like OpenAI models, HTTP methods, etc.), the code generation should use `type: "select"` with `options`, not `type: "string"`:

```
FIELD TYPE RULES:
- Model selection (OpenAI, etc.) → type: "select", options: [{label: "GPT-4o", value: "gpt-4o"}, {label: "GPT-4o Mini", value: "gpt-4o-mini"}, ...]
- HTTP method → type: "select", options: [{label: "GET", value: "GET"}, {label: "POST", value: "POST"}, ...]
- Boolean choices → type: "select", options: [{label: "Yes", value: "true"}, {label: "No", value: "false"}]
- Long text input (prompts, bodies, descriptions) → type: "textarea"
- Short text input (URLs, IDs, names) → type: "string"
- Numeric input → type: "number"
```

---

## Phase 4 — Enhance Validation

**File:** `src/lib/ai/pipeline/steps/validation.ts`
**Fixes:** Tests 3, 9 (wrong flow topology), catches remaining edge cases
**Root cause:** Validation only checks structural correctness (fields present, edges reference real nodes). It does zero semantic validation.

### 4A. Add semantic flow validation (programmatic)

Add these checks to `validateWorkflowProgrammatically()`:

```typescript
// Check 1: No duplicate library node types (unless justified)
const libraryNodeIds = nodes
  .filter(n => n.data.nodeId !== 'CUSTOM_GENERATED')
  .map(n => n.data.nodeId);
const duplicateNodeIds = libraryNodeIds.filter((id, i) => libraryNodeIds.indexOf(id) !== i);
if (duplicateNodeIds.length > 0) {
  console.warn(`[Validation] Duplicate library nodes detected: ${duplicateNodeIds.join(', ')}`);
  // Flag for review but don't fail
}

// Check 2: Trigger node should have no incoming edges
const triggerNodes = nodes.filter(n => {
  const nodeId = n.data.nodeId;
  return nodeRegistry[nodeId]?.type === 'trigger' || nodeId.includes('trigger');
});
for (const trigger of triggerNodes) {
  const incomingEdges = edges.filter(e => e.target === trigger.id);
  if (incomingEdges.length > 0) {
    return { success: false, error: `Trigger node ${trigger.id} should not have incoming edges` };
  }
}

// Check 3: Every non-trigger node should have at least one incoming edge
const nonTriggerNodes = nodes.filter(n => !triggerNodes.includes(n));
for (const node of nonTriggerNodes) {
  const incomingEdges = edges.filter(e => e.target === node.id);
  if (incomingEdges.length === 0) {
    return { success: false, error: `Node ${node.id} (${node.data.label}) has no incoming edges — it's disconnected` };
  }
}

// Check 4: No orphaned nodes (nodes with no edges at all)
for (const node of nodes) {
  const hasEdges = edges.some(e => e.source === node.id || e.target === node.id);
  if (!hasEdges && nodes.length > 1) {
    return { success: false, error: `Node ${node.id} is completely orphaned — no edges connect to it` };
  }
}

// Check 5: No cycles (would cause infinite loops)
// Simple cycle detection using DFS
```

### 4B. Add CUSTOM_GENERATED node validation

```typescript
// Check: Every CUSTOM_GENERATED node has non-empty configSchema
for (const node of nodes) {
  if (node.data.nodeId === 'CUSTOM_GENERATED') {
    if (!node.data.configSchema || Object.keys(node.data.configSchema).length === 0) {
      console.warn(`[Validation] Custom node ${node.id} has empty configSchema`);
    }
    if (!node.data.customCode || node.data.customCode.trim().length === 0) {
      return { success: false, error: `Custom node ${node.id} has no code` };
    }
  }
}
```

### 4C. Add node count sanity check

```typescript
// Warn if workflow seems overcomplicated
if (nodes.length > 7) {
  console.warn(`[Validation] Workflow has ${nodes.length} nodes — consider simplifying`);
}
```

---

## Phase 5 — Add Post-Generation Self-Review Step

**New file:** `src/lib/ai/pipeline/steps/self-review.ts`
**Fixes:** Final safety net that catches any remaining issues
**Root cause:** No step in the pipeline checks the complete workflow against the original user prompt for logical correctness.

### 5A. Create a new pipeline step (Step 6.5, before final return)

This step takes:
- The original user prompt
- The complete generated workflow (nodes, edges, config)
- The list of available library nodes

And asks GPT-4o:

```
You are a workflow quality reviewer. Your job is to check if a generated workflow correctly fulfills the user's original request.

USER'S ORIGINAL REQUEST:
"${userPrompt}"

GENERATED WORKFLOW:
${JSON.stringify(workflow, null, 2)}

AVAILABLE LIBRARY NODES:
${libraryNodesList}

CHECK THESE ITEMS:
1. Does the trigger correctly match what the user asked for?
2. Does every action the user requested have a corresponding node?
3. Are there any custom nodes that could be replaced with library nodes? List them.
4. Is the flow topology correct? (sequential where needed, parallel only where appropriate)
5. Do custom nodes have complete, functional config schemas?
6. Is the workflow overcomplicated? Could it be simplified?
7. Does the data flow make sense? (each node receives the data it needs from the previous node)

OUTPUT:
Return a JSON object:
{
  "isValid": true/false,
  "issues": [
    { "severity": "critical" | "warning", "node": "node-id", "description": "what's wrong", "fix": "what should change" }
  ],
  "replacements": [
    { "currentNodeId": "node-id", "replaceWith": "library-node-id", "reason": "why" }
  ]
}
```

### 5B. Auto-apply non-breaking fixes

If the review finds:
- A custom node that should be a library node → swap it automatically
- A missing config field → add it
- A wrong edge → fix the topology

If the review finds critical issues that can't be auto-fixed, log them and optionally re-run the affected pipeline step.

### 5C. Wire into orchestrator

**File:** `src/lib/ai/pipeline/orchestrator.ts`

Add as Step 6.5 between validation and the final `onComplete` callback:

```typescript
// Step 6.5: Self-Review
emitProgress(onChunk, 'self-review', 7, 7); // Update total steps to 7
const reviewResult = await selfReviewWorkflow(context);
if (reviewResult.data?.replacements?.length > 0) {
  // Apply replacements
  context.workflow = applyReplacements(context.workflow, reviewResult.data.replacements);
}
```

---

## Implementation Order & Expected Impact

| Phase | Effort | Impact | Tests Fixed |
|-------|--------|--------|-------------|
| **Phase 1** (Node Matching) | Medium | 🔴 Critical | 1, 3, 5, 6, 7, 9 |
| **Phase 2** (Intent Analysis) | Small | 🟡 High | 3, improves all |
| **Phase 3** (Code Generation) | Medium | 🟡 High | 1, 2, 3, 4, 7 |
| **Phase 4** (Validation) | Small | 🟢 Medium | 3, 9, safety net |
| **Phase 5** (Self-Review) | Medium | 🟢 Medium | Final safety net |

**Recommendation:** Do Phase 1 first — it alone should fix 6 out of 9 test failures. Then Phase 2 + 3 together. Phase 4 + 5 are safety nets.

---

## Files Modified Per Phase

| Phase | Files |
|-------|-------|
| 1 | `src/lib/ai/pipeline/steps/node-matching.ts` |
| 2 | `src/lib/ai/pipeline/steps/intent-analysis.ts` |
| 3 | `src/lib/ai/pipeline/steps/code-generation.ts` |
| 4 | `src/lib/ai/pipeline/steps/validation.ts` |
| 5 | `src/lib/ai/pipeline/steps/self-review.ts` (new), `src/lib/ai/pipeline/orchestrator.ts` |

