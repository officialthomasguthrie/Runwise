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
  pollInterval?: number; // seconds, default 60 (1 minute)
}

/**
 * Create or update a polling trigger entry
 */
export async function createPollingTrigger(
  workflowId: string,
  triggerType: string,
  config: Record<string, any>,
  pollInterval: number = 60 // Default 1 minute
): Promise<void> {
  try {
    const supabase = createAdminClient();
    
    // Calculate next_poll_at (immediate for first poll)
    const nextPollAt = new Date().toISOString();
    
    const { error } = await (supabase as any)
      .from('polling_triggers')
      .upsert({
        workflow_id: workflowId,
        trigger_type: triggerType,
        config: config,
        next_poll_at: nextPollAt,
        poll_interval: pollInterval,
        enabled: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'workflow_id,trigger_type',
      });

    if (error) {
      console.error(`[Polling Triggers] Error creating trigger for ${workflowId}:`, error);
      throw error;
    }
    
    console.log(
      `[Polling Triggers] Created/updated polling trigger for workflow ${workflowId}, type ${triggerType}, interval ${pollInterval}s`
    );
  } catch (error) {
    console.error(`[Polling Triggers] Error creating polling trigger:`, error);
    throw error;
  }
}

/**
 * Disable polling trigger for a workflow
 */
export async function disablePollingTrigger(
  workflowId: string,
  triggerType: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    
    const { error } = await (supabase as any)
      .from('polling_triggers')
      .update({
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('workflow_id', workflowId)
      .eq('trigger_type', triggerType);

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
  pollInterval?: number;
} | null {
  const pollingTriggerTypes = [
    'new-form-submission',
    'new-email-received',
    'new-message-in-slack',
    'new-row-in-google-sheet',
    'new-github-issue',
    'file-uploaded',
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
  
  // Extract poll_interval from config if present (in seconds)
  // Default to 60 (1 minute) if not specified
  const pollInterval = config['pollInterval'] 
    ? parseInt(String(config['pollInterval'])) * 60 // Convert minutes to seconds
    : 60; // Default 1 minute

  return {
    triggerType,
    config,
    pollInterval,
  };
}


