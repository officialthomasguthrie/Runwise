import { createAdminClient } from '@/lib/supabase-admin';
import type { AgentMemory, AgentMemoryType } from './types';

/**
 * Fetch memories for an agent, ordered by importance desc, then recency.
 */
export async function getAgentMemory(
  agentId: string,
  userId: string,
  limit = 50
): Promise<AgentMemory[]> {
  const supabase = createAdminClient();

  const { data, error } = await (supabase as any)
    .from('agent_memory')
    .select('*')
    .eq('agent_id', agentId)
    .eq('user_id', userId)
    .order('importance', { ascending: false })
    .order('last_accessed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[AgentMemory] Failed to fetch memories:', error);
    return [];
  }

  return (data ?? []) as AgentMemory[];
}

/**
 * Write a new memory entry for an agent.
 */
export async function writeMemory(
  agentId: string,
  userId: string,
  content: string,
  memoryType: AgentMemoryType = 'fact',
  importance = 5,
  source: 'agent' | 'user' = 'agent'
): Promise<AgentMemory> {
  const supabase = createAdminClient();

  const { data, error } = await (supabase as any)
    .from('agent_memory')
    .insert({
      agent_id: agentId,
      user_id: userId,
      content,
      memory_type: memoryType,
      importance,
      source,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[AgentMemory] Failed to write memory: ${error?.message}`);
  }

  return data as AgentMemory;
}

/**
 * Delete a specific memory by ID, scoped to the user for safety.
 */
export async function deleteMemory(memoryId: string, userId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await (supabase as any)
    .from('agent_memory')
    .delete()
    .eq('id', memoryId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`[AgentMemory] Failed to delete memory: ${error.message}`);
  }
}

/**
 * Format memories into a readable block for the LLM system prompt.
 * Groups by type and formats with importance indicators.
 */
export function formatMemoryForPrompt(memories: AgentMemory[]): string {
  if (memories.length === 0) {
    return 'No memories stored yet.';
  }

  const typeLabels: Record<AgentMemoryType, string> = {
    fact: 'FACTS',
    preference: 'PREFERENCES',
    contact: 'CONTACTS',
    event: 'PAST EVENTS',
    instruction: 'SPECIAL INSTRUCTIONS',
  };

  const grouped: Partial<Record<AgentMemoryType, AgentMemory[]>> = {};
  for (const memory of memories) {
    if (!grouped[memory.memory_type]) {
      grouped[memory.memory_type] = [];
    }
    grouped[memory.memory_type]!.push(memory);
  }

  const sections: string[] = [];

  for (const [type, label] of Object.entries(typeLabels) as [AgentMemoryType, string][]) {
    const group = grouped[type];
    if (!group || group.length === 0) continue;

    const lines = group.map((m) => {
      const stars = '★'.repeat(Math.min(m.importance, 5));
      return `  - [${stars}] ${m.content}`;
    });

    sections.push(`${label}:\n${lines.join('\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * Update last_accessed_at for a set of memory IDs (call after reading memories for a run).
 */
export async function touchMemories(memoryIds: string[]): Promise<void> {
  if (memoryIds.length === 0) return;

  const supabase = createAdminClient();

  await (supabase as any)
    .from('agent_memory')
    .update({ last_accessed_at: new Date().toISOString() })
    .in('id', memoryIds);
}
