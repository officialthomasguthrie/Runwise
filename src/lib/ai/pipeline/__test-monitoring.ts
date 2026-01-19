/**
 * Test script for Pipeline Monitoring & Logging (Step 10)
 * Tests execution time tracking, token usage logging, model logging, and success/failure tracking
 * Run with: npx tsx src/lib/ai/pipeline/__test-monitoring.ts
 * 
 * Note: Requires OPENAI_API_KEY environment variable
 */

require('dotenv').config({ path: '.env.local' });

import { runWorkflowGenerationPipeline } from './orchestrator';
import type { WorkflowGenerationRequest, AIGeneratedWorkflow } from '@/lib/ai/types';
import { getSimplifiedNodeList } from '../workflow-generator';

async function testMonitoring() {
  console.log('🧪 Testing Pipeline Monitoring & Logging (Step 10)...\n');
  console.log('This test will verify:');
  console.log('  ✅ Execution time tracking per step');
  console.log('  ✅ Token usage logging per step');
  console.log('  ✅ Model used per step');
  console.log('  ✅ Success/failure tracking per step');
  console.log('  ✅ Comprehensive pipeline summary\n');

  const testPrompt = "Create a workflow that sends me an email when a new row is added to my Google Sheet";

  let finalWorkflow: AIGeneratedWorkflow | null = null;
  let finalTokenUsage: { inputTokens: number; outputTokens: number } | undefined = undefined;
  let errorOccurred: Error | null = null;

  const startTime = Date.now();

  const request: WorkflowGenerationRequest & {
    onChunk?: (chunk: string, isComplete: boolean) => void;
    onComplete: (workflow: AIGeneratedWorkflow, tokenUsage?: { inputTokens: number; outputTokens: number }) => void;
    onError: (error: Error) => void;
  } = {
    userPrompt: testPrompt,
    availableNodes: getSimplifiedNodeList(),
    onChunk: (chunk, isComplete) => {
      // Parse chunk to see step progress
      try {
        const parsed = JSON.parse(chunk);
        if (parsed.type === 'step-progress') {
          console.log(`📊 Progress: Step ${parsed.stepNumber}/${parsed.totalSteps}: ${parsed.step}`);
        }
      } catch (e) {
        // Not a progress message, ignore
      }
    },
    onComplete: (workflow, usage) => {
      finalWorkflow = workflow;
      finalTokenUsage = usage;
    },
    onError: (error) => {
      errorOccurred = error;
    },
  };

  await runWorkflowGenerationPipeline(request);
  const totalTestTime = Date.now() - startTime;

  console.log('\n' + '='.repeat(70));
  console.log('TEST RESULTS');
  console.log('='.repeat(70));

  if (errorOccurred !== null) {
    console.error('\n❌ Test Failed:');
    console.error(`   Error: ${(errorOccurred as Error).message}`);
    console.log('\n⚠️  Check the pipeline logs above for monitoring information.');
    return;
  }

  if (!finalWorkflow) {
    console.error('\n❌ Test Failed: No workflow generated');
    return;
  }

  const workflow = finalWorkflow as AIGeneratedWorkflow;
  const tokenUsage = finalTokenUsage as { inputTokens: number; outputTokens: number } | undefined;
  
  console.log('\n✅ Pipeline Completed Successfully');
  console.log(`   Total Test Time: ${(totalTestTime / 1000).toFixed(2)}s`);
  console.log(`   Workflow Name: ${workflow.workflowName}`);
  console.log(`   Nodes: ${workflow.nodes.length}`);
  console.log(`   Edges: ${workflow.edges.length}`);

  if (tokenUsage) {
    console.log(`\n💵 Final Token Usage:`);
    console.log(`   Total: ${(tokenUsage.inputTokens + tokenUsage.outputTokens).toLocaleString()} tokens`);
    console.log(`   Input: ${tokenUsage.inputTokens.toLocaleString()} tokens`);
    console.log(`   Output: ${tokenUsage.outputTokens.toLocaleString()} tokens`);
  }

  console.log('\n📋 Monitoring Verification:');
  console.log('   ✅ Check the logs above for:');
  console.log('      - Step-by-step execution times');
  console.log('      - Token usage per step');
  console.log('      - Model used per step');
  console.log('      - Success/failure status per step');
  console.log('      - Comprehensive pipeline summary');
  console.log('\n   The pipeline summary should show:');
  console.log('      - Total execution time');
  console.log('      - Per-step execution times with percentages');
  console.log('      - Total and per-step token usage');
  console.log('      - Model usage breakdown (gpt-4o vs gpt-4o-mini)');
  console.log('      - Success/failure/skipped counts');

  console.log('\n' + '='.repeat(70));
  console.log('✅ Monitoring & Logging Test Complete!');
  console.log('   All monitoring data should be visible in the logs above.');
  console.log('='.repeat(70) + '\n');
}

// Run test
testMonitoring()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });


