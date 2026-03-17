# Agent Chat Builder — Redesign Plan

> Replace the 3-step wizard on `/agents/new` with a full-page, ChatGPT-style conversational builder.
> The user describes what they want, the AI plans it, surfaces any missing integrations inline, asks clarifying questions, then builds — all inside the chat.

---

## High-Level Flow

```
User types description
        ↓
AI streams: "Analysing your request…"
  → intent extracted (what trigger, what actions, what integrations)
        ↓
AI streams: Integration check card
  → each required integration: ✅ connected | ⚠️ connect now (inline OAuth button)
  → if missing: user clicks Connect → OAuth → returns → pipeline auto-resumes
        ↓
AI streams: Questionnaire card (if anything is ambiguous)
  → user fills in answers (multi-select, single-select, text)
  → on submit → pipeline resumes with answers injected
        ↓
AI streams: Plan preview card
  → agent name + emoji, persona, list of behaviours, initial memories
  → "Ready to build?" — two buttons: [Build Agent] [Let me adjust something]
        ↓
If "Let me adjust":
  → AI asks "What would you like to change?"
  → User types → AI regenerates plan → loop until satisfied
        ↓
If "Build Agent":
  → Build progress card streams pipeline stages live:
    [✓] Intent analysed
    [✓] Execution logic generated  
    [✓] Integrations validated
    [~] Logic compiled…
    [ ] Safeguards applied
    [ ] Agent deployed
  → On complete: summary message + [View Agent →] button
        ↓
"Agent" tab at top becomes active → routes to /agents/[id]
```

---

## File Structure (new/changed)

```
src/lib/agents/chat-pipeline.ts        ← core streaming pipeline logic
src/app/api/agents/chat/route.ts       ← streaming SSE endpoint
src/app/api/agents/build/route.ts      ← build-with-progress streaming endpoint
src/app/agents/new/page.tsx            ← REPLACED: now full chat page
src/components/ui/agent-chat/
  index.tsx                            ← root chat page component
  chat-input.tsx                       ← fixed-bottom textarea + send button
  message-list.tsx                     ← scrollable message feed
  bubbles/
    user-bubble.tsx                    ← right-aligned user message
    assistant-bubble.tsx               ← left-aligned AI text with streaming cursor
  cards/
    integration-check-card.tsx        ← integration status + inline connect buttons
    questionnaire-card.tsx            ← dynamic question form (adapts WorkflowQuestionnaire)
    plan-preview-card.tsx             ← plan summary + "Ready to build?" CTA
    build-progress-card.tsx           ← live pipeline stage list
    completion-card.tsx               ← summary + View Agent button
  builder-tabs.tsx                    ← "Builder" | "Agent" tab switcher
```

---

## Streaming Event Protocol

The chat API uses `text/event-stream` (SSE). Every event is a JSON line:

```ts
type ChatEvent =
  | { type: 'text_delta';       delta: string }           // streams AI text char by char
  | { type: 'text_done' }                                 // end of a text block
  | { type: 'integration_check'; integrations: IntegrationCheckItem[] }
  | { type: 'questionnaire';    questions: ClarificationQuestion[] }
  | { type: 'plan';             plan: DeployAgentPlan }
  | { type: 'confirmation' }                              // render "Ready to build?" buttons
  | { type: 'build_stage';      stage: string; status: 'running' | 'done' | 'error' }
  | { type: 'build_complete';   agentId: string; summary: string }
  | { type: 'error';            message: string }

interface IntegrationCheckItem {
  service: string       // e.g. 'google-gmail'
  label: string         // e.g. 'Gmail'
  icon: string          // emoji e.g. '📧'
  required: boolean
  connected: boolean
  oauthUrl?: string     // present if not connected
}
```

The frontend maintains a flat array of `ChatMessage` objects:

