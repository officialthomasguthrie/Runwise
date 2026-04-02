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
import { mergeScheduleConfigForPersist } from './schedule-cron-ui';
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
    const description =
      typeof (plan as any).description === 'string' && (plan as any).description.trim()
        ? (plan as any).description.trim()
        : null;

    const rawConfig =
      plan.config && typeof plan.config === 'object' ? { ...plan.config } : {};
    const persistedConfig =
      plan.behaviourType === 'schedule' || plan.behaviourType === 'heartbeat'
        ? mergeScheduleConfigForPersist(plan.scheduleCron ?? null, rawConfig)
        : rawConfig;

    const { data: row, error } = await (supabase as any)
      .from('agent_behaviours')
      .insert({
        agent_id: agentId,
        user_id: userId,
        behaviour_type: plan.behaviourType,
        trigger_type: plan.triggerType ?? null,
        schedule_cron: plan.scheduleCron ?? null,
        config: persistedConfig,
        description,
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

        // Use agent_id column (workflow_id stays null) — see add_polling_triggers_agent_support migration
        await createPollingTrigger(agentId, plan.triggerType, triggerConfig, { isAgent: true });

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
// DELETE SINGLE BEHAVIOUR
// ============================================================================

/**
 * Delete a single behaviour by ID.
 * For polling behaviours, also deletes the corresponding polling_trigger.
 */
export async function deleteAgentBehaviour(
  agentId: string,
  userId: string,
  behaviourId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Fetch the behaviour to get trigger_type for polling cleanup
  const { data: behaviour, error: fetchError } = await (supabase as any)
    .from('agent_behaviours')
    .select('id, behaviour_type, trigger_type')
    .eq('id', behaviourId)
    .eq('agent_id', agentId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !behaviour) {
    console.error('[BehaviourManager] Behaviour not found:', behaviourId);
    throw new Error('Behaviour not found');
  }

  // For polling behaviours, delete the polling_trigger (agent triggers use agent_id)
  if (behaviour.behaviour_type === 'polling' && behaviour.trigger_type) {
    const { error: ptError } = await (supabase as any)
      .from('polling_triggers')
      .delete()
      .eq('agent_id', agentId)
      .eq('trigger_type', behaviour.trigger_type);

    if (ptError) {
      console.error('[BehaviourManager] Failed to delete polling trigger:', ptError.message);
    }
  }

  // Delete the behaviour row
  const { error: bhError } = await (supabase as any)
    .from('agent_behaviours')
    .delete()
    .eq('id', behaviourId)
    .eq('agent_id', agentId)
    .eq('user_id', userId);

  if (bhError) {
    console.error('[BehaviourManager] Failed to delete behaviour:', bhError.message);
    throw new Error('Failed to delete behaviour');
  }

  console.log(`[BehaviourManager] Deleted behaviour ${behaviourId} for agent ${agentId}`);
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

  // Disable the polling_triggers rows (agent triggers use agent_id)
  const { error: ptError } = await (supabase as any)
    .from('polling_triggers')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('agent_id', agentId);

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

  // Re-enable polling triggers and set next_poll_at to now so they fire immediately (agent triggers use agent_id)
  const { error: ptError } = await (supabase as any)
    .from('polling_triggers')
    .update({
      enabled: true,
      next_poll_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('agent_id', agentId);

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

  // Delete polling_triggers rows first (agent triggers use agent_id)
  const { error: ptError } = await (supabase as any)
    .from('polling_triggers')
    .delete()
    .eq('agent_id', agentId);

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
