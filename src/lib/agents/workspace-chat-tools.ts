/**
 * Tools available only in owner ↔ agent workspace chat (not production runs).
 */

import { createAdminClient } from '@/lib/supabase-admin';
import { writeMemory, getAgentMemory, deleteMemory } from './memory';
import { enableAgentBehaviours, disableAgentBehaviours } from './behaviour-manager';
import {
  planFromBehaviours,
  buildIntegrationCheckListForPolling,
} from './chat-pipeline';
import { getUserIntegrations } from '@/lib/integrations/service';
import { inngest } from '@/inngest/client';
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
  // ── Agent control tools ──────────────────────────────────────────────────────
  {
    type: 'function' as const,
    function: {
      name: 'workspace_pause_agent',
      description:
        'Pause or resume this agent. Call when the owner says "pause", "stop", "resume", "unpause", or "restart". ' +
        'If current status is active it will be paused; if paused it will be resumed. ' +
        'Returns new_status so you can confirm the change.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Brief reason the owner gave for pausing/resuming (optional, for your reply)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'workspace_run_agent',
      description:
        'Manually trigger an immediate agent run (fires an Inngest job). ' +
        'Only works when the agent is active. Use when the owner says "run now", "go", "do it", "find leads", "execute", or asks you to perform a task right now. ' +
        'Returns an event_id you can report back.',
      parameters: {
        type: 'object',
        properties: {
          task_hint: {
            type: 'string',
            description:
              'One-sentence description of what the owner wants done on this run (stored in your reply only — the agent uses its own instructions at runtime)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'workspace_update_goals_rules',
      description:
        'Add, replace, or remove goals and rules. ' +
        'Goals are things the agent aims to achieve; rules are constraints on behaviour. ' +
        'Call when the owner says things like "focus on founders", "aim for X", "never do Y", "add a goal", "remove rule", "update goals". ' +
        'Provide the COMPLETE new list — existing items not included will be deleted.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Full replacement list of goals and rules',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['goal', 'rule'],
                  description: '"goal" for objectives, "rule" for constraints/restrictions',
                },
                label: {
                  type: 'string',
                  description: 'Clear single-sentence description of the goal or rule',
                },
              },
              required: ['type', 'label'],
            },
          },
        },
        required: ['items'],
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

      case 'workspace_pause_agent': {
        // Read current status
        const { data: agentRow, error: fetchErr } = await (admin as any)
          .from('agents')
          .select('id, status')
          .eq('id', ctx.agentId)
          .eq('user_id', ctx.userId)
          .single();
        if (fetchErr || !agentRow) return { success: false, error: 'Agent not found' };

        const currentStatus: string = agentRow.status;
        if (currentStatus !== 'active' && currentStatus !== 'paused') {
          return {
            success: false,
            error: `Cannot pause/resume agent with status "${currentStatus}". Agent must be active or paused.`,
          };
        }

        const newStatus = currentStatus === 'active' ? 'paused' : 'active';

        // When resuming, verify required integrations are still connected
        if (newStatus === 'active') {
          const { data: behaviours } = await (admin as any)
            .from('agent_behaviours')
            .select('behaviour_type, trigger_type, config, description')
            .eq('agent_id', ctx.agentId);
          const plan = planFromBehaviours(behaviours ?? []);
          const integrations = await getUserIntegrations(ctx.userId);
          const connectedServices = integrations
            .map((i: { service_name?: string }) => i.service_name)
            .filter(Boolean) as string[];
          const required = buildIntegrationCheckListForPolling(plan, connectedServices);
          const disconnected = required.filter((i: { connected: boolean }) => !i.connected);
          if (disconnected.length > 0) {
            return {
              success: false,
              error: `Cannot resume: ${disconnected.map((d: { label: string }) => d.label).join(', ')} not connected.`,
            };
          }
        }

        const { error: updateErr } = await (admin as any)
          .from('agents')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', ctx.agentId)
          .eq('user_id', ctx.userId);
        if (updateErr) return { success: false, error: updateErr.message };

        if (newStatus === 'paused') {
          await disableAgentBehaviours(ctx.agentId, ctx.userId);
        } else {
          await enableAgentBehaviours(ctx.agentId, ctx.userId);
        }

        return {
          success: true,
          data: { previous_status: currentStatus, new_status: newStatus },
        };
      }

      case 'workspace_run_agent': {
        const { data: agentRow, error: fetchErr } = await (admin as any)
          .from('agents')
          .select('id, status, name')
          .eq('id', ctx.agentId)
          .eq('user_id', ctx.userId)
          .single();
        if (fetchErr || !agentRow) return { success: false, error: 'Agent not found' };

        if (agentRow.status !== 'active') {
          return {
            success: false,
            error: `Agent must be active to run. Current status: "${agentRow.status}". Activate or resume it first.`,
          };
        }

        let eventId: string | undefined;
        try {
          const sendResult = await inngest.send({
            name: 'agent/run',
            data: {
              agentId: ctx.agentId,
              userId: ctx.userId,
              behaviourId: null,
              triggerType: 'manual',
              triggerData: { hint: String(params.task_hint ?? '').trim() || undefined },
            },
          });
          eventId =
            (sendResult as any)?.ids?.[0] ??
            (sendResult as any)?.[0]?.ids?.[0] ??
            (sendResult as any)?.[0] ??
            undefined;
        } catch (inngestErr: unknown) {
          const msg = inngestErr instanceof Error ? inngestErr.message : String(inngestErr);
          return { success: false, error: `Failed to trigger run: ${msg}` };
        }

        return {
          success: true,
          data: { triggered: true, event_id: eventId ?? null, agent_name: agentRow.name },
        };
      }

      case 'workspace_update_goals_rules': {
        const rawItems = Array.isArray(params.items) ? params.items : [];
        const cleaned = rawItems
          .filter(
            (item: unknown) =>
              item !== null &&
              typeof item === 'object' &&
              typeof (item as Record<string, unknown>).label === 'string' &&
              ((item as Record<string, unknown>).label as string).trim()
          )
          .map((item: unknown, i: number) => {
            const g = item as Record<string, unknown>;
            return {
              id: `gr-${Date.now()}-${i}`,
              type: ['goal', 'rule'].includes(String(g.type)) ? (g.type as 'goal' | 'rule') : 'goal',
              label: (g.label as string).trim(),
            };
          });

        const { error: uErr } = await (admin as any)
          .from('agents')
          .update({ goals_rules: cleaned, updated_at: new Date().toISOString() })
          .eq('id', ctx.agentId)
          .eq('user_id', ctx.userId);
        if (uErr) return { success: false, error: uErr.message };

        return {
          success: true,
          data: {
            count: cleaned.length,
            goals: cleaned.filter((i: { type: string }) => i.type === 'goal').length,
            rules: cleaned.filter((i: { type: string }) => i.type === 'rule').length,
            items: cleaned,
          },
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}
