/**
 * Node Matching Step
 * Step 2 of the workflow generation pipeline
 * Matches workflow requirements to library nodes or identifies custom node needs
 */

import OpenAI from 'openai';
import { nodeRegistry } from '@/lib/nodes';
import type { PipelineContext, IntentAnalysis, WorkflowPlan, StepResult } from '../types';

/**
 * Builds a categorized, scannable summary of available library nodes.
 * Groups nodes by category so the AI can quickly find relevant nodes
 * instead of scanning a flat list of 60+ items.
 */
function buildCategorizedNodeList(
  availableNodes: PipelineContext['availableNodes']
): string {
  // Define display categories and their node IDs (in priority order)
  const categories: { heading: string; description: string; nodeIds: string[] }[] = [
    {
      heading: 'AI & ML NODES (USE THESE for any AI/content generation, summarisation, or analysis task)',
      description: 'These nodes handle ALL AI-powered tasks. Always check this section first before creating a custom AI node.',
      nodeIds: [
        'generate-ai-content', 'generate-summary-with-ai', 'classify-text',
        'extract-entities', 'sentiment-analysis', 'translate-text',
        'generate-image', 'image-recognition', 'text-to-speech', 'speech-to-text',
      ],
    },
    {
      heading: 'COMMUNICATION NODES',
      description: 'Pre-built nodes for sending messages and notifications.',
      nodeIds: [
        'send-email-gmail', 'send-email', 'post-to-slack-channel', 'send-discord-message',
        'send-sms-via-twilio', 'post-to-x',
      ],
    },
    {
      heading: 'DATA & INTEGRATION NODES',
      description: 'Nodes for creating, updating, and querying external services.',
      nodeIds: [
        'create-notion-page', 'create-trello-card', 'update-airtable-record',
        'create-calendar-event', 'upload-file-to-google-drive',
        'http-request', 'database-query', 'insert-database-record',
        'update-database-record', 'delete-database-record',
      ],
    },
    {
      heading: 'DATA TRANSFORM NODES',
      description: 'Nodes for formatting, filtering, and manipulating data.',
      nodeIds: [
        'map-transform-data', 'sort-data', 'group-data', 'aggregate-data',
        'find-replace-text', 'encode-decode', 'date-time-manipulation',
        'math-operations', 'string-operations', 'array-operations', 'object-operations',
        'delay-execution',
      ],
    },
    {
      heading: 'FILE NODES',
      description: 'Nodes for reading, writing, and converting files.',
      nodeIds: [
        'read-file', 'write-file', 'delete-file', 'list-files',
        'download-file', 'upload-file', 'convert-file-format',
        'compress-decompress', 'extract-archive', 'image-manipulation',
      ],
    },
    {
      heading: 'TRIGGER NODES',
      description: 'Nodes that start a workflow.',
      nodeIds: [
        'scheduled-time-trigger', 'webhook-trigger', 'manual-trigger',
        'new-form-submission', 'new-email-received', 'new-row-in-google-sheet',
        'new-message-in-slack', 'new-discord-message', 'new-github-issue',
        'file-uploaded', 'wait-for-webhook',
      ],
    },
    {
      heading: 'UTILITY NODES',
      description: 'Logging, comments, and workflow control.',
      nodeIds: [
        'log-print', 'comment-note', 'stop-workflow',
      ],
    },
  ];

  // Build a lookup set of available node IDs for fast checking
  const availableIds = new Set(availableNodes.map((n) => n.id));

  const sections: string[] = [];

  for (const cat of categories) {
    const nodesInCategory = cat.nodeIds.filter((id) => availableIds.has(id));
    if (nodesInCategory.length === 0) continue;

    let section = `\n═══ ${cat.heading} ═══\n${cat.description}\n`;

    for (const nodeId of nodesInCategory) {
      const nodeDef = nodeRegistry[nodeId];
      if (!nodeDef) continue;

      const configFields = Object.keys(nodeDef.configSchema)
        .map((key) => {
          const field = nodeDef.configSchema[key];
          return `      - ${key} (${field.type}${field.required ? ', required' : ''}): ${field.description}`;
        })
        .join('\n');

      section += `
  ${nodeDef.type.toUpperCase()}: ${nodeDef.name} (ID: ${nodeId})
    Description: ${nodeDef.description}
    Category: ${nodeDef.category}
    Configuration:
${configFields || '      (none)'}
`;
    }

    sections.push(section);
  }

  // Append any remaining nodes not in predefined categories
  const categorizedIds = new Set(categories.flatMap((c) => c.nodeIds));
  const uncategorized = availableNodes.filter((n) => !categorizedIds.has(n.id));

  if (uncategorized.length > 0) {
    let section = `\n═══ OTHER NODES ═══\n`;
    for (const node of uncategorized) {
      const nodeDef = nodeRegistry[node.id];
      const configFields = nodeDef
        ? Object.keys(nodeDef.configSchema)
            .map((key) => {
              const field = nodeDef.configSchema[key];
              return `      - ${key} (${field.type}${field.required ? ', required' : ''}): ${field.description}`;
            })
            .join('\n')
        : '      (none)';

      section += `
  ${node.type.toUpperCase()}: ${node.name} (ID: ${node.id})
    Description: ${node.description}
    Category: ${node.category}
    Configuration:
${configFields}
`;
    }
    sections.push(section);
  }

  return sections.join('\n');
}

