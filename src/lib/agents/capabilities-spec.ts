/**
 * Canonical Capabilities Spec — single source of truth for what agents can do.
 *
 * Used by feasibility checker and planner. When tools or triggers change, update here
 * so the AI has accurate, exhaustive knowledge without example-based guessing.
 */

import { AGENT_TOOLS } from './tools';

// ============================================================================
// TRIGGERS — exhaustive list from planner TRIGGER_CATALOGUE
// ============================================================================

export const TRIGGER_SPEC = [
  { id: 'new-email-received', service: 'google-gmail', desc: 'Watch Gmail inbox for new emails' },
  { id: 'new-message-in-slack', service: 'slack', desc: 'Watch Slack channel for new messages' },
  { id: 'new-discord-message', service: 'discord', desc: 'Watch Discord channel for new messages' },
  { id: 'new-row-in-google-sheet', service: 'google-sheets', desc: 'Watch Google Sheet for new rows' },
  { id: 'new-github-issue', service: 'github', desc: 'Watch GitHub repo for new issues' },
  { id: 'file-uploaded', service: 'google-drive', desc: 'Watch Google Drive for new file uploads' },
  { id: 'new-form-submission', service: 'google-forms', desc: 'Watch Google Forms for new submissions' },
  { id: 'new-calendar-event', service: 'google-calendar', desc: 'Watch Google Calendar for new events' },
  { id: 'new-notion-page', service: 'notion', desc: 'Watch Notion database for new pages' },
  { id: 'new-airtable-record', service: 'airtable', desc: 'Watch Airtable base for new records' },
  { id: 'new-trello-card', service: 'trello', desc: 'Watch Trello board for new cards' },
  { id: 'schedule', service: null, desc: 'Run on cron schedule (daily, hourly, etc.) — no integration required' },
  { id: 'heartbeat', service: null, desc: 'Proactive check-in on schedule — no integration required' },
  { id: 'webhook', service: null, desc: 'Run when HTTP POST hits webhook URL — no integration required' },
] as const;

// ============================================================================
// TOOLS — derived from AGENT_TOOLS (actual runtime tools)
// ============================================================================

export function getToolsSpec(): string {
  return AGENT_TOOLS.map(
    (t) => `- ${t.function.name}: ${t.function.description}`
  ).join('\n');
}

export function getTriggersSpec(): string {
  return TRIGGER_SPEC.map((t) =>
    t.service
      ? `- ${t.id} (${t.service}): ${t.desc}`
      : `- ${t.id}: ${t.desc} — no integration required`
  ).join('\n');
}

/** Full capability spec for feasibility and planner prompts */
export function getCapabilitySpecForAI(): string {
  return `
TRIGGERS (how/when the agent runs — this is the EXHAUSTIVE list):
${getTriggersSpec()}

TOOLS (what the agent can DO — this is the EXHAUSTIVE list from our codebase):
${getToolsSpec()}

OUTBOUND EMAIL — TWO TOOLS (planner must set emailSendingMode on the plan JSON):
• send_email_gmail — sends from the user's Gmail. Requires Google Gmail OAuth (google-gmail). Use when the user wants mail from their own mailbox.
• send_email_resend — sends from a Runwise-managed address for this agent. No Gmail OAuth for that send path; platform provisions the address at deploy. Use when the user wants a dedicated agent/from address.
Reading Gmail, inbox triggers (new-email-received), or replying in Gmail threads still require google-gmail even if outbound marketing mail uses send_email_resend.

There are no other triggers or tools. If the user's request can be fulfilled by combining triggers and tools from the above lists, it is feasible.
`.trim();
}
