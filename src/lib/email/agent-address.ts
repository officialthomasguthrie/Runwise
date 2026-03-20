/**
 * Deterministic per-agent `from` addresses on a verified Resend domain.
 * Pure helpers — callers pass `RESEND_FROM_DOMAIN` (or parsed env) into `buildAgentFromAddress`.
 */

/** Lowercase, trim; strips accidental `@` prefix on domain input. */
export function normalizeResendDomain(domain: string): string {
  let d = domain.trim().toLowerCase();
  if (d.startsWith('@')) d = d.slice(1);
  // Reject obviously invalid empty / multi-line
  if (!d || /[\s@]/.test(d)) return '';
  return d;
}

/**
 * Sanitize local-part characters Resend / common MTAs accept.
 * Agent ids are usually UUIDs; this keeps the mapping stable and safe for odd ids.
 */
export function sanitizeEmailLocalPart(local: string): string {
  const s = local
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._+-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'agent';
}

const LOCAL_PREFIX = 'agent';

/**
 * Deterministic `from` email: `agent.{agentId}@{domain}` after sanitizing both parts.
 *
 * @param agentId — stable agent primary key (e.g. UUID)
 * @param domain — verified sending domain (no `@`), e.g. from `RESEND_FROM_DOMAIN`
 */
export function buildAgentFromAddress(agentId: string, domain: string): string {
  const d = normalizeResendDomain(domain);
  if (!d) {
    throw new Error(
      'Invalid or empty RESEND_FROM_DOMAIN; pass a verified domain without @ prefix'
    );
  }
  const id = String(agentId).trim();
  if (!id) {
    throw new Error('agentId is required to build agent from address');
  }
  const local = sanitizeEmailLocalPart(`${LOCAL_PREFIX}.${id}`);
  return `${local}@${d}`;
}

/** Case-insensitive comparison for uniqueness checks and DB partial unique indexes. */
export function normalizeResendFromEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Returns true if `candidateEmail` is not taken by any other stored address.
 * Ignores null/undefined entries. Compares case-insensitively.
 *
 * @param candidateEmail — address produced by `buildAgentFromAddress` (or user override in future)
 * @param existingFromEmails — e.g. other agents' `resend_from_email` values for the same user/workspace
 */
export function isResendFromAddressUnique(
  candidateEmail: string,
  existingFromEmails: readonly (string | null | undefined)[]
): boolean {
  const norm = normalizeResendFromEmail(candidateEmail);
  if (!norm) return false;
  for (const e of existingFromEmails) {
    if (e == null || e === '') continue;
    if (normalizeResendFromEmail(e) === norm) return false;
  }
  return true;
}

/**
 * Optional display `from` header: `"Name <email>"` using Resend’s recommended format.
 */
export function formatAgentResendFromHeader(displayName: string, email: string): string {
  const name = displayName.trim().replace(/[\r\n<>]/g, ' ').replace(/\s+/g, ' ').trim();
  const addr = email.trim();
  if (!name) return addr;
  // Quote name if it contains commas or special chars
  const needsQuote = /[,;"]/.test(name);
  const q = needsQuote ? `"${name.replace(/"/g, '\\"')}"` : name;
  return `${q} <${addr}>`;
}