```ts
type ChatMessage =
  | { role: 'user';    content: string }
  | { role: 'assistant'; content: string }               // streamed text
  | { role: 'card'; cardType: 'integration_check'; data: IntegrationCheckItem[] }
  | { role: 'card'; cardType: 'questionnaire';     data: ClarificationQuestion[] }
  | { role: 'card'; cardType: 'plan';              data: DeployAgentPlan }
  | { role: 'card'; cardType: 'confirmation' }
  | { role: 'card'; cardType: 'build_progress';    stages: BuildStage[] }
  | { role: 'card'; cardType: 'completion';        agentId: string; summary: string }
```

Each `card` is rendered as a special component inside the chat feed.

---

## Step-by-Step Implementation

---

### STEP 1 — Streaming Utilities & Event Types
**What to build:**
- `src/lib/agents/chat-pipeline.ts`
  - Export all TypeScript types (`ChatEvent`, `ChatMessage`, `IntegrationCheckItem`, `BuildStage`)
  - Export `createSSEStream()` — returns `{ readable, writer }` with helper methods:
    - `writer.text(delta)` — push a `text_delta` event
    - `writer.textDone()` — push `text_done`
    - `writer.card(type, data)` — push any card event
    - `writer.buildStage(stage, status)` — push build progress
    - `writer.complete(agentId, summary)` — push `build_complete`
    - `writer.error(msg)` — push error event and close
    - `writer.close()` — close the stream
  - Export `INTEGRATION_CATALOGUE` mapping service IDs → `{ label, icon, oauthPath }`
  - Export `detectRequiredIntegrations(plan: DeployAgentPlan): string[]` — maps behaviour trigger types to their required service IDs
  
**Testing:** Import the types in a test file — no runtime needed yet.

---

### STEP 2 — Chat Pipeline API (Streaming Endpoint)
**What to build:**
- `src/app/api/agents/chat/route.ts` — `POST`, streams `text/event-stream`
- Request body:
  ```ts
  { 
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    answers?: QuestionnaireAnswer[];   // provided after questionnaire step
    pendingPlan?: DeployAgentPlan;     // provided after user confirms they want to adjust
  }
  ```
- Pipeline logic (run inside the stream):
  1. Extract the latest user message
  2. If `pendingPlan` provided → skip intent/integration/questionnaire → regenerate plan only
  3. Otherwise:
     - Stream: `"Let me analyse that…"` (text_delta events)
     - Run `analyzeIntent` (reuse existing pipeline step) → extract trigger type, actions, integrations
     - Stream: plan text summary
     - Run `detectRequiredIntegrations` → check against user's connected integrations
     - Stream `integration_check` card event (all required, with connected status)
     - If any required integrations missing → stream `"You'll need to connect these first:"` + card → `text_done`, then **pause** (do not continue — the frontend resumes via a follow-up call)
     - If all connected (or no integrations needed):
       - Decide if clarification is needed (reuse existing `generateClarificationQuestions` logic, adapted for agents)
       - If questions needed: stream `questionnaire` card
       - If no questions (or `answers` provided): run `planAgent` → stream `plan` card → stream `confirmation` event
  4. Auth check at the top — 401 if not authenticated

**Key implementation notes:**
- Use `new ReadableStream({ start(controller) { ... } })` + `new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })`
- Each SSE line: `data: ${JSON.stringify(event)}\n\n`
- Wrap in try/catch — on error, push error event and close

---

### STEP 3 — Build-with-Progress API
**What to build:**
- `src/app/api/agents/build/route.ts` — `POST`, streams `text/event-stream`
- Request body: `{ description: string; plan: DeployAgentPlan }`
- Streams build stages in sequence, each as `build_stage` events:
  1. `{ stage: 'Intent analysed', status: 'done' }` (immediate)
  2. `{ stage: 'Execution logic generated', status: 'running' }` → insert agent row in Supabase → `done`
  3. `{ stage: 'Integrations validated', status: 'running' }` → call `createAgentBehaviours` → `done`
  4. `{ stage: 'Memory seeded', status: 'running' }` → call `writeMemory` for each initial memory → `done`
  5. `{ stage: 'Safeguards applied', status: 'running' }` → short artificial delay (feels real) → `done`
  6. `{ stage: 'Agent deployed', status: 'running' }` → update agent status from `deploying` → `active` → `done`
  7. Stream `build_complete` with `agentId` + summary text
