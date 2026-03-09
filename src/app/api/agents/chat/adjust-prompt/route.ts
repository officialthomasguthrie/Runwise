/**
 * POST /api/agents/chat/adjust-prompt
 *
 * Streams a varied "what would you like to change?" message when the user
 * clicks "Let me adjust something". No plan regeneration — just the prompt.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { streamAdjustPrompt } from '@/lib/ai/agent-streaming';
import { createSSEStream, SSE_HEADERS } from '@/lib/agents/chat-pipeline';

function streamThinking(writer: ReturnType<typeof createSSEStream>['writer']) {
  for (const char of 'Thinking...') {
    writer.text(char);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { readable, writer } = createSSEStream();

    (async () => {
      try {
        streamThinking(writer);
        writer.textDone();
        await streamAdjustPrompt(writer);
        writer.close();
      } catch (err: any) {
        console.error('[POST /api/agents/chat/adjust-prompt]', err);
        writer.error(err?.message ?? 'Something went wrong');
      }
    })();

    return new Response(readable, {
      headers: SSE_HEADERS,
    });
  } catch (err: any) {
    console.error('[POST /api/agents/chat/adjust-prompt]', err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
