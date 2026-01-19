/**
 * AI Workflow Generation Helper
 * Core logic for generating workflows using OpenAI
 */

import OpenAI from 'openai';
import type { NodeDefinition } from '@/lib/nodes/types';
import type {
  WorkflowGenerationRequest,
  AIGeneratedWorkflow,
  WorkflowGenerationResponse,
} from './types';
import { nodeRegistry } from '@/lib/nodes';
import { formatIntegrationContextForPrompt } from '@/lib/integrations/ai-context';
import { runWorkflowGenerationPipeline } from './pipeline/orchestrator';

/**
 * Generate a workflow from a natural language prompt with streaming support
 */
export async function generateWorkflowFromPromptStreaming(
  request: WorkflowGenerationRequest & {
    onChunk: (jsonChunk: string, isComplete: boolean) => void;
    onComplete: (workflow: AIGeneratedWorkflow, tokenUsage?: { inputTokens: number; outputTokens: number }) => void;
    onError: (error: Error) => void;
  }
): Promise<void> {
  // Filter nodes to only include those with available integrations (maintain backward compatibility)
    const filteredNodes = filterNodesByAvailableIntegrations(request.availableNodes);

  // Call the pipeline orchestrator with filtered nodes
  // The orchestrator handles all 5 steps: intent analysis, node matching, workflow generation, code generation, and validation
  // It maintains backward compatibility by preserving the same interface and callback behavior
  await runWorkflowGenerationPipeline({
    ...request,
    availableNodes: filteredNodes, // Use filtered nodes for backward compatibility
    onChunk: request.onChunk, // Pass through chunks (includes step-progress and JSON chunks from Step 3)
    onComplete: request.onComplete, // Pass through completion callback with workflow and token usage
    onError: request.onError, // Pass through error callback
  });
}

