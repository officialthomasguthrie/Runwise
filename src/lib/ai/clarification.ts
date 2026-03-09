/**
 * Clarification Analysis
 * Analyzes agent prompts to determine if additional information is needed
 * before building the agent. Generates thorough questionnaires to minimize hallucination.
 */

import OpenAI from 'openai';
import type { ClarificationAnalysis, ClarificationQuestion, QuestionnaireAnswer } from './types';

const CONDITIONAL_PATTERNS = [
  /\bif\s+you\s+(chose|chosen|selected|pick|picked|chosen|prefer|want|choose)\b/i,
  /\bif\s+\[?['"]?\w+['"]?\]?\s+(was\s+)?(chosen|selected|picked)\b/i,
  /\bin\s+case\s+you\s+(chose|selected|picked)\b/i,
  /\bfor\s+those\s+who\s+(chose|selected|picked)\b/i,
  /\bdepending\s+on\s+(your\s+)?(answer|choice|selection)\b/i,
  /\bif\s+(email|slack|discord|notification|alert)\b/i,
  /\bwhen\s+you\s+(select|choose|pick)\b/i,
  /\bif\s+the\s+(user|they)\s+(chose|selected)\b/i,
  /\bif\s+your\s+answer\s+was\b/i,
  /\bbased\s+on\s+your\s+(previous\s+)?(answer|choice)\b/i,
];

function hasConditionalPhrasing(text: string): boolean {
  const lower = text.toLowerCase();
  return CONDITIONAL_PATTERNS.some((p) => p.test(lower));
}

/**
 * Analyze an agent request and determine if clarification questions are needed.
 * Uses thorough agent-specific checklist to ensure the planner has a complete picture.
 */
export async function analyzeClarificationNeeds(
  userPrompt: string,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<ClarificationAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const systemPrompt = `You are an expert agent requirements analyst for Runwise, an AI agent platform. Your job is to analyze a user's agent request and determine if you need more information before building it. You MUST be thorough — vague requests lead to wrong or hallucinated agent behaviour.

AVAILABLE AGENT CAPABILITIES:
- Triggers: Gmail (new email), Slack (new message), Discord, Google Sheets (new row), GitHub (new issue), Google Drive (file upload), Google Forms (submission)
- Actions: Send email (SendGrid), post to Slack/Discord, create Notion pages, update Airtable/Trello/Sheets, create calendar events, AI processing (summaries, classification)
- Scheduling: Cron-based (daily, hourly, etc.)
- Persona: Tone, style, how the agent "speaks" or behaves

AGENT-SPECIFIC ANALYSIS CHECKLIST (be exhaustive):
1. TRIGGER: What starts the agent? (Email received? Slack message? New row? Form submission? Schedule?) Which specific source (Gmail, which channel, which sheet)?
2. TIMING: If scheduled, how often? (Every hour, daily at 9am, weekly on Monday?) Timezone?
3. BEHAVIOUR: What exactly should the agent DO when triggered? Step-by-step. What inputs does it need? What decisions does it make?
4. OUTPUT DESTINATION: Where does the agent send results? (Email to whom? Slack channel? Notion page? Sheet row?) Specific recipients, channels, or locations?
5. PERSONA & TONE: How should the agent communicate? Formal, casual, brief, detailed? Any specific phrasing or style?
6. SUCCESS CRITERIA: What does "done" or "success" look like? When should it stop or consider a task complete?
7. EDGE CASES: What if no data? What if multiple items? What if something fails? Should it retry, skip, or alert?
8. FILTERING: Any criteria to ignore certain inputs? (e.g. "only if email is from X", "only issues labeled bug")
9. AMBIGUOUS INTEGRATIONS: Does "notify me" mean email, Slack, or something else? Does "track" mean Sheets, Airtable, or something else?
10. DATA MAPPING: What specific fields or data from the trigger feed into each action? (e.g. "Use the email subject for the Notion page title")

RULES:
- Ask questions that MATERIALLY prevent wrong agent behaviour — be thorough, not minimal
- Keep questions simple, friendly, and non-technical
- Ask only the questions that are truly needed — could be 1, 2, 3, or any number up to 12. Do NOT pad to reach a target. If only 2 things are unclear, ask 2 questions.
- If the request is specific enough that wrong behaviour is unlikely, set needsClarification to false
- Prefer single_choice when there are clear limited options (2-6 options)
- CRITICAL - NO CONDITIONAL QUESTIONS: Each question MUST stand completely on its own. NEVER use phrases like: "If you chose X...", "If you selected...", "In case you picked...", "For those who chose...", "Depending on your answer...", "If email...", "If Slack...", "When you select...". Any question that depends on another question's answer MUST be asked in a SEPARATE questionnaire round AFTER the user submits. In that next round, you will receive their answers — then ask the follow-up as a direct, standalone question (e.g. "What email address should we send alerts to?" not "If you chose email, what address?").
- Use multiple_choice when the user might want several options
- Use text for freeform answers (emails, channel names, custom messages, URLs)
- Never ask about API keys, credentials, or technical config — those are handled separately
- Focus on decisions that change agent structure: which tools, what triggers, what output, when, to whom
- If "notify me", "alert me", "send me" — always ask HOW (email, Slack, etc.) and TO WHERE (address, channel)
- If timing is vague ("regularly", "often", "daily") — ask for specifics
- If multiple possible integrations — ask which one
- If the agent "qualifies" or "filters" something — ask the criteria
- If it "follows up" or "reaches out" — ask format (email, call, Slack) and cadence

CONFIDENCE LEVELS:
- 0.95-1.0: All details crystal clear, no ambiguity, no questions needed
- 0.75-0.95: Mostly clear but 1-3 details could cause wrong behaviour — ask only those 1-3
- 0.5-0.75: Several important details missing — ask only what's missing (no minimum)
- 0.25-0.5: Vague, significant clarification needed — ask as many as needed, no arbitrary target
- 0.0-0.25: Very vague — ask all the questions needed to clarify, but still no filler

OUTPUT FORMAT (JSON only, no markdown):
{
  "needsClarification": boolean,
  "confidence": number,
  "summary": "One sentence acknowledging what you understood",
  "questions": [
    {
      "id": "q1",
      "question": "Friendly, simple question text",
      "type": "single_choice" | "multiple_choice" | "text",
      "options": ["Option A", "Option B"],
      "placeholder": "e.g. john@example.com"
    }
  ]
}

If needsClarification is false, questions must be an empty array.
The questions array length should match the actual number of gaps — 1 question if 1 gap, 5 if 5 gaps. Never add filler questions to hit a count.
Return ONLY valid JSON, no markdown, no code fences, no explanations.`;

  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  if (conversationHistory && conversationHistory.length > 0) {
    const relevantHistory = conversationHistory.slice(-6).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
    messages.push(...relevantHistory);
  }

  messages.push({
    role: 'user',
    content: `Analyze this agent request and determine if clarification is needed:\n\n"${userPrompt}"`,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseContent) as ClarificationAnalysis;

    if (typeof parsed.needsClarification !== 'boolean') {
      parsed.needsClarification = true;
    }
    if (typeof parsed.confidence !== 'number') {
      parsed.confidence = 0.5;
    }
    if (!parsed.summary) {
      parsed.summary = 'I understand you want to deploy an agent.';
    }
    if (!Array.isArray(parsed.questions)) {
      parsed.questions = [];
    }

    parsed.questions = parsed.questions
      .filter((q): q is ClarificationQuestion =>
        typeof q.id === 'string' &&
        typeof q.question === 'string' &&
        ['single_choice', 'multiple_choice', 'text'].includes(q.type)
      )
      .filter((q) => !hasConditionalPhrasing(q.question))
      .slice(0, 12);

    // Only skip clarification when confidence is very high (0.95+)
    if (parsed.confidence >= 0.95) {
      parsed.needsClarification = false;
      parsed.questions = [];
    }

    if (parsed.needsClarification && parsed.questions.length === 0) {
      parsed.needsClarification = false;
    }

    return parsed;
  } catch (error: any) {
    console.error('Error analyzing clarification needs:', error);
    return {
      needsClarification: false,
      confidence: 0.5,
      summary: 'I understand your agent request.',
      questions: [],
    };
  }
}

/**
 * Build an enriched prompt by merging the original prompt with questionnaire answers.
 * Uses a structured format so the planner receives a clear, detailed specification.
 */
export function buildEnrichedPrompt(
  originalPrompt: string,
  answers: QuestionnaireAnswer[]
): string {
  if (answers.length === 0) return originalPrompt;

  const clarifications = answers
    .map((a) => {
      const answerText = Array.isArray(a.answer) ? a.answer.join(', ') : a.answer;
      return `Q: ${a.question}\nA: ${answerText}`;
    })
    .join('\n\n');

  return `${originalPrompt}

---
USER-CONFIRMED DETAILS (from questionnaire):
${clarifications}
---
Use the above details exactly. Do not infer different values for anything the user has explicitly answered.`;
}
