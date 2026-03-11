/**
 * Agent Chat Builder — Streaming Utilities & Event Types
 *
 * Defines the complete SSE event protocol used between the `/api/agents/chat`
 * and `/api/agents/build` routes and the frontend chat UI.
 *
 * Also exports:
 *  - createSSEStream()           — typed SSE writer factory
 *  - INTEGRATION_CATALOGUE       — service metadata for the integration check card
 *  - detectRequiredIntegrations  — maps a DeployAgentPlan → required service IDs
 */

import type { DeployAgentPlan, AgentBehaviourPlan } from './types';
import type { ClarificationQuestion, QuestionnaireAnswer } from '@/lib/ai/types';

// Re-export shared types so UI imports a single source of truth
export type { ClarificationQuestion, QuestionnaireAnswer, DeployAgentPlan };

// ============================================================================
// BUILD STAGE
// ============================================================================

export type BuildStageStatus = 'pending' | 'running' | 'done' | 'error';

export interface BuildStage {
  label: string;
  status: BuildStageStatus;
  /** Optional result/detail shown when step completes (e.g. "3 capabilities: Gmail, Slack", "deployed in 1142ms") */
  detail?: string;
}

// ============================================================================
// INTEGRATION CHECK ITEM
// ============================================================================

export type IntegrationConnectionMethod = 'oauth' | 'credential';

export interface IntegrationCheckItem {
  /** Internal service ID, e.g. 'google-gmail' */
  service: string;
  /** Human-readable label, e.g. 'Gmail' */
  label: string;
  /** Emoji icon, e.g. '📧' */
  icon: string;
  /** Whether this integration is required for the plan to run */
  required: boolean;
  /** Whether the user has already connected this integration */
  connected: boolean;
  /**
   * URL to start the connection flow.
   * - OAuth services: `/api/auth/connect/google?service=google-gmail`
   * - Credential services: `/integrations/connect?service=discord`
   */
  connectUrl: string;
  /** Whether this uses a full-page OAuth redirect or a popup window */
  connectionMethod: IntegrationConnectionMethod;
}

// ============================================================================
// SSE EVENT UNION
// ============================================================================

export type ChatEvent =
  /** Streams a chunk of assistant text (append to current bubble) */
  | { type: 'text_delta'; delta: string }
  /** Signals the current text bubble is complete */
  | { type: 'text_done' }
  /** Renders the integration check card */
  | { type: 'integration_check'; integrations: IntegrationCheckItem[] }
  /** Renders the dynamic questionnaire card (pendingPlan included so client can send it back with answers) */
  | { type: 'questionnaire'; questions: ClarificationQuestion[]; pendingPlan?: DeployAgentPlan }
  /** Renders the plan preview card */
  | { type: 'plan'; plan: DeployAgentPlan }
  /** Renders the "Ready to build?" confirmation buttons */
  | { type: 'confirmation' }
  /** Appends / updates a stage row in the build progress card */
  | { type: 'build_stage'; stage: string; status: BuildStageStatus; detail?: string }
  /** Build is finished — show completion card */
  | { type: 'build_complete'; agentId: string; summary: string; requiredIntegrations?: IntegrationCheckItem[] }
  /** Fatal pipeline error */
  | { type: 'error'; message: string };

// ============================================================================
// FRONTEND CHAT MESSAGE UNION
// ============================================================================

export type ChatMessageRole = 'user' | 'assistant' | 'card';

