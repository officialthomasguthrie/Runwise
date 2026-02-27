# Runwise Agents — Full Build Plan

> Cloud-hosted, zero-setup personal AI agents with persistent memory and real integrations.
> Built on top of existing Runwise infrastructure: Supabase + Inngest + existing nodes + OpenAI.

---

## Overview

Agents is a new product surface alongside Workflows. Users describe what they want in plain English, click Deploy, and their agent is live — no config files, no CLI, no servers.

**Core difference from Workflows:**
- Workflows = deterministic (A → B → C, fixed steps)
- Agents = autonomous (LLM decides what to do at runtime based on context and memory)

---

## Architecture Summary

```
User deploys agent
       ↓
Supabase: agents table (identity, persona, instructions, status)
Supabase: agent_behaviours table (each trigger/schedule the agent responds to)
Supabase: agent_memory table (what the agent knows and remembers)
Supabase: agent_activity table (log of every action taken)
       ↓
Cloudflare Worker OR Inngest scheduled trigger detects event
       ↓
Inngest: agent/run event fires
       ↓
Agentic loop (new Inngest function):
  1. Load agent identity + memory from Supabase
  2. Load triggering event data
  3. Call GPT-4o with: persona + memory + event + available tools
  4. Execute chosen tools (reuse existing node execute functions)
  5. LLM reflects, decides if more actions needed
  6. Write new memories
  7. Log activity
       ↓
Results visible in Agent Activity Feed in UI
```

---

## Database Schema (Supabase)

### Step 0 — Run this SQL in Supabase before any code is written

```sql
-- Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  persona TEXT,                    -- e.g. "Professional, concise, always signs off as Aria"
  instructions TEXT NOT NULL,      -- The full natural language instructions from the user
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deploying', 'error')),
  avatar_emoji TEXT DEFAULT '🤖',
  model TEXT DEFAULT 'gpt-4o',
  max_steps INTEGER DEFAULT 10,    -- Safety limit on how many tool calls per wake-up
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent behaviours (triggers/schedules that wake the agent up)
CREATE TABLE agent_behaviours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  behaviour_type TEXT NOT NULL CHECK (behaviour_type IN ('polling', 'schedule', 'webhook', 'heartbeat')),
  trigger_type TEXT,               -- e.g. 'new-email-received', 'new-message-in-slack'
  schedule_cron TEXT,              -- for scheduled behaviours
  config JSONB DEFAULT '{}',       -- trigger config (channelId, label filter, etc.)
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent memory
CREATE TABLE agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('fact', 'preference', 'contact', 'event', 'instruction')),
  content TEXT NOT NULL,
  source TEXT,                     -- 'agent' (self-written) | 'user' (manually added)
  importance INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent activity log
CREATE TABLE agent_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id TEXT,                     -- Inngest run ID for tracing
  behaviour_id UUID REFERENCES agent_behaviours(id),
  trigger_summary TEXT,            -- "New email from john@acme.com"
  actions_taken JSONB DEFAULT '[]',-- Array of {tool, params, result, timestamp}
  memories_created JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'skipped')),
  error_message TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_behaviours ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own agents" ON agents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own behaviours" ON agent_behaviours FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own memory" ON agent_memory FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own activity" ON agent_activity FOR ALL USING (auth.uid() = user_id);

-- Admin access for Inngest (service role bypasses RLS)
```

---

## File Structure to Create

```
src/
├── app/
│   ├── agents/
│   │   ├── page.tsx                          ← Agents list page (/agents)
│   │   └── [id]/
│   │       └── page.tsx                      ← Individual agent detail page
│   └── api/
│       └── agents/
│           ├── route.ts                      ← GET (list), POST (create)
│           ├── [id]/
│           │   ├── route.ts                  ← GET, PATCH, DELETE
│           │   ├── activity/route.ts         ← GET activity log
│           │   ├── memory/route.ts           ← GET, POST, DELETE memory
│           │   └── pause/route.ts            ← POST to pause/resume
│           └── deploy/route.ts               ← POST: AI interprets description → creates agent + behaviours
├── lib/
│   └── agents/
│       ├── types.ts                          ← Agent, AgentBehaviour, AgentMemory, AgentActivity types
│       ├── runtime.ts                        ← The agentic loop (core logic)
│       ├── tools.ts                          ← Tool definitions for GPT-4o function calling
│       ├── memory.ts                         ← Read/write/search agent memory
│       ├── planner.ts                        ← AI interprets user description → behaviours plan
│       └── behaviour-manager.ts             ← Create/update polling_triggers for agent behaviours
├── inngest/
│   └── functions.ts                          ← Add: agentRun function
└── components/
    └── ui/
        ├── agent-card.tsx                    ← Card component for agents list
        ├── agent-deploy-modal.tsx            ← 3-step deploy flow
        ├── agent-activity-feed.tsx           ← Activity log component
        └── agent-memory-panel.tsx            ← Memory view/edit component
```

