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
POLLING TRIGGERS (require connected integration):
- new-email-received (Gmail) — google-gmail
- new-message-in-slack (Slack) — slack
- new-discord-message (Discord) — discord
- new-row-in-google-sheet (Google Sheets) — google-sheets
- new-github-issue (GitHub) — github
- file-uploaded (Google Drive) — google-drive
- new-form-submission (Google Forms) — google-forms
- new-calendar-event (Google Calendar) — google-calendar
- new-notion-page (Notion) — notion
- new-airtable-record (Airtable) — airtable
- new-trello-card (Trello) — trello

BUILT-IN TRIGGERS (NO integration required — ALWAYS supported):
- schedule: "daily", "hourly", "every morning", "every day at 9am", "time-based", "scheduled", "cron" — ALWAYS feasible
- heartbeat: "daily briefing", "check in every day", "proactive" — ALWAYS feasible
- webhook: HTTP POST to URL — ALWAYS feasible
`.trim();

const SUPPORTED_ACTIONS = `
- Gmail: watch inbox, READ emails, SEND emails, REPLY to emails (we fully support replying/responding to emails)
- Slack: post messages
- Discord: send messages
- Google Sheets: read, add, update rows
- Notion: create pages
- Airtable: create, update, list records
- Trello: create cards
- Google Calendar: create events
- Google Drive: list, upload, share, read, search files
- GitHub: create/list issues, add comments
- Twilio: send SMS
- Twitter/X: post tweets, search
- Stripe: customers, invoices, subscriptions
- Web search, read URL, get current time, HTTP requests
- Memory (remember/recall), send notification to user
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

  const systemPrompt = `You are a feasibility checker for Runwise, an AI agent builder. Your ONLY job is to determine if a user's agent request uses triggers or actions we DON'T SUPPORT AT ALL.

SUPPORTED TRIGGERS:
${SUPPORTED_TRIGGERS}

SUPPORTED ACTIONS:
${SUPPORTED_ACTIONS}

REJECT (feasible: false) ONLY for services we truly don't support:
- Microsoft Teams, Zoom, WhatsApp, Jira, Linear, Salesforce, HubSpot (unless we add them), Asana, Monday.com, etc.
- Anything that requires an integration we have not built

NEVER REJECT (feasible: true) for these — we support them:
- "daily", "hourly", "every morning", "time-based", "scheduled", "cron" → schedule/heartbeat ALWAYS supported
- "reply to emails", "respond to emails", "answer all emails" → Gmail + send_email (we support replying)
- Gmail, Slack, Discord, Google Sheets/Forms/Calendar/Drive, GitHub, Notion, Airtable, Trello
- Webhook, schedule, heartbeat — always available

CRITICAL: Whether the user has CONNECTED an integration is IRRELEVANT. Users connect after building. Only reject when we don't support the SERVICE at all.

RULES:
1. feasible: false ONLY for unsupported services (Teams, Zoom, WhatsApp, Jira, etc.)
2. feasible: true for: schedule, heartbeat, webhook, Gmail, Slack, Discord, Sheets, Forms, Calendar, Drive, GitHub, Notion, Airtable, Trello, Twilio, Twitter, Stripe, and email reply/send/read
3. "reply to emails" or "respond to emails" = feasible (we support Gmail trigger + send/reply)
4. "daily agent", "hourly check", "every morning" = feasible (schedule/heartbeat)

OUTPUT: JSON only: {"feasible": boolean, "reason": "..." when false}
Return ONLY valid JSON. When feasible is true, omit reason or null.`;

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
