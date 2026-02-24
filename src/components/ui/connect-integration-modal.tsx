"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Loading02Icon } from "@hugeicons/core-free-icons";
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface IntegrationFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  required: boolean;
  placeholder?: string;
  helperText?: string;
  helperLinks?: Array<{
    text: string;
    url: string;
  }>;
  options?: Array<{
    value: string;
    label: string;
  }>;
  defaultValue?: string;
}

export interface IntegrationConnectionConfig {
  integrationName: string;
  integrationDisplayName: string;
  description: string;
  descriptionLinks?: Array<{
    text: string;
    url: string;
  }>;
  fields: IntegrationFieldConfig[];
  logoUrl?: string;
  onConnect: (values: Record<string, string>) => Promise<void>;
  onCancel?: () => void;
}

interface ConnectIntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: IntegrationConnectionConfig | null;
  popupMode?: boolean; // If true, renders without backdrop and fills the window
}

export function ConnectIntegrationModal({
  open,
  onOpenChange,
  config,
  popupMode = false,
}: ConnectIntegrationModalProps) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = React.useState(false);

  // Initialize values when config changes
  React.useEffect(() => {
    if (config) {
      const initialValues: Record<string, string> = {};
      config.fields.forEach((field) => {
        if (field.defaultValue) {
          initialValues[field.key] = field.defaultValue;
        }
      });
      setValues(initialValues);
      setErrors({});
    }
  }, [config]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setValues({});
      setErrors({});
      setIsConnecting(false);
    }
  }, [open]);

  const handleFieldChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear error for this field when user types
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    if (!config) return false;
    
    const newErrors: Record<string, string> = {};
    
    config.fields.forEach((field) => {
      if (field.required && !values[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} is required`;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConnect = async () => {
    if (!config) return;
    
    if (!validate()) {
      return;
    }
    
    setIsConnecting(true);
    try {
      await config.onConnect(values);
      onOpenChange(false);
    } catch (error: any) {
      // Set general error or field-specific error
      const errorMessage = error.message || 'Failed to connect integration';
      setErrors({ _general: errorMessage });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCancel = () => {
    if (config?.onCancel) {
      config.onCancel();
    }
    onOpenChange(false);
  };

  if (!config) return null;

  if (popupMode) {
    // Popup window mode - no backdrop, fills the window
    return (
      <div className="w-full h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex-1 pr-8">
            <h2 className="text-lg font-semibold text-gray-900 leading-tight mb-2">
              Allow Runwise to access your {config.integrationDisplayName} account?
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {(() => {
                // Parse markdown-style links [text](url) in description
                const parts: React.ReactNode[] = [];
                let lastIndex = 0;
                const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                let match;
                let key = 0;
                const text = config.description;
                
                while ((match = linkRegex.exec(text)) !== null) {
                  // Add text before link
                  if (match.index > lastIndex) {
                    parts.push(
                      <span key={`text-${key++}`}>
                        {text.substring(lastIndex, match.index)}
                      </span>
                    );
                  }
                  // Add link
                  parts.push(
                    <a
                      key={`link-${key++}`}
                      href={match[2]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2563eb] hover:underline"
                    >
                      {match[1]}
                    </a>
                  );
                  lastIndex = match.index + match[0].length;
                }
                // Add remaining text
                if (lastIndex < text.length) {
                  parts.push(
                    <span key={`text-${key++}`}>
                      {text.substring(lastIndex)}
                    </span>
                  );
                }
                return parts.length > 0 ? parts : <span>{text}</span>;
              })()}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mt-1 -mr-1"
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {config.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1">(required)</span>
                  )}
                </label>
                
                {field.type === 'select' ? (
                  <Select
                    value={values[field.key] || ''}
                    onValueChange={(value) => handleFieldChange(field.key, value)}
                  >
                    <SelectTrigger className="w-full h-10 border border-gray-300 rounded-none bg-white text-gray-900 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]">
                      <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.type === 'password' ? 'password' : 'text'}
                    value={values[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={`w-full h-10 border border-gray-300 rounded-none bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] ${
                      errors[field.key] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                  />
                )}
                
                {field.helperText && (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {(() => {
                      // Parse markdown-style links [text](url) in helper text
                      const parts: React.ReactNode[] = [];
                      let lastIndex = 0;
                      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                      let match;
                      let key = 0;
                      const text = field.helperText;
                      
                      while ((match = linkRegex.exec(text)) !== null) {
                        // Add text before link
                        if (match.index > lastIndex) {
                          parts.push(
                            <span key={`text-${key++}`}>
                              {text.substring(lastIndex, match.index)}
                            </span>
                          );
                        }
                        // Add link
                        parts.push(
                          <a
                            key={`link-${key++}`}
                            href={match[2]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2563eb] hover:underline"
                          >
                            {match[1]}
                          </a>
                        );
                        lastIndex = match.index + match[0].length;
                      }
                      // Add remaining text
                      if (lastIndex < text.length) {
                        parts.push(
                          <span key={`text-${key++}`}>
                            {text.substring(lastIndex)}
                          </span>
                        );
                      }
                      return parts.length > 0 ? parts : <span>{text}</span>;
                    })()}
                  </p>
                )}
                
                {errors[field.key] && (
                  <p className="text-xs text-red-600">{errors[field.key]}</p>
                )}
              </div>
            ))}
            
            {errors._general && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {errors._general}
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-white flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isConnecting}
            className="px-4 py-2 h-auto text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-none hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-4 py-2 h-auto text-sm font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-none flex items-center gap-2"
          >
            {isConnecting ? (
              <>
                <HugeiconsIcon icon={Loading02Icon} className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                {config.logoUrl && (
                  <img src={config.logoUrl} alt={config.integrationDisplayName} className="h-4 w-4" />
                )}
                Connect {config.integrationDisplayName}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Regular modal mode with backdrop
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        open ? 'block' : 'hidden'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancel();
        }
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" />
      
      {/* Modal */}
      <div
        className="relative z-50 w-full max-w-[600px] bg-white rounded-none shadow-[0_2px_8px_rgba(0,0,0,0.15)] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex-1 pr-8">
            <h2 className="text-lg font-semibold text-gray-900 leading-tight mb-2">
              Allow Runwise to access your {config.integrationDisplayName} account?
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {(() => {
                // Parse markdown-style links [text](url) in description
                const parts: React.ReactNode[] = [];
                let lastIndex = 0;
                const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                let match;
                let key = 0;
                const text = config.description;
                
                while ((match = linkRegex.exec(text)) !== null) {
                  // Add text before link
                  if (match.index > lastIndex) {
                    parts.push(
                      <span key={`text-${key++}`}>
                        {text.substring(lastIndex, match.index)}
                      </span>
                    );
                  }
                  // Add link
                  parts.push(
                    <a
                      key={`link-${key++}`}
                      href={match[2]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2563eb] hover:underline"
                    >
                      {match[1]}
                    </a>
                  );
                  lastIndex = match.index + match[0].length;
                }
                // Add remaining text
                if (lastIndex < text.length) {
                  parts.push(
                    <span key={`text-${key++}`}>
                      {text.substring(lastIndex)}
                    </span>
                  );
                }
                return parts.length > 0 ? parts : <span>{text}</span>;
              })()}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mt-1 -mr-1"
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {config.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1">(required)</span>
                  )}
                </label>
                
                {field.type === 'select' ? (
                  <Select
                    value={values[field.key] || ''}
                    onValueChange={(value) => handleFieldChange(field.key, value)}
                  >
                    <SelectTrigger className="w-full h-10 border border-gray-300 rounded-none bg-white text-gray-900 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]">
                      <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.type === 'password' ? 'password' : 'text'}
                    value={values[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={`w-full h-10 border border-gray-300 rounded-none bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] ${
                      errors[field.key] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                  />
                )}
                
                {field.helperText && (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {(() => {
                      // Parse markdown-style links [text](url) in helper text
                      const parts: React.ReactNode[] = [];
                      let lastIndex = 0;
                      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                      let match;
                      let key = 0;
                      const text = field.helperText;
                      
                      while ((match = linkRegex.exec(text)) !== null) {
                        // Add text before link
                        if (match.index > lastIndex) {
                          parts.push(
                            <span key={`text-${key++}`}>
                              {text.substring(lastIndex, match.index)}
                            </span>
                          );
                        }
                        // Add link
                        parts.push(
                          <a
                            key={`link-${key++}`}
                            href={match[2]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2563eb] hover:underline"
                          >
                            {match[1]}
                          </a>
                        );
                        lastIndex = match.index + match[0].length;
                      }
                      // Add remaining text
                      if (lastIndex < text.length) {
                        parts.push(
                          <span key={`text-${key++}`}>
                            {text.substring(lastIndex)}
                          </span>
                        );
                      }
                      return parts.length > 0 ? parts : <span>{text}</span>;
                    })()}
                  </p>
                )}
                
                {errors[field.key] && (
                  <p className="text-xs text-red-600">{errors[field.key]}</p>
                )}
              </div>
            ))}
            
            {errors._general && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {errors._general}
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-white">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isConnecting}
            className="px-4 py-2 h-auto text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-none hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-4 py-2 h-auto text-sm font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-none flex items-center gap-2"
          >
            {isConnecting ? (
              <>
                <HugeiconsIcon icon={Loading02Icon} className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                {config.logoUrl && (
                  <img src={config.logoUrl} alt={config.integrationDisplayName} className="h-4 w-4" />
                )}
                Connect {config.integrationDisplayName}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

