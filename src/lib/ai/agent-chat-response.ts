/**
 * Agent Chat Response
 * Streams a conversational AI response when the user is chatting
 * rather than requesting agent creation.
 */

import OpenAI from 'openai';

export type AgentChatWriter = {
  text: (delta: string) => void;
  textDone: () => void;
  close: () => void;
};

/**
 * Stream a conversational response to the user when they are not requesting agent creation.
 * Uses the same SSE text_delta/text_done format as the agent pipeline.
 * @param systemPrefix - Optional prefix to prepend to the system prompt (e.g. agent context)
 */
export async function streamAgentChatResponse(
  writer: AgentChatWriter,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrefix?: string
): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    writer.text('I’m having trouble connecting right now. Please try again in a moment.');
    writer.textDone();
    writer.close();
    return;
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const basePrompt = `You are the Runwise agent builder. Your primary job is to help the user design and build an agent/automation from this chat.

RIGHT NOW: The user is not yet giving a concrete build request. Handle conversation naturally, but keep a builder posture and move toward creating their agent.

Your role:
- Speak like a builder who can turn their idea into a working agent
- For greetings/small talk, reply briefly, then ask a builder-style next step (objective, trigger, outcome, destination)
- Offer concrete build help: define what the agent should do, when it should run, and where outputs should go
- If they are vague, ask a focused follow-up question that helps gather build requirements
- Avoid framing yourself as a generic support bot for questions-only conversations

Tone and format:
- Keep responses concise (2–4 sentences typically)
- Be confident, practical, and action-oriented
- Never use emojis. Use plain text only.`;
  const systemPrompt = systemPrefix ? `${systemPrefix}\n\n${basePrompt}` : basePrompt;

  const chatMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add recent conversation (last 6 messages)
  const recent = messages.slice(-6);
  for (const m of recent) {
    chatMessages.push({
      role: m.role,
      content: m.content,
    });
  }

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        writer.text(delta);
      }
    }

    writer.textDone();
    writer.close();
  } catch (error: any) {
    console.error('[Agent Chat Response] Error:', error);
    writer.text("I'm sorry, I couldn't process that. Please try again.");
    writer.textDone();
    writer.close();
  }
}
