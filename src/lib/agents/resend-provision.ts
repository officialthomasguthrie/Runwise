/**
 * Persist platform Resend sender identity on `agents` when `email_sending_mode`
 * includes `agent_resend`. See docs/AGENT_RESEND_EMAIL_IMPLEMENTATION.md Phase 3.
 */

import { buildAgentFromAddress } from '@/lib/email/agent-address';
import type { AgentEmailSendingMode } from '@/lib/agents/types';

const MODES: AgentEmailSendingMode[] = ['none', 'user_gmail', 'agent_resend', 'both'];

export function parseAgentEmailSendingMode(value: unknown): AgentEmailSendingMode | null {
  if (typeof value !== 'string') return null;
  return MODES.includes(value as AgentEmailSendingMode) ? (value as AgentEmailSendingMode) : null;
}

export function emailSendingModeUsesAgentResend(mode: AgentEmailSendingMode): boolean {
  return mode === 'agent_resend' || mode === 'both';
}

/** Resolve mode from an optional plan field (legacy plans → `none`). */
export function resolvePlanEmailSendingMode(plan: { emailSendingMode?: AgentEmailSendingMode }): AgentEmailSendingMode {
  const m = plan.emailSendingMode;
  if (m && MODES.includes(m)) return m;
  return 'none';
}

export type AgentResendProvisionPatch = Partial<{
  email_sending_mode: AgentEmailSendingMode;
  resend_from_email: string | null;
  resend_from_name: string | null;
  resend_provisioned_at: string | null;
}>;

type ProvisionInput = {
  agentId: string;
  /** Display name stored as `resend_from_name` when first provisioning */
  agentDisplayName: string;
  emailSendingMode: AgentEmailSendingMode;
  /** Current DB value — if already set, provisioning is skipped (idempotent) */
  existingResendFromEmail: string | null | undefined;
};

/**
 * Fields to merge into `agents.update()`.
 * - Always sets `email_sending_mode`.
 * - When mode does not use agent Resend, clears resend_* columns.
 * - When mode uses agent Resend and `resend_from_email` is already set, leaves resend_* unchanged.
 * - When mode uses agent Resend and address is empty, sets address + name + `resend_provisioned_at` if `RESEND_FROM_DOMAIN` is set.
 */
export function getAgentResendProvisionPatch(input: ProvisionInput): AgentResendProvisionPatch {
  const { agentId, agentDisplayName, emailSendingMode, existingResendFromEmail } = input;

  const patch: AgentResendProvisionPatch = {
    email_sending_mode: emailSendingMode,
  };

  if (!emailSendingModeUsesAgentResend(emailSendingMode)) {
    patch.resend_from_email = null;
    patch.resend_from_name = null;
    patch.resend_provisioned_at = null;
    return patch;
  }

  const existing = existingResendFromEmail?.trim();
  if (existing) {
    return patch;
  }

  const domain = process.env.RESEND_FROM_DOMAIN?.trim();
  if (!domain) {
    console.warn(
      '[resend-provision] RESEND_FROM_DOMAIN is not set; cannot set resend_from_email (mode still saved)'
    );
    return patch;
  }

  try {
    const email = buildAgentFromAddress(agentId, domain);
    patch.resend_from_email = email;
    patch.resend_from_name = agentDisplayName.trim() || null;
    patch.resend_provisioned_at = new Date().toISOString();
  } catch (e) {
    console.warn('[resend-provision] Failed to build agent from address', e);
  }

  return patch;
}
