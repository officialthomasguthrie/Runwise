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

When a user asks for help filling out a form field (e.g., "Help me fill out the [field name]"), you should:
1. Identify what type of field they're asking about
2. Provide clear, specific instructions on how to fill it out
3. If it's an API key field, explain how to obtain the API key from the service provider
4. If it's a prompt field, provide example prompts based on the node type and workflow context
5. If it's a configuration field, explain what values are expected and provide examples
6. Be concise and actionable - focus on helping them complete the field correctly

When a user wants to create a workflow, you should:
1. Acknowledge their request
2. Summarize what workflow they want
3. Ask: "Does this look correct? Click 'Generate Workflow' to create it, or let me know if you'd like any tweaks."

IMPORTANT: Do NOT automatically generate the workflow. Always wait for the user to click the "Generate Workflow" button. Your response should end with something like: "Click the 'Generate Workflow' button below to create it, or let me know if you'd like any changes."

Be helpful, concise, and professional. If a user asks about creating a workflow, encourage them to describe it in detail so you can generate it accurately.

CRITICAL: Never use emojis in your responses. Use only plain text.`,
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
    console.log('AI response content length:', aiResponse.length);
    const shouldGenerateWorkflow = detectWorkflowIntent(request.message);
    const workflowPrompt = shouldGenerateWorkflow
      ? extractWorkflowPrompt(request.message)
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

When a user asks for help filling out a form field (e.g., "Help me fill out the [field name]"), you should:
1. Identify what type of field they're asking about
2. Provide clear, specific instructions on how to fill it out
3. If it's an API key field, explain how to obtain the API key from the service provider
4. If it's a prompt field, provide example prompts based on the node type and workflow context
5. If it's a configuration field, explain what values are expected and provide examples
6. Be concise and actionable - focus on helping them complete the field correctly

When a user wants to create a workflow, you should:
1. Acknowledge their request
2. Summarize what workflow they want
3. Ask: "Does this look correct? Click 'Generate Workflow' to create it, or let me know if you'd like any tweaks."

IMPORTANT: Do NOT automatically generate the workflow. Always wait for the user to click the "Generate Workflow" button. Your response should end with something like: "Click the 'Generate Workflow' button below to create it, or let me know if you'd like any changes."

Be helpful, concise, and professional. If a user asks about creating a workflow, encourage them to describe it in detail so you can generate it accurately.

CRITICAL: Never use emojis in your responses. Use only plain text.`,
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
    }

    console.log('Streaming complete, full message length:', fullMessage.length);
    
    // Analyze the complete message for workflow intent
    const shouldGenerateWorkflow = detectWorkflowIntent(request.message);
    const workflowPrompt = shouldGenerateWorkflow
      ? extractWorkflowPrompt(request.message)
      : undefined;

    // Call onComplete with metadata
    request.onComplete(fullMessage, {
      shouldGenerateWorkflow,
      workflowPrompt,
      suggestions: generateSuggestions(fullMessage, shouldGenerateWorkflow),
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

