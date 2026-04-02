/**
 * Maps between persisted schedule_cron (5-field cron) and the agent tab UI
 * (hourly / daily / weekly / custom). Non-preset crons use frequency "custom"
 * and store the full expression in config.customCron.
 */

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type ScheduleFrequencyUi = 'hourly' | 'daily' | 'weekly' | 'custom';

export interface ScheduleFormState {
  frequency: ScheduleFrequencyUi;
  scheduleTime: string;
  scheduleDay: string;
  scheduleCron: string;
}

const DEFAULT_TIME = '09:00';
const DEFAULT_DAY = 'monday';

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Parse a 5-field cron into UI state. Anything that is not exactly the app's
 * hourly / daily / weekly preset shape becomes "custom" with scheduleCron set.
 */
export function parseCronToScheduleUi(cron: string | null | undefined): ScheduleFormState {
  if (!cron || typeof cron !== 'string') {
    return {
      frequency: 'hourly',
      scheduleTime: DEFAULT_TIME,
      scheduleDay: DEFAULT_DAY,
      scheduleCron: '',
    };
  }

  const normalized = cron.trim().replace(/\s+/g, ' ');
  const parts = normalized.split(' ');

  if (parts.length !== 5) {
    return {
      frequency: 'custom',
      scheduleTime: DEFAULT_TIME,
      scheduleDay: DEFAULT_DAY,
      scheduleCron: normalized,
    };
  }

  const [min, hour, dom, mon, dow] = parts;

  if (min === '0' && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return {
      frequency: 'hourly',
      scheduleTime: DEFAULT_TIME,
      scheduleDay: DEFAULT_DAY,
      scheduleCron: '',
    };
  }

  if (/^\d{1,2}$/.test(min) && /^\d{1,2}$/.test(hour) && dom === '*' && mon === '*' && dow === '*') {
    const h = parseInt(hour, 10);
    const m = parseInt(min, 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return {
        frequency: 'daily',
        scheduleTime: `${pad2(h)}:${pad2(m)}`,
        scheduleDay: DEFAULT_DAY,
        scheduleCron: '',
      };
    }
  }

  if (/^\d{1,2}$/.test(min) && /^\d{1,2}$/.test(hour) && dom === '*' && mon === '*' && /^\d$/.test(dow)) {
    const dayIdx = parseInt(dow, 10);
    if (dayIdx >= 0 && dayIdx <= 6) {
      const h = parseInt(hour, 10);
      const m = parseInt(min, 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return {
          frequency: 'weekly',
          scheduleTime: `${pad2(h)}:${pad2(m)}`,
          scheduleDay: WEEKDAYS[dayIdx],
          scheduleCron: '',
        };
      }
    }
  }

  return {
    frequency: 'custom',
    scheduleTime: DEFAULT_TIME,
    scheduleDay: DEFAULT_DAY,
    scheduleCron: normalized,
  };
}

/**
 * Merge config JSON for persisting schedule/heartbeat behaviours so the UI
 * can reopen the trigger in the correct mode (including "custom cron").
 */
export function mergeScheduleConfigForPersist(
  scheduleCron: string | null | undefined,
  existingConfig: Record<string, unknown> = {}
): Record<string, unknown> {
  const base = { ...existingConfig };
  if (!scheduleCron || typeof scheduleCron !== 'string' || !scheduleCron.trim()) {
    return base;
  }

  const ui = parseCronToScheduleUi(scheduleCron);
  if (ui.frequency === 'custom') {
    return {
      ...base,
      frequency: 'custom',
      customCron: scheduleCron.trim(),
      time: typeof base.time === 'string' ? base.time : ui.scheduleTime,
      day: typeof base.day === 'string' ? base.day : ui.scheduleDay,
    };
  }

  const next: Record<string, unknown> = {
    ...base,
    frequency: ui.frequency,
    time: ui.scheduleTime,
    day: ui.scheduleDay,
  };
  delete next.customCron;
  return next;
}

export function getScheduleTriggerDisplayLabel(parts: {
  description?: string | null;
  schedule_cron?: string | null;
  config?: Record<string, unknown> | null;
}): string {
  if (parts.description?.trim()) return parts.description.trim();

  const cfg = parts.config ?? {};
  const cron = (parts.schedule_cron ?? '').trim();

  if (cfg.frequency === 'hourly') return 'Schedule: Every hour';
  if (cfg.frequency === 'daily' && typeof cfg.time === 'string') return `Schedule: Daily at ${cfg.time}`;
  if (cfg.frequency === 'weekly' && typeof cfg.day === 'string' && typeof cfg.time === 'string') {
    return `Schedule: ${cfg.day} at ${cfg.time}`;
  }
  if (cfg.frequency === 'custom') {
    const c = typeof cfg.customCron === 'string' && cfg.customCron.trim() ? cfg.customCron.trim() : cron;
    return c ? `Schedule: ${c}` : 'Schedule: Custom cron';
  }
  if (cron) return `Schedule: ${cron}`;
  return 'Schedule';
}
