/**
 * Clarification Analysis
 * Analyzes agent prompts to determine if additional information is needed
 * before building the agent. Supports multi-round questionnaires so that
 * conditional follow-up questions (e.g. "which Slack channel?" after the user
 * says "Slack") are asked in a later round instead of crammed into one form.
 */

import OpenAI from 'openai';
import type { OpenAIUsageSink } from '@/lib/ai/openai-usage';
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
  previousAnswers?: QuestionnaireAnswer[],
  usageSink?: OpenAIUsageSink
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
Examples for this round:
  - If Slack is a trigger source but round 1 never asked which channel to WATCH → ask that now (monitor/source channel).
  - If the user already said outputs are only Slack and/or Google Sheets (or "you decide" between those) → do NOT ask "email, Slack, or another method" or suggest Gmail.
If nothing further is needed, set needsClarification to false.
`.trim()
    : `
This is ROUND 1. Ask only what is missing—no redundant or broader questions.

OUTPUT / NOTIFICATIONS — RESPECT WHAT THE USER ALREADY SAID:
• If they already constrained where results go (e.g. "notify in Slack OR log to Google Sheets", "Slack or Sheet—you decide", "only Slack") do NOT ask a generic "How should we notify you—email, Slack, or something else?" and do NOT offer email/Gmail/Discord/etc. unless they mentioned those.
• If they said the agent or you should pick defaults / choose what's best / they're in a hurry → treat the choice between their stated options as a planner decision. Ask only for facts the system cannot infer (channel names, sheet IDs, filters)—not "pick Slack vs email" when they already ruled email out.

