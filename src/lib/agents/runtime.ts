/**
 * Agent Runtime — the core agentic loop.
 *
 * Wakes up when an agent receives a trigger, runs GPT-4o with tool calling,
 * executes tools, and loops until the agent decides it is done or max_steps is hit.
 */

import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageFunctionToolCall,
} from 'openai/resources/chat/completions';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAgentMemory, formatMemoryForPrompt, touchMemories } from './memory';
import { AGENT_TOOLS, executeAgentTool } from './tools';
import type {
  Agent,
  AgentRunContext,
  AgentRunResult,
  AgentActivityAction,
} from './types';

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export async function runAgentLoop(context: AgentRunContext): Promise<AgentRunResult> {
  const startedAt = Date.now();
  const actionsLog: AgentActivityAction[] = [];
  const memoriesCreated: string[] = [];
  let totalTokens = 0;

  try {
    const supabase = createAdminClient();

    // ── 1. Load the agent ──────────────────────────────────────────────────
    const { data: agentRow, error: agentError } = await (supabase as any)
      .from('agents')
      .select('*')
      .eq('id', context.agentId)
      .eq('user_id', context.userId)
      .single();

    if (agentError || !agentRow) {
      throw new Error(`Agent not found: ${context.agentId}`);
    }

    const agent = agentRow as Agent;

    if (agent.status !== 'active') {
      await writeActivityLog(supabase, context, agent, 'skipped', actionsLog, memoriesCreated, 0, `Agent is ${agent.status}`);
      return { success: true, actionsCount: 0, memoriesCreated: 0, tokensUsed: 0 };
    }

    // ── 2. Load memory ─────────────────────────────────────────────────────
    const memories = await getAgentMemory(context.agentId, context.userId, 50);
    const formattedMemory = formatMemoryForPrompt(memories);
    const memoryIds = memories.map((m) => m.id);

    // ── 3. Build the system prompt ─────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(agent, formattedMemory);

    // ── 4. Build the trigger user message ─────────────────────────────────
    const triggerMessage = buildTriggerMessage(context);

    // ── 5. Initialise the OpenAI client + message history ─────────────────
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: triggerMessage },
    ];

    const maxSteps = agent.max_steps ?? 10;
    let stepCount = 0;

    // ── 6. Agentic loop ────────────────────────────────────────────────────
    while (stepCount < maxSteps) {
      const response = await openai.chat.completions.create({
        model: agent.model ?? 'gpt-4o',
        messages,
        tools: AGENT_TOOLS,
        tool_choice: 'auto',
        temperature: 0.4,
      });

      const choice = response.choices[0];
      totalTokens += response.usage?.total_tokens ?? 0;

      // Add the assistant turn to history
      messages.push(choice.message as ChatCompletionMessageParam);

      const toolCalls = choice.message.tool_calls;

      // No tool calls — model is done
      if (!toolCalls || toolCalls.length === 0) {
        if (choice.message.content) {
          console.log(`[AgentRuntime] Agent ${agent.name} final response: ${choice.message.content}`);
        }
        break;
      }

      // Execute all tool calls in this turn (GPT-4o can batch them)
      for (const rawToolCall of toolCalls) {
        // Agents only use function-type tools; skip any custom tool calls
        if (!('function' in rawToolCall)) continue;
        const toolCall = rawToolCall as ChatCompletionMessageFunctionToolCall;
        const toolName = toolCall.function.name;

        // do_nothing is a clean stop signal
        if (toolName === 'do_nothing') {
          const params = safeParseArgs(toolCall.function.arguments);
          console.log(`[AgentRuntime] Agent ${agent.name} called do_nothing: ${params.reason ?? ''}`);
          actionsLog.push({
            tool: 'do_nothing',
            params,
            result: { skipped: true },
            timestamp: new Date().toISOString(),
          });
          // Push a synthetic tool result and break outer loop
          messages.push({
            role: 'tool',
            tool_call_id: (rawToolCall as any).id,
            content: JSON.stringify({ skipped: true }),
          });
          stepCount = maxSteps; // force exit
          break;
        }

        const params = safeParseArgs(toolCall.function.arguments);

        console.log(`[AgentRuntime] Agent ${agent.name} → ${toolName}`, params);

        const result = await executeAgentTool(toolName, params, context);

        actionsLog.push({
          tool: toolName,
          params,
          result: result.data ?? result.error,
          timestamp: new Date().toISOString(),
        });

        // Track memories written by the remember tool
        if (toolName === 'remember' && result.success && result.data?.memoryId) {
          memoriesCreated.push(result.data.content);
        }

        // Append tool result to messages so the model can reflect
        messages.push({
          role: 'tool',
          tool_call_id: (rawToolCall as any).id,
          content: JSON.stringify(
            result.success
              ? result.data
              : { error: result.error }
          ),
        });
      }

      stepCount++;
    }

    if (stepCount >= maxSteps) {
      console.warn(`[AgentRuntime] Agent ${agent.name} hit max_steps limit (${maxSteps})`);
    }

    // ── 7. Touch accessed memories ────────────────────────────────────────
    if (memoryIds.length > 0) {
      await touchMemories(memoryIds).catch(() => { /* non-critical */ });
    }

    // ── 8. Write activity log ─────────────────────────────────────────────
    const triggerSummary = buildTriggerSummary(context);
    await writeActivityLog(
      supabase, context, agent, 'success',
      actionsLog, memoriesCreated, totalTokens
    );

    console.log(
      `[AgentRuntime] Agent ${agent.name} completed: ${actionsLog.length} actions, ` +
      `${memoriesCreated.length} memories, ${totalTokens} tokens, ` +
      `${Date.now() - startedAt}ms`
    );

    return {
      success: true,
      actionsCount: actionsLog.length,
      memoriesCreated: memoriesCreated.length,
      tokensUsed: totalTokens,
    };
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    console.error(`[AgentRuntime] Agent ${context.agentId} failed:`, errorMessage);

    // Best-effort activity log on failure
    try {
      const supabase = createAdminClient();
      await writeActivityLog(
        supabase, context, null, 'error',
        actionsLog, memoriesCreated, totalTokens, errorMessage
      );
    } catch { /* ignore secondary failure */ }

    return {
      success: false,
      actionsCount: actionsLog.length,
      memoriesCreated: memoriesCreated.length,
      tokensUsed: totalTokens,
      error: errorMessage,
    };
  }
}

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

