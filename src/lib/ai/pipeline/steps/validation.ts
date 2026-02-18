  /**
 * Validation Step
 * Step 5 of the workflow generation pipeline
 * Validates and refines the generated workflow
 */

import OpenAI from 'openai';
import { nodeRegistry } from '@/lib/nodes';
import type { PipelineContext, StepResult } from '../types';
import type { AIGeneratedWorkflow } from '@/lib/ai/types';

/**
 * Validates and refines the generated workflow
 * Uses gpt-4o-mini for quick validation and minor fixes
 * Also includes programmatic validation
 */
export async function validateWorkflow(
  context: PipelineContext & { workflow: AIGeneratedWorkflow }
): Promise<StepResult<AIGeneratedWorkflow>> {
  try {
    // Ensure workflow is provided
    if (!context.workflow) {
      return {
        success: false,
        error: 'Workflow is required for validation',
      };
    }

    const workflow = { ...context.workflow };

    // First, perform programmatic validation
    const programmaticValidation = validateWorkflowProgrammatically(workflow);

    if (!programmaticValidation.success) {
      return {
        success: false,
        error: `Programmatic validation failed: ${programmaticValidation.error}`,
      };
    }

    // If programmatic validation passed, use AI for refinement (optional, lightweight check)
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const workflowJson = JSON.stringify(workflow, null, 2);

    // Lightweight system prompt for validation and refinement
    const systemPrompt = `You are a workflow validator. Your task is to validate workflow JSON structure and make minor refinements if needed.

INPUT:
You receive a complete workflow JSON that has already been generated.

YOUR JOB:
1. Validate the workflow structure matches the expected format
2. Check all required fields are present
3. Make minor refinements if needed:
   - Add missing descriptions to nodes
   - Ensure edge styles are correct
   - Fix any obvious issues
4. Do NOT make major structural changes
5. Do NOT regenerate nodes or edges
6. Only fix missing descriptions, edge styles, or other minor issues

OUTPUT:
Return a JSON object with the validated/refined workflow in the same structure.

Return ONLY the workflow JSON, no explanations, no markdown.

If the workflow is valid, return it unchanged or with minor refinements only.
If there are critical issues that cannot be fixed, return an error in a comment or log it.

Return the workflow JSON exactly as received, with only minor refinements if needed.`;

    // Call OpenAI API for AI validation (optional lightweight check)
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
          content: `Validate and refine this workflow JSON:\n\n${workflowJson}`,
        },
      ],
      temperature: 0.1, // Very low temperature for deterministic validation
      max_tokens: 4000, // Should be enough since we're mostly just validating
    });

    // Extract response and token usage
    const responseContent = completion.choices[0]?.message?.content;
    const tokenUsage = {
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
    };

    // If AI returned a response, try to parse it
    // Otherwise, use the original workflow
    let validatedWorkflow: AIGeneratedWorkflow = workflow;

    if (responseContent) {
      try {
        const parsed = JSON.parse(responseContent);
        // The AI might return the workflow directly, or wrapped in an object
        if (parsed.nodes && parsed.edges) {
          validatedWorkflow = parsed;
        } else if (parsed.workflow) {
          validatedWorkflow = parsed.workflow;
        }
        // If parsing fails or structure is unexpected, use original workflow
      } catch (parseError) {
        // If AI response is invalid, use original workflow
        console.warn('AI validation response was invalid, using original workflow');
      }
    }

    // Apply programmatic refinements
    validatedWorkflow = applyProgrammaticRefinements(validatedWorkflow);

    // Return validated workflow
    return {
      success: true,
      data: validatedWorkflow,
      tokenUsage,
    };
  } catch (error: any) {
    console.error('Error in validation step:', error);
    // Don't fail validation on error - return original workflow
    return {
      success: true,
      data: context.workflow,
    };
  }
}

/**
 * Programmatic validation of workflow structure
 * Validates required fields, node IDs, edge references, etc.
 */
