/**
 * Execution Error Display Component
 * Displays normalized errors with severity levels and collapsible technical details
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import type { ExecutionError } from '@/lib/workflow-execution/error-normalization';

interface ExecutionErrorDisplayProps {
  error: ExecutionError;
  className?: string;
  showIcon?: boolean; // Whether to show the severity icon
}

export function ExecutionErrorDisplay({ error, className = '', showIcon = true }: ExecutionErrorDisplayProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const severityConfig = {
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50 dark:bg-red-900/10',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-800 dark:text-red-200',
      iconColor: 'text-red-600 dark:text-red-400',
      titleColor: 'text-red-900 dark:text-red-100',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-amber-50 dark:bg-amber-900/10',
      borderColor: 'border-amber-200 dark:border-amber-800',
      textColor: 'text-amber-800 dark:text-amber-200',
      iconColor: 'text-amber-600 dark:text-amber-400',
      titleColor: 'text-amber-900 dark:text-amber-100',
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50 dark:bg-blue-900/10',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-800 dark:text-blue-200',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-900 dark:text-blue-100',
    },
  };

  const config = severityConfig[error.severity];
  const Icon = config.icon;

  // Format raw error for display
  const formatRawError = (raw: any): string => {
    if (!raw) return '';
    
    if (typeof raw === 'string') {
      return raw;
    }
    
    if (raw.message) {
      return raw.message;
    }
    
    if (raw.stack) {
      return raw.stack;
    }
    
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return String(raw);
    }
  };

  const rawErrorString = formatRawError(error.raw);
  const hasTechnicalDetails = !!(error.provider || error.code || rawErrorString);

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} ${className}`}>
      <div className="p-4">
        {/* Main Error Display */}
        <div className="flex items-start gap-3">
          {showIcon && <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />}
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold text-sm ${config.titleColor} mb-1`}>
              {error.title}
            </h4>
            <p className={`text-sm ${config.textColor} mb-2`}>
              {error.message}
            </p>
            {error.action && (
              <p className={`text-sm ${config.textColor} opacity-80 italic`}>
                {error.action}
              </p>
            )}
          </div>
        </div>

        {/* Technical Details Toggle */}
        {hasTechnicalDetails && (
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className={`mt-3 flex items-center gap-2 text-xs ${config.textColor} opacity-70 hover:opacity-100 transition-opacity`}
          >
            {showTechnicalDetails ? (
              <>
                <ChevronUp className="h-3 w-3" />
                <span>Hide technical details</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                <span>Show technical details</span>
              </>
            )}
          </button>
        )}

        {/* Technical Details */}
        {showTechnicalDetails && hasTechnicalDetails && (
          <div className={`mt-3 pt-3 border-t ${config.borderColor} space-y-2`}>
            {error.provider && (
              <div className="text-xs">
                <span className={`font-medium ${config.textColor} opacity-80`}>Provider:</span>
                <span className={`ml-2 ${config.textColor}`}>{error.provider}</span>
              </div>
            )}
            {error.code && (
              <div className="text-xs">
                <span className={`font-medium ${config.textColor} opacity-80`}>Error Code:</span>
                <span className={`ml-2 font-mono ${config.textColor}`}>{error.code}</span>
              </div>
            )}
            {rawErrorString && (
              <div className="text-xs">
                <span className={`font-medium ${config.textColor} opacity-80 block mb-1`}>
                  Raw Error:
                </span>
                <pre className={`p-2 rounded bg-black/5 dark:bg-white/5 overflow-x-auto ${config.textColor} text-xs font-mono`}>
                  {rawErrorString}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

