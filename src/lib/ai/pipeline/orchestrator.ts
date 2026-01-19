/**
 * Pipeline Orchestrator
 * Coordinates all workflow generation steps sequentially
 * Maintains backward compatibility with generateWorkflowFromPromptStreaming interface
 */

import { analyzeIntent } from './steps/intent-analysis';
import { matchNodes } from './steps/node-matching';
import { generateWorkflowStructure } from './steps/workflow-generation';
import { configureNodes } from './steps/node-configuration';
import { generateCustomCode } from './steps/code-generation';
import { validateWorkflow } from './steps/validation';
import type { PipelineContext } from './types';
import type { AIGeneratedWorkflow, WorkflowGenerationRequest } from '@/lib/ai/types';

/**
 * Step metadata for monitoring
 */
interface StepMetadata {
  stepName: string;
  stepNumber: number;
  model: string;
  executionTimeMs: number;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
  success: boolean;
  error?: string;
  skipped?: boolean;
}

/**
 * Orchestrates the complete workflow generation pipeline
 * Executes all 6 steps sequentially and maintains context across steps
 * 
 * @param request - Workflow generation request with callbacks
 * @returns Promise that resolves when pipeline completes or rejects on error
 */
export async function runWorkflowGenerationPipeline(
  request: WorkflowGenerationRequest & {
    onChunk?: (chunk: string, isComplete: boolean) => void;
    onComplete: (workflow: AIGeneratedWorkflow, tokenUsage?: { inputTokens: number; outputTokens: number }) => void;
    onError: (error: Error) => void;
  }
): Promise<void> {
  const { onChunk, onComplete, onError } = request;

  // Aggregate token usage across all steps
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  
  // Track step metadata for monitoring
  const stepMetadata: StepMetadata[] = [];
  const pipelineStartTime = Date.now();

  try {
    // Initialize pipeline context
    const context: PipelineContext = {
      userPrompt: request.userPrompt,
      availableNodes: request.availableNodes,
      existingNodes: request.existingNodes,
      existingEdges: request.existingEdges,
      integrationContext: request.integrationContext,
    };

    // Step 1: Intent Analysis
    emitProgress(onChunk, 'intent', 1, 6);
    const step1StartTime = Date.now();
    const intentResult = await analyzeIntent(context);
    const step1ExecutionTime = Date.now() - step1StartTime;

    if (!intentResult.success || !intentResult.data) {
      const error = new Error(`Intent analysis failed: ${intentResult.error || 'Unknown error'}`);
      logStepMetadata({
        stepName: 'intent-analysis',
        stepNumber: 1,
        model: 'gpt-4o-mini',
        executionTimeMs: step1ExecutionTime,
        tokenUsage: intentResult.tokenUsage,
        success: false,
        error: intentResult.error || 'Unknown error',
      });
      console.error('[Pipeline] Step 1 failed:', error.message);
      onError(error);
      return;
    }

    context.intent = intentResult.data;
    aggregateTokenUsage(intentResult.tokenUsage);
    logStepMetadata({
      stepName: 'intent-analysis',
      stepNumber: 1,
      model: 'gpt-4o-mini',
      executionTimeMs: step1ExecutionTime,
      tokenUsage: intentResult.tokenUsage,
      success: true,
    });

    // Step 2: Node Matching
    emitProgress(onChunk, 'node-matching', 2, 6);
    const step2StartTime = Date.now();
    const matchResult = await matchNodes(context as PipelineContext & { intent: typeof intentResult.data });
    const step2ExecutionTime = Date.now() - step2StartTime;

    if (!matchResult.success || !matchResult.data) {
      const error = new Error(`Node matching failed: ${matchResult.error || 'Unknown error'}`);
      logStepMetadata({
        stepName: 'node-matching',
        stepNumber: 2,
        model: 'gpt-4o-mini',
        executionTimeMs: step2ExecutionTime,
        tokenUsage: matchResult.tokenUsage,
        success: false,
        error: matchResult.error || 'Unknown error',
      });
      console.error('[Pipeline] Step 2 failed:', error.message);
      onError(error);
      return;
    }

    context.plan = matchResult.data;
    aggregateTokenUsage(matchResult.tokenUsage);
    logStepMetadata({
      stepName: 'node-matching',
      stepNumber: 2,
      model: 'gpt-4o-mini',
      executionTimeMs: step2ExecutionTime,
      tokenUsage: matchResult.tokenUsage,
      success: true,
    });

    // Step 3: Workflow Generation (with streaming support)
    emitProgress(onChunk, 'workflow-generation', 3, 6);
    
    // Create a wrapper for onChunk that handles both progress and streaming chunks
    let workflowStreamingChunks = '';
    const workflowOnChunk = onChunk ? (chunk: string, isComplete: boolean) => {
      if (isComplete) {
        // Final chunk - send the complete workflow JSON
        workflowStreamingChunks += chunk;
        onChunk(workflowStreamingChunks, true);
      } else {
        // Partial chunk - accumulate and stream
        workflowStreamingChunks += chunk;
        onChunk(chunk, false);
      }
    } : undefined;

    const step3StartTime = Date.now();
    const workflowResult = await generateWorkflowStructure(
      context as PipelineContext & { plan: typeof matchResult.data },
      workflowOnChunk
    );
    const step3ExecutionTime = Date.now() - step3StartTime;

    if (!workflowResult.success || !workflowResult.data) {
      const error = new Error(`Workflow generation failed: ${workflowResult.error || 'Unknown error'}`);
      logStepMetadata({
        stepName: 'workflow-generation',
        stepNumber: 3,
        model: 'gpt-4o',
        executionTimeMs: step3ExecutionTime,
        tokenUsage: workflowResult.tokenUsage,
        success: false,
        error: workflowResult.error || 'Unknown error',
      });
      console.error('[Pipeline] Step 3 failed:', error.message);
      onError(error);
      return;
    }

    context.workflow = workflowResult.data;
    aggregateTokenUsage(workflowResult.tokenUsage);
    logStepMetadata({
      stepName: 'workflow-generation',
      stepNumber: 3,
      model: 'gpt-4o',
      executionTimeMs: step3ExecutionTime,
      tokenUsage: workflowResult.tokenUsage,
      success: true,
    });

    // Step 4: Node Configuration - Fill out config fields based on user intent
    emitProgress(onChunk, 'node-configuration', 4, 6);
    const step4StartTime = Date.now();
    const configResult = await configureNodes(
      context as PipelineContext & { workflow: typeof workflowResult.data; intent: typeof intentResult.data }
    );
    const step4ExecutionTime = Date.now() - step4StartTime;

    if (!configResult.success || !configResult.data) {
      const error = new Error(`Node configuration failed: ${configResult.error || 'Unknown error'}`);
      logStepMetadata({
        stepName: 'node-configuration',
        stepNumber: 4,
        model: 'gpt-4o',
        executionTimeMs: step4ExecutionTime,
        tokenUsage: configResult.tokenUsage,
        success: false,
        error: configResult.error || 'Unknown error',
      });
      console.error('[Pipeline] Step 4 failed:', error.message);
      onError(error);
      return;
    }

    context.workflow = configResult.data;
    aggregateTokenUsage(configResult.tokenUsage);
    logStepMetadata({
      stepName: 'node-configuration',
      stepNumber: 4,
      model: 'gpt-4o',
      executionTimeMs: step4ExecutionTime,
      tokenUsage: configResult.tokenUsage,
      success: true,
    });

    // Step 5: Code Generation (only if custom nodes exist)
    emitProgress(onChunk, 'code-generation', 5, 6);
    
    // Check if there are any CUSTOM_GENERATED nodes that need code
    const hasCustomNodes = context.workflow.nodes.some((node) => {
      const nodeData = node.data as any;
      return nodeData?.nodeId === 'CUSTOM_GENERATED' && 
             (!nodeData?.customCode || typeof nodeData.customCode !== 'string' || nodeData.customCode.trim().length === 0);
    });

    const step5StartTime = Date.now();
    if (hasCustomNodes) {
      const codeResult = await generateCustomCode(
        context as PipelineContext & { workflow: typeof context.workflow }
      );
      const step5ExecutionTime = Date.now() - step5StartTime;

      if (!codeResult.success || !codeResult.data) {
        const error = new Error(`Code generation failed: ${codeResult.error || 'Unknown error'}`);
        logStepMetadata({
          stepName: 'code-generation',
          stepNumber: 5,
          model: 'gpt-4o',
          executionTimeMs: step5ExecutionTime,
          tokenUsage: codeResult.tokenUsage,
          success: false,
          error: codeResult.error || 'Unknown error',
        });
        console.error('[Pipeline] Step 5 failed:', error.message);
        onError(error);
        return;
      }

      context.workflow = codeResult.data;
      aggregateTokenUsage(codeResult.tokenUsage);
      logStepMetadata({
        stepName: 'code-generation',
        stepNumber: 5,
        model: 'gpt-4o',
        executionTimeMs: step5ExecutionTime,
        tokenUsage: codeResult.tokenUsage,
        success: true,
      });
    } else {
      const step5ExecutionTime = Date.now() - step5StartTime;
      logStepMetadata({
        stepName: 'code-generation',
        stepNumber: 5,
        model: 'gpt-4o',
        executionTimeMs: step5ExecutionTime,
        success: true,
        skipped: true,
      });
      console.log('[Pipeline] Step 5 skipped: No custom nodes requiring code generation');
    }

    // Step 6: Validation
    emitProgress(onChunk, 'validation', 6, 6);
    const step6StartTime = Date.now();
    const validateResult = await validateWorkflow(
      context as PipelineContext & { workflow: typeof context.workflow }
    );
    const step6ExecutionTime = Date.now() - step6StartTime;

    if (!validateResult.success || !validateResult.data) {
      const error = new Error(`Workflow validation failed: ${validateResult.error || 'Unknown error'}`);
      logStepMetadata({
        stepName: 'validation',
        stepNumber: 6,
        model: 'gpt-4o-mini',
        executionTimeMs: step6ExecutionTime,
        tokenUsage: validateResult.tokenUsage,
        success: false,
        error: validateResult.error || 'Unknown error',
      });
      console.error('[Pipeline] Step 6 failed:', error.message);
      onError(error);
      return;
    }

    context.workflow = validateResult.data;
    aggregateTokenUsage(validateResult.tokenUsage);
    logStepMetadata({
      stepName: 'validation',
      stepNumber: 6,
      model: 'gpt-4o-mini',
      executionTimeMs: step6ExecutionTime,
      tokenUsage: validateResult.tokenUsage,
      success: true,
    });

    // Pipeline complete - call onComplete with final workflow and token usage
    const finalTokenUsage = {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    };
    
    const totalPipelineTime = Date.now() - pipelineStartTime;

    // Log comprehensive pipeline summary
    logPipelineSummary(stepMetadata, totalPipelineTime, finalTokenUsage);

    onComplete(context.workflow, finalTokenUsage);

  } catch (error: any) {
    const totalPipelineTime = Date.now() - pipelineStartTime;
    logPipelineSummary(stepMetadata, totalPipelineTime, { inputTokens: totalInputTokens, outputTokens: totalOutputTokens }, error);
    console.error('[Pipeline] Unexpected error:', error);
    onError(error instanceof Error ? error : new Error(`Pipeline error: ${error?.message || 'Unknown error'}`));
  }

  /**
   * Helper function to aggregate token usage from steps
   */
  function aggregateTokenUsage(tokenUsage?: { inputTokens: number; outputTokens: number }) {
    if (tokenUsage) {
      totalInputTokens += tokenUsage.inputTokens;
      totalOutputTokens += tokenUsage.outputTokens;
    }
  }

  /**
   * Helper function to log step metadata
   */
  function logStepMetadata(metadata: StepMetadata) {
    stepMetadata.push(metadata);
    
    const logMessage = metadata.skipped
      ? `[Pipeline] Step ${metadata.stepNumber} (${metadata.stepName}): SKIPPED (${metadata.executionTimeMs}ms)`
      : `[Pipeline] Step ${metadata.stepNumber} (${metadata.stepName}): ${metadata.success ? '✅ SUCCESS' : '❌ FAILED'} | Model: ${metadata.model} | Time: ${metadata.executionTimeMs}ms | Tokens: ${metadata.tokenUsage ? `${metadata.tokenUsage.inputTokens + metadata.tokenUsage.outputTokens} (${metadata.tokenUsage.inputTokens} in, ${metadata.tokenUsage.outputTokens} out)` : 'N/A'}`;
    
    if (metadata.success) {
      console.log(logMessage);
    } else {
      console.error(logMessage);
      if (metadata.error) {
        console.error(`  └─ Error: ${metadata.error}`);
      }
    }
  }

  /**
   * Helper function to log pipeline summary
   */
  function logPipelineSummary(
    steps: StepMetadata[],
    totalTimeMs: number,
    totalTokenUsage: { inputTokens: number; outputTokens: number },
    error?: any
  ) {
    console.log('\n' + '='.repeat(70));
    console.log('[Pipeline] PIPELINE SUMMARY');
    console.log('='.repeat(70));
    
    // Execution time summary
    console.log(`\n⏱️  Execution Time:`);
    console.log(`   Total Pipeline: ${(totalTimeMs / 1000).toFixed(2)}s (${totalTimeMs}ms)`);
    steps.forEach(step => {
      const percentage = ((step.executionTimeMs / totalTimeMs) * 100).toFixed(1);
      const status = step.skipped ? '⏭️  SKIPPED' : step.success ? '✅' : '❌';
      console.log(`   ${status} Step ${step.stepNumber} (${step.stepName}): ${(step.executionTimeMs / 1000).toFixed(2)}s (${percentage}%)`);
    });
    
    // Token usage summary
    console.log(`\n💵 Token Usage:`);
    console.log(`   Total: ${(totalTokenUsage.inputTokens + totalTokenUsage.outputTokens).toLocaleString()} tokens`);
    console.log(`   Input: ${totalTokenUsage.inputTokens.toLocaleString()} tokens`);
    console.log(`   Output: ${totalTokenUsage.outputTokens.toLocaleString()} tokens`);
    
    // Per-step token breakdown
    console.log(`\n   Per-Step Breakdown:`);
    steps.forEach(step => {
      if (step.tokenUsage && !step.skipped) {
        const stepTotal = step.tokenUsage.inputTokens + step.tokenUsage.outputTokens;
        console.log(`   ${step.success ? '✅' : '❌'} Step ${step.stepNumber} (${step.stepName}): ${stepTotal.toLocaleString()} tokens (${step.tokenUsage.inputTokens.toLocaleString()} in, ${step.tokenUsage.outputTokens.toLocaleString()} out)`);
      } else if (step.skipped) {
        console.log(`   ⏭️  Step ${step.stepNumber} (${step.stepName}): SKIPPED (0 tokens)`);
      }
    });
    
    // Model usage summary
    console.log(`\n🤖 Model Usage:`);
    const modelUsage = steps.reduce((acc, step) => {
      if (step.skipped) return acc;
      if (!acc[step.model]) {
        acc[step.model] = { count: 0, totalTokens: 0 };
      }
      acc[step.model].count++;
      if (step.tokenUsage) {
        acc[step.model].totalTokens += step.tokenUsage.inputTokens + step.tokenUsage.outputTokens;
      }
      return acc;
    }, {} as Record<string, { count: number; totalTokens: number }>);
    
    Object.entries(modelUsage).forEach(([model, usage]) => {
      console.log(`   ${model}: ${usage.count} step(s), ${usage.totalTokens.toLocaleString()} tokens`);
    });
    
    // Success/failure summary
    console.log(`\n📊 Step Results:`);
    const successCount = steps.filter(s => s.success && !s.skipped).length;
    const failureCount = steps.filter(s => !s.success).length;
    const skippedCount = steps.filter(s => s.skipped).length;
    console.log(`   ✅ Successful: ${successCount}`);
    if (failureCount > 0) {
      console.log(`   ❌ Failed: ${failureCount}`);
    }
    if (skippedCount > 0) {
      console.log(`   ⏭️  Skipped: ${skippedCount}`);
    }
    
    if (error) {
      console.log(`\n❌ Pipeline Status: FAILED`);
      console.log(`   Error: ${error.message || 'Unknown error'}`);
    } else {
      console.log(`\n✅ Pipeline Status: COMPLETED SUCCESSFULLY`);
    }
    
    console.log('='.repeat(70) + '\n');
  }

  /**
   * Helper function to emit progress updates via onChunk callback
   */
  function emitProgress(
    chunkCallback: ((chunk: string, isComplete: boolean) => void) | undefined,
    stepName: string,
    stepNumber: number,
    totalSteps: number
  ) {
    if (chunkCallback) {
      const progressUpdate = JSON.stringify({
        type: 'step-progress',
        step: stepName,
        stepNumber,
        totalSteps,
      });
      chunkCallback(progressUpdate, false);
    }
  }
}