---

## Build Steps (in order)

---

### STEP 1 — Database + Types
**Prompt to give:**
```
Create the Agents feature foundation. 

1. Create `src/lib/agents/types.ts` with TypeScript interfaces for:
   - Agent (matches agents Supabase table)
   - AgentBehaviour (matches agent_behaviours table)
   - AgentMemory (matches agent_memory table)
   - AgentActivity (matches agent_activity table)
   - AgentTool (for GPT-4o function calling definitions)
   - AgentRunContext (data passed into the agentic loop)
   - DeployAgentRequest (user's description + optional name/emoji)
   - DeployAgentPlan (AI's interpreted plan with behaviours and initial memories)

2. Create `src/lib/agents/memory.ts` with functions:
   - getAgentMemory(agentId, userId, limit?) → AgentMemory[]
   - writeMemory(agentId, userId, content, type, importance?) → AgentMemory
   - deleteMemory(memoryId, userId) → void
   - formatMemoryForPrompt(memories: AgentMemory[]) → string (formats into readable block for LLM context)

Use the existing Supabase admin client pattern from src/lib/supabase-admin.ts.
```

---

### STEP 2 — Agent Tools (GPT-4o Function Calling)
**Prompt to give:**
```
Create `src/lib/agents/tools.ts`.

This file defines the tools available to the agent's GPT-4o loop using OpenAI function calling format.

Each tool maps to an existing node execute function in src/lib/nodes/registry.ts or a direct integration call.

Create tool definitions (OpenAI ChatCompletionTool format) and a executeAgentTool() function for:

1. send_email_gmail — send an email via Gmail (params: to, subject, body, replyToThread?)
2. read_emails — fetch recent emails from Gmail (params: label?, maxResults?)
3. send_slack_message — post to a Slack channel (params: channel, text)
4. send_discord_message — send to a Discord channel (params: channelId, content)
5. create_notion_page — create a Notion page (params: title, content, databaseId?)
6. update_google_sheet — append a row to Google Sheets (params: spreadsheetId, sheetName, values[])
7. search_google_sheet — read rows from Google Sheets (params: spreadsheetId, sheetName)
8. create_calendar_event — create a Google Calendar event (params: title, start, end, description?)
9. http_request — make an HTTP request (params: url, method, headers?, body?)
10. remember — write something to agent memory (params: content, type, importance?)
11. recall — search agent memory (params: query)
12. send_notification_to_user — send the user a message via their preferred channel (params: message)
13. do_nothing — explicitly do nothing this trigger (no params, used when agent decides no action needed)

The executeAgentTool() function takes (toolName, toolParams, context: AgentRunContext) and routes to the correct implementation, reusing existing node execute functions where possible.

Import getUserIntegration from src/lib/integrations/service.ts for auth.
```

---

### STEP 3 — Agentic Loop Runtime
**Prompt to give:**
```
Create `src/lib/agents/runtime.ts` — the core agentic loop.

This is the main function that runs when an agent wakes up.

Implement runAgentLoop(context: AgentRunContext): Promise<AgentRunResult>

The loop:
1. Load agent from Supabase (agents table)
2. Load recent agent memory (last 50 entries, formatted as text)
3. Build the system prompt: agent persona + instructions + memory + available tools list
4. Build the user message: description of the triggering event
5. Call GPT-4o with function calling enabled (all tools from tools.ts)
6. If the model calls a tool: execute it via executeAgentTool(), append result to messages, loop
7. If the model calls do_nothing: stop
8. If the model returns a text response with no tool call: stop (response is logged)
9. Enforce max_steps limit (default 10) to prevent infinite loops
10. Write activity log to agent_activity table
11. Return AgentRunResult { success, actionsCount, memoriesCreated, tokensUsed, error? }

Use the existing OPENAI_API_KEY env var.
Use GPT-4o model ("gpt-4o").
Use the existing createAdminClient() from src/lib/supabase-admin.ts.

System prompt template:
---
You are {agent.name}, a personal AI assistant.

PERSONA:
{agent.persona}

YOUR INSTRUCTIONS:
{agent.instructions}

WHAT YOU KNOW (MEMORY):
{formattedMemory}

CURRENT DATE/TIME: {isoTimestamp}

You have access to tools to take actions. Use them to fulfil your instructions.
When you are done, call do_nothing if no action was needed, or simply stop responding.
Never take more than {agent.max_steps} actions in a single run.
---
```

