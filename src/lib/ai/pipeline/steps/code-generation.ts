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
- Access config values via config object (e.g., config.url, config.method)
- Access previous node output via inputData (e.g., inputData.fieldName)
- Use template syntax {{inputData.field}} is handled by the system, don't parse it in code

INTEGRATION CREDENTIALS (CRITICAL):
- When your code uses integrations (OpenAI, SendGrid, Twilio, Stripe, Discord, Twitter, etc.), DO NOT use config.apiKey or config.authToken
- Instead, use context.auth.{serviceName} to access credentials:
  * OpenAI: context.auth.openai.apiKey
  * SendGrid: context.auth.sendgrid.apiKey
  * Twilio: context.auth.twilio.credentials.accountSid and context.auth.twilio.credentials.authToken
  * Stripe: context.auth.stripe.apiKey
  * Discord: context.auth.discord.token
  * Twitter: context.auth.twitter.token
  * Google: context.auth.google.token
  * Slack: context.auth.slack.token
  * GitHub: context.auth.github.token
- **NEVER** include apiKey, authToken, secretKey, accessToken, or any credential fields in configSchema when using integrations
- The integration connection UI handles credentials separately - users connect integrations through the integration field, not through configSchema
- Only use config for non-credential fields like URLs, IDs, parameters, etc.

CONFIG SCHEMA REQUIREMENTS:
- The configSchema MUST match ALL config values used in the customCode (excluding integration credentials)
- If code uses config.url, schema MUST have url field
- If code uses config.apiKey for an integration (like OpenAI, SendGrid), DO NOT include it in configSchema - use context.auth instead
- Analyze the generated code to extract ALL config references (but exclude credential fields for integrations)
- Schema format: Each field is an object with:
  * type: "string" | "number" | "textarea" | "select"
  * label: Human-readable field name
  * description: What this field is for
  * required: true/false (true if the code requires this value)
  * options: Array of {value, label} objects (only for type: "select")
  * default: Optional default value
  * **serviceName**: Integration service name (e.g., "slack", "google-sheets", "notion") - REQUIRED for integration-dependent fields
  * **resourceType**: Type of resource to fetch from integration - REQUIRED for integration-dependent fields
    * Available resourceTypes:
      - Google Sheets: "spreadsheet", "sheet", "column"
      - Google Calendar: "calendar"
      - Google Drive: "folder"
      - Google Forms: "form"
      - Gmail: "label"
      - Slack: "channel"
      - GitHub: "repository"
      - Notion: "database"
      - Airtable: "base", "table", "field"
      - Trello: "board", "list"
      - Discord: "guild", "channel"
  
INTEGRATION-DEPENDENT FIELDS (CRITICAL):
- When your code uses integrations and needs fields that should be selected from the user's connected resources (channels, spreadsheets, databases, etc.), use integration-dependent fields
- These fields automatically fetch options from the user's connected integration account
- Format for integration-dependent fields:
  * Set type: "string" (the UI will render it as a dropdown)
  * Include serviceName: The integration service name (must match detected integration)
  * Include resourceType: The type of resource to fetch (channel, spreadsheet, database, etc.)
  * Do NOT include options: The system fetches them automatically from the integration
  * Example: { type: "string", label: "Channel", description: "Select a Slack channel", required: true, serviceName: "slack", resourceType: "channel" }
- Common integration-dependent fields:
  * Slack: channel → { serviceName: "slack", resourceType: "channel" }
  * Google Sheets: spreadsheetId → { serviceName: "google-sheets", resourceType: "spreadsheet" }
  * Google Sheets: sheetName → { serviceName: "google-sheets", resourceType: "sheet" }
  * Notion: databaseId → { serviceName: "notion", resourceType: "database" }
  * Airtable: baseId → { serviceName: "airtable", resourceType: "base" }
  * Airtable: tableId → { serviceName: "airtable", resourceType: "table" }
  * Trello: boardId → { serviceName: "trello", resourceType: "board" }
  * Trello: listId → { serviceName: "trello", resourceType: "list" }
  * GitHub: repository → { serviceName: "github", resourceType: "repository" }
  * Discord: guildId → { serviceName: "discord", resourceType: "guild" }
  * Discord: channelId → { serviceName: "discord", resourceType: "channel" }
  * Google Calendar: calendarId → { serviceName: "google-calendar", resourceType: "calendar" }
  * Google Drive: folderId → { serviceName: "google-drive", resourceType: "folder" }
  * Google Forms: formId → { serviceName: "google-forms", resourceType: "form" }
  * Gmail: labelId → { serviceName: "google-gmail", resourceType: "label" }

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

Example 2: Send data to webhook (generic webhook - no integration)
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
      "description": "API key for authentication (for generic webhooks, not integrations)",
      "required": true
    }
  }
}