export type ChatMessage =
  | { id: string; role: 'user'; content: string }
  | { id: string; role: 'assistant'; content: string; isStreaming?: boolean; chips?: string[] }
  | { id: string; role: 'card'; cardType: 'welcome'; content: string; chips: string[] }
  | { id: string; role: 'card'; cardType: 'error_retry'; message: string; lastUserMessage?: string }
  | { id: string; role: 'card'; cardType: 'integration_check'; data: IntegrationCheckItem[] }
  | { id: string; role: 'card'; cardType: 'questionnaire'; data: ClarificationQuestion[] }
  | { id: string; role: 'card'; cardType: 'plan'; data: DeployAgentPlan }
  | { id: string; role: 'card'; cardType: 'confirmation' }
  | { id: string; role: 'card'; cardType: 'build_progress'; stages: BuildStage[] }
  | { id: string; role: 'card'; cardType: 'completion'; agentId: string; summary: string; requiredIntegrations?: IntegrationCheckItem[] };

// ============================================================================
// PIPELINE PHASE
// ============================================================================

export type PipelinePhase =
  | 'initial'
  | 'awaiting_integrations'
  | 'awaiting_questionnaire'
  | 'awaiting_confirmation'
  | 'building'
  | 'complete';

// ============================================================================
// API REQUEST / RESPONSE TYPES
// ============================================================================

/** Shape of every request body sent to POST /api/agents/chat */
export interface AgentChatRequest {
  /** Flat conversation history (role + content only — no card messages) */
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Provided after the user submits the questionnaire card */
  answers?: QuestionnaireAnswer[];
  /**
   * When the user clicks "Let me adjust something", the current plan is
   * sent back so the pipeline skips intent analysis and regenerates only.
   */
  pendingPlan?: DeployAgentPlan;
  /** Sent after all required integrations are connected */
  integrationsConnected?: boolean;
  /** When editing an existing agent after build, used to fetch agent as plan for regeneration */
  agentId?: string;
}

/** Shape of the request body sent to POST /api/agents/build */
export interface AgentBuildRequest {
  description: string;
  plan: DeployAgentPlan;
}

// ============================================================================
// SSE STREAM WRITER
// ============================================================================

export interface SSEWriter {
  /** Stream a text chunk — appends to the current assistant bubble */
  text(delta: string): void;
  /** Close the current text bubble */
  textDone(): void;
  /** Push any card event (integration_check, questionnaire, plan, confirmation) */
  card(event: Exclude<ChatEvent, { type: 'text_delta' | 'text_done' | 'build_stage' | 'build_complete' | 'error' }>): void;
  /** Append / update a build stage row (detail shown when status is done) */
  buildStage(stage: string, status: BuildStageStatus, detail?: string): void;
  /** Signal build completion */
  complete(agentId: string, summary: string, requiredIntegrations?: IntegrationCheckItem[]): void;
  /** Push a fatal error and close the stream */
  error(message: string): void;
  /** Close the stream cleanly */
  close(): void;
}

export interface SSEStream {
  readable: ReadableStream<Uint8Array>;
  writer: SSEWriter;
}

/**
 * Creates a ReadableStream + typed SSEWriter pair.
 *
 * Usage in a route handler:
 * ```ts
 * const { readable, writer } = createSSEStream();
 * // fire-and-forget pipeline (no await)
 * runPipeline(writer, ...).catch((err) => writer.error(err.message));
 * return new Response(readable, { headers: SSE_HEADERS });
 * ```
 */
export function createSSEStream(): SSEStream {
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const readable = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  const encoder = new TextEncoder();

  function push(event: ChatEvent) {
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch {
      // Stream already closed — swallow silently
    }
  }

  const writer: SSEWriter = {
    text(delta) {
      push({ type: 'text_delta', delta });
    },

    textDone() {
      push({ type: 'text_done' });
    },

    card(event) {
      push(event);
    },

    buildStage(stage, status, detail) {
      push({ type: 'build_stage', stage, status, ...(detail != null && { detail }) });
    },

    complete(agentId: string, summary: string, requiredIntegrations?: IntegrationCheckItem[]) {
      push({ type: 'build_complete', agentId, summary, requiredIntegrations });
      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },

    error(message) {
      push({ type: 'error', message });
      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },

    close() {
      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },
  };

  return { readable, writer };
}

/** Standard headers for SSE responses */
export const SSE_HEADERS: HeadersInit = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
};

