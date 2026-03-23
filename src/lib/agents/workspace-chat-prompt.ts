/**
 * System prompt and context formatting for owner ↔ agent workspace chat
 * (/api/agents/[id]/chat).
 */

import type { Agent, AgentActivity, AgentBehaviour, AgentMemory } from './types';

const MAX_INSTRUCTIONS_CHARS = 24_000;
const MAX_GOALS_RULES_CHARS = 8_000;

function outboundEmailHint(agent: Agent): string {
  const mode = agent.email_sending_mode ?? 'none';
  if (mode === 'none') return '';
  if (mode === 'user_gmail') {
    return '\nOUTBOUND EMAIL: When running automated tasks, you may use the user\'s connected Gmail (same as production runs). In this chat you usually only discuss configuration — do not send mail unless the owner explicitly asks you to test something.';
  }
  if (mode === 'agent_resend') {
    return '\nOUTBOUND EMAIL: This agent can send from a dedicated platform address (Resend). Automated runs use that path when appropriate.';
  }
  if (mode === 'both') {
    return '\nOUTBOUND EMAIL: Gmail and/or platform (Resend) may be available depending on context — follow your stored instructions for which to use in production runs.';
  }
  return '';
}

/**
 * Memory block with IDs so the model can call workspace_delete_memory.
 */
export function formatMemoryBlockWithIds(memories: AgentMemory[]): string {
  if (memories.length === 0) {
    return 'No memories stored yet. You can add some with the workspace_remember tool when the owner asks.';
  }

  return memories
    .map((m) => {
      const stars = '★'.repeat(Math.min(m.importance, 5));
      return `- id=${m.id} [${stars}] type=${m.memory_type} source=${m.source}\n  ${m.content}`;
    })
    .join('\n');
}

export function formatActivitiesForWorkspace(activities: AgentActivity[]): string {
  if (!activities.length) {
    return 'No recorded runs or events yet.';
  }

  return activities
    .slice(0, 25)
    .map((a) => {
      const tools = (a.actions_taken ?? [])
        .slice(0, 8)
        .map((x) => x.tool)
        .join(', ');
      const toolLine = tools || 'none';
      const err = a.error_message ? ` | error: ${a.error_message.slice(0, 160)}` : '';
      const mem = (a.memories_created?.length ?? 0) > 0 ? ` | memories_created: ${a.memories_created!.length}` : '';
      return `- ${a.created_at} | ${a.status} | trigger: ${a.trigger_summary ?? 'n/a'} | tools: ${toolLine}${mem}${err}`;
    })
    .join('\n');
}

export function formatBehavioursForWorkspace(behaviours: AgentBehaviour[]): string {
  if (!behaviours.length) {
    return 'No triggers or behaviours configured.';
  }

  return behaviours
    .map((b, i) => {
      const desc = ((b as { description?: string }).description ?? '').slice(0, 220);
      return `${i + 1}. id=${b.id} | ${b.behaviour_type} | trigger_type=${b.trigger_type ?? 'n/a'} | enabled=${b.enabled}\n   ${desc || '(no description)'}`;
    })
    .join('\n\n');
}

export function formatCapabilitiesForWorkspace(
  caps: Array<{ slug: string; name: string }>
): string {
  if (!caps.length) return 'None detected from current instructions and behaviours.';
  return caps.map((c) => `- ${c.name} (${c.slug})`).join('\n');
}

export function buildWorkspaceChatSystemPrompt(
  agent: Agent,
  opts: {
    memoryBlock: string;
    activitiesBlock: string;
    behavioursBlock: string;
    capabilitiesBlock: string;
  }
): string {
  const now = new Date().toISOString();
  let instructions = agent.instructions ?? '';
  let instrNote = '';
  if (instructions.length > MAX_INSTRUCTIONS_CHARS) {
    instrNote = `\n\n[Instructions truncated in this prompt at ${MAX_INSTRUCTIONS_CHARS} characters — the full text remains stored on the agent.]`;
    instructions = instructions.slice(0, MAX_INSTRUCTIONS_CHARS);
  }

  let goals = '';
  if (agent.goals_rules != null && agent.goals_rules !== undefined) {
    try {
      const raw = JSON.stringify(agent.goals_rules);
      goals =
        raw.length > MAX_GOALS_RULES_CHARS
          ? raw.slice(0, MAX_GOALS_RULES_CHARS) + '…'
          : raw;
    } catch {
      goals = String(agent.goals_rules);
    }
  }

  return `You are **${agent.name}**, the same AI agent this user configured in Runwise. You are speaking with your **owner** in the agent workspace sidebar (not an automated trigger run).

YOUR PERSONA (stay in character when it fits the conversation):
${agent.persona || 'Professional, helpful, and concise.'}

YOUR OPERATING INSTRUCTIONS (what you do when you run on triggers):
${instructions}${instrNote}
${outboundEmailHint(agent)}

CURRENT AGENT STATE:
- status: ${agent.status}
- model: ${agent.model ?? 'gpt-4o'}
- max_steps per run: ${agent.max_steps ?? 10}
- short_description: ${agent.short_description?.trim() || agent.description?.trim() || '(none)'}

GOALS / RULES (if any):
${goals || '(none configured)'}

INTEGRATIONS / CAPABILITIES (inferred from instructions + behaviours):
${opts.capabilitiesBlock}

TRIGGERS & BEHAVIOURS:
${opts.behavioursBlock}

RECENT RUNS & ACTIVITY (newest first, summarized):
${opts.activitiesBlock}

LONG-TERM MEMORY (each line has id= for edits — use workspace_delete_memory with that UUID only):
${opts.memoryBlock}

CURRENT DATE/TIME (UTC context): ${now}

HOW TO BEHAVE IN THIS CHAT:
- Answer as this agent: same voice and priorities as your persona and instructions, but you **may** explain Runwise UI concepts, triggers, and settings when the owner asks.
- Use the **tools** when the owner wants you to persist something: new memory, remove memory, adjust persona, or change instructions. Confirm briefly what you did after tool success.
- Use **workspace_recall_memories** if you need to search memory beyond the snapshot above.
- Do **not** claim you executed external actions (email, Slack, etc.) unless the owner explicitly asked you to try and you used a tool that succeeded — this sidebar focuses on conversation and configuration; heavy automation still happens on triggers.
- Keep replies focused; use short paragraphs. No emojis unless the owner uses them first.
- Never fabricate activity: only reference runs and tools listed in RECENT RUNS & ACTIVITY above. If asked about older history, say you only see the recent window here.`;

}
