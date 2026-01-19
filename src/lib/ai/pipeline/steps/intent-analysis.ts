/**
 * Intent Analysis Step
 * Step 1 of the workflow generation pipeline
 * Analyzes user prompt to extract workflow requirements and intent
 */

import OpenAI from 'openai';
import type { PipelineContext, IntentAnalysis, StepResult } from '../types';

/**
 * Analyzes user prompt to extract workflow automation intent and requirements
 * Uses gpt-4o-mini for cost-effective intent parsing
 */
export async function analyzeIntent(
  context: PipelineContext
): Promise<StepResult<IntentAnalysis>> {
  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build context about existing workflow if this is a modification
    let existingContextStr = '';
    if (context.existingNodes && context.existingNodes.length > 0) {
      existingContextStr = `

EXISTING WORKFLOW CONTEXT:
The user has an existing workflow with ${context.existingNodes.length} node(s).
This appears to be a modification request rather than creating a new workflow from scratch.
Current nodes: ${context.existingNodes.map((n) => n.id).join(', ')}
`;
    }

    // System prompt focused solely on intent analysis
    const systemPrompt = `You are a workflow intent analyzer. Your task is to analyze user prompts and extract workflow automation requirements.

YOUR JOB:
1. Understand what the user wants to automate
2. Identify what will trigger the workflow
3. Identify what actions should be performed
4. Identify any data transformations needed
5. Identify any custom functionality not covered by standard library nodes
6. Determine if this is modifying an existing workflow or creating a new one

OUTPUT STRUCTURE:
Return a JSON object with these exact fields:
- goal: string - A brief, clear description of what the workflow should accomplish (1-2 sentences)
- triggers: string[] - Array of trigger types needed (e.g., ["scheduled", "email"], ["webhook"], ["new-row-in-sheet"])
- actions: string[] - Array of action types needed (e.g., ["send-email"], ["update-sheet", "notify-slack"])
- transforms: string[] - Array of transformations needed (e.g., ["format-data"], ["filter-rows"], ["summarize-text"]). Empty array if none needed.
- customRequirements: string[] - Array of custom functionality descriptions that can't be met by standard library nodes (e.g., ["Fetch Bitcoin price from CoinGecko API"]). Empty array if all can use library nodes.
- isModification: boolean - true if user wants to modify existing workflow, false if creating new
- existingContext: object (optional) - Only include if isModification is true. Structure: { nodes: [], edges: [] }

RULES:
- Be specific about triggers and actions (use concrete examples, not vague terms)
- If a service/API is mentioned but standard library nodes don't cover it, add it to customRequirements
- If isModification is true, set existingContext based on the existing workflow provided
- transforms should only include actual data transformations, not simple data passing
- goal should be concise and action-oriented (e.g., "Send email notification when new row added to Google Sheet")
- triggers and actions should use specific identifiers when possible (e.g., "new-row-in-google-sheet" not just "sheet trigger")

EXAMPLES:

Example 1:
User: "Create a workflow that sends me an email when a new row is added to my Google Sheet"
Output:
{
  "goal": "Send email notification when new row is added to Google Sheet",
  "triggers": ["new-row-in-google-sheet"],
  "actions": ["send-email"],
  "transforms": [],
  "customRequirements": [],
  "isModification": false
}

Example 2:
User: "I want to fetch Bitcoin price from CoinGecko and send it to me via Slack"
Output:
{
  "goal": "Fetch Bitcoin price from CoinGecko API and send notification via Slack",
  "triggers": ["scheduled"],
  "actions": ["send-slack-message"],
  "transforms": [],
  "customRequirements": ["Fetch Bitcoin price from CoinGecko API"],
  "isModification": false
}

Example 3:
User: "Add a Slack notification to my existing workflow"
Output (if existingContext provided):
{
  "goal": "Add Slack notification to existing workflow",
  "triggers": [],
  "actions": ["send-slack-message"],
  "transforms": [],
  "customRequirements": [],
  "isModification": true,
  "existingContext": { "nodes": [...], "edges": [...] }
}

Return ONLY valid JSON, no markdown, no explanations outside JSON.`;

    // Build user message with prompt and context
    const userMessage = context.userPrompt + existingContextStr;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.3, // Lower temperature for more deterministic output
      max_tokens: 1000, // Should be plenty for intent analysis
    });

    // Extract response and token usage
    const responseContent = completion.choices[0]?.message?.content;
    const tokenUsage = {
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
    };

    if (!responseContent) {
      return {
        success: false,
        error: 'No response from OpenAI',
        tokenUsage,
      };
    }

    // Parse JSON response
    let intentAnalysis: IntentAnalysis;
    try {
      intentAnalysis = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Error parsing intent analysis response:', parseError);
      console.error('Response content:', responseContent);
      return {
        success: false,
        error: `Invalid JSON response from AI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        tokenUsage,
      };
    }

    // Validate required fields
    if (!intentAnalysis.goal || !Array.isArray(intentAnalysis.triggers) || !Array.isArray(intentAnalysis.actions)) {
      return {
        success: false,
        error: 'Invalid intent analysis structure: missing required fields (goal, triggers, actions)',
        tokenUsage,
      };
    }

    // Ensure arrays exist (some might be missing if empty)
    intentAnalysis.transforms = intentAnalysis.transforms || [];
    intentAnalysis.customRequirements = intentAnalysis.customRequirements || [];
    intentAnalysis.isModification = intentAnalysis.isModification || false;

    // Return successful result
    return {
      success: true,
      data: intentAnalysis,
      tokenUsage,
    };
  } catch (error: any) {
    console.error('Error in intent analysis step:', error);
    return {
      success: false,
      error: error.message || 'Failed to analyze intent',
    };
  }
}