---

### STEP 4 — Agent Planner (AI interprets user description)
**Prompt to give:**
```
Create `src/lib/agents/planner.ts`.

This file takes the user's plain English description of what they want their agent to do,
and uses GPT-4o to produce a structured DeployAgentPlan.

Implement planAgent(description: string, userIntegrations: string[]): Promise<DeployAgentPlan>

The plan includes:
- name: suggested agent name (e.g. "Aria", "Scout", "Briefing Bot")
- persona: short personality description
- instructions: refined, detailed instructions for the agent
- avatarEmoji: a fitting emoji
- behaviours: array of AgentBehaviourPlan {
    behaviourType: 'polling' | 'schedule' | 'heartbeat'
    triggerType?: string  (e.g. 'new-email-received', 'new-message-in-slack')
    scheduleCron?: string (e.g. '0 9 * * 1-5' for 9am weekdays)
    config: {}
    description: string  (human readable: "Watch Gmail inbox")
  }
- initialMemories: string[] (facts to pre-load into memory e.g. "User wants professional tone")

Available trigger types for behaviours:
- new-email-received (Gmail)
- new-message-in-slack
- new-discord-message
- new-row-in-google-sheet
- new-github-issue
- file-uploaded (Google Drive)
- new-form-submission (Google Forms)
- heartbeat (proactive check-in, use scheduleCron)

Only include behaviours for integrations in userIntegrations[].

Use GPT-4o with JSON response format.
Use OPENAI_API_KEY.
```

---

### STEP 5 — Inngest Agent Run Function
**Prompt to give:**
```
Add an Inngest function to src/inngest/functions.ts called agentRun.

It listens to the event "agent/run" with data:
{
  agentId: string
  userId: string
  behaviourId: string
  triggerType: string
  triggerData: any   (the event that woke the agent up)
}

The function:
1. Uses step.run() to call runAgentLoop() from src/lib/agents/runtime.ts
2. Passes the full AgentRunContext built from the event data
3. Logs success/failure
4. Uses Inngest's built-in retry (retries: 1, no aggressive retrying for agents)

Also add a scheduled Inngest function "agent/heartbeat" that:
- Fires every 5 minutes
- Queries Supabase for agent_behaviours where behaviour_type = 'heartbeat' and enabled = true
  and (last_run_at IS NULL OR last_run_at < now() - interval '1 minute' * poll_interval_minutes)
- Fires agent/run events for each due heartbeat behaviour

Register both functions in src/app/api/inngest/route.ts alongside existing functions.
```

---

### STEP 6 — Behaviour Manager
**Prompt to give:**
```
Create `src/lib/agents/behaviour-manager.ts`.

This bridges agent behaviours with the existing polling_triggers system.

Implement:

1. createAgentBehaviours(agentId, userId, behaviours: AgentBehaviourPlan[]) → void
   - For polling behaviours: insert into agent_behaviours AND create a polling_trigger row
     (reuse createPollingTrigger from src/lib/workflows/polling-triggers.ts)
     The polling trigger config must include { agentId, isAgent: true } so the worker knows
     to fire agent/run instead of workflow/execute
   - For schedule/heartbeat behaviours: insert into agent_behaviours only
     (Inngest heartbeat function handles these)

2. disableAgentBehaviours(agentId, userId) → void
   - Set all agent_behaviours enabled = false
   - Disable all polling_triggers for this agent

3. enableAgentBehaviours(agentId, userId) → void
   - Set all agent_behaviours enabled = true  
   - Re-enable polling_triggers

Note: The Cloudflare Worker needs a small update to detect isAgent:true in the trigger config
and fire "agent/run" instead of "workflow/execute". Add this check to the worker.
```