EXECUTION / "HOW WILL I HEAR ABOUT RUNS?" — DO NOT DEFAULT TO ASKING:
• Runwise shows agent activity in the in-app AI agent chat. Do NOT ask "how should you be notified when the agent runs?" (Gmail, Slack, etc.) as a generic checklist question.
• ONLY ask about outbound notification to another platform when the user clearly wants it (e.g. notify me, alert me, email me, DM me, send to #channel, ping me) OR the described workflow inherently requires delivering something to them externally (e.g. "post a summary to #sales", "email the customer").
• If they never mention being notified or receiving alerts, and results can live inside the agent’s normal work (e.g. updates records, sends replies as part of the task) without a separate "tell the owner" step → skip notification-channel questions entirely.

SLACK — SOURCE vs DESTINATION (both can be required):
• SOURCE (trigger): which channel the agent watches for new messages (new-message-in-slack). If they use Slack as an input/source and did not name the channel, you MUST ask which channel to monitor—this is separate from where to post updates.
• DESTINATION (action): which channel to post alerts/summaries. If they might post somewhere other than the source channel, ask for the destination channel (or ask both in round 1 as two plain questions: one for "watch", one for "post to").
• Never only ask the destination channel when the trigger is Slack and the source channel is still unknown.

CONDITIONAL DEFERRAL: If a question depends on another answer ("if you chose Slack…"), put it in round 2. But do not defer the monitor-channel question when Slack is clearly the trigger source—ask it as soon as the question stands alone.
`.trim();

  const systemPrompt = `You are an expert agent requirements analyst for Runwise, an AI agent platform. Your job is to analyze a user's agent request and determine if you need more information before building it.

AVAILABLE AGENT CAPABILITIES:
- Triggers: Gmail (new email), Slack (new message), Discord, Google Sheets (new row), GitHub (new issue), Google Drive (file upload), Google Forms (submission), Google Calendar (new event), Notion, Airtable, Trello
- Actions: send email/Gmail, send email via this agent's dedicated platform address (Resend), post to Slack/Discord, create Notion pages, update Airtable/Trello/Sheets, create calendar events, web search, read URLs, send SMS (Twilio), post tweets
- Scheduling: Cron-based (daily, hourly, etc.) — no integration required
- Webhook: HTTP POST endpoint — no integration required
- Memory: remember and recall facts across runs

BEFORE YOU CAN BUILD AN AGENT, THESE FOUR THINGS MUST BE KNOWN (stated OR inferable):
1. OBJECTIVE — What is the agent's purpose / what problem does it solve?
2. INTEGRATIONS — What third-party tools / services / capabilities does it need?
3. TRIGGER — What should cause the agent to run? (event, schedule, webhook, manual, etc.)
4. WORKFLOW — What steps should the agent perform end-to-end?

CRITICAL INFERENCE RULE — READ CAREFULLY:
• For EACH of the four items above, FIRST attempt to infer it from the user's prompt.
• A user who says "When I get a new email from *@acme.com, summarize it and post to #sales in Slack" has ALREADY told you: objective (summarize + notify), integrations (Gmail, Slack), trigger (new email), and workflow (read email → summarize → post to Slack). Do NOT ask them to restate any of that.
• Only ask a clarifying question when the information is genuinely ambiguous or missing — NOT just because the user didn't use a specific keyword like "objective" or "outcome".
• "Objective" and "outcome" are the same concept. NEVER ask about both.
• If you can reasonably infer something, TREAT IT AS KNOWN. Do not ask for confirmation of things the prompt already implies.

ADDITIONAL DETAIL CHECKLIST (ask ONLY when relevant AND unclear):
- TIMING: If scheduled, how often? What time? Timezone?
- OUTPUT DESTINATION: Where does the agent send or write outputs that the user explicitly asked for? Do not add a separate "how should we notify you about executions?" unless they want external notifications or the workflow requires it (see EXECUTION rule above). If the user already listed only certain outputs (e.g. Slack OR Google Sheet) and/or asked the agent to choose between them, do not ask again with unrelated options (e.g. email).
- MULTI-SOURCE TRIGGERS: If the agent watches more than one place (e.g. Gmail + Slack), confirm each source that needs a concrete resource (Slack channel to watch, Gmail labels/filters if needed)—do not collect only the output side.
- EMAIL SENDER (outbound email only): If the agent will send or reply to emails, determine WHO it should send "From":
  - Option A: user's mailbox (Gmail via google-gmail + send_email_gmail)
  - Option B: dedicated address for this agent (Runwise-provided platform address via send_email_resend)
  Round 1 (single_choice): when the user indicates email sending but it's unclear which sender to use, ask ONE question with:
  - id exactly "email_sender_choice"
  - options EXACTLY:
    - "My Gmail (I'll connect Google)"
    - "A dedicated address for this agent (Runwise-provided)"
  Round 2 follow-up (only if dedicated agent address was selected): ask ONE text question with:
  - id exactly "agent_resend_from_name"
  - question (no conditional wording): "What display name should recipients see for the agent's email From header? (Used as the agent name in Runwise.)"
- PERSONA & TONE: Only if tone matters for the workflow (e.g. customer-facing emails)
- FILTERING: Any conditions to ignore certain inputs?
- AMBIGUOUS INTEGRATIONS: Only when the user did not already specify delivery channels/tools. If they already said Slack and/or Sheets (or a closed list), do not re-open the question to email or other tools.

${previousAnswersSection}

QUESTION QUALITY RULES:
- NEVER use canned / boilerplate / template question text. Write every question freshly in your own words, specific to this particular agent request.
- NEVER ask a question whose answer is already stated or clearly implied in the user's prompt.
- NEVER ask two questions that confirm the same thing (e.g. "objective" AND "outcome/result" — these are the same concept).
- Ask ONLY questions that MATERIALLY prevent wrong agent behaviour. If a detail is nice-to-have but the agent can still work sensibly with a reasonable default, skip the question.
- As a guideline, total clarifications across all rounds are usually 2–8, but zero is correct when the prompt already covers everything.
- Prefer single_choice when there are clear limited options (2–5 options).
- CRITICAL — NO CONDITIONAL QUESTIONS IN A SINGLE ROUND: Each question MUST stand on its own. NEVER write "If you chose X..." or "If Slack..." in a single questionnaire. Questions that depend on another answer must go in the NEXT round.
- Use text for freeform answers (emails, channel names, URLs).
- Never ask about API keys or credentials.
- User-facing notifications: If the user did NOT ask to be notified / alerted / messaged about runs, do not ask how they want those notifications delivered. If they DID ask to be reached but didn’t name a channel—then you may ask HOW/WHERE in line with their intent (still no unrelated options). If they already named specific tools/channels (or a closed set like "Slack or Sheet only"), skip broad HOW questions; ask only missing WHERE details (e.g. channel name, spreadsheet).
- If timing is vague ("regularly", "often") — ask for specifics.

CONFIDENCE LEVELS:
- 0.95–1.0: All four essentials (objective, integrations, trigger, workflow) are known or inferable — no questions needed
- 0.75–0.95: Essentials are covered but 1–3 operational details could cause wrong behaviour
- 0.5–0.75: Several important details missing
- 0.25–0.5: Vague, significant clarification needed
- 0.0–0.25: Very vague, almost no actionable detail

OUTPUT FORMAT (JSON only, no markdown):
{
  "needsClarification": boolean,
  "confidence": number,
  "summary": "One sentence acknowledging what you understood",
  "questions": [
    {
      "id": "q1",
      "question": "Friendly, simple question text written in your own words",
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

    usageSink?.addFromChatCompletion(completion);

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
      .filter((q) => !hasConditionalPhrasing(q.question));

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
      : emailSenderChoiceText &&
          /dedicated address|Runwise-provided|Runwise|Resend|platform|platform-agent-email|agent email|agent address/i.test(
            emailSenderChoiceText
          )
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
