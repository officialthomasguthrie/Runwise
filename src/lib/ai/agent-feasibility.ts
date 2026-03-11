/**
 * Agent Feasibility Check
 * Determines if a user's agent request can be fulfilled with available triggers and tools.
 * Runs before clarification/plan — if infeasible, we return early with an honest explanation.
 *
 * Uses a hybrid approach for maximum reliability:
 * 1. Programmatic checks for known-feasible and known-infeasible patterns (deterministic)
 * 2. LLM with strong prompt and "when uncertain, allow" bias
 * 3. Sanity override: if LLM rejects but request matches feasible patterns, allow anyway
 */

import OpenAI from 'openai';
import { getCapabilitySpecForAI } from '@/lib/agents/capabilities-spec';

export type FeasibilityResult = {
  feasible: boolean;
  reason?: string;
};

// Services we explicitly do NOT support. Only reject when the request centrally requires one.
const UNSUPPORTED_SERVICE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bmicrosoft\s*teams\b|\bms\s*teams\b|\bteams\s*(agent|bot|integration)\b/i, label: 'Microsoft Teams' },
  { pattern: /\bzoom\s*(agent|bot|meeting|integration)\b|\bzoom\s+integration/i, label: 'Zoom' },
  { pattern: /\bwhatsapp\b.*\b(agent|bot|integration|message)\b/i, label: 'WhatsApp' },
  { pattern: /\bjira\b.*\b(agent|bot|integration|board|issue)\b|\bagent\b.*\bjira\b/i, label: 'Jira' },
  { pattern: /\blinear\b.*\b(agent|bot|integration)\b|\bagent\b.*\blinear\b/i, label: 'Linear' },
  { pattern: /\bsalesforce\b.*\b(agent|bot|integration)\b|\bagent\b.*\bsalesforce\b/i, label: 'Salesforce' },
  { pattern: /\bhubspot\b.*\b(agent|bot|integration)\b|\bagent\b.*\bhubspot\b/i, label: 'HubSpot' },
  { pattern: /\basana\b.*\b(agent|bot|integration)\b|\bagent\b.*\basana\b/i, label: 'Asana' },
  { pattern: /\bmonday\.com\b.*\b(agent|bot|integration)\b|\bagent\b.*\bmonday\.com\b/i, label: 'Monday.com' },
];

// Patterns we KNOW are feasible with schedule + web_search + read_url + alerts. Deterministic accept.
const ALWAYS_FEASIBLE_PATTERNS: RegExp[] = [
  /\b(monitor|watch|track|follow)\b.*\b(competitor|competitors|competition)\b/i,
  /\b(competitor|competitors|competition)\b.*\b(monitor|watch|track|alert|launch|campaign|feature)\b/i,
  /\b(alert|notify)\b.*\b(when|if)\b.*\b(launch|campaign|feature|release)\b/i,
  /\b(competitive\s*intelligence|market\s*research|competitor\s*tracking)\b/i,
  /\b(web\s*search|search\s*the\s*web|search\s*online|google\s*search)\b/i,
  /\b(read|fetch|scrape|check)\b.*\b(url|website|web\s*page|webpage)\b/i,
  /\b(daily|hourly|every\s*morning|scheduled|time-based|cron|every\s*day|every\s*hour)\b/i,
  /\b(reply|respond|answer)\b.*\b(email|emails|gmail)\b/i,
  /\b(send|post)\b.*\b(slack|discord|email|notification)\b/i,
  /\b(gmail|slack|discord|google\s*sheet|notion|airtable|trello|calendar|drive|github|stripe)\b/i,
  /\b(briefing|digest|summary)\b.*\b(daily|morning|weekly)\b/i,
];

/**
 * Programmatic check: return a definite result if we can decide without the LLM.
 */
function getProgrammaticResult(description: string): FeasibilityResult | null {
  const trimmed = description.trim();
  if (!trimmed) return { feasible: true };

  // 1. Known INFEASIBLE: request centrally requires an unsupported service
  for (const { pattern, label } of UNSUPPORTED_SERVICE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { feasible: false, reason: `We don't support ${label} yet.` };
    }
  }

  // 2. Known FEASIBLE: matches patterns we can definitely fulfill
  for (const pattern of ALWAYS_FEASIBLE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { feasible: true };
    }
  }

  return null;
}

/**
 * Returns true if the description matches any ALWAYS_FEASIBLE pattern.
 * Used as sanity override when LLM incorrectly rejects.
 */
function matchesFeasiblePatterns(description: string): boolean {
  const trimmed = description.trim();
  for (const pattern of ALWAYS_FEASIBLE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

/**
 * Check if the user's agent request can be fulfilled with our supported triggers and tools.
 * Returns feasible: false ONLY when the request requires triggers or tools not in our exhaustive list.
 * Whether the user has connected an integration is IRRELEVANT — users connect after building.
 */
export async function checkAgentFeasibility(
  userDescription: string,
  userIntegrationNames: string[]
): Promise<FeasibilityResult> {
  // 1. Programmatic check first — deterministic, 100% reliable
  const programmatic = getProgrammaticResult(userDescription);
  if (programmatic !== null) {
    return programmatic;
  }

  if (!process.env.OPENAI_API_KEY) {
    return { feasible: true, reason: undefined };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const capabilitySpec = getCapabilitySpecForAI();

  const systemPrompt = `You are a feasibility checker for Runwise, an AI agent builder. Determine if a user's request can be fulfilled using ONLY the triggers and tools below.

${capabilitySpec}

CRITICAL — HOW TO MAP REQUESTS TO CAPABILITIES:
• "Monitor competitors", "watch for launches", "track competitors", "alert when X launches" → FEASIBLE. Use schedule/heartbeat + web_search + read_url + send_notification_to_user (or send_slack/send_email). We have web search and URL reading.
• "Web research", "search the web", "find information online" → FEASIBLE. web_search + read_url.
• "Daily/hourly/scheduled" anything → FEASIBLE. schedule or heartbeat trigger.
• "Reply to emails", "respond to emails" → FEASIBLE. new-email-received + send_email_gmail (replyToThread).
• "Post to Slack/Discord", "send notification" → FEASIBLE. send_slack_message, send_discord_message, send_notification_to_user.

REJECT (feasible=false) ONLY when the request CENTRALLY requires a service not in our lists: Microsoft Teams, Zoom, WhatsApp, Jira, Linear, Salesforce, HubSpot, Asana, Monday.com. If the request can be fulfilled by combining our triggers and tools, it is FEASIBLE.

WHEN UNCERTAIN: default to feasible=true. Only reject when you are CERTAIN we lack the required capability.

OUTPUT: JSON only. {"feasible": boolean, "reason": "..." when false}
Return ONLY valid JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Can we build this agent?\n\n"${userDescription}"` },
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as { feasible?: boolean; reason?: string };

    let feasible = parsed.feasible !== false;
    let reason = typeof parsed.reason === 'string' ? parsed.reason.trim() : undefined;

    // 3. Sanity override: if LLM rejected but request matches feasible patterns, allow anyway
    if (!feasible && matchesFeasiblePatterns(userDescription)) {
      feasible = true;
      reason = undefined;
    }

    return { feasible, reason: feasible ? undefined : (reason || "We can't build that with our current integrations.") };
  } catch (err: any) {
    console.error('[Agent Feasibility] Error:', err);
    return { feasible: true };
  }
}
