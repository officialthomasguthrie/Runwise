/**
 * Tools available only in owner ↔ agent workspace chat (not production runs).
 */

import { createAdminClient } from '@/lib/supabase-admin';
import { writeMemory, getAgentMemory, deleteMemory } from './memory';
import type { AgentMemoryType } from './types';
import type { ToolResult } from './tools';

export interface WorkspaceChatToolContext {
  agentId: string;
  userId: string;
}

const MEMORY_TYPES: AgentMemoryType[] = [
  'fact',
  'preference',
  'contact',
  'event',
  'instruction',
];

/** OpenAI Chat Completions tool definitions */
export const WORKSPACE_CHAT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'workspace_remember',
      description:
        'Store a new long-term memory for this agent when the owner asks you to remember something. Uses source=user (workspace).',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'What to remember (clear and concise)' },
          memory_type: {
            type: 'string',
            enum: MEMORY_TYPES,
            description: 'Category',
          },
          importance: {
            type: 'number',
            description: '1–10, default 5',
          },
        },
        required: ['content', 'memory_type'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'workspace_delete_memory',
      description:
        'Delete one memory by UUID. Only use ids listed in the system prompt memory section.',
      parameters: {
        type: 'object',
        properties: {
          memory_id: { type: 'string', description: 'UUID from the id= field in MEMORY section' },
        },
        required: ['memory_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'workspace_recall_memories',
      description:
        'Search stored memories by keyword when you need more detail than the prompt snapshot.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search phrase' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'workspace_append_instructions',
      description:
        'Append text to the end of this agent\'s operating instructions when the owner wants to add a rule or behaviour note. Prefer this over full replace.',
      parameters: {
        type: 'object',
        properties: {
          text_to_append: {
            type: 'string',
            description: 'Paragraph(s) to append (will be separated with blank lines)',
          },
        },
        required: ['text_to_append'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'workspace_replace_instructions',
      description:
        'Replace the entire operating instructions field. Only when the owner explicitly wants a full rewrite — confirm you understood.',
      parameters: {
        type: 'object',
        properties: {
          new_instructions: { type: 'string', description: 'Complete new instructions body' },
        },
        required: ['new_instructions'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'workspace_update_persona',
      description: 'Update the persona field when the owner wants to change tone or role description.',
      parameters: {
        type: 'object',
        properties: {
          new_persona: { type: 'string', description: 'Full new persona text' },
        },
        required: ['new_persona'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'workspace_update_short_description',
      description: 'Update the short one-line description shown in the UI.',
      parameters: {
        type: 'object',
        properties: {
          short_description: { type: 'string', description: 'New short description' },
        },
        required: ['short_description'],
      },
    },
  },
];

const MAX_INSTRUCTIONS_BYTES = 120_000;

function safeParseArgs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function executeWorkspaceChatTool(
  toolName: string,
  rawArgs: string,
  ctx: WorkspaceChatToolContext
): Promise<ToolResult> {
  const params = safeParseArgs(rawArgs);
  const admin = createAdminClient();

  try {
    switch (toolName) {
      case 'workspace_remember': {
        const content = String(params.content ?? '').trim();
        const memory_type = params.memory_type as AgentMemoryType;
        const importance = Math.min(10, Math.max(1, Number(params.importance) || 5));
        if (!content || !MEMORY_TYPES.includes(memory_type)) {
          return { success: false, error: 'content and valid memory_type required' };
        }
        const memory = await writeMemory(
          ctx.agentId,
          ctx.userId,
          content,
          memory_type,
          importance,
          'user'
        );
        return {
          success: true,
          data: { memory_id: memory.id, content: memory.content, memory_type: memory.memory_type },
        };
      }

      case 'workspace_delete_memory': {
        const memory_id = String(params.memory_id ?? '').trim();
        if (!memory_id) return { success: false, error: 'memory_id required' };
        const { data: row, error: selErr } = await (admin as any)
          .from('agent_memory')
          .select('id')
          .eq('id', memory_id)
          .eq('user_id', ctx.userId)
          .eq('agent_id', ctx.agentId)
          .maybeSingle();
        if (selErr || !row) {
          return { success: false, error: 'Memory not found for this agent' };
        }
        await deleteMemory(memory_id, ctx.userId);
        return { success: true, data: { deleted: memory_id } };
      }

      case 'workspace_recall_memories': {
        const query = String(params.query ?? '').trim().toLowerCase();
        if (!query) return { success: false, error: 'query required' };
        const all = await getAgentMemory(ctx.agentId, ctx.userId, 120);
        const relevant = all.filter((m) => m.content.toLowerCase().includes(query));
        const results = relevant.length > 0 ? relevant.slice(0, 15) : all.slice(0, 15);
        return {
          success: true,
          data: {
            memories: results.map((m) => ({
              id: m.id,
              content: m.content,
              type: m.memory_type,
              importance: m.importance,
            })),
          },
        };
      }

      case 'workspace_append_instructions': {
        const text = String(params.text_to_append ?? '').trim();
        if (!text) return { success: false, error: 'text_to_append required' };
        const { data: agentRow, error: gErr } = await (admin as any)
          .from('agents')
          .select('instructions')
          .eq('id', ctx.agentId)
          .eq('user_id', ctx.userId)
          .single();
        if (gErr || !agentRow) return { success: false, error: 'Agent not found' };
        const current = (agentRow.instructions as string) ?? '';
        const next = `${current.trimEnd()}\n\n${text}`.trim();
        if (next.length > MAX_INSTRUCTIONS_BYTES) {
          return { success: false, error: 'Instructions would exceed maximum length' };
        }
        const { error: uErr } = await (admin as any)
          .from('agents')
          .update({ instructions: next, updated_at: new Date().toISOString() })
          .eq('id', ctx.agentId)
          .eq('user_id', ctx.userId);
        if (uErr) return { success: false, error: uErr.message };
        return { success: true, data: { length: next.length } };
      }

      case 'workspace_replace_instructions': {
        const new_instructions = String(params.new_instructions ?? '').trim();
        if (!new_instructions) return { success: false, error: 'new_instructions required' };
        if (new_instructions.length > MAX_INSTRUCTIONS_BYTES) {
          return { success: false, error: 'Instructions exceed maximum length' };
        }
        const { error: uErr } = await (admin as any)
          .from('agents')
          .update({
            instructions: new_instructions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ctx.agentId)
          .eq('user_id', ctx.userId);
        if (uErr) return { success: false, error: uErr.message };
        return { success: true, data: { length: new_instructions.length } };
      }

      case 'workspace_update_persona': {
        const new_persona = String(params.new_persona ?? '').trim();
        if (!new_persona) return { success: false, error: 'new_persona required' };
        const { error: uErr } = await (admin as any)
          .from('agents')
          .update({ persona: new_persona, updated_at: new Date().toISOString() })
          .eq('id', ctx.agentId)
          .eq('user_id', ctx.userId);
        if (uErr) return { success: false, error: uErr.message };
        return { success: true, data: { ok: true } };
      }

      case 'workspace_update_short_description': {
        const short_description = String(params.short_description ?? '').trim();
        if (!short_description) return { success: false, error: 'short_description required' };
        const { error: uErr } = await (admin as any)
          .from('agents')
          .update({
            short_description: short_description,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ctx.agentId)
          .eq('user_id', ctx.userId);
        if (uErr) return { success: false, error: uErr.message };
        return { success: true, data: { ok: true } };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}