---

### STEP 7 — API Routes
**Prompt to give:**
```
Create the following Next.js API routes for the Agents feature.
Use the existing patterns from src/app/api/workflow/ routes.
All routes require auth via createClient() from src/lib/supabase-server.ts.

1. GET/POST src/app/api/agents/route.ts
   - GET: return user's agents with latest activity summary
   - POST (deploy): accepts DeployAgentRequest, calls planAgent(), creates agent + behaviours

2. GET/PATCH/DELETE src/app/api/agents/[id]/route.ts
   - GET: return agent with behaviours and memory count
   - PATCH: update name, persona, instructions, status
   - DELETE: delete agent + all behaviours + all memory + disable polling triggers

3. GET src/app/api/agents/[id]/activity/route.ts
   - Return paginated activity log (limit 50, cursor-based)

4. GET/POST/DELETE src/app/api/agents/[id]/memory/route.ts
   - GET: return all memories for this agent
   - POST: manually add a memory (source: 'user')
   - DELETE ?memoryId=xxx: delete a specific memory

5. POST src/app/api/agents/[id]/pause/route.ts
   - Toggle agent between active/paused
   - Calls enableAgentBehaviours or disableAgentBehaviours accordingly
```

---

### STEP 8 — Cloudflare Worker Update
**Prompt to give:**
```
Update cloudflare-worker/src/index.ts.

In the executeTrigger() result handling section, add a check:
If the poll result config contains { isAgent: true, agentId: string },
fire an "agent/run" Inngest event instead of "workflow/execute".

The agent/run event data:
{
  agentId: config.agentId,
  userId: workflowData.user_id,
  behaviourId: config.behaviourId,
  triggerType: trigger.trigger_type,
  triggerData: {
    items: pollResult.newData,
    polledAt: new Date().toISOString()
  }
}

After updating, run: cd cloudflare-worker && npx wrangler deploy
```

---

### STEP 9 — Agents List Page UI
**Prompt to give:**
```
Create src/app/agents/page.tsx — the main Agents page.

Design requirements:
- Same sidebar/header layout as src/app/workflows/page.tsx (reuse CollapsibleSidebar, BlankHeader)
- Hero section: "Your Agents" title + "Deploy New Agent" button (prominent, colorful)
- Empty state: illustration + "Deploy your first agent in 30 seconds" copy
- Agent grid: 2-3 columns of AgentCard components
- Each AgentCard shows:
  - Agent emoji avatar (large, in a colored circle)
  - Agent name
  - Status badge (Active / Paused / Deploying)
  - Short description of what it does
  - Last action time ("2 minutes ago")
  - Action count ("47 actions taken")
  - Quick actions: View, Pause/Resume, Delete
- Clicking a card navigates to /agents/[id]
- Loading skeleton state while fetching

Create src/components/ui/agent-card.tsx as the card component.

Fetch agents from GET /api/agents.
Use the same dark glassmorphism UI style as the rest of the app.
Use Lucide React icons only.
Use framer-motion for card entrance animations.
```

---

### STEP 10 — Deploy Agent Modal
**Prompt to give:**
```
Create src/components/ui/agent-deploy-modal.tsx — the 3-step agent creation flow.

Step 1 — "What should your agent do?"
- Large textarea (not a small input — this should feel generous)
- Placeholder examples:
  "Monitor my Gmail and reply to sales inquiries automatically. Log everything to my Google Sheet and send me a daily summary on Slack at 9am."
- "Examples" button showing 4-5 pre-written prompts users can click to use
- Next button

Step 2 — "Generating your agent..." (automatic, no user input)
- Animated loading state while POST /api/agents/deploy runs the AI planner
- Shows streaming text of what the AI is planning:
  "Analysing your request..."
  "Planning behaviours..."
  "Setting up memory..."
- When done, transition to Step 3

Step 3 — "Meet [AgentName]" — Review & Deploy
- Shows the AI's plan:
  - Agent name + emoji (user can click to edit)
  - Persona line
  - List of behaviours it will have (e.g. "📧 Watch Gmail inbox", "📅 Daily briefing at 9am")
  - Initial memories it will start with
- Warning if any required integration is not connected
- "Deploy Agent" button
- "Start over" link

On deploy: POST /api/agents with the plan → redirect to /agents/[id]

Use Shadcn Dialog/Sheet component.
Framer-motion for step transitions.
```

