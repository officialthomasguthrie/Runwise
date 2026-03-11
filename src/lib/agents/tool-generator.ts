/**
 * Tool Generator — LLM generates custom tools when the user needs capabilities
 * we don't have as native integrations (Teams webhook, scrapers, custom APIs).
 */

import OpenAI from 'openai';
import { validateCustomCode } from '@/lib/workflow-execution/sandbox-validation';
import { getToolsSpec } from './capabilities-spec';
import type { DeployAgentPlan, CustomToolSpec, CustomToolConfigKey } from './types';

// Services in INTEGRATION_CATALOGUE — the user connects these via OAuth/credential modal,
// so tools should NOT ask for credentials via configKeys; use requiredIntegrations instead.
const KNOWN_INTEGRATIONS: Record<string, string> = {
  'slack':            'slack',
  'gmail':            'google-gmail',
  'google-gmail':     'google-gmail',
  'google sheets':    'google-sheets',
  'google-sheets':    'google-sheets',
  'google drive':     'google-drive',
  'google-drive':     'google-drive',
  'google calendar':  'google-calendar',
  'google-calendar':  'google-calendar',
  'google forms':     'google-forms',
  'google-forms':     'google-forms',
  'discord':          'discord',
  'github':           'github',
  'notion':           'notion',
  'airtable':         'airtable',
  'trello':           'trello',
  'twitter':          'twitter',
  'twilio':           'twilio',
  'openai':           'openai',
  'stripe':           'stripe',
};

const SYSTEM_PROMPT = `You are a tool generator for Runwise agents. Your job: when a user wants an agent that needs capabilities we DON'T have natively, generate CUSTOM TOOLS that the agent will use at runtime.

SYSTEM TOOLS WE ALREADY HAVE (do NOT generate tools for these):
${getToolsSpec()}

Generate custom tools ONLY when the user needs something not in the list above. Examples:
- Microsoft Teams: send/post to Teams → send_teams_message (POST to a Teams Incoming Webhook URL)
- Scraping a specific site → generate a scraper tool using context.http.get
- Custom API (Shopify, HubSpot, Jira, etc.) → tool that calls that API

TOOL EXECUTION ENVIRONMENT:
- Code runs as: async (inputData, config, context) => { ... }
- context.http has: get(url, opts), post(url, data, opts), put(url, data, opts), patch(url, data, opts), delete(url, opts)
- For HTTP: use context.http.post(url, { key: value }) — NOT fetch()
- config contains user-provided values (webhook URL, paste-in API key) set during setup
- context.integrations is available for KNOWN services (Slack, GitHub, etc.) — the token is fetched automatically; the tool just calls context.http with Authorization Bearer
- NO: require, import, eval, process, Function, __dirname, __filename

KNOWN INTEGRATIONS — services users connect via OAuth/credential modal (do NOT use configKeys for credentials):
slack, google-gmail, google-sheets, google-drive, google-calendar, google-forms, discord, github, notion, airtable, trello, twitter, twilio, openai, stripe

RULES FOR CREDENTIALS:
- If the tool uses a KNOWN integration: set requiredIntegrations: ["service-id"] and DO NOT add configKeys for the API key or token. The user will connect via modal.
- If the tool uses an UNKNOWN service (e.g. Teams, Shopify, HubSpot, Jira, custom API): use configKeys for webhook URL or API key. Do NOT set requiredIntegrations.
- Never mix both for the same service.

OUTPUT FORMAT (JSON only):
{
  "customTools": [
    {
      "name": "snake_case_name",
      "description": "Clear description for the LLM to decide when to use this tool",
      "code": "async (inputData, config, context) => { ... }",
      "input_schema": {
        "type": "object",
        "properties": {
          "message": { "type": "string", "description": "..." }
        },
        "required": ["message"]
      },
      "requiredIntegrations": ["slack"],
      "configKeys": []
    }
  ]
}

EXAMPLES:
- send_teams_message: Uses Teams Incoming Webhook (NOT a known integration) → configKeys: [{ key: "webhookUrl", label: "Teams Webhook URL", description: "URL from your Teams channel" }], requiredIntegrations: []
- call_shopify_api: Shopify not a known integration → configKeys: [{ key: "apiKey", label: "Shopify API Key" }, { key: "baseUrl", label: "Store URL" }], requiredIntegrations: []
- post_to_slack_channel: Slack IS a known integration → requiredIntegrations: ["slack"], configKeys: []
- create_github_issue: GitHub IS a known integration → requiredIntegrations: ["github"], configKeys: []
- send_twilio_sms: Twilio IS a known integration → requiredIntegrations: ["twilio"], configKeys: []
- scraper tools with no secrets → configKeys: [], requiredIntegrations: []

RULES:
1. Generate ONLY when system tools cannot fulfill the request.
2. Return { "customTools": [] } if no custom tools are needed.
3. Name tools in snake_case. Description must be clear for function-calling.
4. Code must be valid JavaScript: async (inputData, config, context) => { ... }
5. input_schema must have type, properties, and required array.`;

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

      // Parse requiredIntegrations — only allow known service IDs
      const rawReqIntegrations: string[] = Array.isArray(spec.requiredIntegrations)
        ? spec.requiredIntegrations.filter((s: unknown) => typeof s === 'string' && Object.values(KNOWN_INTEGRATIONS).includes(s as string))
        : [];

      // Remove configKeys for credentials of known integrations (safety filter)
      const filteredConfigKeys = configKeys.filter((ck) => {
        const isCredentialKey = /api.?key|token|secret|password|credential/i.test(ck.key);
        if (!isCredentialKey) return true;
        // If the service for this key is a known integration, drop it
        return false;
      });

      validated.push({
        name: spec.name.trim(),
        description: spec.description.trim(),
        code: spec.code.trim(),
        input_schema: inputSchema as Record<string, unknown>,
        configKeys: filteredConfigKeys.length > 0 ? filteredConfigKeys : undefined,
        config_defaults: spec.config_defaults,
        requiredIntegrations: rawReqIntegrations.length > 0 ? rawReqIntegrations : undefined,
      });
    }

    return validated;
  } catch (err: any) {
    console.error('[ToolGenerator] Error:', err);
    return [];
  }
}
