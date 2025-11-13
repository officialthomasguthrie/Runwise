"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase-client';
import { Loader2, Trash2 } from 'lucide-react';
import type { Database } from '@/types/database';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SettingsViewProps {
  workflowId?: string | null;
}

export function SettingsView({ workflowId }: SettingsViewProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Workflow settings
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState<'draft' | 'active' | 'paused' | 'archived'>('draft');

  // User preferences
  const [autoSave, setAutoSave] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  
  // Auto-save timer ref
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (workflowId) {
      loadWorkflowSettings().then(() => {
        // Mark initial load as complete after settings are loaded
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 100);
      });
    }
  }, [workflowId]);

  // Auto-save when workflow settings change
  useEffect(() => {
    // Don't auto-save during initial load
    if (isInitialLoad.current || !workflowId || !user || isLoading) return;
    
    // Don't auto-save if fields are empty (initial state)
    if (!workflowName && !workflowDescription) return;
    
    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    // Debounce save by 500ms
    saveTimerRef.current = setTimeout(() => {
      saveWorkflowSettings();
    }, 500);
    
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [workflowName, workflowDescription, workflowStatus]);

  type WorkflowSettingsRow = Pick<
    Database['public']['Tables']['workflows']['Row'],
    'name' | 'description' | 'status'
  >;

  const loadWorkflowSettings = async () => {
    if (!workflowId || !user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from('workflows')
        .select<WorkflowSettingsRow>('name, description, status')
        .eq('id', workflowId)
        .eq('user_id', user.id)
        .single();

      if (err) {
        setError(err.message || 'Failed to load settings');
      } else if (data) {
        setWorkflowName(data.name || '');
        setWorkflowDescription(data.description || '');
        setWorkflowStatus(data.status || 'draft');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
    return Promise.resolve();
  };

  const saveWorkflowSettings = async () => {
    if (!workflowId || !user) return;

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from('workflows')
        .update({
          name: workflowName,
          description: workflowDescription,
          status: workflowStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowId)
        .eq('user_id', user.id);

      if (err) {
        setError(err.message || 'Failed to save settings');
        setTimeout(() => setError(null), 3000);
      } else {
        setSuccess('Settings saved');
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWorkflow = async () => {
    if (!workflowId || !user) return;
    
    if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId)
        .eq('user_id', user.id);

      if (err) {
        setError(err.message || 'Failed to delete workflow');
      } else {
        // Redirect to dashboard or workflows page
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete workflow');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Success Toast Notification - Top Right of Canvas Area */}
      {success && (
        <div className="absolute top-4 right-4 z-50">
          <p className="text-sm text-muted-foreground">{success}</p>
        </div>
      )}
      
      <ScrollArea className="flex-1">
        <div className="pl-16 pr-6 py-6 space-y-8 pt-20 pb-6">
          {/* Error Messages */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Workflow Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Workflow Settings</h3>
            </div>

            <div className="space-y-4 pl-7">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Workflow Name</label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Enter workflow name"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <textarea
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Enter workflow description"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <select
                  value={workflowStatus}
                  onChange={(e) => setWorkflowStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Preferences</h3>
            </div>

            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Auto-save</label>
                  <p className="text-xs text-muted-foreground">Automatically save changes to your workflow</p>
                </div>
                <button
                  onClick={() => setAutoSave(!autoSave)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoSave ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoSave ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Notifications</label>
                  <p className="text-xs text-muted-foreground">Receive notifications for workflow events</p>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Email Notifications</label>
                  <p className="text-xs text-muted-foreground">Receive email notifications for important events</p>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    emailNotifications ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="space-y-4 border-t border-border pt-6">
            <div>
              <h3 className="text-base font-semibold text-red-500">Danger Zone</h3>
            </div>

            <div className="pl-7 space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-red-500 mb-1">Delete Workflow</h4>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete this workflow. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteWorkflow}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-save indicator */}
          {isSaving && (
            <div className="flex justify-end pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

