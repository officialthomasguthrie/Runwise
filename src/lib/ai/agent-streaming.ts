/**
 * Agent Streaming
 * Streams AI-generated intro text for the agent builder pipeline.
 * Words appear as they're generated, like the AI chat sidebar.
 */

import OpenAI from 'openai';
import type { DeployAgentPlan } from '@/lib/agents/types';
import type { IntegrationCheckItem } from '@/lib/agents/chat-pipeline';
import { detectRequiredIntegrations, getIntegrationMeta } from '@/lib/agents/chat-pipeline';

export type AgentStreamWriter = {
  text: (delta: string) => void;
  textDone: () => void;
};

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function streamCompletion(
  writer: AgentStreamWriter,
  systemPrompt: string,
  userContent: string,
  fallback: string
): Promise<void> {
  const openai = getOpenAI();
  if (!openai) {
    writer.text(fallback);
    writer.textDone();
    return;
  }

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.6,
      max_tokens: 200,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        writer.text(delta);
      }
    }
    writer.textDone();
  } catch (error: any) {
    console.error('[Agent Streaming] Error:', error);
    writer.text(fallback);
    writer.textDone();
  }
}

/**
 * Stream an intro when the user needs to connect integrations.
 */
export async function streamIntegrationIntro(
  writer: AgentStreamWriter,
  integrations: IntegrationCheckItem[]
): Promise<void> {
  const names = integrations.map((i) => i.label).join(', ');
  await streamCompletion(
    writer,
    `You are the Runwise agent builder. The user needs to connect some integrations before their agent can work.
Generate a single friendly sentence (1-2 clauses) telling them they need to connect these integrations first. Be concise and natural.
Do NOT list the integrations — the UI shows them. Just a brief intro like "You'll need to connect these first" or similar.
Output ONLY the sentence, no quotes, no preamble.`,
    `Missing integrations: ${names}`,
    "You'll need to connect these first:"
  );
}

/**
 * Stream an intro when presenting clarification questions.
 * Varies phrasing each time — AI generates a fresh intro, never a fixed phrase.
 * Pass isFollowUp=true for round 2+ so the sentence signals "a few more" rather than "first time".
 */
export async function streamClarificationIntro(
  writer: AgentStreamWriter,
  summary: string,
  isFollowUp = false
): Promise<void> {
  const systemPrompt = isFollowUp
    ? `You are the Runwise agent builder. You've already asked the user an initial set of questions and now have a small follow-up set.
Generate a single friendly sentence (5-15 words) that signals there are just a few MORE things to clarify — NOT that this is the first time asking.
IMPORTANT: Vary your phrasing every time. End the sentence with a period, NEVER a colon.
Examples: "Just a couple more things to confirm.", "I need to clarify a few more details.", "One more quick round of questions.", "Almost there — just a few more clarifications.", "Just need a bit more info."
Output ONLY the sentence, no quotes, no preamble.`
    : `You are the Runwise agent builder. You're about to ask the user a first set of clarification questions.
Generate a single friendly sentence (5-15 words) that introduces these questions.
IMPORTANT: Vary your phrasing every time. End the sentence with a period, NEVER a colon.
Examples: "A few quick questions to nail this down.", "Let me ask you a couple of things.", "Just need a bit more detail to get started.", "Quick clarifications before we build this.", "I'd love a few more specifics."
Use the summary context to tailor the tone if helpful. Output ONLY the sentence, no quotes, no preamble.`;

  await streamCompletion(
    writer,
    systemPrompt,
    summary || 'User wants to build an agent.',
    isFollowUp ? 'Just a couple more things to confirm.' : 'A few quick questions.'
  );
}

/**
 * Stream the full plan presentation as plain text.
 * Output: intro ("Okay, here's the plan...") + drafted paragraph + closing ("How does this sound?")
 */
export async function streamPlanIntro(
  writer: AgentStreamWriter,
  plan: DeployAgentPlan,
  userDescription: string
): Promise<void> {
  const behavioursSummary =
    plan.behaviours.length > 0
      ? plan.behaviours.map((b) => b.description).join(', ')
      : 'run manually when you trigger it (no automatic triggers)';

  const openai = getOpenAI();
  if (!openai) {
    writer.text(`Okay, here's the plan.\n\nYour agent will ${behavioursSummary}. How does this sound?`);
    writer.textDone();
    return;
  }

  const behavioursContext =
    plan.behaviours.length > 0
      ? plan.behaviours.map((b) => `${b.behaviourType}${b.triggerType ? ` (${b.triggerType})` : ''}: ${b.description}`).join('; ')
      : 'Manual only (no triggers — user runs the agent manually)';

  const planContext = [
    `Agent name: ${plan.name}`,
    `Persona: ${plan.persona}`,
    `Instructions: ${plan.instructions}`,
    `Behaviours: ${behavioursContext}`,
  ].join('\n');

  const systemPrompt = `You are the Runwise agent builder. Present the agent plan as plain text in exactly 3 parts:

1. A short intro line like "Okay, here's the plan."
2. A new paragraph that drafts a cohesive summary for the user. Use their original request and the plan details below. In one flowing paragraph, describe: what the agent will do, how it will work, what tools/triggers it uses, and the overall approach. Be specific and natural.
3. A closing question like "How does this sound?"

Output ONLY these 3 parts. Use plain text, no markdown, no bullets, no icons. Write as if you're explaining to a colleague.`;

  const userContent = `User's request and clarifications:\n${userDescription}\n\nPlan details:\n${planContext}`;

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.6,
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
  } catch (error: any) {
    console.error('[Agent Streaming] Plan intro error:', error);
    writer.text(`Okay, here's the plan.\n\nYour agent will ${behavioursSummary}.\n\nHow does this sound?`);
    writer.textDone();
  }
}

