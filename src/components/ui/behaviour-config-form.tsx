"use client";

/**
 * Behaviour Config Form — MVP config UI for agent polling behaviours.
 * Renders the appropriate form based on trigger_type.
 */

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AgentBehaviourRow {
  id: string;
  behaviour_type: string;
  trigger_type: string | null;
  config: Record<string, any>;
  enabled: boolean;
}

const GMAIL_LABEL_OPTIONS = [
  { value: "__all__", label: "Inbox (all)" },
  { value: "CATEGORY_PERSONAL", label: "Primary" },
  { value: "CATEGORY_PROMOTIONS", label: "Promotions" },
  { value: "CATEGORY_SOCIAL", label: "Social" },
  { value: "CATEGORY_UPDATES", label: "Updates" },
  { value: "CATEGORY_FORUMS", label: "Forums" },
];

interface BehaviourConfigFormProps {
  agentId: string;
  behaviour: AgentBehaviourRow;
  onSave: (config: Record<string, any>) => Promise<void>;
}

export function BehaviourConfigForm({ agentId, behaviour, onSave }: BehaviourConfigFormProps) {
  const [config, setConfig] = useState<Record<string, any>>(behaviour.config ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Resource pickers state
  const [slackChannels, setSlackChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [discordGuilds, setDiscordGuilds] = useState<Array<{ id: string; name: string }>>([]);
  const [discordChannels, setDiscordChannels] = useState<Array<{ id: string; name: string; guild_id: string }>>([]);
  const [forms, setForms] = useState<Array<{ id: string; name: string }>>([]);
  const [spreadsheets, setSpreadsheets] = useState<Array<{ id: string; name: string }>>([]);
  const [sheets, setSheets] = useState<Array<{ name: string }>>([]);
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [calendars, setCalendars] = useState<Array<{ id: string; name: string }>>([]);
  const [repositories, setRepositories] = useState<Array<{ full_name: string; name: string }>>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  const triggerType = behaviour.trigger_type;

  // Fetch resources when form mounts for picker types
  useEffect(() => {
    if (!triggerType) return;
    setLoadingResources(true);
    const promises: Promise<void>[] = [];

    if (triggerType === "new-message-in-slack") {
      promises.push(
        fetch("/api/integrations/slack/channels")
          .then((r) => r.json())
          .then((d) => {
            if (d.channels) setSlackChannels(d.channels);
          })
          .catch(() => setSlackChannels([]))
      );
    } else if (triggerType === "new-discord-message") {
      promises.push(
        fetch("/api/integrations/discord/guilds")
          .then((r) => r.json())
          .then((d) => {
            if (d.guilds) setDiscordGuilds(d.guilds);
          })
          .catch(() => setDiscordGuilds([]))
      );
    } else if (triggerType === "new-form-submission") {
      promises.push(
        fetch("/api/integrations/google/forms")
          .then((r) => r.json())
          .then((d) => {
            if (d.forms) setForms(d.forms);
          })
          .catch(() => setForms([]))
      );
    } else if (triggerType === "new-row-in-google-sheet") {
      promises.push(
        fetch("/api/integrations/google/spreadsheets")
          .then((r) => r.json())
          .then((d) => {
            if (d.spreadsheets) setSpreadsheets(d.spreadsheets);
          })
          .catch(() => setSpreadsheets([]))
      );
    } else if (triggerType === "file-uploaded") {
      promises.push(
        fetch("/api/integrations/google/drive/folders")
          .then((r) => r.json())
          .then((d) => {
            if (d.folders) setFolders(d.folders);
          })
          .catch(() => setFolders([]))
      );
    } else if (triggerType === "new-github-issue") {
      promises.push(
        fetch("/api/integrations/github/repositories")
          .then((r) => r.json())
          .then((d) => {
            if (d.repositories) setRepositories(d.repositories);
          })
          .catch(() => setRepositories([]))
      );
    } else if (triggerType === "new-calendar-event") {
      promises.push(
        fetch("/api/integrations/google/calendars")
          .then((r) => r.json())
          .then((d) => {
            if (d.calendars) setCalendars(d.calendars.map((c: { id: string; name?: string; summary?: string }) => ({ id: c.id, name: c.name || c.summary || c.id })));
          })
          .catch(() => setCalendars([]))
      );
    }

    Promise.all(promises).finally(() => setLoadingResources(false));
  }, [triggerType]);

  // Fetch Discord channels when guild is selected
  useEffect(() => {
    const guildId = config.guildId ?? config.guild_id;
    if (triggerType !== "new-discord-message" || !guildId) {
      setDiscordChannels([]);
      return;
    }
    fetch(`/api/integrations/discord/channels?guildId=${encodeURIComponent(guildId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.channels) setDiscordChannels(d.channels);
        else setDiscordChannels([]);
      })
      .catch(() => setDiscordChannels([]));
  }, [triggerType, config.guildId, config.guild_id]);

  // Fetch sheet names when spreadsheet is selected
  useEffect(() => {
    const spreadsheetId = config.spreadsheetId;
    if (triggerType !== "new-row-in-google-sheet" || !spreadsheetId) {
      setSheets([]);
      return;
    }
    fetch(`/api/integrations/google/sheets/${spreadsheetId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.sheets) setSheets(d.sheets);
        else setSheets([]);
      })
      .catch(() => setSheets([]));
  }, [triggerType, config.spreadsheetId]);

  const handleSave = async () => {
    setError(null);
    setValidationError(null);
    setSaving(true);
    try {
      // Validate before save for polling types that require config
      const shouldValidate = triggerType !== null && [
        "new-form-submission",
        "new-row-in-google-sheet",
        "file-uploaded",
        "new-message-in-slack",
        "new-discord-message",
        "new-github-issue",
        "new-calendar-event",
      ].includes(triggerType);
      if (shouldValidate) {
        const res = await fetch(`/api/agents/${agentId}/behaviours/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ behaviourId: behaviour.id, config }),
        });
        const json = await res.json();
        if (!json.valid && json.results?.[0]?.error) {
          setValidationError(json.results[0].error);
          setSaving(false);
          return;
        }
      }
      await onSave(config);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setValidationError(null);
    setValidating(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/behaviours/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ behaviourId: behaviour.id, config }),
      });
      const json = await res.json();
      if (!json.valid && json.results?.[0]?.error) {
        setValidationError(json.results[0].error);
      } else if (json.valid) {
        setValidationError(null);
      }
    } catch (e: any) {
      setValidationError(e?.message ?? "Validation failed");
    } finally {
      setValidating(false);
    }
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(behaviour.config ?? {});

  // Auto-validate on load when config exists (for polling types that require config)
  const shouldAutoValidate = triggerType !== null && [
    "new-form-submission",
    "new-row-in-google-sheet",
    "file-uploaded",
    "new-message-in-slack",
    "new-discord-message",
    "new-github-issue",
    "new-calendar-event",
  ].includes(triggerType);
  const hasConfig = Object.keys(config).some((k) => {
    const v = config[k];
    return v != null && String(v).trim() !== "";
  });

  // Auto-validate existing config once on mount (and when config/trigger changes)
  useEffect(() => {
    if (!shouldAutoValidate || !hasConfig) return;
    let cancelled = false;
    const cfg = config;
    (async () => {
      try {
        const res = await fetch(`/api/agents/${agentId}/behaviours/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ behaviourId: behaviour.id, config: cfg }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (!json.valid && json.results?.[0]?.error) {
          setValidationError(json.results[0].error);
        }
      } catch {
        if (!cancelled) setValidationError(null);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when trigger/initial config changes
  }, [agentId, behaviour.id, triggerType, hasConfig]);

  if (!triggerType) return null;

  // Gmail
  if (triggerType === "new-email-received") {
    const categoryId = config.categoryId ?? config.category_id ?? "__all__";
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Gmail label / folder</Label>
          <Select
            value={categoryId}
            onValueChange={(v) =>
              setConfig((c) => ({
                ...c,
                labelId: "INBOX",
                categoryId: v === "__all__" ? undefined : v,
              }))
            }
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select label" />
            </SelectTrigger>
            <SelectContent>
              {GMAIL_LABEL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        {validationError && (
          <p className="text-xs text-amber-600 dark:text-amber-400">⚠ {validationError}</p>
        )}
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleValidate}
            disabled={validating}
          >
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test connection"}
          </Button>
        </div>
      </div>
    );
  }

  // Slack
  if (triggerType === "new-message-in-slack") {
    const channel = config.channel ?? "";
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Slack channel</Label>
          {loadingResources ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading channels…
            </div>
          ) : (
            <Select
              value={channel}
              onValueChange={(v) => setConfig((c) => ({ ...c, channel: v }))}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {slackChannels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    #{ch.name}
                  </SelectItem>
                ))}
                {slackChannels.length === 0 && (
                  <SelectItem value="__none__" disabled>
                    No channels (connect Slack first)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        {validationError && (
          <p className="text-xs text-amber-600 dark:text-amber-400">⚠ {validationError}</p>
        )}
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleValidate} disabled={validating}>
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test connection"}
          </Button>
        </div>
      </div>
    );
  }

  // Discord
  if (triggerType === "new-discord-message") {
    const guildId = config.guildId ?? config.guild_id ?? "";
    const channelId = config.channelId ?? config.channel_id ?? "";
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Server</Label>
          <Select
            value={guildId}
            onValueChange={(v) =>
              setConfig((c) => ({
                ...c,
                guildId: v,
                guild_id: v,
                channelId: undefined,
                channel_id: undefined,
              }))
            }
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select server" />
            </SelectTrigger>
            <SelectContent>
              {discordGuilds.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
              {discordGuilds.length === 0 && (
                <SelectItem value="__none__" disabled>
                  No servers (connect Discord first)
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        {guildId && (
          <div className="space-y-2">
            <Label>Channel</Label>
            <Select
              value={channelId}
              onValueChange={(v) =>
                setConfig((c) => ({
                  ...c,
                  channelId: v,
                  channel_id: v,
                }))
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {discordChannels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    {ch.name}
                  </SelectItem>
                ))}
                {discordChannels.length === 0 && !loadingResources && (
                  <SelectItem value="__none__" disabled>
                    No text channels
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )}
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        {validationError && (
          <p className="text-xs text-amber-600 dark:text-amber-400">⚠ {validationError}</p>
        )}
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleValidate} disabled={validating}>
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test connection"}
          </Button>
        </div>
      </div>
    );
  }

  // Google Forms
  if (triggerType === "new-form-submission") {
    const formId = config.formId ?? config.form_id ?? "";
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Google Form</Label>
          {loadingResources ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading forms…
            </div>
          ) : forms.length > 0 ? (
            <Select
              value={formId}
              onValueChange={(v) => setConfig((c) => ({ ...c, formId: v, form_id: v }))}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select form" />
              </SelectTrigger>
              <SelectContent>
                {forms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Form ID (from form URL)"
              value={formId}
              onChange={(e) =>
                setConfig((c) => ({ ...c, formId: e.target.value, form_id: e.target.value }))
              }
              className="h-10"
            />
          )}
        </div>
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        {validationError && (
          <p className="text-xs text-amber-600 dark:text-amber-400">⚠ {validationError}</p>
        )}
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleValidate} disabled={validating}>
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test connection"}
          </Button>
        </div>
      </div>
    );
  }

  // Google Sheets
  if (triggerType === "new-row-in-google-sheet") {
    const spreadsheetId = config.spreadsheetId ?? config.spreadsheet_id ?? "";
    const sheetName = config.sheetName ?? config.sheet_name ?? "";
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Spreadsheet</Label>
          {loadingResources && spreadsheets.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : spreadsheets.length > 0 ? (
            <Select
              value={spreadsheetId}
              onValueChange={(v) =>
                setConfig((c) => ({
                  ...c,
                  spreadsheetId: v,
                  spreadsheet_id: v,
                  sheetName: undefined,
                  sheet_name: undefined,
                }))
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select spreadsheet" />
              </SelectTrigger>
              <SelectContent>
                {spreadsheets.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Spreadsheet ID or URL"
              value={spreadsheetId}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  spreadsheetId: e.target.value,
                  spreadsheet_id: e.target.value,
                }))
              }
              className="h-10"
            />
          )}
        </div>
        {(spreadsheetId || sheetName !== undefined) && (
          <div className="space-y-2">
            <Label>Sheet name</Label>
            {sheets.length > 0 ? (
              <Select
                value={sheetName}
                onValueChange={(v) =>
                  setConfig((c) => ({ ...c, sheetName: v, sheet_name: v }))
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select sheet" />
                </SelectTrigger>
                <SelectContent>
                  {sheets.map((s) => (
                    <SelectItem key={s.name} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="e.g. Sheet1"
                value={sheetName}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, sheetName: e.target.value, sheet_name: e.target.value }))
                }
                className="h-10"
              />
            )}
          </div>
        )}
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        {validationError && (
          <p className="text-xs text-amber-600 dark:text-amber-400">⚠ {validationError}</p>
        )}
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleValidate} disabled={validating}>
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test connection"}
          </Button>
        </div>
      </div>
    );
  }

  // Google Drive
  if (triggerType === "file-uploaded") {
    const folderId = config.folderId ?? config.folder_id ?? "";
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Folder</Label>
          {loadingResources && folders.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading folders…
            </div>
          ) : folders.length > 0 ? (
            <Select
              value={folderId}
              onValueChange={(v) =>
                setConfig((c) => ({ ...c, folderId: v, folder_id: v }))
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select folder" />
              </SelectTrigger>
              <SelectContent>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Folder ID"
              value={folderId}
              onChange={(e) =>
                setConfig((c) => ({ ...c, folderId: e.target.value, folder_id: e.target.value }))
              }
              className="h-10"
            />
          )}
        </div>
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        {validationError && (
          <p className="text-xs text-amber-600 dark:text-amber-400">⚠ {validationError}</p>
        )}
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleValidate} disabled={validating}>
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test connection"}
          </Button>
        </div>
      </div>
    );
  }

  // Google Calendar
  if (triggerType === "new-calendar-event") {
    const calendarId = config.calendarId ?? config.calendar_id ?? "";
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Calendar</Label>
          {loadingResources && calendars.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading calendars…
            </div>
          ) : calendars.length > 0 ? (
            <Select
              value={calendarId || "primary"}
              onValueChange={(v) =>
                setConfig((c) => ({ ...c, calendarId: v, calendar_id: v }))
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select calendar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary</SelectItem>
                {calendars.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Calendar ID or primary"
              value={calendarId}
              onChange={(e) =>
                setConfig((c) => ({ ...c, calendarId: e.target.value || "primary", calendar_id: e.target.value || "primary" }))
              }
              className="h-10"
            />
          )}
        </div>
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        {validationError && (
          <p className="text-xs text-amber-600 dark:text-amber-400">⚠ {validationError}</p>
        )}
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleValidate} disabled={validating}>
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test connection"}
          </Button>
        </div>
      </div>
    );
  }

  // GitHub
  if (triggerType === "new-github-issue") {
    const repo = config.repo ?? "";
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Repository</Label>
          {loadingResources && repositories.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : repositories.length > 0 ? (
            <Select
              value={repo}
              onValueChange={(v) => setConfig((c) => ({ ...c, repo: v }))}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select repository" />
              </SelectTrigger>
              <SelectContent>
                {repositories.map((r) => (
                  <SelectItem key={r.full_name} value={r.full_name}>
                    {r.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="owner/repo"
              value={repo}
              onChange={(e) => setConfig((c) => ({ ...c, repo: e.target.value }))}
              className="h-10"
            />
          )}
        </div>
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        {validationError && (
          <p className="text-xs text-amber-600 dark:text-amber-400">⚠ {validationError}</p>
        )}
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleValidate} disabled={validating}>
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test connection"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      No config needed for this trigger.
    </p>
  );
}
