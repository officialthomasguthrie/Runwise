/**
 * AI Chat Helper
 * Handles chat interactions with OpenAI
 */

import OpenAI from 'openai';
import type { ChatRequest, ChatResponse } from './types';
import { detectWorkflowIntent, extractWorkflowPrompt } from './workflow-generator';

/**
 * Generate a chat response from the AI
 */
export async function generateChatResponse(
  request: ChatRequest
): Promise<ChatResponse> {
  try {
    console.log('generateChatResponse called with message:', request.message);
    
    // Initialize OpenAI client (only runs server-side in API routes)
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    console.log('OpenAI client initialized');
    
    // Build conversation history
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      {
        role: 'system',
        content: `You are Runwise AI, an intelligent assistant for an AI-powered workflow automation platform. 

Your capabilities:
- Help users understand how to create workflows
- Answer questions about workflow automation
- Guide users through the workflow builder
- Detect when users want to create workflows from natural language
- Help users fill out form fields in workflow nodes by providing instructions, examples, and guidance
- Configure nodes automatically when users provide configuration values (e.g., API keys, times, prompts)

When a user asks for help with a form field (e.g., "Help me with the [field name]" or "Help me fill out the [field name]"), you should:
1. Identify what type of field they're asking about (API key, prompt, mapping, configuration option, etc.), using the field name, node type, and workflow name for context.
2. Provide clear, specific, step-by-step instructions on how to fill it out.
3. If it's an API key or credential field, explain exactly how to obtain the key/token from the service provider, including which page to visit and what to click.
4. If it's a prompt / instructions field, provide multiple example prompts tailored to the node type and workflow context, and explain why each is useful.
5. If it's any other configuration field, explain what values are expected, what good values look like vs. bad ones, and give concrete examples.
6. If you need clarification (the field name is ambiguous), briefly ask 1–2 clarifying questions before giving final recommendations.
7. Always focus on being concise, actionable, and directly helping them complete the field correctly.

When a user wants to create a workflow, you MUST respond with a confirmation message that includes:
1. A clear acknowledgment of what workflow they want to create
2. A detailed plan that describes:
   - What trigger will start the workflow (e.g., "A scheduled trigger that runs daily at 9 AM")
   - What actions will be performed (e.g., "An email action that sends a daily report")
   - How the workflow will work step-by-step
3. End with: "Click the 'Generate Workflow' button below to create it, or let me know if you'd like any changes."

IMPORTANT RULES FOR WORKFLOW CONFIRMATION MESSAGES:
- Do NOT use phrases like "the user" or "you will" - write directly and naturally
- Describe the workflow as if it already exists: "This workflow will..." or "The workflow includes..."
- Be specific about triggers, actions, and the flow between them
- Keep the tone conversational but informative
- Do NOT automatically generate the workflow - always wait for the button click

Example of a good confirmation message:
"I'll create a workflow that sends a daily email report. Here's the plan:

**Trigger:** A scheduled trigger that runs every day at 9 AM
**Action:** An email action that sends a formatted report to your specified email address
**How it works:** The workflow will automatically run each morning, generate the report, and send it via email

Click the 'Generate Workflow' button below to create it, or let me know if you'd like any changes."

When a user wants to configure a node or fill out a field (e.g., "Set the OpenAI API key to sk-12345", "Fill out the email field with test@example.com", "Make the trigger run every day at 9 AM"), you should:
1. Acknowledge what you're configuring
2. Extract the values from their message
3. If values are provided, confirm that you're configuring it using phrases like:
   - "I'll set the API key to sk-12345"
   - "Configuring the email field with test@example.com"
   - "Setting the trigger to run daily at 9 AM"
   - "Updating the field with your value"
   - "Filling out the [field name] with [value]"
4. If values are missing, ask the user to provide them with clear instructions on how to get them (e.g., for API keys, explain where to find them)
5. IMPORTANT: When you use phrases like "I'll configure", "Setting", "Updating", or "Filling out", the system will automatically apply the configuration. Make sure to clearly indicate when you're actually configuring vs. just providing instructions.

For regular conversation (not workflow creation), respond naturally and helpfully.

CRITICAL: Never use emojis in your responses. Use only plain text. Never refer to "the user" in your responses - write directly to the person you're talking to.`,
      },
    ];

    // Add conversation history if provided
    if (request.conversationHistory && request.conversationHistory.length > 0) {
      const historyMessages = request.conversationHistory
        .slice(-10) // Only keep last 10 messages for context
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      messages.push(...historyMessages);
    }

    // Add context if provided
    const contextParts: string[] = [];
    if (request.context?.workflowName) {
      contextParts.push(`working on a workflow named "${request.context.workflowName}"`);
    }
    if (request.context?.fieldName) {
      contextParts.push(`asking about the "${request.context.fieldName}" field`);
    }
    if (request.context?.nodeType) {
      contextParts.push(`in a "${request.context.nodeType}" node`);
    }
    if (contextParts.length > 0) {
      messages.push({
        role: 'system',
        content: `Context: The user is ${contextParts.join(', ')}.`,
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: request.message,
    });

    console.log('Calling OpenAI API with', messages.length, 'messages');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7, // Slightly higher for more natural conversation
      max_tokens: 1000,
    });

    console.log('OpenAI API response received');
    const aiResponse = completion.choices[0]?.message?.content || '';
    
    // Capture token usage for credit calculation
    const tokenUsage = {
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
    };
    console.log('AI response content length:', aiResponse.length);
    
    // Strict workflow intent detection: Only trigger when:
    // 1. User explicitly requests workflow creation
    // 2. AI response contains confirmation message format (mentions trigger, action, plan, or "generate workflow" button)
    const userHasWorkflowIntent = detectWorkflowIntent(request.message);
    const aiResponseLower = aiResponse.toLowerCase();
    
    // Check if AI response is a confirmation message proposing a workflow
    // Must contain confirmation indicators: mentions of trigger/action/plan OR explicit "generate workflow" button text
    const hasConfirmationFormat = 
      (aiResponseLower.includes('trigger') && (aiResponseLower.includes('action') || aiResponseLower.includes('workflow'))) ||
      (aiResponseLower.includes('plan') && (aiResponseLower.includes('workflow') || aiResponseLower.includes('trigger'))) ||
      (aiResponseLower.includes('generate workflow') && aiResponseLower.includes('button')) ||
      (aiResponseLower.includes('click') && aiResponseLower.includes('generate workflow'));
    
    // Only set shouldGenerateWorkflow if BOTH user requested workflow AND AI provided confirmation
    const shouldGenerateWorkflow = userHasWorkflowIntent && hasConfirmationFormat;
    const workflowPrompt = shouldGenerateWorkflow
      ? (extractWorkflowPrompt(request.message) || request.message)
      : undefined;

    // Generate suggestions for follow-up
    const suggestions = generateSuggestions(aiResponse, shouldGenerateWorkflow);

    return {
      message: aiResponse,
      suggestions,
      shouldGenerateWorkflow,
      workflowPrompt,
    };
  } catch (error: any) {
    console.error('Error generating chat response:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      status: error.status,
      code: error.code,
    });
    
    // More specific error messages
    let errorMessage = "I'm sorry, I encountered an error.";
    
    if (error.code === 'invalid_api_key' || error.status === 401) {
      errorMessage = "Invalid OpenAI API key. Please check your .env.local file.";
    } else if (error.code === 'insufficient_quota') {
      errorMessage = "OpenAI API quota exceeded. Please check your OpenAI account.";
    } else if (error.message?.includes('OPENAI_API_KEY')) {
      errorMessage = "OpenAI API key is not configured. Please add it to .env.local file.";
    }
    
    return {
      message: `${errorMessage} Error: ${error.message}`,
      suggestions: ['Try again', 'Check API key', 'Get help'],
      shouldGenerateWorkflow: false,
    };
  }
}

