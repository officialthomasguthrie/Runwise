/**
 * Agent Custom Tools — storage and format for builder-generated tools
 */

import { createAdminClient } from '@/lib/supabase-admin';
import type { AgentTool } from './types';

export interface AgentCustomToolRow {
  id: string;
  agent_id: string;
  name: string;
  description: string;
  code: string;
  input_schema: Record<string, unknown>;
  language: string;
  config_defaults: Record<string, unknown>;
  /** Service IDs the tool requires the user to connect (e.g. ['slack', 'github']) */
  required_integrations: string[];
  created_at: string;
}

export async function getAgentCustomTools(agentId: string): Promise<AgentCustomToolRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await (supabase as any)
    .from('agent_custom_tools')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[AgentCustomTools] Failed to fetch:', error);
    return [];
  }
  return (data ?? []) as AgentCustomToolRow[];
}

export async function deleteAgentCustomTools(agentId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await (supabase as any)
    .from('agent_custom_tools')
    .delete()
    .eq('agent_id', agentId);
  if (error) {
    throw new Error(`Failed to delete custom tools: ${error.message}`);
  }
}

export async function createAgentCustomTools(
  agentId: string,
  userId: string,
  tools: Array<{
    name: string;
    description: string;
    code: string;
    input_schema: Record<string, unknown>;
    config_defaults?: Record<string, string>;
    requiredIntegrations?: string[];
  }>
): Promise<void> {
  const supabase = createAdminClient();
  const rows = tools.map((t) => ({
    agent_id: agentId,
    user_id: userId,
    name: t.name,
    description: t.description,
    code: t.code,
    input_schema: t.input_schema ?? {},
    language: 'javascript',
    config_defaults: t.config_defaults ?? {},
    required_integrations: t.requiredIntegrations ?? [],
  }));
  const { error } = await (supabase as any)
    .from('agent_custom_tools')
    .insert(rows);
  if (error) throw new Error(`Failed to create custom tools: ${error.message}`);
}

/** Convert custom tool rows to OpenAI ChatCompletionTool format */
export function formatCustomToolsForOpenAI(rows: AgentCustomToolRow[]): AgentTool[] {
  return rows.map((row) => {
    const schema = row.input_schema as { type?: string; properties?: Record<string, any>; required?: string[] };
    return {
      type: 'function',
      function: {
        name: row.name,
        description: row.description,
        parameters: {
          type: 'object',
          properties: schema?.properties ?? {},
          required: schema?.required ?? [],
        },
      },
    } as AgentTool;
  });
}
