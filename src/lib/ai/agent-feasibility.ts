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
 * Returns feasible: false when the user asks for integrations or capabilities we don't support,
 * or when they require a trigger/action for an integration they haven't connected.
 */
export async function checkAgentFeasibility(
  userDescription: string,
  userIntegrationNames: string[]
): Promise<FeasibilityResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { feasible: true, reason: undefined };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const connectedList =
    userIntegrationNames.length > 0
      ? userIntegrationNames.join(', ')
      : 'None';

  const systemPrompt = `You are a feasibility checker for Runwise, an AI agent builder. Your ONLY job is to determine if a user's agent request can be fulfilled with our current capabilities.

SUPPORTED TRIGGERS (what can start an agent):
${SUPPORTED_TRIGGERS}

SUPPORTED ACTIONS (what agents can do):
${SUPPORTED_ACTIONS}

USER'S CONNECTED INTEGRATIONS: ${connectedList}

RULES:
1. If the user asks for a TRIGGER we don't support (e.g. Microsoft Teams, Zoom, WhatsApp, Jira, Linear, Salesforce) → feasible: false. Explain which part we don't support.
2. If the user asks for an ACTION we don't support (e.g. post to Teams, update Jira, send WhatsApp, create Zoom meeting) → feasible: false. Explain which part we don't support.
3. If the user asks for a trigger that REQUIRES an integration they haven't connected (e.g. "watch my Gmail" but they have no Google connected) → feasible: false. Say they need to connect that integration first.
4. If the request can be fulfilled with our triggers and actions (possibly using the user's connected integrations) → feasible: true.
5. When feasible: false, provide a SHORT, FRIENDLY reason (1-3 sentences). Be honest and specific. Don't apologize excessively.
6. Examples of infeasible: "post to Microsoft Teams", "watch my Zoom for new meetings", "update Jira when I get an email", "send WhatsApp messages", "create a Salesforce lead"
7. Examples of feasible: "summarize my Gmail" (if Gmail connected), "post to Slack when I get a new row in Sheets" (if both connected), "webhook that sends an email" (webhook + Gmail/SendGrid)

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