/* ============================================================================
 * OLD SINGLE-STEP IMPLEMENTATION (replaced by pipeline orchestrator)
 * ============================================================================
 * The previous implementation used a single GPT-4o call to generate workflows.
 * It has been replaced by a 5-step pipeline:
 * 1. Intent Analysis (gpt-4o-mini) - Extract requirements
 * 2. Node Matching (gpt-4o-mini) - Match to library nodes or identify custom needs
 * 3. Workflow Generation (gpt-4o) - Generate complete workflow structure
 * 4. Code Generation (gpt-4o) - Generate custom code for CUSTOM_GENERATED nodes
 * 5. Validation (gpt-4o-mini) - Validate and refine workflow
 * 
 * Benefits of the pipeline approach:
 * - Better cost optimization (uses cheaper models for simple steps)
 * - Improved quality (specialized prompts for each step)
 * - Better error handling (can fail gracefully at any step)
 * - Easier to maintain and extend (each step is isolated)
 * - More accurate token usage tracking (from actual API responses)
 * ============================================================================
 * 
 * OLD IMPLEMENTATION (kept for reference):
 * 
 * try {
 *   // Initialize OpenAI client (only runs server-side in API routes)
 *   const openai = new OpenAI({
 *     apiKey: process.env.OPENAI_API_KEY,
 *   });
 *   
 *   // Build the system prompt with available nodes (same as non-streaming version)
 *   // Filter nodes to only include those with available integrations
 *   const filteredNodes = filterNodesByAvailableIntegrations(request.availableNodes);
 *   const availableNodesList = filteredNodes
 *     .map((node) => {
 *       const nodeDef = nodeRegistry[node.id];
 *       const configFields = nodeDef
 *         ? Object.keys(nodeDef.configSchema)
 *             .map((key) => {
 *               const field = nodeDef.configSchema[key];
 *               return `    - ${key} (${field.type}${field.required ? ', required' : ''}): ${field.description}`;
 *             })
 *             .join('\n')
 *         : '    - config: {}';
 * 
 *       return `
 * ${node.type.toUpperCase()}: ${node.name} (ID: ${node.id})
 *   Description: ${node.description}
 *   Category: ${node.category}
 *   Configuration:
 * ${configFields}`;
 *     })
 *     .join('\n\n');
 * 
 *   const systemPrompt = `[... full system prompt ...]`;
 * 
 *   const userPrompt = request.userPrompt;
 * 
 *   // Check if modifying existing workflow
 *   let contextPrompt = '';
 *   if (request.existingNodes && request.existingNodes.length > 0) {
 *     contextPrompt = `[... context prompt ...]`;
 *   }
 * 
 *   // Use streaming API
 *   const stream = await openai.chat.completions.create({
 *     model: 'gpt-4o',
 *     response_format: { type: 'json_object' },
 *     messages: [
 *       {
 *         role: 'system',
 *         content: systemPrompt,
 *       },
 *       {
 *         role: 'user',
 *         content: userPrompt + contextPrompt,
 *       },
 *     ],
 *     temperature: 0.3,
 *     max_tokens: 4000,
 *     stream: true, // Enable streaming
 *   });
 * 
 *   let fullContent = '';
 * 
 *   // Stream the response
 *   for await (const chunk of stream) {
 *     const content = chunk.choices[0]?.delta?.content || '';
 *     if (content) {
 *       fullContent += content;
 *       
 *       // Send the accumulated content as it streams (even if incomplete JSON)
 *       request.onChunk(fullContent, false);
 *     }
 *   }
 * 
 *   // Estimate token usage (streaming doesn't provide usage in chunks)
 *   // Rough estimate: ~4 characters per token
 *   const systemPromptTokens = Math.ceil(systemPrompt.length / 4);
 *   const userPromptTokens = Math.ceil((userPrompt + contextPrompt).length / 4);
 *   const inputTokens = systemPromptTokens + userPromptTokens;
 *   const outputTokens = Math.ceil(fullContent.length / 4);
 * 
 *   // Send final chunk
 *   request.onChunk(fullContent, true);
 *   
 *   // Store token usage for credit calculation (accessible via onComplete callback)
 *   (request as any).tokenUsage = {
 *     inputTokens,
 *     outputTokens,
 *   };
 * 
 *   // Parse the complete JSON response
 *   let generatedWorkflow: AIGeneratedWorkflow;
 *   try {
 *     generatedWorkflow = JSON.parse(fullContent);
 *   } catch (parseError) {
 *     console.error('Error parsing AI response:', parseError);
 *     console.error('Response content:', fullContent);
 *     request.onError(new Error('Invalid JSON response from AI'));
 *     return;
 *   }
 * 
 *   // Validate that all node IDs exist in the library
 *   const invalidNodes = generatedWorkflow.nodes
 *     .filter((node) => !nodeRegistry[node.data.nodeId])
 *     .map((node) => node.data.nodeId);
 * 
 *   if (invalidNodes.length > 0) {
 *     console.warn('AI generated nodes not in library:', invalidNodes);
 *   }
 * 
 *   // Ensure all edges have the correct style
 *   generatedWorkflow.edges = generatedWorkflow.edges.map((edge) => ({
 *     ...edge,
 *     type: 'buttonedge',
 *     animated: true,
 *     style: edge.style || {
 *       stroke: 'hsl(var(--primary))',
 *       strokeWidth: 2,
 *     },
 *   }));
 * 
 *   // Call onComplete with the final workflow and token usage
 *   request.onComplete(generatedWorkflow, {
 *     inputTokens,
 *     outputTokens,
 *   });
 * } catch (error: any) {
 *   console.error('Error generating workflow:', error);
 *   request.onError(error);
 * }
 */

/**
 * Generate a workflow from a natural language prompt
 */
