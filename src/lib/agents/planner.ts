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
      : '- None (no integrations connected — use heartbeat only)';

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
      : '- None (no integrations connected — use heartbeat only)';

  const systemPrompt = `You are an expert AI agent designer. The user had this plan and wants to change it.

THE USER'S CURRENT PLAN:
${JSON.stringify(previousPlan, null, 2)}

THEY WANT TO CHANGE:
"${userFeedback}"

Return an updated plan that incorporates their requested changes.

---
AVAILABLE TRIGGER TYPES (only use these):
${availableTriggersText}

---
Your job: Return an UPDATED plan that incorporates the user's feedback. Use the exact same JSON structure as the current plan.
Output format (strict JSON, no markdown):
{
  "name": "...",
  "persona": "...",
  "instructions": "...",
  "avatarEmoji": "...",
  "behaviours": [...],
  "initialMemories": [...]
}

RULES:
1. Only use trigger types from the available list.
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
AVAILABLE TRIGGER TYPES (only use these):
${availableTriggersText}

SPECIAL BEHAVIOUR TYPES:
- heartbeat: a proactive scheduled check-in (no external trigger required). Use for daily briefings, periodic tasks, proactive outreach. Specify scheduleCron.
- schedule: run on a fixed cron schedule (similar to heartbeat but for precise recurring actions)

---
OUTPUT FORMAT (strict JSON, no markdown):
{
  "name": "Short memorable agent name (1-2 words, e.g. 'Aria', 'Scout', 'Briefing Bot', 'Deal Tracker')",
  "persona": "2-3 sentence personality and communication style description",
  "instructions": "Full, detailed operating instructions for the agent. Be specific: what to look for, how to respond, what to remember, what NOT to do. This is the agent's north star — the more detail the better.",
  "avatarEmoji": "A single emoji that represents this agent",
  "behaviours": [
    {
      "behaviourType": "polling" | "schedule" | "heartbeat",
      "triggerType": "one of the available trigger types above (omit for heartbeat/schedule)",
      "scheduleCron": "cron expression (only for schedule/heartbeat, e.g. '0 9 * * 1-5' for 9am Mon-Fri)",
      "config": {},
      "description": "Human-readable: what this behaviour does (e.g. 'Watch Gmail inbox for new emails')"
    }
  ],
  "initialMemories": [
    "A specific fact to pre-load (e.g. 'User prefers concise replies under 3 sentences')",
    "Another fact (e.g. 'Always sign off messages as Aria')"
  ]
}

---
RULES:
1. Only use trigger types from the available list above. Never invent trigger types.
2. If a behaviour needs a polling trigger but no matching integration is connected, use "heartbeat" instead (so the agent can still check proactively).
3. The "instructions" field should be thorough — at least 3-5 sentences. Include what the agent should do, how it should communicate, what it should remember, and any constraints.
4. "initialMemories" are facts that are true right now — useful context the agent needs from day one. Include communication preferences, user context, or operational rules. Include 2-5 items.
5. "config" is usually {} unless you have a specific value to set (e.g. a label filter).
6. Pick a name that sounds like a real assistant name or a descriptive bot name. Avoid generic names like "Agent" or "Bot".
7. The avatarEmoji should meaningfully reflect the agent's primary purpose.
8. Be practical: if the user mentions "every morning" or "daily", add a heartbeat behaviour with the appropriate cron.
9. If the user's description doesn't clearly mention a polling source but does mention a time-based action, use heartbeat.
10. Do not add behaviours for integrations that are NOT in the available triggers list.`;
}

// ============================================================================
// VALIDATION + NORMALISATION
// ============================================================================

const VALID_BEHAVIOUR_TYPES = new Set(['polling', 'schedule', 'heartbeat']);
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
      // For polling behaviours, triggerType must be in the available list
      if (b.behaviourType === 'polling') {
        if (!b.triggerType || !VALID_TRIGGER_TYPES.has(b.triggerType)) return false;
        if (!availableTriggerTypes.has(b.triggerType)) return false;
      }
      return true;
    })
    .map((b: any) => ({
      behaviourType: b.behaviourType,
      triggerType: b.triggerType ?? undefined,
      scheduleCron: typeof b.scheduleCron === 'string' ? b.scheduleCron : undefined,
      config: b.config && typeof b.config === 'object' ? b.config : {},
      description:
        typeof b.description === 'string' ? b.description.trim() : b.behaviourType,
    }));

  // If no valid behaviours were produced, add a default hourly heartbeat
  if (behaviours.length === 0) {
    behaviours.push({
      behaviourType: 'heartbeat',
      scheduleCron: '0 * * * *',
      config: {},
      description: 'Hourly check-in to review instructions and take any needed actions',
    });
  }

  // Initial memories
  const rawMemories: any[] = Array.isArray(raw.initialMemories) ? raw.initialMemories : [];
  const initialMemories: string[] = rawMemories
    .filter((m: any) => typeof m === 'string' && m.trim())
    .map((m: string) => m.trim())
    .slice(0, 10);

  return { name, persona, instructions, avatarEmoji, behaviours, initialMemories };
}
