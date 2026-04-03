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
import type { OpenAIUsageSink } from '@/lib/ai/openai-usage';

export type FeasibilityResult = {
  feasible: boolean;
  reason?: string;
};

const SUPPORTED_SERVICE_ALIASES = new Set([
  'gmail',
  'google gmail',
  'google mail',
  'google sheets',
  'google sheet',
  'sheets',
  'sheet',
  'google drive',
  'drive',
  'google forms',
  'google form',
  'forms',
  'form',
  'google calendar',
  'calendar',
  'slack',
  'discord',
  'github',
  'git hub',
  'notion',
  'airtable',
  'trello',
  'twitter',
  'tweet',
  'x',
  'openai',
  'gpt',
  'twilio',
  'stripe',
  'resend',
  'runwise',
  'webhook',
  'web search',
  'web',
]);

const NON_SERVICE_PHRASES = new Set([
  'manual run',
  'on demand',
  'time schedule',
  'schedule trigger',
  'polling trigger',
  'webhook trigger',
  'the web',
  'website',
  'url',
  'email',
  'emails',
  'notification',
  'notifications',
  'message',
  'messages',
  'my team',
  'my teams',
  'your team',
  'their team',
  'a team',
  'the team',
  'the above',
  'the above details',
  'above details',
  'user confirmed',
  'confirmed details',
]);

/** Questionnaire boilerplate that must not be scanned for "unknown integrations" */
const BOILERPLATE_SECOND_TOKEN = new Set([
  'above',
  'below',
  'following',
  'same',
  'details',
  'information',
  'answers',
  'response',
  'responses',
]);

/**
 * Only scan user-authored text for heuristic "unknown service" detection.
 * Full enriched prompts contain lines like "Use the above details exactly" which
 * falsely match integrate|use patterns and produced "We don't support The Above Details yet."
 */
function extractTextForServiceHeuristic(description: string): string {
  let s = description.trim();
  s = s.replace(/\n---\nUse the above details exactly\.[\s\S]*$/i, '').trim();

  const sep = '\n---\nUSER-CONFIRMED DETAILS (from questionnaire):';
  const i = s.indexOf(sep);
  if (i === -1) return s;

  const head = s.slice(0, i).trim();
  const rest = s.slice(i + sep.length);
  const phaseIdx = rest.indexOf('\n\nPHASE 6 HINTS:');
  const qaOnly = phaseIdx === -1 ? rest : rest.slice(0, phaseIdx);
  const answers = qaOnly
    .split('\n')
    .filter((line) => /^A:\s*/i.test(line))
    .map((line) => line.replace(/^A:\s*/i, '').trim())
    .join('\n');

  return [head, answers].filter(Boolean).join('\n\n');
}

function normalizeServicePhrase(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w.+\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function prettifyServiceLabel(s: string): string {
  return s
    .split(/\s+/)
    .map((p) => (p.length <= 3 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)))
    .join(' ');
}

/**
 * Detect named third-party services in action/integration contexts.
 * If the service isn't in our supported allowlist, we hard-reject.
 */
