/**
 * Agent Intent Analysis
 * Analyzes user messages to determine if they want to create/deploy an agent
 * vs. just having a generic conversation or asking a question.
 */

import OpenAI from 'openai';

export type AgentIntentResult = {
  wantsAgent: boolean;
  reason?: string;
};

/**
 * Analyze conversation to determine if the user wants to create an agent.
 * Returns wantsAgent: true when the user is describing what they want an agent to do.
 * Returns wantsAgent: false when the user is chatting, greeting, asking questions,
 * or otherwise not requesting agent creation.
 */
export async function analyzeAgentIntent(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<AgentIntentResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const systemPrompt = `You are an intent classifier for Runwise, an AI agent builder platform. Your ONLY job is to classify whether the user wants to CREATE or DEPLOY an agent versus having a general conversation.

AGENT INTENT (wantsAgent: true) — User explicitly or implicitly wants to build/create an agent that will:
- Watch, monitor, or observe something (e.g., "watch my Gmail", "monitor my Slack")
- Automate a task or behavior (e.g., "make an agent that sends me summaries", "I want something to alert me when...")
- Deploy or set up an agent (e.g., "create an agent to...", "build me an agent that...")
- Describe what they want an agent TO DO (e.g., "summarize my emails daily", "alert me when GitHub issues are assigned to me")

CHAT/QUESTION INTENT (wantsAgent: false) — User is NOT requesting agent creation:
- Greetings: "hi", "hello", "hey"
- General questions: "what can you do?", "how does this work?", "what are agents?"
- Small talk: "how are you?", "thanks", "cool"
- Clarifying the product: "what's the difference between an agent and a workflow?"
- Feedback or comments not describing an agent: "I like this", "this is confusing"
- Unrelated topics: "what's the weather?", "tell me a joke"

RULES:
- When in doubt, prefer wantsAgent: false — only set true when the user is clearly describing what they want an agent to do
- Vague single-word messages like "help" or "agent" → wantsAgent: false (needs clarification)
- If the user describes a specific automation task (watch X, when Y happens do Z), that's wantsAgent: true
- If the user is asking about capabilities, pricing, or how something works → wantsAgent: false

OUTPUT FORMAT (JSON only):
{"wantsAgent": boolean, "reason": "Brief reason for the classification"}

Return ONLY valid JSON, no markdown, no code fences.`;

  const conversationStr = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const userContent = `Classify the intent of this conversation. Focus on the LATEST user message.\n\n${conversationStr}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 150,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseContent) as { wantsAgent?: boolean; reason?: string };

    return {
      wantsAgent: Boolean(parsed.wantsAgent),
      reason: parsed.reason,
    };
  } catch (error: any) {
    console.error('[Agent Intent] Error:', error);
    // On error, default to agent intent to avoid blocking the pipeline
    return { wantsAgent: true, reason: 'Intent analysis failed, proceeding with agent' };
  }
}