/**
 * Generate a streaming chat response from the AI
 */
export async function generateStreamingChatResponse(
  request: ChatRequest & {
    onChunk: (chunk: string, isComplete: boolean, metadata?: any) => void;
    onComplete: (fullMessage: string, metadata?: any) => void;
    onError: (error: Error) => void;
  }
): Promise<void> {
  try {
    console.log('generateStreamingChatResponse called with message:', request.message);
    
    // Initialize OpenAI client (only runs server-side in API routes)
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    console.log('OpenAI client initialized');
    
    // Build conversation history (same as non-streaming version)
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      {
        role: 'system',
        content: `You are Runwise AI, an intelligent assistant for an AI-powered workflow automation platform. 

Your capabilities:
- Help users understand how to create workflows
- Answer questions about workflow automation
- Guide users through the workflow builder
- Detect when users want to create workflows from natural language
- Help users fill out form fields in workflow nodes by providing instructions, examples, and guidance
- Configure nodes automatically when users provide configuration values (e.g., API keys, times, prompts)

When a user asks for help with a form field (e.g., "Help me with the [field name]" or "Help me fill out the [field name]"), you should:
1. Identify what type of field they're asking about (API key, prompt, mapping, configuration option, etc.), using the field name, node type, and workflow name for context.
2. Provide clear, specific, step-by-step instructions on how to fill it out.
3. If it's an API key or credential field, explain exactly how to obtain the key/token from the service provider, including which page to visit and what to click.
4. If it's a prompt / instructions field, provide multiple example prompts tailored to the node type and workflow context, and explain why each is useful.
5. If it's any other configuration field, explain what values are expected, what good values look like vs. bad ones, and give concrete examples.
6. If you need clarification (the field name is ambiguous), briefly ask 1–2 clarifying questions before giving final recommendations.
7. Always focus on being concise, actionable, and directly helping them complete the field correctly.

When a user wants to create a workflow, you MUST respond with a confirmation message that includes:
1. A clear acknowledgment of what workflow they want to create
2. A detailed plan that describes:
   - What trigger will start the workflow (e.g., "A scheduled trigger that runs daily at 9 AM")
   - What actions will be performed (e.g., "An email action that sends a daily report")
   - How the workflow will work step-by-step
3. End with: "Click the 'Generate Workflow' button below to create it, or let me know if you'd like any changes."

IMPORTANT RULES FOR WORKFLOW CONFIRMATION MESSAGES:
- Do NOT use phrases like "the user" or "you will" - write directly and naturally
- Describe the workflow as if it already exists: "This workflow will..." or "The workflow includes..."
- Be specific about triggers, actions, and the flow between them
- Keep the tone conversational but informative
- Do NOT automatically generate the workflow - always wait for the button click

Example of a good confirmation message:
"I'll create a workflow that sends a daily email report. Here's the plan:

**Trigger:** A scheduled trigger that runs every day at 9 AM
**Action:** An email action that sends a formatted report to your specified email address
**How it works:** The workflow will automatically run each morning, generate the report, and send it via email

Click the 'Generate Workflow' button below to create it, or let me know if you'd like any changes."

When a user wants to configure a node or fill out a field (e.g., "Set the OpenAI API key to sk-12345", "Fill out the email field with test@example.com", "Make the trigger run every day at 9 AM"), you should:
1. Acknowledge what you're configuring
2. Extract the values from their message
3. If values are provided, confirm that you're configuring it using phrases like:
   - "I'll set the API key to sk-12345"
   - "Configuring the email field with test@example.com"
   - "Setting the trigger to run daily at 9 AM"
   - "Updating the field with your value"
   - "Filling out the [field name] with [value]"
4. If values are missing, ask the user to provide them with clear instructions on how to get them (e.g., for API keys, explain where to find them)
5. IMPORTANT: When you use phrases like "I'll configure", "Setting", "Updating", or "Filling out", the system will automatically apply the configuration. Make sure to clearly indicate when you're actually configuring vs. just providing instructions.

For regular conversation (not workflow creation), respond naturally and helpfully.

CRITICAL: Never use emojis in your responses. Use only plain text. Never refer to "the user" in your responses - write directly to the person you're talking to.`,
      },
    ];

    // Add conversation history if provided
    if (request.conversationHistory && request.conversationHistory.length > 0) {
      const historyMessages = request.conversationHistory
        .slice(-10) // Only keep last 10 messages for context
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      messages.push(...historyMessages);
    }

    // Add context if provided
    const contextParts: string[] = [];
    if (request.context?.workflowName) {
      contextParts.push(`working on a workflow named "${request.context.workflowName}"`);
    }
    if (request.context?.fieldName) {
      contextParts.push(`asking about the "${request.context.fieldName}" field`);
    }
    if (request.context?.nodeType) {
      contextParts.push(`in a "${request.context.nodeType}" node`);
    }
    if (contextParts.length > 0) {
      messages.push({
        role: 'system',
        content: `Context: The user is ${contextParts.join(', ')}.`,
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: request.message,
    });

    console.log('Calling OpenAI API with streaming with', messages.length, 'messages');
    
    let fullMessage = '';
    let inputTokens = 0;
    let outputTokens = 0;
    
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullMessage += content;
        request.onChunk(content, false);
      }
      
      // Capture token usage if available in chunk
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens || 0;
        outputTokens = chunk.usage.completion_tokens || 0;
      }
    }
    
    // If we didn't get usage from chunks, estimate from content
    if (inputTokens === 0 || outputTokens === 0) {
      // Rough estimate: ~4 characters per token
      const messagesText = messages.map(m => m.content).join(' ');
      inputTokens = Math.ceil(messagesText.length / 4);
      outputTokens = Math.ceil(fullMessage.length / 4);
    }
    
    const tokenUsage = {
      inputTokens,
      outputTokens,
    };

    console.log('Streaming complete, full message length:', fullMessage.length);
    
    // Strict workflow intent detection: Only trigger when:
    // 1. User explicitly requests workflow creation
    // 2. AI response contains confirmation message format (mentions trigger, action, plan, or "generate workflow" button)
    const userHasWorkflowIntent = detectWorkflowIntent(request.message);
    const aiResponseLower = fullMessage.toLowerCase();
    
    // Check if AI response is a confirmation message proposing a workflow
    // Must contain confirmation indicators: mentions of trigger/action/plan OR explicit "generate workflow" button text
    const hasConfirmationFormat = 
      (aiResponseLower.includes('trigger') && (aiResponseLower.includes('action') || aiResponseLower.includes('workflow'))) ||
      (aiResponseLower.includes('plan') && (aiResponseLower.includes('workflow') || aiResponseLower.includes('trigger'))) ||
      (aiResponseLower.includes('generate workflow') && aiResponseLower.includes('button')) ||
      (aiResponseLower.includes('click') && aiResponseLower.includes('generate workflow'));
    
    // Only set shouldGenerateWorkflow if BOTH user requested workflow AND AI provided confirmation
    const shouldGenerateWorkflow = userHasWorkflowIntent && hasConfirmationFormat;
    const workflowPrompt = shouldGenerateWorkflow
      ? (extractWorkflowPrompt(request.message) || request.message)
      : undefined;

    console.log('🔍 Workflow intent analysis:', {
      userMessage: request.message.substring(0, 50),
      userHasWorkflowIntent,
      hasConfirmationFormat,
      shouldGenerateWorkflow,
      workflowPrompt: workflowPrompt?.substring(0, 50),
      aiResponsePreview: fullMessage.substring(0, 100)
    });

    // Call onComplete with metadata including token usage
    request.onComplete(fullMessage, {
      shouldGenerateWorkflow,
      workflowPrompt,
      suggestions: generateSuggestions(fullMessage, shouldGenerateWorkflow),
      tokenUsage,
    });
  } catch (error: any) {
    console.error('Error generating streaming chat response:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      status: error.status,
      code: error.code,
    });
    
    // More specific error messages
    let errorMessage = "I'm sorry, I encountered an error.";
    
    if (error.code === 'invalid_api_key' || error.status === 401) {
      errorMessage = "Invalid OpenAI API key. Please check your .env.local file.";
    } else if (error.code === 'insufficient_quota') {
      errorMessage = "OpenAI API quota exceeded. Please check your OpenAI account.";
    } else if (error.message?.includes('OPENAI_API_KEY')) {
      errorMessage = "OpenAI API key is not configured. Please add it to .env.local file.";
    }
    
    request.onError(new Error(`${errorMessage} Error: ${error.message}`));
  }
}

/**
 * Generate suggested follow-up questions
 */
function generateSuggestions(
  response: string,
  isWorkflowRelated: boolean
): string[] {
  if (isWorkflowRelated) {
    return [
      'Generate this workflow',
      'Modify the workflow',
      'Explain how it works',
    ];
  }

  // Generic suggestions based on context
  return [
    'Create a new workflow',
    'Show me examples',
    'How do I connect nodes?',
  ];
}

