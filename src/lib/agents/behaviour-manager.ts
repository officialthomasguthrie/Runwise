/**
 * Agent Behaviour Manager
 *
 * Bridges agent_behaviours rows with the existing polling_triggers system.
 * Polling behaviours get a polling_triggers row so the Cloudflare Worker
 * picks them up. Schedule/heartbeat behaviours are handled entirely by the
 * Inngest agentHeartbeat function.
 */

import { createAdminClient } from '@/lib/supabase-admin';
import { createPollingTrigger } from '@/lib/workflows/polling-triggers';
import type { AgentBehaviourPlan, AgentBehaviour } from './types';

// ============================================================================
// CREATE
// ============================================================================

/**
 * Persist agent behaviours and, for polling types, create the corresponding
 * polling_trigger row so the Cloudflare Worker starts picking them up.
 *
 * Uses `agentId` as the `workflow_id` in polling_triggers — the config stores
 * `isAgent: true` and `behaviourId` so the worker can route to agent/run.
 */
export async function createAgentBehaviours(
  agentId: string,
  userId: string,
  behaviours: AgentBehaviourPlan[]
): Promise<AgentBehaviour[]> {
  const supabase = createAdminClient();
  const created: AgentBehaviour[] = [];

  for (const plan of behaviours) {
    // 1. Insert into agent_behaviours
    const { data: row, error } = await (supabase as any)
      .from('agent_behaviours')
      .insert({
        agent_id: agentId,
        user_id: userId,
        behaviour_type: plan.behaviourType,
        trigger_type: plan.triggerType ?? null,
        schedule_cron: plan.scheduleCron ?? null,
        config: plan.config ?? {},
        enabled: true,
      })
      .select()
      .single();

    if (error || !row) {
      console.error('[BehaviourManager] Failed to insert behaviour:', error?.message);
      // Non-fatal: skip this behaviour but continue with others
      continue;
    }

    created.push(row as AgentBehaviour);

    // 2. For polling behaviours, also create a polling_triggers row
    if (plan.behaviourType === 'polling' && plan.triggerType) {
      try {
        // Merge isAgent metadata into the config so the Cloudflare Worker and
        // execute-trigger API can distinguish agent triggers from workflow triggers.
        const triggerConfig = {
          ...plan.config,
          isAgent: true,
          agentId,
          behaviourId: row.id,
          userId,
        };

        // Use agentId as workflow_id — the (workflow_id, trigger_type) unique
        // constraint allows one polling trigger per agent per trigger type.
        await createPollingTrigger(agentId, plan.triggerType, triggerConfig);

        console.log(
          `[BehaviourManager] Created polling trigger for agent ${agentId}, ` +
            `type=${plan.triggerType}`
        );
      } catch (err: any) {
        console.error(
          `[BehaviourManager] Failed to create polling trigger for agent ${agentId}:`,
          err?.message
        );
        // Non-fatal: behaviour row exists, worker just won't poll until fixed
      }
    }
  }

  return created;
}

// ============================================================================
// DISABLE
// ============================================================================

/**
 * Pause all behaviours for an agent.
 * Sets agent_behaviours.enabled = false and disables any polling_triggers.
 */
export async function disableAgentBehaviours(
  agentId: string,
  userId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Disable all behaviour rows
  const { error: bhError } = await (supabase as any)
    .from('agent_behaviours')
    .update({ enabled: false })
    .eq('agent_id', agentId)
    .eq('user_id', userId);

  if (bhError) {
    console.error('[BehaviourManager] Failed to disable behaviours:', bhError.message);
  }

  // Disable the polling_triggers row (uses agentId as workflow_id)
  const { error: ptError } = await (supabase as any)
    .from('polling_triggers')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('workflow_id', agentId);

  if (ptError) {
    console.error('[BehaviourManager] Failed to disable polling triggers:', ptError.message);
  }

  console.log(`[BehaviourManager] Disabled all behaviours for agent ${agentId}`);
}

// ============================================================================
// ENABLE
// ============================================================================

/**
 * Resume all behaviours for an agent.
 * Re-enables agent_behaviours rows and polling_triggers.
 */
export async function enableAgentBehaviours(
  agentId: string,
  userId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Re-enable all behaviour rows
  const { error: bhError } = await (supabase as any)
    .from('agent_behaviours')
    .update({ enabled: true })
    .eq('agent_id', agentId)
    .eq('user_id', userId);

  if (bhError) {
    console.error('[BehaviourManager] Failed to enable behaviours:', bhError.message);
  }

  // Re-enable polling triggers and set next_poll_at to now so they fire immediately
  const { error: ptError } = await (supabase as any)
    .from('polling_triggers')
    .update({
      enabled: true,
      next_poll_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('workflow_id', agentId);

  if (ptError) {
    console.error('[BehaviourManager] Failed to enable polling triggers:', ptError.message);
  }

  console.log(`[BehaviourManager] Enabled all behaviours for agent ${agentId}`);
}

// ============================================================================
// DELETE
// ============================================================================

/**
 * Permanently delete all behaviours and polling triggers for an agent.
 * Called when the agent itself is deleted.
 */
export async function deleteAgentBehaviours(
  agentId: string,
  userId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Delete polling_triggers rows first (FK-safe since no FK from polling_triggers → agent_behaviours)
  const { error: ptError } = await (supabase as any)
    .from('polling_triggers')
    .delete()
    .eq('workflow_id', agentId);

  if (ptError) {
    console.error('[BehaviourManager] Failed to delete polling triggers:', ptError.message);
  }

  // Delete all agent_behaviours rows
  const { error: bhError } = await (supabase as any)
    .from('agent_behaviours')
    .delete()
    .eq('agent_id', agentId)
    .eq('user_id', userId);

  if (bhError) {
    console.error('[BehaviourManager] Failed to delete behaviours:', bhError.message);
  }

  console.log(`[BehaviourManager] Deleted all behaviours for agent ${agentId}`);
}
