import { Resend } from 'resend';

// ---------------------------------------------------------------------------
// Types — send payload & errors (Phase 2)
// ---------------------------------------------------------------------------

/**
 * Outbound email body: Resend requires at least one of `html` or `text`.
 * Caller should provide both for best deliverability when possible.
 */
export type SendResendEmailPayload = {
  /** Full RFC5322 from, e.g. `agent@verified.domain` or `Name <agent@domain>` */
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | string[];
};

export type ResendErrorCode =
  | 'missing_api_key'
  | 'missing_body'
  | 'validation_error'
  | 'resend_api_error';

/**
 * Normalized error for callers (logging, agent tools, API routes).
 * Distinct from the SDK’s internal `ErrorResponse` shape.
 */
export class ResendSendError extends Error {
  readonly code: ResendErrorCode;
  readonly statusCode: number | null | undefined;
  /** Resend API error `name` when `code === 'resend_api_error'` */
  readonly resendName?: string;

  constructor(
    message: string,
    options: {
      code: ResendErrorCode;
      statusCode?: number | null;
      resendName?: string;
      cause?: unknown;
    }
  ) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'ResendSendError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.resendName = options.resendName;
  }
}

export type SendResendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: ResendSendError };

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

/** API key from `process.env` (server-only). */
export function getResendApiKey(): string | undefined {
  const key = process.env.RESEND_API_KEY?.trim();
  return key || undefined;
}

/**
 * Default display name for agent/platform sends when building a `from` string.
 * Override with `RESEND_DEFAULT_FROM_NAME`.
 */
export function getResendDefaultFromName(): string {
  const n = process.env.RESEND_DEFAULT_FROM_NAME?.trim();
  return n || 'Runwise Agents';
}

let _client: Resend | null | undefined;

function getResendClient(): Resend | null {
  if (_client !== undefined) return _client;
  const key = getResendApiKey();
  _client = key ? new Resend(key) : null;
  return _client;
}

/** Test hook: reset cached client after env changes. */
export function __resetResendClientForTests(): void {
  _client = undefined;
}

function validatePayload(payload: SendResendEmailPayload): ResendSendError | null {
  if (!payload.from?.trim()) {
    return new ResendSendError('`from` is required', { code: 'validation_error' });
  }
  if (!payload.subject?.trim()) {
    return new ResendSendError('`subject` is required', { code: 'validation_error' });
  }
  const to = payload.to;
  const hasTo = Array.isArray(to) ? to.length > 0 : Boolean(to && String(to).trim());
  if (!hasTo) {
    return new ResendSendError('`to` must include at least one recipient', {
      code: 'validation_error',
    });
  }
  if (!payload.html?.trim() && !payload.text?.trim()) {
    return new ResendSendError('Provide at least one of `html` or `text`', {
      code: 'missing_body',
    });
  }
  return null;
}

/**
 * Send a transactional email via Resend.
 * Reads `RESEND_API_KEY` from the environment (never expose to the client).
 */
export async function sendResendEmail(
  payload: SendResendEmailPayload
): Promise<SendResendEmailResult> {
  const validationError = validatePayload(payload);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const client = getResendClient();
  if (!client) {
    return {
      ok: false,
      error: new ResendSendError(
        'RESEND_API_KEY is not set; cannot send email',
        { code: 'missing_api_key' }
      ),
    };
  }

  const { from, to, subject, html, text, replyTo } = payload;

  const base = {
    from,
    to,
    subject,
    ...(replyTo !== undefined ? { replyTo } : {}),
  } as const;

  const htmlBody = html?.trim();
  const textBody = text?.trim();

  // CreateEmailOptions requires at least one of html | text (validated above).
  const emailPayload =
    htmlBody && textBody
      ? { ...base, html: htmlBody, text: textBody }
      : htmlBody
        ? { ...base, html: htmlBody }
        : { ...base, text: textBody! };

  const { data, error } = await client.emails.send(emailPayload);

  if (error) {
    return {
      ok: false,
      error: new ResendSendError(error.message || 'Resend API error', {
        code: 'resend_api_error',
        statusCode: error.statusCode,
        resendName: error.name,
      }),
    };
  }

  if (!data?.id) {
    return {
      ok: false,
      error: new ResendSendError('Resend returned success but no message id', {
        code: 'resend_api_error',
        statusCode: null,
      }),
    };
  }

  return { ok: true, id: data.id };
}