- Insert agent with `status: 'deploying'` first so stages feel progressive

---

### STEP 4 — Base Chat UI Components
**What to build:**
- `src/components/ui/agent-chat/bubbles/user-bubble.tsx`
  - Right-aligned pill, white/10 bg, user's message text
- `src/components/ui/agent-chat/bubbles/assistant-bubble.tsx`
  - Left-aligned, no bubble (open text), with a small animated cursor `|` while streaming
  - Accepts `content: string` and `isStreaming: boolean`
- `src/components/ui/agent-chat/message-list.tsx`
  - Accepts `messages: ChatMessage[]` and `isStreaming: boolean`
  - Auto-scrolls to bottom when new messages arrive (useEffect + ref)
  - Renders each message as `UserBubble`, `AssistantBubble`, or the correct card component
  - `overflow-y-auto` with `scrollbar-hide`
- `src/components/ui/agent-chat/chat-input.tsx`
  - Fixed at bottom, full-width, auto-resize textarea (up to ~4 rows)
  - Send button (enabled when non-empty and not streaming)
  - Keyboard: `Enter` sends, `Shift+Enter` newlines
  - Placeholder changes based on pipeline state:
    - Default: `"Describe what you want your agent to do…"`
    - After questionnaire: `"Type your answers…"`
    - After plan: `"Tell me what to change…"` (if adjusting)
  - Disabled with opacity when `isStreaming`

---

### STEP 5 — Integration Check Card
**What to build:**
- `src/components/ui/agent-chat/cards/integration-check-card.tsx`
- Receives `IntegrationCheckItem[]`
- Renders a card with:
  - Header: `"Required integrations"`
  - Each integration as a row:
    - `{icon} {label}` on the left
    - Right: green `✓ Connected` badge OR amber `Connect {label} →` button
  - Connect button: `href={item.oauthUrl}` — opens OAuth flow (standard redirect, same as existing integrations page)
  - After all are connected (state checked via `/api/integrations/status`): auto-calls `onAllConnected()` callback → parent resumes pipeline
  - Has a `onAllConnected` prop — called when polling detects all integrations connected
  - Polls `/api/integrations/status` every 3s while any integration is disconnected (stops once all connected)
  - When `onAllConnected` fires: shows `"All integrations connected ✓"` briefly then calls parent

---

### STEP 6 — Questionnaire Card
**What to build:**
- `src/components/ui/agent-chat/cards/questionnaire-card.tsx`
- Similar to existing `WorkflowQuestionnaire` component but adapted for inline chat use
- Accepts `questions: ClarificationQuestion[]` and `onSubmit: (answers: QuestionnaireAnswer[]) => void`
- Shows one question at a time with forward/back navigation
- Question types: `text` (textarea), `single` (radio pills), `multi` (checkbox pills)
- Submit button: "Continue →" (disabled until all answered)
- After submit: card collapses to a summary of answers (read-only), `onSubmit` fires

---

### STEP 7 — Plan Preview Card
**What to build:**
- `src/components/ui/agent-chat/cards/plan-preview-card.tsx`
- Receives `plan: DeployAgentPlan`
- Card sections:
  - Agent identity row: emoji + name + persona line (soft italic)
  - "Will watch & act on" — behaviour list with trigger icons (same as deploy modal)
  - "Starting knowledge" — initial memories list (if any)
- Below card: two CTA buttons (not inside the card):
  - `[Build Agent]` — pink/gradient, triggers build
  - `[Let me adjust something]` — ghost/text button