function buildSystemPrompt(agent: Agent, formattedMemory: string): string {
  const now = new Date().toISOString();

  return `You are ${agent.name}, a personal AI assistant.

PERSONA:
${agent.persona || 'Professional, helpful, and concise.'}

YOUR INSTRUCTIONS:
${agent.instructions}

WHAT YOU KNOW (MEMORY):
${formattedMemory}

CURRENT DATE/TIME: ${now}

You have access to tools to take actions. Use them to fulfil your instructions.
When you are done, call do_nothing if no action was needed, or simply stop responding.
Never take more than ${agent.max_steps ?? 10} actions in a single run.
Always check your memory before taking action — you may already know what to do.
Be decisive. Do not ask clarifying questions; make sensible decisions based on your instructions.`;
}

function buildTriggerMessage(context: AgentRunContext): string {
  const { triggerType, triggerData } = context;
  const polledAt = triggerData.polledAt
    ? new Date(triggerData.polledAt).toLocaleString('en-GB', { timeZone: 'UTC' }) + ' UTC'
    : 'just now';

  // Format trigger data into a readable description
  const items = triggerData.items ?? [];

  const triggerLabels: Record<string, string> = {
    'new-email-received': 'New email(s) received',
    'new-message-in-slack': 'New Slack message(s)',
    'new-discord-message': 'New Discord message(s)',
    'new-row-in-google-sheet': 'New row(s) in Google Sheet',
    'new-github-issue': 'New GitHub issue(s)',
    'file-uploaded': 'File(s) uploaded',
    'new-form-submission': 'New form submission(s)',
    heartbeat: 'Scheduled check-in',
    manual: 'Manually triggered',
  };

  const label = triggerLabels[triggerType] ?? triggerType;

  const lines: string[] = [
    `**TRIGGER: ${label}**`,
    `Time: ${polledAt}`,
  ];

  if (items.length > 0) {
    lines.push(`\nData (${items.length} item${items.length > 1 ? 's' : ''}):`);
    for (const item of items.slice(0, 10)) {
      lines.push('```json');
      lines.push(JSON.stringify(item, null, 2).slice(0, 1000));
      lines.push('```');
    }
    if (items.length > 10) {
      lines.push(`... and ${items.length - 10} more items.`);
    }
  } else if (triggerType === 'heartbeat') {
    lines.push('\nThis is your scheduled check-in. Review your instructions and take any proactive actions needed.');
  } else {
    lines.push('\nNo data items were provided with this trigger.');
  }

  lines.push('\nBased on the above, decide what actions (if any) to take.');

  return lines.join('\n');
}

function buildTriggerSummary(context: AgentRunContext): string {
  const { triggerType, triggerData } = context;
  const items = triggerData.items ?? [];
  const count = items.length;

  const summaries: Record<string, (items: any[]) => string> = {
    'new-email-received': (i) => {
      const first = i[0];
      if (!first) return 'New email received';
      const from = first.from || first.sender || 'unknown sender';
      const subject = first.subject || 'no subject';
      return count > 1
        ? `${count} new emails (first from ${from}: "${subject}")`
        : `New email from ${from}: "${subject}"`;
    },
    'new-message-in-slack': (i) => {
      const first = i[0];
      const user = first?.user || first?.username || 'someone';
      const text = first?.text?.slice(0, 60) || '';
      return count > 1 ? `${count} new Slack messages` : `New Slack message from ${user}: "${text}"`;
    },
    'new-discord-message': (i) => {
      const first = i[0];
      const author = first?.author?.username || 'someone';
      const content = first?.content?.slice(0, 60) || '';
      return count > 1 ? `${count} new Discord messages` : `New Discord message from ${author}: "${content}"`;
    },
    heartbeat: () => 'Scheduled check-in',
    manual: () => 'Manually triggered',
  };

  const fn = summaries[triggerType];
  return fn ? fn(items) : `Trigger: ${triggerType} (${count} items)`;
}

// ============================================================================
// HELPERS
// ============================================================================

function safeParseArgs(raw: string): Record<string, any> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeActivityLog(
  supabase: any,
  context: AgentRunContext,
  agent: Agent | null,
  status: 'success' | 'error' | 'skipped',
  actions: AgentActivityAction[],
  memoriesCreated: string[],
  tokensUsed: number,
  errorMessage?: string
): Promise<void> {
  try {
    const triggerSummary = agent ? buildTriggerSummary(context) : `Trigger: ${context.triggerType}`;

    await (supabase as any).from('agent_activity').insert({
      agent_id: context.agentId,
      user_id: context.userId,
      run_id: context.runId ?? null,
      behaviour_id: context.behaviourId ?? null,
      trigger_summary: triggerSummary,
      actions_taken: actions,
      memories_created: memoriesCreated,
      status,
      error_message: errorMessage ?? null,
      tokens_used: tokensUsed,
    });
  } catch (err) {
    console.error('[AgentRuntime] Failed to write activity log:', err);
  }
}
