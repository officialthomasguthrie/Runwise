/**
 * Workflow Generation Step
 * Step 3 of the workflow generation pipeline
 * Generates complete workflow JSON structure from workflow plan
 */

import OpenAI from 'openai';
import { nodeRegistry } from '@/lib/nodes';
import type { PipelineContext, WorkflowPlan, StepResult } from '../types';
import type { AIGeneratedWorkflow } from '@/lib/ai/types';

/**
 * Generates complete workflow JSON structure from workflow plan
 * Uses gpt-4o for high-quality workflow generation
 * Supports streaming via optional onChunk callback
 */
export async function generateWorkflowStructure(
  context: PipelineContext & { plan: WorkflowPlan },
  onChunk?: (chunk: string, isComplete: boolean) => void
): Promise<StepResult<AIGeneratedWorkflow>> {
  try {
    // Ensure plan is provided
    if (!context.plan) {
      return {
        success: false,
        error: 'Workflow plan is required for workflow generation',
      };
    }

    const plan = context.plan;

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build available nodes list (same format as workflow-generator.ts)
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

    // Build workflow plan context
    const planJson = JSON.stringify(plan, null, 2);

    // System prompt focused on workflow structure generation (not planning)
    const systemPrompt = `You are an expert workflow structure generator. Your task is to generate complete, functional workflow JSON structures from workflow plans.

INPUT:
You receive a workflow plan that includes:
- Selected library nodes to use (with IDs and roles)
- Custom nodes needed (with requirements)
- Planned connections between nodes
- Data flow mapping between nodes

YOUR JOB:
Transform the plan into a complete workflow JSON structure with:
1. All nodes properly structured (id, type, position, data)
2. All edges connecting nodes correctly (source, target, type, animated, style)
3. Template syntax for config values that map data between nodes ({{inputData.field}})
4. Clear descriptions for all nodes
5. Workflow name and reasoning

WORKFLOW PLAN CONTEXT:
${planJson}

LIBRARY NODES (Available for Use):
${availableNodesList}

NODE STRUCTURE RULES:
1. Every node must have: id, type: "workflow-node", position: {x: 0, y: 0}, data
2. data must include: nodeId (library ID or "CUSTOM_GENERATED"), label, description (REQUIRED)
3. For library nodes: use the exact nodeId from the plan's libraryNodes array
4. For custom nodes: set nodeId to "CUSTOM_GENERATED" (code will be generated in next step)
5. All positions should be {x: 0, y: 0} - auto-layout handles positioning

DESCRIPTION GUIDELINES:
- Write descriptions in 1-2 clear, concise sentences
- Explain WHAT the node does, not HOW it works
- Use action verbs (e.g., "Sends an email", "Fetches data", "Validates input")
- Be specific about the node's purpose
- Examples:
  ✅ Good: "Sends a confirmation email to the customer with order details and tracking information"
  ✅ Good: "Fetches current Bitcoin price from CoinGecko API"
  ❌ Bad: "Does some stuff"
  ❌ Bad: "Node that processes things"

EDGE CONNECTIONS:
- All edges use type: "buttonedge"
- All edges have animated: true
- All edges have style: { stroke: "hsl(var(--primary))", strokeWidth: 2 }
- Connect nodes based on the plan's connections array
- Use exact node IDs from the generated nodes

OUTPUT MAPPING (CRITICAL):
- When a node receives input from a previous node, use template syntax: {{inputData.fieldName}}
- Template format: {{inputData.fieldName}} where fieldName comes from previous node's output
- Example: If "Summarize Email" outputs {summary: "..."}, then "Send Email" body should be "{{inputData.summary}}"
- Use the plan's dataFlow array to map fields correctly
- For library nodes, use template syntax in config fields that should receive data from previous nodes
- Only use static values for fields that don't depend on previous nodes (API keys, static text, etc.)
- DO NOT include actual config values - users will fill these in through the UI

CUSTOM NODES (From Plan):
- If plan includes customNodes, create placeholder nodes with nodeId: "CUSTOM_GENERATED"
- Include description based on requirements from plan
- DO NOT include customCode yet (that's generated in next step)
- DO NOT include configSchema yet (that's generated with the code)
- Just create the node structure - code generation comes later

NODE ID GENERATION:
- Generate unique IDs for nodes (e.g., "node-1", "node-2", "trigger-1", "action-1")
- Use consistent naming (sequential numbers work well)
- Edge IDs should be unique (e.g., "edge-1", "edge-2")

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
        "customCode": "/* only if CUSTOM_GENERATED - leave empty for now, will be generated in next step */",
        "configSchema": { /* only if CUSTOM_GENERATED - leave empty for now */ },
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
  "reasoning": "Explanation of the workflow structure and how it fulfills the plan.",
  "workflowName": "Suggested name for the workflow (based on goal from intent)"
}

CRITICAL RULES:
1. Every node MUST include a "description" field in data (REQUIRED)
2. Use template syntax {{inputData.field}} for config values that come from previous nodes
3. Generate nodes based on plan's libraryNodes (use exact IDs from plan)
4. Generate custom node placeholders based on plan's customNodes (set nodeId to "CUSTOM_GENERATED")
5. Create edges based on plan's connections array
6. All positions must be {x: 0, y: 0} (auto-layout handles positioning)
7. DO NOT include actual config values - users configure through UI
8. For custom nodes, leave customCode and configSchema empty (generated in next step)
9. Ensure all node IDs in edges match actual node IDs generated
10. Return ONLY valid JSON, no markdown, no explanations outside JSON`;

    // Build user message with plan
    const userMessage = `Generate a complete workflow JSON structure based on the workflow plan provided in the system prompt.

Focus on:
1. Creating all nodes from the plan (library nodes + custom node placeholders)
2. Connecting nodes according to the plan's connections
3. Using template syntax for data flow between nodes
4. Including clear descriptions for all nodes
5. Generating a meaningful workflow name`;

    // Check if streaming is requested
    if (onChunk) {
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
            content: userMessage,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        stream: true,
      });

      let fullContent = '';

      // Stream the response
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          // Send chunks as they arrive
          onChunk(fullContent, false);
        }
      }

      // Send final chunk
      onChunk(fullContent, true);

      // Estimate token usage (streaming doesn't provide usage in chunks)
      const systemPromptTokens = Math.ceil(systemPrompt.length / 4);
      const userPromptTokens = Math.ceil(userMessage.length / 4);
      const inputTokens = systemPromptTokens + userPromptTokens;
      const outputTokens = Math.ceil(fullContent.length / 4);

      // Parse the complete JSON response
      let generatedWorkflow: AIGeneratedWorkflow;
      try {
        generatedWorkflow = JSON.parse(fullContent);
      } catch (parseError) {
        console.error('Error parsing workflow generation response:', parseError);
        console.error('Response content:', fullContent);
        return {
          success: false,
          error: `Invalid JSON response from AI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          tokenUsage: {
            inputTokens,
            outputTokens,
          },
        };
      }

      // Validate and normalize workflow
      const normalizedWorkflow = normalizeWorkflow(generatedWorkflow);

      return {
        success: true,
        data: normalizedWorkflow,
        tokenUsage: {
          inputTokens,
          outputTokens,
        },
      };
    } else {
      // Use non-streaming API
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
        max_tokens: 4000,
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
      let generatedWorkflow: AIGeneratedWorkflow;
      try {
        generatedWorkflow = JSON.parse(responseContent);
      } catch (parseError) {
        console.error('Error parsing workflow generation response:', parseError);
        console.error('Response content:', responseContent);
        return {
          success: false,
          error: `Invalid JSON response from AI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          tokenUsage,
        };
      }

      // Validate and normalize workflow
      const normalizedWorkflow = normalizeWorkflow(generatedWorkflow);

      return {
        success: true,
        data: normalizedWorkflow,
        tokenUsage,
      };
    }
  } catch (error: any) {
    console.error('Error in workflow generation step:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate workflow structure',
    };
  }
}

/**
 * Normalizes and validates workflow structure
 * Ensures all edges have correct style and format
 */
function normalizeWorkflow(workflow: AIGeneratedWorkflow): AIGeneratedWorkflow {
  // Ensure all edges have the correct style
  const normalizedEdges = workflow.edges.map((edge) => ({
    ...edge,
    type: 'buttonedge' as const,
    animated: true,
    style: edge.style || {
      stroke: 'hsl(var(--primary))',
      strokeWidth: 2,
    },
  }));

  // Ensure all nodes have position
  const normalizedNodes = workflow.nodes.map((node) => ({
    ...node,
    position: node.position || { x: 0, y: 0 },
  }));

  return {
    ...workflow,
    nodes: normalizedNodes,
    edges: normalizedEdges,
  };
}

