"use client";

/**
 * Agent tab content for /agents/new builder page.
 * Profile picture, short description. Rest is blank for future widgets.
 */
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2, User, Plus, MinusCircle, Brain, FileText, Link2, Target, ScrollText, CheckCircle2, MessageSquare, Play, AlertCircle, Send, Upload, X, Search, RefreshCw, Pause, ChevronRight, ChevronLeft, Clock, Timer, Pencil, PanelRightClose, Webhook, Copy, CopyCheck, FlaskConical, BotMessageSquare } from "lucide-react";
import { getCapabilityIntegrationInfo, getIntegrationMeta, planFromBehaviours, buildIntegrationCheckListForPolling } from "@/lib/agents/chat-pipeline";
import type { Agent } from "@/lib/agents/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";

import { getAgentAvatarUrl } from "@/lib/agents/avatar";

const BRANDFETCH_CLIENT = "1dxbfHSJFAPEGdCLU4o5B";
const BRANDFETCH_LOGOS: Record<string, string> = {
  googlesheets: `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idKa2XnbFY.svg?c=${BRANDFETCH_CLIENT}`,
  googleforms: `https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Google_Forms_logo_%282014-2020%29.svg/120px-Google_Forms_logo_%282014-2020%29.svg.png`,
  googledrive: `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idncaAgFGT.svg?c=${BRANDFETCH_CLIENT}`,
  googlecalendar: `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idMX2_OMSc.svg?c=${BRANDFETCH_CLIENT}`,
  slack: `https://cdn.brandfetch.io/idJ_HhtG0Z/w/400/h/400/theme/dark/icon.jpeg?c=${BRANDFETCH_CLIENT}`,
  gmail: `https://cdn.brandfetch.io/id5o3EIREg/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  notion: `https://cdn.brandfetch.io/idPYUoikV7/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  airtable: `https://cdn.brandfetch.io/iddsnRzkxS/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  trello: `https://cdn.brandfetch.io/idToc8bDY1/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  github: `https://cdn.brandfetch.io/idZAyF9rlg/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  stripe: `https://cdn.brandfetch.io/idxAg10C0L/w/480/h/480/theme/dark/icon.jpeg?c=${BRANDFETCH_CLIENT}`,
  hubspot: `https://cdn.brandfetch.io/idRt0LuzRf/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  discord: `https://cdn.brandfetch.io/idM8Hlme1a/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  sendgrid: `https://cdn.brandfetch.io/idHHcfw5Qu/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  twilio: `https://cdn.brandfetch.io/idT7wVo_zL/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  openai: `https://cdn.brandfetch.io/idR3duQxYl/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  paypal: `https://cdn.brandfetch.io/id-Wd4a4TS/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  asana: `https://cdn.brandfetch.io/idxPi2Evsk/w/400/h/400/theme/dark/icon.jpeg?c=${BRANDFETCH_CLIENT}`,
  jira: `https://cdn.brandfetch.io/idchmboHEZ/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  shopify: `https://cdn.brandfetch.io/idAgPm7IvG/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  // Twitter/X — slug is "x" (from chat-pipeline SERVICE_TO_CAPABILITY)
  x: `https://cdn.brandfetch.io/idS9bXSG-3/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
};

const AVAILABLE_INTEGRATIONS: Array<{ slug: string; name: string; description: string }> = [
  { slug: "googlesheets", name: "Google Sheets", description: "Spreadsheet management" },
  { slug: "gmail", name: "Gmail", description: "Email service" },
  { slug: "googledrive", name: "Google Drive", description: "Cloud storage" },
  { slug: "googlecalendar", name: "Google Calendar", description: "Calendar events" },
  { slug: "slack", name: "Slack", description: "Team communication" },
  { slug: "notion", name: "Notion", description: "Note taking" },
  { slug: "airtable", name: "Airtable", description: "Database tables" },
  { slug: "trello", name: "Trello", description: "Project boards" },
  { slug: "github", name: "GitHub", description: "Code repositories" },
  { slug: "discord", name: "Discord", description: "Community chat" },
  { slug: "stripe", name: "Stripe", description: "Payment processing" },
  { slug: "paypal", name: "PayPal", description: "Payment processing" },
  { slug: "hubspot", name: "HubSpot", description: "CRM platform" },
  { slug: "sendgrid", name: "SendGrid", description: "Email delivery" },
  { slug: "twilio", name: "Twilio", description: "SMS & voice" },
  { slug: "openai", name: "OpenAI", description: "AI language models" },
  { slug: "asana", name: "Asana", description: "Task management" },
  { slug: "jira", name: "Jira", description: "Issue tracking" },
  { slug: "shopify", name: "Shopify", description: "E-commerce platform" },
];

function getIntegrationLogoUrl(slug: string): string {
  // Fall back to simpleicons (not Notion) so unknown slugs show their own logo or nothing
  return BRANDFETCH_LOGOS[slug] ?? `https://cdn.simpleicons.org/${slug}`;
}

/** Service ID (e.g. google-gmail) → logo slug for BRANDFETCH_LOGOS */
const SERVICE_ID_TO_LOGO_SLUG: Record<string, string> = {
  "google-gmail": "gmail",
  "google-sheets": "googlesheets",
  "google-forms": "googleforms",
  "google-drive": "googledrive",
  "google-calendar": "googlecalendar",
  slack: "slack",
  discord: "discord",
  github: "github",
  notion: "notion",
  airtable: "airtable",
  trello: "trello",
  stripe: "stripe",
  hubspot: "hubspot",
  shopify: "shopify",
};

type TriggerIconConfig =
  | { type: "lucide"; Icon: typeof Webhook; gradient: string; iconColor: string }
  | { type: "logo"; slug: string };

const AVAILABLE_TRIGGERS: Array<{
  id: string;
  name: string;
  description: string;
  icon: TriggerIconConfig;
}> = [
  {
    id: "webhook",
    name: "Webhook",
    description: "Run when an HTTP request hits your webhook URL",
    icon: { type: "lucide", Icon: Webhook, gradient: "from-violet-500/20 to-purple-500/20", iconColor: "text-violet-500" },
  },
  {
    id: "schedule",
    name: "Time Schedule",
    description: "Run on a recurring schedule (cron, daily, hourly)",
    icon: { type: "lucide", Icon: Timer, gradient: "from-amber-500/20 to-orange-500/20", iconColor: "text-amber-500" },
  },
  {
    id: "googleforms",
    name: "New Form Submission",
    description: "Run when a new response is submitted to Google Forms",
    icon: { type: "logo", slug: "googleforms" },
  },
  {
    id: "googledrive",
    name: "New Drive Upload",
    description: "Run when a new file is uploaded to Google Drive",
    icon: { type: "logo", slug: "googledrive" },
  },
  {
    id: "gmail",
    name: "New Gmail Message",
    description: "Run when a new email arrives in Gmail",
    icon: { type: "logo", slug: "gmail" },
  },
  {
    id: "googlecalendar",
    name: "New Calendar Event",
    description: "Run when a new event is added to Google Calendar",
    icon: { type: "logo", slug: "googlecalendar" },
  },
  {
    id: "slack",
    name: "New Slack Message",
    description: "Run when a new message is posted in Slack",
    icon: { type: "logo", slug: "slack" },
  },
  {
    id: "notion",
    name: "New Notion Page",
    description: "Run when a new page is created in Notion",
    icon: { type: "logo", slug: "notion" },
  },
  {
    id: "airtable",
    name: "New Airtable Record",
    description: "Run when a new record is added to an Airtable base",
    icon: { type: "logo", slug: "airtable" },
  },
  {
    id: "trello",
    name: "New Trello Card",
    description: "Run when a new card is created on a Trello board",
    icon: { type: "logo", slug: "trello" },
  },
  {
    id: "github",
    name: "New GitHub Issue",
    description: "Run when a new issue is opened in a GitHub repo",
    icon: { type: "logo", slug: "github" },
  },
  {
    id: "discord",
    name: "New Discord Message",
    description: "Run when a new message is posted in Discord",
    icon: { type: "logo", slug: "discord" },
  },
  {
    id: "stripe",
    name: "New Stripe Payment",
    description: "Run when a new payment is completed in Stripe",
    icon: { type: "logo", slug: "stripe" },
  },
  {
    id: "hubspot",
    name: "New HubSpot Contact",
    description: "Run when a new contact is created in HubSpot",
    icon: { type: "logo", slug: "hubspot" },
  },
  {
    id: "shopify",
    name: "New Shopify Order",
    description: "Run when a new order is placed in Shopify",
    icon: { type: "logo", slug: "shopify" },
  },
];

/** Trigger id → backend trigger type for polling behaviours */
const TRIGGER_ID_TO_TRIGGER_TYPE: Record<string, string> = {
  googleforms: "new-form-submission",
  googledrive: "file-uploaded",
  gmail: "new-email-received",
  googlecalendar: "new-calendar-event",
  slack: "new-message-in-slack",
  notion: "new-notion-page",
  airtable: "new-airtable-record",
  trello: "new-trello-card",
  github: "new-github-issue",
  discord: "new-discord-message",
  stripe: "new-stripe-payment",
  hubspot: "new-hubspot-contact",
  shopify: "new-shopify-order",
};

/** Backend trigger_type → trigger id for mapping behaviours back to AVAILABLE_TRIGGERS */
const TRIGGER_TYPE_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(TRIGGER_ID_TO_TRIGGER_TYPE).map(([id, type]) => [type, id])
);

/** Trigger id → service name for integration triggers (connect flow) */
const TRIGGER_TO_SERVICE: Record<string, string> = {
  googleforms: "google-forms",
  googledrive: "google-drive",
  gmail: "google-gmail",
  googlecalendar: "google-calendar",
  slack: "slack",
  notion: "notion",
  airtable: "airtable",
  trello: "trello",
  github: "github",
  discord: "discord",
  stripe: "stripe",
  hubspot: "hubspot",
  shopify: "shopify",
};

function isServiceConnected(serviceId: string, connectedServices: string[]): boolean {
  return connectedServices.some((cs) => cs === serviceId);
}

interface AgentMemory {
  id: string;
  content: string;
  memory_type?: string;
}

interface AgentGoalsRule {
  id: string;
  type: 'goal' | 'rule';
  label: string;
}

interface AgentDetail extends Agent {
  behaviours: unknown[];
  memory_count: number;
  /** Memories (AI-generated + user-added) for Knowledge & Memory section */
  memories?: AgentMemory[];
  /** Goals and rules (AI-generated + user-added) for Goals & Rules section */
  goals_rules?: AgentGoalsRule[];
  /** Integrations/tools the agent uses (derived from behaviours + instructions) */
  capabilities?: Array<{ slug: string; name: string }>;
}

export interface AgentTabContentProps {
  agentId: string;
  /** Called when user deletes the agent — parent should navigate to /agents */
  onDeleted?: () => void;
  /** AI chat sidebar (rendered by parent) — open state */
  agentChatSidebarOpen?: boolean;
  onAgentChatSidebarOpenChange?: (open: boolean) => void;
  /** When agent profile loads, parent can show name + avatar in the chat sidebar header */
  onAgentMeta?: (meta: { name: string; avatarUrl: string }) => void;
}

type KnowledgeItemType = "memory" | "document" | "url";
type GoalsRulesItemType = "goal" | "rule";
type ActivityType = "run" | "message" | "completed" | "error" | "sent";

interface ActivityEvent {
  id: string;
  type: ActivityType;
  title: string;
  time: string;
  summary: string;
  executedAt: string;
  executionDurationMs?: number;
  workflowName?: string;
  executionId?: string;
  status?: string;
  errorMessage?: string;
  retryCount?: number;
  channel?: string;
  ticketId?: string;
  recipient?: string;
  messagePreview?: string;
  subject?: string;
}

const ACTIVITY_PAGE_SIZE = 10;

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function getActivityIcon(type: ActivityType) {
  switch (type) {
    case "completed":
      return CheckCircle2;
    case "message":
      return MessageSquare;
    case "run":
      return Play;
    case "error":
      return AlertCircle;
    case "sent":
      return Send;
    default:
      return CheckCircle2;
  }
}

function getActivityIconColor(type: ActivityType): string {
  switch (type) {
    case "completed":
    case "sent":
      return "text-emerald-500 dark:text-emerald-400";
    case "message":
    case "run":
      return "text-sky-500 dark:text-sky-400";
    case "error":
      return "text-amber-500 dark:text-amber-400";
    default:
      return "text-muted-foreground";
  }
}

function formatExecutedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function EventDetailDialog({
  event,
  open,
  onOpenChange,
}: {
  event: ActivityEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!event) return null;
  const Icon = getActivityIcon(event.type);
  const iconColor = getActivityIconColor(event.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 rounded-lg p-2 bg-stone-100 dark:bg-stone-700/50 ${iconColor}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base">{event.title}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1 capitalize">{event.type} event</p>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground leading-relaxed">{event.summary}</p>

          <div className="grid gap-3 rounded-lg border border-stone-200/60 dark:border-stone-600/50 bg-stone-50/50 dark:bg-stone-800/30 p-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Executed at</span>
              <span className="font-medium text-foreground">{formatExecutedAt(event.executedAt)}</span>
            </div>
            {event.executionDurationMs != null && (
              <div className="flex items-center gap-2 text-sm">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium text-foreground">{formatDuration(event.executionDurationMs)}</span>
              </div>
            )}
            {event.executionId && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Execution ID</span>
                <span className="font-mono text-xs text-foreground">{event.executionId}</span>
              </div>
            )}
            {event.workflowName && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Workflow</span>
                <span className="font-medium text-foreground">{event.workflowName}</span>
              </div>
            )}
            {event.status && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-stone-200/80 dark:bg-stone-600/50 text-foreground capitalize">{event.status}</span>
              </div>
            )}
            {event.errorMessage && (
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Error</span>
                <span className="text-amber-600 dark:text-amber-400 font-mono text-xs bg-amber-500/10 dark:bg-amber-500/15 rounded px-2 py-1.5">{event.errorMessage}</span>
              </div>
            )}
            {event.retryCount != null && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Retry attempt</span>
                <span className="font-medium text-foreground">{event.retryCount}</span>
              </div>
            )}
            {event.channel && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Channel</span>
                <span className="font-medium text-foreground">{event.channel}</span>
              </div>
            )}
            {event.ticketId && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Ticket</span>
                <span className="font-medium text-foreground">{event.ticketId}</span>
              </div>
            )}
            {event.recipient && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Recipient</span>
                <span className="font-medium text-foreground">{event.recipient}</span>
              </div>
            )}
            {event.subject && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Subject</span>
                <span className="font-medium text-foreground">{event.subject}</span>
              </div>
            )}
            {event.messagePreview && (
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Preview</span>
                <p className="text-foreground/90 text-xs leading-relaxed border-l-2 border-stone-200 dark:border-stone-600 pl-2 italic">{event.messagePreview}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AgentTabContent({
  agentId,
  onDeleted,
  agentChatSidebarOpen = false,
  onAgentChatSidebarOpenChange,
  onAgentMeta,
}: AgentTabContentProps) {
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<Array<{ slug: string; name: string }>>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<Array<{ id: string; type: KnowledgeItemType; label: string }>>([]);
  const [goalsRules, setGoalsRules] = useState<Array<{ id: string; type: GoalsRulesItemType; label: string }>>([]);
  const [activityItems, setActivityItems] = useState<ActivityEvent[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityEvent | null>(null);
  const [activityDetailOpen, setActivityDetailOpen] = useState(false);
  const [runSuccess, setRunSuccess] = useState(false);
  const [knowledgeModalOpen, setKnowledgeModalOpen] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState<{
    type: KnowledgeItemType;
    memoryText: string;
    documentName: string;
    documentFile: File | null;
    url: string;
    urlLabel: string;
  }>({ type: "memory", memoryText: "", documentName: "", documentFile: null, url: "", urlLabel: "" });
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documentUploadError, setDocumentUploadError] = useState<string | null>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const pendingCapabilityAddRef = useRef<{ slug: string; name: string } | null>(null);
  const lastLoadedResourcesSlugRef = useRef<string | null>(null);

  const [capabilitiesSidebarOpen, setCapabilitiesSidebarOpen] = useState(false);
  const [capabilitiesSearch, setCapabilitiesSearch] = useState("");

  // Reset search when Add Capabilities sidebar opens so all cards show correctly
  useEffect(() => {
    if (capabilitiesSidebarOpen) setCapabilitiesSearch("");
  }, [capabilitiesSidebarOpen]);

  const [connectedServices, setConnectedServices] = useState<string[]>([]);
  const [goalsRulesModalOpen, setGoalsRulesModalOpen] = useState(false);
  const [goalsRulesForm, setGoalsRulesForm] = useState<{
    type: GoalsRulesItemType;
    label: string;
  }>({ type: "goal", label: "" });
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | null>(null);
  const [editingGoalsRulesId, setEditingGoalsRulesId] = useState<string | null>(null);
  const [triggersSidebarOpen, setTriggersSidebarOpen] = useState(false);
  const [triggersSearch, setTriggersSearch] = useState("");
  const [selectedTriggerForConfig, setSelectedTriggerForConfig] = useState<(typeof AVAILABLE_TRIGGERS)[0] | null>(null);
  const [webhookPath, setWebhookPath] = useState("");
  const [webhookTestState, setWebhookTestState] = useState<"idle" | "waiting" | "received" | "error">("idle");
  const [webhookSampleFields, setWebhookSampleFields] = useState<string[]>([]);
  const [urlCopied, setUrlCopied] = useState(false);
  const webhookPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const webhookPollStartRef = useRef<number>(0);
  const [scheduleFrequency, setScheduleFrequency] = useState<string>("hourly");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleDay, setScheduleDay] = useState("monday");
  const [scheduleCron, setScheduleCron] = useState("");
  const [integrationFormId, setIntegrationFormId] = useState("");
  const [integrationFolderId, setIntegrationFolderId] = useState("");
  const [integrationCalendarId, setIntegrationCalendarId] = useState("");
  const [integrationSlackChannelId, setIntegrationSlackChannelId] = useState("");
  const [integrationDiscordGuildId, setIntegrationDiscordGuildId] = useState("");
  const [integrationDiscordChannelId, setIntegrationDiscordChannelId] = useState("");
  const [integrationGithubRepo, setIntegrationGithubRepo] = useState("");
  const [integrationGmailCategoryId, setIntegrationGmailCategoryId] = useState("__all__");
  const [integrationNotionDatabaseId, setIntegrationNotionDatabaseId] = useState("");
  const [integrationAirtableBaseId, setIntegrationAirtableBaseId] = useState("");
  const [integrationAirtableTableId, setIntegrationAirtableTableId] = useState("");
  const [integrationTrelloBoardId, setIntegrationTrelloBoardId] = useState("");
  const [integrationResources, setIntegrationResources] = useState<{ id: string; name: string }[]>([]);
  const [integrationResourcesSecondary, setIntegrationResourcesSecondary] = useState<{ id: string; name: string }[]>([]);
  const [integrationResourcesLoading, setIntegrationResourcesLoading] = useState(false);
  const [triggerSaveLoading, setTriggerSaveLoading] = useState(false);
  const [triggerSaveError, setTriggerSaveError] = useState<string | null>(null);
  const [editingBehaviourId, setEditingBehaviourId] = useState<string | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);

  useEffect(() => {
    if (!agent?.id) return;
    onAgentMeta?.({
      name: agent.name ?? "Agent",
      avatarUrl: agent.avatar_image ?? getAgentAvatarUrl(agent.id),
    });
  }, [agent?.id, agent?.name, agent?.avatar_image, onAgentMeta]);

  const refetchAgent = async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      const agentJson = await res.json();
      if (agentJson?.agent) {
        const a = agentJson.agent as AgentDetail;
        setAgent(a);
        setCapabilities(a.capabilities ?? []);
        setKnowledgeItems(
          (a.memories ?? []).map((m) => ({
            id: m.id,
            type: "memory" as const,
            label: m.content,
          }))
        );
        setGoalsRules(
          (a.goals_rules ?? []).map((g) => ({
            id: g.id,
            type: g.type,
            label: g.label,
          }))
        );
      }
    } catch (e) {
      console.error("Failed to load agent:", e);
    }
  };

  const fetchActivity = async () => {
    if (!agentId || agentId === "new") return;
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/activity?limit=50`);
      if (!res.ok) return;
      const json = await res.json();
      const rows: any[] = json.activity ?? [];
      const mapped: ActivityEvent[] = rows.map((row) => {
        const actionsCount = Array.isArray(row.actions_taken) ? row.actions_taken.length : 0;
        const statusMap: Record<string, ActivityType> = {
          success: "completed",
          error: "error",
          skipped: "run",
        };
        const actType: ActivityType = statusMap[row.status] ?? "run";
        const toolNames = Array.isArray(row.actions_taken)
          ? row.actions_taken.map((a: any) => a.tool).filter(Boolean)
          : [];
        const summary =
          row.error_message
            ? row.error_message
            : actionsCount > 0
              ? `${actionsCount} action${actionsCount !== 1 ? "s" : ""}: ${toolNames.slice(0, 3).join(", ")}${toolNames.length > 3 ? "…" : ""}`
              : row.status === "skipped"
                ? "No action taken"
                : "Completed";
        return {
          id: row.id,
          type: actType,
          title: row.trigger_summary ?? "Agent run",
          time: formatRelativeTime(row.created_at),
          summary,
          executedAt: row.created_at,
          status: row.status,
          errorMessage: row.error_message ?? undefined,
        };
      });
      setActivityItems(mapped);
      setActivityPage(1);
    } catch (e) {
      console.error("Failed to fetch activity:", e);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleRunAgent = async () => {
    if (!agentId || agentId === "new") return;
    if (agent?.status !== "active") return;
    setRunLoading(true);
    setRunError(null);
    setRunSuccess(false);
    try {
      const res = await fetch(`/api/agents/${agentId}/run`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRunError(data.error ?? "Failed to run agent");
        return;
      }
      setRunSuccess(true);
      setTimeout(() => setRunSuccess(false), 5000);
      // Poll for activity: Inngest runs async, so check periodically
      const pollActivity = async (attempts: number, delayMs: number) => {
        for (let i = 0; i < attempts; i++) {
          await new Promise((r) => setTimeout(r, delayMs));
          await fetchActivity();
        }
      };
      pollActivity(4, 3000);
    } catch (e: unknown) {
      setRunError(e instanceof Error ? e.message : "Failed to run agent");
    } finally {
      setRunLoading(false);
    }
  };

  const handlePauseAgent = async () => {
    if (!agentId || agentId === "new") return;
    if (agent?.status !== "active" && agent?.status !== "paused") return;
    setPauseLoading(true);
    setPauseError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/pause`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPauseError(data.error ?? "Failed to resume");
        return;
      }
      await refetchAgent();
    } catch (e) {
      setPauseError(e instanceof Error ? e.message : "Failed to resume");
    } finally {
      setPauseLoading(false);
    }
  };

  const handleActivateAgent = async () => {
    if (!agentId || agentId === "new") return;
    if (agent?.status !== "pending_integrations") return;
    setActivateLoading(true);
    setActivateError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/activate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActivateError(data.error ?? "Failed to activate");
        return;
      }
      await refetchAgent();
    } catch (e) {
      setActivateError(e instanceof Error ? e.message : "Failed to activate");
    } finally {
      setActivateLoading(false);
    }
  };

  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([refetchAgent(), fetchActivity()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  // Reset trigger config when sidebar closes
  useEffect(() => {
    if (!triggersSidebarOpen) {
      setSelectedTriggerForConfig(null);
      setTriggerSaveError(null);
      setEditingBehaviourId(null);
      if (webhookPollingRef.current) {
        clearInterval(webhookPollingRef.current);
        webhookPollingRef.current = null;
      }
    }
  }, [triggersSidebarOpen]);

  // Reset integration state when switching to a different trigger type
  useEffect(() => {
    setIntegrationFormId("");
    setIntegrationFolderId("");
    setIntegrationCalendarId("");
    setIntegrationSlackChannelId("");
    setIntegrationDiscordGuildId("");
    setIntegrationDiscordChannelId("");
    setIntegrationGithubRepo("");
    setIntegrationGmailCategoryId("__all__");
    setIntegrationNotionDatabaseId("");
    setIntegrationAirtableBaseId("");
    setIntegrationAirtableTableId("");
    setIntegrationTrelloBoardId("");
  }, [selectedTriggerForConfig?.id]);

  // Set default webhook path when opening webhook config
  useEffect(() => {
    if (selectedTriggerForConfig?.id === "webhook" && agentId && agentId !== "new" && !webhookPath) {
      setWebhookPath(`agent-${agentId}`);
    }
  }, [selectedTriggerForConfig?.id, agentId]);

  // Webhook test helpers for trigger config
  const startWebhookTest = () => {
    if (webhookPollingRef.current) clearInterval(webhookPollingRef.current);
    if (!webhookPath.trim() || !agentId || agentId === "new") {
      setWebhookTestState("error");
      return;
    }
    setWebhookTestState("waiting");
    webhookPollStartRef.current = Date.now();
    webhookPollingRef.current = setInterval(async () => {
      if (Date.now() - webhookPollStartRef.current > 120_000) {
        if (webhookPollingRef.current) clearInterval(webhookPollingRef.current);
        webhookPollingRef.current = null;
        setWebhookTestState("error");
        return;
      }
      try {
        const res = await fetch(`/api/webhooks/sample/agent/${agentId}`, { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        if (json.sample?.payload && typeof json.sample.payload === "object") {
          if (webhookPollingRef.current) clearInterval(webhookPollingRef.current);
          webhookPollingRef.current = null;
          const fields = Object.keys(json.sample.payload).filter((k) => !k.startsWith("_"));
          setWebhookSampleFields(fields);
          setWebhookTestState("received");
        }
      } catch {
        /* ignore */
      }
    }, 2000);
  };
  const stopWebhookTest = () => {
    if (webhookPollingRef.current) {
      clearInterval(webhookPollingRef.current);
      webhookPollingRef.current = null;
    }
    setWebhookTestState("idle");
  };
  const copyWebhookUrl = () => {
    if (!webhookPath.trim()) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/${webhookPath}`;
    navigator.clipboard.writeText(url).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    });
  };

  // Fetch integration resources when config view opens for integration trigger
  useEffect(() => {
    if (!selectedTriggerForConfig || selectedTriggerForConfig.id === "webhook" || selectedTriggerForConfig.id === "schedule") return;
    const service = TRIGGER_TO_SERVICE[selectedTriggerForConfig.id];
    if (!service || !connectedServices.includes(service)) return;
    const slug = selectedTriggerForConfig.icon.type === "logo" ? selectedTriggerForConfig.icon.slug : "";
    const isNewSlug = lastLoadedResourcesSlugRef.current !== slug;
    if (isNewSlug) {
      setIntegrationResourcesLoading(true);
      lastLoadedResourcesSlugRef.current = slug;
      setIntegrationResourcesSecondary([]);
    }
    const fetchOpts = { credentials: "include" as RequestCredentials };
    if (slug === "googleforms") {
      fetch("/api/integrations/google/forms", fetchOpts)
        .then((r) => r.json())
        .then((d) => setIntegrationResources((d.forms ?? []).map((f: { id: string; title: string }) => ({ id: f.id, name: f.title || f.id }))))
        .catch(() => setIntegrationResources([]))
        .finally(() => setIntegrationResourcesLoading(false));
    } else if (slug === "googledrive") {
      fetch("/api/integrations/google/drive/folders", fetchOpts)
        .then((r) => r.json())
        .then((d) => setIntegrationResources((d.folders ?? []).map((f: { id: string; name: string }) => ({ id: f.id, name: f.name || f.id }))))
        .catch(() => setIntegrationResources([]))
        .finally(() => setIntegrationResourcesLoading(false));
    } else if (slug === "googlecalendar") {
      fetch("/api/integrations/google/calendars", fetchOpts)
        .then((r) => r.json())
        .then((d) => setIntegrationResources((d.calendars ?? []).map((c: { id: string; name?: string; summary?: string }) => ({ id: c.id, name: c.name || c.summary || c.id }))))
        .catch(() => setIntegrationResources([]))
        .finally(() => setIntegrationResourcesLoading(false));
    } else if (slug === "slack") {
      fetch("/api/integrations/slack/channels", fetchOpts)
        .then((r) => r.json())
        .then((d) => setIntegrationResources((d.channels ?? []).map((ch: { id: string; name: string }) => ({ id: ch.id, name: ch.name }))))
        .catch(() => setIntegrationResources([]))
        .finally(() => setIntegrationResourcesLoading(false));
    } else if (slug === "discord") {
      fetch("/api/integrations/discord/guilds", fetchOpts)
        .then((r) => r.json())
        .then((d) => setIntegrationResources((d.guilds ?? []).map((g: { id: string; name: string }) => ({ id: g.id, name: g.name }))))
        .catch(() => setIntegrationResources([]))
        .finally(() => setIntegrationResourcesLoading(false));
    } else if (slug === "github") {
      fetch("/api/integrations/github/repositories", fetchOpts)
        .then((r) => r.json())
        .then((d) => setIntegrationResources((d.repositories ?? []).map((r: { full_name?: string; id?: string; name?: string }) => ({ id: r.full_name || r.id || "", name: r.full_name || r.name || r.id || "" }))))
        .catch(() => setIntegrationResources([]))
        .finally(() => setIntegrationResourcesLoading(false));
    } else if (slug === "gmail") {
      setIntegrationResources([
        { id: "__all__", name: "Inbox (all)" },
        { id: "CATEGORY_PERSONAL", name: "Primary" },
        { id: "CATEGORY_PROMOTIONS", name: "Promotions" },
        { id: "CATEGORY_SOCIAL", name: "Social" },
        { id: "CATEGORY_UPDATES", name: "Updates" },
        { id: "CATEGORY_FORUMS", name: "Forums" },
      ]);
      setIntegrationResourcesLoading(false);
    } else if (slug === "notion") {
      fetch("/api/integrations/notion/databases", fetchOpts)
        .then((r) => r.json())
        .then((d) => setIntegrationResources((d.databases ?? []).map((db: { id: string; title?: string; name?: string }) => ({ id: db.id, name: db.title || db.name || db.id }))))
        .catch(() => setIntegrationResources([]))
        .finally(() => setIntegrationResourcesLoading(false));
    } else if (slug === "airtable") {
      fetch("/api/integrations/airtable/bases", fetchOpts)
        .then((r) => r.json())
        .then((d) => setIntegrationResources((d.bases ?? []).map((b: { id: string; name?: string }) => ({ id: b.id, name: b.name || b.id }))))
        .catch(() => setIntegrationResources([]))
        .finally(() => setIntegrationResourcesLoading(false));
    } else if (slug === "trello") {
      fetch("/api/integrations/trello/boards", fetchOpts)
        .then((r) => r.json())
        .then((d) => setIntegrationResources((d.boards ?? []).map((b: { id: string; name?: string }) => ({ id: b.id, name: b.name || b.id }))))
        .catch(() => setIntegrationResources([]))
        .finally(() => setIntegrationResourcesLoading(false));
    } else {
      setIntegrationResources([]);
      setIntegrationResourcesLoading(false);
    }
  }, [selectedTriggerForConfig, connectedServices]);

  // Reset last-loaded ref when switching away from integration trigger config
  useEffect(() => {
    if (!selectedTriggerForConfig || selectedTriggerForConfig.id === "webhook" || selectedTriggerForConfig.id === "schedule") {
      lastLoadedResourcesSlugRef.current = null;
    }
  }, [selectedTriggerForConfig?.id]);

  // Fetch secondary resources (Discord channels when guild selected, Airtable tables when base selected)
  useEffect(() => {
    const slug = selectedTriggerForConfig?.icon.type === "logo" ? selectedTriggerForConfig.icon.slug : "";
    if (slug === "discord" && integrationDiscordGuildId) {
      fetch(`/api/integrations/discord/channels?guildId=${encodeURIComponent(integrationDiscordGuildId)}`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setIntegrationResourcesSecondary((d.channels ?? []).map((ch: { id: string; name: string }) => ({ id: ch.id, name: ch.name }))))
        .catch(() => setIntegrationResourcesSecondary([]));
      setIntegrationDiscordChannelId("");
    } else if (slug === "airtable" && integrationAirtableBaseId) {
      fetch(`/api/integrations/airtable/tables/${integrationAirtableBaseId}`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setIntegrationResourcesSecondary((d.tables ?? []).map((t: { id: string; name?: string }) => ({ id: t.id, name: t.name || t.id }))))
        .catch(() => setIntegrationResourcesSecondary([]));
      setIntegrationAirtableTableId("");
    } else {
      setIntegrationResourcesSecondary([]);
    }
  }, [selectedTriggerForConfig?.id, integrationDiscordGuildId, integrationAirtableBaseId]);

  // Poll integration status when capabilities include connectable integrations, when configuring an integration trigger, or when Add Capabilities sidebar is open
  const capabilitiesWithIntegration = capabilities.filter((c) => getCapabilityIntegrationInfo(c.slug));
  const isConfiguringIntegrationTrigger = !!(
    selectedTriggerForConfig &&
    selectedTriggerForConfig.id !== "webhook" &&
    selectedTriggerForConfig.id !== "schedule" &&
    TRIGGER_TO_SERVICE[selectedTriggerForConfig.id]
  );
  useEffect(() => {
    if (capabilitiesWithIntegration.length === 0 && !isConfiguringIntegrationTrigger && !capabilitiesSidebarOpen && agent?.status !== "pending_integrations") return;
        const poll = async () => {
      try {
        const res = await fetch("/api/integrations/status", { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        const services: string[] = (json.integrations ?? [])
          .filter((x: { service: string; connected?: boolean }) => x.service && x.connected !== false)
          .map((x: { service: string }) => x.service);
        setConnectedServices(services);
      } catch {
        /* ignore */
      }
    };
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "integration-connected" && event.data?.service) {
        poll(); // Immediate refresh when credential popup completes
        // If we were connecting a capability, add it now that OAuth/API is done
        const pending = pendingCapabilityAddRef.current;
        if (pending) {
          const capInfo = getCapabilityIntegrationInfo(pending.slug);
          if (capInfo && capInfo.service === event.data?.service) {
            setCapabilities((c) => (c.some((x) => x.slug === pending.slug) ? c : [...c, pending]));
            pendingCapabilityAddRef.current = null;
          }
        }
      }
    };
    poll();
    window.addEventListener("message", handleMessage);
    const id = setInterval(poll, 3000);
    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(id);
    };
  }, [capabilitiesWithIntegration.length, isConfiguringIntegrationTrigger, capabilitiesSidebarOpen, agent?.status]);

  const handleConnectCapability = (int: { slug: string; name: string }) => {
    const capInfo = getCapabilityIntegrationInfo(int.slug);
    if (!capInfo) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    let connectUrl = capInfo.connectUrl.startsWith("http") ? capInfo.connectUrl : `${origin}${capInfo.connectUrl}`;
    if (capInfo.connectionMethod === "oauth") {
      const sep = connectUrl.includes("?") ? "&" : "?";
      const returnUrl = `${origin}/integrations/oauth-return?service=${encodeURIComponent(capInfo.service)}`;
      connectUrl += `${sep}returnUrl=${encodeURIComponent(returnUrl)}${agentId ? `&agent_id=${encodeURIComponent(agentId)}` : ""}`;
    }
    pendingCapabilityAddRef.current = int;
    const w = 600;
    const h = 700;
    const left = Math.round((window.screen.width - w) / 2);
    const top = Math.round((window.screen.height - h) / 2);
    window.open(connectUrl, "ConnectIntegration", `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
  };

  const buildTriggerBehaviourPlan = (): { behaviourType: string; triggerType?: string; scheduleCron?: string; config: Record<string, any>; description: string } | null => {
    if (!selectedTriggerForConfig) return null;
    const { id, name, description } = selectedTriggerForConfig;
    if (id === "webhook") {
      if (!webhookPath.trim()) return null;
      return {
        behaviourType: "webhook",
        config: { path: webhookPath.trim(), _webhookSampleFields: webhookSampleFields },
        description: `Run when webhook receives a request at /${webhookPath.trim()}`,
      };
    }
    if (id === "schedule") {
      let cron = "";
      if (scheduleFrequency === "hourly") cron = "0 * * * *";
      else if (scheduleFrequency === "daily") {
        const [h, m] = scheduleTime.split(":").map(Number);
        cron = `${m || 0} ${h || 9} * * *`;
      } else if (scheduleFrequency === "weekly") {
        const dayNum = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(scheduleDay);
        const [h, m] = scheduleTime.split(":").map(Number);
        cron = `${m || 0} ${h || 9} * * ${dayNum}`;
      } else cron = scheduleCron.trim() || "0 9 * * 1-5";
      return {
        behaviourType: "schedule",
        scheduleCron: cron,
        config: { frequency: scheduleFrequency, time: scheduleTime, day: scheduleDay, customCron: scheduleCron },
        description: `Run on schedule: ${scheduleFrequency === "hourly" ? "every hour" : scheduleFrequency === "daily" ? `daily at ${scheduleTime}` : scheduleFrequency === "weekly" ? `${scheduleDay} at ${scheduleTime}` : `cron ${cron}`}`,
      };
    }
    const triggerType = TRIGGER_ID_TO_TRIGGER_TYPE[id];
    if (!triggerType) return null;
    const slug = selectedTriggerForConfig.icon.type === "logo" ? selectedTriggerForConfig.icon.slug : "";
    let config: Record<string, any> = {};
    if (slug === "googleforms") config = { formId: integrationFormId };
    else if (slug === "googledrive") config = { folderId: integrationFolderId };
    else if (slug === "googlecalendar") config = { calendarId: integrationCalendarId || "primary" };
    else if (slug === "slack") config = { channel: integrationSlackChannelId };
    else if (slug === "discord") config = { guildId: integrationDiscordGuildId, channelId: integrationDiscordChannelId, guild_id: integrationDiscordGuildId, channel_id: integrationDiscordChannelId };
    else if (slug === "github") config = { repo: integrationGithubRepo };
    else if (slug === "gmail") config = { labelId: "INBOX", categoryId: integrationGmailCategoryId === "__all__" ? undefined : integrationGmailCategoryId };
    else if (slug === "notion") config = { databaseId: integrationNotionDatabaseId };
    else if (slug === "airtable") config = { baseId: integrationAirtableBaseId, tableId: integrationAirtableTableId };
    else if (slug === "trello") config = { boardId: integrationTrelloBoardId };
    else return null;
    const hasRequiredConfig = (slug === "googleforms" && !!integrationFormId)
      || (slug === "googledrive" && !!integrationFolderId)
      || (slug === "googlecalendar" && !!integrationCalendarId)
      || (slug === "slack" && !!integrationSlackChannelId)
      || (slug === "discord" && !!integrationDiscordGuildId && !!integrationDiscordChannelId)
      || (slug === "github" && !!integrationGithubRepo)
      || (slug === "gmail" && true)
      || (slug === "notion" && !!integrationNotionDatabaseId)
      || (slug === "airtable" && !!integrationAirtableBaseId && !!integrationAirtableTableId)
      || (slug === "trello" && !!integrationTrelloBoardId);
    if (!hasRequiredConfig) return null;
    const descLabel = (slug === "slack" && integrationResources.find((r) => r.id === integrationSlackChannelId)?.name)
      ? `Slack #${integrationResources.find((r) => r.id === integrationSlackChannelId)?.name}`
      : (slug === "googlecalendar" && integrationResources.find((r) => r.id === integrationCalendarId)?.name)
        ? `Calendar ${integrationResources.find((r) => r.id === integrationCalendarId)?.name}`
        : (slug === "discord" && integrationResourcesSecondary.find((r) => r.id === integrationDiscordChannelId)?.name)
        ? `Discord #${integrationResourcesSecondary.find((r) => r.id === integrationDiscordChannelId)?.name}`
        : (slug === "github" && integrationGithubRepo)
          ? `GitHub ${integrationGithubRepo}`
          : (slug === "gmail")
            ? (integrationGmailCategoryId === "__all__" ? "Gmail Inbox" : `Gmail ${integrationResources.find((r) => r.id === integrationGmailCategoryId)?.name}`)
            : (slug === "notion" && integrationResources.find((r) => r.id === integrationNotionDatabaseId)?.name)
              ? `Notion ${integrationResources.find((r) => r.id === integrationNotionDatabaseId)?.name}`
              : (slug === "airtable" && integrationResourcesSecondary.find((r) => r.id === integrationAirtableTableId)?.name)
                ? `Airtable ${integrationResourcesSecondary.find((r) => r.id === integrationAirtableTableId)?.name}`
                : (slug === "trello" && integrationResources.find((r) => r.id === integrationTrelloBoardId)?.name)
                  ? `Trello ${integrationResources.find((r) => r.id === integrationTrelloBoardId)?.name}`
                  : name;
    return {
      behaviourType: "polling",
      triggerType,
      config,
      description: descLabel || name,
    };
  };

  const handleEditTrigger = (b: { id: string; behaviour_type: string; trigger_type?: string | null; config?: Record<string, any> }) => {
    let trigger = AVAILABLE_TRIGGERS.find((t) => {
      if (b.behaviour_type === "webhook") return t.id === "webhook";
      if (b.behaviour_type === "schedule" || b.behaviour_type === "heartbeat") return t.id === "schedule";
      const id = b.trigger_type ? TRIGGER_TYPE_TO_ID[b.trigger_type] : null;
      return id && t.id === id;
    });
    if (!trigger) return;
    const cfg = b.config ?? {};
    if (trigger.id === "webhook") {
      setWebhookPath(cfg.path ?? "");
    } else if (trigger.id === "schedule") {
      setScheduleFrequency(cfg.frequency ?? "hourly");
      setScheduleTime(cfg.time ?? "09:00");
      setScheduleDay(cfg.day ?? "monday");
      setScheduleCron(cfg.customCron ?? "");
    } else {
      const slug = trigger.icon.type === "logo" ? trigger.icon.slug : "";
      if (slug === "googleforms") setIntegrationFormId(cfg.formId ?? "");
      else if (slug === "googledrive") setIntegrationFolderId(cfg.folderId ?? "");
      else if (slug === "googlecalendar") setIntegrationCalendarId(cfg.calendarId ?? cfg.calendar_id ?? "");
      else if (slug === "slack") setIntegrationSlackChannelId(cfg.channel ?? "");
      else if (slug === "discord") {
        setIntegrationDiscordGuildId(cfg.guildId ?? cfg.guild_id ?? "");
        setIntegrationDiscordChannelId(cfg.channelId ?? cfg.channel_id ?? "");
      } else if (slug === "github") setIntegrationGithubRepo(cfg.repo ?? "");
      else if (slug === "gmail") setIntegrationGmailCategoryId(cfg.categoryId ?? "__all__");
      else if (slug === "notion") setIntegrationNotionDatabaseId(cfg.databaseId ?? "");
      else if (slug === "airtable") {
        setIntegrationAirtableBaseId(cfg.baseId ?? "");
        setIntegrationAirtableTableId(cfg.tableId ?? "");
      } else if (slug === "trello") setIntegrationTrelloBoardId(cfg.boardId ?? "");
    }
    setEditingBehaviourId(b.id);
    setSelectedTriggerForConfig(trigger);
    setTriggersSidebarOpen(true);
  };

  const handleSaveTriggerConfig = async () => {
    if (!agentId || agentId === "new") {
      setTriggerSaveError("Save your agent first.");
      return;
    }
    const slug = selectedTriggerForConfig?.icon.type === "logo" ? selectedTriggerForConfig.icon.slug : "";
    if (slug === "googlecalendar") {
      setTriggerSaveError("Calendar triggers are coming soon.");
      return;
    }
    const plan = buildTriggerBehaviourPlan();
    if (!plan) {
      setTriggerSaveError("Please complete the configuration.");
      return;
    }
    setTriggerSaveError(null);
    setTriggerSaveLoading(true);
    try {
      if (editingBehaviourId) {
        const delRes = await fetch(`/api/agents/${agentId}/triggers`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ behaviourId: editingBehaviourId }),
          credentials: "include",
        });
        if (!delRes.ok) throw new Error("Failed to remove existing trigger");
        setEditingBehaviourId(null);
      }
      const res = await fetch(`/api/agents/${agentId}/triggers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ behaviour: plan }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save trigger");
      await refetchAgent();
      setSelectedTriggerForConfig(null);
      setTriggerSaveError(null);
      setTriggersSidebarOpen(false);
    } catch (e: any) {
      setTriggerSaveError(e?.message ?? "Failed to save trigger");
    } finally {
      setTriggerSaveLoading(false);
    }
  };

  const resetKnowledgeForm = () => {
    setKnowledgeForm({ type: "memory", memoryText: "", documentName: "", documentFile: null, url: "", urlLabel: "" });
    setDocumentUploadError(null);
    if (documentInputRef.current) documentInputRef.current.value = "";
  };

  const resetGoalsRulesForm = () => {
    setGoalsRulesForm({ type: "goal", label: "" });
  };

  const handleRemoveKnowledge = async (item: { id: string; type: KnowledgeItemType; label: string }) => {
    const isBackendMemory = item.type === "memory" && !item.id.startsWith("k-");
    if (isBackendMemory && agentId) {
      try {
        await fetch(`/api/agents/${agentId}/memory?memoryId=${encodeURIComponent(item.id)}`, {
          method: "DELETE",
        });
      } catch (e) {
        console.error("Failed to delete memory:", e);
      }
    }
    setKnowledgeItems((prev) => prev.filter((k) => k.id !== item.id));
  };

  const persistGoalsRules = async (next: Array<{ id: string; type: GoalsRulesItemType; label: string }>) => {
    if (!agentId) return;
    try {
      await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals_rules: next }),
      });
    } catch (e) {
      console.error("Failed to save goals/rules:", e);
    }
  };

  const handleAddGoalRule = () => {
    const label = goalsRulesForm.label.trim();
    if (!label) return;
    let next: Array<{ id: string; type: GoalsRulesItemType; label: string }>;
    if (editingGoalsRulesId) {
      next = goalsRules.map((item) =>
        item.id === editingGoalsRulesId ? { ...item, type: goalsRulesForm.type, label } : item
      );
      setEditingGoalsRulesId(null);
    } else {
      const newItem = { id: `gr-${Date.now()}`, type: goalsRulesForm.type, label };
      next = [...goalsRules, newItem];
    }
    setGoalsRules(next);
    persistGoalsRules(next);
    resetGoalsRulesForm();
    setGoalsRulesModalOpen(false);
  };

  const handleRemoveGoalRule = (item: { id: string; type: GoalsRulesItemType; label: string }) => {
    const next = goalsRules.filter((k) => k.id !== item.id);
    setGoalsRules(next);
    persistGoalsRules(next);
  };

  const handleAddKnowledge = async () => {
    let label = "";
    if (knowledgeForm.type === "memory") {
      label = knowledgeForm.memoryText.trim();
      if (!label) return;
      if (!editingKnowledgeId && agentId) {
        try {
          const res = await fetch(`/api/agents/${agentId}/memory`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: label, memory_type: "instruction", importance: 6 }),
          });
          const data = await res.json();
          if (res.ok && data?.memory?.id) {
            setKnowledgeItems((prev) => [...prev, { id: data.memory.id, type: "memory", label }]);
            resetKnowledgeForm();
            setKnowledgeModalOpen(false);
            return;
          }
        } catch (e) {
          console.error("Failed to add memory:", e);
        }
      }
    } else if (knowledgeForm.type === "document") {
      const file = knowledgeForm.documentFile;
      if (editingKnowledgeId && !file) {
        const existing = knowledgeItems.find((k) => k.id === editingKnowledgeId);
        label = existing?.label ?? "";
      } else if (!file) {
        setDocumentUploadError("Please select a file");
        return;
      } else {
        setDocumentUploading(true);
        setDocumentUploadError(null);
        try {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch(`/api/agents/${agentId}/knowledge/upload`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (!res.ok) {
            setDocumentUploadError(data.error || "Upload failed");
            return;
          }
          label = data.filename;
        } catch (e) {
          setDocumentUploadError("Upload failed");
          return;
        } finally {
          setDocumentUploading(false);
        }
      }
    } else {
      const urlVal = knowledgeForm.url.trim();
      label = knowledgeForm.urlLabel.trim() || urlVal;
      if (editingKnowledgeId && knowledgeForm.urlLabel.trim()) {
        label = knowledgeForm.urlLabel.trim();
      } else if (!urlVal) return;
      if (!label) return;
    }
    if (editingKnowledgeId) {
      const isBackendMemory = knowledgeForm.type === "memory" && !editingKnowledgeId.startsWith("k-");
      if (isBackendMemory && agentId && knowledgeForm.type === "memory") {
        try {
          await fetch(`/api/agents/${agentId}/memory?memoryId=${encodeURIComponent(editingKnowledgeId)}`, { method: "DELETE" });
          const res = await fetch(`/api/agents/${agentId}/memory`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: label, memory_type: "instruction", importance: 6 }),
          });
          const data = await res.json();
          if (res.ok && data?.memory?.id) {
            setKnowledgeItems((prev) =>
              prev.map((item) =>
                item.id === editingKnowledgeId ? { ...item, id: data.memory.id, type: "memory", label } : item
              )
            );
          }
        } catch (e) {
          console.error("Failed to update memory:", e);
        }
      } else {
        setKnowledgeItems((prev) =>
          prev.map((item) =>
            item.id === editingKnowledgeId ? { ...item, type: knowledgeForm.type, label } : item
          )
        );
      }
      setEditingKnowledgeId(null);
    } else {
      const newItem = {
        id: `k-${Date.now()}`,
        type: knowledgeForm.type,
        label,
      };
      setKnowledgeItems((prev) => [...prev, newItem]);
    }
    resetKnowledgeForm();
    setKnowledgeModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col pb-8">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 flex-shrink-0 rounded-full bg-gray-200 dark:bg-[#303030] animate-pulse" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-32 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
              <div className="h-5 w-14 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
            </div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
          </div>
        </div>

        {/* Two-column grid skeleton */}
        <div className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
            {/* Left column — Activity Feed */}
            <div className="min-h-[320px] flex-1 min-w-0 rounded-lg bg-stone-50 dark:bg-stone-800/50 flex flex-col overflow-hidden">
              <div className="h-10 px-3 flex items-center bg-stone-100 dark:bg-stone-700/40">
                <div className="h-4 w-24 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
              </div>
              <div className="flex-1 p-2 space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-2 p-2 rounded-md bg-white dark:bg-stone-900/80">
                    <div className="h-5 w-5 flex-shrink-0 rounded bg-gray-200 dark:bg-[#303030] animate-pulse" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-full bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                      <div className="h-3 w-16 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column — Cards */}
            <div className="flex flex-col gap-5 min-w-0">
              {[
                { h: 210, rows: 4 },
                { h: 280, rows: 5 },
                { h: 245, rows: 5 },
              ].map((card, ci) => (
                <div
                  key={ci}
                  className="rounded-lg bg-stone-50 dark:bg-stone-800/50 flex flex-col overflow-hidden"
                  style={{ minHeight: card.h }}
                >
                  <div className="h-10 px-3 flex items-center justify-between bg-stone-100 dark:bg-stone-700/40">
                    <div className="h-4 w-28 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                    <div className="h-7 w-12 bg-gray-200 dark:bg-[#303030] rounded-lg animate-pulse" />
                  </div>
                  <div className="flex-1 p-2 space-y-1.5">
                    {Array.from({ length: card.rows }).map((_, ri) => (
                      <div
                        key={ri}
                        className="flex items-center gap-2 rounded-md bg-white dark:bg-stone-900/80 px-3 py-1.5"
                      >
                        <div className="h-6 w-6 rounded bg-gray-200 dark:bg-[#303030] animate-pulse flex-shrink-0" />
                        <div className="h-4 flex-1 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center text-sm text-muted-foreground">
        Could not load agent.
      </div>
    );
  }

  const avatarUrl = agent.avatar_image ?? getAgentAvatarUrl(agent.id);
  const shortDesc = agent.short_description?.trim() || agent.description?.trim();
  const oneLiner = shortDesc ? (shortDesc.length > 55 ? shortDesc.slice(0, 55) + "…" : shortDesc) : "Personal AI assistant";

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400", label: "Active" },
    paused: { bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400", label: "Paused" },
    deploying: { bg: "bg-sky-500/15", text: "text-sky-600 dark:text-sky-400", label: "Deploying" },
    error: { bg: "bg-rose-500/15", text: "text-rose-600 dark:text-rose-400", label: "Error" },
    pending_integrations: { bg: "bg-violet-500/15", text: "text-violet-600 dark:text-violet-400", label: "Pending integrations" },
  };
  const status = statusConfig[agent.status] ?? statusConfig.paused;
  const isPendingIntegrations = agent.status === "pending_integrations";

  return (
    <>
    <div className="flex flex-col pb-8">
      <EventDetailDialog
        event={selectedActivity}
        open={activityDetailOpen}
        onOpenChange={setActivityDetailOpen}
      />
      {/* Header: profile pic + name + short description + pause */}
      <div className="flex-shrink-0 flex items-center gap-4">
        <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border border-stone-200/60 dark:border-white/10 bg-stone-200/60 dark:bg-white/5">
          <img
            src={avatarUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
          <div className="hidden absolute inset-0 flex items-center justify-center text-stone-400 dark:text-stone-500">
            <User className="h-7 w-7" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold tracking-tight text-foreground leading-tight">
              {agent.name}
            </h2>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${status.bg} ${status.text}`}
            >
              {status.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {oneLiner}
          </p>
        </div>
        {isPendingIntegrations ? (
          <button
            type="button"
            onClick={handleActivateAgent}
            disabled={activateLoading}
            className={cn(
              "flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium backdrop-blur-xl border transition-colors",
              !activateLoading
                ? "text-foreground bg-violet-500/20 dark:bg-violet-500/10 border-violet-400/30 dark:border-violet-400/20 hover:bg-violet-500/30 dark:hover:bg-violet-500/20"
                : "text-muted-foreground bg-white/30 dark:bg-white/[0.03] border-stone-200/60 dark:border-white/5 cursor-not-allowed"
            )}
            aria-label="Activate agent"
          >
            {activateLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {activateLoading ? "Activating…" : "Activate"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRunAgent}
            disabled={agent?.status !== "active" || runLoading}
            className={cn(
              "flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium backdrop-blur-xl border transition-colors",
              agent?.status === "active" && !runLoading
                ? "text-foreground bg-white/50 dark:bg-white/5 border-stone-200/80 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] hover:bg-white/60 dark:hover:bg-white/10"
                : "text-muted-foreground bg-white/30 dark:bg-white/[0.03] border-stone-200/60 dark:border-white/5 cursor-not-allowed"
            )}
            aria-label="Run agent"
          >
            {runLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {runLoading ? "Running…" : "Run"}
          </button>
        )}
        <button
          type="button"
          onClick={handlePauseAgent}
          disabled={
            pauseLoading ||
            isPendingIntegrations ||
            (agent?.status !== "active" && agent?.status !== "paused")
          }
          className={cn(
            "flex-shrink-0 rounded-full p-2.5 transition-colors",
            pauseLoading ||
            isPendingIntegrations ||
            (agent?.status !== "active" && agent?.status !== "paused")
              ? "text-muted-foreground/50 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground hover:bg-stone-200/60 dark:hover:bg-white/10"
          )}
          aria-label={agent?.status === "active" ? "Pause agent" : "Resume agent"}
        >
          {pauseLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : agent?.status === "paused" ? (
            <Play className="h-5 w-5" />
          ) : (
            <Pause className="h-5 w-5" />
          )}
        </button>
        {onAgentChatSidebarOpenChange && (
          <button
            type="button"
            onClick={() => onAgentChatSidebarOpenChange(!agentChatSidebarOpen)}
            className={cn(
              "flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium backdrop-blur-xl border transition-colors",
              agentChatSidebarOpen
                ? "text-foreground bg-violet-500/15 dark:bg-violet-500/10 border-violet-400/30 dark:border-violet-400/20"
                : "text-muted-foreground bg-white/50 dark:bg-white/5 border-stone-200/80 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] hover:bg-white/60 dark:hover:bg-white/10 hover:text-foreground"
            )}
            aria-label={agentChatSidebarOpen ? "Close chat" : "Chat with agent"}
          >
            <BotMessageSquare className="h-4 w-4" />
            Chat
          </button>
        )}
      </div>
      {runSuccess && (
        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400" role="status">
          Agent run triggered — results will appear in the activity feed shortly.
        </p>
      )}
      {(runError || pauseError || activateError) && (
        <p className="mt-2 text-xs text-red-500 dark:text-red-400" role="alert">
          {runError ?? pauseError ?? activateError}
        </p>
      )}

      {/* Integration gate when pending_integrations — show Connect buttons for disconnected integrations */}
      {agent.status === "pending_integrations" && (() => {
        const plan = planFromBehaviours((agent.behaviours ?? []) as Array<{ behaviour_type: string; trigger_type?: string | null; config?: Record<string, unknown>; description?: string }>);
        const requiredIntegrations = buildIntegrationCheckListForPolling(plan, connectedServices);
        const disconnected = requiredIntegrations.filter((i) => !i.connected);
        if (disconnected.length === 0) return null;
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        return (
          <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 p-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-3">
              Connect these integrations to activate your agent:
            </p>
            <div className="flex flex-wrap gap-2">
              {disconnected.map((item) => {
                const logoSlug = SERVICE_ID_TO_LOGO_SLUG[item.service] ?? item.service;
                const logoUrl = getIntegrationLogoUrl(logoSlug);
                return (
                  <button
                    key={item.service}
                    type="button"
                    onClick={() => {
                      let url = item.connectUrl.startsWith("http") ? item.connectUrl : `${origin}${item.connectUrl}`;
                      const returnUrl = `${origin}/integrations/oauth-return?service=${encodeURIComponent(item.service)}`;
                      if (item.connectionMethod === "oauth") {
                        const sep = url.includes("?") ? "&" : "?";
                        url += `${sep}returnUrl=${encodeURIComponent(returnUrl)}${agentId ? `&agent_id=${encodeURIComponent(agentId)}` : ""}`;
                        window.location.href = url;
                      } else {
                        const sep = url.includes("?") ? "&" : "?";
                        url += `${sep}returnUrl=${encodeURIComponent(returnUrl)}`;
                        window.open(url, "ConnectIntegration", "width=600,height=700");
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-amber-300 dark:border-amber-700/60 bg-white dark:bg-stone-900/80 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                  >
                    <img src={logoUrl} alt="" className="h-5 w-5 rounded object-contain" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Two-column widget layout: left 2/3, right 1/3 */}
      <div className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
          {/* Left column — 2/3 */}
          <div className="flex flex-col gap-5 min-w-0">
            <div className="rounded-lg bg-stone-50 dark:bg-stone-800/50 flex flex-col overflow-hidden min-h-[200px]">
              <header className="flex flex-row items-center justify-between gap-2 h-10 px-3 bg-stone-100 dark:bg-stone-700/40 flex-shrink-0">
                <h3 className="font-semibold text-sm text-foreground">Activity Feed</h3>
                <button
                  type="button"
                  onClick={fetchActivity}
                  disabled={activityLoading}
                  className="rounded p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Reload activity"
                >
                  <RefreshCw className={cn("h-4 w-4", activityLoading && "animate-spin")} />
                </button>
              </header>
              <div className="flex flex-col overflow-hidden">
                <div className="flex flex-col p-2 space-y-1.5">
                  {activityItems.length > 0 ? (
                    <>
                      {activityItems
                        .slice(
                          (activityPage - 1) * ACTIVITY_PAGE_SIZE,
                          activityPage * ACTIVITY_PAGE_SIZE
                        )
                        .map((item) => {
                          const Icon = getActivityIcon(item.type);
                          const iconColor = getActivityIconColor(item.type);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setSelectedActivity(item);
                                setActivityDetailOpen(true);
                              }}
                              className="flex w-full cursor-pointer items-center gap-2.5 rounded-md bg-white dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-600/50 px-3 py-2 shadow-sm text-left transition-colors hover:bg-stone-100/80 dark:hover:bg-stone-700/60"
                              aria-label={`View ${item.title}`}
                            >
                              <div className={`flex-shrink-0 ${iconColor}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground leading-snug">
                                  {item.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            </button>
                          );
                        })}
                      {activityPage >= Math.ceil(activityItems.length / ACTIVITY_PAGE_SIZE) && (
                        <div className="flex flex-col items-center gap-2 pt-2 pb-1">
                          <p className="text-xs text-muted-foreground">No additional events found</p>
                          <button
                            type="button"
                            onClick={fetchActivity}
                            disabled={activityLoading}
                            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Refresh events"
                          >
                            <RefreshCw className={cn("h-3.5 w-3.5", activityLoading && "animate-spin")} />
                            Refresh events
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                  <div className="flex flex-1 min-h-[200px] flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-muted-foreground">No activity yet</p>
                    <p className="mt-1 text-xs text-muted-foreground/80">
                      Actions and runs will appear here
                    </p>
                  </div>
                  )}
                </div>
                {activityItems.length > 0 && (
                  <div className="flex flex-shrink-0 items-center justify-center gap-1 p-2">
                    <button
                      type="button"
                      onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                      disabled={activityPage <= 1}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground disabled:opacity-40 disabled:pointer-events-none"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Prev
                    </button>
                    {Array.from(
                      { length: Math.ceil(activityItems.length / ACTIVITY_PAGE_SIZE) },
                      (_, i) => i + 1
                    ).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setActivityPage(page)}
                        className={`min-w-[1.75rem] h-7 rounded-md text-xs font-medium transition-colors ${
                          activityPage === page
                            ? "bg-stone-100 dark:bg-stone-500 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-stone-200/60 dark:hover:bg-stone-600/50"
                        }`}
                        aria-label={`Page ${page}`}
                        aria-current={activityPage === page ? "page" : undefined}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setActivityPage((p) =>
                          Math.min(Math.ceil(activityItems.length / ACTIVITY_PAGE_SIZE), p + 1)
                        )
                      }
                      disabled={
                        activityPage >= Math.ceil(activityItems.length / ACTIVITY_PAGE_SIZE)
                      }
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground disabled:opacity-40 disabled:pointer-events-none"
                      aria-label="Next page"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Right column — 1/3 */}
          <div className="flex flex-col gap-5 min-w-0">
            <div className="min-h-[210px] rounded-lg bg-stone-50 dark:bg-stone-800/50 flex flex-col overflow-hidden">
              <header className="flex flex-row items-center justify-between gap-2 h-10 px-3 bg-stone-100 dark:bg-stone-700/40 flex-shrink-0">
                <h3 className="font-semibold text-sm text-foreground">Capabilities</h3>
                <button
                  type="button"
                  onClick={() => {
                    setCapabilitiesSearch("");
                    setCapabilitiesSidebarOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground/90 backdrop-blur-xl bg-white/50 dark:bg-white/10 border border-stone-200/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] hover:bg-white/70 dark:hover:bg-white/15 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
                {capabilities.length > 0 ? (
                  capabilities.map((cap) => {
                    const capInfo = getCapabilityIntegrationInfo(cap.slug);
                    const hasIntegration = !!capInfo;
                    const isConnected =
                      hasIntegration && isServiceConnected(capInfo!.service, connectedServices);
                    const showConnect = hasIntegration && !isConnected;
                    const showMinus = !showConnect;

                    const handleConnect = () => {
                      if (!capInfo) return;
                      const origin = typeof window !== "undefined" ? window.location.origin : "";
                      const returnUrl =
                        typeof window !== "undefined"
                          ? `${origin}${window.location.pathname}${window.location.search}`
                          : "/agents/new";
                      const connectUrl = capInfo.connectUrl.startsWith("http")
                        ? capInfo.connectUrl
                        : `${origin}${capInfo.connectUrl}`;
                      if (capInfo.connectionMethod === "oauth") {
                        const sep = connectUrl.includes("?") ? "&" : "?";
                        window.location.href = `${connectUrl}${sep}returnUrl=${encodeURIComponent(returnUrl)}`;
                      } else {
                        const w = 600;
                        const h = 700;
                        const left = Math.round((window.screen.width - w) / 2);
                        const top = Math.round((window.screen.height - h) / 2);
                        window.open(
                          connectUrl,
                          "ConnectIntegration",
                          `width=${w},height=${h},left=${left},top=${top}`
                        );
                      }
                    };

                    return (
                      <div
                        key={cap.slug}
                        className="flex items-center justify-between gap-2 rounded-md bg-white dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-600/50 px-3 py-1.5 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="relative w-6 h-6 rounded flex-shrink-0 overflow-hidden">
                            <img
                              src={getIntegrationLogoUrl(cap.slug)}
                              alt=""
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.src = `https://cdn.simpleicons.org/${cap.slug}`;
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                            {cap.name}
                            {showConnect && (
                              <span
                                className="flex-shrink-0 text-red-500 dark:text-red-400"
                                title="Integration not connected"
                                aria-label="Integration not connected"
                              >
                                <AlertCircle className="h-4 w-4" />
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {showConnect && (
                            <button
                              type="button"
                              onClick={handleConnect}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-foreground/90 backdrop-blur-xl bg-stone-100/95 dark:bg-white/5 border border-stone-200 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] hover:bg-stone-200/80 dark:hover:bg-white/10 transition-colors"
                            >
                              Connect
                            </button>
                          )}
                          {(showConnect || showMinus) && (
                            <button
                              type="button"
                              onClick={() => setCapabilities((prev) => prev.filter((c) => c.slug !== cap.slug))}
                              className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-stone-200/80 dark:hover:bg-stone-600/50 transition-colors"
                              aria-label={`Remove ${cap.name}`}
                            >
                              <MinusCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-1 min-h-[140px] flex-col items-center justify-center gap-3 py-8 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">No integrations added</p>
                      <p className="mt-1 text-xs text-muted-foreground/80">
                        Add tools and integrations the agent can use
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCapabilitiesSearch("");
                        setCapabilitiesSidebarOpen(true);
                      }}
                      className="backdrop-blur-xl bg-white/50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] hover:bg-white/60 dark:hover:bg-white/10"
                    >
                      Add Capabilities
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="min-h-[140px] rounded-lg bg-stone-50 dark:bg-stone-800/50 flex flex-col overflow-hidden">
              <header className="flex flex-row items-center justify-between gap-2 h-10 px-3 bg-stone-100 dark:bg-stone-700/40 flex-shrink-0">
                <h3 className="font-semibold text-sm text-foreground">Triggers</h3>
                <button
                  type="button"
                  onClick={() => setTriggersSidebarOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground/90 backdrop-blur-xl bg-white/50 dark:bg-white/10 border border-stone-200/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] hover:bg-white/70 dark:hover:bg-white/15 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
                {(agent?.behaviours?.length ?? 0) > 0 ? (
                  (agent!.behaviours as Array<{ id: string; behaviour_type: string; trigger_type?: string | null; description?: string; config?: Record<string, any> }>).map((b) => {
                    const label =
                      b.description?.trim() ||
                      (b.behaviour_type === "webhook"
                        ? `Webhook: /${b.config?.path || "..."}`
                        : b.behaviour_type === "schedule"
                          ? `Schedule: ${b.config?.frequency || "cron"}`
                          : b.trigger_type
                            ? `${b.trigger_type.replace(/-/g, " ")}`
                            : b.behaviour_type);

                    // For polling triggers, look up the integration logo slug from the trigger type
                    const triggerLogoSlug =
                      b.behaviour_type === "polling" && b.trigger_type
                        ? (TRIGGER_TYPE_TO_ID[b.trigger_type] ?? null)
                        : null;

                    // Determine if the integration for this trigger is connected (used for Configure button)
                    const triggerServiceId = triggerLogoSlug ? (TRIGGER_TO_SERVICE[triggerLogoSlug] ?? null) : null;
                    const triggerIsConnected = triggerServiceId
                      ? isServiceConnected(triggerServiceId, connectedServices)
                      : true;
                    const triggerNeedsConnect = !!triggerServiceId && !triggerIsConnected;

                    // Fallback icon for webhook / schedule
                    const FallbackIcon =
                      b.behaviour_type === "webhook"
                        ? Webhook
                        : b.behaviour_type === "schedule"
                          ? Timer
                          : Target;

                    return (
                      <div
                        key={b.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-white dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-600/50 px-3 py-2 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {triggerLogoSlug ? (
                            <div className="relative w-6 h-6 rounded flex-shrink-0 overflow-hidden">
                              <img
                                src={getIntegrationLogoUrl(triggerLogoSlug)}
                                alt=""
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = `https://cdn.simpleicons.org/${triggerLogoSlug}`;
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-stone-100 dark:bg-stone-700/50">
                              <FallbackIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-foreground truncate">{label}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {triggerNeedsConnect ? (
                            <button
                              type="button"
                              onClick={() => handleEditTrigger(b)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-foreground/90 backdrop-blur-xl bg-stone-100/95 dark:bg-white/5 border border-stone-200 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] hover:bg-stone-200/80 dark:hover:bg-white/10 transition-colors"
                            >
                              Configure
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEditTrigger(b)}
                              className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-stone-200/80 dark:hover:bg-stone-600/50 transition-colors"
                              aria-label={`Edit ${label}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              if (!agentId || agentId === "new") return;
                              try {
                                const res = await fetch(`/api/agents/${agentId}/triggers`, {
                                  method: "DELETE",
                                  headers: { "Content-Type": "application/json" },
                                  credentials: "include",
                                  body: JSON.stringify({ behaviourId: b.id }),
                                });
                                if (res.ok) refetchAgent();
                              } catch (e) {
                                console.error("Failed to remove trigger:", e);
                              }
                            }}
                            className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-stone-200/80 dark:hover:bg-stone-600/50 transition-colors"
                            aria-label={`Remove ${label}`}
                          >
                            <MinusCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-1 min-h-[140px] flex-col items-center justify-center gap-3 py-8 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">This agent runs manually.</p>
                      <p className="mt-1 text-xs text-muted-foreground/80">
                        Add a trigger to make it autonomous.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTriggersSidebarOpen(true)}
                      className="backdrop-blur-xl bg-white/50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] hover:bg-white/60 dark:hover:bg-white/10"
                    >
                      Setup Trigger
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="min-h-[280px] rounded-lg bg-stone-50 dark:bg-stone-800/50 flex flex-col overflow-hidden">
              <header className="flex flex-row items-center justify-between gap-2 h-10 px-3 bg-stone-100 dark:bg-stone-700/40 flex-shrink-0">
                <h3 className="font-semibold text-sm text-foreground">Knowledge & Memory</h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingKnowledgeId(null);
                    resetKnowledgeForm();
                    setKnowledgeModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground/90 backdrop-blur-xl bg-white/50 dark:bg-white/10 border border-stone-200/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] hover:bg-white/70 dark:hover:bg-white/15 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
                {knowledgeItems.length > 0 ? (
                  knowledgeItems.map((item) => {
                    const Icon =
                      item.type === "memory"
                        ? Brain
                        : item.type === "document"
                          ? FileText
                          : Link2;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-white dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-600/50 px-3 py-1.5 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-muted-foreground">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium text-foreground truncate">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingKnowledgeId(item.id);
                              setKnowledgeForm({
                                type: item.type,
                                memoryText: item.type === "memory" ? item.label : "",
                                documentName: item.type === "document" ? item.label : "",
                                documentFile: null,
                                url: item.type === "url" ? "" : "",
                                urlLabel: item.type === "url" ? item.label : "",
                              });
                              setDocumentUploadError(null);
                              setKnowledgeModalOpen(true);
                            }}
                            className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-stone-200/80 dark:hover:bg-stone-600/50 transition-colors"
                            aria-label={`Edit ${item.label}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveKnowledge(item)}
                            className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-stone-200/80 dark:hover:bg-stone-600/50 transition-colors"
                            aria-label={`Remove ${item.label}`}
                          >
                            <MinusCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-1 min-h-[200px] flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-muted-foreground">No knowledge or memory</p>
                    <p className="mt-1 text-xs text-muted-foreground/80">
                      Add documents, URLs, or things the agent should remember
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="min-h-[245px] rounded-lg bg-stone-50 dark:bg-stone-800/50 flex flex-col overflow-hidden">
              <header className="flex flex-row items-center justify-between gap-2 h-10 px-3 bg-stone-100 dark:bg-stone-700/40 flex-shrink-0">
                <h3 className="font-semibold text-sm text-foreground">Goals & Rules</h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingGoalsRulesId(null);
                    resetGoalsRulesForm();
                    setGoalsRulesModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground/90 backdrop-blur-xl bg-white/50 dark:bg-white/10 border border-stone-200/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] hover:bg-white/70 dark:hover:bg-white/15 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
                {goalsRules.length > 0 ? (
                  goalsRules.map((item) => {
                    const Icon = item.type === "goal" ? Target : ScrollText;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-white dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-600/50 px-3 py-1.5 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-muted-foreground">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium text-foreground truncate">
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGoalsRulesId(item.id);
                              setGoalsRulesForm({ type: item.type, label: item.label });
                              setGoalsRulesModalOpen(true);
                            }}
                            className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-stone-200/80 dark:hover:bg-stone-600/50 transition-colors"
                            aria-label={`Edit ${item.label}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveGoalRule(item)}
                            className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-stone-200/80 dark:hover:bg-stone-600/50 transition-colors"
                            aria-label={`Remove ${item.label}`}
                          >
                            <MinusCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-1 min-h-[160px] flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-muted-foreground">No goals or rules</p>
                    <p className="mt-1 text-xs text-muted-foreground/80">
                      Define what the agent works toward and how it should behave
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Knowledge & Memory modal */}
      <Dialog
        open={knowledgeModalOpen}
        onOpenChange={(open) => {
          setKnowledgeModalOpen(open);
          if (!open) {
            setEditingKnowledgeId(null);
            resetKnowledgeForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md border-stone-200 dark:border-stone-600">
          <DialogHeader>
            <DialogTitle>{editingKnowledgeId ? "Edit Knowledge & Memory" : "Add Knowledge & Memory"}</DialogTitle>
            <DialogDescription>
              Add a memory, document, or URL for the agent to reference.
            </DialogDescription>
          </DialogHeader>
          <div className="min-w-0 space-y-4 overflow-hidden py-2">
            {/* Type selector */}
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                {(["memory", "document", "url"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setKnowledgeForm((f) => ({ ...f, type: t }))}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      knowledgeForm.type === t
                        ? "bg-stone-200 dark:bg-stone-600 text-foreground"
                        : "bg-stone-100 dark:bg-stone-800 text-muted-foreground hover:bg-stone-200/80 dark:hover:bg-stone-700/80"
                    }`}
                  >
                    {t === "memory" && <Brain className="h-4 w-4" />}
                    {t === "document" && <FileText className="h-4 w-4" />}
                    {t === "url" && <Link2 className="h-4 w-4" />}
                    {t === "memory" ? "Memory" : t === "document" ? "Document" : "URL"}
                  </button>
                ))}
              </div>
            </div>

            {/* Memory */}
            {knowledgeForm.type === "memory" && (
              <div className="space-y-2">
                <Label htmlFor="memory-text">What should the agent remember?</Label>
                <Input
                  id="memory-text"
                  placeholder="e.g. Prefers concise, actionable responses"
                  value={knowledgeForm.memoryText}
                  onChange={(e) =>
                    setKnowledgeForm((f) => ({ ...f, memoryText: e.target.value }))
                  }
                  className="h-10"
                />
              </div>
            )}

            {/* Document */}
            {knowledgeForm.type === "document" && (
              <div className="space-y-2">
                <Label>Upload document</Label>
                <input
                  ref={documentInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,.csv,.doc,.docx,.xls,.xlsx,.json,.html,application/pdf,text/plain,text/markdown,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json,text/html"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setKnowledgeForm((prev) => ({ ...prev, documentFile: f ?? null }));
                    setDocumentUploadError(null);
                  }}
                />
                {knowledgeForm.documentFile ? (
                  <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-md border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800/50 px-3 py-2">
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium" title={knowledgeForm.documentFile.name}>
                      {knowledgeForm.documentFile.name}
                    </span>
                    <span className="flex-shrink-0 text-xs text-muted-foreground">
                      {(knowledgeForm.documentFile.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setKnowledgeForm((f) => ({ ...f, documentFile: null }));
                        if (documentInputRef.current) documentInputRef.current.value = "";
                        setDocumentUploadError(null);
                      }}
                      className="flex-shrink-0 rounded p-1 text-muted-foreground hover:bg-stone-200 dark:hover:bg-stone-600 hover:text-foreground"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => documentInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.add("border-stone-400", "bg-stone-100", "dark:bg-stone-700/50");
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove("border-stone-400", "bg-stone-100", "dark:bg-stone-700/50");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove("border-stone-400", "bg-stone-100", "dark:bg-stone-700/50");
                      const file = e.dataTransfer?.files?.[0];
                      if (file) {
                        setKnowledgeForm((prev) => ({ ...prev, documentFile: file }));
                        setDocumentUploadError(null);
                      }
                    }}
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-stone-200 dark:border-stone-600 bg-stone-50/50 dark:bg-stone-800/30 py-8 transition-colors hover:border-stone-300 dark:hover:border-stone-500 hover:bg-stone-100/50 dark:hover:bg-stone-700/30"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center text-sm">
                      <span className="font-medium text-foreground">Drop a file here</span>
                      <span className="text-muted-foreground"> or click to browse</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PDF, TXT, MD, CSV, DOC, DOCX, XLS, XLSX, JSON, HTML (max 10MB)
                    </p>
                  </div>
                )}
                {documentUploadError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{documentUploadError}</p>
                )}
              </div>
            )}

            {/* URL */}
            {knowledgeForm.type === "url" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://..."
                    value={knowledgeForm.url}
                    onChange={(e) =>
                      setKnowledgeForm((f) => ({ ...f, url: e.target.value }))
                    }
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url-label">Display label (optional)</Label>
                  <Input
                    id="url-label"
                    placeholder="e.g. Company wiki – onboarding guide"
                    value={knowledgeForm.urlLabel}
                    onChange={(e) =>
                      setKnowledgeForm((f) => ({ ...f, urlLabel: e.target.value }))
                    }
                    className="h-10"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setKnowledgeModalOpen(false)}
              disabled={documentUploading}
            >
              Cancel
            </Button>
            <Button onClick={handleAddKnowledge} disabled={documentUploading}>
              {documentUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : editingKnowledgeId ? (
                "Save"
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Add Goal / Rule modal */}
      <Dialog
        open={goalsRulesModalOpen}
        onOpenChange={(open) => {
          setGoalsRulesModalOpen(open);
          if (!open) {
            setEditingGoalsRulesId(null);
            resetGoalsRulesForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md border-stone-200 dark:border-stone-600">
          <DialogHeader>
            <DialogTitle>{editingGoalsRulesId ? "Edit Goal or Rule" : "Add Goal or Rule"}</DialogTitle>
            <DialogDescription>
              Goals define what the agent works toward. Rules define how it should behave.
            </DialogDescription>
          </DialogHeader>
          <div className="min-w-0 space-y-4 overflow-hidden py-2">
            {/* Type selector */}
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGoalsRulesForm((f) => ({ ...f, type: "goal" }))}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    goalsRulesForm.type === "goal"
                      ? "bg-stone-200 dark:bg-stone-600 text-foreground"
                      : "bg-stone-100 dark:bg-stone-800 text-muted-foreground hover:bg-stone-200/80 dark:hover:bg-stone-700/80"
                  }`}
                >
                  <Target className="h-4 w-4" />
                  Goal
                </button>
                <button
                  type="button"
                  onClick={() => setGoalsRulesForm((f) => ({ ...f, type: "rule" }))}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    goalsRulesForm.type === "rule"
                      ? "bg-stone-200 dark:bg-stone-600 text-foreground"
                      : "bg-stone-100 dark:bg-stone-800 text-muted-foreground hover:bg-stone-200/80 dark:hover:bg-stone-700/80"
                  }`}
                >
                  <ScrollText className="h-4 w-4" />
                  Rule
                </button>
              </div>
            </div>

            {/* Goal / Rule text */}
            <div className="space-y-2">
              <Label htmlFor="goal-rule-text">
                {goalsRulesForm.type === "goal" ? "Goal" : "Rule"}
              </Label>
              <Input
                id="goal-rule-text"
                placeholder={
                  goalsRulesForm.type === "goal"
                    ? "e.g. Respond to support tickets within 2 hours"
                    : "e.g. Never share internal data externally"
                }
                value={goalsRulesForm.label}
                onChange={(e) =>
                  setGoalsRulesForm((f) => ({ ...f, label: e.target.value }))
                }
                className="h-10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalsRulesModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddGoalRule} disabled={!goalsRulesForm.label.trim()}>
              {editingGoalsRulesId ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    {/* Add Trigger + Add Capabilities sidebars + backdrops — portaled to body */}
    {typeof document !== "undefined" &&
      createPortal(
        <>
          {/* Triggers: blur overlay — click to close (left-16 excludes nav sidebar) */}
          <div
            className={cn(
              "fixed top-16 left-16 right-0 bottom-0 z-40 backdrop-blur-sm transition-opacity duration-300",
              triggersSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setTriggersSidebarOpen(false)}
            aria-hidden
          />
          <aside
            className={cn(
              "fixed top-16 right-0 bottom-0 w-[400px] max-w-[90vw] bg-background border-l border-stone-200 dark:border-stone-700 shadow-lg z-50 flex flex-col transition-transform duration-300 ease-out",
              triggersSidebarOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
            )}
          >
            <header className="flex flex-shrink-0 items-center justify-between gap-2 h-14 px-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50">
              {selectedTriggerForConfig ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTriggerForConfig(null);
                      setEditingBehaviourId(null);
                    }}
                    className="flex-shrink-0 rounded-full p-2 text-muted-foreground hover:text-foreground"
                    aria-label="Back"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h2 className="font-semibold text-sm text-foreground truncate flex-1 text-center">
                    Configure {selectedTriggerForConfig.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTriggersSidebarOpen(false)}
                    className="flex-shrink-0 rounded-full p-2 text-muted-foreground"
                    aria-label="Hide sidebar"
                  >
                    <PanelRightClose className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <h2 className="font-semibold text-sm text-foreground">Add Trigger</h2>
                  <button
                    type="button"
                    onClick={() => setTriggersSidebarOpen(false)}
                    className="flex-shrink-0 rounded-full p-2 text-muted-foreground"
                    aria-label="Hide sidebar"
                  >
                    <PanelRightClose className="h-5 w-5" />
                  </button>
                </>
              )}
            </header>
            {selectedTriggerForConfig ? (
              /* Config view */
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 scrollbar-hide flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  {selectedTriggerForConfig.icon.type === "logo" ? (
                    (() => {
                      const slug = selectedTriggerForConfig.icon.slug;
                      return (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden">
                          <img
                            src={getIntegrationLogoUrl(slug)}
                            alt=""
                            className="h-9 w-9 object-contain"
                            onError={(e) => {
                              e.currentTarget.src = `https://cdn.simpleicons.org/${slug}`;
                            }}
                          />
                        </div>
                      );
                    })()
                  ) : (
                    (() => {
                      const Icon = selectedTriggerForConfig.icon.Icon;
                      return (
                        <div className={`rounded-lg bg-gradient-to-br ${selectedTriggerForConfig.icon.gradient} p-3 shrink-0`}>
                          <Icon className={`h-6 w-6 ${selectedTriggerForConfig.icon.iconColor}`} />
                        </div>
                      );
                    })()
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{selectedTriggerForConfig.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedTriggerForConfig.description}</p>
                  </div>
                </div>

                {/* Webhook config */}
                {selectedTriggerForConfig.id === "webhook" && (
                  <div className="space-y-4 flex-1">
                    <div className="space-y-2">
                      <Label className="text-xs">Webhook path</Label>
                      <Input
                        placeholder="e.g. agent-123 or my-webhook"
                        value={webhookPath}
                        onChange={(e) => setWebhookPath(e.target.value)}
                        className="h-10 rounded-lg border-stone-200 dark:border-stone-600 !bg-white/50 dark:!bg-white/5 backdrop-blur-xl"
                      />
                      <p className="text-xs text-muted-foreground">Unique path for your webhook URL. Use letters, numbers, and hyphens.</p>
                    </div>
                    {webhookPath.trim() && (
                      <div className="space-y-2 pt-3">
                        <p className="text-xs font-medium text-muted-foreground">Your Webhook URL</p>
                        <div className="flex items-center gap-2 rounded-lg border border-stone-200 dark:border-stone-600 bg-white/50 dark:bg-white/5 backdrop-blur-xl px-3 py-2">
                          <p className="flex-1 truncate text-xs font-mono text-foreground/80">
                            {typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/{webhookPath}
                          </p>
                          <button
                            type="button"
                            onClick={copyWebhookUrl}
                            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1"
                            title="Copy URL"
                          >
                            {urlCopied ? <CopyCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                        {webhookTestState === "idle" || webhookTestState === "error" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={startWebhookTest}
                            className="w-full justify-center text-xs backdrop-blur-xl bg-white/50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/10 transition-all text-foreground"
                          >
                            <FlaskConical className="h-3.5 w-3.5 mr-2" />
                            {webhookTestState === "error" ? "Retry Test Webhook" : "Test Webhook"}
                          </Button>
                        ) : webhookTestState === "waiting" ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Waiting for a webhook request…
                            </div>
                            <p className="text-center text-xs text-muted-foreground/70">Send a POST request to your webhook URL.</p>
                            <Button variant="ghost" size="sm" onClick={stopWebhookTest} className="w-full justify-center text-xs">
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Webhook received! Fields detected:
                            </div>
                            {webhookSampleFields.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No fields found in payload.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {webhookSampleFields.map((f) => (
                                  <span
                                    key={f}
                                    className="inline-flex items-center rounded-md px-2 py-0.5 text-xs bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700"
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                            )}
                            <Button variant="ghost" size="sm" onClick={startWebhookTest} className="w-full justify-center text-xs">
                              Re-test Webhook
                            </Button>
                          </div>
                        )}
                        {webhookTestState === "error" && (
                          <p className="text-xs text-rose-500 dark:text-rose-400 text-center">Timed out. Send a request to the URL above.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Schedule config */}
                {selectedTriggerForConfig.id === "schedule" && (
                  <div className="space-y-4 flex-1">
                    <div className="space-y-2">
                      <Label className="text-xs">Frequency</Label>
                      <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                        <SelectTrigger className="h-10 rounded-lg border-stone-200 dark:border-stone-600 !bg-white/50 dark:!bg-white/5 backdrop-blur-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="backdrop-blur-xl bg-white/95 dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                          <SelectItem value="hourly">Every hour</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="custom">Custom cron</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(scheduleFrequency === "daily" || scheduleFrequency === "weekly") && (
                      <div className="space-y-2">
                        <Label className="text-xs">Time</Label>
                        <Input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="h-10 rounded-lg border-stone-200 dark:border-stone-600 !bg-white/50 dark:!bg-white/5 backdrop-blur-xl"
                        />
                      </div>
                    )}
                    {scheduleFrequency === "weekly" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Repeat on</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const).map((d) => {
                            const isSelected = scheduleDay === d;
                            const abbr = d.slice(0, 3).replace(/^./, (c) => c.toUpperCase());
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setScheduleDay(d)}
                                className={cn(
                                  "flex-1 min-w-[2.5rem] rounded-lg px-2 py-2 text-xs font-medium transition-colors",
                                  isSelected
                                    ? "bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900"
                                    : "bg-stone-100 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-600 hover:bg-stone-200 dark:hover:bg-stone-700/60"
                                )}
                              >
                                {abbr}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {scheduleFrequency === "custom" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Cron expression</Label>
                        <Input
                          placeholder="e.g. 0 9 * * 1-5"
                          value={scheduleCron}
                          onChange={(e) => setScheduleCron(e.target.value)}
                          className="h-10 rounded-lg border-stone-200 dark:border-stone-600 !bg-white/50 dark:!bg-white/5 backdrop-blur-xl font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">Minute Hour Day Month Weekday (e.g. 0 9 * * 1-5 = 9am weekdays)</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Integration trigger config */}
                {selectedTriggerForConfig.id !== "webhook" &&
                  selectedTriggerForConfig.id !== "schedule" && (
                  <div className="space-y-4 flex-1">
                    {(() => {
                      const service = TRIGGER_TO_SERVICE[selectedTriggerForConfig.id];
                      const isConnected = service && connectedServices.includes(service);
                      const capInfo = selectedTriggerForConfig.icon.type === "logo" ? getCapabilityIntegrationInfo(selectedTriggerForConfig.icon.slug) : null;
                      if (!isConnected && capInfo) {
                        const slug = selectedTriggerForConfig.icon.type === "logo" ? selectedTriggerForConfig.icon.slug : "";
                        const handleConnect = () => {
                          const origin = typeof window !== "undefined" ? window.location.origin : "";
                          let connectUrl = capInfo.connectUrl.startsWith("http")
                            ? capInfo.connectUrl
                            : `${origin}${capInfo.connectUrl}`;
                          if (capInfo.connectionMethod === "oauth") {
                            const returnUrl = `${origin}/integrations/oauth-return?service=${encodeURIComponent(capInfo.service)}`;
                            const sep = connectUrl.includes("?") ? "&" : "?";
                            connectUrl += `${sep}returnUrl=${encodeURIComponent(returnUrl)}${agentId ? `&agent_id=${encodeURIComponent(agentId)}` : ""}`;
                          }
                          const w = 600;
                          const h = 700;
                          const left = Math.round((window.screen.width - w) / 2);
                          const top = Math.round((window.screen.height - h) / 2);
                          window.open(connectUrl, "ConnectIntegration", `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
                        };
                        const logoUrl = getIntegrationLogoUrl(slug);
                        return (
                          <button
                            type="button"
                            onClick={handleConnect}
                            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg border border-stone-200 dark:border-white/20 backdrop-blur-xl bg-stone-100/95 dark:bg-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] hover:bg-stone-200/80 dark:hover:bg-white/10 transition-all duration-300 text-foreground active:scale-[0.99]"
                          >
                            <img src={logoUrl} alt="" className="h-5 w-5 object-contain shrink-0" onError={(e) => { e.currentTarget.src = `https://cdn.simpleicons.org/${slug}`; }} />
                            <span className="text-sm font-medium">Connect {getIntegrationMeta(capInfo.service)?.label ?? selectedTriggerForConfig.name}</span>
                          </button>
                        );
                      }
                      if (!isConnected) return <p className="text-sm text-muted-foreground">This integration is not available for connection.</p>;
                      const slug = selectedTriggerForConfig.icon.type === "logo" ? selectedTriggerForConfig.icon.slug : "";
                      const renderSelect = (label: string, value: string, onChange: (v: string) => void, options: { id: string; name: string }[], loading?: boolean, placeholder?: string) => (
                        <div className="space-y-2">
                          <Label className="text-xs">{label}</Label>
                          {loading ? (
                            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading…
                            </div>
                          ) : (
                            <Select value={value || ""} onValueChange={onChange}>
                              <SelectTrigger className="h-10 rounded-lg border-stone-200 dark:border-stone-600 !bg-white/50 dark:!bg-white/5 backdrop-blur-xl">
                                <SelectValue placeholder={placeholder ?? "Choose…"} />
                              </SelectTrigger>
                              <SelectContent className="backdrop-blur-xl bg-white/95 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 max-h-[240px]">
                                {options.map((r) => (
                                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                                {options.length === 0 && !integrationResourcesLoading && (
                                  <SelectItem value="__none__" disabled>No resources found</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                      if (slug === "discord") {
                        return (
                          <div className="space-y-4">
                            {renderSelect("Server", integrationDiscordGuildId, setIntegrationDiscordGuildId, integrationResources, integrationResourcesLoading, "Select server…")}
                            {integrationDiscordGuildId && renderSelect("Channel", integrationDiscordChannelId, setIntegrationDiscordChannelId, integrationResourcesSecondary, false, "Select channel…")}
                          </div>
                        );
                      }
                      if (slug === "airtable") {
                        return (
                          <div className="space-y-4">
                            {renderSelect("Base", integrationAirtableBaseId, setIntegrationAirtableBaseId, integrationResources, integrationResourcesLoading, "Select base…")}
                            {integrationAirtableBaseId && renderSelect("Table", integrationAirtableTableId, setIntegrationAirtableTableId, integrationResourcesSecondary, false, "Select table…")}
                          </div>
                        );
                      }
                      const singleSelectMap: Record<string, { value: string; set: (v: string) => void; label: string }> = {
                        googleforms: { value: integrationFormId, set: setIntegrationFormId, label: "Form" },
                        googledrive: { value: integrationFolderId, set: setIntegrationFolderId, label: "Folder" },
                        googlecalendar: { value: integrationCalendarId, set: setIntegrationCalendarId, label: "Calendar" },
                        slack: { value: integrationSlackChannelId, set: setIntegrationSlackChannelId, label: "Channel" },
                        github: { value: integrationGithubRepo, set: setIntegrationGithubRepo, label: "Repository" },
                        gmail: { value: integrationGmailCategoryId, set: setIntegrationGmailCategoryId, label: "Label / folder" },
                        notion: { value: integrationNotionDatabaseId, set: setIntegrationNotionDatabaseId, label: "Database" },
                        trello: { value: integrationTrelloBoardId, set: setIntegrationTrelloBoardId, label: "Board" },
                      };
                      const single = singleSelectMap[slug];
                      if (single) {
                        return (
                          <div className="space-y-2">
                            {renderSelect(`Select ${single.label}`, single.value, single.set, integrationResources, integrationResourcesLoading, `Choose ${single.label.toLowerCase()}…`)}
                          </div>
                        );
                      }
                      return <p className="text-sm text-muted-foreground">Resource selection for {selectedTriggerForConfig.name} is coming soon.</p>;
                    })()}
                  </div>
                )}

                <div className="flex-shrink-0 pt-4 mt-auto space-y-2">
                  {triggerSaveError && (
                    <p className="text-xs text-rose-500 dark:text-rose-400 text-center">{triggerSaveError}</p>
                  )}
                  <Button
                    variant="ghost"
                    disabled={triggerSaveLoading}
                    className="w-full justify-center h-10 text-sm backdrop-blur-xl bg-stone-100/95 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] hover:bg-stone-200/80 dark:hover:bg-white/10 transition-all duration-300 text-foreground disabled:opacity-70"
                    onClick={handleSaveTriggerConfig}
                  >
                    {triggerSaveLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save Configuration"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-shrink-0 px-4 py-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search triggers…"
                      value={triggersSearch}
                      onChange={(e) => setTriggersSearch(e.target.value)}
                      className="h-10 pl-9 !bg-stone-50 dark:!bg-stone-800/50 border-stone-200 dark:border-stone-600"
                    />
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 scrollbar-hide">
                  {(() => {
                    const filtered =
                      triggersSearch.trim()
                        ? AVAILABLE_TRIGGERS.filter(
                            (t) =>
                              t.name.toLowerCase().includes(triggersSearch.toLowerCase()) ||
                              t.description.toLowerCase().includes(triggersSearch.toLowerCase())
                          )
                        : AVAILABLE_TRIGGERS;
                    if (filtered.length === 0) {
                      return (
                        <div className="flex min-h-[120px] flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                          No triggers match &quot;{triggersSearch}&quot;
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {filtered.map((trigger) => (
                          <div
                            key={trigger.id}
                            className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-4 transition-all duration-300 text-foreground shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]"
                          >
                            <div className="flex items-start gap-3">
                              <div className="shrink-0">
                                {trigger.icon.type === "logo" ? (
                                  (() => {
                                    const slug = trigger.icon.slug;
                                    return (
                                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden">
                                        <img
                                          src={getIntegrationLogoUrl(slug)}
                                          alt=""
                                          className="h-7 w-7 object-contain"
                                          onError={(e) => {
                                            e.currentTarget.src = `https://cdn.simpleicons.org/${slug}`;
                                          }}
                                        />
                                      </div>
                                    );
                                  })()
                                ) : (
                                  (() => {
                                    const Icon = trigger.icon.Icon;
                                    return (
                                      <div className={`rounded-md bg-gradient-to-br ${trigger.icon.gradient} p-2.5`}>
                                        <Icon className={`h-5 w-5 ${trigger.icon.iconColor}`} />
                                      </div>
                                    );
                                  })()
                                )}
                              </div>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <h3 className="text-sm font-semibold text-foreground">{trigger.name}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-2">{trigger.description}</p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-center h-8 text-xs backdrop-blur-xl bg-white/50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 text-foreground"
                                onClick={() => setSelectedTriggerForConfig(trigger)}
                              >
                                Configure {trigger.name}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </aside>

          {/* Capabilities: blur overlay — click to close (left-16 excludes nav sidebar) */}
          <div
            className={cn(
              "fixed top-16 left-16 right-0 bottom-0 z-40 backdrop-blur-sm transition-opacity duration-300",
              capabilitiesSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setCapabilitiesSidebarOpen(false)}
            aria-hidden
          />
          <aside
            className={cn(
              "fixed top-16 right-0 bottom-0 w-[400px] max-w-[90vw] bg-background border-l border-stone-200 dark:border-stone-700 shadow-lg z-50 flex flex-col transition-transform duration-300 ease-out",
              capabilitiesSidebarOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
            )}
          >
            <header className="flex flex-shrink-0 items-center justify-between gap-2 h-14 px-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50">
              <h2 className="font-semibold text-sm text-foreground">Add Capabilities</h2>
              <button
                type="button"
                onClick={() => setCapabilitiesSidebarOpen(false)}
                className="flex-shrink-0 rounded-full p-2 text-muted-foreground"
                aria-label="Hide sidebar"
              >
                <PanelRightClose className="h-5 w-5" />
              </button>
            </header>
            <div className="flex-shrink-0 px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search integrations…"
                  value={capabilitiesSearch}
                  onChange={(e) => setCapabilitiesSearch(e.target.value)}
                  className="h-10 pl-9 !bg-stone-50 dark:!bg-stone-800/50 border-stone-200 dark:border-stone-600"
                />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 scrollbar-hide">
              {(() => {
                const filtered =
                  capabilitiesSearch.trim()
                    ? AVAILABLE_INTEGRATIONS.filter(
                        (int) =>
                          int.name.toLowerCase().includes(capabilitiesSearch.toLowerCase()) ||
                          int.slug.toLowerCase().includes(capabilitiesSearch.toLowerCase())
                      )
                    : AVAILABLE_INTEGRATIONS;
                if (filtered.length === 0) {
                  return (
                    <div className="flex min-h-[120px] flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                      No integrations match &quot;{capabilitiesSearch}&quot;
                    </div>
                  );
                }
                return (
                  <div className="space-y-2">
                    {filtered.map((int) => {
                      const isInCapabilities = capabilities.some((c) => c.slug === int.slug);
                      const capInfo = getCapabilityIntegrationInfo(int.slug);
                      const isOAuthConnected = capInfo && isServiceConnected(capInfo.service, connectedServices);
                      const logoUrl = getIntegrationLogoUrl(int.slug);

                      if (isInCapabilities) {
                        return (
                          <div
                            key={int.slug}
                            className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-4 transition-all duration-300 text-foreground shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden">
                                <img src={logoUrl} alt="" className="h-7 w-7 object-contain" onError={(e) => { e.currentTarget.src = `https://cdn.simpleicons.org/${int.slug}`; }} />
                              </div>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <h3 className="text-sm font-semibold text-foreground">{int.name}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-2">{int.description}</p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-center h-8 text-xs text-rose-500 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-500/10"
                                onClick={() => setCapabilities((prev) => prev.filter((c) => c.slug !== int.slug))}
                              >
                                Disconnect
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      if (capInfo && !isOAuthConnected) {
                        return (
                          <div
                            key={int.slug}
                            className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-4 transition-all duration-300 text-foreground shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden">
                                <img src={logoUrl} alt="" className="h-7 w-7 object-contain" onError={(e) => { e.currentTarget.src = `https://cdn.simpleicons.org/${int.slug}`; }} />
                              </div>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <h3 className="text-sm font-semibold text-foreground">{int.name}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-2">{int.description}</p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-center h-8 text-xs backdrop-blur-xl bg-white/50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 text-foreground"
                                onClick={() => handleConnectCapability(int)}
                              >
                                Connect {int.name}
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={int.slug}
                          className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-4 transition-all duration-300 text-foreground shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden">
                              <img src={logoUrl} alt="" className="h-7 w-7 object-contain" onError={(e) => { e.currentTarget.src = `https://cdn.simpleicons.org/${int.slug}`; }} />
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <h3 className="text-sm font-semibold text-foreground">{int.name}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">{int.description}</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-center h-8 text-xs backdrop-blur-xl bg-white/50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 text-foreground"
                              onClick={() => setCapabilities((prev) => (prev.some((c) => c.slug === int.slug) ? prev : [...prev, int]))}
                            >
                              Add {int.name}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </aside>
        </>,
        document.body
      )}
    </>
  );
}
