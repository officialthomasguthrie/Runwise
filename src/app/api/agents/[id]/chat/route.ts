/**
 * POST /api/agents/[id]/chat
 *
 * Streams a conversational AI response for the agent workspace chat.
 * Responds in context of the specific agent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { requireAgentBuilderAccess } from '@/lib/agents/plan-gate';
import { streamAgentChatResponse } from '@/lib/ai/agent-chat-response';
import { createSSEStream, SSE_HEADERS } from '@/lib/agents/chat-pipeline';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gate = await requireAgentBuilderAccess(user.id);
    if (gate) return gate;

    const { id: agentId } = await context.params;

    let body: { messages?: Array<{ role: 'user' | 'assistant'; content: string }> };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const messages = body.messages ?? [];
    if (messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: agent, error: agentError } = await (admin as any)
      .from('agents')
      .select('id, name, instructions, persona')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const { readable, writer } = createSSEStream();

    (async () => {
      try {
        const agentContext = `Agent: ${agent.name}. Persona: ${agent.persona ?? 'N/A'}. Instructions: ${agent.instructions?.slice(0, 300) ?? 'N/A'}`;
        const systemPrefix = `You are the Runwise assistant for this agent workspace. Context: ${agentContext}. The user is chatting about or with this agent. `;
        const augmentedMessages = messages.map((m) => ({
          ...m,
          content: m.role === 'user' ? m.content : m.content,
        }));

        await streamAgentChatResponse(
          {
            ...writer,
            text: writer.text.bind(writer),
            textDone: writer.textDone.bind(writer),
            close: writer.close.bind(writer),
          },
          augmentedMessages,
          systemPrefix
        );
        writer.close();
      } catch (err: any) {
        console.error('[POST /api/agents/[id]/chat]', err);
        writer.error(err?.message ?? 'Something went wrong');
      }
    })();

    return new Response(readable, { headers: SSE_HEADERS });
  } catch (err: any) {
    console.error('[POST /api/agents/[id]/chat]', err);
    return NextResponse.json(
      { error: err?.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