- `onBuild: () => void` and `onAdjust: () => void` props
- Once either button is clicked, both disable (can't double-submit)

---

### STEP 8 — Build Progress Card
**What to build:**
- `src/components/ui/agent-chat/cards/build-progress-card.tsx`
- Receives `stages: BuildStage[]` (each has `label`, `status: 'pending' | 'running' | 'done' | 'error'`)
- Visual: vertical list of stages, each row:
  - Pending: dim `○` circle
  - Running: spinning `Loader2` icon (pink)
  - Done: filled `✓` circle (emerald)
  - Error: `✗` (red)
- The card grows as new stages arrive (append-only)
- Smooth: each stage row fades in with a small delay

---

### STEP 9 — Completion Card
**What to build:**
- `src/components/ui/agent-chat/cards/completion-card.tsx`
- Receives `agentId: string` and `summary: string`
- Shows:
  - A success animation (simple scale + fade in, no framer-motion required)
  - Agent emoji + name from summary
  - `"Your agent is live and watching."`
  - Big `[View Agent →]` button → `router.push('/agents/[agentId]')`

---

### STEP 10 — Full Chat Page (`/agents/new` rewrite)
**What to build:**
- `src/components/ui/agent-chat/index.tsx` — the main chat orchestrator component
  - `messages: ChatMessage[]` state
  - `isStreaming: boolean` state
  - `pipelinePhase: 'initial' | 'awaiting_integrations' | 'awaiting_questionnaire' | 'awaiting_confirmation' | 'building' | 'complete'` state
  - `pendingPlan: DeployAgentPlan | null` state (set when plan card arrives, needed if user adjusts)
  - `sendMessage(text: string, options?)` — appends user bubble, calls `/api/agents/chat`, reads SSE stream, dispatches events to message list
  - `resumeAfterIntegrations()` — re-calls `/api/agents/chat` with `messages` + "integrations are now connected" signal
  - `submitAnswers(answers)` — re-calls `/api/agents/chat` with `messages + answers`
  - `startBuild()` — calls `/api/agents/build`, reads SSE, updates build progress card
  - `startAdjust()` — appends "What would you like to change?" assistant message, sets phase back to `initial`
  - SSE reader: `const reader = response.body.getReader()` → parse `data: {...}` lines → dispatch to state

- `src/app/agents/new/page.tsx` — REPLACE entirely:
  - Renders sidebar + `BuilderTabs` + `AgentChatBuilder`
  - Passes `agentId` once complete (for Agent tab routing)

---

### STEP 11 — Builder Tabs
**What to build:**
- `src/components/ui/agent-chat/builder-tabs.tsx`
- Two tab pills: `Builder` and `Agent`
- Props: `activeTab: 'builder' | 'agent'`, `onTabChange`, `agentId: string | null`
- `Agent` tab:
  - Grayed out + `cursor-not-allowed` when `agentId === null`
  - Active and clickable once `agentId` is set → `router.push('/agents/[agentId]')`
- `Builder` tab is always active
- Style: subtle pill tabs, matches rest of app (no heavy borders, clean)
- Position: top of the main content area, just below `BlankHeader`

---

### STEP 12 — Integration Resume After OAuth
**What to build:**
- In `IntegrationCheckCard`: when user clicks "Connect Gmail", they're redirected to the OAuth flow and eventually land back on `/agents/new?resume=1&service=google-gmail`
- In `AgentChatBuilder` (or the page):
  - On mount, check `searchParams` for `resume` param
  - If present, wait for the `IntegrationCheckCard` to confirm the service is now connected
  - The card's 3-second polling loop (`/api/integrations/status`) handles detection automatically
  - When all connected: card calls `onAllConnected` → `AgentChatBuilder` calls `resumeAfterIntegrations()`
  - No special resume logic needed beyond the polling — the card handles it

**Also update:** The existing OAuth callback URL for integrations to redirect back to `/agents/new?resume=1` when the referrer was `/agents/new`. Check `src/app/api/integrations/` callback routes and pass through `redirectTo` state in the OAuth URL.

---

### STEP 13 — Conversational Adjustment Loop
**What to build:**
- In `AgentChatBuilder.startAdjust()`:
  - Append assistant message: `"Of course. What would you like to change?"`
  - Set `pipelinePhase = 'initial'` but keep `pendingPlan` set
- When user sends their next message (phase is `initial` with `pendingPlan` set):
  - Call `/api/agents/chat` with `{ messages, pendingPlan }` (backend skips intent/integrations, goes straight to plan regeneration using the previous plan as context)
  - Stream new plan card
  - Confirmation buttons re-appear
  - Loop continues until user clicks "Build Agent"

- Backend change in `chat` route:
  - If `pendingPlan` is in the request body, use it as base context for regeneration:
    - Prompt: `"The user had this plan: [plan]. They want to change: [latest user message]. Return an updated plan."`
    - Skip intent analysis, integration check, questionnaire
    - Directly stream updated plan card + confirmation

---

### STEP 14 — Polish: Error States, Loading, & Welcome Message
**What to build:**
- On page load: auto-append one assistant message (no API call):
  - `"Hey! I'm your agent builder. Tell me what you'd like your agent to do — be as detailed or vague as you like."` + a few example chips below (clickable, fill the input)
- On SSE error: append assistant message `"Something went wrong. Want to try again?"` with a Retry button
- `chat-input.tsx`: show a subtle `"AI is thinking…"` label above input while streaming
- Auto-focus the input on page load
- `message-list.tsx`: when messages appear, animate each in with a `translate-y-2 → 0` + `opacity-0 → 1` transition (CSS only, no framer-motion)

---

## Order of Implementation

| Step | Description | Depends on |
|------|-------------|------------|
| 1 | Streaming utilities & types | — |
| 2 | Chat pipeline API (`/api/agents/chat`) | 1 |
| 3 | Build API (`/api/agents/build`) | 1 |
| 4 | Base chat components (bubbles, input, message list) | — |
| 5 | Integration Check Card | 1, 4 |
| 6 | Questionnaire Card | 4 |
| 7 | Plan Preview Card | 4 |
| 8 | Build Progress Card | 4 |
| 9 | Completion Card | 4 |
| 10 | Full chat page + orchestrator | 2, 3, 4, 5, 6, 7, 8, 9 |
| 11 | Builder Tabs | 4 |
| 12 | Integration resume (OAuth return) | 5, 10 |
| 13 | Adjustment loop | 2, 10 |
| 14 | Polish & welcome message | 10 |

Recommended implementation order: **1 → 2 → 3 → 4 → 7 → 8 → 9 → 10 → 11 → 5 → 6 → 12 → 13 → 14**

(Build the happy path first: types → API → core UI → plan card → build card → completion → page → tabs. Then add integration check, questionnaire, and edge cases.)

---

## Reused Existing Code

| Existing | Where Used |
|----------|-----------|
| `src/lib/ai/pipeline/steps/intent-analysis.ts` | Step 2 — `analyzeIntent` in chat pipeline |
| `src/lib/ai/types.ts` — `ClarificationQuestion`, `QuestionnaireAnswer` | Step 6 questionnaire card |
| `src/lib/agents/planner.ts` — `planAgent` | Step 2 — plan generation |
| `src/lib/agents/behaviour-manager.ts` — `createAgentBehaviours` | Step 3 — build API |
| `src/lib/agents/memory.ts` — `writeMemory` | Step 3 — build API |
| `src/app/api/integrations/status` | Step 5 — polling for connected integrations |
| `DeployAgentPlan`, `AgentBehaviourPlan` types | Throughout |
| `CollapsibleSidebar`, `BlankHeader` | Page layout |
| `cn` utility | All components |

---

## What Does NOT Change

- `/agents` list page — unchanged
- `/agents/[id]` detail page — unchanged  
- All API routes (`/api/agents`, `/api/agents/[id]`, etc.) — unchanged
- Agent runtime, Inngest functions, Cloudflare worker — unchanged
- `agent-card.tsx`, `agent-activity-feed.tsx`, `agent-memory-panel.tsx` — unchanged