function detectUnknownNamedService(description: string): string | null {
  const t = description;
  const contextPatterns: RegExp[] = [
    /\b(?:post|send|publish|create|update|sync|integrate|connect|push|notify|message)\b.{0,25}\b(?:on|in|to|into|via|using|through|with)\s+([a-z][a-z0-9.+-]*(?:\s+[a-z0-9.+-]+){0,2})/gi,
    /\b(?:on|in|to|into|via|using|through|with)\s+([a-z][a-z0-9.+-]*(?:\s+[a-z0-9.+-]+){0,2})\b.{0,25}\b(?:post|send|publish|create|update|sync|integrate|connect|push|notify|message)\b/gi,
    /\b(?:integrate|connect|use)\s+([a-z][a-z0-9.+-]*(?:\s+[a-z0-9.+-]+){0,2})\b/gi,
  ];

  const candidates: string[] = [];
  for (const pattern of contextPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(t)) !== null) {
      if (match[1]) candidates.push(match[1]);
    }
  }

  for (const raw of candidates) {
    const phrase = normalizeServicePhrase(raw);
    if (!phrase || phrase.length < 2 || NON_SERVICE_PHRASES.has(phrase)) continue;
    if (SUPPORTED_SERVICE_ALIASES.has(phrase)) continue;

    const tokens = phrase.split(/\s+/);
    if (tokens.length >= 2 && BOILERPLATE_SECOND_TOKEN.has(tokens[1])) {
      continue;
    }

    // If phrase starts with a supported service token (e.g. "google sheets row")
    // treat as supported.
    const startsWithSupported = Array.from(SUPPORTED_SERVICE_ALIASES).some(
      (svc) => phrase === svc || phrase.startsWith(`${svc} `)
    );
    if (startsWithSupported) continue;

    // Generic channel words are not third-party platforms.
    if (/^(channel|channels|inbox|mailbox|sms|text|file|files|page|pages)$/.test(phrase)) {
      continue;
    }

    // Skip pronoun-led fragments that are not product names (e.g. "the spreadsheet")
    if (/^(the|a|an|my|your|our|their|this|these|those)\s+/.test(phrase)) {
      continue;
    }

    return prettifyServiceLabel(phrase);
  }

  return null;
}

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
  // TikTok — unsupported for posting/reading/triggers
  { pattern: /\btiktok\b/i, label: 'TikTok' },
  // Instagram — unsupported
  { pattern: /\binstagram\b|\binsta\b/i, label: 'Instagram' },
  // Facebook / Meta pages — unsupported
  { pattern: /\bfacebook\b|\bmeta\s+(?:page|pages|ads?)\b/i, label: 'Facebook' },
  // LinkedIn — unsupported
  { pattern: /\blinkedin\b/i, label: 'LinkedIn' },
  // YouTube — unsupported
  { pattern: /\byoutube\b/i, label: 'YouTube' },
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

  // 2. Known FEASIBLE: matches patterns we can definitely fulfill (full spec, incl. questionnaire)
  for (const pattern of ALWAYS_FEASIBLE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { feasible: true };
    }
  }

  // 3. Deterministic unknown-service guard — only user prompt + answer lines (not boilerplate)
  const scanText = extractTextForServiceHeuristic(trimmed);
  const unknownService = detectUnknownNamedService(scanText);
  if (unknownService) {
    return { feasible: false, reason: `We don't support ${unknownService} yet.` };
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
 * If the model says "too vague / unclear / missing details", that should route
 * to clarification questions rather than hard rejection.
 */
function isUnderspecifiedRejectReason(reason: string | undefined): boolean {
  if (!reason) return false;
  return /\b(vague|unclear|underspecified|not enough (?:detail|details|information)|missing details?|does not specify|without specific details?)\b/i.test(
    reason
  );
}

/**
 * Check if the user's agent request can be fulfilled with our supported triggers and tools.
 * Returns feasible: false ONLY when the request requires triggers or tools not in our exhaustive list.
 * Whether the user has connected an integration is IRRELEVANT — users connect after building.
 */
export async function checkAgentFeasibility(
  userDescription: string,
  userIntegrationNames: string[],
  usageSink?: OpenAIUsageSink
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

EXPLICIT NAMED-SERVICE RULE:
If the user explicitly requires a named third-party service/platform that is NOT listed in the TRIGGERS or TOOLS sections above, set "feasible": false and name that service in "reason".
Examples of unsupported when required: TikTok, Instagram, LinkedIn, Facebook Pages, YouTube, Zoho, etc.
If the user only mentions supported items (Gmail, Slack, Discord, Sheets, web_search, schedule, webhook, etc.) or generic goals you can satisfy with supported tools, set "feasible": true.

WHEN UNCERTAIN: default to feasible=true. Only reject when you are CERTAIN we lack the required capability.

OUTPUT: JSON only. {"feasible": boolean, "reason": "..." when feasible is false}
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

    usageSink?.addFromChatCompletion(completion);

    const content = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as { feasible?: boolean; reason?: string };

    let feasible = parsed.feasible !== false;
    let reason = typeof parsed.reason === 'string' ? parsed.reason.trim() : undefined;

    // 3. Sanity override: if LLM rejected but request matches feasible patterns, allow anyway
    if (!feasible && matchesFeasiblePatterns(userDescription)) {
      feasible = true;
      reason = undefined;
    }

    // 4. Never hard-reject vague/underspecified requests; clarification should handle these.
    if (!feasible && isUnderspecifiedRejectReason(reason)) {
      feasible = true;
      reason = undefined;
    }

    return { feasible, reason: feasible ? undefined : (reason || "We can't build that with our current integrations.") };
  } catch (err: any) {
    console.error('[Agent Feasibility] Error:', err);
    return { feasible: true };
  }
}
