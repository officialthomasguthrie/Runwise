/**
 * Owner ↔ agent workspace chat: streaming tool loop, then true SSE token streaming.
 *
 * Tool-call rounds use non-streaming (need full response to reconstruct args).
 * The final text turn uses stream:true so tokens reach the browser one-by-one.
 */

import OpenAI from 'openai';
import type { OpenAIUsageSink } from '@/lib/ai/openai-usage';
import type {
  ChatCompletionMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionToolMessageParam,
} from 'openai/resources/chat/completions';
import type { Agent } from '@/lib/agents/types';
import type { SSEWriter } from '@/lib/agents/chat-pipeline';
import {
  buildWorkspaceChatSystemPrompt,
  formatMemoryBlockWithIds,
  formatActivitiesForWorkspace,
  formatBehavioursForWorkspace,
} from '@/lib/agents/workspace-chat-prompt';
import {
  WORKSPACE_CHAT_TOOLS,
  executeWorkspaceChatTool,
  type WorkspaceChatToolContext,
} from '@/lib/agents/workspace-chat-tools';
import type { AgentActivity, AgentBehaviour, AgentMemory } from '@/lib/agents/types';

const MAX_TOOL_ROUNDS = 10;

function pickChatModel(agent: Agent): string {
  const m = (agent.model ?? '').trim();
  if (!m) return 'gpt-4o';
  if (m.includes('embedding') || m.includes('moderation')) return 'gpt-4o';
  return m;
}

export async function runAgentWorkspaceChat(params: {
  writer: SSEWriter;
  agent: Agent;
  userId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  memories: AgentMemory[];
  activities: AgentActivity[];
  behaviours: AgentBehaviour[];
  capabilitiesLines: string;
  usageSink?: OpenAIUsageSink;
}): Promise<void> {
  const {
    writer,
    agent,
    userId,
    messages: inputMessages,
    memories,
    activities,
    behaviours,
    capabilitiesLines,
    usageSink,
  } = params;

  if (!process.env.OPENAI_API_KEY) {
    writer.text('Unable to reach the AI service. Check configuration and try again.');
    writer.textDone();
    writer.close();
    return;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = pickChatModel(agent);

  const systemPrompt = buildWorkspaceChatSystemPrompt(agent, {
    memoryBlock: formatMemoryBlockWithIds(memories),
    activitiesBlock: formatActivitiesForWorkspace(activities),
    behavioursBlock: formatBehavioursForWorkspace(behaviours),
    capabilitiesBlock: capabilitiesLines,
  });

  const apiMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...inputMessages.slice(-24).map((m) => ({ role: m.role, content: m.content } as ChatCompletionMessageParam)),
  ];

  const toolCtx: WorkspaceChatToolContext = { agentId: agent.id, userId };

  let rounds = 0;

  try {
    while (rounds < MAX_TOOL_ROUNDS) {
      rounds += 1;

      // ── Streaming call ──────────────────────────────────────────────────────
      const stream = await openai.chat.completions.create({
        model,
        messages: apiMessages,
        tools: WORKSPACE_CHAT_TOOLS,
        tool_choice: 'auto',
        temperature: 0.45,
        max_tokens: 4096,
        stream: true,
        stream_options: { include_usage: true },
      });

      // Accumulate tool-call deltas (indexed by delta.index)
      const pendingToolCalls: Record<
        number,
        { id: string; name: string; arguments: string }
      > = {};
      let assistantContent = '';

      for await (const chunk of stream) {
        usageSink?.addFromStreamChunk(chunk);

        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // Stream text tokens straight to the browser
        if (delta.content) {
          assistantContent += delta.content;
          writer.text(delta.content);
        }

        // Accumulate tool-call fragments
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!pendingToolCalls[idx]) {
              pendingToolCalls[idx] = { id: '', name: '', arguments: '' };
            }
            if (tc.id) pendingToolCalls[idx].id = tc.id;
            if (tc.function?.name) pendingToolCalls[idx].name += tc.function.name;
            if (tc.function?.arguments) pendingToolCalls[idx].arguments += tc.function.arguments;
          }
        }
      }

      const toolCallsList = Object.values(pendingToolCalls).filter((t) => t.name);

      // ── No tool calls → text already streamed; we're done ──────────────────
      if (toolCallsList.length === 0) {
        if (!assistantContent.trim()) {
          writer.text("I couldn't generate a reply. Try again.");
        }
        writer.textDone();
        writer.close();
        return;
      }

      // ── Tool calls present → add assistant turn + execute each tool ─────────
      apiMessages.push({
        role: 'assistant',
        content: assistantContent || null,
        tool_calls: toolCallsList.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      } as ChatCompletionAssistantMessageParam);

      for (const tc of toolCallsList) {
        const result = await executeWorkspaceChatTool(tc.name, tc.arguments, toolCtx);
        const toolMsg: ChatCompletionToolMessageParam = {
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(
            result.success ? result.data ?? { ok: true } : { error: result.error }
          ),
        };
        apiMessages.push(toolMsg);
      }
      // Loop → next round will stream the model's reply after seeing tool results
    }

    writer.text(
      'I hit the maximum number of tool steps for one message. Please narrow the request or try again.'
    );
    writer.textDone();
    writer.close();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[runAgentWorkspaceChat]', e);
    writer.text(`Something went wrong: ${msg}`);
    writer.textDone();
    writer.close();
  }
}
