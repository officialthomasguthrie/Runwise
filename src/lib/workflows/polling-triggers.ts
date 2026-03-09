/**
 * Polling Triggers Service
 * 
 * Manages polling trigger entries in the database for Cloudflare Worker scheduling.
 * Each trigger has its own next_poll_at and poll_interval.
 */

import { createAdminClient } from '@/lib/supabase-admin';
import type { Node } from '@xyflow/react';

export interface PollingTriggerConfig {
  workflowId: string;
  triggerType: string;
  config: Record<string, any>;
}

const POLL_INTERVAL_SECONDS = 60;

export interface CreatePollingTriggerOptions {
  /** When true, uses agent_id instead of workflow_id (for agent polling triggers) */
  isAgent?: boolean;
}

/**
 * Create or update a polling trigger entry.
 * For workflows: pass workflowId, leave options empty.
 * For agents: pass agentId as first arg and { isAgent: true } as options.
 */
export async function createPollingTrigger(
  workflowIdOrAgentId: string,
  triggerType: string,
  config: Record<string, any>,
  options?: CreatePollingTriggerOptions
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const isAgent = options?.isAgent === true;
    const nextPollAt = new Date().toISOString();

    if (isAgent) {
      const { error } = await (supabase as any)
        .from('polling_triggers')
        .upsert(
          {
            agent_id: workflowIdOrAgentId,
            workflow_id: null,
            trigger_type: triggerType,
            config,
            next_poll_at: nextPollAt,
            poll_interval: POLL_INTERVAL_SECONDS,
            enabled: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'agent_id,trigger_type' }
        );

      if (error) {
        console.error(`[Polling Triggers] Error creating agent trigger for ${workflowIdOrAgentId}:`, error);
        throw error;
      }
      console.log(
        `[Polling Triggers] Created/updated polling trigger for agent ${workflowIdOrAgentId}, type ${triggerType}, interval ${POLL_INTERVAL_SECONDS}s`
      );
    } else {
      const { error } = await (supabase as any)
        .from('polling_triggers')
        .upsert(
          {
            workflow_id: workflowIdOrAgentId,
            agent_id: null,
            trigger_type: triggerType,
            config,
            next_poll_at: nextPollAt,
            poll_interval: POLL_INTERVAL_SECONDS,
            enabled: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'workflow_id,trigger_type' }
        );

      if (error) {
        console.error(`[Polling Triggers] Error creating trigger for ${workflowIdOrAgentId}:`, error);
        throw error;
      }
      console.log(
        `[Polling Triggers] Created/updated polling trigger for workflow ${workflowIdOrAgentId}, type ${triggerType}, interval ${POLL_INTERVAL_SECONDS}s`
      );
    }
  } catch (error) {
    console.error(`[Polling Triggers] Error creating polling trigger:`, error);
    throw error;
  }
}

/**
 * Disable ALL polling triggers for a workflow.
 * Does not require triggerType — disables every row for the workflow_id so
 * deactivation is reliable even when the node type can't be resolved.
 */
export async function disablePollingTrigger(
  workflowId: string,
  _triggerType?: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    
    const { error } = await (supabase as any)
      .from('polling_triggers')
      .update({
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('workflow_id', workflowId);

    if (error) {
      console.error(`[Polling Triggers] Error disabling trigger for ${workflowId}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`[Polling Triggers] Error disabling polling trigger:`, error);
    throw error;
  }
}

/**
 * Get polling trigger config from workflow nodes
 */
export function getPollingTriggerFromNodes(nodes: Node[]): {
  triggerType: string;
  config: Record<string, any>;
} | null {
  const pollingTriggerTypes = [
    'new-form-submission',
    'new-email-received',
    'new-message-in-slack',
    'new-row-in-google-sheet',
    'new-github-issue',
    'file-uploaded',
    'new-discord-message',
  ];

  const triggerNode = nodes.find(node => {
    const nodeId = node.data?.nodeId;
    return typeof nodeId === 'string' && pollingTriggerTypes.includes(nodeId);
  });

  if (!triggerNode) {
    return null;
  }

  const triggerType = triggerNode.data?.nodeId as string;
  const config: Record<string, any> = triggerNode.data?.config || {};
  
  return {
    triggerType,
    config,
  };
}


