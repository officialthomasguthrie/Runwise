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
  /** Renders the dynamic questionnaire card */
  | { type: 'questionnaire'; questions: ClarificationQuestion[] }
  /** Renders the plan preview card */
  | { type: 'plan'; plan: DeployAgentPlan }
  /** Renders the "Ready to build?" confirmation buttons */
  | { type: 'confirmation' }
  /** Appends / updates a stage row in the build progress card */
  | { type: 'build_stage'; stage: string; status: BuildStageStatus }
  /** Build is finished — show completion card */
  | { type: 'build_complete'; agentId: string; summary: string }
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
  | { id: string; role: 'card'; cardType: 'completion'; agentId: string; summary: string };

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
  /** Append / update a build stage row */
  buildStage(stage: string, status: BuildStageStatus): void;
  /** Signal build completion */
  complete(agentId: string, summary: string): void;
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

    buildStage(stage, status) {
      push({ type: 'build_stage', stage, status });
    },

    complete(agentId, summary) {
      push({ type: 'build_complete', agentId, summary });
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
];

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
