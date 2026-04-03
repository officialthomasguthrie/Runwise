/**
 * Agent Planner — interprets a plain English description into a structured DeployAgentPlan.
 *
 * Called once at deploy time. Uses GPT-4o with JSON response format.
 */

import OpenAI from 'openai';
import type { OpenAIUsageSink } from '@/lib/ai/openai-usage';
import type { DeployAgentPlan, AgentBehaviourPlan, AgentEmailSendingMode } from './types';
import { getToolsSpec, getTriggersSpec } from './capabilities-spec';
import { mergeScheduleConfigForPersist } from './schedule-cron-ui';

// ============================================================================
// TRIGGER CATALOGUE
// Each entry describes a polling trigger the planner can assign to a behaviour.
// ============================================================================

interface TriggerDef {
  triggerType: string;
  label: string;
  requiredIntegration: string;
  defaultConfig: Record<string, any>;
}

const TRIGGER_CATALOGUE: TriggerDef[] = [
  {
    triggerType: 'new-email-received',
    label: 'Watch Gmail inbox for new emails',
    requiredIntegration: 'google-gmail',
    defaultConfig: {},
  },
  {
    triggerType: 'new-message-in-slack',
    label: 'Watch a Slack channel for new messages',
    requiredIntegration: 'slack',
    defaultConfig: {},
  },
  {
    triggerType: 'new-discord-message',
    label: 'Watch a Discord channel for new messages',
    requiredIntegration: 'discord',
    defaultConfig: {},
  },
  {
    triggerType: 'new-row-in-google-sheet',
    label: 'Watch a Google Sheet for new rows',
    requiredIntegration: 'google-sheets',
    defaultConfig: {},
  },
  {
    triggerType: 'new-github-issue',
    label: 'Watch a GitHub repo for new issues',
    requiredIntegration: 'github',
    defaultConfig: {},
  },
  {
    triggerType: 'file-uploaded',
    label: 'Watch Google Drive for new file uploads',
    requiredIntegration: 'google-drive',
    defaultConfig: {},
  },
  {
    triggerType: 'new-form-submission',
    label: 'Watch Google Forms for new submissions',
    requiredIntegration: 'google-forms',
    defaultConfig: {},
  },
  {
    triggerType: 'new-calendar-event',
    label: 'Watch Google Calendar for new events',
    requiredIntegration: 'google-calendar',
    defaultConfig: {},
  },
  {
    triggerType: 'new-notion-page',
    label: 'Watch a Notion database for new pages',
    requiredIntegration: 'notion',
    defaultConfig: {},
  },
  {
    triggerType: 'new-airtable-record',
    label: 'Watch an Airtable base for new records',
    requiredIntegration: 'airtable',
    defaultConfig: {},
  },
  {
    triggerType: 'new-trello-card',
    label: 'Watch a Trello board for new cards',
    requiredIntegration: 'trello',
    defaultConfig: {},
  },
];

// ============================================================================
// MAIN EXPORT
// ============================================================================

export async function planAgent(
  description: string,
  userIntegrations: string[],
  usageSink?: OpenAIUsageSink
): Promise<DeployAgentPlan> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const isIntegrationConnected = (requiredIntegration: string): boolean =>
    userIntegrations.some(
      (ui) =>
        ui === requiredIntegration ||
        // Also accept generic 'google' matching any google-* service.
        (requiredIntegration.startsWith('google-') && ui === 'google') ||
        (ui.startsWith('google-') && requiredIntegration === 'google')
    );

  // Always expose the full polling trigger catalogue to the model.
  // Connection status only indicates whether deploy needs the user to connect.
  const pollingTriggersText = TRIGGER_CATALOGUE
    .map((t) => {
      const connected = isIntegrationConnected(t.requiredIntegration);
      return `- ${t.triggerType} (requires: ${t.requiredIntegration}, connected: ${connected ? 'yes' : 'no'}) — ${t.label}`;
    })
    .join('\n');

  const systemPrompt = buildSystemPrompt(pollingTriggersText);
  const userMessage = `USER'S AGENT DESCRIPTION:\n"${description}"`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  usageSink?.addFromChatCompletion(response);

  const rawJson = response.choices[0]?.message?.content ?? '{}';

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Planner returned invalid JSON');
  }

  return validateAndNormalisePlan(parsed);
}

/**
 * Regenerates an agent plan based on user feedback.
 * Used when the user clicks "Let me adjust something" — we have the current plan
 * and their requested changes, and produce an updated plan.
 */
