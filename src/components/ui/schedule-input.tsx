"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { scheduleToCron, cronToSchedule, formatTime, getDayName, type ScheduleConfig } from '@/lib/utils/schedule-converter';
import { ChevronDown } from 'lucide-react';

// Time Input Component - Typeable with auto-formatting
function TimeInput({ hour, minute, onChange, isPM }: { hour: number; minute: number; onChange: (hour: number, minute: number) => void; isPM: boolean }) {
  const displayHour = hour % 12 || 12;
  const [displayValue, setDisplayValue] = useState(() => {
    return `${displayHour}:${minute.toString().padStart(2, '0')}`;
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = hour % 12 || 12;
    setDisplayValue(`${h}:${minute.toString().padStart(2, '0')}`);
  }, [hour, minute]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d:]/g, ''); // Only allow digits and colon
    
    // Auto-format as user types
    if (value.length === 1 && /^\d$/.test(value)) {
      // Single digit - wait for more input
      setDisplayValue(value);
      return;
    } else if (value.length === 2 && !value.includes(':')) {
      // Two digits without colon - add colon and move to minutes
      const h = parseInt(value, 10);
      if (h > 12) {
        // If > 12, treat as hour:minute (e.g., "15" -> "1:5")
        const firstDigit = Math.floor(h / 10);
        const secondDigit = h % 10;
        setDisplayValue(`${firstDigit}:${secondDigit}`);
        // Convert to 24-hour based on AM/PM
        let newHour = firstDigit;
        if (isPM && firstDigit !== 12) newHour = firstDigit + 12;
        if (!isPM && firstDigit === 12) newHour = 0;
        onChange(newHour, secondDigit);
        // Focus minutes part
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(3, 4);
          }
        }, 0);
        return;
      }
      setDisplayValue(`${value}:`);
      // Move cursor to minutes
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(3, 3);
        }
      }, 0);
      return;
    } else if (value.length >= 3 && !value.includes(':')) {
      // Three or more digits without colon - treat as hour:minute (e.g., "753" -> "7:53")
      const firstDigit = parseInt(value[0], 10);
      const remaining = value.slice(1);
      const minutes = parseInt(remaining.slice(0, 2), 10);
      
      if (firstDigit >= 1 && firstDigit <= 12 && minutes >= 0 && minutes <= 59) {
        setDisplayValue(`${firstDigit}:${minutes.toString().padStart(2, '0')}`);
        // Convert to 24-hour format based on AM/PM
        let newHour = firstDigit;
        if (isPM && firstDigit !== 12) newHour = firstDigit + 12;
        if (!isPM && firstDigit === 12) newHour = 0;
        onChange(newHour, minutes);
        return;
      }
    } else if (value.includes(':')) {
      const parts = value.split(':');
      let h = parseInt(parts[0] || '0', 10);
      let m = parseInt(parts[1] || '0', 10);
      
      // Limit hour to 1-12
      if (h > 12) h = 12;
      if (h < 1) h = 1;
      
      // Limit minute to 0-59
      if (m > 59) m = 59;
      if (m < 0) m = 0;
      
      // Format with leading zero for minutes if needed
      const formattedM = m.toString().padStart(2, '0');
      setDisplayValue(`${h}:${formattedM}`);
      
      // Convert to 24-hour format based on AM/PM
      let newHour = h;
      if (isPM && h !== 12) newHour = h + 12;
      if (!isPM && h === 12) newHour = 0;
      
      onChange(newHour, m);
    } else {
      setDisplayValue(value);
    }
  };

  const handleBlur = () => {
    // Ensure proper formatting on blur
    if (!displayValue.includes(':')) {
      const num = parseInt(displayValue, 10);
      if (num > 0 && num <= 12) {
        setDisplayValue(`${num}:00`);
        let newHour = num;
        if (isPM && num !== 12) newHour = num + 12;
        if (!isPM && num === 12) newHour = 0;
        onChange(newHour, 0);
      } else {
        // Reset to current hour:minute
        const h = hour % 12 || 12;
        setDisplayValue(`${h}:${minute.toString().padStart(2, '0')}`);
      }
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="9:00"
      maxLength={5}
      className="flex-1 text-sm rounded-md border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-3 py-2 text-foreground placeholder:text-muted-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
    />
  );
}

// AM/PM Selector Component
function AMPMSelector({ hour, onChange }: { hour: number; onChange: (hour: number) => void }) {
  const isPM = hour >= 12;
  const displayHour = hour % 12 || 12;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const isPM = e.target.value === 'PM';
    let newHour = displayHour;
    if (isPM && displayHour !== 12) {
      newHour = displayHour + 12;
    } else if (!isPM && displayHour === 12) {
      newHour = 0;
    } else if (!isPM) {
      newHour = displayHour;
    } else {
      newHour = displayHour;
    }
    onChange(newHour);
  };

  return (
    <select
      value={isPM ? 'PM' : 'AM'}
      onChange={handleChange}
      className="nodrag text-sm rounded-md border border-gray-300 dark:border-white/10 !bg-white/70 dark:!bg-white/5 backdrop-blur-xl px-3 py-2 text-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
    >
      <option value="AM">AM</option>
      <option value="PM">PM</option>
    </select>
  );
}