---

### STEP 11 — Agent Detail Page
**Prompt to give:**
```
Create src/app/agents/[id]/page.tsx — the individual agent page.

Layout:
- Left panel (60%): Activity Feed
- Right panel (40%): Memory Panel + Agent Settings

Activity Feed (src/components/ui/agent-activity-feed.tsx):
- Real-time feel (poll /api/agents/[id]/activity every 30 seconds)
- Each activity entry shows:
  - Timestamp (relative: "2 minutes ago")
  - Trigger icon + summary: "📧 New email from john@acme.com"
  - Expandable list of actions taken:
    "🧠 Classified as: Sales inquiry"
    "✉️ Replied with personalized response"  
    "📝 Logged to Sales Pipeline sheet"
    "🧠 Remembered: John from Acme interested in enterprise"
  - Status indicator (success/error/skipped)
- Empty state: "Your agent hasn't done anything yet. It's watching..."
- Live indicator dot (pulsing green = active, grey = paused)

Memory Panel (src/components/ui/agent-memory-panel.tsx):
- List of all memories grouped by type (Facts, Preferences, Contacts, Events)
- Each memory: icon + content + importance dots + delete button
- "+ Add memory" button → inline text input
- Memory count in header

Agent Settings (collapsible section):
- Name, emoji (editable inline)
- Status toggle (Active / Paused) 
- Instructions textarea (full instructions, editable)
- "Update Agent" save button
- "Delete Agent" danger button

Header:
- Back to agents link
- Agent name + emoji
- Status badge
- Total actions count
- "Pause/Resume" quick action button
```

---

### STEP 12 — Navigation Update
**Prompt to give:**
```
Add "Agents" to the navigation in src/components/ui/collapsible-sidebar.tsx.

Add a nav item:
- Icon: Bot (Lucide)
- Label: "Agents"
- href: /agents
- Position: between "Workflows" and "Runs" (or wherever makes most sense in the current nav)

Also add a badge that says "NEW" or "BETA" next to the Agents label to draw attention to the new feature.
```

---

## Testing Checklist (After Full Build)

After each step is complete, test:

### Step 0
- [ ] All 4 tables exist in Supabase with correct columns
- [ ] RLS policies are active

### Steps 1-5 (Backend)
- [ ] Can call planAgent() with a description and get back a valid plan
- [ ] Can call runAgentLoop() with a mock context without errors
- [ ] Memory read/write works

### Steps 6-8 (Infrastructure)
- [ ] Deploying an agent creates rows in agents + agent_behaviours + polling_triggers
- [ ] Worker correctly fires agent/run for agent triggers
- [ ] Inngest receives and processes agent/run events

### Steps 9-11 (UI)
- [ ] /agents page loads with empty state for new users
- [ ] Deploy modal: all 3 steps work, agent is created on submit
- [ ] Agent detail page shows activity and memory
- [ ] Pause/resume works
- [ ] Delete cleans up everything

---

## End-to-End Test (The Demo)

After everything is built, test this scenario:

1. Connect Gmail in integrations
2. Go to /agents → Deploy New Agent
3. Type: *"Monitor my Gmail inbox. When I get an email from someone new, reply professionally introducing yourself as my assistant and asking how you can help. Remember their name and what they're interested in. Also send me a Slack message summarising each new email."*
4. Deploy
5. Send yourself a test email from a different address
6. Wait up to 2 minutes for the polling trigger to fire
7. Verify:
   - Inngest shows an agent/run execution
   - Activity feed shows the email was detected, a reply was sent, a Slack message was sent, and a memory was created
   - Memory panel shows the contact was remembered

---

## Notes

- **Each step is independent** — you can build and test them in order
- **Steps 1-8 are pure backend** — no UI needed until Step 9
- **The Cloudflare Worker update in Step 8 requires `wrangler deploy`** — don't forget this
- **Step 0 (database schema) must be done first** in Supabase before any code runs
- **The planner AI call (Step 4) costs ~$0.02 per deploy** — acceptable
- **The agentic loop (Step 3) is the most complex piece** — budget extra time for debugging tool calling reliability
