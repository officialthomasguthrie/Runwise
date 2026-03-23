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

/**
 * Services we have NO support for — no trigger and no action tool.
 * Reject whenever the request requires interacting with them (as trigger OR as action target).
 *
 * Rules per service:
 *  - Specific names (Salesforce, HubSpot, Asana, Jira, WhatsApp): any mention implies needing them.
 *  - "Teams" alone is too generic (could mean "my team"), so require "Microsoft Teams" / "MS Teams"
 *    or "Teams" in an obvious action/channel context.
 *  - "Zoom" alone is caught; very unlikely in an agent prompt to mean anything other than Zoom.
 *  - "Linear" requires project-management context to avoid false positives on "linear workflow".
 */
const UNSUPPORTED_SERVICE_PATTERNS: { pattern: RegExp; label: string }[] = [
  // Microsoft Teams — as trigger OR action (post/send/read Teams messages, Teams channels)
  {
    pattern:
      /\bmicrosoft\s+teams\b|\bms\s+teams\b|\bteams\s+(?:channel|message|chat|workspace|meeting|notification|bot|integration)\b|\b(?:post|send|write|notify|message|read)\b.{0,40}\bteams\b/i,
    label: 'Microsoft Teams',
  },
  // Zoom — meetings, calls, webinars (as trigger or action)
  {
    pattern: /\bzoom\s+(?:meeting|call|webinar|recording|link|integration|bot|agent)\b|\b(?:schedule|start|join|host|create)\b.{0,30}\bzoom\b/i,
    label: 'Zoom',
  },
  // WhatsApp — any mention in an agent context
  { pattern: /\bwhatsapp\b/i, label: 'WhatsApp' },
  // Jira — any mention (issue tracker / project management tool)
  { pattern: /\bjira\b/i, label: 'Jira' },
  // Linear — only when used as an issue/project tracker (avoid false positives on "linear flow")
  {
    pattern: /\blinear\b.{0,40}\b(?:issue|ticket|task|project|board|workspace|team)\b|\b(?:issue|ticket|task)\b.{0,40}\blinear\b|\blinear\.app\b/i,
    label: 'Linear',
  },
  // Salesforce — any mention
  { pattern: /\bsalesforce\b/i, label: 'Salesforce' },
  // HubSpot — any mention (in integration catalogue but we have no action tools for it)
  { pattern: /\bhubspot\b/i, label: 'HubSpot' },
  // Asana — any mention
  { pattern: /\basana\b/i, label: 'Asana' },
  // Monday.com — any mention
  { pattern: /\bmonday\.com\b/i, label: 'Monday.com' },
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
• "Reply to emails", "respond to emails" → FEASIBLE. new-email-received + send_email_gmail (replyToThread), or outbound-only with send_email_resend if the user wants a dedicated agent address (no Gmail OAuth for that send path).
• "Dedicated agent email", "send from an address for this agent (not my Gmail)" → FEASIBLE. send_email_resend + platform-provisioned address at deploy.
• "Post to Slack/Discord", "send notification" → FEASIBLE. send_slack_message, send_discord_message, send_notification_to_user.

REJECT (feasible=false) when the request requires a service we don't support — WHETHER AS A TRIGGER (event source) OR AS AN ACTION (posting, reading, writing, notifying). Unsupported services: Microsoft Teams, Zoom, WhatsApp, Jira, Linear, Salesforce, HubSpot, Asana, Monday.com.
Examples of correctly rejected action-based requests:
  • "post the email contents to Microsoft Teams" → INFEASIBLE (no Teams tool)
  • "create a Jira ticket when I get an email" → INFEASIBLE (no Jira tool)
  • "log a new Salesforce lead" → INFEASIBLE (no Salesforce tool)
  • "send a WhatsApp message" → INFEASIBLE (no WhatsApp tool)
  • "update HubSpot CRM" → INFEASIBLE (no HubSpot tool)
If the request can be fulfilled by combining our triggers and tools above, it is FEASIBLE.

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