Example 3: Call OpenAI API (uses integration - NO apiKey in configSchema)
{
  "customCode": "async (inputData, config, context) => { try { const response = await context.http.post('https://api.openai.com/v1/chat/completions', { model: config.model, messages: [{ role: 'user', content: config.prompt }] }, { headers: { 'Authorization': \`Bearer \${context.auth.openai.apiKey}\`, 'Content-Type': 'application/json' } }); return { result: response.choices[0].message.content }; } catch (error) { context.logger.error('OpenAI API call failed:', error); return { error: error.message }; } }",
  "configSchema": {
    "model": {
      "type": "string",
      "label": "Model",
      "description": "OpenAI model to use (e.g., 'gpt-3.5-turbo')",
      "required": true,
      "default": "gpt-3.5-turbo"
    },
    "prompt": {
      "type": "textarea",
      "label": "Prompt",
      "description": "The prompt to send to OpenAI",
      "required": true
    }
  }
}
Note: apiKey is NOT in configSchema - it comes from context.auth.openai.apiKey (users connect OpenAI through the integration UI)

Example 4: Send email via SendGrid (uses integration - NO apiKey in configSchema)
{
  "customCode": "async (inputData, config, context) => { try { const response = await context.http.post('https://api.sendgrid.com/v3/mail/send', { personalizations: [{ to: [{ email: config.to }] }], from: { email: config.from }, subject: config.subject, content: [{ type: 'text/plain', value: config.body }] }, { headers: { 'Authorization': \`Bearer \${context.auth.sendgrid.apiKey}\`, 'Content-Type': 'application/json' } }); return { success: true, messageId: response.headers['x-message-id'] }; } catch (error) { context.logger.error('SendGrid API call failed:', error); return { success: false, error: error.message }; } }",
  "configSchema": {
    "to": {
      "type": "string",
      "label": "To Email",
      "description": "Recipient email address",
      "required": true
    },
    "from": {
      "type": "string",
      "label": "From Email",
      "description": "Sender email address",
      "required": true
    },
    "subject": {
      "type": "string",
      "label": "Subject",
      "description": "Email subject",
      "required": true
    },
    "body": {
      "type": "textarea",
      "label": "Body",
      "description": "Email body content",
      "required": true
    }
  }
}
Note: apiKey is NOT in configSchema - it comes from context.auth.sendgrid.apiKey (users connect SendGrid through the integration UI)

Example 5: Post to Slack channel (uses integration-dependent field for channel selection)
{
  "customCode": "async (inputData, config, context) => { try { const response = await context.http.post('https://slack.com/api/chat.postMessage', { channel: config.channel, text: config.message }, { headers: { 'Authorization': \`Bearer \${context.auth.slack.token}\`, 'Content-Type': 'application/json' } }); return { success: true, ts: response.ts, channel: response.channel }; } catch (error) { context.logger.error('Slack API call failed:', error); return { success: false, error: error.message }; } }",
  "configSchema": {
    "channel": {
      "type": "string",
      "label": "Channel",
      "description": "Select a Slack channel",
      "required": true,
      "serviceName": "slack",
      "resourceType": "channel"
    },
    "message": {
      "type": "textarea",
      "label": "Message",
      "description": "Message text to post",
      "required": true
    }
  }
}
Note: channel field has serviceName and resourceType - users will see a dropdown of their Slack channels

Example 6: Add row to Google Sheet (uses integration-dependent fields)
{
  "customCode": "async (inputData, config, context) => { try { const response = await context.http.post(\`https://sheets.googleapis.com/v4/spreadsheets/\${config.spreadsheetId}/values/\${config.sheetName}:append?valueInputOption=RAW\`, { values: [[config.value]] }, { headers: { 'Authorization': \`Bearer \${context.auth.google.token}\`, 'Content-Type': 'application/json' } }); return { success: true, updatedCells: response.updates?.updatedCells || 0 }; } catch (error) { context.logger.error('Google Sheets API call failed:', error); return { success: false, error: error.message }; } }",
  "configSchema": {
    "spreadsheetId": {
      "type": "string",
      "label": "Spreadsheet",
      "description": "Select a Google Sheet",
      "required": true,
      "serviceName": "google-sheets",
      "resourceType": "spreadsheet"
    },
    "sheetName": {
      "type": "string",
      "label": "Sheet",
      "description": "Select a sheet within the spreadsheet",
      "required": true,
      "serviceName": "google-sheets",
      "resourceType": "sheet"
    },
    "value": {
      "type": "string",
      "label": "Value",
      "description": "Value to add to the sheet",
      "required": true
    }
  }
}
Note: spreadsheetId and sheetName have serviceName and resourceType - users will see dropdowns of their Google Sheets

