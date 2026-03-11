/**
 * Tool Generator — LLM generates custom tools when the user needs capabilities
 * we don't have as native integrations (Teams webhook, scrapers, custom APIs).
 */

import OpenAI from 'openai';
import { validateCustomCode } from '@/lib/workflow-execution/sandbox-validation';
import { getToolsSpec } from './capabilities-spec';
import type { DeployAgentPlan, CustomToolSpec, CustomToolConfigKey } from './types';

const SYSTEM_PROMPT = `You are a tool generator for Runwise agents. Your job: when a user wants an agent that needs capabilities we DON'T have natively, generate CUSTOM TOOLS that the agent will use at runtime.

SYSTEM TOOLS WE ALREADY HAVE (do NOT generate tools for these):
${getToolsSpec()}

Generate custom tools ONLY when the user needs something not in the list above. Examples of when to generate:
- Microsoft Teams: user wants to send/post to Teams → generate send_teams_message (uses Incoming Webhook: POST to webhookUrl with { text: message })
- Scraping a specific site: user wants to scrape/extract data from a website → generate a scraper tool
- Custom API: user wants to call a specific API (Shopify, etc.) → generate a tool that uses context.http

TOOL EXECUTION ENVIRONMENT:
- Code runs as: async (inputData, config, context) => { ... }
- context.http has: get(url, opts), post(url, data, opts), put(url, data, opts), patch(url, data, opts), delete(url, opts)
- For HTTP: use context.http.post(url, { key: value }) — NOT fetch()
- config contains user-provided values (webhook URL, API key) from questionnaire
- NO: require, import, eval, process, Function, __dirname, __filename

OUTPUT FORMAT (JSON only):
{
  "customTools": [
    {
      "name": "snake_case_name",
      "description": "Clear description for the LLM to decide when to use this tool",
      "code": "async (inputData, config, context) => { const url = inputData.webhookUrl || config.webhookUrl; const res = await context.http.post(url, { text: inputData.message }); return res; }",
      "input_schema": {
        "type": "object",
        "properties": {
          "webhookUrl": { "type": "string", "description": "..." },
          "message": { "type": "string", "description": "..." }
        },
        "required": ["message"]
      },
      "configKeys": [
        { "key": "webhookUrl", "label": "Teams Incoming Webhook URL", "description": "URL from your Teams channel Incoming Webhook" }
      ]
    }
  ]
}

RULES:
1. Generate ONLY when system tools cannot fulfill the request.
2. Return { "customTools": [] } if no custom tools are needed.
3. Name tools in snake_case. Description must be clear for function-calling.
4. Code must be valid JavaScript: async (inputData, config, context) => { ... }
5. input_schema must have type, properties, and required array.
6. configKeys: Add for any value the user must provide during setup (webhook URL, API key, base URL). Each tool that reads from config needs configKeys. Examples:
   - send_teams_message → configKeys: [{ key: "webhookUrl", label: "Teams Incoming Webhook URL", description: "URL from your Teams channel Incoming Webhook" }]
   - call_shopify_api → configKeys: [{ key: "apiKey", label: "Shopify API Key", description: "Your Shopify API access token" }, { key: "baseUrl", label: "Shopify Store URL", description: "e.g. https://your-store.myshopify.com" }]
   - scraper tools or tools that need no secrets → configKeys: [] or omit`;

function parseConfigKeys(
  raw: unknown,
  toolName: string
): CustomToolConfigKey[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: CustomToolConfigKey[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as any).key === 'string' &&
      typeof (item as any).label === 'string'
    ) {
      out.push({
        key: String((item as any).key).trim(),
        label: String((item as any).label).trim(),
        description: typeof (item as any).description === 'string' ? (item as any).description.trim() : '',
      });
    }
  }
  return out;
}

/**
 * Generate custom tools for an agent plan when the user needs capabilities we don't have natively.
 */
export async function generateCustomTools(
  description: string,
  plan: DeployAgentPlan
): Promise<CustomToolSpec[]> {
  if (!process.env.OPENAI_API_KEY) {
    return [];
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const userPrompt = `User description: "${description}"

Plan instructions: "${plan.instructions}"

Generate custom tools if needed. If our system tools can fulfill the request, return { "customTools": [] }.
Output JSON only, no markdown.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    let parsed: { customTools?: CustomToolSpec[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      console.warn('[ToolGenerator] Failed to parse LLM response as JSON:', content.slice(0, 200));
      return [];
    }

    const raw = Array.isArray(parsed.customTools) ? parsed.customTools : [];

    const validated: CustomToolSpec[] = [];
    for (const spec of raw) {
      if (!spec?.name || typeof spec.name !== 'string') continue;
      if (!spec?.description || typeof spec.description !== 'string') continue;
      if (!spec?.code || typeof spec.code !== 'string') continue;

      const validation = validateCustomCode(spec.code);
      if (!validation.valid) {
        console.warn(`[ToolGenerator] Skipping tool "${spec.name}": ${validation.errors.join(', ')}`);
        continue;
      }

      const inputSchema =
        spec.input_schema && typeof spec.input_schema === 'object'
          ? spec.input_schema
          : { type: 'object', properties: {}, required: [] as string[] };

      if (inputSchema.type !== 'object') {
        (inputSchema as any).type = 'object';
      }
      if (!(inputSchema as any).properties) {
        (inputSchema as any).properties = {};
      }
      if (!Array.isArray((inputSchema as any).required)) {
        (inputSchema as any).required = [];
      }

      const configKeys = parseConfigKeys(spec.configKeys, spec.name);

      validated.push({
        name: spec.name.trim(),
        description: spec.description.trim(),
        code: spec.code.trim(),
        input_schema: inputSchema as Record<string, unknown>,
        configKeys: configKeys.length > 0 ? configKeys : undefined,
        config_defaults: spec.config_defaults,
      });
    }

    return validated;
  } catch (err: any) {
    console.error('[ToolGenerator] Error:', err);
    return [];
  }
}
