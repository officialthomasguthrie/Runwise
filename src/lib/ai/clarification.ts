/**
 * Clarification Analysis
 * Analyzes agent prompts to determine if additional information is needed
 * before building the agent. Supports multi-round questionnaires so that
 * conditional follow-up questions (e.g. "which Slack channel?" after the user
 * says "Slack") are asked in a later round instead of crammed into one form.
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
 *
 * @param userPrompt - The agent description (enriched with previous answers if multi-round)
 * @param conversationHistory - Recent chat messages for context
 * @param previousAnswers - Answers from earlier questionnaire rounds (enables follow-up questions)
 */
export async function analyzeClarificationNeeds(
  userPrompt: string,
  conversationHistory?: Array<{ role: string; content: string }>,
  previousAnswers?: QuestionnaireAnswer[]
): Promise<ClarificationAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const isFollowUpRound = previousAnswers && previousAnswers.length > 0;

  const previousAnswersSection = isFollowUpRound
    ? `
PREVIOUS ROUND — ALREADY CONFIRMED BY USER (do NOT re-ask):
${previousAnswers.map((a) => `Q: ${a.question}\nA: ${Array.isArray(a.answer) ? a.answer.join(', ') : a.answer}`).join('\n\n')}

This is a FOLLOW-UP round. The user already answered the questions above.
Your job now is to look at those answers and ask ONLY the context-dependent questions they unlocked.
Examples:
  - If they said "Slack" for notifications → ask which Slack channel name to use (previously deferred as conditional, now directly answerable)
  - If they said "Email" → ask which email address to send to
  - If they said "daily" with no time → ask what time of day
  - If they said "Google Sheets" → ask which spreadsheet and sheet tab
Do NOT ask broad questions again. Only ask what the previous answers specifically unlocked.
If nothing further is needed, set needsClarification to false.
`.trim()
    : `
This is ROUND 1. Focus on essential, non-conditional questions only.
IMPORTANT: If you would ask "what Slack channel if they chose Slack" — do NOT ask it yet.
First ask "How would you like to be notified?" and defer the channel/address question to round 2.
Round 2 will receive these answers and can then ask the specific follow-up as a direct question.
`.trim();

  const systemPrompt = `You are an expert agent requirements analyst for Runwise, an AI agent platform. Your job is to analyze a user's agent request and determine if you need more information before building it.

AVAILABLE AGENT CAPABILITIES:
- Triggers: Gmail (new email), Slack (new message), Discord, Google Sheets (new row), GitHub (new issue), Google Drive (file upload), Google Forms (submission), Notion, Airtable, Trello
- Actions: send email/Gmail, send email via this agent's dedicated platform address (Resend), post to Slack/Discord, create Notion pages, update Airtable/Trello/Sheets, create calendar events, web search, read URLs, send SMS (Twilio), post tweets
- Scheduling: Cron-based (daily, hourly, etc.) — no integration required
- Memory: remember and recall facts across runs

AGENT-SPECIFIC ANALYSIS CHECKLIST:
1. TRIGGER: What starts the agent? Which specific source?
2. TIMING: If scheduled, how often? What time? Timezone?
3. BEHAVIOUR: What exactly should the agent DO? Step-by-step.
4. OUTPUT DESTINATION: Where does it send results? Which channel/email/page?
8. EMAIL SENDER (outbound email only): If the agent will send or reply to emails, determine WHO it should send "From":
   - Option A: user's mailbox (Gmail via google-gmail + send_email_gmail)
   - Option B: dedicated address for this agent (Runwise-provided platform address via send_email_resend)
   Round 1 (single_choice): when the user indicates email sending but it's unclear which sender to use, ask ONE question with:
   - id exactly "email_sender_choice"
   - options EXACTLY:
     - "My Gmail (I’ll connect Google)"
     - "A dedicated address for this agent (Runwise-provided)"
   Round 2 follow-up (only if dedicated agent address was selected): ask ONE text question with:
   - id exactly "agent_resend_from_name"
   - question (no conditional wording): "What display name should recipients see for the agent's email From header? (Used as the agent name in Runwise.)"
5. PERSONA & TONE: Formal or casual? Brief or detailed?
6. FILTERING: Any conditions to ignore certain inputs?
7. AMBIGUOUS INTEGRATIONS: Does "notify me" mean email, Slack, or something else?

${previousAnswersSection}

RULES:
- Ask questions that MATERIALLY prevent wrong agent behaviour
- Keep questions simple, friendly, and non-technical
- Ask only what is truly needed — could be 1, 2, or 3 questions. No padding.
- Prefer single_choice when there are clear limited options (2–5 options)
- CRITICAL — NO CONDITIONAL QUESTIONS IN A SINGLE ROUND: Each question MUST stand on its own. NEVER write "If you chose X..." or "If Slack..." in a single questionnaire. Questions that depend on another answer must go in the NEXT round.
- Use text for freeform answers (emails, channel names, URLs)
- Never ask about API keys or credentials
- If "notify me" / "alert me" / "send me" — always ask HOW (email, Slack, etc.) before asking WHERE (address, channel) — these are separate rounds
- If timing is vague ("regularly", "often") — ask for specifics
- Max 5 questions per round in round 1; max 3 in follow-up rounds

CONFIDENCE LEVELS:
- 0.95–1.0: All details crystal clear — no questions needed
- 0.75–0.95: 1–3 details could cause wrong behaviour
- 0.5–0.75: Several important details missing
- 0.25–0.5: Vague, significant clarification needed
- 0.0–0.25: Very vague

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
Return ONLY valid JSON, no markdown, no code fences.`;

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
    content: isFollowUpRound
      ? `Based on the previous answers, are there any follow-up questions needed for this agent?\n\n"${userPrompt}"`
      : `Analyze this agent request and determine if clarification is needed:\n\n"${userPrompt}"`,
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

    // Filter out questions with conditional phrasing (safety net on top of the prompt)
    parsed.questions = parsed.questions
      .filter((q): q is ClarificationQuestion =>
        typeof q.id === 'string' &&
        typeof q.question === 'string' &&
        ['single_choice', 'multiple_choice', 'text'].includes(q.type)
      )
      .filter((q) => !hasConditionalPhrasing(q.question))
      .slice(0, isFollowUpRound ? 3 : 5); // tighter cap on follow-up rounds

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

  // Phase 6 hinting: if the questionnaire asked which email sender to use,
  // explicitly surface it so the deploy planner can set emailSendingMode reliably.
  const inferFirstAnswerText = (a?: QuestionnaireAnswer): string | null => {
    if (!a) return null;
    const t = Array.isArray(a.answer) ? a.answer.join(", ") : a.answer;
    const s = typeof t === "string" ? t : String(t ?? "");
    return s.trim() || null;
  };

  const emailSenderChoice = answers.find((a) => a.questionId === 'email_sender_choice' || /email sender/i.test(a.question));
  const emailSenderChoiceText = inferFirstAnswerText(emailSenderChoice);

  const agentFromNameAnswer = answers.find(
    (a) => a.questionId === 'agent_resend_from_name' || /From header|display name|agent address/i.test(a.question)
  );
  const agentFromNameText = inferFirstAnswerText(agentFromNameAnswer);

  const inferredEmailSendingMode =
    emailSenderChoiceText && /Gmail/i.test(emailSenderChoiceText)
      ? 'user_gmail'
      : emailSenderChoiceText && /dedicated address|Runwise-provided|agent/i.test(emailSenderChoiceText)
        ? 'agent_resend'
        : null;

  const clarifications = answers
    .map((a) => {
      const answerText = Array.isArray(a.answer) ? a.answer.join(', ') : a.answer;
      return `Q: ${a.question}\nA: ${answerText}`;
    })
    .join('\n\n');

  const phase6Hints: string[] = [];
  if (inferredEmailSendingMode) {
    phase6Hints.push(`emailSendingMode: ${inferredEmailSendingMode}`);
  }
  if (agentFromNameText) {
    phase6Hints.push(`agentResendFromName: ${agentFromNameText}`);
  }

  return `${originalPrompt}

---
USER-CONFIRMED DETAILS (from questionnaire):
${clarifications}
${phase6Hints.length ? `\n\nPHASE 6 HINTS:\n${phase6Hints.map((h) => `- ${h}`).join('\n')}` : ''}
---
Use the above details exactly. Do not infer different values for anything the user has explicitly answered.`;
}