CRITICAL RULES:
1. The customCode must be valid JavaScript that can be executed
2. The configSchema must include ALL fields referenced in the code via config.* (excluding integration credentials)
3. **NEVER** include credential fields (apiKey, authToken, secretKey, accessToken, botToken, accountSid, etc.) in configSchema when using integrations
4. For integrations, use context.auth.{serviceName} to access credentials, not config
5. **ALWAYS use integration-dependent fields** when your code needs resources from integrations:
   - If code uses config.channel with Slack → add serviceName: "slack", resourceType: "channel"
   - If code uses config.spreadsheetId with Google Sheets → add serviceName: "google-sheets", resourceType: "spreadsheet"
   - If code uses config.databaseId with Notion → add serviceName: "notion", resourceType: "database"
   - If code uses config.repository with GitHub → add serviceName: "github", resourceType: "repository"
   - And so on for all integration resources
6. Use regex or manual analysis to extract config references from the code
7. Ensure every config.fieldName in code (except credential fields for integrations) has a corresponding schema field
8. If you detect an integration API in your code, automatically:
   - Use context.auth instead of config for credentials
   - Add serviceName and resourceType to fields that should fetch from the integration
9. Return ONLY valid JSON, no markdown, no explanations outside JSON

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
      
      // If integration is detected, add integration field to configSchema and remove credential fields
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

        // Remove any credential fields from configSchema (users connect through integration UI, not configSchema)
        const credentialFieldNames = [
          'apiKey', 'api_key', 'authToken', 'auth_token', 'secretKey', 'secret_key',
          'accessToken', 'access_token', 'botToken', 'bot_token', 'accountSid', 'account_sid',
          'clientId', 'client_id', 'clientSecret', 'client_secret', 'bearerToken', 'bearer_token',
          'token', 'key', 'password', 'credential'
        ];
        
        for (const fieldName of credentialFieldNames) {
          if (configSchema[fieldName]) {
            console.log(`[Code Generation] Removing credential field '${fieldName}' from configSchema for integration '${detectedIntegration.serviceName}' - credentials are handled through integration connection UI`);
            delete configSchema[fieldName];
          }
        }
      }

      // Ensure all config references are in schema
      for (const configRef of configReferences) {
        // Skip integration connection fields - they're already added above
        if (configRef.endsWith('_connection')) {
          continue;
        }
        
        if (!configSchema[configRef]) {
          // Try to detect if this is an integration-dependent field
          const integrationFieldInfo = detectIntegrationField(configRef, detectedIntegration);
          
          // Add missing config field with schema
          configSchema[configRef] = {
            type: 'string',
            label: configRef.charAt(0).toUpperCase() + configRef.slice(1).replace(/([A-Z])/g, ' $1'),
            description: integrationFieldInfo?.description || `Configuration value for ${configRef}`,
            required: false,
            ...(integrationFieldInfo && {
              serviceName: integrationFieldInfo.serviceName,
              resourceType: integrationFieldInfo.resourceType,
            }),
          };
        } else if (detectedIntegration) {
          // Field exists in schema - check if it should be integration-dependent
          const integrationFieldInfo = detectIntegrationField(configRef, detectedIntegration);
          if (integrationFieldInfo && !configSchema[configRef].serviceName) {
            // Add serviceName and resourceType to existing field
            configSchema[configRef].serviceName = integrationFieldInfo.serviceName;
            configSchema[configRef].resourceType = integrationFieldInfo.resourceType;
            console.log(`[Code Generation] Adding integration-dependent field info to '${configRef}': serviceName=${integrationFieldInfo.serviceName}, resourceType=${integrationFieldInfo.resourceType}`);
          }
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

/**
 * Detects if a config field should be an integration-dependent field
 * Returns resourceType and serviceName if detected, null otherwise
 */
function detectIntegrationField(
  fieldName: string,
  detectedIntegration: { serviceName: string; credentialType: 'oauth' | 'api_token' | 'api_key_and_token' } | null
): { serviceName: string; resourceType: string; description?: string } | null {
  if (!detectedIntegration) {
    return null;
  }

  const fieldLower = fieldName.toLowerCase();
  const serviceName = detectedIntegration.serviceName;

  // Slack integration fields
  if (serviceName === 'slack') {
    if (fieldLower.includes('channel') || fieldLower === 'channel' || fieldLower === 'channelid') {
      return {
        serviceName: 'slack',
        resourceType: 'channel',
        description: 'Select a Slack channel',
      };
    }
  }

  // Google Sheets integration fields
  if (serviceName === 'google-sheets' || serviceName === 'google') {
    if (fieldLower.includes('spreadsheet') || fieldLower === 'spreadsheetid' || fieldLower === 'spreadsheet') {
      return {
        serviceName: 'google-sheets',
        resourceType: 'spreadsheet',
        description: 'Select a Google Sheet',
      };
    }
    if ((fieldLower.includes('sheet') && !fieldLower.includes('spreadsheet')) || fieldLower === 'sheetname' || fieldLower === 'sheet') {
      return {
        serviceName: 'google-sheets',
        resourceType: 'sheet',
        description: 'Select a sheet within the spreadsheet',
      };
    }
    if (fieldLower.includes('column') || fieldLower === 'columnname' || fieldLower === 'column') {
      return {
        serviceName: 'google-sheets',
        resourceType: 'column',
        description: 'Select a column',
      };
    }
  }

  // Google Calendar integration fields
  if (serviceName === 'google-calendar' || serviceName === 'google') {
    if (fieldLower.includes('calendar') || fieldLower === 'calendarid' || fieldLower === 'calendar') {
      return {
        serviceName: 'google-calendar',
        resourceType: 'calendar',
        description: 'Select a Google Calendar',
      };
    }
  }

  // Google Drive integration fields
  if (serviceName === 'google-drive' || serviceName === 'google') {
    if (fieldLower.includes('folder') || fieldLower === 'folderid' || fieldLower === 'folder') {
      return {
        serviceName: 'google-drive',
        resourceType: 'folder',
        description: 'Select a Google Drive folder',
      };
    }
  }

  // Google Forms integration fields
  if (serviceName === 'google-forms' || serviceName === 'google') {
    if (fieldLower.includes('form') || fieldLower === 'formid' || fieldLower === 'form') {
      return {
        serviceName: 'google-forms',
        resourceType: 'form',
        description: 'Select a Google Form',
      };
    }
  }

  // Gmail integration fields
  if (serviceName === 'google-gmail' || serviceName === 'google') {
    if (fieldLower.includes('label') || fieldLower === 'labelid' || fieldLower === 'label') {
      return {
        serviceName: 'google-gmail',
        resourceType: 'label',
        description: 'Select a Gmail label',
      };
    }
  }

  // GitHub integration fields
  if (serviceName === 'github') {
    if (fieldLower.includes('repo') || fieldLower === 'repository' || fieldLower === 'repositoryid') {
      return {
        serviceName: 'github',
        resourceType: 'repository',
        description: 'Select a GitHub repository',
      };
    }
  }

  // Notion integration fields
  if (serviceName === 'notion') {
    if (fieldLower.includes('database') || fieldLower === 'databaseid' || fieldLower === 'database') {
      return {
        serviceName: 'notion',
        resourceType: 'database',
        description: 'Select a Notion database',
      };
    }
  }

  // Airtable integration fields
  if (serviceName === 'airtable') {
    if (fieldLower.includes('base') && !fieldLower.includes('database') || fieldLower === 'baseid' || fieldLower === 'base') {
      return {
        serviceName: 'airtable',
        resourceType: 'base',
        description: 'Select an Airtable base',
      };
    }
    if (fieldLower.includes('table') && !fieldLower.includes('base') || fieldLower === 'tableid' || fieldLower === 'table') {
      return {
        serviceName: 'airtable',
        resourceType: 'table',
        description: 'Select a table within the base',
      };
    }
    if (fieldLower.includes('field') || fieldLower === 'fieldid' || fieldLower === 'field') {
      return {
        serviceName: 'airtable',
        resourceType: 'field',
        description: 'Select a field',
      };
    }
  }

  // Trello integration fields
  if (serviceName === 'trello') {
    if (fieldLower.includes('board') || fieldLower === 'boardid' || fieldLower === 'board' || fieldLower === 'idboard') {
      return {
        serviceName: 'trello',
        resourceType: 'board',
        description: 'Select a Trello board',
      };
    }
    if (fieldLower.includes('list') || fieldLower === 'listid' || fieldLower === 'list' || fieldLower === 'idlist') {
      return {
        serviceName: 'trello',
        resourceType: 'list',
        description: 'Select a list within the board',
      };
    }
  }

  // Discord integration fields
  if (serviceName === 'discord') {
    if (fieldLower.includes('guild') || fieldLower === 'guildid' || fieldLower === 'guild' || fieldLower === 'server') {
      return {
        serviceName: 'discord',
        resourceType: 'guild',
        description: 'Select a Discord server (guild)',
      };
    }
    if (fieldLower.includes('channel') || fieldLower === 'channelid' || fieldLower === 'channel') {
      return {
        serviceName: 'discord',
        resourceType: 'channel',
        description: 'Select a Discord channel',
      };
    }
  }
  
  return null;
}