// ============================================================================
// INTEGRATION CATALOGUE
// ============================================================================

export interface IntegrationCatalogueEntry {
  service: string;
  label: string;
  icon: string;
  connectionMethod: IntegrationConnectionMethod;
  /** URL to start the connection flow (no trailing slash) */
  connectUrl: string;
}

export const INTEGRATION_CATALOGUE: IntegrationCatalogueEntry[] = [
  {
    service: 'google-gmail',
    label: 'Gmail',
    icon: '📧',
    connectionMethod: 'oauth',
    connectUrl: '/api/auth/connect/google?service=google-gmail',
  },
  {
    service: 'google-sheets',
    label: 'Google Sheets',
    icon: '📊',
    connectionMethod: 'oauth',
    connectUrl: '/api/auth/connect/google?service=google-sheets',
  },
  {
    service: 'google-drive',
    label: 'Google Drive',
    icon: '📁',
    connectionMethod: 'oauth',
    connectUrl: '/api/auth/connect/google?service=google-drive',
  },
  {
    service: 'google-forms',
    label: 'Google Forms',
    icon: '📋',
    connectionMethod: 'oauth',
    connectUrl: '/api/auth/connect/google?service=google-forms',
  },
  {
    service: 'google-calendar',
    label: 'Google Calendar',
    icon: '📅',
    connectionMethod: 'oauth',
    connectUrl: '/api/auth/connect/google?service=google-calendar',
  },
  {
    service: 'slack',
    label: 'Slack',
    icon: '💬',
    connectionMethod: 'oauth',
    connectUrl: '/api/auth/connect/slack',
  },
  {
    service: 'discord',
    label: 'Discord',
    icon: '🎮',
    connectionMethod: 'credential',
    connectUrl: '/integrations/connect?service=discord',
  },
  {
    service: 'github',
    label: 'GitHub',
    icon: '🐙',
    connectionMethod: 'oauth',
    connectUrl: '/api/auth/connect/github',
  },
  {
    service: 'notion',
    label: 'Notion',
    icon: '📓',
    connectionMethod: 'oauth',
    connectUrl: '/api/auth/connect/notion',
  },
  {
    service: 'airtable',
    label: 'Airtable',
    icon: '🗂️',
    connectionMethod: 'oauth',
    connectUrl: '/api/auth/connect/airtable',
  },
  {
    service: 'trello',
    label: 'Trello',
    icon: '📋',
    connectionMethod: 'oauth',
    connectUrl: '/api/auth/connect/trello',
  },
  {
    service: 'twitter',
    label: 'Twitter/X',
    icon: '🐦',
    connectionMethod: 'oauth',
    connectUrl: '/api/auth/connect/twitter',
  },
  {
    service: 'openai',
    label: 'OpenAI',
    icon: '🤖',
    connectionMethod: 'credential',
    connectUrl: '/integrations/connect?service=openai',
  },
  {
    service: 'twilio',
    label: 'Twilio (SMS)',
    icon: '📱',
    connectionMethod: 'credential',
    connectUrl: '/integrations/connect?service=twilio',
  },
  {
    service: 'stripe',
    label: 'Stripe',
    icon: '💳',
    connectionMethod: 'credential',
    connectUrl: '/integrations/connect?service=stripe',
  },
];

/**
 * Look up integration metadata by service ID.
 * Returns undefined if the service is not in the catalogue.
 */
export function getIntegrationMeta(
  service: string
): IntegrationCatalogueEntry | undefined {
  return INTEGRATION_CATALOGUE.find((e) => e.service === service);
}

// ============================================================================
// DETECT REQUIRED INTEGRATIONS
// ============================================================================

/**
 * Trigger type → required service ID mapping.
 * Covers every trigger in the agent planner's TRIGGER_CATALOGUE.
 */
