/**
 * Agent Feasibility Check
 * Determines if a user's agent request can be fulfilled with available triggers and tools.
 * Runs before clarification/plan — if infeasible, we return early with an honest explanation.
 */

import OpenAI from 'openai';

export type FeasibilityResult = {
  feasible: boolean;
  reason?: string;
};

const SUPPORTED_TRIGGERS = `
- Gmail (new email) — requires google-gmail
- Slack (new channel message) — requires slack
- Discord (new message) — requires discord
- Google Sheets (new row) — requires google-sheets
- GitHub (new issue) — requires github
- Google Drive (file upload) — requires google-drive
- Google Forms (form submission) — requires google-forms
- Google Calendar (new event) — requires google-calendar
- Webhook (HTTP POST to a URL) — no integration
- Schedule (cron: daily, hourly, etc.) — no integration
- Heartbeat (proactive check-in) — no integration
`.trim();

const SUPPORTED_ACTIONS = `
- Send/read email (Gmail)
- Post to Slack or Discord
- Create Notion pages
- Update Google Sheets, Airtable, Trello
- Create Google Calendar events
- Google Drive (list, upload, share, read files, search)
- GitHub (create/list issues, add comments)
- Stripe (customers, invoices, subscriptions)
- Twitter/X (post tweets, search, get profile)
- Send SMS (Twilio)
- Web search (Serper API)
- Read URL content
- Get current time / timezone conversion
- Generic HTTP request
- Memory (remember/recall facts)
- Send notification to user
`.trim();

/**
 * Check if the user's agent request can be fulfilled with our supported triggers and actions.
 * Returns feasible: false ONLY when the user asks for integrations/capabilities we don't support
 * (e.g. Microsoft Teams, Jira — we haven't built those yet). Missing connected integrations
 * is NOT a reason to stop — users can connect them after the agent is built.
 */
export async function checkAgentFeasibility(
  userDescription: string,
  userIntegrationNames: string[]
): Promise<FeasibilityResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { feasible: true, reason: undefined };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = `You are a feasibility checker for Runwise, an AI agent builder. Your ONLY job is to determine if a user's agent request uses triggers or actions we DON'T SUPPORT AT ALL (we haven't built the OAuth/credential flow for that service yet).

SUPPORTED TRIGGERS (we have these — always feasible):
${SUPPORTED_TRIGGERS}

SUPPORTED ACTIONS (we have these — always feasible):
${SUPPORTED_ACTIONS}

CRITICAL: Whether the user has CONNECTED an integration (Gmail, Slack, etc.) is IRRELEVANT. Users connect integrations AFTER building the agent. Only reject when the user asks for a service we don't support.

RULES:
1. feasible: false ONLY when the user asks for a TRIGGER we don't support (e.g. Microsoft Teams, Zoom, WhatsApp, Jira, Linear, Salesforce, HubSpot). Explain which service we don't support.
2. feasible: false ONLY when the user asks for an ACTION we don't support (e.g. post to Teams, update Jira, send WhatsApp, create Zoom meeting). Explain which service we don't support.
3. feasible: true when the request uses ONLY our supported triggers and actions — even if the user hasn't connected Gmail, Slack, etc. They will connect them later.
4. When feasible: false, provide a SHORT, FRIENDLY reason (1-3 sentences). Be honest and specific.
5. Examples of infeasible: "post to Microsoft Teams", "watch my Zoom for new meetings", "update Jira when I get an email", "send WhatsApp messages", "create a Salesforce lead"
6. Examples of feasible (always proceed): "summarize my Gmail" (we support Gmail), "post to Slack when I get a new row in Sheets" (we support both), "watch my Gmail and send me an SMS" (we support Gmail + Twilio). Do NOT reject because user might not have connected them yet.

OUTPUT FORMAT (JSON only):
{"feasible": boolean, "reason": "Short explanation when feasible is false"}

Return ONLY valid JSON, no markdown, no code fences. When feasible is true, omit reason or set it to null.`;

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