interface ScheduleInputProps {
  value: string; // Cron expression
  onChange: (cron: string) => void;
  placeholder?: string;
  className?: string;
}

export function ScheduleInput({ value, onChange, placeholder, className }: ScheduleInputProps) {
  const [config, setConfig] = useState<ScheduleConfig>(() => {
    if (value) {
      return cronToSchedule(value);
    }
    return {
      frequency: 'daily',
      time: { hour: 9, minute: 0 },
    };
  });

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCron, setCustomCron] = useState(value || '');

  // Update config when value prop changes (e.g., from external source)
  useEffect(() => {
    if (value) {
      const parsed = cronToSchedule(value);
      setConfig(parsed);
      if (parsed.frequency === 'custom') {
        setCustomCron(value);
        setShowCustomInput(true);
      }
    }
  }, [value]);

  // Update cron when config changes
  useEffect(() => {
    // Skip if we're in custom mode and user is typing
    if (config.frequency === 'custom' && showCustomInput) {
      return;
    }
    const cron = scheduleToCron(config);
    if (cron !== value) {
      onChange(cron);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.frequency, config.time, config.dayOfWeek, config.dayOfMonth]);

  const handleFrequencyChange = (freq: ScheduleConfig['frequency']) => {
    setConfig((prev) => ({
      ...prev,
      frequency: freq,
    }));
    if (freq !== 'custom') {
      setShowCustomInput(false);
    } else {
      setShowCustomInput(true);
    }
  };

  const handleTimeChange = (field: 'hour' | 'minute', val: number) => {
    setConfig((prev) => ({
      ...prev,
      time: {
        ...prev.time,
        [field]: val,
      },
    }));
  };

  const handleDayOfWeekChange = (day: number) => {
    setConfig((prev) => ({
      ...prev,
      dayOfWeek: day,
    }));
  };

  const handleDayOfMonthChange = (day: number) => {
    setConfig((prev) => ({
      ...prev,
      dayOfMonth: day,
    }));
  };

  const handleCustomCronChange = (cron: string) => {
    setCustomCron(cron);
    setConfig((prev) => ({
      ...prev,
      customCron: cron,
    }));
    onChange(cron);
  };

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {/* Frequency Selector */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Frequency</label>
        <select
          value={config.frequency}
          onChange={(e) => handleFrequencyChange(e.target.value as ScheduleConfig['frequency'])}
          className="nodrag w-full text-sm rounded-md border border-gray-300 dark:border-white/10 !bg-white/70 dark:!bg-white/5 backdrop-blur-xl px-3 py-2 text-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom Cron Expression</option>
        </select>
      </div>

      {/* Custom Cron Input */}
      {showCustomInput && config.frequency === 'custom' ? (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Cron Expression</label>
          <Input
            type="text"
            value={customCron}
            onChange={(e) => handleCustomCronChange(e.target.value)}
            placeholder="0 9 * * *"
            className="w-full text-sm rounded-md border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-3 py-2 text-foreground placeholder:text-muted-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
          />
          <p className="text-xs text-muted-foreground/70">
            Format: minute hour dayOfMonth month dayOfWeek (e.g., "0 9 * * *" for daily at 9 AM)
          </p>
        </div>
      ) : (
        <>
          {/* Time Selector */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Time</label>
            <div className="flex items-center gap-2">
              <TimeInput
                hour={config.time.hour}
                minute={config.time.minute}
                isPM={config.time.hour >= 12}
                onChange={(hour, minute) => {
                  setConfig((prev) => ({
                    ...prev,
                    time: { hour, minute },
                  }));
                }}
              />
              <AMPMSelector
                hour={config.time.hour}
                onChange={(hour) => {
                  setConfig((prev) => ({
                    ...prev,
                    time: { ...prev.time, hour },
                  }));
                }}
              />
            </div>
          </div>

          {/* Day of Week Selector (for weekly) */}
          {config.frequency === 'weekly' && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Day of Week</label>
              <select
                value={config.dayOfWeek ?? 0}
                onChange={(e) => handleDayOfWeekChange(parseInt(e.target.value, 10))}
                className="nodrag w-full text-sm rounded-md border border-gray-300 dark:border-white/10 !bg-white/70 dark:!bg-white/5 backdrop-blur-xl px-3 py-2 text-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
              >
                {Array.from({ length: 7 }, (_, i) => (
                  <option key={i} value={i}>
                    {getDayName(i)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Day of Month Selector (for monthly) */}
          {config.frequency === 'monthly' && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Day of Month</label>
              <select
                value={config.dayOfMonth ?? 1}
                onChange={(e) => handleDayOfMonthChange(parseInt(e.target.value, 10))}
                className="nodrag w-full text-sm rounded-md border border-gray-300 dark:border-white/10 !bg-white/70 dark:!bg-white/5 backdrop-blur-xl px-3 py-2 text-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
              >
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
          )}

        </>
      )}
    </div>
  );
}

