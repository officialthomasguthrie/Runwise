/**
 * Clarification Analysis
 * Analyzes user prompts to determine if additional information is needed
 * before generating a workflow. Generates structured questionnaires when needed.
 */

import OpenAI from 'openai';
import type { ClarificationAnalysis, ClarificationQuestion, QuestionnaireAnswer } from './types';

/**
 * Analyze a workflow prompt and determine if clarification questions are needed.
 * Returns structured questions or signals that generation can proceed immediately.
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

  const systemPrompt = `You are a workflow requirements analyst for Runwise, an AI workflow automation platform. Your job is to analyze a user's workflow request and determine if you need more information before building it.

AVAILABLE INTEGRATIONS/TOOLS:
- Email (SendGrid): Send emails
- Slack: Post messages to channels
- Google Sheets: Read/write rows
- Google Calendar: Create events
- Google Drive: Upload files
- Google Forms: Trigger on submissions
- Gmail: Trigger on new emails
- Notion: Create pages
- Discord: Send messages via webhooks
- Trello: Create cards
- Airtable: Update records
- Twilio: Send SMS
- GitHub: Trigger on issues
- Webhooks: Generic webhook triggers
- Scheduled triggers: Cron-based scheduling
- AI/OpenAI: Generate summaries, process text
- Data transforms: Format text, parse JSON, filter data, merge objects, convert CSV

ANALYSIS CHECKLIST:
1. Is the trigger clear? (What starts the workflow: schedule, webhook, event, etc.)
2. Are the main actions clear? (What the workflow does)
3. Is timing/scheduling specified? (If it's a scheduled workflow)
4. Are the target recipients or destinations clear? (Email addresses, Slack channels, etc.)
5. Is the content/data clear enough to build? (What gets sent, transformed, or processed)
6. Are there ambiguous integrations? (Does "notify me" mean email, Slack, SMS?)

RULES:
- Only ask questions that MATERIALLY change how the workflow is built (node selection, configuration, connections)
- Keep questions simple, friendly, and non-technical -- a non-technical person should easily understand them
- Maximum 4 questions (fewer is better)
- If the user's prompt is specific enough to build a correct workflow, set needsClarification to false
- Prefer single_choice questions when there are clear limited options (2-6 options)
- Use multiple_choice only when the user might want to select several items
- Use text input ONLY for truly freeform answers (email addresses, custom messages, specific URLs)
- Never ask about API keys, credentials, or technical configuration -- those are handled separately
- Never ask about things the user can easily change later in the workflow editor
- Focus on the BIG decisions: which tools to use, what triggers the workflow, what the output looks like
- If the user says something vague like "notify me" or "send me updates", ask HOW they want to be notified
- If timing is mentioned but vague (e.g., "regularly"), ask for specifics

CONFIDENCE LEVELS:
- 0.9-1.0: All details are crystal clear, no questions needed (e.g., "Send an email to john@example.com every day at 9 AM with the subject 'Daily Report' containing sales data from my Google Sheet")
- 0.6-0.8: Most details are clear but 1-2 things could use clarification
- 0.3-0.5: Several important details are missing
- 0.0-0.2: Very vague request, needs significant clarification

OUTPUT FORMAT (JSON only, no markdown):
{
  "needsClarification": boolean,
  "confidence": number,
  "summary": "One sentence acknowledging what you understood from the request",
  "questions": [
    {
      "id": "q1",
      "question": "Friendly, simple question text",
      "type": "single_choice" | "multiple_choice" | "text",
      "options": ["Option A", "Option B", "Option C"],
      "placeholder": "e.g. john@example.com"
    }
  ]
}

If needsClarification is false, questions should be an empty array.
Return ONLY valid JSON, no markdown, no code fences, no explanations outside JSON.`;

  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add relevant conversation history for context
  if (conversationHistory && conversationHistory.length > 0) {
    const relevantHistory = conversationHistory.slice(-6).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
    messages.push(...relevantHistory);
  }

  messages.push({
    role: 'user',
    content: `Analyze this workflow request and determine if clarification is needed:\n\n"${userPrompt}"`,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseContent) as ClarificationAnalysis;

    // Validate the response structure
    if (typeof parsed.needsClarification !== 'boolean') {
      parsed.needsClarification = true;
    }
    if (typeof parsed.confidence !== 'number') {
      parsed.confidence = 0.5;
    }
    if (!parsed.summary) {
      parsed.summary = 'I understand you want to create a workflow.';
    }
    if (!Array.isArray(parsed.questions)) {
      parsed.questions = [];
    }

    // Validate each question
    parsed.questions = parsed.questions
      .filter((q): q is ClarificationQuestion =>
        typeof q.id === 'string' &&
        typeof q.question === 'string' &&
        ['single_choice', 'multiple_choice', 'text'].includes(q.type)
      )
      .slice(0, 4); // Cap at 4 questions

    // If confidence is very high, force no clarification
    if (parsed.confidence >= 0.9) {
      parsed.needsClarification = false;
      parsed.questions = [];
    }

    // If no questions were generated but needsClarification is true, flip it
    if (parsed.needsClarification && parsed.questions.length === 0) {
      parsed.needsClarification = false;
    }

    return parsed;
  } catch (error: any) {
    console.error('Error analyzing clarification needs:', error);
    // On error, skip clarification and proceed with generation
    return {
      needsClarification: false,
      confidence: 0.5,
      summary: 'I understand your workflow request.',
      questions: [],
    };
  }
}

/**
 * Build an enriched prompt by merging the original prompt with questionnaire answers.
 * This enriched prompt is then fed into the workflow generation pipeline.
 */
export function buildEnrichedPrompt(
  originalPrompt: string,
  answers: QuestionnaireAnswer[]
): string {
  if (answers.length === 0) return originalPrompt;

  const clarifications = answers
    .map((a) => {
      const answerText = Array.isArray(a.answer) ? a.answer.join(', ') : a.answer;
      return `- ${a.question} --> ${answerText}`;
    })
    .join('\n');

  return `${originalPrompt}\n\nAdditional details provided by the user:\n${clarifications}`;
}

