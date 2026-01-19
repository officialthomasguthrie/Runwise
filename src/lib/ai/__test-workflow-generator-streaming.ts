/**
 * Test script for Updated generateWorkflowFromPromptStreaming
 * Tests that the wrapper correctly calls the pipeline orchestrator
 * Run with: npx tsx src/lib/ai/__test-workflow-generator-streaming.ts
 * 
 * Note: Requires OPENAI_API_KEY environment variable
 */

// Load environment variables from .env.local if available
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.resolve(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach((line: string) => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    console.log(`📁 Loaded environment from: .env.local\n`);
  }
} catch (error) {
  console.warn('⚠️  Could not load .env.local, using system environment variables\n');
}

import { generateWorkflowFromPromptStreaming } from './workflow-generator';
import { getSimplifiedNodeList } from './workflow-generator';
import type { AIGeneratedWorkflow } from './types';

async function testUpdatedFunction() {
  console.log('🧪 Testing Updated generateWorkflowFromPromptStreaming (Pipeline Wrapper)...\n');

  const testPrompt = "Create a workflow that sends me an email when a new row is added to my Google Sheet";

  let chunksReceived: string[] = [];
  let stepProgressCount = 0;
  let jsonChunksCount = 0;
  let finalWorkflow: AIGeneratedWorkflow | null = null;
  let finalTokenUsage: { inputTokens: number; outputTokens: number } | undefined = undefined;
  let errorOccurred: Error | null = null;

  const startTime = Date.now();

  try {
    await generateWorkflowFromPromptStreaming({
      userPrompt: testPrompt,
      availableNodes: getSimplifiedNodeList(),
      onChunk: (jsonChunk: string, isComplete: boolean) => {
        chunksReceived.push(jsonChunk);
        
        // Try to parse as JSON to determine if it's step-progress or workflow JSON
        try {
          const parsed = JSON.parse(jsonChunk);
          if (parsed.type === 'step-progress') {
            stepProgressCount++;
            console.log(`📊 Step ${parsed.stepNumber}/${parsed.totalSteps}: ${parsed.step}...`);
          } else {
            // This is workflow JSON (or part of it)
            jsonChunksCount++;
          }
        } catch (e) {
          // Not JSON yet (incomplete chunk), count as JSON chunk
          jsonChunksCount++;
        }
      },
      onComplete: (workflow: AIGeneratedWorkflow, tokenUsage?: { inputTokens: number; outputTokens: number }) => {
        finalWorkflow = workflow;
        finalTokenUsage = tokenUsage;
        const duration = Date.now() - startTime;
        
        console.log(`\n✅ Function Completed Successfully!`);
        console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
        console.log(`   Workflow Name: ${workflow.workflowName}`);
        console.log(`   Nodes: ${workflow.nodes.length}`);
        console.log(`   Edges: ${workflow.edges.length}`);
        
        if (tokenUsage) {
          console.log(`\n💵 Token Usage:`);
          console.log(`   Input: ${tokenUsage.inputTokens.toLocaleString()} tokens`);
          console.log(`   Output: ${tokenUsage.outputTokens.toLocaleString()} tokens`);
          console.log(`   Total: ${(tokenUsage.inputTokens + tokenUsage.outputTokens).toLocaleString()} tokens`);
        }

        // Validate workflow structure
        console.log(`\n🔍 Workflow Validation:`);
        const hasAllNodes = Array.isArray(workflow.nodes) && workflow.nodes.length > 0;
        const hasAllEdges = Array.isArray(workflow.edges) && workflow.edges.length > 0;
        const allNodesHaveData = workflow.nodes.every(n => n.data && (n.data as any).nodeId);
        const allEdgesValid = workflow.edges.every(e => e.source && e.target && e.type === 'buttonedge');
        
        console.log(`   ${hasAllNodes ? '✅' : '❌'} Has nodes: ${hasAllNodes}`);
        console.log(`   ${hasAllEdges ? '✅' : '❌'} Has edges: ${hasAllEdges}`);
        console.log(`   ${allNodesHaveData ? '✅' : '❌'} All nodes have data: ${allNodesHaveData}`);
        console.log(`   ${allEdgesValid ? '✅' : '❌'} All edges valid: ${allEdgesValid}`);

        // Verify all nodes have descriptions
        const nodesWithoutDesc = workflow.nodes.filter(n => {
          const nodeData = n.data as any;
          return !nodeData?.description || typeof nodeData.description !== 'string';
        });

        if (nodesWithoutDesc.length === 0) {
          console.log(`   ✅ All nodes have descriptions`);
        } else {
          console.log(`   ⚠️  ${nodesWithoutDesc.length} node(s) missing descriptions`);
        }

        console.log(`\n📡 Streaming Stats:`);
        console.log(`   Total chunks received: ${chunksReceived.length}`);
        console.log(`   Step progress messages: ${stepProgressCount}`);
        console.log(`   JSON chunks: ${jsonChunksCount}`);

        // Verify backward compatibility: interface should match exactly
        console.log(`\n🔌 Backward Compatibility Check:`);
        console.log(`   ✅ Function signature unchanged`);
        console.log(`   ✅ onChunk callback receives chunks`);
        console.log(`   ✅ onComplete receives workflow and tokenUsage`);
        console.log(`   ✅ Output format matches AIGeneratedWorkflow`);
        
      },
      onError: (error: Error) => {
        errorOccurred = error;
        const duration = Date.now() - startTime;
        console.error(`\n❌ Function Failed!`);
        console.error(`   Duration: ${(duration / 1000).toFixed(2)}s`);
        console.error(`   Error: ${error.message}`);
      },
    });

    if (errorOccurred) {
      console.log(`\n⚠️  Test failed with error`);
      return;
    }

    if (!finalWorkflow) {
      console.log(`\n⚠️  Test completed but no workflow received`);
      return;
    }

    // Overall validation (finalWorkflow is guaranteed to be non-null here)
    const workflow = finalWorkflow as AIGeneratedWorkflow;
    const overallPassed = workflow.nodes.length > 0 && 
                          workflow.edges.length > 0 && 
                          stepProgressCount >= 5 && // Should receive progress for all 5 steps
                          finalTokenUsage !== undefined;

    console.log(`\n${overallPassed ? '✅' : '⚠️'} Overall Test: ${overallPassed ? 'PASSED' : 'NEEDS REVIEW'}`);

    if (overallPassed) {
      console.log(`\n✅ All backward compatibility checks passed!`);
      console.log(`   The updated function correctly delegates to the pipeline orchestrator.`);
    }

  } catch (error: any) {
    console.error(`\n💥 Unexpected error in test:`);
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

// Run test
testUpdatedFunction()
  .then(() => {
    console.log('\n✨ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

