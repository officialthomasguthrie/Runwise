/**
 * Agent Feasibility Check
 * Determines if a user's agent request can be fulfilled with available triggers and tools.
 * Runs before clarification/plan — if infeasible, we return early with an honest explanation.
 *
 * Uses the canonical capability spec (capabilities-spec.ts) — single source of truth derived
 * from actual AGENT_TOOLS and trigger catalogue. The AI infers feasibility from the lists,
 * not from example rules.
 */

import OpenAI from 'openai';
import { getCapabilitySpecForAI } from '@/lib/agents/capabilities-spec';

export type FeasibilityResult = {
  feasible: boolean;
  reason?: string;
};

/**
 * Check if the user's agent request can be fulfilled with our supported triggers and tools.
 * Returns feasible: false ONLY when the request requires triggers or tools not in our exhaustive list.
 * Whether the user has connected an integration is IRRELEVANT — users connect after building.
 */
export async function checkAgentFeasibility(
  userDescription: string,
  userIntegrationNames: string[]
): Promise<FeasibilityResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { feasible: true, reason: undefined };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const capabilitySpec = getCapabilitySpecForAI();

  const systemPrompt = `You are a feasibility checker for Runwise, an AI agent builder. You have ONE job: determine if a user's agent request can be fulfilled using ONLY the triggers and tools listed below. This list is EXHAUSTIVE — there are no other triggers or tools.

${capabilitySpec}

RULES:
1. feasible = true if the request can be fulfilled by combining triggers and tools from the lists above.
2. feasible = false ONLY if the request requires a trigger or tool that does NOT appear in the lists above (e.g. Microsoft Teams, Zoom, WhatsApp, Jira, Linear, Salesforce, HubSpot, Asana, Monday.com, or any service not explicitly listed).
3. Whether the user has connected an integration is IRRELEVANT. Users connect integrations after building. Only reject when we don't support the service/tool at all.
4. Match user phrasing to capabilities by meaning: "reply to emails" uses send_email_gmail (replyToThread/threadId); "monitor competitors" uses schedule + web_search + read_url + send_notification/send_slack/send_email; "daily check" uses schedule or heartbeat. Infer from the tool descriptions.

OUTPUT: JSON only. {"feasible": boolean, "reason": "..." when false}
Return ONLY valid JSON. When feasible is true, omit reason or set to null.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Can we build this agent?\n\n"${userDescription}"` },
      ],
      temperature: 0.2,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as { feasible?: boolean; reason?: string };

    const feasible = parsed.feasible !== false;
    const reason = typeof parsed.reason === 'string' ? parsed.reason.trim() : undefined;

    return { feasible, reason: feasible ? undefined : (reason || "We can't build that with our current integrations.") };
  } catch (err: any) {
    console.error('[Agent Feasibility] Error:', err);
    // On error, allow pipeline to continue (don't block on feasibility check failure)
    return { feasible: true };
  }
}
