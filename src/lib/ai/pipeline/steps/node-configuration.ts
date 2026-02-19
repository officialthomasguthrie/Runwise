/**
 * Node Configuration Step
 * Step 4 of the workflow generation pipeline
 * Fills out node configuration fields from user intent and explicit values
 */

import OpenAI from 'openai';
import { nodeRegistry } from '@/lib/nodes';
import { getNodeById } from '@/lib/nodes/registry';
import type { PipelineContext, IntentAnalysis, StepResult } from '../types';
import type { AIGeneratedWorkflow } from '@/lib/ai/types';

/**
 * Fills out node configuration fields based on user intent and explicit values
 * Uses gpt-4o for high-quality configuration extraction
 * Skips integration connection fields (users must connect these manually)
 */
export async function configureNodes(
  context: PipelineContext & { workflow: AIGeneratedWorkflow; intent: IntentAnalysis }
): Promise<StepResult<AIGeneratedWorkflow>> {
  try {
    // Ensure workflow is provided
    if (!context.workflow) {
      return {
        success: false,
        error: 'Workflow is required for node configuration',
      };
    }

    // Ensure intent is provided
    if (!context.intent) {
      return {
        success: false,
        error: 'Intent analysis is required for node configuration',
      };
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build node configuration context
    const nodesWithSchemas = context.workflow.nodes.map((node) => {
      const nodeData = node.data as any;
      const nodeId = nodeData.nodeId;

      // Get configSchema from registry or node data (for custom nodes)
      let configSchema: Record<string, any> = {};
      if (nodeId && nodeId !== 'CUSTOM_GENERATED') {
        const nodeDefinition = getNodeById(nodeId);
        configSchema = nodeDefinition?.configSchema || {};
      } else if (nodeId === 'CUSTOM_GENERATED') {
        // Custom node - use configSchema from node data
        configSchema = nodeData.configSchema || {};
      }

      // Filter out integration connection fields (users must connect these manually)
      const configurableFields = Object.entries(configSchema).filter(
        ([_, field]: [string, any]) => field.type !== 'integration'
      );

      return {
        nodeId: node.id,
        label: nodeData.label || nodeId || 'Unknown',
        nodeType: nodeId,
        fields: configurableFields.map(([key, field]: [string, any]) => ({
          key,
          type: field.type,
          label: field.label || key,
          description: field.description || '',
          required: field.required || false,
          options: field.options || null, // For select fields
          default: field.default || null,
        })),
        currentConfig: nodeData.config || {},
      };
    });

    // Only process nodes that have configurable fields (excluding integration fields)
    const nodesToConfigure = nodesWithSchemas.filter((node) => node.fields.length > 0);

    // If no nodes need configuration, skip this step
    if (nodesToConfigure.length === 0) {
      return {
        success: true,
        data: context.workflow,
        tokenUsage: {
          inputTokens: 0,
          outputTokens: 0,
        },
      };
    }

    // Build the configuration prompt
    const nodesContext = nodesToConfigure
      .map((node) => {
        const fieldsList = node.fields
          .map(
            (field) =>
              `    - ${field.key} (${field.type}${field.required ? ', required' : ', optional'}): ${field.label} - ${field.description}${field.options ? ` - Options: ${JSON.stringify(field.options)}` : ''}`
          )
          .join('\n');
        return `Node ID: ${node.nodeId}
  Name: ${node.label}
  Type: ${node.nodeType}
  Configurable Fields:
${fieldsList}
  Current Config: ${JSON.stringify(node.currentConfig)}`;
      })
      .join('\n\n');

    const systemPrompt = `You are an AI assistant that fills out workflow node configuration fields based on user intent and explicit values provided in their prompt.

YOUR TASK:
1. Analyze the user's original prompt and extracted intent
2. Fill out configuration fields where values are:
   - Explicitly mentioned (e.g., "9 AM", "john@example.com", "daily")
   - Obviously inferable from context (e.g., email addresses, times, prompts)
   - Can be derived from the intent
3. Skip fields where values are not clear or require user input (e.g., API keys, OAuth connections)
4. Never fill integration connection fields (type: "integration") - users must connect these manually

WORKFLOW CONTEXT:
User's Original Prompt: "${context.userPrompt}"

Extracted Intent:
- Goal: ${context.intent.goal}
- Triggers: ${context.intent.triggers.join(', ')}
- Actions: ${context.intent.actions.join(', ')}
- Transforms: ${context.intent.transforms.join(', ')}

NODES TO CONFIGURE:
${nodesContext}

FIELD TYPES AND EXAMPLES:
- string: Text values (e.g., email addresses, URLs, names) - fill if explicitly mentioned
- textarea: Long text (e.g., email bodies, prompts) - fill if explicitly mentioned or can be inferred
- number: Numeric values (e.g., timeouts, counts) - fill if explicitly mentioned
- select: Dropdown options - use value from options array if mentioned or inferable
- boolean: true/false - infer from context if clear
- date: Date strings - fill if explicitly mentioned
- time: Time strings (e.g., "09:00", "9 AM") - fill if explicitly mentioned

SPECIAL HANDLING FOR SCHEDULED-TIME-TRIGGER:
For nodes with nodeId "scheduled-time-trigger", the "schedule" field MUST be a cron expression.
Cron format: "minute hour dayOfMonth month dayOfWeek"
- Daily at 9 AM: "0 9 * * *" (minute=0, hour=9, every day)
- Daily at 9:30 AM: "30 9 * * *"
- Daily at 12:00 PM (noon): "0 12 * * *"
- Daily at 12:00 AM (midnight): "0 0 * * *"
- Weekly on Monday at 9 AM: "0 9 * * 1" (1 = Monday, 0 = Sunday)
- Monthly on 1st at 9 AM: "0 9 1 * *"

IMPORTANT TIME CONVERSION:
- "9 AM" = hour 9 = "0 9 * * *"
- "9 PM" = hour 21 = "0 21 * * *"
- "12 PM" (noon) = hour 12 = "0 12 * * *"
- "12 AM" (midnight) = hour 0 = "0 0 * * *"
- Always use 24-hour format for hour (0-23), and minute (0-59)

CRITICAL RULES:
1. Only fill fields where you can confidently extract a value from the user's prompt or intent
2. If a value is ambiguous or requires user input (like API keys), leave it empty
3. NEVER fill integration connection fields (type: "integration")
4. For scheduled-time-trigger nodes, ALWAYS use cron format for the "schedule" field
5. Convert times correctly: "9 AM" → "0 9 * * *", "9 PM" → "0 21 * * *", "12 PM" → "0 12 * * *", "12 AM" → "0 0 * * *"
6. For select fields, match the value to one of the provided options
7. For template syntax ({{inputData.field}}), keep it as-is if it's already there, don't override
8. Don't fill fields that are template references (they map data between nodes)

WEBHOOK DATA FLOW RULE (CRITICAL):
- When a workflow uses a "webhook-trigger" node, every field from the incoming JSON body is available DIRECTLY as {{inputData.fieldName}} in all downstream nodes
- The payload is passed FLAT — do NOT use {{inputData.payload.field}} or {{inputData.data.field}}
- Infer the likely payload fields from the user's description and pre-fill downstream nodes:
  - "new user signup" → {{inputData.email}}, {{inputData.name}}, {{inputData.plan}}
  - "new order / purchase" → {{inputData.orderId}}, {{inputData.amount}}, {{inputData.customerEmail}}
  - "support ticket" → {{inputData.ticketId}}, {{inputData.subject}}, {{inputData.message}}
  - When in doubt, use descriptive placeholder names like {{inputData.email}}, {{inputData.name}}
- Always pre-fill downstream node config fields with these template references so the workflow works out of the box

EXAMPLES:
User says: "Create a workflow that runs daily at 9 AM"
- Fill: scheduled trigger schedule="0 9 * * *" (cron format for daily at 9 AM)

User says: "Create a workflow that runs daily at 9 AM New Zealand time"
- Fill: scheduled trigger schedule="0 9 * * *", timezone="Pacific/Auckland"

User says: "Send email to john@example.com with subject 'Welcome'"
- Fill: email action to="john@example.com", subject="Welcome"

User says: "Use OpenAI to generate content with prompt 'Write a summary'"
- Fill: OpenAI node prompt="Write a summary"

Return a JSON object with this structure:
{
  "configurations": [
    {
      "nodeId": "node-1", // The ID of the node (not nodeId from data)
      "config": {
        "fieldName": "value", // Only fields that can be filled
        "anotherField": "anotherValue"
      }
    }
  ]
}

Return ONLY valid JSON, no markdown, no explanations outside JSON.`;

    const userMessage = `Fill out the configuration fields for the nodes listed above based on the user's original prompt and extracted intent. Only fill fields where values are explicit or obviously inferable. Skip integration connection fields entirely.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
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
      temperature: 0.3,
      max_tokens: 2000,
    });

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
    let configurationResult: { configurations: Array<{ nodeId: string; config: Record<string, any> }> };
    try {
      configurationResult = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Error parsing node configuration response:', parseError);
      console.error('Response content:', responseContent);
      return {
        success: false,
        error: `Invalid JSON response from AI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        tokenUsage,
      };
    }

    // Apply configurations to workflow nodes
    const updatedWorkflow: AIGeneratedWorkflow = {
      ...context.workflow,
      nodes: context.workflow.nodes.map((node) => {
        const configForNode = configurationResult.configurations.find(
          (config) => config.nodeId === node.id
        );

        if (configForNode) {
          // Merge new config with existing config (if any)
          const currentConfig = (node.data as any).config || {};
          const updatedConfig = {
            ...currentConfig,
            ...configForNode.config,
          };

          return {
            ...node,
            data: {
              ...(node.data as any),
              config: updatedConfig,
            },
          };
        }

        return node;
      }),
    };

    return {
      success: true,
      data: updatedWorkflow,
      tokenUsage,
    };
  } catch (error: any) {
    console.error('[Pipeline] Node configuration error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during node configuration',
    };
  }
}

