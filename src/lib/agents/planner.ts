/**
 * Agent Planner — interprets a plain English description into a structured DeployAgentPlan.
 *
 * Called once at deploy time. Uses GPT-4o with JSON response format.
 */

import OpenAI from 'openai';
import type { DeployAgentPlan, AgentBehaviourPlan } from './types';

// ============================================================================
// TRIGGER CATALOGUE
// Each entry describes a trigger the planner can assign to a behaviour.
// Only triggers whose required integration is in userIntegrations[] will be used.
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
];

// ============================================================================
// MAIN EXPORT
// ============================================================================

export async function planAgent(
  description: string,
  userIntegrations: string[]
): Promise<DeployAgentPlan> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Build the list of available triggers (filtered to connected integrations)
  const availableTriggers = TRIGGER_CATALOGUE.filter((t) =>
    userIntegrations.some(
      (ui) =>
        ui === t.requiredIntegration ||
        // also accept generic 'google' matching any google-* service
        (t.requiredIntegration.startsWith('google-') && ui === 'google') ||
        (ui.startsWith('google-') && t.requiredIntegration === 'google')
    )
  );

  const availableTriggersText =
    availableTriggers.length > 0
      ? availableTriggers
          .map((t) => `- ${t.triggerType} (requires: ${t.requiredIntegration}) — ${t.label}`)
          .join('\n')
      : '- None (no integrations connected — use webhook, schedule, or heartbeat only)';

  const systemPrompt = buildSystemPrompt(availableTriggersText);
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

  const rawJson = response.choices[0]?.message?.content ?? '{}';

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Planner returned invalid JSON');
  }

  return validateAndNormalisePlan(parsed, availableTriggers);
}

/**
 * Regenerates an agent plan based on user feedback.
 * Used when the user clicks "Let me adjust something" — we have the current plan
 * and their requested changes, and produce an updated plan.
 */
export async function regenerateAgentPlan(
  previousPlan: DeployAgentPlan,
  userFeedback: string,
  userIntegrations: string[]
): Promise<DeployAgentPlan> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const availableTriggers = TRIGGER_CATALOGUE.filter((t) =>
    userIntegrations.some(
      (ui) =>
        ui === t.requiredIntegration ||
        (t.requiredIntegration.startsWith('google-') && ui === 'google') ||
        (ui.startsWith('google-') && t.requiredIntegration === 'google')
    )
  );

  const availableTriggersText =
    availableTriggers.length > 0
      ? availableTriggers
          .map((t) => `- ${t.triggerType} (requires: ${t.requiredIntegration}) — ${t.label}`)
          .join('\n')
      : '- None (no integrations connected — use webhook, schedule, or heartbeat only)';

  const systemPrompt = `You are an expert AI agent designer. The user had this plan and wants to change it.

THE USER'S CURRENT PLAN:
${JSON.stringify(previousPlan, null, 2)}

THEY WANT TO CHANGE:
"${userFeedback}"

Return an updated plan that incorporates their requested changes.

---
POLLING TRIGGERS (only use if user has integration):
${availableTriggersText}

BUILT-IN TRIGGERS (no integration): webhook (config.path required), schedule (scheduleCron required), heartbeat (scheduleCron required).

---
Your job: Return an UPDATED plan that incorporates the user's feedback. Use the exact same JSON structure as the current plan.
- behaviours: only include when user specifies or infers a trigger. Empty [] = manual-only agent.
- webhook: config.path = URL-safe slug
- schedule/heartbeat: scheduleCron = cron expression

RULES:
1. Only use trigger types from the available list for polling.
2. Preserve parts of the plan the user did not ask to change.
3. Apply the requested changes precisely.
4. Return ONLY valid JSON, no markdown, no code fences.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.5,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Update the plan based on: "${userFeedback}"` },
    ],
  });

  const rawJson = response.choices[0]?.message?.content ?? '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Planner returned invalid JSON');
  }

  return validateAndNormalisePlan(parsed, availableTriggers);
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

function buildSystemPrompt(availableTriggersText: string): string {
  return `You are an expert AI agent designer. A user has described what they want their personal AI agent to do.
Your job is to produce a complete, structured deployment plan for that agent.

---
TRIGGERS — ADD ONLY WHEN USER SPECIFIES OR YOU CAN CLEARLY INFER:

POLLING TRIGGERS (require connected integration — only use if user mentions the source):
${availableTriggersText}

BUILT-IN TRIGGERS (no integration required — always available):
- webhook: Run when HTTP POST hits a webhook URL. Use when user says "webhook", "when someone hits my URL", "when a form submits". config MUST include "path" (URL-safe slug, e.g. "signup", "order-notify").
- schedule: Run on fixed cron. Use for "daily at X", "every morning", "hourly". scheduleCron REQUIRED.
- heartbeat: Proactive check-in (same as schedule). Use for "daily briefing", "check in every day".

CRITICAL: Only add triggers when user EXPLICITLY specifies one or you can strongly infer. If user does NOT mention how/when to run → behaviours: [] (manual-only agent).

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
  ]
}

---
RULES:
1. behaviours: ONLY add when user specifies a trigger or you can clearly infer one. If none → behaviours: [].
2. Polling: Only use trigger types from the polling list.
3. Webhook: behaviourType "webhook", config.path = URL-safe slug (e.g. "signup", "order-webhook"). No triggerType.
4. Schedule/heartbeat: scheduleCron REQUIRED. "daily at 9am" → "0 9 * * *", "hourly" → "0 * * * *", "9am Mon-Fri" → "0 9 * * 1-5".
5. "instructions" should be thorough — at least 3-5 sentences.
6. "initialMemories" MUST extract ALL specific knowledge from the user's prompts.
7. "initialGoals" and "initialRules" from prompts.
8. Pick a real-sounding name. Avoid "Agent" or "Bot".
9. config for polling: fill when you have specific values; otherwise {}.
10. Do NOT add a default heartbeat when the user did not ask for a time-based trigger. Manual-only agents have empty behaviours.`;
}

// ============================================================================
// VALIDATION + NORMALISATION
// ============================================================================

const VALID_BEHAVIOUR_TYPES = new Set(['polling', 'webhook', 'schedule', 'heartbeat']);
const VALID_TRIGGER_TYPES = new Set(TRIGGER_CATALOGUE.map((t) => t.triggerType));

function validateAndNormalisePlan(
  raw: any,
  availableTriggers: TriggerDef[]
): DeployAgentPlan {
  const availableTriggerTypes = new Set(availableTriggers.map((t) => t.triggerType));

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
  const behaviours: AgentBehaviourPlan[] = rawBehaviours
    .filter((b: any) => {
      if (!VALID_BEHAVIOUR_TYPES.has(b.behaviourType)) return false;
      if (b.behaviourType === 'polling') {
        if (!b.triggerType || !VALID_TRIGGER_TYPES.has(b.triggerType)) return false;
        if (!availableTriggerTypes.has(b.triggerType)) return false;
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
      return {
        behaviourType: b.behaviourType,
        triggerType: b.behaviourType === 'polling' ? (b.triggerType ?? undefined) : undefined,
        scheduleCron: typeof b.scheduleCron === 'string' ? b.scheduleCron : undefined,
        config,
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

  return {
    name,
    persona,
    instructions,
    avatarEmoji,
    behaviours,
    initialMemories,
    initialGoals,
    initialRules,
  };
}