export async function regenerateAgentPlan(
  previousPlan: DeployAgentPlan,
  userFeedback: string,
  userIntegrations: string[],
  usageSink?: OpenAIUsageSink
): Promise<DeployAgentPlan> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const isIntegrationConnected = (requiredIntegration: string): boolean =>
    userIntegrations.some(
      (ui) =>
        ui === requiredIntegration ||
        (requiredIntegration.startsWith('google-') && ui === 'google') ||
        (ui.startsWith('google-') && requiredIntegration === 'google')
    );

  const pollingTriggersText = TRIGGER_CATALOGUE
    .map((t) => {
      const connected = isIntegrationConnected(t.requiredIntegration);
      return `- ${t.triggerType} (requires: ${t.requiredIntegration}, connected: ${connected ? 'yes' : 'no'}) — ${t.label}`;
    })
    .join('\n');

  const systemPrompt = `You are an expert AI agent designer. The user had this plan and wants to change it.

THE USER'S CURRENT PLAN:
${JSON.stringify(previousPlan, null, 2)}

THEY WANT TO CHANGE:
"${userFeedback}"

Return an updated plan that incorporates their requested changes.

---
POLLING TRIGGERS (EXHAUSTIVE — all polling types supported by Runwise):
${pollingTriggersText}

BUILT-IN TRIGGERS (always available): webhook (config.path required), schedule (scheduleCron required for "daily", "hourly", "every morning", etc.), heartbeat (scheduleCron required). schedule/heartbeat are ALWAYS supported for time-based agents.

IMPORTANT:
- If a polling trigger clearly matches user intent (e.g. Google Forms submission -> new-form-submission), use that polling trigger even when connected:no. Missing integrations are handled after planning.
- Use webhook ONLY for generic HTTP webhook requests/URLs from external systems. Do NOT use webhook as a substitute for first-class polling triggers like Gmail/Slack/Forms/Sheets.

TRIGGER vs TOOL DISTINCTION: A polling trigger means the agent reacts to EACH individual new event. If the agent runs on a schedule and reads/writes to a service during that run, the service is a TOOL — do NOT add a polling trigger for it. Example: "every hour summarise Slack" → schedule only, NOT schedule + polling(slack).

---
Your job: Return an UPDATED plan that incorporates the user's feedback. Use the exact same JSON structure as the current plan.
- behaviours: only include when user specifies or infers a trigger. Empty [] = manual-only agent.
- webhook: config.path = URL-safe slug
- schedule/heartbeat: scheduleCron = cron expression
- Preserve emailSendingMode unless the user asks to change how email is sent (Gmail vs dedicated agent address).

RULES:
1. Only use trigger types from the polling trigger list above.
2. Preserve parts of the plan the user did not ask to change.
3. Apply the requested changes precisely.
4. Do NOT add a polling trigger for a service the agent just reads from during a scheduled run.
5. emailSendingMode: keep prior value if not discussed; align with send_email_gmail (user Gmail) vs send_email_resend (platform address) per user intent.
6. Return ONLY valid JSON, no markdown, no code fences.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.5,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Update the plan based on: "${userFeedback}"` },
    ],
  });

  usageSink?.addFromChatCompletion(response);

  const rawJson = response.choices[0]?.message?.content ?? '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Planner returned invalid JSON');
  }

  return validateAndNormalisePlan(parsed);
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

