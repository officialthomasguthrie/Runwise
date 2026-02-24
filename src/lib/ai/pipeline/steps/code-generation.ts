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
    
    // Find all custom nodes that need code generation.
    // Treat comment-only strings and placeholder strings as "no code" so that
    // workflow-generation step scaffolding comments don't block code generation.
    const isRealCode = (code: unknown): boolean => {
      if (!code || typeof code !== 'string') return false;
      const trimmed = code.trim();
      if (trimmed.length === 0) return false;
      // Treat comment-only strings as no code
      if (/^\/\*[\s\S]*\*\/$/.test(trimmed)) return false;
      if (/^\/\/.*$/.test(trimmed)) return false;
      // Treat placeholder strings that don't look like actual async functions
      if (!trimmed.includes('async') && !trimmed.includes('=>') && !trimmed.includes('function')) return false;
      return true;
    };

    const customNodesNeedingCode = workflow.nodes.filter((node) => {
      const nodeDataFilter = node.data as any;
      const nodeId = nodeDataFilter?.nodeId;
      return nodeId === 'CUSTOM_GENERATED' && !isRealCode(nodeDataFilter?.customCode);
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
      const systemPrompt = `You are an expert JavaScript code generator for workflow automation nodes. Generate production-ready code with proper configuration fields.

NODE TO BUILD:
- Description: ${nodeDescription}
- Requirements: ${nodeRequirements}
- Node type: ${nodeData?.metadata?.type || 'transform'}

════════════════════════════════════════════════════
PARAMETERIZATION MANDATE — MOST IMPORTANT RULE
════════════════════════════════════════════════════
Every meaningful value in your code MUST come from config.*, not be hardcoded.
A node with an empty configSchema is BROKEN — users cannot configure it.

ALWAYS put these in config:
✅ API-specific identifiers → config.cryptoId, config.stockSymbol, config.countryCode, config.city, config.searchQuery
✅ API keys for non-integrated services → config.apiKey
✅ Resource names/IDs → config.spreadsheetId, config.databaseId, config.repoName, config.tableName
✅ Selectable parameters → config.currency, config.language, config.format, config.unit, config.model
✅ Limits/thresholds → config.limit, config.maxResults, config.threshold
✅ Message templates → config.subject, config.message, config.prompt, config.template
✅ Endpoint paths → config.webhookUrl, config.baseUrl, config.endpoint

NEVER hardcode these — always use config.*:
❌ "bitcoin" → ✅ config.cryptoId (default: "bitcoin")
❌ "usd" → ✅ config.currency (select field, default: "usd")
❌ "London" → ✅ config.city
❌ "10" as a limit → ✅ config.limit (default: 10)
❌ any query parameter that a user might want to change

MINIMUM configSchema REQUIREMENT:
Every node MUST have at least 1 configSchema field. Nodes calling APIs must have fields for their key parameters.
If you cannot identify configurable parameters, think harder — there is always something configurable.

════════════════════════════════════════════════════
CODE RULES
════════════════════════════════════════════════════
- Format: async (inputData, config, context) => { ... return result; }
- Use context.http.get/post/put/delete for ALL HTTP requests (never fetch or axios)
- Use context.logger.info/error/warn for logging
- Always wrap in try/catch, return { success: false, error: error.message } on failure
- Return structured objects with success: true/false and meaningful fields
- No require(), import, eval(), process access

════════════════════════════════════════════════════
INTEGRATION CREDENTIALS
════════════════════════════════════════════════════
For known integrations, use context.auth — NOT config — for credentials:
  * Google (Sheets, Gmail, Drive, Calendar): context.auth.google.token
  * Slack: context.auth.slack.token
  * GitHub: context.auth.github.token
  * Notion: context.auth.notion.token
  * Airtable: context.auth.airtable.token
  * OpenAI: context.auth.openai.apiKey
  * SendGrid: context.auth.sendgrid.apiKey
  * Twilio: context.auth.twilio.credentials.accountSid / .authToken
  * Stripe: context.auth.stripe.apiKey
  * Discord: context.auth.discord.token
  * Twitter: context.auth.twitter.token

For generic/unknown/public APIs: config.apiKey in configSchema IS correct.
NEVER put apiKey/authToken/secretKey/accessToken in configSchema for the known integrations above.

════════════════════════════════════════════════════
CONFIG SCHEMA FORMAT
════════════════════════════════════════════════════
Each field:
  * type: "string" | "number" | "textarea" | "select"
  * label: Human-readable name (e.g. "Cryptocurrency ID", NOT "cryptoId")
  * description: Purpose + examples (e.g. "CoinGecko ID, e.g. 'bitcoin', 'ethereum', 'solana'")
  * required: true if code breaks without it
  * default: Always provide sensible defaults when possible
  * options: [{value, label}] array — only for "select" type

For integration-dependent resource fields (Slack channels, Sheets spreadsheets, etc.):
  * Add serviceName: "slack" | "google-sheets" | "notion" | "github" | etc.
  * Add resourceType: "channel" | "spreadsheet" | "sheet" | "database" | "repository" | etc.
  * Omit options — the UI fetches them automatically

════════════════════════════════════════════════════
EXAMPLES — Study these carefully
════════════════════════════════════════════════════

Example 1: Fetch crypto price — public API, all params in config (CORRECT)
{
  "customCode": "async (inputData, config, context) => { try { const cryptoId = config.cryptoId || 'bitcoin'; const currency = config.currency || 'usd'; const response = await context.http.get(\`https://api.coingecko.com/api/v3/simple/price?ids=\${encodeURIComponent(cryptoId)}&vs_currencies=\${currency}\`); const price = response[cryptoId]?.[currency]; if (price === undefined) { return { success: false, error: \`No price found for \${cryptoId}\`, cryptoId, currency }; } return { success: true, cryptoId, currency, price, formattedPrice: \`\${price} \${currency.toUpperCase()}\`, timestamp: new Date().toISOString() }; } catch (error) { context.logger.error('Failed to fetch crypto price:', error); return { success: false, error: error.message }; } }",
  "configSchema": {
    "cryptoId": {
      "type": "string",
      "label": "Cryptocurrency ID",
      "description": "CoinGecko cryptocurrency ID, e.g. 'bitcoin', 'ethereum', 'solana', 'cardano'",
      "required": true,
      "default": "bitcoin"
    },
    "currency": {
      "type": "select",
      "label": "Currency",
      "description": "Target currency for price conversion",
      "required": true,
      "default": "usd",
      "options": [
        {"value": "usd", "label": "USD ($)"},
        {"value": "eur", "label": "EUR (€)"},
        {"value": "gbp", "label": "GBP (£)"},
        {"value": "jpy", "label": "JPY (¥)"},
        {"value": "aud", "label": "AUD (A$)"},
        {"value": "btc", "label": "BTC (₿)"},
        {"value": "eth", "label": "ETH (Ξ)"}
      ]
    }
  },
  "outputs": ["cryptoId", "currency", "price", "formattedPrice", "timestamp"]
}

Example 2: Get weather — API key in config (OpenWeather is NOT a built-in integration)
{
  "customCode": "async (inputData, config, context) => { try { const city = config.city || 'London'; const units = config.units || 'metric'; const url = \`https://api.openweathermap.org/data/2.5/weather?q=\${encodeURIComponent(city)}&units=\${units}&appid=\${config.apiKey}\`; const data = await context.http.get(url); return { success: true, city: data.name, country: data.sys.country, temperature: data.main.temp, feelsLike: data.main.feels_like, humidity: data.main.humidity, description: data.weather[0].description, windSpeed: data.wind.speed, units }; } catch (error) { context.logger.error('Weather fetch failed:', error); return { success: false, error: error.message }; } }",
  "configSchema": {
    "city": {
      "type": "string",
      "label": "City",
      "description": "City name to get weather for, e.g. 'London', 'New York', 'Tokyo'",
      "required": true,
      "default": "London"
    },
    "apiKey": {
      "type": "string",
      "label": "OpenWeatherMap API Key",
      "description": "Your API key from openweathermap.org (free tier available)",
      "required": true
    },
    "units": {
      "type": "select",
      "label": "Temperature Units",
      "description": "Unit system for temperature values",
      "required": false,
      "default": "metric",
      "options": [
        {"value": "metric", "label": "Celsius (metric)"},
        {"value": "imperial", "label": "Fahrenheit (imperial)"},
        {"value": "standard", "label": "Kelvin (standard)"}
      ]
    }
  }
}

Example 3: Generic webhook POST — URL in config
{
  "customCode": "async (inputData, config, context) => { try { const headers = { 'Content-Type': 'application/json' }; if (config.apiKey) headers['Authorization'] = \`Bearer \${config.apiKey}\`; const payload = { data: inputData, timestamp: new Date().toISOString() }; const response = await context.http.post(config.webhookUrl, payload, { headers }); return { success: true, response }; } catch (error) { context.logger.error('Webhook call failed:', error); return { success: false, error: error.message }; } }",
  "configSchema": {
    "webhookUrl": {
      "type": "string",
      "label": "Webhook URL",
      "description": "The URL to POST data to",
      "required": true
    },
    "apiKey": {
      "type": "string",
      "label": "API Key (optional)",
      "description": "Bearer token for Authorization header (leave blank if not needed)",
      "required": false
    }
  }
}

Example 4: Add row to Google Sheets — integration auth + integration-dependent fields
{
  "customCode": "async (inputData, config, context) => { try { const token = context.auth.google.token; const values = config.rowData ? config.rowData.split(',').map(v => v.trim()) : Object.values(inputData); const url = \`https://sheets.googleapis.com/v4/spreadsheets/\${config.spreadsheetId}/values/\${encodeURIComponent(config.sheetName || 'Sheet1')}:append?valueInputOption=USER_ENTERED\`; const response = await context.http.post(url, { values: [values] }, { headers: { Authorization: \`Bearer \${token}\`, 'Content-Type': 'application/json' } }); return { success: true, updatedCells: response.updates?.updatedCells || 0, updatedRange: response.updates?.updatedRange }; } catch (error) { context.logger.error('Google Sheets append failed:', error); return { success: false, error: error.message }; } }",
  "configSchema": {
    "spreadsheetId": {
      "type": "string",
      "label": "Spreadsheet",
      "description": "Select the Google Spreadsheet to write to",
      "required": true,
      "serviceName": "google-sheets",
      "resourceType": "spreadsheet"
    },
    "sheetName": {
      "type": "string",
      "label": "Sheet Tab",
      "description": "Name of the tab within the spreadsheet",
      "required": false,
      "default": "Sheet1",
      "serviceName": "google-sheets",
      "resourceType": "sheet"
    },
    "rowData": {
      "type": "string",
      "label": "Row Data (comma-separated)",
      "description": "Values to add as a row, comma-separated. Leave blank to use all input data.",
      "required": false
    }
  }
}

Example 5: Create GitHub issue — integration auth + integration-dependent field
{
  "customCode": "async (inputData, config, context) => { try { const token = context.auth.github.token; const [owner, repo] = (config.repository || '').split('/'); if (!owner || !repo) { return { success: false, error: 'Repository must be in format owner/repo' }; } const body = { title: config.title || inputData.title || 'New Issue', body: config.body || inputData.body || '', labels: config.labels ? config.labels.split(',').map(l => l.trim()) : [] }; const response = await context.http.post(\`https://api.github.com/repos/\${owner}/\${repo}/issues\`, body, { headers: { Authorization: \`Bearer \${token}\`, 'Content-Type': 'application/json', 'User-Agent': 'Runwise-Workflow' } }); return { success: true, issueNumber: response.number, issueUrl: response.html_url, title: response.title }; } catch (error) { context.logger.error('GitHub issue creation failed:', error); return { success: false, error: error.message }; } }",
  "configSchema": {
    "repository": {
      "type": "string",
      "label": "Repository",
      "description": "Select the GitHub repository",
      "required": true,
      "serviceName": "github",
      "resourceType": "repository"
    },
    "title": {
      "type": "string",
      "label": "Issue Title",
      "description": "Title for the GitHub issue (can use {{inputData.field}} syntax)",
      "required": false
    },
    "body": {
      "type": "textarea",
      "label": "Issue Body",
      "description": "Description for the issue (can use {{inputData.field}} syntax)",
      "required": false
    },
    "labels": {
      "type": "string",
      "label": "Labels (comma-separated)",
      "description": "Comma-separated label names, e.g. 'bug, urgent'",
      "required": false
    }
  }
}

════════════════════════════════════════════════════
OUTPUTS DECLARATION (REQUIRED)
════════════════════════════════════════════════════
You MUST also declare what fields your code returns in an "outputs" array.
- List every top-level key your return object contains (besides "success" and "error")
- These field names will be shown to users in downstream nodes as available variables
- Example: if you return { success: true, price: 1234, currency: "usd", timestamp: "..." }
  → outputs: ["price", "currency", "timestamp"]
- Be specific and accurate — these become the {{inputData.fieldName}} references users see

VALIDATION CHECKLIST (apply before returning)
════════════════════════════════════════════════════
Before generating your JSON output, verify:
☑ configSchema has AT LEAST 1 field (never return empty {})
☑ Every config.fieldName used in code has a matching configSchema entry
☑ No credential fields in configSchema for known integrations (use context.auth instead)
☑ All fields have label, description, type, required
☑ Sensible defaults provided where applicable
☑ Integration resource fields have serviceName + resourceType
☑ code is wrapped in try/catch
☑ Return value has success: true/false
☑ outputs array lists every field returned (excluding success/error)

Return ONLY a JSON object with "customCode", "configSchema", and "outputs" keys.`;

      // Build user message with node requirements
      const userMessage = `Generate custom code for a workflow node with these requirements:

Description: ${nodeDescription}
Requirements: ${nodeRequirements}

Remember: configSchema MUST have at least 1 field. Use config.* for every parameter a user might want to configure — never hardcode values like cryptocurrency IDs, city names, query parameters, limits, etc.`;

      // Helper: call OpenAI and parse the result
      const callCodeGen = async (msgs: { role: 'system' | 'user' | 'assistant'; content: string }[]) => {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: msgs,
          temperature: 0.3,
          max_tokens: 2500,
        });
        return {
          content: completion.choices[0]?.message?.content || null,
          inputTokens: completion.usage?.prompt_tokens || 0,
          outputTokens: completion.usage?.completion_tokens || 0,
        };
      };

      // First attempt
      const attempt1 = await callCodeGen([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ]);

      totalInputTokens += attempt1.inputTokens;
      totalOutputTokens += attempt1.outputTokens;

      if (!attempt1.content) {
        console.warn(`No response from OpenAI for node ${node.id}, skipping code generation`);
        continue;
      }

      // Parse JSON response
      let codeResult: { customCode?: string; configSchema?: Record<string, any>; outputs?: string[] };
      try {
        codeResult = JSON.parse(attempt1.content);
      } catch (parseError) {
        console.error(`Error parsing code generation response for node ${node.id}:`, parseError);
        continue;
      }

      // Validate required fields
      if (!codeResult.customCode || typeof codeResult.customCode !== 'string') {
        console.warn(`Invalid customCode for node ${node.id}, skipping`);
        continue;
      }

      // ── Retry if configSchema is empty ────────────────────────────────────
      // An empty configSchema means users can't configure the node — always retry once.
      const schemaIsEmpty = !codeResult.configSchema || Object.keys(codeResult.configSchema).length === 0;
      if (schemaIsEmpty) {
        console.warn(`[Code Generation] configSchema is empty for node ${node.id} — retrying with stricter parameterization prompt`);

        const retryUserMessage = `PROBLEM: Your previous response had an EMPTY configSchema. That is NOT acceptable.

You must generate code that uses config.* variables for every user-configurable value.

Node description: ${nodeDescription}
Node requirements: ${nodeRequirements}

Previous code (for reference — FIX the hardcoded values):
${codeResult.customCode}

REQUIRED FIXES:
1. Identify every hardcoded value (API identifiers, query params, IDs, limits, names, etc.)
2. Replace each hardcoded value with config.fieldName
3. Add a configSchema entry for EVERY config.fieldName used in the code
4. The configSchema MUST have at least 1 field — returning {} will break the node

Regenerate both customCode and configSchema now.`;

        const attempt2 = await callCodeGen([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
          { role: 'assistant', content: attempt1.content },
          { role: 'user', content: retryUserMessage },
        ]);

        totalInputTokens += attempt2.inputTokens;
        totalOutputTokens += attempt2.outputTokens;

        if (attempt2.content) {
          try {
            const retryResult: { customCode?: string; configSchema?: Record<string, any>; outputs?: string[] } = JSON.parse(attempt2.content);
            if (retryResult.customCode && typeof retryResult.customCode === 'string') {
              codeResult = retryResult;
              console.log(`[Code Generation] Retry succeeded for node ${node.id}, configSchema keys: ${Object.keys(retryResult.configSchema || {}).join(', ')}`);
            }
          } catch {
            console.warn(`[Code Generation] Could not parse retry response for node ${node.id}, using original`);
          }
        }
      }
      // ──────────────────────────────────────────────────────────────────────

      // Validate and extract config references from code
      const configSchema = codeResult.configSchema || {};
      const finalCode = codeResult.customCode!;
      const configReferences = extractConfigReferences(finalCode);

      // Detect integration from API endpoints in customCode
      const detectedIntegration = detectIntegrationFromCode(finalCode);
      
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
      nodeDataUpdate.customCode = finalCode;
      nodeDataUpdate.configSchema = configSchema;

      // Ensure metadata exists
      if (!nodeDataUpdate.metadata) {
        nodeDataUpdate.metadata = {};
      }
      nodeDataUpdate.metadata.generatedBy = 'ai';

      // Persist declared output fields so downstream nodes can reference them
      // as available {{inputData.fieldName}} variables.
      if (Array.isArray(codeResult.outputs) && codeResult.outputs.length > 0) {
        nodeDataUpdate.metadata.outputs = codeResult.outputs.filter(
          (f: any) => typeof f === 'string' && f.length > 0
        );
        console.log(`[Code Generation] Node ${node.id} declares outputs: ${nodeDataUpdate.metadata.outputs.join(', ')}`);
      }
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

