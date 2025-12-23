"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { scheduleToCron, cronToSchedule, formatTime, getDayName, type ScheduleConfig } from '@/lib/utils/schedule-converter';
import { ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Time Input Component - Improved and easier to use
function TimeInput({ hour, minute, onChange, isPM }: { hour: number; minute: number; onChange: (hour: number, minute: number) => void; isPM: boolean }) {
  const displayHour = hour % 12 || 12;
  const [displayValue, setDisplayValue] = useState(() => {
    return `${displayHour}:${minute.toString().padStart(2, '0')}`;
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditingRef = useRef(false);

  useEffect(() => {
    // Only update if user is not actively editing
    if (!isEditingRef.current) {
      const h = hour % 12 || 12;
      setDisplayValue(`${h}:${minute.toString().padStart(2, '0')}`);
    }
  }, [hour, minute]);

  const parseAndValidate = (value: string): { hour: number; minute: number } | null => {
    // Remove all non-digit and non-colon characters
    let cleaned = value.replace(/[^\d:]/g, '');
    
    // Handle empty or invalid input
    if (!cleaned || cleaned === ':') {
      return null;
    }

    // Split by colon
    const parts = cleaned.split(':');
    
    // If no colon, try to parse as HHMM or HMM
    if (parts.length === 1) {
      const digits = parts[0];
      if (digits.length === 0) return null;
      
      // If 1-2 digits, treat as hour
      if (digits.length <= 2) {
        const h = parseInt(digits, 10);
        if (h >= 1 && h <= 12) {
          return { hour: h, minute: 0 };
        }
        return null;
      }
      
      // If 3-4 digits, parse as HHMM or HMM
      if (digits.length === 3) {
        const h = parseInt(digits[0], 10);
        const m = parseInt(digits.slice(1), 10);
        if (h >= 1 && h <= 12 && m >= 0 && m <= 59) {
          return { hour: h, minute: m };
        }
      } else if (digits.length === 4) {
        const h = parseInt(digits.slice(0, 2), 10);
        const m = parseInt(digits.slice(2), 10);
        if (h >= 1 && h <= 12 && m >= 0 && m <= 59) {
          return { hour: h, minute: m };
        }
      }
      return null;
    }
    
    // Has colon - parse hour and minute
    const hourStr = parts[0] || '';
    const minuteStr = parts[1] || '';
    
    if (!hourStr) return null;
    
    let h = parseInt(hourStr, 10);
    let m = minuteStr ? parseInt(minuteStr, 10) : 0;
    
    // Validate and clamp values
    if (isNaN(h) || h < 1) h = 1;
    if (h > 12) h = 12;
    if (isNaN(m) || m < 0) m = 0;
    if (m > 59) m = 59;
    
    return { hour: h, minute: m };
  };

  const formatValue = (h: number, m: number): string => {
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isEditingRef.current = true;
    const value = e.target.value;
    
    // Allow empty input while typing
    if (value === '') {
      setDisplayValue('');
      return;
    }
    
    const parsed = parseAndValidate(value);
    
    if (parsed) {
      const formatted = formatValue(parsed.hour, parsed.minute);
      setDisplayValue(formatted);
      
      // Convert to 24-hour format
      let newHour = parsed.hour;
      if (isPM && parsed.hour !== 12) newHour = parsed.hour + 12;
      if (!isPM && parsed.hour === 12) newHour = 0;
      
      onChange(newHour, parsed.minute);
    } else {
      // Allow partial input while typing
      setDisplayValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const cursorPos = input.selectionStart || 0;
    const value = input.value;
    const colonIndex = value.indexOf(':');
    
    // Arrow up/down to increment/decrement
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      
      const parsed = parseAndValidate(value);
      if (!parsed) return;
      
      const isHour = cursorPos <= colonIndex || colonIndex === -1;
      const delta = e.key === 'ArrowUp' ? 1 : -1;
      
      if (isHour) {
        let newHour = parsed.hour + delta;
        if (newHour < 1) newHour = 12;
        if (newHour > 12) newHour = 1;
        parsed.hour = newHour;
      } else {
        let newMinute = parsed.minute + delta;
        if (newMinute < 0) newMinute = 59;
        if (newMinute > 59) newMinute = 0;
        parsed.minute = newMinute;
      }
      
      const formatted = formatValue(parsed.hour, parsed.minute);
      setDisplayValue(formatted);
      
      // Convert to 24-hour format
      let newHour = parsed.hour;
      if (isPM && parsed.hour !== 12) newHour = parsed.hour + 12;
      if (!isPM && parsed.hour === 12) newHour = 0;
      
      onChange(newHour, parsed.minute);
      
      // Maintain cursor position
      setTimeout(() => {
        if (inputRef.current) {
          const newColonIndex = formatted.indexOf(':');
          if (isHour) {
            inputRef.current.setSelectionRange(0, newColonIndex);
          } else {
            inputRef.current.setSelectionRange(newColonIndex + 1, formatted.length);
          }
        }
      }, 0);
    }
  };

  const handleBlur = () => {
    isEditingRef.current = false;
    
    // Validate and format on blur
    const parsed = parseAndValidate(displayValue);
    
    if (parsed) {
      const formatted = formatValue(parsed.hour, parsed.minute);
      setDisplayValue(formatted);
      
      // Convert to 24-hour format
      let newHour = parsed.hour;
      if (isPM && parsed.hour !== 12) newHour = parsed.hour + 12;
      if (!isPM && parsed.hour === 12) newHour = 0;
      
      onChange(newHour, parsed.minute);
    } else {
      // Reset to current time if invalid
      const h = hour % 12 || 12;
      setDisplayValue(`${h}:${minute.toString().padStart(2, '0')}`);
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onFocus={() => { isEditingRef.current = true; }}
      placeholder="9:00"
      maxLength={5}
      className="flex-1 min-w-0 text-sm rounded-md border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-3 py-2 text-foreground placeholder:text-muted-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
    />
  );
}

// AM/PM Selector Component
function AMPMSelector({ hour, onChange }: { hour: number; onChange: (hour: number) => void }) {
  const isPM = hour >= 12;
  const displayHour = hour % 12 || 12;

  const handleChange = (value: string) => {
    const isPM = value === 'PM';
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
    <Select
      value={isPM ? 'PM' : 'AM'}
      onValueChange={handleChange}
    >
      <SelectTrigger className="nodrag w-auto min-w-[70px] text-sm rounded-md border border-gray-300 dark:border-white/10 !bg-white/70 dark:!bg-white/5 backdrop-blur-xl px-3 py-2 h-auto text-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-gray-300 dark:border-white/10 shadow-lg">
        <SelectItem value="AM">AM</SelectItem>
        <SelectItem value="PM">PM</SelectItem>
      </SelectContent>
    </Select>
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
        <Select
          value={config.frequency}
          onValueChange={(value) => handleFrequencyChange(value as ScheduleConfig['frequency'])}
        >
          <SelectTrigger className="nodrag w-full text-sm rounded-md border border-gray-300 dark:border-white/10 !bg-white/70 dark:!bg-white/5 backdrop-blur-xl px-3 py-2 h-auto text-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-gray-300 dark:border-white/10 shadow-lg">
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="custom">Custom Cron Expression</SelectItem>
          </SelectContent>
        </Select>
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
              <Select
                value={String(config.dayOfWeek ?? 0)}
                onValueChange={(value) => handleDayOfWeekChange(parseInt(value, 10))}
              >
                <SelectTrigger className="nodrag w-full text-sm rounded-md border border-gray-300 dark:border-white/10 !bg-white/70 dark:!bg-white/5 backdrop-blur-xl px-3 py-2 h-auto text-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-gray-300 dark:border-white/10 shadow-lg">
                  {Array.from({ length: 7 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {getDayName(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Day of Month Selector (for monthly) */}
          {config.frequency === 'monthly' && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Day of Month</label>
              <Select
                value={String(config.dayOfMonth ?? 1)}
                onValueChange={(value) => handleDayOfMonthChange(parseInt(value, 10))}
              >
                <SelectTrigger className="nodrag w-full text-sm rounded-md border border-gray-300 dark:border-white/10 !bg-white/70 dark:!bg-white/5 backdrop-blur-xl px-3 py-2 h-auto text-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-gray-300 dark:border-white/10 shadow-lg max-h-[300px]">
                  {Array.from({ length: 31 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

        </>
      )}
    </div>
  );
}

