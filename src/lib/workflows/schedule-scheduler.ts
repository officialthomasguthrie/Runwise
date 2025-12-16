/**
 * Schedule scheduler for delayed event-based workflow execution
 * Replaces cron polling with efficient event-driven scheduling
 */

import { inngest } from '@/inngest/client';
import type { Node, Edge } from '@xyflow/react';
// @ts-ignore - cron-parser has incorrect type definitions
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cronParser = require('cron-parser');
const parseExpression = cronParser.parseExpression as (cronExpression: string, options?: any) => any;
import { getScheduleConfig } from './schedule-utils';

export interface ScheduledWorkflowData {
  workflowId: string;
  nodes: Node[];
  edges: Edge[];
  userId: string;
  cronExpression: string;
  timezone: string;
}

/**
 * Calculates the next run time for a cron expression
 */
export function calculateNextRunTime(
  cronExpression: string,
  timezone: string = 'UTC',
  fromDate?: Date
): Date {
  const currentDate = fromDate || new Date();
  const interval = parseExpression(cronExpression, {
    tz: timezone,
    currentDate: currentDate,
  });
  return interval.next().toDate();
}

/**
 * Schedules a workflow's next execution using Inngest events with step.sleepUntil()
 * This is the most efficient method - the function sleeps until execution time (free!)
 * instead of using delayed events or cron polling
 */
export async function scheduleNextWorkflowRun(
  workflowData: ScheduledWorkflowData
): Promise<void> {
  const nextRunTime = calculateNextRunTime(
    workflowData.cronExpression,
    workflowData.timezone
  );

  // Only schedule if the next run time is in the future
  if (nextRunTime.getTime() <= Date.now()) {
    console.warn(
      `[Schedule] Next run time for workflow ${workflowData.workflowId} is in the past, skipping schedule`
    );
    return;
  }

  try {
    // Send event immediately - the function will use step.sleepUntil() to wait
    // This is more efficient than delayed events because sleepUntil() doesn't consume usage
    await inngest.send({
      name: 'workflow/scheduled-trigger',
      data: {
        workflowId: workflowData.workflowId,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
        userId: workflowData.userId,
        cronExpression: workflowData.cronExpression,
        timezone: workflowData.timezone,
        nextRunTime: nextRunTime.toISOString(), // Pass as ISO string for step.sleepUntil()
      },
    });

    const delaySeconds = Math.floor((nextRunTime.getTime() - Date.now()) / 1000);
    console.log(
      `[Schedule] Scheduled workflow ${workflowData.workflowId} to run at ${nextRunTime.toISOString()} (in ${delaySeconds}s)`
    );
  } catch (error: any) {
    console.error(
      `[Schedule] Failed to schedule next run for workflow ${workflowData.workflowId}:`,
      error
    );
    throw error;
  }
}

/**
 * Schedules a workflow's initial execution when activated
 */
export async function scheduleWorkflowOnActivation(
  workflowId: string,
  nodes: Node[],
  edges: Edge[],
  userId: string
): Promise<Date | null> {
  const scheduleConfig = getScheduleConfig(nodes);

  if (!scheduleConfig) {
    console.warn(`No schedule config found for workflow ${workflowId}`);
    return null;
  }

  const workflowData: ScheduledWorkflowData = {
    workflowId,
    nodes,
    edges,
    userId,
    cronExpression: scheduleConfig.cron,
    timezone: scheduleConfig.timezone || 'UTC',
  };

  const nextRunTime = calculateNextRunTime(
    workflowData.cronExpression,
    workflowData.timezone
  );

  await scheduleNextWorkflowRun(workflowData);

  return nextRunTime;
}

