/**
 * Owner ↔ agent workspace chat: non-streaming tool loop, then SSE text deltas.
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
const CHUNK_CHARS = 40;

function pickChatModel(agent: Agent): string {
  const m = (agent.model ?? '').trim();
  if (!m) return 'gpt-4o';
  // Workspace chat needs tool calling; avoid obviously non-chat ids
  if (m.includes('embedding') || m.includes('moderation')) return 'gpt-4o';
  return m;
}

function streamPlainText(writer: SSEWriter, text: string) {
  const s = text.trim() || "I couldn't generate a reply. Try again.";
  for (let i = 0; i < s.length; i += CHUNK_CHARS) {
    writer.text(s.slice(i, i + CHUNK_CHARS));
  }
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

  const history: ChatCompletionMessageParam[] = inputMessages.slice(-24).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const toolCtx: WorkspaceChatToolContext = { agentId: agent.id, userId };

  const apiMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history,
  ];

  let rounds = 0;

  try {
    while (rounds < MAX_TOOL_ROUNDS) {
      rounds += 1;

      const completion = await openai.chat.completions.create({
        model,
        messages: apiMessages,
        tools: WORKSPACE_CHAT_TOOLS,
        tool_choice: 'auto',
        temperature: 0.45,
        max_tokens: 4096,
      });

      usageSink?.addFromChatCompletion(completion);

      const choice = completion.choices[0]?.message;
      if (!choice) {
        writer.text('No response from the model.');
        writer.textDone();
        writer.close();
        return;
      }

      apiMessages.push(choice as ChatCompletionAssistantMessageParam);

      const toolCalls = choice.tool_calls;
      if (!toolCalls?.length) {
        streamPlainText(writer, choice.content ?? '');
        writer.textDone();
        writer.close();
        return;
      }

      for (const tc of toolCalls) {
        if (tc.type !== 'function') continue;
        const name = tc.function.name;
        const args = tc.function.arguments ?? '{}';
        const result = await executeWorkspaceChatTool(name, args, toolCtx);
        const toolMsg: ChatCompletionToolMessageParam = {
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(
            result.success ? result.data ?? { ok: true } : { error: result.error }
          ),
        };
        apiMessages.push(toolMsg);
      }
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
