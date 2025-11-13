/**
 * Utility functions for detecting and handling scheduled workflows
 */

import type { Node } from '@xyflow/react';

export interface ScheduleConfig {
  cron: string;
  timezone?: string;
}

/**
 * Checks if a workflow has a scheduled trigger node
 */
export function hasScheduledTrigger(nodes: Node[]): boolean {
  return nodes.some(node => node.type === 'scheduled-time-trigger');
}

/**
 * Extracts schedule configuration from workflow nodes
 */
export function getScheduleConfig(nodes: Node[]): ScheduleConfig | null {
  const scheduledTriggerNode = nodes.find(node => node.type === 'scheduled-time-trigger');
  
  if (!scheduledTriggerNode) {
    return null;
  }

  const config = (scheduledTriggerNode.data?.config ?? {}) as Record<string, any>;
  const schedule = config.schedule as string | undefined;
  const timezone = (config.timezone as string | undefined) || 'UTC';

  if (!schedule) {
    return null;
  }

  return {
    cron: schedule,
    timezone,
  };
}

/**
 * Validates a cron expression
 */
export function isValidCronExpression(cron: string): boolean {
  // Basic cron validation: 5 fields (minute hour day month day-of-week)
  // or 6 fields (second minute hour day month day-of-week)
  const cronRegex = /^(\*|([0-9]|[1-5][0-9])|\*\/([0-9]|[1-5][0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|[12][0-9]|3[0-1])|\*\/([1-9]|[12][0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
  const cronWithSecondRegex = /^(\*|([0-9]|[1-5][0-9])|\*\/([0-9]|[1-5][0-9])) (\*|([0-9]|[1-5][0-9])|\*\/([0-9]|[1-5][0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|[12][0-9]|3[0-1])|\*\/([1-9]|[12][0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
  
  return cronRegex.test(cron) || cronWithSecondRegex.test(cron);
}