/**
 * Generate a short one-line tagline for the agent (e.g. "Outbound SDR for SaaS leads").
 * Used when building the agent and stored in short_description.
 */
export async function generateShortDescription(
  plan: DeployAgentPlan,
  userDescription: string
): Promise<string> {
  const openai = getOpenAI();
  if (!openai) {
    const first = plan.behaviours[0]?.description;
    return first ? first.slice(0, 60) : plan.name;
  }

  const userContent = `User's request: ${userDescription}\n\nAgent: ${plan.name}. Behaviours: ${plan.behaviours.map((b) => b.description).join('; ')}`;

  try {
    const { choices } = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Generate a VERY short one-line description of what this AI agent does. 
Examples: "Outbound SDR for SaaS leads", "Competitor monitoring and alerts", "Gmail inbox triage", "Lead follow-up automation".
Output ONLY the tagline. No quotes. Max 50 chars. Be concise and specific.`,
        },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
      max_tokens: 60,
    });
    const text = (choices[0]?.message?.content ?? '').trim().slice(0, 60);
    return text || plan.name;
  } catch (e) {
    console.error('[Agent Streaming] Short description error:', e);
    const first = plan.behaviours[0]?.description;
    return first ? first.slice(0, 60) : plan.name;
  }
}

/**
 * Stream a multi-paragraph AI-generated summary when agent build completes.
 * Describes what the agent does, how it works, and what tools/integrations it uses.
 */
export async function streamCompletionSummary(
  writer: AgentStreamWriter,
  plan: DeployAgentPlan,
  userDescription: string
): Promise<void> {
  const openai = getOpenAI();
  if (!openai) {
    const fallback = `${plan.name} is ready. It uses ${plan.behaviours.map((b) => b.description).join(', ')}.`;
    writer.text(fallback);
    writer.textDone();
    return;
  }

  const requiredServices = detectRequiredIntegrations(plan);
  const extraServiceLabels: Record<string, string> = {
    'platform-agent-email': 'Agent email (Runwise)',
  };
  const uniqueTools = requiredServices
    .map((id) => getIntegrationMeta(id)?.label ?? extraServiceLabels[id])
    .filter(Boolean) as string[];

  const systemPrompt = `You are the Runwise agent builder. An agent was just built successfully.
Write a 2–4 paragraph plain-text summary for the user explaining:
1. What the agent does (its purpose and main behaviours)
2. How it works (triggers, flow, when it runs)
3. What tools or integrations it uses (e.g. Gmail, Slack, Google Sheets)

Be clear and specific. Use the plan details provided. Write as if explaining to the user. No bullet points, no markdown. Just flowing paragraphs.`;

  const userContent = `User's request: ${userDescription}

Agent plan:
- Name: ${plan.name}
- Persona: ${plan.persona}
- Instructions: ${plan.instructions}
- Behaviours: ${plan.behaviours.map((b) => `${b.behaviourType}${b.triggerType ? ` (${b.triggerType})` : ''}: ${b.description}`).join('; ')}
- Tools/integrations: ${uniqueTools.join(', ') || 'various'}`;

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.5,
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
  } catch (error: any) {
    console.error('[Agent Streaming] Completion summary error:', error);
    const fallback = `${plan.name} is live. It will ${plan.behaviours.map((b) => b.description).join(' and ')}.`;
    writer.text(fallback);
    writer.textDone();
  }
}

/**
 * Stream a varied "what would you like to change?" response when user clicks "Let me adjust something".
 * Different every time — no plan regeneration yet, just prompting for feedback.
 */
export async function streamAdjustPrompt(writer: AgentStreamWriter): Promise<void> {
  await streamCompletion(
    writer,
    `You are the Runwise agent builder. The user clicked "Let me adjust something" on their agent plan.
Generate a single short, friendly sentence (5-15 words) that invites them to share what they'd like to change. 
Vary the phrasing every time. Examples: "Of course. What would you like to change?", "Sure thing — what should we tweak?", "Happy to adjust. What's on your mind?", "No problem. Tell me what you'd like different."
Be natural and concise. Output ONLY the sentence, no quotes, no preamble.`,
    'User wants to adjust the plan',
    'Of course. What would you like to change?'
  );
}
