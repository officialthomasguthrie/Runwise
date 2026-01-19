/**
 * Code Generation Step
 * Step 4 of the workflow generation pipeline
 * Generates custom code for CUSTOM_GENERATED nodes
 */

import OpenAI from 'openai';
import type { PipelineContext, StepResult } from '../types';
import type { AIGeneratedWorkflow } from '@/lib/ai/types';

/**
 * Generates custom code for CUSTOM_GENERATED nodes in the workflow
 * Uses gpt-4o for high-quality code generation
 * Only processes nodes that need code generation
 */
export async function generateCustomCode(
  context: PipelineContext & { workflow: AIGeneratedWorkflow }
): Promise<StepResult<AIGeneratedWorkflow>> {
  try {
    // Ensure workflow is provided
    if (!context.workflow) {
      return {
        success: false,
        error: 'Workflow is required for code generation',
      };
    }

    const workflow = { ...context.workflow };
    
    // Find all custom nodes that need code generation
    const customNodesNeedingCode = workflow.nodes.filter((node) => {
      const nodeDataFilter = node.data as any; // Type assertion since AIGeneratedWorkflow interface is restrictive
      const nodeId = nodeDataFilter?.nodeId;
      const hasCustomCode = !!nodeDataFilter?.customCode && typeof nodeDataFilter.customCode === 'string' && nodeDataFilter.customCode.trim().length > 0;
      
      return nodeId === 'CUSTOM_GENERATED' && !hasCustomCode;
    });

    // If no custom nodes need code, return workflow unchanged
    if (customNodesNeedingCode.length === 0) {
      return {
        success: true,
        data: workflow,
        tokenUsage: {
          inputTokens: 0,
          outputTokens: 0,
        },
      };
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Process each custom node sequentially
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const node of customNodesNeedingCode) {
      const nodeData = node.data as any; // Type assertion since AIGeneratedWorkflow interface is restrictive
      const nodeDescription = nodeData?.description || nodeData?.label || 'Custom node';
      const nodeRequirements = nodeData?.metadata?.requirements || nodeDescription;

      // System prompt focused on code generation
      const systemPrompt = `You are an expert JavaScript code generator for workflow automation nodes. Your task is to generate custom code for workflow nodes that require custom functionality.

INPUT:
You receive a custom node that needs code generation:
- Description: ${nodeDescription}
- Requirements: ${nodeRequirements}
- Node type: ${nodeData?.metadata?.type || 'transform'}

YOUR JOB:
Generate complete, functional JavaScript code that:
1. Fulfills the node's requirements
2. Uses the correct format: async (inputData, config, context) => { ... }
3. Includes proper error handling with try/catch
4. Uses context.http.get/post/put/delete for HTTP requests
5. Uses context.logger for logging
6. Returns structured data objects
7. Includes a complete configSchema that matches ALL config values used in the code

CUSTOM CODE RULES:
- Format: async (inputData, config, context) => { /* your code */ return result; }
- Always use async/await for API calls
- Use context.http.get/post/put/delete for HTTP requests (NOT fetch or axios)
- Use context.logger.info/error/warn for logging
- Return structured data objects (e.g., { result: "...", data: {...} })
- Handle errors gracefully with try/catch blocks
- No require(), import, eval(), or process access
- Access config values via config object (e.g., config.apiKey, config.url)
- Access previous node output via inputData (e.g., inputData.fieldName)
- Use template syntax {{inputData.field}} is handled by the system, don't parse it in code

CONFIG SCHEMA REQUIREMENTS:
- The configSchema MUST match ALL config values used in the customCode
- If code uses config.apiKey, schema MUST have apiKey field
- If code uses config.url, schema MUST have url field
- Analyze the generated code to extract ALL config references
- Schema format: Each field is an object with:
  * type: "string" | "number" | "textarea" | "select"
  * label: Human-readable field name
  * description: What this field is for
  * required: true/false (true if the code requires this value)
  * options: Array of {value, label} objects (only for type: "select")
  * default: Optional default value

ERROR HANDLING:
- Always wrap API calls in try/catch
- Log errors using context.logger.error()
- Return error information in the result if needed
- Don't throw unhandled errors

OUTPUT STRUCTURE:
Return a JSON object with these exact fields:
{
  "customCode": "async (inputData, config, context) => { /* your code */ return result; }",
  "configSchema": {
    "fieldName": {
      "type": "string",
      "label": "Field Label",
      "description": "What this field is for",
      "required": true
    }
  }
}

EXAMPLES:

Example 1: Fetch Bitcoin price from CoinGecko
{
  "customCode": "async (inputData, config, context) => { try { const response = await context.http.get(\`https://api.coingecko.com/api/v3/simple/price?ids=\${config.cryptoId}&vs_currencies=usd\`); return { price: response[config.cryptoId].usd, timestamp: new Date().toISOString() }; } catch (error) { context.logger.error('Failed to fetch crypto price:', error); return { error: error.message, price: null }; } }",
  "configSchema": {
    "cryptoId": {
      "type": "string",
      "label": "Cryptocurrency ID",
      "description": "The CoinGecko cryptocurrency ID (e.g., 'bitcoin', 'ethereum')",
      "required": true
    }
  }
}

Example 2: Send data to webhook
{
  "customCode": "async (inputData, config, context) => { try { const response = await context.http.post(config.webhookUrl, { data: inputData, timestamp: new Date().toISOString() }, { headers: { 'Authorization': \`Bearer \${config.apiKey}\`, 'Content-Type': 'application/json' } }); return { success: true, response: response }; } catch (error) { context.logger.error('Webhook call failed:', error); return { success: false, error: error.message }; } }",
  "configSchema": {
    "webhookUrl": {
      "type": "string",
      "label": "Webhook URL",
      "description": "The URL to send the webhook request to",
      "required": true
    },
    "apiKey": {
      "type": "string",
      "label": "API Key",
      "description": "API key for authentication",
      "required": true
    }
  }
}

CRITICAL RULES:
1. The customCode must be valid JavaScript that can be executed
2. The configSchema must include ALL fields referenced in the code via config.*
3. Use regex or manual analysis to extract config references from the code
4. Ensure every config.fieldName in code has a corresponding schema field
5. Return ONLY valid JSON, no markdown, no explanations outside JSON

Return a JSON object with customCode and configSchema fields.`;

      // Build user message with node requirements
      const userMessage = `Generate custom code for a workflow node with these requirements:

Description: ${nodeDescription}
Requirements: ${nodeRequirements}

Please generate the customCode and complete configSchema that matches all config values used in the code.`;

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
        temperature: 0.3, // Lower temperature for more deterministic code
        max_tokens: 2000, // May need more for complex code
      });

      // Extract response and token usage
      const responseContent = completion.choices[0]?.message?.content;
      const tokenUsage = {
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
      };

      totalInputTokens += tokenUsage.inputTokens;
      totalOutputTokens += tokenUsage.outputTokens;

      if (!responseContent) {
        console.warn(`No response from OpenAI for node ${node.id}, skipping code generation`);
        continue;
      }

      // Parse JSON response
      let codeResult: { customCode?: string; configSchema?: Record<string, any> };
      try {
        codeResult = JSON.parse(responseContent);
      } catch (parseError) {
        console.error(`Error parsing code generation response for node ${node.id}:`, parseError);
        console.error('Response content:', responseContent);
        continue;
      }

      // Validate required fields
      if (!codeResult.customCode || typeof codeResult.customCode !== 'string') {
        console.warn(`Invalid customCode for node ${node.id}, skipping`);
        continue;
      }

      // Validate and extract config references from code
      const configSchema = codeResult.configSchema || {};
      const configReferences = extractConfigReferences(codeResult.customCode);

      // Detect integration from API endpoints in customCode
      const detectedIntegration = detectIntegrationFromCode(codeResult.customCode);
      
      // If integration is detected, add integration field to configSchema
      if (detectedIntegration) {
        // Use a consistent key name for the integration connection field
        const integrationFieldKey = `${detectedIntegration.serviceName}_connection`;
        
        // Only add if not already present
        if (!configSchema[integrationFieldKey]) {
          configSchema[integrationFieldKey] = {
            type: 'integration',
            label: 'Connect',
            description: `Connect your ${detectedIntegration.serviceName === 'google' ? 'Google' : detectedIntegration.serviceName === 'slack' ? 'Slack' : detectedIntegration.serviceName === 'github' ? 'GitHub' : detectedIntegration.serviceName === 'discord' ? 'Discord' : detectedIntegration.serviceName === 'twitter' ? 'Twitter/X' : detectedIntegration.serviceName === 'paypal' ? 'PayPal' : detectedIntegration.serviceName} account`,
            required: false,
            serviceName: detectedIntegration.serviceName,
            integrationType: detectedIntegration.serviceName,
            credentialType: detectedIntegration.credentialType,
          };
        }
      }

      // Ensure all config references are in schema
      for (const configRef of configReferences) {
        // Skip integration connection fields - they're already added above
        if (configRef.endsWith('_connection')) {
          continue;
        }
        
        if (!configSchema[configRef]) {
          // Add missing config field with default schema
          configSchema[configRef] = {
            type: 'string',
            label: configRef.charAt(0).toUpperCase() + configRef.slice(1).replace(/([A-Z])/g, ' $1'),
            description: `Configuration value for ${configRef}`,
            required: false,
          };
        }
      }

      // Update node with generated code and schema
      if (!node.data) {
        node.data = {} as any;
      }

      const nodeDataUpdate = node.data as any;
      nodeDataUpdate.customCode = codeResult.customCode;
      nodeDataUpdate.configSchema = configSchema;

      // Ensure metadata exists
      if (!nodeDataUpdate.metadata) {
        nodeDataUpdate.metadata = {};
      }
      nodeDataUpdate.metadata.generatedBy = 'ai';
    }

    // Return updated workflow
    return {
      success: true,
      data: workflow,
      tokenUsage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
    };
  } catch (error: any) {
    console.error('Error in code generation step:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate custom code',
    };
  }
}

