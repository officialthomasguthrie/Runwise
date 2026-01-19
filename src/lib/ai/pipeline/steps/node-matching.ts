/**
 * Node Matching Step
 * Step 2 of the workflow generation pipeline
 * Matches workflow requirements to library nodes or identifies custom node needs
 */

import OpenAI from 'openai';
import { nodeRegistry } from '@/lib/nodes';
import type { PipelineContext, IntentAnalysis, WorkflowPlan, StepResult } from '../types';

/**
 * Matches workflow requirements to library nodes or identifies custom node needs
 * Uses gpt-4o-mini for cost-effective node matching
 */
export async function matchNodes(
  context: PipelineContext & { intent: IntentAnalysis }
): Promise<StepResult<WorkflowPlan>> {
  try {
    // Ensure intent is provided
    if (!context.intent) {
      return {
        success: false,
        error: 'Intent analysis is required for node matching',
      };
    }

    const intent = context.intent;

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build available nodes list (same format as workflow-generator.ts)
    // Note: availableNodes in context are already filtered by available integrations
    const availableNodesList = context.availableNodes
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

    // System prompt focused on node matching and planning
    const systemPrompt = `You are a workflow planner. Your task is to match workflow requirements to available library nodes and plan the workflow structure.

INPUT:
You receive an intent analysis with:
- Goal: What the workflow should accomplish
- Triggers: What will start the workflow
- Actions: What the workflow should do
- Transforms: Any data transformations needed
- Custom Requirements: Functionality not covered by library nodes

YOUR JOB:
1. Match each requirement to available library nodes when possible (PREFER library nodes)
2. Only create custom nodes when library nodes truly cannot fulfill the requirement
3. Plan logical connections between nodes (trigger → transform → action flow)
4. Map data flow between nodes (what data passes from one node to another)

DECISION RULES:
- Check library first: Does a library node match the requirement? → Use library node
- Library close match: Can a library node be configured to work? → Use library node
- No library match: Is the requirement truly unique? → Create custom node
- Always prefer library nodes (80% of cases should use library, 20% custom)

AVAILABLE LIBRARY NODES:
${availableNodesList}

OUTPUT STRUCTURE:
Return a JSON object with these exact fields:
- libraryNodes: Array of { id: string, role: string, reason: string }
  * id: Exact node ID from library (must match exactly)
  * role: Role in workflow ("trigger", "transform", or "action")
  * reason: Why this node was selected
  
- customNodes: Array of { name: string, type: string, requirements: string, reason: string }
  * name: Suggested name for the custom node
  * type: "trigger", "action", or "transform"
  * requirements: Detailed description of what this node must do
  * reason: Why a library node cannot be used (be specific)
  * Only include if truly needed (when library nodes don't cover requirement)

- connections: Array of { from: string, to: string, reason: string }
  * from: Source node ID (or custom node name if not yet created)
  * to: Target node ID (or custom node name if not yet created)
  * reason: Why these nodes are connected
  * Plan the logical flow: trigger → transforms → actions

- dataFlow: Array of { source: string, target: string, field: string }
  * source: Source node ID/name
  * target: Target node ID/name
  * field: Field name being passed (e.g., "data", "text", "email", "row")
  * Map how data flows between nodes

IMPORTANT RULES:
1. Node IDs must match library node IDs EXACTLY (case-sensitive)
2. Only create custom nodes when library truly cannot fulfill requirement
3. Connections should follow logical flow: triggers → transforms → actions
4. For library nodes, use the exact ID from the available nodes list above
5. For custom nodes that will be generated, use descriptive names (will be converted to IDs later)
6. If intent.isModification is true, consider existing nodes that should be kept

EXAMPLES:

Example 1:
Intent: { goal: "Send email when new row in sheet", triggers: ["new-row-in-google-sheet"], actions: ["send-email"], transforms: [], customRequirements: [] }
Output:
{
  "libraryNodes": [
    { "id": "new-row-in-google-sheet", "role": "trigger", "reason": "Matches trigger requirement for new row in Google Sheet" },
    { "id": "send-email", "role": "action", "reason": "Matches action requirement to send email notification" }
  ],
  "customNodes": [],
  "connections": [
    { "from": "new-row-in-google-sheet", "to": "send-email", "reason": "New row data should trigger email notification" }
  ],
  "dataFlow": [
    { "source": "new-row-in-google-sheet", "target": "send-email", "field": "row" }
  ]
}

Example 2:
Intent: { goal: "Fetch Bitcoin price and send to Slack", triggers: ["scheduled"], actions: ["send-slack-message"], transforms: [], customRequirements: ["Fetch Bitcoin price from CoinGecko API"] }
Output:
{
  "libraryNodes": [
    { "id": "scheduled-trigger", "role": "trigger", "reason": "Matches scheduled trigger requirement" },
    { "id": "post-to-slack-channel", "role": "action", "reason": "Matches action requirement to send message to Slack" }
  ],
  "customNodes": [
    { "name": "Fetch Bitcoin Price", "type": "transform", "requirements": "Fetch current Bitcoin price from CoinGecko API (https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd) and return price data", "reason": "Library does not have a node for CoinGecko API, custom node needed" }
  ],
  "connections": [
    { "from": "scheduled-trigger", "to": "Fetch Bitcoin Price", "reason": "Scheduled trigger should fetch price" },
    { "from": "Fetch Bitcoin Price", "to": "post-to-slack-channel", "reason": "Price data should be sent to Slack" }
  ],
  "dataFlow": [
    { "source": "scheduled-trigger", "target": "Fetch Bitcoin Price", "field": "trigger" },
    { "source": "Fetch Bitcoin Price", "target": "post-to-slack-channel", "field": "price" }
  ]
}

Return ONLY valid JSON, no markdown, no explanations outside JSON.`;

    // Build user message with intent analysis
    const intentJson = JSON.stringify(intent, null, 2);
    const userMessage = `Intent Analysis:
${intentJson}

Please match these requirements to library nodes and create a workflow plan.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
      temperature: 0.3, // Lower temperature for more deterministic output
      max_tokens: 2000, // May need more tokens for complex workflows
    });

    // Extract response and token usage
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
    let workflowPlan: WorkflowPlan;
    try {
      workflowPlan = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Error parsing node matching response:', parseError);
      console.error('Response content:', responseContent);
      return {
        success: false,
        error: `Invalid JSON response from AI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        tokenUsage,
      };
    }

    // Validate required fields
    if (
      !Array.isArray(workflowPlan.libraryNodes) ||
      !Array.isArray(workflowPlan.customNodes) ||
      !Array.isArray(workflowPlan.connections) ||
      !Array.isArray(workflowPlan.dataFlow)
    ) {
      return {
        success: false,
        error: 'Invalid workflow plan structure: missing required arrays (libraryNodes, customNodes, connections, dataFlow)',
        tokenUsage,
      };
    }

    // Validate library node IDs (warn if not found, but don't fail)
    const invalidNodeIds: string[] = [];
    for (const libNode of workflowPlan.libraryNodes) {
      if (libNode.id && !nodeRegistry[libNode.id]) {
        invalidNodeIds.push(libNode.id);
      }
    }

    if (invalidNodeIds.length > 0) {
      console.warn('[Node Matching] Some library node IDs not found in registry:', invalidNodeIds);
      // Don't fail, just warn - the node might be added later or this is acceptable
    }

    // Ensure arrays are initialized (some might be empty)
    workflowPlan.libraryNodes = workflowPlan.libraryNodes || [];
    workflowPlan.customNodes = workflowPlan.customNodes || [];
    workflowPlan.connections = workflowPlan.connections || [];
    workflowPlan.dataFlow = workflowPlan.dataFlow || [];

    // Return successful result
    return {
      success: true,
      data: workflowPlan,
      tokenUsage,
    };
  } catch (error: any) {
    console.error('Error in node matching step:', error);
    return {
      success: false,
      error: error.message || 'Failed to match nodes',
    };
  }
}