/**
 * Matches workflow requirements to library nodes or identifies custom node needs
 * Uses gpt-4o for accurate node matching (this is the most critical decision step)
 */
export async function matchNodes(
  context: PipelineContext & { intent: IntentAnalysis }
): Promise<StepResult<WorkflowPlan>> {
  try {
    // Ensure intent is provided
    if (!context.intent) {
      return {
        success: false,
        error: 'Intent analysis is required for node matching',
      };
    }

    const intent = context.intent;

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build categorized, scannable node list instead of flat dump
    const categorizedNodeList = buildCategorizedNodeList(context.availableNodes);

    // System prompt focused on node matching and planning
    const systemPrompt = `You are a workflow planner. Your task is to match workflow requirements to available library nodes and plan the workflow structure.

INPUT:
You receive an intent analysis with:
- Goal: What the workflow should accomplish
- Triggers: What will start the workflow
- Actions: What the workflow should do
- Transforms: Any data transformations needed
- Custom Requirements: Functionality not covered by library nodes

YOUR JOB:
1. Match each requirement to the best available library node
2. If no library node covers a requirement, create a custom node for it — this is correct and expected
3. Plan logical connections between nodes (trigger → transform → action flow)
4. Map data flow between nodes (what data passes from one node to another)

DECISION RULES:
1. **Check library first**: Does a library ACTION/TRANSFORM node match the requirement? → Use library node
2. **If no library match exists for an ACTION/TRANSFORM**: Create a CUSTOM_GENERATED node — this is correct and expected for actions
3. **NEVER misuse a trigger as an action**: Trigger nodes DETECT events, they do NOT perform actions (see TRIGGER vs ACTION rule below)
4. **CUSTOM_GENERATED nodes are NEVER allowed as triggers**: If the user's trigger is not in the built-in list, ALWAYS use "webhook-trigger". There are NO exceptions to this rule.

════════════════════════════════════════════════════
⚠️ ABSOLUTE RULES: TRIGGER NODES (NEVER VIOLATE EITHER OF THESE)
════════════════════════════════════════════════════
RULE 1 — CUSTOM_GENERATED IS NEVER A TRIGGER:
CUSTOM_GENERATED nodes can ONLY be used for actions and transforms — NEVER as the starting/trigger node of a workflow.
If the user wants a trigger that has no built-in node (Stripe, Shopify, Airtable, Twitter, HubSpot, etc.), you MUST use "webhook-trigger".
Using CUSTOM_GENERATED as a trigger would silently break the workflow — it will never fire. This is not allowed under any circumstance.

RULE 2 — TRIGGERS ARE NOT ACTIONS:
Trigger nodes can ONLY appear as the FIRST node in a workflow. They DETECT/LISTEN for events. They NEVER perform actions.

WRONG: Using "new-row-in-google-sheet" to ADD a row to Google Sheets — this node only DETECTS new rows, it cannot write data
WRONG: Using "new-github-issue" to CREATE a GitHub issue — this node only DETECTS new issues
WRONG: Using "new-email-received" to SEND an email — this node only DETECTS incoming emails
WRONG: Using "file-uploaded" to UPLOAD a file — this node only DETECTS uploads
WRONG: Using "new-form-submission" to SUBMIT a form — this node only DETECTS submissions

If the user wants to WRITE to Google Sheets → create a custom "Add Row to Google Sheet" action node
If the user wants to CREATE a GitHub issue → create a custom "Create GitHub Issue" action node
If the user wants to UPLOAD a file → use "upload-file-to-google-drive" or create a custom node

A trigger node in the libraryNodes array MUST have role: "trigger" and appear at the start of the flow.
No trigger node may appear with role: "action" or "transform" — EVER.

════════════════════════════════════════════════════
COMMON TRIGGER PATTERN MAPPINGS:
════════════════════════════════════════════════════
- "user signs up", "new user", "user registration", "when someone signs up" → Use "webhook-trigger"
- "new order", "order created", "payment received" → Use "webhook-trigger" or "payment-completed"
- "form submitted", "new form response" → Use "new-form-submission" (Google Forms)
- "scheduled", "every day", "every night", "at a time", "every weekday", "once per day" → Use "scheduled-time-trigger"
- "new email", "email received", "incoming email" → Use "new-email-received" (Gmail)
- "new row added", "sheet updated" → Use "new-row-in-google-sheet"
- "new message in Slack" → Use "new-message-in-slack"
- "new issue created" → Use "new-github-issue"
- "file uploaded", "recording uploaded", "document uploaded" → Use "file-uploaded"
- "new tweet", "tweet posted", "post on X", "X/Twitter event" → Use "webhook-trigger" (there is NO X/Twitter trigger node — use webhook)
- "Shopify event", "inventory change", "product update" → Use "webhook-trigger" (there is NO Shopify trigger — use webhook)
- "Stripe event", "subscription change", "invoice created" → Use "webhook-trigger" (use webhook for Stripe events)
- Generic webhook/API trigger needs → Use "webhook-trigger"
- Manual execution, testing → Use "manual-trigger"

REMEMBER: Webhook-trigger is the universal trigger for external events. When a user mentions any external event (user signup, order created, tweet posted, Shopify inventory, Stripe payment, API call, etc.), use webhook-trigger unless a more specific library trigger exists.

════════════════════════════════════════════════════
COMMON ACTION/TRANSFORM PATTERN MAPPINGS (CRITICAL — READ CAREFULLY):
════════════════════════════════════════════════════
AI & Content Generation:
- "generate content", "AI-generated", "use ChatGPT", "use GPT", "use OpenAI to write/generate/create", "AI-powered content", "write with AI", "generate an email", "personalised response", "AI-generated welcome email" → Use "generate-ai-content"
- "summarize", "summary", "summarise", "recap", "digest", "compile summary", "daily summary", "format summary" → Use "generate-summary-with-ai"
- "classify", "categorize", "sort into categories", "content moderation" → Use "classify-text"
- "extract entities", "extract names/dates/places", "NER", "extract action items", "extract key points" → Use "extract-entities"
- "sentiment", "analyze sentiment", "positive/negative", "sentiment score" → Use "sentiment-analysis"
- "translate", "convert language" → Use "translate-text"
- "generate image", "create image", "AI image" → Use "generate-image"
- "text to speech", "read aloud", "convert to audio" → Use "text-to-speech"
- "speech to text", "transcribe", "transcription" → Use "speech-to-text"

Communication:
- "send email", "email notification", "email alert", "reply to email", "auto-reply", "send a Gmail" → Use "send-email-gmail" BY DEFAULT (user just needs their Google account connected — no extra setup)
  - Exception: If the user explicitly mentions "SendGrid" → Use "send-email" instead
  - Exception: If the workflow has no Google/Gmail connection at all AND the user has SendGrid set up → Use "send-email"
  - The "send-email-gmail" node also supports replying to an existing thread (set replyToThread: "yes" and threadId)
- "post to Slack", "Slack message", "Slack alert", "Slack notification", "notify team on Slack" → Use "post-to-slack-channel"
- "send Discord message", "Discord notification" → Use "send-discord-message"
- "send SMS", "text message" → Use "send-sms-via-twilio"
- "post to X", "post tweet", "tweet", "post on Twitter" → Use "post-to-x"

Data & Integrations:
- "add to Notion", "create Notion page", "Notion CRM", "update Notion" → Use "create-notion-page"
- "HTTP request", "call API", "fetch from API", "REST call", "pull data from API" → Use "http-request"
- "update database", "update record", "update CRM fields", "update CRM" → Use "update-database-record"
- "insert record", "add to database", "create record" → Use "insert-database-record"
- "query database", "read from database", "fetch records" → Use "database-query"
- "create calendar event", "schedule meeting" → Use "create-calendar-event"
- "create Trello card", "add Trello task" → Use "create-trello-card"
- "update Airtable" → Use "update-airtable-record"

Data Transforms:
- "delay", "wait", "pause" → Use "delay-execution"
- "math", "calculate", "sum", "average", "score", "numeric calculation" → Use "math-operations"
- "format text", "find and replace", "string manipulation" → Use "string-operations" or "find-replace-text"
- "sort data", "order by" → Use "sort-data"
- "filter data", "filter rows" → Use "array-operations" or "map-transform-data"

════════════════════════════════════════════════════
SIMPLICITY RULE (CRITICAL):
════════════════════════════════════════════════════
- Prefer FEWER nodes that do MORE over many specialized nodes.
- The "generate-ai-content" node can handle summarisation, classification, extraction, formatting, scoring, content creation, and analysis — ALL in a single prompt. Use it instead of chaining multiple specialised nodes.
- Only use specialised AI nodes (classify-text, extract-entities, sentiment-analysis) when the user specifically needs structured, programmatic output that must be parsed by a downstream node.
- Target: Most workflows should have 3-5 nodes. Rarely more than 7.
- If you can accomplish a task with one "generate-ai-content" node and a well-crafted prompt, DO THAT instead of creating a custom node or chaining 3+ specialised nodes.
- Example: "Summarise key objections, extract action items, and score deal likelihood" → ONE "generate-ai-content" node with a prompt that covers all three tasks, NOT three separate nodes.

════════════════════════════════════════════════════
WHEN TO CREATE CUSTOM NODES (THIS IS CORRECT AND EXPECTED):
════════════════════════════════════════════════════
Custom nodes are the RIGHT solution when no library action/transform node exists. Common examples:
✅ "Add Row to Google Sheet" — no library action for writing to Sheets (only a trigger for detecting new rows)
✅ "Update Google Sheet Row" — no library action for updating Sheets data
✅ "Read Google Sheet Data" — no library action for reading Sheets data
✅ "Create GitHub Issue" — no library action for creating issues (only a trigger for detecting new issues)
✅ "Add Contact to Mailchimp" — no library node for Mailchimp
✅ "Pause Facebook Ads" — no library node for Facebook Ads API
✅ "Fetch Bitcoin Price" — no library node for CoinGecko API
✅ Any third-party service integration not in the library (HubSpot, Shopify actions, Zendesk, etc.)

These custom nodes will use existing backend integrations (like Google Sheets API, GitHub API) — the platform supports this. Do NOT avoid creating them.

════════════════════════════════════════════════════
ANTI-PATTERNS (NEVER DO THESE):
════════════════════════════════════════════════════
❌ Using a TRIGGER node as an ACTION (e.g., using "new-row-in-google-sheet" to WRITE a row — that's a trigger, not an action. Create a custom "Add Row to Google Sheet" node instead)
❌ Creating a custom "Generate AI Content" or "Analyze with ChatGPT" node → ALWAYS use "generate-ai-content" from the library
❌ Creating a custom "Summarize Text" node → ALWAYS use "generate-summary-with-ai" from the library
❌ Creating a custom "Send Email" node → ALWAYS use "send-email-gmail" (or "send-email" if SendGrid is explicitly required)
❌ Creating a custom "Post to Slack" node → ALWAYS use "post-to-slack-channel" from the library
❌ Creating a custom "Post to X/Twitter" node → ALWAYS use "post-to-x" from the library
❌ Using a communication node for data FORMATTING → Use "generate-ai-content" instead
❌ Creating a custom trigger node when "webhook-trigger" would work
❌ Having TWO trigger nodes in one workflow — only one trigger per workflow

════════════════════════════════════════════════════
AVAILABLE LIBRARY NODES (grouped by category):
════════════════════════════════════════════════════
${categorizedNodeList}

OUTPUT STRUCTURE:
Return a JSON object with these exact fields:
- libraryNodes: Array of { id: string, role: string, reason: string }
  * id: Exact node ID from library (must match exactly)
  * role: Role in workflow ("trigger", "transform", or "action")
  * reason: Why this node was selected
  
- customNodes: Array of { name: string, type: string, requirements: string, reason: string }
  * name: Suggested name for the custom node
  * type: "trigger", "action", or "transform"
  * requirements: Detailed description of what this node must do
  * reason: Why a library node cannot be used (be specific — name which library nodes you checked and why they don't work)
  * Only include if truly needed (when library nodes don't cover requirement)

- connections: Array of { from: string, to: string, reason: string }
  * from: Source node ID (or custom node name if not yet created)
  * to: Target node ID (or custom node name if not yet created)
  * reason: Why these nodes are connected
  * Plan the logical flow: trigger → transforms → actions

- dataFlow: Array of { source: string, target: string, field: string }
  * source: Source node ID/name
  * target: Target node ID/name
  * field: Field name being passed (e.g., "data", "text", "email", "row")
  * Map how data flows between nodes

IMPORTANT RULES:
1. **TRIGGER vs ACTION**: NEVER use a trigger node as an action. A trigger node can ONLY be role: "trigger" at the start. If the user needs to WRITE/CREATE/UPDATE something and no action node exists, create a custom node.
2. **Library first for AI, communication, and covered actions**: Use library nodes for AI tasks, emails, Slack, Notion, etc.
3. **Custom nodes for uncovered actions**: If no library ACTION node exists for what the user wants (e.g., write to Google Sheets, create GitHub issue), create a custom node — this is correct.
4. Node IDs must match library node IDs EXACTLY (case-sensitive)
5. Connections should follow logical flow: trigger → transforms → actions (sequential)
6. For custom nodes, use descriptive names (will be converted to IDs later)
7. If intent.isModification is true, consider existing nodes that should be kept
8. For ANY AI content generation, summarisation, or analysis → use "generate-ai-content" or "generate-summary-with-ai"
9. A workflow should have exactly ONE trigger node. Never include two triggers.
10. Custom nodes that interact with third-party APIs (Google Sheets, GitHub, etc.) are fully supported by the platform — do not hesitate to create them when needed.

EXAMPLES:

Example 1 (Simple — all library nodes):
Intent: { goal: "Send email when new row in sheet", triggers: ["new-row-in-google-sheet"], actions: ["send-email"], transforms: [], customRequirements: [] }
Output:
{
  "libraryNodes": [
    { "id": "new-row-in-google-sheet", "role": "trigger", "reason": "Matches trigger requirement for new row in Google Sheet" },
    { "id": "send-email-gmail", "role": "action", "reason": "Sends email via Gmail — preferred over send-email (SendGrid) as it requires no extra account setup" }
  ],
  "customNodes": [],
  "connections": [
    { "from": "new-row-in-google-sheet", "to": "send-email-gmail", "reason": "New row data should trigger email notification" }
  ],
  "dataFlow": [
    { "source": "new-row-in-google-sheet", "target": "send-email-gmail", "field": "row" }
  ]
}

Example 2 (Custom node justified — CoinGecko API):
Intent: { goal: "Fetch Bitcoin price and send to Slack", triggers: ["scheduled"], actions: ["send-slack-message"], transforms: [], customRequirements: ["Fetch Bitcoin price from CoinGecko API"] }
Output:
{
  "libraryNodes": [
    { "id": "scheduled-time-trigger", "role": "trigger", "reason": "Matches scheduled trigger requirement" },
    { "id": "post-to-slack-channel", "role": "action", "reason": "Matches action requirement to send message to Slack" }
  ],
  "customNodes": [
    { "name": "Fetch Bitcoin Price", "type": "transform", "requirements": "Fetch current Bitcoin price from CoinGecko API (https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd) and return price data", "reason": "Checked all library nodes: http-request could work but requires manual URL config. CoinGecko API is a specific third-party API not covered by any library node." }
  ],
  "connections": [
    { "from": "scheduled-time-trigger", "to": "Fetch Bitcoin Price", "reason": "Scheduled trigger should fetch price" },
    { "from": "Fetch Bitcoin Price", "to": "post-to-slack-channel", "reason": "Price data should be sent to Slack" }
  ],
  "dataFlow": [
    { "source": "scheduled-time-trigger", "target": "Fetch Bitcoin Price", "field": "trigger" },
    { "source": "Fetch Bitcoin Price", "target": "post-to-slack-channel", "field": "price" }
  ]
}

Example 3 (AI content — uses library generate-ai-content, NOT custom):
Intent: { goal: "When a user signs up, send them an AI-generated welcome email, add to Notion CRM, post Slack alert", triggers: ["user-signup"], actions: ["send-email", "create-notion-page", "post-to-slack"], transforms: ["generate-ai-content"], customRequirements: [] }
Output:
{
  "libraryNodes": [
    { "id": "webhook-trigger", "role": "trigger", "reason": "User signup events come via webhook from the app" },
    { "id": "generate-ai-content", "role": "transform", "reason": "Generates the AI-powered welcome email content — using library node, NOT a custom node" },
    { "id": "send-email-gmail", "role": "action", "reason": "Sends the AI-generated welcome email via Gmail — preferred default for sending emails" },
    { "id": "create-notion-page", "role": "action", "reason": "Adds user to Notion CRM" },
    { "id": "post-to-slack-channel", "role": "action", "reason": "Posts Slack alert about new signup" }
  ],
  "customNodes": [],
  "connections": [
    { "from": "webhook-trigger", "to": "generate-ai-content", "reason": "Signup data feeds AI content generation" },
    { "from": "generate-ai-content", "to": "send-email-gmail", "reason": "AI-generated content used as email body" },
    { "from": "webhook-trigger", "to": "create-notion-page", "reason": "Signup data used to create Notion page" },
    { "from": "webhook-trigger", "to": "post-to-slack-channel", "reason": "Signup data used for Slack notification" }
  ],
  "dataFlow": [
    { "source": "webhook-trigger", "target": "generate-ai-content", "field": "data" },
    { "source": "generate-ai-content", "target": "send-email-gmail", "field": "content" },
    { "source": "webhook-trigger", "target": "create-notion-page", "field": "data" },
    { "source": "webhook-trigger", "target": "post-to-slack-channel", "field": "data" }
  ]
}

Example 4 (Simplicity — one AI node instead of many):
Intent: { goal: "When a sales call recording is uploaded, summarise key objections, extract action items, score deal likelihood, update CRM", triggers: ["file-uploaded"], actions: ["update-database-record"], transforms: ["summarise", "extract", "score"], customRequirements: [] }
Output:
{
  "libraryNodes": [
    { "id": "file-uploaded", "role": "trigger", "reason": "Triggers when recording is uploaded" },
    { "id": "generate-ai-content", "role": "transform", "reason": "Single AI node handles ALL analysis: summarise objections, extract action items, AND score deal likelihood — no need for separate nodes" },
    { "id": "update-database-record", "role": "action", "reason": "Updates CRM with the AI analysis results" }
  ],
  "customNodes": [],
  "connections": [
    { "from": "file-uploaded", "to": "generate-ai-content", "reason": "Recording data feeds AI analysis" },
    { "from": "generate-ai-content", "to": "update-database-record", "reason": "AI results update CRM fields" }
  ],
  "dataFlow": [
    { "source": "file-uploaded", "target": "generate-ai-content", "field": "data" },
    { "source": "generate-ai-content", "target": "update-database-record", "field": "content" }
  ]
}

Example 5 (Custom action node — Google Sheets write, NO library action exists):
Intent: { goal: "When a new Google Form submission is received, add the signup data as a new row in Google Sheets", triggers: ["new-form-submission"], actions: [], transforms: [], customRequirements: ["Add a new row to Google Sheets spreadsheet using Google Sheets API"] }
Output:
{
  "libraryNodes": [
    { "id": "new-form-submission", "role": "trigger", "reason": "Detects new Google Form submissions" }
  ],
  "customNodes": [
    { "name": "Add Row to Google Sheet", "type": "action", "requirements": "Add a new row to a Google Sheets spreadsheet using the Google Sheets API. Accept spreadsheet ID, sheet name, and row data as inputs. Use the Google Sheets API v4 to append a row.", "reason": "No library ACTION node exists for writing to Google Sheets. The 'new-row-in-google-sheet' node is a TRIGGER that detects new rows — it cannot write data." }
  ],
  "connections": [
    { "from": "new-form-submission", "to": "Add Row to Google Sheet", "reason": "Form submission data should be written to Google Sheets" }
  ],
  "dataFlow": [
    { "source": "new-form-submission", "target": "Add Row to Google Sheet", "field": "data" }
  ]
}
NOTE: "new-row-in-google-sheet" is a TRIGGER — it detects new rows. It CANNOT be used to add/write rows. A custom action node is the correct solution here.

Return ONLY valid JSON, no markdown, no explanations outside JSON.`;

    // Build user message with intent analysis
    const intentJson = JSON.stringify(intent, null, 2);
    const userMessage = `Intent Analysis:
${intentJson}

Please match these requirements to library nodes and create a workflow plan. Remember: check ALL library nodes (especially the AI & ML section) before creating any custom node.`;

    // Call OpenAI API — using gpt-4o for this critical decision step
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.2, // Low temperature for deterministic, accurate node selection
      max_tokens: 2000,
    });

    // Extract response and token usage
    const responseContent = completion.choices[0]?.message?.content;
    const tokenUsage = {
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
    };

    if (!responseContent) {
      return {
        success: false,
        error: 'No response from OpenAI',
        tokenUsage,
      };
    }

    // Parse JSON response
    let workflowPlan: WorkflowPlan;
    try {
      workflowPlan = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Error parsing node matching response:', parseError);
      console.error('Response content:', responseContent);
      return {
        success: false,
        error: `Invalid JSON response from AI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        tokenUsage,
      };
    }

    // Validate required fields
    if (
      !Array.isArray(workflowPlan.libraryNodes) ||
      !Array.isArray(workflowPlan.customNodes) ||
      !Array.isArray(workflowPlan.connections) ||
      !Array.isArray(workflowPlan.dataFlow)
    ) {
      return {
        success: false,
        error: 'Invalid workflow plan structure: missing required arrays (libraryNodes, customNodes, connections, dataFlow)',
        tokenUsage,
      };
    }

    // Validate library node IDs (warn if not found, but don't fail)
    const invalidNodeIds: string[] = [];
    for (const libNode of workflowPlan.libraryNodes) {
      if (libNode.id && !nodeRegistry[libNode.id]) {
        invalidNodeIds.push(libNode.id);
      }
    }

    if (invalidNodeIds.length > 0) {
      console.warn('[Node Matching] Some library node IDs not found in registry:', invalidNodeIds);
      // Don't fail, just warn - the node might be added later or this is acceptable
    }

    // Post-hoc safety check 1: Catch trigger nodes being used as actions
    const triggerNodeIds = new Set([
      'scheduled-time-trigger', 'webhook-trigger', 'manual-trigger',
      'new-form-submission', 'new-email-received', 'new-row-in-google-sheet',
      'new-message-in-slack', 'new-discord-message', 'new-github-issue',
      'file-uploaded', 'wait-for-webhook',
    ]);

    const misusedTriggers = workflowPlan.libraryNodes.filter(
      (node) => triggerNodeIds.has(node.id) && node.role !== 'trigger'
    );

    if (misusedTriggers.length > 0) {
      console.error(
        '[Node Matching] ❌ CRITICAL: Trigger nodes used as actions/transforms — removing them:',
        misusedTriggers.map((n) => `${n.id} (role: ${n.role})`)
      );
      // Remove misused trigger nodes from libraryNodes
      workflowPlan.libraryNodes = workflowPlan.libraryNodes.filter(
        (node) => !(triggerNodeIds.has(node.id) && node.role !== 'trigger')
      );
      // Also remove any connections involving the misused trigger node IDs
      const misusedIds = new Set(misusedTriggers.map((n) => n.id));
      workflowPlan.connections = workflowPlan.connections.filter(
        (conn) => {
          const fromIsMisused = misusedIds.has(conn.from);
          const toIsMisused = misusedIds.has(conn.to);
          if (fromIsMisused || toIsMisused) {
            console.warn(`[Node Matching] Removing connection: ${conn.from} → ${conn.to} (involves misused trigger)`);
          }
          return !fromIsMisused && !toIsMisused;
        }
      );
    }

    // Post-hoc safety check 2: Ensure only one trigger node exists
    const triggerNodes = workflowPlan.libraryNodes.filter((n) => n.role === 'trigger');
    if (triggerNodes.length > 1) {
      console.warn(
        '[Node Matching] ⚠️ Multiple trigger nodes detected — keeping only the first:',
        triggerNodes.map((n) => n.id)
      );
      const firstTriggerId = triggerNodes[0].id;
      workflowPlan.libraryNodes = workflowPlan.libraryNodes.filter(
        (n) => n.role !== 'trigger' || n.id === firstTriggerId
      );
    }

    // Post-hoc safety check 3: flag custom nodes that look like library node duplicates
    const suspiciousCustomNodes = workflowPlan.customNodes.filter((cn) => {
      const nameLower = cn.name.toLowerCase();
      const reqLower = cn.requirements.toLowerCase();
      return (
        nameLower.includes('generate ai') || nameLower.includes('openai') ||
        nameLower.includes('chatgpt') || nameLower.includes('gpt') ||
        nameLower.includes('ai content') || nameLower.includes('summarize') ||
        nameLower.includes('summarise') || nameLower.includes('send email') ||
        nameLower.includes('slack') || nameLower.includes('post to x') ||
        reqLower.includes('openai') || reqLower.includes('chatgpt')
      );
    });

    if (suspiciousCustomNodes.length > 0) {
      console.warn(
        '[Node Matching] ⚠️ Suspicious custom nodes that may duplicate library nodes:',
        suspiciousCustomNodes.map((n) => n.name)
      );
    }

    // Ensure arrays are initialized (some might be empty)
    workflowPlan.libraryNodes = workflowPlan.libraryNodes || [];
    workflowPlan.customNodes = workflowPlan.customNodes || [];
    workflowPlan.connections = workflowPlan.connections || [];
    workflowPlan.dataFlow = workflowPlan.dataFlow || [];

    // Return successful result
    return {
      success: true,
      data: workflowPlan,
      tokenUsage,
    };
  } catch (error: any) {
    console.error('Error in node matching step:', error);
    return {
      success: false,
      error: error.message || 'Failed to match nodes',
    };
  }
}