function buildSystemPrompt(availableTriggersText: string): string {
  return `You are an expert AI agent designer. A user has described what they want their personal AI agent to do.
Your job is to produce a complete, structured deployment plan for that agent.

---
TRIGGERS — ADD ONLY WHEN USER SPECIFIES OR YOU CAN CLEARLY INFER:

POLLING TRIGGERS (EXHAUSTIVE — all polling types supported by Runwise):
${availableTriggersText}

BUILT-IN TRIGGERS (NO integration required — ALWAYS available, use for time-based agents):
- schedule: Run on a cron schedule. REQUIRED for: "daily", "hourly", "every morning", "every day at 9am", "time-based", "scheduled", "every hour", "weekly", "at 8am", and ANY interval the user asks for (including sub-hourly). scheduleCron REQUIRED (5 fields: minute hour day month weekday). Examples: "0 9 * * *" (9am daily), "0 * * * *" (every hour at :00), "0 8 * * 1-5" (8am Mon–Fri), "*/5 * * * *" (every 5 minutes), "*/10 * * * *" (every 10 minutes), "*/15 * * * *" (every 15 minutes), "*/30 * * * *" (every 30 minutes), "0 */2 * * *" (every 2 hours at :00), "0 */6 * * *" (every 6 hours). If the user asks for an interval that does NOT match simple "every hour", "once daily at X", or "weekly on day D at X", you MUST still output a valid scheduleCron — use the closest standard cron (often "custom" intervals use */N in the minute or hour field).
- heartbeat: Same as schedule, proactive check-in. Use for "daily briefing", "check in every day", "run every morning". scheduleCron REQUIRED (same cron rules as schedule).
- webhook: Run when HTTP POST hits a webhook URL. Use for "webhook", "when someone hits my URL", "when my backend posts JSON to this endpoint". config MUST include "path" (URL-safe slug).

CRITICAL: schedule and heartbeat are ALWAYS supported. If user says "time-based", "scheduled", "daily", "hourly", "every morning", etc. → use behaviourType "schedule" or "heartbeat" with appropriate scheduleCron. Do NOT say we don't support time schedules.
CRITICAL: Only add triggers when user EXPLICITLY specifies one or you can strongly infer. If user does NOT mention how/when to run → behaviours: [] (manual-only agent).
CRITICAL: If the user describes an event source that maps to a first-class polling trigger, use that polling trigger (e.g. "Google Form submission" -> new-form-submission, "new row in Google Sheet" -> new-row-in-google-sheet, "new Slack message" -> new-message-in-slack). Do NOT replace these with webhook.
CRITICAL: Connection state never changes trigger semantics. If connected:no for a required integration, still choose the correct trigger; the app will request connection after plan generation.

CRITICAL — TRIGGER vs TOOL DISTINCTION:
A polling trigger means the agent wakes up and runs ONCE PER NEW EVENT (one email, one Slack message, one Sheet row).
If the agent runs on a SCHEDULE and merely READS from or WRITES to a service during that run, the service is a TOOL — do NOT add a polling trigger for it.

Ask yourself: "Does each individual new item in this service kick off a separate agent run?" If YES → polling trigger. If NO (the agent batches or summarises on a schedule) → schedule/heartbeat only, service is a tool.

WRONG — do NOT do this:
  "Every hour summarise the last hour of Slack messages" → behaviours: [schedule, polling(slack)]
  "Every morning read my emails and send a digest" → behaviours: [heartbeat, polling(gmail)]
  "Daily, check Google Sheets for new rows and email a report" → behaviours: [schedule, polling(sheets)]
  "Every hour check competitor websites" → behaviours: [schedule, polling(anything)] ← no polling trigger for web searches

CORRECT:
  "Every hour summarise the last hour of Slack messages" → behaviours: [schedule] ← Slack is a tool (read + post)
  "Every morning read my emails and send a digest" → behaviours: [heartbeat] ← Gmail is a tool
  "Daily, check Google Sheets for new rows and email a report" → behaviours: [schedule] ← Sheets is a tool
  "Reply to each new email as it arrives" → behaviours: [polling(gmail)] ← reacts to each individual email
  "Alert me on each new Slack message AND send a daily digest" → behaviours: [polling(slack), heartbeat] ← both needed: one reacts per message, one runs daily

RULE: If you have a schedule or heartbeat behaviour, do NOT also add a polling trigger for a service the agent merely reads from or posts to during that scheduled run. Only add a polling trigger when the agent must react to each individual new item from that service.

---
OUTPUT FORMAT (strict JSON, no markdown):
{
  "name": "Short memorable agent name (1-2 words)",
  "persona": "2-3 sentence personality",
  "instructions": "Full operating instructions — at least 3-5 sentences.",
  "avatarEmoji": "A single emoji",
  "behaviours": [
    {
      "behaviourType": "polling" | "webhook" | "schedule" | "heartbeat",
      "triggerType": "required for polling only — one of the polling types above",
      "scheduleCron": "required for schedule/heartbeat — e.g. '0 9 * * *' (9am daily), '0 * * * *' (hourly)",
      "config": { "path": "webhook-path" } for webhook, {} for others,
      "description": "Human-readable label (e.g. 'Watch Gmail for new emails', 'Run when webhook at /signup')"
    }
  ],
  "initialMemories": [
    "A specific fact to pre-load (e.g. 'User prefers concise replies under 3 sentences')",
    "Another fact (e.g. 'Always sign off messages as Aria')"
  ],
  "initialGoals": [
    "What the agent should work toward (e.g. 'Keep user informed of high-priority emails within 2 hours')"
  ],
  "initialRules": [
    "Behaviour constraints (e.g. 'Never forward emails without explicit user consent')"
  ],
  "emailSendingMode": "none" | "user_gmail" | "agent_resend" | "both"
}

---
RULES:
1. behaviours: ONLY add when user specifies a trigger or you can clearly infer one. If none → behaviours: [].
2. Polling: Only use trigger types from the polling list.
3. Webhook: behaviourType "webhook", config.path = URL-safe slug (e.g. "signup", "order-webhook"). No triggerType.
4. Schedule/heartbeat: scheduleCron REQUIRED. "daily at 9am" → "0 9 * * *", "hourly" → "0 * * * *", "9am Mon-Fri" → "0 9 * * 1-5", "every 5 minutes" → "*/5 * * * *", "every 15 minutes" → "*/15 * * * *". For any other interval, output accurate 5-field cron; the app will treat non-preset schedules as custom cron automatically.
5. "instructions" should be thorough — at least 3-5 sentences.
6. "initialMemories" MUST extract ALL specific knowledge from the user's prompts.
7. "initialGoals" and "initialRules" from prompts.
8. Pick a real-sounding name. Avoid "Agent" or "Bot".
9. config for polling: fill when you have specific values; otherwise {}.
10. Do NOT add a default heartbeat when the user did not ask for a time-based trigger. Manual-only agents have empty behaviours.
11. emailSendingMode (REQUIRED on every plan):
    - "none" — no outbound email tools needed.
    - "user_gmail" — outbound from the user's Gmail: use send_email_gmail; user must connect Google (Gmail). Mention in instructions.
    - "agent_resend" — outbound from a dedicated Runwise-provided agent address: use send_email_resend only for sends; NO Gmail OAuth required for that send path. Still use "user_gmail" / connect Gmail if the agent must READ the inbox or use new-email-received.
    - "both" — user may send from either mailbox; state in instructions when to use send_email_gmail vs send_email_resend.
12. In "instructions", always include 1–2 sentences on outbound email: which tool (send_email_gmail vs send_email_resend) matches the user's choice, and that Gmail is only required for the Gmail path / inbox features.

---
OUTBOUND EMAIL (tools — pick emailSendingMode to match user intent):
- send_email_gmail: sends from the user's connected Gmail. Requires Google Gmail OAuth.
- send_email_resend: sends from this agent's platform-managed address. No Gmail OAuth for sending; requires emailSendingMode to include agent_resend and a provisioned address (handled at deploy).

If the user wants mail from their own inbox → emailSendingMode: user_gmail (or both). If they want a dedicated agent/from address (not their personal Gmail) → agent_resend. Reading Gmail or per-email triggers still require google-gmail even when outbound uses agent_resend.

---
AGENT CAPABILITIES (exhaustive — agents can ONLY use these tools; include in instructions when relevant):
${getToolsSpec()}

EXHAUSTIVE TRIGGER REFERENCE (for semantic matching):
${getTriggersSpec()}

Match user phrasing by meaning: "reply from my Gmail" / inbox → send_email_gmail; "dedicated agent email" / "from the agent" / "not my personal email" → send_email_resend + emailSendingMode agent_resend or both; "monitor competitors" → schedule + web_search + read_url + send_notification/send_slack/email tools as appropriate; "daily check" → schedule or heartbeat.`;
}