const TRIGGER_TO_SERVICE: Record<string, string> = {
  'new-email-received':      'google-gmail',
  'new-message-in-slack':    'slack',
  'new-discord-message':     'discord',
  'new-row-in-google-sheet': 'google-sheets',
  'new-github-issue':        'github',
  'file-uploaded':           'google-drive',
  'new-form-submission':     'google-forms',
  'new-calendar-event':      'google-calendar',
  'new-notion-page':         'notion',
  'new-airtable-record':     'airtable',
  'new-trello-card':         'trello',
};

/**
 * Keyword → service mapping for scanning the agent's instructions text.
 * Catches action-based integrations (e.g. "send me a Slack message" → slack).
 */
const INSTRUCTION_KEYWORD_TO_SERVICE: Array<{ pattern: RegExp; service: string }> = [
  { pattern: /gmail|send.{0,20}email|reply.{0,20}email|read.{0,20}email/i, service: 'google-gmail' },
  { pattern: /google.{0,10}sheet|spreadsheet/i,                             service: 'google-sheets' },
  { pattern: /google.{0,10}calendar|calendar.{0,10}event/i,                 service: 'google-calendar' },
  { pattern: /google.{0,10}drive|drive.{0,10}file/i,                        service: 'google-drive' },
  { pattern: /slack/i,                                                       service: 'slack' },
  { pattern: /discord/i,                                                     service: 'discord' },
  { pattern: /notion/i,                                                      service: 'notion' },
  { pattern: /github|pull.{0,10}request|issue/i,                            service: 'github' },
  { pattern: /airtable/i,                                                    service: 'airtable' },
  { pattern: /openai|gpt|chatgpt/i,                                          service: 'openai' },
  { pattern: /twilio|sms|text.{0,10}message/i,                               service: 'twilio' },
  { pattern: /twitter|tweet|post.{0,10}x\b|x\b.{0,10}post/i,                 service: 'twitter' },
  { pattern: /stripe|invoice|subscription|customer.{0,10}billing|billing/i, service: 'stripe' },
];

/** Service ID → { slug, name } for capabilities display (matches agent-tab-content logo slugs) */
const SERVICE_TO_CAPABILITY: Record<string, { slug: string; name: string }> = {
  'google-gmail':    { slug: 'gmail', name: 'Gmail' },
  'google-sheets':   { slug: 'googlesheets', name: 'Google Sheets' },
  'google-drive':    { slug: 'googledrive', name: 'Google Drive' },
  'google-forms':    { slug: 'googleforms', name: 'Google Forms' },
  'google-calendar': { slug: 'googlecalendar', name: 'Google Calendar' },
  'slack':           { slug: 'slack', name: 'Slack' },
  'discord':         { slug: 'discord', name: 'Discord' },
  'github':          { slug: 'github', name: 'GitHub' },
  'notion':          { slug: 'notion', name: 'Notion' },
  'airtable':        { slug: 'airtable', name: 'Airtable' },
  'trello':          { slug: 'trello', name: 'Trello' },
  'twitter':         { slug: 'x', name: 'Twitter/X' },
  'openai':          { slug: 'openai', name: 'OpenAI' },
  'twilio':          { slug: 'twilio', name: 'Twilio' },
  'stripe':          { slug: 'stripe', name: 'Stripe' },
};

/** Slug → service ID (reverse of SERVICE_TO_CAPABILITY) for connect flows */
const SLUG_TO_SERVICE: Record<string, string> = Object.fromEntries(
  Object.entries(SERVICE_TO_CAPABILITY).map(([service, { slug }]) => [slug, service])
);

/**
 * Returns integration metadata for a capability slug, or null if the slug
 * has no known connectable integration. Used by the agent tab Capabilities section.
 */
export function getCapabilityIntegrationInfo(
  slug: string
): { service: string; connectUrl: string; connectionMethod: IntegrationConnectionMethod } | null {
  const service = SLUG_TO_SERVICE[slug];
  if (!service) return null;
  const meta = getIntegrationMeta(service);
  if (!meta) return null;
  return {
    service: meta.service,
    connectUrl: meta.connectUrl,
    connectionMethod: meta.connectionMethod,
  };
}

