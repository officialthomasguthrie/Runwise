/**
 * Resend Inbound Webhook
 * POSTs from Resend every time an inbound email is received for a verified domain.
 *
 * Responsibilities:
 *  - Verify Svix/Resend webhook signature using raw request body
 *  - Resolve inbound recipient address -> `agents.resend_from_email` -> `agent_id`
 *  - Idempotency: process each inbound email only once (by `resend_email_id`)
 *  - Persist inbound email into `agent_memory` as an `event`
 *  - Trigger `agent/run` (Inngest) so the agent can read the inbound content
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { inngest } from '@/inngest/client';
import { Resend } from 'resend';
import { normalizeResendFromEmail } from '@/lib/email/agent-address';
import { writeMemory } from '@/lib/agents/memory';

export const runtime = 'nodejs';

function htmlToText(html: string): string {
  let text = html
    .replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ''
    )
    .replace(
      /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
      ''
    )
    .replace(
      /<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi,
      ''
    );

  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return text.replace(/\n\s*\n/g, '\n\n');
}

function normalizeEmailAddress(email: string): string {
  // Resend payload typically has raw email strings (no display names), but we
  // still normalize defensively.
  return normalizeResendFromEmail(email);
}

export async function POST(request: NextRequest) {
  try {
    const resendWebhookSecret =
      process.env.RESEND_WEBHOOK_SECRET?.trim() ||
      process.env.RESEND_INBOUND_WEBHOOK_SECRET?.trim();

    if (!resendWebhookSecret) {
      return NextResponse.json(
        { error: 'Missing RESEND_WEBHOOK_SECRET' },
        { status: 500 }
      );
    }

    // IMPORTANT: signature verification requires raw body (no JSON parsing)
    const rawPayload = await request.text();

    const svixId = request.headers.get('svix-id') || '';
    const svixTimestamp = request.headers.get('svix-timestamp') || '';
    const svixSignature = request.headers.get('svix-signature') || '';

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json(
        { error: 'Missing Svix signature headers' },
        { status: 400 }
      );
    }

    // Verify webhook signature using Resend SDK (Svix)
    const resendForVerify = new Resend(process.env.RESEND_API_KEY);
    let verified: any;
    try {
      verified = resendForVerify.webhooks.verify({
        payload: rawPayload,
        headers: {
          id: svixId,
          timestamp: svixTimestamp,
          signature: svixSignature,
        },
        webhookSecret: resendWebhookSecret,
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // We only handle inbound receipt events
    if (verified?.type !== 'email.received') {
      return NextResponse.json({ ok: true, skipped: true, type: verified?.type }, { status: 200 });
    }

    const receivedEmailId: string | undefined =
      verified?.data?.email_id || verified?.data?.emailId || verified?.data?.id;

    if (!receivedEmailId) {
      return NextResponse.json(
        { error: 'Missing email_id in webhook payload' },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if (!resendApiKey) {
      return NextResponse.json(
        { error: 'Missing RESEND_API_KEY' },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);
    const { data: inboundEmail, error: inboundEmailError } =
      await resend.emails.receiving.get(receivedEmailId);

    if (inboundEmailError || !inboundEmail) {
      return NextResponse.json(
        { error: 'Failed to fetch inbound email', details: inboundEmailError?.message },
        { status: 502 }
      );
    }

    const toList = Array.isArray(inboundEmail.to) ? inboundEmail.to : [];
    const toCandidates = toList
      .map((t) => (typeof t === 'string' ? t : ''))
      .map(normalizeEmailAddress)
      .filter(Boolean);

    if (toCandidates.length === 0) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'No recipient address found' }, { status: 200 });
    }

    const admin = createAdminClient();

    // Resolve agent by matching recipient address to the provisioned agent sender address
    let matchedAgent: { id: string; user_id: string; status: string; name: string } | null = null;
    for (const recipientEmail of toCandidates) {
      const { data: agentRow, error: agentError } = await (admin as any)
        .from('agents')
        .select('id, user_id, status, name')
        .eq('resend_from_email', recipientEmail)
        .single();

      if (agentError || !agentRow) continue;
      matchedAgent = agentRow as any;
      break;
    }

    if (!matchedAgent) {
      // Resend might deliver to other aliases/addresses; ignore if no agent matches.
      return NextResponse.json(
        { ok: true, skipped: true, reason: 'No agent found for recipient address' },
        { status: 200 }
      );
    }

    // ── Idempotency: only proceed if our marker insert succeeds ────────────
    // Use the DB unique constraint on `resend_email_id` to dedupe races.
    const resendEmailIdNormalized = String(inboundEmail.id ?? receivedEmailId);

    const fromEmail = typeof inboundEmail.from === 'string' ? inboundEmail.from : '';
    const subject = typeof inboundEmail.subject === 'string' ? inboundEmail.subject : '';
    const html = inboundEmail.html ?? null;
    const text = inboundEmail.text ?? null;

    const bodyText = (text && text.trim()) ? text.trim() : html ? htmlToText(String(html)) : '';
    const content = [
      `Inbound email received for your agent address`,
      `From: ${fromEmail || '(unknown)'}`,
      `Subject: ${subject || '(no subject)'}`,
      bodyText ? `\n${bodyText}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const markerPayload = {
      agent_id: matchedAgent.id,
      user_id: matchedAgent.user_id,
      resend_email_id: resendEmailIdNormalized,
      resend_message_id: inboundEmail.message_id ?? null,
      from_email: fromEmail || null,
      to_email: toCandidates[0] ?? null,
      subject: subject || null,
      received_at: inboundEmail.created_at ?? new Date().toISOString(),
      raw: { ...inboundEmail, html: undefined, text: undefined },
    };

    const { error: markerError } = await (admin as any)
      .from('agent_resend_inbound_events')
      .insert(markerPayload);

    if (markerError) {
      // Postgres unique violation = 23505
      if (markerError.code === '23505') {
        return NextResponse.json(
          { ok: true, skipped: true, reason: 'Duplicate inbound email' },
          { status: 200 }
        );
      }
      throw new Error(markerError.message ?? 'Failed to insert inbound marker');
    }

    // Persist inbound message so the agent can read it in its next run
    await writeMemory(
      matchedAgent.id,
      matchedAgent.user_id,
      content,
      'event',
      5,
      'agent'
    );

    // Trigger a run for active agents (paused agents won't take actions)
    if (matchedAgent.status === 'active') {
      await inngest.send({
        name: 'agent/run',
        data: {
          agentId: matchedAgent.id,
          userId: matchedAgent.user_id,
          behaviourId: null,
          triggerType: 'new-email-received',
          triggerData: {
            polledAt: new Date().toISOString(),
            items: [
              {
                id: inboundEmail.id,
                from: fromEmail,
                to: toCandidates,
                subject,
                snippet: bodyText.slice(0, 250),
                text: bodyText,
                messageId: inboundEmail.message_id ?? null,
              },
            ],
          },
        },
      });
    }

    return NextResponse.json({ ok: true, processed: true }, { status: 200 });
  } catch (err: any) {
    console.error('[Resend inbound webhook] failed:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