// ============================================================================
// VALIDATION + NORMALISATION
// ============================================================================

const VALID_BEHAVIOUR_TYPES = new Set(['polling', 'webhook', 'schedule', 'heartbeat']);
const VALID_TRIGGER_TYPES = new Set(TRIGGER_CATALOGUE.map((t) => t.triggerType));
const VALID_EMAIL_SENDING_MODES = new Set<AgentEmailSendingMode>([
  'none',
  'user_gmail',
  'agent_resend',
  'both',
]);

function validateAndNormalisePlan(
  raw: any
): DeployAgentPlan {
  // Name
  const name =
    typeof raw.name === 'string' && raw.name.trim()
      ? raw.name.trim().slice(0, 80)
      : 'My Agent';

  // Persona
  const persona =
    typeof raw.persona === 'string' ? raw.persona.trim() : 'Professional, helpful, and concise.';

  // Instructions
  const instructions =
    typeof raw.instructions === 'string' && raw.instructions.trim()
      ? raw.instructions.trim()
      : 'Follow the user\'s requests and take helpful actions on their behalf.';

  // Avatar emoji — ensure it's a single emoji-ish character
  const avatarEmoji =
    typeof raw.avatarEmoji === 'string' && raw.avatarEmoji.trim()
      ? raw.avatarEmoji.trim().slice(0, 4)
      : '🤖';

  // Behaviours
  const rawBehaviours: any[] = Array.isArray(raw.behaviours) ? raw.behaviours : [];

  // Safety net: if there are both schedule/heartbeat AND polling triggers, remove any
  // polling trigger that is just acting as a "data source" for the scheduled run rather
  // than genuinely reacting to individual events. We detect this when the schedule/heartbeat
  // description or the instructions contain "summarise", "digest", "summary", "batch",
  // "compile", "aggregate", "last hour", "last day", "every X", "each hour", "each day" —
  // signals that the service is being read in bulk, not reacted to per-event.
  const hasScheduledBehaviour = rawBehaviours.some(
    (b: any) => b.behaviourType === 'schedule' || b.behaviourType === 'heartbeat'
  );
  const BATCH_READ_SIGNALS = /\b(summari[sz]e|digest|summary|batch|compile|aggregate|last\s+hour|last\s+day|past\s+hour|past\s+day|every\s+hour|every\s+day|each\s+hour|each\s+day|hourly|daily\s+report|weekly\s+report)\b/i;
  const instructionsText = typeof raw.instructions === 'string' ? raw.instructions : '';

  const behaviours: AgentBehaviourPlan[] = rawBehaviours
    .filter((b: any) => {
      if (!VALID_BEHAVIOUR_TYPES.has(b.behaviourType)) return false;
      if (b.behaviourType === 'polling') {
        if (!b.triggerType || !VALID_TRIGGER_TYPES.has(b.triggerType)) return false;
        // Remove polling triggers that are redundant when a schedule is already present
        // and the agent is doing batch/summary work (service is a tool, not an event source).
        if (hasScheduledBehaviour) {
          const descriptionText = typeof b.description === 'string' ? b.description : '';
          if (BATCH_READ_SIGNALS.test(instructionsText) || BATCH_READ_SIGNALS.test(descriptionText)) {
            return false;
          }
        }
      }
      if (b.behaviourType === 'webhook') {
        // Webhook needs config.path; we allow through and default in map
      }
      if ((b.behaviourType === 'schedule' || b.behaviourType === 'heartbeat') && !b.scheduleCron) {
        return false; // Must have cron
      }
      return true;
    })
    .map((b: any) => {
      const config = b.config && typeof b.config === 'object' ? { ...b.config } : {};
      // Webhook: ensure path is set (URL-safe slug)
      if (b.behaviourType === 'webhook') {
        const path = config.path;
        const safePath =
          typeof path === 'string' && path.trim()
            ? path.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-') || 'webhook'
            : 'webhook';
        config.path = safePath;
      }
      const scheduleCron =
        typeof b.scheduleCron === 'string' ? b.scheduleCron : undefined;
      const mergedConfig =
        b.behaviourType === 'schedule' || b.behaviourType === 'heartbeat'
          ? mergeScheduleConfigForPersist(scheduleCron ?? null, config)
          : config;

      return {
        behaviourType: b.behaviourType,
        triggerType: b.behaviourType === 'polling' ? (b.triggerType ?? undefined) : undefined,
        scheduleCron,
        config: mergedConfig,
        description:
          typeof b.description === 'string' ? b.description.trim() : b.behaviourType,
      };
    });

  // Initial memories
  const rawMemories: any[] = Array.isArray(raw.initialMemories) ? raw.initialMemories : [];
  const initialMemories: string[] = rawMemories
    .filter((m: any) => typeof m === 'string' && m.trim())
    .map((m: string) => m.trim())
    .slice(0, 10);

  // Initial goals and rules
  const rawGoals: any[] = Array.isArray(raw.initialGoals) ? raw.initialGoals : [];
  const initialGoals: string[] = rawGoals
    .filter((g: any) => typeof g === 'string' && g.trim())
    .map((g: string) => g.trim())
    .slice(0, 8);
  const rawRules: any[] = Array.isArray(raw.initialRules) ? raw.initialRules : [];
  const initialRules: string[] = rawRules
    .filter((r: any) => typeof r === 'string' && r.trim())
    .map((r: string) => r.trim())
    .slice(0, 8);

  const rawMode = raw.emailSendingMode;
  const emailSendingMode: AgentEmailSendingMode =
    typeof rawMode === 'string' && VALID_EMAIL_SENDING_MODES.has(rawMode as AgentEmailSendingMode)
      ? (rawMode as AgentEmailSendingMode)
      : 'none';

  return {
    name,
    persona,
    instructions,
    avatarEmoji,
    behaviours,
    initialMemories,
    initialGoals,
    initialRules,
    emailSendingMode,
  };
}
