/**
 * Test script for Validation Step
 * Run with: npx tsx src/lib/ai/pipeline/steps/__test-validation.ts
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
import { generateCustomCode } from './code-generation';
import { validateWorkflow } from './validation';
import { getSimplifiedNodeList } from '../../workflow-generator';
import type { PipelineContext } from '../types';
import type { AIGeneratedWorkflow } from '@/lib/ai/types';

async function testValidation() {
  console.log('🧪 Testing Validation Step...\n');

  // Test case - simple workflow that should validate
  const testPrompt = "Create a workflow that sends me an email when a new row is added to my Google Sheet";

  // Step 1: Get intent
  console.log('📝 Step 1: Getting intent...');
  const context: PipelineContext = {
    userPrompt: testPrompt,
    availableNodes: [],
  };

  const intentResult = await analyzeIntent(context);

  if (!intentResult.success || !intentResult.data) {
    console.error('❌ Intent Analysis Failed:');
    console.error(`   Error: ${intentResult.error}`);
    return;
  }

  console.log('✅ Intent Analysis Complete\n');

  // Step 2: Get plan
  console.log('📝 Step 2: Getting plan...');
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

  // Step 3: Get workflow structure
  console.log('📝 Step 3: Getting workflow structure...');
  const workflowContext: PipelineContext & { plan: typeof planResult.data } = {
    userPrompt: testPrompt,
    availableNodes: availableNodes,
    plan: planResult.data,
  };

  const workflowResult = await generateWorkflowStructure(workflowContext);

  if (!workflowResult.success || !workflowResult.data) {
    console.error('❌ Workflow Generation Failed:');
    console.error(`   Error: ${workflowResult.error}`);
    return;
  }

  console.log('✅ Workflow Generation Complete\n');

  // Step 4: Get custom code (if any)
  console.log('📝 Step 4: Getting custom code (if any)...');
  const codeResult = await generateCustomCode({
    ...workflowContext,
    workflow: workflowResult.data,
  });

  if (!codeResult.success || !codeResult.data) {
    console.error('❌ Code Generation Failed:');
    console.error(`   Error: ${codeResult.error}`);
    return;
  }

  console.log('✅ Code Generation Complete\n');

  // Step 5: Test validation
  console.log('📝 Step 5: Testing Validation...\n');

  const validateContext: PipelineContext & { workflow: AIGeneratedWorkflow } = {
    userPrompt: testPrompt,
    availableNodes: availableNodes,
    workflow: codeResult.data,
  };

  try {
    console.log('⏳ Calling validateWorkflow...\n');
    const result = await validateWorkflow(validateContext);

    if (!result.success) {
      console.error('❌ Test Failed:');
      console.error(`   Error: ${result.error}`);
      return;
    }

    console.log('✅ Test Passed!\n');
    
    if (result.tokenUsage) {
      console.log(`💵 Token Usage:`);
      console.log(`   Input: ${result.tokenUsage.inputTokens} tokens`);
      console.log(`   Output: ${result.tokenUsage.outputTokens} tokens`);
      console.log(`   Total: ${result.tokenUsage.inputTokens + result.tokenUsage.outputTokens} tokens\n`);
    }

    // Validate expected output
    console.log('🔍 Validation Results:');
    const validatedWorkflow = result.data!;

    // Check structure
    const structureChecks = [
      { name: 'Has nodes array', pass: Array.isArray(validatedWorkflow.nodes) },
      { name: 'Has edges array', pass: Array.isArray(validatedWorkflow.edges) },
      { name: 'Has reasoning', pass: typeof validatedWorkflow.reasoning === 'string' },
      { name: 'Has at least one node', pass: validatedWorkflow.nodes.length > 0 },
      { name: 'Has at least one edge', pass: validatedWorkflow.edges.length > 0 },
    ];

    structureChecks.forEach(check => {
      console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}: ${check.pass ? 'PASS' : 'FAIL'}`);
    });

    // Check all required fields are present
    console.log('\n📋 Required Fields Validation:');
    const allNodesValid = validatedWorkflow.nodes.every(n => {
      const nodeData = n.data as any;
      return n.id && n.type === 'workflow-node' && n.position && nodeData?.nodeId && nodeData?.description;
    });

    const allEdgesValid = validatedWorkflow.edges.every(e => {
      return e.id && e.source && e.target && e.type === 'buttonedge' && e.animated === true && e.style;
    });

    console.log(`   ${allNodesValid ? '✅' : '❌'} All nodes have required fields: ${allNodesValid ? 'YES' : 'NO'}`);
    console.log(`   ${allEdgesValid ? '✅' : '❌'} All edges have required fields: ${allEdgesValid ? 'YES' : 'NO'}`);

    // Check node IDs
    console.log('\n🔗 Edge Reference Validation:');
    const nodeIds = new Set(validatedWorkflow.nodes.map(n => n.id));
    let allEdgesReferenced = true;
    
    validatedWorkflow.edges.forEach(edge => {
      const sourceExists = nodeIds.has(edge.source);
      const targetExists = nodeIds.has(edge.target);
      
      if (!sourceExists || !targetExists) {
        allEdgesReferenced = false;
        console.log(`   ❌ Edge "${edge.id}": source=${sourceExists ? '✓' : '✗'} target=${targetExists ? '✓' : '✗'}`);
      }
    });

    if (allEdgesReferenced) {
      console.log(`   ✅ All edges reference valid nodes`);
    }

    // Check for missing descriptions
    console.log('\n📝 Description Validation:');
    const nodesWithoutDesc = validatedWorkflow.nodes.filter(n => {
      const nodeData = n.data as any;
      return !nodeData?.description || typeof nodeData.description !== 'string';
    });

    if (nodesWithoutDesc.length === 0) {
      console.log(`   ✅ All nodes have descriptions`);
    } else {
      console.log(`   ⚠️  ${nodesWithoutDesc.length} node(s) missing descriptions`);
    }

    // Check edge styles
    console.log('\n🎨 Edge Style Validation:');
    const edgesWithStyle = validatedWorkflow.edges.filter(e => e.style && e.style.stroke && e.style.strokeWidth);
    console.log(`   ${edgesWithStyle.length === validatedWorkflow.edges.length ? '✅' : '⚠️'} Edges with style: ${edgesWithStyle.length}/${validatedWorkflow.edges.length}`);

    // Compare before/after
    console.log('\n📊 Before/After Comparison:');
    console.log(`   Nodes: ${workflowResult.data.nodes.length} → ${validatedWorkflow.nodes.length} ${workflowResult.data.nodes.length === validatedWorkflow.nodes.length ? '✓' : '⚠️'}`);
    console.log(`   Edges: ${workflowResult.data.edges.length} → ${validatedWorkflow.edges.length} ${workflowResult.data.edges.length === validatedWorkflow.edges.length ? '✓' : '⚠️'}`);

    // Test with invalid workflow
    console.log('\n\n🧪 Test 2: Invalid workflow (should return error)...');
    const invalidWorkflow: AIGeneratedWorkflow = {
      nodes: [
        {
          id: 'node-1',
          type: 'workflow-node',
          position: { x: 0, y: 0 },
          data: {
            nodeId: 'test-node',
            config: {},
            // Missing description - should fail validation
          },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-nonexistent', // Invalid target - should fail validation
          type: 'buttonedge',
          animated: true,
          style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
        },
      ],
      reasoning: 'Test',
      workflowName: 'Test',
    };

    const invalidResult = await validateWorkflow({
      userPrompt: 'test',
      availableNodes: [],
      workflow: invalidWorkflow,
    });

    if (!invalidResult.success) {
      console.log(`   ✅ Test Passed: Validation correctly rejected invalid workflow`);
      console.log(`   Error: ${invalidResult.error}`);
    } else {
      console.log(`   ⚠️  Validation passed for invalid workflow (may need stricter checks)`);
    }

    // Overall validation
    const overallPassed = structureChecks.every(check => check.pass) &&
                          allNodesValid && allEdgesValid && allEdgesReferenced;

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
testValidation()
  .then(() => {
    console.log('\n✨ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

