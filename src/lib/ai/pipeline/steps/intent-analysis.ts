/**
 * Intent Analysis Step
 * Step 1 of the workflow generation pipeline
 * Analyzes user prompt to extract workflow requirements and intent
 */

import OpenAI from 'openai';
import type { PipelineContext, IntentAnalysis, StepResult } from '../types';

/**
 * Analyzes user prompt to extract workflow automation intent and requirements
 * Uses gpt-4o-mini for cost-effective intent parsing
 */
export async function analyzeIntent(
  context: PipelineContext
): Promise<StepResult<IntentAnalysis>> {
  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build context about existing workflow if this is a modification
    let existingContextStr = '';
    if (context.existingNodes && context.existingNodes.length > 0) {
      existingContextStr = `

EXISTING WORKFLOW CONTEXT:
The user has an existing workflow with ${context.existingNodes.length} node(s).
This appears to be a modification request rather than creating a new workflow from scratch.
Current nodes: ${context.existingNodes.map((n) => n.id).join(', ')}
`;
    }

    // System prompt focused solely on intent analysis
    const systemPrompt = `You are a workflow intent analyzer. Your task is to analyze user prompts and extract workflow automation requirements.

YOUR JOB:
1. Understand what the user wants to automate
2. Identify what will trigger the workflow
3. Identify what actions should be performed
4. Identify any data transformations needed
5. Identify any custom functionality not covered by standard library nodes
6. Determine if this is modifying an existing workflow or creating a new one

════════════════════════════════════════════════════
AVAILABLE TRIGGER NODES (use these exact IDs in the triggers array):
════════════════════════════════════════════════════
- "scheduled-time-trigger" — cron-based scheduled triggers ("every day", "every weekday at 9am", "nightly", "once per hour")
- "webhook-trigger" — generic webhook endpoint (use for ANY external event: signups, orders, API calls, third-party service events)
- "new-form-submission" — Google Forms submissions
- "new-email-received" — new Gmail messages ("when I get an email", "email received", "incoming email")
- "new-row-in-google-sheet" — new rows in Google Sheets
- "new-message-in-slack" — new Slack messages
- "new-discord-message" — new Discord messages
- "new-github-issue" — new GitHub issues
- "file-uploaded" — file uploaded to Google Drive ("recording uploaded", "document uploaded", "file added")
- "manual-trigger" — manual execution ("run manually", "on demand")

TRIGGER GAPS (no library trigger exists — use "webhook-trigger" instead):
- X/Twitter events (new tweet, new reply, new mention, "when I post a tweet") → use "webhook-trigger"
- Shopify events (inventory change, new order, product out of stock) → use "webhook-trigger"
- Stripe events (payment, subscription, invoice) → use "webhook-trigger"
- Any CRM events (new lead, deal closed, contact updated) → use "webhook-trigger"
- Any third-party service event not listed above → use "webhook-trigger"

⚠️ CRITICAL: Custom-generated ("CUSTOM_GENERATED") nodes must NEVER be used as triggers. A custom trigger node would silently never fire — the system has no way to poll or listen to it. When in doubt about a trigger, always use "webhook-trigger".

════════════════════════════════════════════════════
KEY ACTION/TRANSFORM NODES (use these exact IDs in actions/transforms arrays):
════════════════════════════════════════════════════
AI & Content:
- "generate-ai-content" — AI content generation with custom prompt (use for ANY AI-generated content: emails, analysis, scoring, formatting, personalised responses)
- "generate-summary-with-ai" — AI-powered text summarization ("summarise", "digest", "recap")
- "classify-text" — classify text into categories
- "extract-entities" — extract names, dates, places, action items from text
- "sentiment-analysis" — analyze text sentiment (positive/negative/neutral)
- "translate-text" — translate between languages
- "generate-image" — generate images with AI
- "text-to-speech" — convert text to audio
- "speech-to-text" — convert audio/recordings to text ("transcribe")

Communication:
- "send-email" — send email via SendGrid
- "post-to-slack-channel" — post message to Slack
- "send-discord-message" — send Discord message
- "send-sms-via-twilio" — send SMS
- "post-to-x" — post to X/Twitter

Data & Integrations:
- "create-notion-page" — create Notion page (CRM entries, database records)
- "http-request" — make HTTP requests to any API (Stripe API, third-party APIs, REST calls)
- "update-database-record" — update existing database/CRM records
- "insert-database-record" — insert new database records
- "database-query" — query/read from database
- "create-calendar-event" — create Google Calendar events
- "create-trello-card" — create Trello cards
- "update-airtable-record" — update Airtable records

Data Transforms:
- "math-operations" — calculations (sum, average, score, count)
- "string-operations" — string manipulation
- "delay-execution" — add delays/waits
- "sort-data", "group-data", "aggregate-data" — data processing

════════════════════════════════════════════════════
CRITICAL: TRIGGER NODES vs ACTION NODES — DO NOT CONFUSE
════════════════════════════════════════════════════
Trigger nodes ONLY detect/listen for events. They DO NOT perform actions.
- "new-row-in-google-sheet" DETECTS when a new row appears. It does NOT add/write rows.
- "new-form-submission" DETECTS when a form is submitted. It does NOT submit forms.
- "new-email-received" DETECTS when an email arrives. It does NOT send emails.
- "new-github-issue" DETECTS when an issue is created. It does NOT create issues.
- "file-uploaded" DETECTS when a file is uploaded. It does NOT upload files.

If the user wants to PERFORM an action (write a row, submit a form, create an issue), you need the corresponding ACTION node, NOT the trigger node.

════════════════════════════════════════════════════
ACTION GAPS (no library ACTION node exists — requires a custom node):
════════════════════════════════════════════════════
These are common actions that DO NOT have a pre-built library node. They MUST be described in customRequirements so the pipeline can generate a custom node for them:
- "Add/write/append row to Google Sheets" → NO library action node exists. Put in customRequirements: "Add a new row to Google Sheets spreadsheet using Google Sheets API"
- "Update a row in Google Sheets" → NO library action node. Put in customRequirements: "Update an existing row in Google Sheets"
- "Read data from Google Sheets" → NO library action node. Put in customRequirements: "Read data from Google Sheets spreadsheet"
- "Create/update GitHub issue" → NO library action node. Put in customRequirements.
- "Create/update HubSpot contact" → NO library action node. Put in customRequirements.
- "Add contact to Mailchimp" → NO library action node. Put in customRequirements.
- "Pause/enable Facebook/Google Ads" → NO library action node. Put in customRequirements.

When the user's request involves one of these actions, you MUST include it in customRequirements. This is correct and expected — custom nodes are the right solution when no library action node covers the functionality.

════════════════════════════════════════════════════
RULES FOR triggers ARRAY:
════════════════════════════════════════════════════
- Use exact library node IDs whenever possible (e.g., "scheduled-time-trigger" not just "scheduled")
- If no library trigger exists for the user's event, use "webhook-trigger" and describe the specific event in the goal field
- NEVER invent trigger IDs that don't exist in the list above
- NEVER use a trigger node to perform an action (e.g., do NOT use "new-row-in-google-sheet" to ADD a row — that's a trigger, not an action)

════════════════════════════════════════════════════
RULES FOR actions AND transforms ARRAYS:
════════════════════════════════════════════════════
- Use exact library node IDs whenever possible (e.g., "generate-ai-content" not "generate content with AI")
- For ANY AI-generated content (emails, summaries, analysis, scoring, formatting, personalised responses), use "generate-ai-content" in transforms
- For summarization tasks specifically, use "generate-summary-with-ai" in transforms
- If the user needs an action that has no library node (see ACTION GAPS above), do NOT force a trigger node or unrelated node — instead put the action in customRequirements

════════════════════════════════════════════════════
RULES FOR customRequirements ARRAY:
════════════════════════════════════════════════════
DO put in customRequirements:
- Actions that have no library node (see ACTION GAPS above), e.g., "Add row to Google Sheets", "Create GitHub issue"
- Specific third-party API integrations with no library equivalent (e.g., "Fetch Bitcoin price from CoinGecko API", "Pause Facebook Ads via API")
- Any functionality not covered by the library action/transform nodes listed above

DO NOT put in customRequirements:
- AI content generation, summarization, classification, entity extraction, sentiment analysis — these ARE covered by library nodes
- Email sending, Slack posting, Notion page creation, X/Twitter posting, HTTP requests — these ARE covered by library nodes
- "use ChatGPT/GPT/OpenAI to..." — the "generate-ai-content" library node handles this

OUTPUT STRUCTURE:
Return a JSON object with these exact fields:
- goal: string - A brief, clear description of what the workflow should accomplish (1-2 sentences)
- triggers: string[] - Array of trigger node IDs (use exact IDs from the list above)
- actions: string[] - Array of action node IDs needed (use exact IDs from the list above)
- transforms: string[] - Array of transform node IDs needed (use exact IDs from the list above). Empty array if none needed.
- customRequirements: string[] - Array of custom functionality descriptions that CANNOT be met by ANY library node listed above. Empty array in most cases.
- isModification: boolean - true if user wants to modify existing workflow, false if creating new
- existingContext: object (optional) - Only include if isModification is true. Structure: { nodes: [], edges: [] }

EXAMPLES:

Example 1 (Simple — all library nodes):
User: "Create a workflow that sends me an email when a new row is added to my Google Sheet"
Output:
{
  "goal": "Send email notification when new row is added to Google Sheet",
  "triggers": ["new-row-in-google-sheet"],
  "actions": ["send-email"],
  "transforms": [],
  "customRequirements": [],
  "isModification": false
}

Example 2 (Custom requirement justified — specific third-party API):
User: "I want to fetch Bitcoin price from CoinGecko and send it to me via Slack"
Output:
{
  "goal": "Fetch Bitcoin price from CoinGecko API and send notification via Slack",
  "triggers": ["scheduled-time-trigger"],
  "actions": ["post-to-slack-channel"],
  "transforms": [],
  "customRequirements": ["Fetch Bitcoin price from CoinGecko API (no library node covers this specific API)"],
  "isModification": false
}

Example 3 (AI content — uses library node ID, NOT customRequirements):
User: "When a user signs up, send them an AI generated welcome email, add to Notion CRM, and post a Slack alert"
Output:
{
  "goal": "When a user signs up via webhook, generate an AI-powered welcome email, add the user to Notion CRM, and post a Slack alert to the team",
  "triggers": ["webhook-trigger"],
  "actions": ["send-email", "create-notion-page", "post-to-slack-channel"],
  "transforms": ["generate-ai-content"],
  "customRequirements": [],
  "isModification": false
}

Example 4 (Trigger gap — use webhook-trigger for unsupported service):
User: "When I post a tweet, generate 3 LinkedIn versions and schedule them"
Output:
{
  "goal": "When a new tweet is posted (via webhook), generate 3 LinkedIn post versions using AI and schedule them via LinkedIn API",
  "triggers": ["webhook-trigger"],
  "actions": ["http-request"],
  "transforms": ["generate-ai-content"],
  "customRequirements": [],
  "isModification": false
}

Example 5 (Summarization with AI — uses library node, NOT customRequirements):
User: "Every weekday at 9am, pull yesterday's Stripe revenue and post a short summary in Slack"
Output:
{
  "goal": "Every weekday at 9am, fetch yesterday's Stripe revenue via API and post an AI-generated summary to a Slack channel",
  "triggers": ["scheduled-time-trigger"],
  "actions": ["http-request", "post-to-slack-channel"],
  "transforms": ["generate-summary-with-ai"],
  "customRequirements": [],
  "isModification": false
}

Example 6 (Action gap — custom node needed for Google Sheets write):
User: "When I get a new signup in Google Forms, add them to a new row in my Google Sheets"
Output:
{
  "goal": "When a new Google Form submission is received, add the signup data as a new row in Google Sheets",
  "triggers": ["new-form-submission"],
  "actions": [],
  "transforms": [],
  "customRequirements": ["Add a new row to Google Sheets spreadsheet using Google Sheets API"],
  "isModification": false
}
NOTE: "new-row-in-google-sheet" is a TRIGGER that detects new rows — it does NOT write/add rows. Since there is no library action node for writing to Google Sheets, this goes in customRequirements.

Example 7 (Modification):
User: "Add a Slack notification to my existing workflow"
Output (if existingContext provided):
{
  "goal": "Add Slack notification to existing workflow",
  "triggers": [],
  "actions": ["post-to-slack-channel"],
  "transforms": [],
  "customRequirements": [],
  "isModification": true,
  "existingContext": { "nodes": [...], "edges": [...] }
}

Return ONLY valid JSON, no markdown, no explanations outside JSON.`;

    // Build user message with prompt and context
    const userMessage = context.userPrompt + existingContextStr;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
      temperature: 0.2, // Low temperature for deterministic output
      max_tokens: 1000,
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
    let intentAnalysis: IntentAnalysis;
    try {
      intentAnalysis = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Error parsing intent analysis response:', parseError);
      console.error('Response content:', responseContent);
      return {
        success: false,
        error: `Invalid JSON response from AI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        tokenUsage,
      };
    }

    // Validate required fields
    if (!intentAnalysis.goal || !Array.isArray(intentAnalysis.triggers) || !Array.isArray(intentAnalysis.actions)) {
      return {
        success: false,
        error: 'Invalid intent analysis structure: missing required fields (goal, triggers, actions)',
        tokenUsage,
      };
    }

    // Ensure arrays exist (some might be missing if empty)
    intentAnalysis.transforms = intentAnalysis.transforms || [];
    intentAnalysis.customRequirements = intentAnalysis.customRequirements || [];
    intentAnalysis.isModification = intentAnalysis.isModification || false;

    // Post-hoc safety: strip customRequirements that should be library nodes
    const libraryNodeKeywords = [
      'openai', 'chatgpt', 'gpt', 'ai content', 'ai-generated', 'generate content',
      'summarize', 'summarise', 'summary', 'classify', 'sentiment', 'translate',
      'extract entities', 'send email', 'slack', 'notion', 'discord', 'sms',
      'post to x', 'tweet', 'text to speech', 'speech to text',
    ];

    const strippedRequirements = intentAnalysis.customRequirements.filter((req) => {
      const reqLower = req.toLowerCase();
      const shouldStrip = libraryNodeKeywords.some((kw) => reqLower.includes(kw));
      if (shouldStrip) {
        console.warn(`[Intent Analysis] Stripped customRequirement that matches a library node: "${req}"`);
      }
      return !shouldStrip;
    });

    if (strippedRequirements.length !== intentAnalysis.customRequirements.length) {
      console.log(
        `[Intent Analysis] Stripped ${intentAnalysis.customRequirements.length - strippedRequirements.length} customRequirements that are covered by library nodes`
      );
      intentAnalysis.customRequirements = strippedRequirements;
    }

    // Return successful result
    return {
      success: true,
      data: intentAnalysis,
      tokenUsage,
    };
  } catch (error: any) {
    console.error('Error in intent analysis step:', error);
    return {
      success: false,
      error: error.message || 'Failed to analyze intent',
    };
  }
}
