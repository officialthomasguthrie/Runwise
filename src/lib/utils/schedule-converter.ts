/**
 * Utility functions to convert between user-friendly schedule format and cron expressions
 */

export interface ScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  time: {
    hour: number; // 0-23
    minute: number; // 0-59
  };
  dayOfWeek?: number; // 0-6 (0 = Sunday, 6 = Saturday) - for weekly
  dayOfMonth?: number; // 1-31 - for monthly
  customCron?: string; // For custom cron expressions
}

/**
 * Convert user-friendly schedule config to cron expression
 */
export function scheduleToCron(config: ScheduleConfig): string {
  if (config.frequency === 'custom' && config.customCron) {
    return config.customCron;
  }

  const { hour, minute } = config.time;

  switch (config.frequency) {
    case 'daily':
      // Every day at specified time: "minute hour * * *"
      return `${minute} ${hour} * * *`;

    case 'weekly':
      // Every week on specified day at specified time: "minute hour * * dayOfWeek"
      // Cron uses 0-6 where 0 = Sunday, but we use 0 = Sunday too
      const dayOfWeek = config.dayOfWeek ?? 0;
      return `${minute} ${hour} * * ${dayOfWeek}`;

    case 'monthly':
      // Every month on specified day at specified time: "minute hour dayOfMonth * *"
      const dayOfMonth = config.dayOfMonth ?? 1;
      return `${minute} ${hour} ${dayOfMonth} * *`;

    default:
      // Default to daily at midnight
      return '0 0 * * *';
  }
}

/**
 * Convert cron expression to user-friendly schedule config
 */
export function cronToSchedule(cron: string): ScheduleConfig {
  // Parse cron expression: "minute hour dayOfMonth month dayOfWeek"
  const parts = cron.trim().split(/\s+/);
  
  if (parts.length < 5) {
    // Invalid cron, return default
    return {
      frequency: 'daily',
      time: { hour: 0, minute: 0 },
    };
  }

  const minute = parseInt(parts[0], 10);
  const hour = parseInt(parts[1], 10);
  const dayOfMonth = parts[2];
  const month = parts[3];
  const dayOfWeek = parts[4];

  // Check if it's a simple pattern we can convert
  const isDaily = dayOfMonth === '*' && month === '*' && dayOfWeek === '*';
  const isWeekly = dayOfMonth === '*' && month === '*' && dayOfWeek !== '*';
  const isMonthly = dayOfMonth !== '*' && month === '*' && dayOfWeek === '*';

  if (isDaily) {
    return {
      frequency: 'daily',
      time: { hour: isNaN(hour) ? 0 : hour, minute: isNaN(minute) ? 0 : minute },
    };
  }

  if (isWeekly) {
    const dayOfWeekNum = parseInt(dayOfWeek, 10);
    return {
      frequency: 'weekly',
      time: { hour: isNaN(hour) ? 0 : hour, minute: isNaN(minute) ? 0 : minute },
      dayOfWeek: isNaN(dayOfWeekNum) ? 0 : dayOfWeekNum,
    };
  }

  if (isMonthly) {
    const dayOfMonthNum = parseInt(dayOfMonth, 10);
    return {
      frequency: 'monthly',
      time: { hour: isNaN(hour) ? 0 : hour, minute: isNaN(minute) ? 0 : minute },
      dayOfMonth: isNaN(dayOfMonthNum) ? 1 : dayOfMonthNum,
    };
  }

  // Complex cron expression - treat as custom
  return {
    frequency: 'custom',
    time: { hour: isNaN(hour) ? 0 : hour, minute: isNaN(minute) ? 0 : minute },
    customCron: cron,
  };
}

/**
 * Format time for display (e.g., "9:00 AM")
 */
export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

/**
 * Get day name from day of week (0 = Sunday)
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Sunday';
}

