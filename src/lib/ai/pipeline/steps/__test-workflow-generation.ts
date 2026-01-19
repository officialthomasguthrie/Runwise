/**
 * Test script for Workflow Generation Step
 * Run with: npx tsx src/lib/ai/pipeline/steps/__test-workflow-generation.ts
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

import { analyzeIntent } from './intent-analysis';
import { matchNodes } from './node-matching';
import { generateWorkflowStructure } from './workflow-generation';
import { getSimplifiedNodeList } from '../../workflow-generator';
import type { PipelineContext } from '../types';
import type { AIGeneratedWorkflow } from '@/lib/ai/types';

async function testWorkflowGeneration() {
  console.log('🧪 Testing Workflow Generation Step...\n');

  // Test case from the guide - same as previous tests
  const testPrompt = "Create a workflow that sends me an email when a new row is added to my Google Sheet";

  // Step 1: Get intent from Step 2
  console.log('📝 Step 1: Getting intent from Step 2...');
  const context: PipelineContext = {
    userPrompt: testPrompt,
    availableNodes: [], // Will be populated below
  };

  const intentResult = await analyzeIntent(context);

  if (!intentResult.success || !intentResult.data) {
    console.error('❌ Intent Analysis Failed:');
    console.error(`   Error: ${intentResult.error}`);
    return;
  }

  console.log('✅ Intent Analysis Complete\n');

  // Step 2: Get plan from Step 3
  console.log('📝 Step 2: Getting plan from Step 3...');
  const availableNodes = getSimplifiedNodeList();

  const matchContext: PipelineContext & { intent: typeof intentResult.data } = {
    userPrompt: testPrompt,
    availableNodes: availableNodes,
    intent: intentResult.data,
  };

  const planResult = await matchNodes(matchContext);

  if (!planResult.success || !planResult.data) {
    console.error('❌ Node Matching Failed:');
    console.error(`   Error: ${planResult.error}`);
    return;
  }

  console.log('✅ Node Matching Complete\n');

  // Step 3: Test workflow generation with the plan
  console.log('📝 Step 3: Testing Workflow Generation with plan...\n');

  const workflowContext: PipelineContext & { plan: typeof planResult.data } = {
    userPrompt: testPrompt,
    availableNodes: availableNodes,
    plan: planResult.data,
  };

  try {
    console.log('⏳ Calling generateWorkflowStructure (non-streaming)...\n');
    const result = await generateWorkflowStructure(workflowContext);

    if (!result.success) {
      console.error('❌ Test Failed:');
      console.error(`   Error: ${result.error}`);
      return;
    }

    console.log('✅ Test Passed!\n');
    console.log('📊 Output:');
    console.log(JSON.stringify(result.data, null, 2));
    
    if (result.tokenUsage) {
      console.log(`\n💵 Token Usage:`);
      console.log(`   Input: ${result.tokenUsage.inputTokens} tokens`);
      console.log(`   Output: ${result.tokenUsage.outputTokens} tokens`);
      console.log(`   Total: ${result.tokenUsage.inputTokens + result.tokenUsage.outputTokens} tokens`);
    }

    // Validate expected output
    console.log('\n🔍 Validation:');
    const workflow = result.data!;

    // Check structure matches AIGeneratedWorkflow interface
    const structureChecks = [
      { name: 'Has nodes array', pass: Array.isArray(workflow.nodes) },
      { name: 'Has edges array', pass: Array.isArray(workflow.edges) },
      { name: 'Has reasoning', pass: typeof workflow.reasoning === 'string' },
      { name: 'Has workflowName (optional)', pass: !workflow.workflowName || typeof workflow.workflowName === 'string' },
      { name: 'Has at least one node', pass: workflow.nodes.length > 0 },
      { name: 'Has at least one edge', pass: workflow.edges.length > 0 },
    ];

    structureChecks.forEach(check => {
      console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}: ${check.pass ? 'PASS' : 'FAIL'}`);
    });

    // Check node structure
    console.log('\n📦 Node Structure Validation:');
    workflow.nodes.forEach((node, idx) => {
      const hasId = !!node.id;
      const hasType = node.type === 'workflow-node';
      const hasPosition = !!node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number';
      const hasData = !!node.data;
      const hasNodeId = !!node.data?.nodeId;
      const nodeData = node.data as any; // Type assertion since AIGeneratedWorkflow interface is restrictive
      const hasLabel = !!nodeData?.label;
      const hasDescription = !!nodeData?.description;
      
      const allPass = hasId && hasType && hasPosition && hasData && hasNodeId && hasLabel && hasDescription;
      
      const nodeLabel = nodeData?.label || 'unnamed';
      console.log(`   ${allPass ? '✅' : '❌'} Node ${idx + 1} "${nodeLabel}": ${hasId ? 'ID ✓' : 'ID ✗'} ${hasType ? 'Type ✓' : 'Type ✗'} ${hasPosition ? 'Pos ✓' : 'Pos ✗'} ${hasNodeId ? 'NodeID ✓' : 'NodeID ✗'} ${hasLabel ? 'Label ✓' : 'Label ✗'} ${hasDescription ? 'Desc ✓' : 'Desc ✗'}`);
    });

    // Check that expected nodes are present
    console.log('\n📋 Expected Nodes Check:');
    const nodeIds = workflow.nodes.map(n => (n.data as any)?.nodeId);
    const expectedNodeIds = ['new-row-in-google-sheet', 'send-email'];
    
    expectedNodeIds.forEach(expectedId => {
      const found = nodeIds.includes(expectedId);
      console.log(`   ${found ? '✅' : '❌'} Node "${expectedId}": ${found ? 'FOUND' : 'MISSING'}`);
    });

    // Check edge structure and connections
    console.log('\n🔗 Edge Structure Validation:');
    workflow.edges.forEach((edge, idx) => {
      const hasId = !!edge.id;
      const hasSource = !!edge.source;
      const hasTarget = !!edge.target;
      const hasType = edge.type === 'buttonedge';
      const isAnimated = edge.animated === true;
      const hasStyle = !!edge.style;
      
      // Check that source and target nodes exist
      const sourceExists = workflow.nodes.some(n => n.id === edge.source);
      const targetExists = workflow.nodes.some(n => n.id === edge.target);
      
      const allPass = hasId && hasSource && hasTarget && hasType && isAnimated && hasStyle && sourceExists && targetExists;
      
      console.log(`   ${allPass ? '✅' : '❌'} Edge ${idx + 1} "${edge.source}" → "${edge.target}": ${hasId ? 'ID ✓' : 'ID ✗'} ${hasType ? 'Type ✓' : 'Type ✗'} ${isAnimated ? 'Anim ✓' : 'Anim ✗'} ${sourceExists && targetExists ? 'Conn ✓' : 'Conn ✗'}`);
    });

    // Check template syntax in configs
    console.log('\n🔤 Template Syntax Validation:');
    let hasTemplateSyntax = false;
    workflow.nodes.forEach((node, idx) => {
      const nodeData = node.data as any;
      if (nodeData?.config && typeof nodeData.config === 'object') {
        const configStr = JSON.stringify(nodeData.config);
        if (configStr.includes('{{inputData.')) {
          hasTemplateSyntax = true;
          console.log(`   ✅ Node ${idx + 1} "${nodeData?.label || 'unnamed'}": Contains template syntax ({{inputData.}})`);
        }
      }
      // Also check configSchema which may have template syntax
      if (nodeData?.configSchema && typeof nodeData.configSchema === 'object') {
        const schemaStr = JSON.stringify(nodeData.configSchema);
        if (schemaStr.includes('{{inputData.')) {
          hasTemplateSyntax = true;
          console.log(`   ✅ Node ${idx + 1} "${nodeData?.label || 'unnamed'}": Contains template syntax in configSchema ({{inputData.}})`);
        }
      }
    });
    
    if (!hasTemplateSyntax) {
      console.log(`   ⚠️  No template syntax found (may be okay if no data flow needed)`);
    }

    // Check positions are {x: 0, y: 0}
    console.log('\n📍 Position Validation:');
    const allZeroPositions = workflow.nodes.every(n => n.position.x === 0 && n.position.y === 0);
    console.log(`   ${allZeroPositions ? '✅' : '⚠️'} All positions are {x: 0, y: 0}: ${allZeroPositions ? 'YES' : 'NO'}`);

    // Test streaming mode
    console.log('\n🌊 Streaming Test:');
    let streamChunks: string[] = [];
    let streamComplete = false;
    
    const streamResult = await generateWorkflowStructure(workflowContext, (chunk, isComplete) => {
      streamChunks.push(chunk);
      streamComplete = isComplete;
    });

    if (streamResult.success) {
      console.log(`   ✅ Streaming mode works: ${streamChunks.length} chunks received`);
      console.log(`   ✅ Streaming complete: ${streamComplete ? 'YES' : 'NO'}`);
      console.log(`   ✅ Streamed workflow has ${streamResult.data?.nodes.length || 0} nodes`);
    } else {
      console.log(`   ❌ Streaming mode failed: ${streamResult.error}`);
    }

    // Overall validation
    const allStructurePassed = structureChecks.every(check => check.pass);
    const allNodesValid = workflow.nodes.every(n => {
      const nodeData = n.data as any;
      return n.id && n.type === 'workflow-node' && n.position && nodeData?.nodeId && nodeData?.label && nodeData?.description;
    });
    const allEdgesValid = workflow.edges.every(e =>
      e.id && e.source && e.target && e.type === 'buttonedge' && e.animated && e.style &&
      workflow.nodes.some(n => n.id === e.source) && workflow.nodes.some(n => n.id === e.target)
    );

    const overallPassed = allStructurePassed && allNodesValid && allEdgesValid;

    console.log(`\n${overallPassed ? '✅' : '⚠️'} Overall Validation: ${overallPassed ? 'PASSED' : 'NEEDS REVIEW'}`);

  } catch (error: any) {
    console.error('❌ Test Error:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

// Run test
testWorkflowGeneration()
  .then(() => {
    console.log('\n✨ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