export async function generateWorkflowFromPrompt(
  request: WorkflowGenerationRequest
): Promise<WorkflowGenerationResponse> {
  try {
    // Initialize OpenAI client (only runs server-side in API routes)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    // Build the system prompt with available nodes
    // Filter nodes to only include those with available integrations
    const filteredNodes = filterNodesByAvailableIntegrations(request.availableNodes);
    const availableNodesList = filteredNodes
      .map((node) => {
        const nodeDef = nodeRegistry[node.id];
        const configFields = nodeDef
          ? Object.keys(nodeDef.configSchema)
              .map((key) => {
                const field = nodeDef.configSchema[key];
                return `    - ${key} (${field.type}${field.required ? ', required' : ''}): ${field.description}`;
              })
              .join('\n')
          : '    - config: {}';

        return `
${node.type.toUpperCase()}: ${node.name} (ID: ${node.id})
  Description: ${node.description}
  Category: ${node.category}
  Configuration:
${configFields}`;
      })
      .join('\n\n');

    const systemPrompt = `You are an expert workflow automation AI. Your task is to analyze natural language prompts and generate complete, functional workflows using BOTH library nodes AND custom code.

INTEGRATION GUIDANCE:
- Prefer library nodes when available (they're pre-tested and secure)
- Available library integrations: Google (Sheets, Calendar, Drive, Gmail, Forms), Slack, GitHub, Notion, Airtable, Trello, OpenAI, SendGrid, Twilio, Stripe, Discord, Twitter/X, PayPal
- If a service isn't in the library, generate a custom node with customCode to call the API directly
- Custom nodes can integrate with ANY service via HTTP requests - use context.http.get/post/put/delete
- Users can provide API keys and credentials through the configSchema you define
- Always generate workflows when possible - use custom nodes to bridge any gaps

HYBRID WORKFLOW GENERATION (Library + Custom Nodes):
1. Analyze the user's request and break it into logical steps
2. PREFER library nodes when they match requirements (80% of cases)
3. GENERATE custom code when library doesn't have needed functionality (20% of cases)
4. Connect nodes in the correct order (trigger → transform → action)
5. Use placeholder positions (x: 0, y: 0) - auto-layout will optimize spacing
6. Focus on logical connections, not coordinates
7. ALWAYS provide clear, concise descriptions for EVERY node (1-2 sentences explaining what it does)

LIBRARY NODES (Use When Possible):
${availableNodesList}

CUSTOM NODE GENERATION (Use When Needed):
When library nodes don't cover the requirement, generate a custom node:
- Set nodeId: "CUSTOM_GENERATED"
- Include customCode: JavaScript async function
- Provide clear metadata (name, description)
- Include a "description" field in data (REQUIRED - explain what the node does)
- Code format: async (inputData, config, context) => { /* your code */ return result; }
- **CRITICAL**: Include a "configSchema" object in data that defines ALL configuration fields the node needs
- The configSchema must match the config values used in customCode (e.g., if code uses config.apiKey, schema must include apiKey field)
- Analyze the customCode to identify ALL config values it uses and create a schema field for EACH one

DESCRIPTION GUIDELINES:
- Write descriptions in 1-2 clear, concise sentences
- Explain WHAT the node does, not HOW it works
- Use action verbs (e.g., "Sends an email", "Fetches data", "Validates input")
- Be specific about the node's purpose (e.g., "Fetches current Bitcoin price from CoinGecko API" not "Gets data")
- Include key details that help users understand the node's function
- Examples:
  ✅ Good: "Sends a confirmation email to the customer with order details and tracking information"
  ✅ Good: "Validates the submitted form data and checks for required fields like email and name"
  ❌ Bad: "Does some stuff"
  ❌ Bad: "Node that processes things"

Custom Code Rules:
- Always use async/await for API calls
- Use context.http.get/post/put/delete for HTTP requests
- Use context.logger for logging
- Return structured data objects
- Handle errors gracefully with try/catch
- No require(), import, eval(), or process access
- Access config values via config object
- Access previous node output via inputData

Example Custom Node:
{
  "id": "custom-node-1",
  "type": "workflow-node",
  "position": { "x": 0, "y": 0 },
  "data": {
    "nodeId": "CUSTOM_GENERATED",
    "label": "Fetch Crypto Price",
    "description": "Fetches cryptocurrency price from CoinGecko API",
    "customCode": "async (inputData, config, context) => { const response = await context.http.get(\`https://api.coingecko.com/api/v3/simple/price?ids=\${config.cryptoId}&vs_currencies=usd\`); return { price: response[config.cryptoId].usd, timestamp: new Date().toISOString() }; }",
    "configSchema": {
      "cryptoId": {
        "type": "string",
        "label": "Cryptocurrency ID",
        "description": "The CoinGecko cryptocurrency ID (e.g., 'bitcoin', 'ethereum')",
        "required": true
      }
    },
    "metadata": {
      "name": "Fetch Crypto Price",
      "description": "Fetches cryptocurrency price from CoinGecko API",
      "type": "transform",
      "generatedBy": "ai"
    }
  }
}

CONFIG SCHEMA FORMAT:
The configSchema must be an object where each key is a config field name, and the value is an object with:
- type: "string" | "number" | "textarea" | "select"
- label: Human-readable field name
- description: What this field is for
- required: true/false (true if the customCode requires this value)
- options: Array of {value, label} objects (only for type: "select")
- default: Optional default value

Analyze the customCode carefully to identify ALL config values it uses (e.g., config.apiKey, config.url, config.method, config.cryptoId) and create a schema field for EACH one. If the code uses config.something, there MUST be a corresponding field in configSchema.

NODE POSITIONING:
- Use position: { x: 0, y: 0 } for ALL nodes (auto-layout handles positioning)
- Focus on creating logical connections between nodes
- The layout algorithm will calculate optimal positions automatically

EDGE CONNECTIONS:
- All edges use type: "buttonedge"
- All edges have animated: true
- All edges have style: { stroke: "hsl(var(--primary))", strokeWidth: 2 }
- Connect nodes in logical order: trigger → transform → action

OUTPUT MAPPING (CRITICAL):
- When a node receives input from a previous node, use template syntax to map outputs to inputs
- Template format: {{inputData.fieldName}} where fieldName is an output from the previous node
- Example: If "Summarize Email" node outputs {summary: "..."}, then "Send Email" body should be "{{inputData.summary}}"
- Always map outputs to inputs in the config when nodes are connected:
  * If node-2 follows node-1, and node-1 outputs {text, result}, then node-2's config should use {{inputData.text}} or {{inputData.result}}
  * For email workflows: body should use {{inputData.summary}} or {{inputData.reply}} from previous nodes
  * For AI workflows: input should use {{inputData.content}} or {{inputData.text}} from previous nodes
- When generating config values, use template syntax for fields that should come from previous nodes
- Only use static values for fields that don't depend on previous nodes (like API keys, static text, etc.)

DECISION TREE FOR NODE SELECTION:
1. Check if library has exact match → Use library node
2. Check if library has close match → Use library node with config
3. Functionality is custom/unique → Generate custom node
4. Complex logic needed → Generate custom node
5. API not in library → Generate custom node with API call

IMPORTANT:
- Return ONLY valid JSON, no markdown, no explanations outside JSON
- Use library nodes whenever possible (they're pre-tested and secure)
- Generate custom code only when truly needed
- Ensure custom code is clean, efficient, and well-structured
- Make logical connections (data flows from trigger → transform → action)
- Always include error handling in custom code
- **DO NOT** include "config" objects in node data - users will configure these through the UI
- Configuration will be filled in by users after workflow generation

Return a JSON object with this exact structure:
{
  "nodes": [
    {
      "id": "node-1",
      "type": "workflow-node",
      "position": { "x": 0, "y": 0 },
      "data": {
        "nodeId": "library-node-id-or-CUSTOM_GENERATED",
        "label": "Node Name",
        "description": "A short, clear description of what this node does (REQUIRED for all nodes)",
        "customCode": "/* only if CUSTOM_GENERATED */",
        "configSchema": { /* REQUIRED if CUSTOM_GENERATED - defines all config fields needed */ },
        "metadata": { /* only if CUSTOM_GENERATED */ }
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "type": "buttonedge",
      "animated": true,
      "style": {
        "stroke": "hsl(var(--primary))",
        "strokeWidth": 2
      }
    }
  ],
  "reasoning": "Explanation of why this workflow structure was chosen and which nodes are custom vs library.",
  "workflowName": "Suggested name for the workflow"
}

CRITICAL RULES:
1. Every node MUST include a "description" field in data that explains what the node does in 1-2 sentences
2. For CUSTOM_GENERATED nodes, you MUST include a "configSchema" object that defines ALL configuration fields the node needs
3. The configSchema must match every config value used in the customCode (e.g., if code uses config.apiKey, schema must have apiKey field)
4. DO NOT include "config" objects with actual values - users will fill these in through the configuration UI
5. Users will fill in API keys, credentials, and other settings after generation using the configSchema you provide
6. Always try to generate a workflow - use custom nodes with HTTP requests to integrate with any service
7. Only return empty nodes array if the request is truly impossible or nonsensical (very rare cases)`;

    const userPrompt = request.userPrompt;

    // Check if modifying existing workflow
    let contextPrompt = '';
    if (request.existingNodes && request.existingNodes.length > 0) {
      contextPrompt = `\n\nEXISTING WORKFLOW CONTEXT:
The user wants to modify an existing workflow. Current nodes:
${request.existingNodes.map((n) => `- ${n.id}: ${n.data?.label || n.type}`).join('\n')}

Please generate a workflow that builds upon or replaces this existing workflow based on the new requirements.`;
    }

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
          content: userPrompt + contextPrompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more deterministic, structured output
      max_tokens: 4000, // Allow for complex workflows
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    // Capture token usage for credit calculation
    const tokenUsage = {
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
    };
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let generatedWorkflow: AIGeneratedWorkflow;
    try {
      generatedWorkflow = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Response content:', responseContent);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate that all node IDs exist in the library
    const invalidNodes = generatedWorkflow.nodes
      .filter((node) => !nodeRegistry[node.data.nodeId])
      .map((node) => node.data.nodeId);

    if (invalidNodes.length > 0) {
      console.warn('AI generated nodes not in library:', invalidNodes);
      // Still return the workflow, but log the warning
    }

    // Ensure all edges have the correct style
    generatedWorkflow.edges = generatedWorkflow.edges.map((edge) => ({
      ...edge,
      type: 'buttonedge',
      animated: true,
      style: edge.style || {
        stroke: 'hsl(var(--primary))',
        strokeWidth: 2,
      },
    }));

    return {
      success: true,
      workflow: generatedWorkflow,
    };
  } catch (error: any) {
    console.error('Error generating workflow:', error);
    return {
      success: false,
      workflow: {
        nodes: [],
        edges: [],
        reasoning: '',
        missingNodes: [],
      },
      error: error.message || 'Failed to generate workflow',
    };
  }
}

/**
 * Get which integration service a node requires (if any)
 */
function getNodeIntegrationRequirement(nodeId: string): string | null {
  // Google nodes (OAuth)
  if (['new-row-in-google-sheet', 'new-email-received', 'create-calendar-event', 
       'upload-file-to-google-drive', 'new-form-submission', 'file-uploaded'].includes(nodeId)) {
    return 'google';
  }
  
  // Slack nodes (OAuth)
  if (['post-to-slack-channel', 'new-message-in-slack'].includes(nodeId)) {
    return 'slack';
  }
  
  // GitHub nodes (OAuth)
  if (['new-github-issue'].includes(nodeId)) {
    return 'github';
  }
  
  // Notion nodes (API token)
  if (['create-notion-page'].includes(nodeId)) {
    return 'notion';
  }
  
  // Airtable nodes (API token)
  if (['update-airtable-record'].includes(nodeId)) {
    return 'airtable';
  }
  
  // Trello nodes (API key + token)
  if (['create-trello-card'].includes(nodeId)) {
    return 'trello';
  }
  
  // OpenAI nodes (API key)
  if (['generate-summary-with-ai', 'generate-ai-content'].includes(nodeId)) {
    return 'openai';
  }
  
  // SendGrid nodes (API key)
  if (['send-email'].includes(nodeId)) {
    return 'sendgrid';
  }
  
  // Twilio nodes (Account SID + Auth Token)
  if (['send-sms-via-twilio'].includes(nodeId)) {
    return 'twilio';
  }
  
  // Discord nodes (OAuth or Bot Token)
  if (['send-discord-message', 'new-discord-message'].includes(nodeId)) {
    return 'discord';
  }
  
  // Twitter/X nodes (OAuth)
  if (['post-to-x'].includes(nodeId)) {
    return 'twitter';
  }
  
  return null; // No integration required
}

/**
 * List of integrations that are currently set up and available
 */
const AVAILABLE_INTEGRATIONS = [
  'google',
  'slack',
  'github',
  'notion',
  'airtable',
  'trello',
  'openai',
  'sendgrid',
  'twilio',
  'stripe',
  'discord',
  'twitter',
  'paypal'
];

/**
 * Filter nodes to only include those that use available integrations
 */
function filterNodesByAvailableIntegrations(
  nodes: Array<{
    id: string;
    name: string;
    type: 'trigger' | 'action' | 'transform';
    description: string;
    category: string;
    configSchema: Record<string, any>;
  }>
): Array<{
  id: string;
  name: string;
  type: 'trigger' | 'action' | 'transform';
  description: string;
  category: string;
  configSchema: Record<string, any>;
}> {
  return nodes.filter((node) => {
    const requiredIntegration = getNodeIntegrationRequirement(node.id);
    // If node doesn't require an integration, include it
    if (!requiredIntegration) {
      return true;
    }
    // If node requires an integration, only include if that integration is available
    return AVAILABLE_INTEGRATIONS.includes(requiredIntegration);
  });
}

/**
 * Get a simplified list of available nodes for the AI prompt
 * Only includes nodes that use integrations that are set up
 */
export function getSimplifiedNodeList(): Array<{
  id: string;
  name: string;
  type: 'trigger' | 'action' | 'transform';
  description: string;
  category: string;
  configSchema: Record<string, any>;
}> {
  const allNodes = Object.values(nodeRegistry).map((node) => ({
    id: node.id,
    name: node.name,
    type: node.type,
    description: node.description,
    category: node.category,
    configSchema: node.configSchema,
  }));
  
  // Filter out nodes that require integrations that aren't set up
  return filterNodesByAvailableIntegrations(allNodes);
}

/**
 * Detect if a user message is requesting workflow generation
 * Only matches explicit workflow creation requests, not general automation keywords
 */
export function detectWorkflowIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Explicit workflow creation phrases (must include "workflow" or "automate" with creation verbs)
  const explicitPhrases = [
    'create workflow',
    'build workflow',
    'make workflow',
    'generate workflow',
    'make a workflow',
    'create a workflow',
    'build a workflow',
    'generate a workflow',
    'set up workflow',
    'set up a workflow',
    'automate',
    'create automation',
    'build automation',
    'make automation',
    'i want to create',
    'i want to build',
    'i want to make',
    'i need to create',
    'i need to build',
    'i need to make',
    'i\'d like to create',
    'i\'d like to build',
    'i\'d like to make',
    'can you create',
    'can you build',
    'can you make',
    'help me create',
    'help me build',
    'help me make',
  ];
  
  // Check for explicit phrases
  const hasExplicitPhrase = explicitPhrases.some((phrase) => lowerMessage.includes(phrase));
  
  // Also check for "workflow" combined with creation verbs
  const hasWorkflowWithVerb = lowerMessage.includes('workflow') && (
    lowerMessage.includes('create') ||
    lowerMessage.includes('build') ||
    lowerMessage.includes('make') ||
    lowerMessage.includes('generate') ||
    lowerMessage.includes('set up')
  );
  
  // Check for "automate" with object (e.g., "automate this", "automate sending emails")
  const hasAutomateWithObject = lowerMessage.includes('automate') && (
    lowerMessage.includes('this') ||
    lowerMessage.includes('that') ||
    lowerMessage.includes('sending') ||
    lowerMessage.includes('process') ||
    lowerMessage.includes('task')
  );
  
  return hasExplicitPhrase || hasWorkflowWithVerb || hasAutomateWithObject;
}

/**
 * Extract workflow prompt from a conversational message
 */
export function extractWorkflowPrompt(message: string): string {
  // Simple extraction - can be enhanced
  // Remove conversational fluff and keep the core request
  const patterns = [
    /(?:create|build|make|generate|set up).*?(?:workflow|automation)?\s*[:.]?\s*(.+)/i,
    /(?:when|if).+?(?:then|should|do).+/i,
    /(?:i want|i need|i'd like).+?(?:to|that).+/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }

  return message; // Return original if no pattern matches
}