function validateWorkflowProgrammatically(workflow: AIGeneratedWorkflow): { success: boolean; error?: string } {
  // Validate workflow has required structure
  if (!Array.isArray(workflow.nodes)) {
    return { success: false, error: 'Workflow.nodes must be an array' };
  }

  if (!Array.isArray(workflow.edges)) {
    return { success: false, error: 'Workflow.edges must be an array' };
  }

  if (typeof workflow.reasoning !== 'string') {
    return { success: false, error: 'Workflow.reasoning must be a string' };
  }

  // Validate each node
  const nodeIds = new Set<string>();
  for (const node of workflow.nodes) {
    // Check required fields
    if (!node.id || typeof node.id !== 'string') {
      return { success: false, error: `Node missing required 'id' field` };
    }

    if (node.type !== 'workflow-node') {
      return { success: false, error: `Node ${node.id} has invalid type: ${node.type}` };
    }

    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      return { success: false, error: `Node ${node.id} missing required 'position' field` };
    }

    if (!node.data) {
      return { success: false, error: `Node ${node.id} missing required 'data' field` };
    }

    const nodeData = node.data as any;
    if (!nodeData.nodeId || typeof nodeData.nodeId !== 'string') {
      return { success: false, error: `Node ${node.id} missing required 'nodeId' in data` };
    }

    // Check description (required for all nodes)
    if (!nodeData.description || typeof nodeData.description !== 'string') {
      return { success: false, error: `Node ${node.id} missing required 'description' in data` };
    }

    // Check CUSTOM_GENERATED nodes have customCode and configSchema
    if (nodeData.nodeId === 'CUSTOM_GENERATED') {
      if (!nodeData.customCode || typeof nodeData.customCode !== 'string') {
        return { success: false, error: `CUSTOM_GENERATED node ${node.id} missing required 'customCode'` };
      }

      if (!nodeData.configSchema || typeof nodeData.configSchema !== 'object') {
        return { success: false, error: `CUSTOM_GENERATED node ${node.id} missing required 'configSchema'` };
      }
    }

    // Validate library node IDs exist (warn if not found, but don't fail for custom nodes)
    if (nodeData.nodeId !== 'CUSTOM_GENERATED' && !nodeRegistry[nodeData.nodeId]) {
      console.warn(`[Validation] Library node ID not found in registry: ${nodeData.nodeId}`);
      // Don't fail validation - node might be added later
    }

    // Check for duplicate node IDs
    if (nodeIds.has(node.id)) {
      return { success: false, error: `Duplicate node ID: ${node.id}` };
    }
    nodeIds.add(node.id);
  }

  // Validate each edge
  for (const edge of workflow.edges) {
    // Check required fields
    if (!edge.id || typeof edge.id !== 'string') {
      return { success: false, error: `Edge missing required 'id' field` };
    }

    if (!edge.source || typeof edge.source !== 'string') {
      return { success: false, error: `Edge ${edge.id} missing required 'source' field` };
    }

    if (!edge.target || typeof edge.target !== 'string') {
      return { success: false, error: `Edge ${edge.id} missing required 'target' field` };
    }

    if (edge.type !== 'buttonedge') {
      return { success: false, error: `Edge ${edge.id} has invalid type: ${edge.type}` };
    }

    if (edge.animated !== true) {
      return { success: false, error: `Edge ${edge.id} must have animated: true` };
    }

    // Check that source and target nodes exist
    if (!nodeIds.has(edge.source)) {
      return { success: false, error: `Edge ${edge.id} references non-existent source node: ${edge.source}` };
    }

    if (!nodeIds.has(edge.target)) {
      return { success: false, error: `Edge ${edge.id} references non-existent target node: ${edge.target}` };
    }
  }

  return { success: true };
}

/**
 * Apply programmatic refinements to workflow
 * Ensures edge styles are correct, positions are valid, etc.
 */
function applyProgrammaticRefinements(workflow: AIGeneratedWorkflow): AIGeneratedWorkflow {
  // Ensure all edges have correct style
  const refinedEdges = workflow.edges.map((edge) => ({
    ...edge,
    type: 'buttonedge' as const,
    animated: true,
    style: edge.style || {
      stroke: 'hsl(var(--primary))',
      strokeWidth: 2,
    },
  }));

  // Ensure all nodes have position
  const refinedNodes = workflow.nodes.map((node) => ({
    ...node,
    position: node.position || { x: 0, y: 0 },
  }));

  // Ensure all nodes have descriptions (add placeholder if missing)
  const refinedNodesWithDescriptions = refinedNodes.map((node) => {
    const nodeData = node.data as any;
    if (!nodeData.description || typeof nodeData.description !== 'string') {
      return {
        ...node,
        data: {
          ...nodeData,
          description: nodeData.label || `Node: ${nodeData.nodeId}`,
        },
      };
    }
    return node;
  });

  return {
    ...workflow,
    nodes: refinedNodesWithDescriptions,
    edges: refinedEdges,
  };
}

