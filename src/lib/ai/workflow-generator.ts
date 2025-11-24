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

/**
 * Generate a workflow from a natural language prompt with streaming support
 */
export async function generateWorkflowFromPromptStreaming(
  request: WorkflowGenerationRequest & {
    onChunk: (jsonChunk: string, isComplete: boolean) => void;
    onComplete: (workflow: AIGeneratedWorkflow) => void;
    onError: (error: Error) => void;
  }
): Promise<void> {
  try {
    // Initialize OpenAI client (only runs server-side in API routes)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Build the system prompt with available nodes (same as non-streaming version)
    const availableNodesList = request.availableNodes
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
    "metadata": {
      "name": "Fetch Crypto Price",
      "description": "Fetches cryptocurrency price from CoinGecko API",
      "type": "transform",
      "generatedBy": "ai"
    }
  }
}

NODE POSITIONING:
- Use position: { x: 0, y: 0 } for ALL nodes (auto-layout handles positioning)
- Focus on creating logical connections between nodes
- The layout algorithm will calculate optimal positions automatically

EDGE CONNECTIONS:
- All edges use type: "buttonedge"
- All edges have animated: true
- All edges have style: { stroke: "hsl(var(--primary))", strokeWidth: 2 }

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
  "reasoning": "Explanation of why this workflow structure was chosen and which nodes are custom vs library",
  "missingNodes": [],
  "workflowName": "Suggested name for the workflow"
}

CRITICAL RULES:
1. Every node MUST include a "description" field in data that explains what the node does in 1-2 sentences
2. DO NOT include "config" objects - these will be configured by users through the configuration UI
3. Users will fill in API keys, credentials, and other settings after generation`;

    const userPrompt = request.userPrompt;

    // Check if modifying existing workflow
    let contextPrompt = '';
    if (request.existingNodes && request.existingNodes.length > 0) {
      contextPrompt = `\n\nEXISTING WORKFLOW CONTEXT:
The user has an active workflow on the canvas.
Current nodes:
${request.existingNodes.map((n) => `- ${n.id}: ${n.data?.label || n.type} (${n.data?.description || 'No description'})`).join('\n')}

Current edges:
${request.existingEdges?.map((e) => `- ${e.source} -> ${e.target}`).join('\n') || 'No edges'}

YOUR GOAL:
Determine if the user wants to:
1. MODIFY/ADD TO the existing workflow (e.g., "add a slack notification", "connect email to this")
2. REPLACE/CREATE NEW workflow (e.g., "make a new workflow for...", "clear and build...")

IF MODIFYING:
- Return the COMPLETE workflow including both existing nodes (that should be kept) and new nodes.
- Maintain the IDs of existing nodes to preserve them.
- Add new nodes with new IDs.
- Connect new nodes to existing nodes where logical.

IF CREATING NEW:
- Return only the new nodes and edges.
- Do not include old node IDs.

Please generate the appropriate workflow JSON based on this context.`;
    }

    // Use streaming API
    const stream = await openai.chat.completions.create({
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
      temperature: 0.3,
      max_tokens: 4000,
      stream: true, // Enable streaming
    });

    let fullContent = '';

    // Stream the response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        
        // Send the accumulated content as it streams (even if incomplete JSON)
        request.onChunk(fullContent, false);
      }
    }

    // Send final chunk
    request.onChunk(fullContent, true);

    // Parse the complete JSON response
    let generatedWorkflow: AIGeneratedWorkflow;
    try {
      generatedWorkflow = JSON.parse(fullContent);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Response content:', fullContent);
      request.onError(new Error('Invalid JSON response from AI'));
      return;
    }

    // Validate that all node IDs exist in the library
    const invalidNodes = generatedWorkflow.nodes
      .filter((node) => !nodeRegistry[node.data.nodeId])
      .map((node) => node.data.nodeId);

    if (invalidNodes.length > 0) {
      console.warn('AI generated nodes not in library:', invalidNodes);
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

    // Call onComplete with the final workflow
    request.onComplete(generatedWorkflow);
  } catch (error: any) {
    console.error('Error generating workflow:', error);
    request.onError(error);
  }
}

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
    const availableNodesList = request.availableNodes
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
    "metadata": {
      "name": "Fetch Crypto Price",
      "description": "Fetches cryptocurrency price from CoinGecko API",
      "type": "transform",
      "generatedBy": "ai"
    }
  }
}

NODE POSITIONING:
- Use position: { x: 0, y: 0 } for ALL nodes (auto-layout handles positioning)
- Focus on creating logical connections between nodes
- The layout algorithm will calculate optimal positions automatically

EDGE CONNECTIONS:
- All edges use type: "buttonedge"
- All edges have animated: true
- All edges have style: { stroke: "hsl(var(--primary))", strokeWidth: 2 }

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
  "reasoning": "Explanation of why this workflow structure was chosen and which nodes are custom vs library",
  "missingNodes": [],
  "workflowName": "Suggested name for the workflow"
}

CRITICAL RULES:
1. Every node MUST include a "description" field in data that explains what the node does in 1-2 sentences
2. DO NOT include "config" objects - these will be configured by users through the configuration UI
3. Users will fill in API keys, credentials, and other settings after generation`;

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
 * Get a simplified list of available nodes for the AI prompt
 */
export function getSimplifiedNodeList(): Array<{
  id: string;
  name: string;
  type: 'trigger' | 'action' | 'transform';
  description: string;
  category: string;
  configSchema: Record<string, any>;
}> {
  return Object.values(nodeRegistry).map((node) => ({
    id: node.id,
    name: node.name,
    type: node.type,
    description: node.description,
    category: node.category,
    configSchema: node.configSchema,
  }));
}

/**
 * Detect if a user message is requesting workflow generation
 */
export function detectWorkflowIntent(message: string): boolean {
  const workflowKeywords = [
    'workflow',
    'automate',
    'when',
    'trigger',
    'then',
    'action',
    'create workflow',
    'build workflow',
    'make a workflow',
    'set up',
    'if',
    'send',
    'receive',
    'form',
    'email',
  ];

  const lowerMessage = message.toLowerCase();
  return workflowKeywords.some((keyword) => lowerMessage.includes(keyword));
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

