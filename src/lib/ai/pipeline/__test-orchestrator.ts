/**
 * Test script for Pipeline Orchestrator
 * Run with: npx tsx src/lib/ai/pipeline/__test-orchestrator.ts
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

import { runWorkflowGenerationPipeline } from './orchestrator';
import { getSimplifiedNodeList } from '../workflow-generator';
import type { AIGeneratedWorkflow } from '@/lib/ai/types';

async function testOrchestrator() {
  console.log('🧪 Testing Pipeline Orchestrator...\n');

  const testCases = [
    {
      name: 'Simple Workflow (No Custom Nodes)',
      prompt: "Create a workflow that sends me an email when a new row is added to my Google Sheet",
    },
    {
      name: 'Complex Workflow (May Have Custom Nodes)',
      prompt: "Create a workflow that monitors a RSS feed, extracts article summaries using AI, filters for specific keywords, and posts the filtered articles to a Slack channel with custom formatting",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test Case: ${testCase.name}`);
    console.log(`Prompt: ${testCase.prompt}`);
    console.log('='.repeat(60) + '\n');

    let stepProgress: any[] = [];
    let streamedChunks: string[] = [];
    let finalWorkflow: AIGeneratedWorkflow | null = null;
    let finalTokenUsage: { inputTokens: number; outputTokens: number } | undefined = undefined;
    let errorOccurred: Error | null = null;

    const startTime = Date.now();

    try {
      await runWorkflowGenerationPipeline({
        userPrompt: testCase.prompt,
        availableNodes: getSimplifiedNodeList(),
        onChunk: (chunk: string, isComplete: boolean) => {
          try {
            const parsed = JSON.parse(chunk);
            if (parsed.type === 'step-progress') {
              stepProgress.push(parsed);
              console.log(`📊 Step ${parsed.stepNumber}/${parsed.totalSteps}: ${parsed.step}...`);
            } else {
              // This is a workflow JSON chunk from Step 3
              streamedChunks.push(chunk);
              if (isComplete) {
                console.log(`   ✅ Received complete workflow JSON`);
              }
            }
          } catch (e) {
            // Not JSON, just a partial chunk
            streamedChunks.push(chunk);
          }
        },
        onComplete: (workflow: AIGeneratedWorkflow, tokenUsage?: { inputTokens: number; outputTokens: number }) => {
          finalWorkflow = workflow;
          finalTokenUsage = tokenUsage;
          const duration = Date.now() - startTime;
          console.log(`\n✅ Pipeline Completed Successfully!`);
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

          // Check for custom nodes
          const customNodes = workflow.nodes.filter(n => {
            const nodeData = n.data as any;
            return nodeData?.nodeId === 'CUSTOM_GENERATED';
          });
          
          if (customNodes.length > 0) {
            console.log(`\n🔧 Custom Nodes: ${customNodes.length}`);
            customNodes.forEach(node => {
              const nodeData = node.data as any;
              console.log(`   - ${nodeData?.label || node.id}: ${nodeData?.customCode ? 'Has code ✓' : 'Missing code ✗'}`);
            });
          }

          // Show step progress
          console.log(`\n📈 Step Progress:`);
          stepProgress.forEach(progress => {
            console.log(`   ${progress.stepNumber}. ${progress.step}`);
          });

          if (streamedChunks.length > 0) {
            console.log(`\n📡 Streaming: Received ${streamedChunks.length} chunk(s) from Step 3`);
          }
        },
        onError: (error: Error) => {
          errorOccurred = error;
          const duration = Date.now() - startTime;
          console.error(`\n❌ Pipeline Failed!`);
          console.error(`   Duration: ${(duration / 1000).toFixed(2)}s`);
          console.error(`   Error: ${error.message}`);
        },
      });

      if (errorOccurred) {
        console.log(`\n⚠️  Test case failed with error`);
        continue;
      }

      if (!finalWorkflow) {
        console.log(`\n⚠️  Test case completed but no workflow received`);
        continue;
      }

      console.log(`\n✅ Test case passed!`);

    } catch (error: any) {
      console.error(`\n💥 Unexpected error in test case:`);
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    }
  }

  // Test error handling
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`Test: Error Handling (Invalid Request)`);
  console.log('='.repeat(60) + '\n');

  let errorCaught = false;
  await runWorkflowGenerationPipeline({
    userPrompt: '', // Empty prompt should cause intent analysis to fail or produce poor results
    availableNodes: getSimplifiedNodeList(),
    onChunk: () => {},
    onComplete: () => {
      console.log('⚠️  Error handling test: onComplete called unexpectedly');
    },
    onError: (error: Error) => {
      errorCaught = true;
      console.log(`✅ Error handling test: onError called correctly`);
      console.log(`   Error: ${error.message}`);
    },
  });

  if (!errorCaught) {
    console.log(`⚠️  Error handling test: Expected error was not caught`);
  }
}

// Run tests
testOrchestrator()
  .then(() => {
    console.log('\n✨ All tests complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