/**
 * Given a `DeployAgentPlan`, returns the list of service IDs that are
 * needed for the plan to work. Checks both:
 *
 * 1. Trigger types on polling behaviours  (reliable, always checked)
 * 2. Keywords in instructions + behaviour descriptions (best-effort)
 *
 * Returns a de-duplicated array, e.g. `['google-gmail', 'slack']`.
 */
export function detectRequiredIntegrations(plan: DeployAgentPlan): string[] {
  const required = new Set<string>();

  // 1 — Trigger-based detection (authoritative)
  for (const behaviour of plan.behaviours) {
    if (behaviour.behaviourType === 'polling' && behaviour.triggerType) {
      const service = TRIGGER_TO_SERVICE[behaviour.triggerType];
      if (service) required.add(service);
    }
  }

  // 2 — Instruction keyword scanning (best-effort for action tools)
  const textToScan = [
    plan.instructions,
    plan.persona,
    ...plan.behaviours.map((b) => b.description),
  ]
    .filter(Boolean)
    .join(' ');

  for (const { pattern, service } of INSTRUCTION_KEYWORD_TO_SERVICE) {
    if (pattern.test(textToScan)) {
      required.add(service);
    }
  }

  return Array.from(required);
}

/**
 * Builds a minimal DeployAgentPlan from agent behaviours for integration checks.
 * Used by activate and pause routes when we only have the agent (not the original plan).
 */
export function planFromBehaviours(
  behaviours: Array<{ behaviour_type: string; trigger_type?: string | null; config?: Record<string, any>; description?: string }>
): DeployAgentPlan {
  return {
    name: '',
    persona: '',
    instructions: '',
    avatarEmoji: '🤖',
    behaviours: behaviours.map((b) => ({
      behaviourType:
        b.behaviour_type === 'schedule' || b.behaviour_type === 'heartbeat'
          ? (b.behaviour_type as 'schedule' | 'heartbeat')
          : 'polling',
      triggerType: b.trigger_type ?? undefined,
      config: b.config ?? {},
      description: (b as any).description ?? '',
    })),
    initialMemories: [],
  };
}

/**
 * Builds a full DeployAgentPlan from an agent and its behaviours.
 * Used when editing an existing agent — reconstructs the plan for regeneration.
 */
export function agentToPlan(
  agent: { name?: string; persona?: string | null; instructions?: string; avatar_emoji?: string | null },
  behaviours: Array<{ behaviour_type: string; trigger_type?: string | null; config?: Record<string, any>; description?: string }>
): DeployAgentPlan {
  const base = planFromBehaviours(behaviours);
  return {
    ...base,
    name: agent.name ?? '',
    persona: agent.persona ?? '',
    instructions: agent.instructions ?? '',
    avatarEmoji: agent.avatar_emoji ?? '🤖',
  };
}

/**
 * Returns only the service IDs required by polling behaviours (trigger types).
 * Used for the integration gate: we only block activation when polling triggers
 * need integrations that are disconnected. Webhook/schedule/heartbeat/manual
 * do not require integrations to be connected.
 */
export function detectRequiredIntegrationsForPolling(plan: DeployAgentPlan): string[] {
  const required = new Set<string>();
  for (const behaviour of plan.behaviours) {
    if (behaviour.behaviourType === 'polling' && behaviour.triggerType) {
      const service = TRIGGER_TO_SERVICE[behaviour.triggerType];
      if (service) required.add(service);
    }
  }
  return Array.from(required);
}

/**
 * Builds integration check list for polling-only (used by integration gate).
 * Only includes integrations required by polling triggers.
 */
