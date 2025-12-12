/**
 * API Route: /api/ai/configure-nodes
 * Handles AI-driven node configuration requests
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import OpenAI from 'openai';
import { getNodeById } from '@/lib/nodes/registry';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { userMessage, currentWorkflow, conversationHistory } = body;

    if (!userMessage || !currentWorkflow) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build system prompt for node configuration
    const systemPrompt = `You are an AI assistant that helps users configure workflow nodes.

Your task is to:
1. Understand which node(s) the user wants to configure
2. Extract configuration values from the user's message
3. Return a JSON object with the node configurations

IMPORTANT RULES:
- If the user provides values (e.g., API keys, times, prompts), extract and use them
- If the user doesn't provide required values, ask them to provide the information
- Be specific about what information you need and how to get it
- Only configure nodes that exist in the current workflow
- Return configurations in the exact format specified

Return a JSON object with this structure:
{
  "configurations": [
    {
      "nodeId": "node-1", // The ID of the node to configure
      "config": {
        "fieldName": "value", // Field name and value pairs
        "anotherField": "anotherValue"
      }
    }
  ],
  "summary": "Brief summary of what was configured",
  "needsInput": false, // true if you need more information from the user
  "message": "Response message to the user"
}

If you need more information, set needsInput to true and provide clear instructions in the message.`;

    // Build messages
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      const historyMessages = conversationHistory
        .slice(-5)
        .map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        }));
      messages.push(...historyMessages);
    }

    // Add current workflow context
    const workflowContext = `Current workflow nodes:
${currentWorkflow.nodes.map((node: any) => {
  const nodeData = node.data || {};
  const nodeId = nodeData.nodeId;
  
  // Get configSchema from node registry if it's a library node, otherwise use node data
  let configSchema: Record<string, any> = {};
  if (nodeId && nodeId !== 'CUSTOM_GENERATED') {
    const nodeDefinition = getNodeById(nodeId);
    configSchema = nodeDefinition?.configSchema || nodeData.configSchema || {};
  } else {
    // Custom generated node - use configSchema from node data
    configSchema = nodeData.configSchema || {};
  }
  
  const fields = Object.keys(configSchema).map(key => {
    const field = configSchema[key] as any;
    return `  - ${key} (${field.type}${field.required ? ', required' : ''}): ${field.label || key} - ${field.description || ''}`;
  }).join('\n');
  
  return `Node ID: ${node.id}
  Name: ${nodeData.label || nodeId || 'Unknown'}
  Type: ${nodeId || 'unknown'}
  Current Config: ${JSON.stringify(nodeData.config || {})}
  Available Fields:
${fields}`;
}).join('\n\n')}`;

    messages.push({
      role: 'system',
      content: workflowContext,
    });

    // Add user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    console.log('🔧 OpenAI response content:', responseContent);
    const response = JSON.parse(responseContent);
    console.log('🔧 Parsed response:', JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in configure-nodes API:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process configuration request',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