/**
 * Extracts config references from custom code using regex
 * Finds patterns like config.fieldName, config['fieldName'], config["fieldName"]
 */
function extractConfigReferences(customCode: string): string[] {
  const configRefs = new Set<string>();

  // Pattern 1: config.fieldName
  const dotNotationRegex = /config\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = dotNotationRegex.exec(customCode)) !== null) {
    configRefs.add(match[1]);
  }

  // Pattern 2: config['fieldName'] or config["fieldName"]
  const bracketNotationRegex = /config\[['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\]/g;
  while ((match = bracketNotationRegex.exec(customCode)) !== null) {
    configRefs.add(match[1]);
  }

  // Pattern 3: config[someVariable] - try to find common patterns
  // This is less reliable, but we'll capture some common cases
  const dynamicBracketRegex = /config\[(['"]?)([a-zA-Z_][a-zA-Z0-9_]*)\1\]/g;
  while ((match = dynamicBracketRegex.exec(customCode)) !== null) {
    if (match[1]) { // Only if it's a string literal, not a variable
      configRefs.add(match[2]);
    }
  }

  return Array.from(configRefs);
}

/**
 * Detects integration service from API endpoints in custom code
 * Returns integration info if detected, null otherwise
 */
function detectIntegrationFromCode(customCode: string): {
  serviceName: string;
  credentialType: 'oauth' | 'api_token' | 'api_key_and_token';
} | null {
  const codeLower = customCode.toLowerCase();
  
  // Google APIs
  if (codeLower.includes('googleapis.com') || codeLower.includes('gmail') || codeLower.includes('sheets') || codeLower.includes('calendar') || codeLower.includes('drive') || codeLower.includes('forms')) {
    // Try to determine specific Google service
    if (codeLower.includes('sheets') || codeLower.includes('spreadsheets')) {
      return { serviceName: 'google-sheets', credentialType: 'oauth' };
    }
    if (codeLower.includes('gmail')) {
      return { serviceName: 'google-gmail', credentialType: 'oauth' };
    }
    if (codeLower.includes('calendar')) {
      return { serviceName: 'google-calendar', credentialType: 'oauth' };
    }
    if (codeLower.includes('drive')) {
      return { serviceName: 'google-drive', credentialType: 'oauth' };
    }
    if (codeLower.includes('forms')) {
      return { serviceName: 'google-forms', credentialType: 'oauth' };
    }
    return { serviceName: 'google', credentialType: 'oauth' };
  }
  
  // Slack API
  if (codeLower.includes('slack.com/api') || codeLower.includes('slack')) {
    return { serviceName: 'slack', credentialType: 'oauth' };
  }
  
  // GitHub API
  if (codeLower.includes('api.github.com') || codeLower.includes('github.com')) {
    return { serviceName: 'github', credentialType: 'oauth' };
  }
  
  // Notion API
  if (codeLower.includes('notion.so/api') || codeLower.includes('notion.so/v1') || codeLower.includes('notion')) {
    return { serviceName: 'notion', credentialType: 'oauth' };
  }
  
  // Airtable API
  if (codeLower.includes('airtable.com/api') || codeLower.includes('airtable.com/v0') || codeLower.includes('airtable')) {
    return { serviceName: 'airtable', credentialType: 'oauth' };
  }
  
  // Trello API
  if (codeLower.includes('trello.com/1') || codeLower.includes('trello')) {
    return { serviceName: 'trello', credentialType: 'oauth' };
  }
  
  // OpenAI API
  if (codeLower.includes('api.openai.com') || codeLower.includes('openai') || codeLower.includes('gpt-') || codeLower.includes('chatgpt')) {
    return { serviceName: 'openai', credentialType: 'api_token' };
  }
  
  // SendGrid API
  if (codeLower.includes('api.sendgrid.com') || codeLower.includes('sendgrid')) {
    return { serviceName: 'sendgrid', credentialType: 'api_token' };
  }
  
  // Twilio API
  if (codeLower.includes('twilio.com') || codeLower.includes('twilio')) {
    return { serviceName: 'twilio', credentialType: 'api_key_and_token' };
  }
  
  // Stripe API
  if (codeLower.includes('api.stripe.com') || codeLower.includes('stripe')) {
    return { serviceName: 'stripe', credentialType: 'api_token' };
  }
  
  // Discord API
  if (codeLower.includes('discord.com/api') || codeLower.includes('discordapp.com/api') || codeLower.includes('discord')) {
    return { serviceName: 'discord', credentialType: 'api_token' };
  }
  
  // Twitter/X API
  if (codeLower.includes('api.twitter.com') || codeLower.includes('api.x.com') || codeLower.includes('twitter') || codeLower.includes('x.com')) {
    return { serviceName: 'twitter', credentialType: 'api_token' };
  }
  
  // PayPal API
  if (codeLower.includes('api.paypal.com') || codeLower.includes('paypal')) {
    return { serviceName: 'paypal', credentialType: 'oauth' };
  }
  
  // Shopify API
  if (codeLower.includes('myshopify.com/admin/api') || codeLower.includes('shopify')) {
    return { serviceName: 'shopify', credentialType: 'oauth' };
  }
  
  // HubSpot API
  if (codeLower.includes('api.hubspot.com') || codeLower.includes('hubspot')) {
    return { serviceName: 'hubspot', credentialType: 'oauth' };
  }
  
  // Asana API
  if (codeLower.includes('app.asana.com/api') || codeLower.includes('asana')) {
    return { serviceName: 'asana', credentialType: 'oauth' };
  }
  
  // Jira API
  if (codeLower.includes('atlassian.net/rest/api') || codeLower.includes('jira')) {
    return { serviceName: 'jira', credentialType: 'oauth' };
  }
  
  return null;
}