export function buildIntegrationCheckListForPolling(
  plan: DeployAgentPlan,
  connectedServices: string[]
): IntegrationCheckItem[] {
  const requiredServiceIds = detectRequiredIntegrationsForPolling(plan);
  return requiredServiceIds
    .map((serviceId) => {
      const meta = getIntegrationMeta(serviceId);
      if (!meta) return null;
      const isConnected = connectedServices.some(
        (cs) =>
          cs === serviceId ||
          (serviceId.startsWith('google-') && cs.startsWith('google-')) ||
          (cs.startsWith('google-') && serviceId.startsWith('google-'))
      );
      return {
        service: meta.service,
        label: meta.label,
        icon: meta.icon,
        required: true,
        connected: isConnected,
        connectUrl: meta.connectUrl,
        connectionMethod: meta.connectionMethod,
      } as IntegrationCheckItem;
    })
    .filter((item): item is IntegrationCheckItem => item !== null);
}

/**
 * Builds a list of `IntegrationCheckItem` objects by cross-referencing
 * required integrations against the user's currently connected integrations.
 *
 * @param plan               The AI-generated agent plan
 * @param connectedServices  Service IDs the user has already connected (from /api/integrations/status)
 */
export function buildIntegrationCheckList(
  plan: DeployAgentPlan,
  connectedServices: string[]
): IntegrationCheckItem[] {
  const requiredServiceIds = detectRequiredIntegrations(plan);

  return requiredServiceIds
    .map((serviceId) => {
      const meta = getIntegrationMeta(serviceId);
      if (!meta) return null;

      // A Google sub-service is considered connected if the user has any
      // google-* service connected (they share the same OAuth token).
      const isConnected = connectedServices.some(
        (cs) =>
          cs === serviceId ||
          (serviceId.startsWith('google-') && cs.startsWith('google-')) ||
          (cs.startsWith('google-') && serviceId.startsWith('google-'))
      );

      const item: IntegrationCheckItem = {
        service: meta.service,
        label: meta.label,
        icon: meta.icon,
        required: true,
        connected: isConnected,
        connectUrl: meta.connectUrl,
        connectionMethod: meta.connectionMethod,
      };
      return item;
    })
    .filter((item): item is IntegrationCheckItem => item !== null);
}

// ============================================================================
// DERIVE CAPABILITIES FOR AGENT TAB
// ============================================================================

/** Agent shape with behaviours + instructions for capability derivation */
export interface AgentForCapabilities {
  instructions?: string | null;
  persona?: string | null;
  behaviours?: Array<{ behaviour_type?: string; trigger_type?: string; config?: Record<string, any>; description?: string }>;
}

/**
 * Derives the list of integrations/capabilities this agent uses from its
 * behaviours (trigger types) and instructions. Used to populate the
 * Capabilities section in the agent tab.
 *
 * Returns { slug, name }[] for display (matches agent-tab-content logo slugs).
 */
export function deriveAgentCapabilities(agent: AgentForCapabilities): Array<{ slug: string; name: string }> {
  const syntheticPlan: DeployAgentPlan = {
    name: '',
    persona: agent.persona ?? '',
    instructions: agent.instructions ?? '',
    avatarEmoji: '🤖',
    behaviours: (agent.behaviours ?? []).map((b) => ({
      behaviourType: (b.behaviour_type === 'schedule' || b.behaviour_type === 'heartbeat' ? b.behaviour_type : 'polling') as 'polling' | 'schedule' | 'heartbeat',
      triggerType: b.trigger_type,
      config: b.config ?? {},
      description: (b as any).description ?? '',
    })),
    initialMemories: [],
  };
  const serviceIds = detectRequiredIntegrations(syntheticPlan);
  const result: Array<{ slug: string; name: string }> = [];
  const seen = new Set<string>();
  for (const sid of serviceIds) {
    const cap = SERVICE_TO_CAPABILITY[sid];
    if (cap && !seen.has(cap.slug)) {
      seen.add(cap.slug);
      result.push(cap);
    }
  }
  return result;
}
