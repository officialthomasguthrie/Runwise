/**
 * Test script for Node Matching Step
 * Run with: npx tsx src/lib/ai/pipeline/steps/__test-node-matching.ts
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
import { getSimplifiedNodeList } from '../../workflow-generator';
import type { PipelineContext } from '../types';

async function testNodeMatching() {
  console.log('🧪 Testing Node Matching Step...\n');

  // Test case from the guide - same as Step 2 test
  const testPrompt = "Create a workflow that sends me an email when a new row is added to my Google Sheet";

  // First, get intent from Step 2
  console.log('📝 Step 1: Getting intent from Step 2...');
  const context: PipelineContext = {
    userPrompt: testPrompt,
    availableNodes: [], // Will be populated below
  };

  const intentResult = await analyzeIntent(context);

  if (!intentResult.success) {
    console.error('❌ Intent Analysis Failed:');
    console.error(`   Error: ${intentResult.error}`);
    return;
  }

  console.log('✅ Intent Analysis Complete\n');
  console.log('📊 Intent:');
  console.log(JSON.stringify(intentResult.data, null, 2));
  console.log('');

  // Now test node matching with the intent
  console.log('📝 Step 2: Testing Node Matching with intent...\n');

  // Get available nodes (needed for node matching)
  const availableNodes = getSimplifiedNodeList();

  if (!intentResult.data) {
    console.error('❌ No intent data to use for matching');
    return;
  }

  const matchContext: PipelineContext & { intent: typeof intentResult.data } = {
    userPrompt: testPrompt,
    availableNodes: availableNodes,
    intent: intentResult.data,
  };

  try {
    console.log('⏳ Calling matchNodes...\n');
    const result = await matchNodes(matchContext);

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
    const plan = result.data!;
    
    // Check structure
    const structureChecks = [
      { name: 'Library nodes array', pass: Array.isArray(plan.libraryNodes) },
      { name: 'Custom nodes array', pass: Array.isArray(plan.customNodes) },
      { name: 'Connections array', pass: Array.isArray(plan.connections) },
      { name: 'Data flow array', pass: Array.isArray(plan.dataFlow) },
    ];

    structureChecks.forEach(check => {
      console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}: ${check.pass ? 'PASS' : 'FAIL'}`);
    });

    // Check expected library nodes
    console.log('\n📦 Library Nodes Validation:');
    const libraryNodeIds = plan.libraryNodes.map(n => n.id);
    const expectedNodes = ['new-row-in-google-sheet', 'send-email'];
    
    expectedNodes.forEach(expectedId => {
      const found = libraryNodeIds.includes(expectedId);
      console.log(`   ${found ? '✅' : '❌'} Node "${expectedId}": ${found ? 'FOUND' : 'MISSING'}`);
    });

    // Check node structure
    console.log('\n📋 Node Structure Validation:');
    plan.libraryNodes.forEach((node, idx) => {
      const hasId = !!node.id;
      const hasRole = !!node.role;
      const hasReason = !!node.reason;
      console.log(`   ${hasId && hasRole && hasReason ? '✅' : '❌'} Library Node ${idx + 1}: ${hasId ? 'ID ✓' : 'ID ✗'} ${hasRole ? 'Role ✓' : 'Role ✗'} ${hasReason ? 'Reason ✓' : 'Reason ✗'}`);
    });

    // Check custom nodes (should be empty for this test)
    console.log('\n🔧 Custom Nodes Validation:');
    console.log(`   ${plan.customNodes.length === 0 ? '✅' : '⚠️'} Custom nodes: ${plan.customNodes.length} (expected 0)`);
    if (plan.customNodes.length > 0) {
      plan.customNodes.forEach((node, idx) => {
        console.log(`      ${idx + 1}. ${node.name} (${node.type}): ${node.requirements}`);
      });
    }

    // Check connections
    console.log('\n🔗 Connections Validation:');
    console.log(`   📊 Total connections: ${plan.connections.length}`);
    plan.connections.forEach((conn, idx) => {
      const hasFrom = !!conn.from;
      const hasTo = !!conn.to;
      const hasReason = !!conn.reason;
      console.log(`   ${hasFrom && hasTo && hasReason ? '✅' : '❌'} Connection ${idx + 1}: "${conn.from}" → "${conn.to}" ${hasReason ? '✓' : '✗'}`);
    });

    // Check connection logic (should have trigger → action flow)
    const hasTriggerToAction = plan.connections.some(conn => {
      const fromNode = plan.libraryNodes.find(n => n.id === conn.from || n.id === conn.from);
      const toNode = plan.libraryNodes.find(n => n.id === conn.to || n.id === conn.to);
      return (fromNode?.role === 'trigger' && toNode?.role === 'action') ||
             (conn.from === 'new-row-in-google-sheet' && conn.to === 'send-email');
    });
    console.log(`   ${hasTriggerToAction ? '✅' : '⚠️'} Trigger → Action flow: ${hasTriggerToAction ? 'FOUND' : 'NOT FOUND'}`);

    // Check data flow
    console.log('\n🌊 Data Flow Validation:');
    console.log(`   📊 Total data flows: ${plan.dataFlow.length}`);
    plan.dataFlow.forEach((flow, idx) => {
      const hasSource = !!flow.source;
      const hasTarget = !!flow.target;
      const hasField = !!flow.field;
      console.log(`   ${hasSource && hasTarget && hasField ? '✅' : '❌'} Flow ${idx + 1}: "${flow.source}" → "${flow.target}" (${flow.field}) ${hasField ? '✓' : '✗'}`);
    });

    // Overall validation
    const allPassed = structureChecks.every(check => check.pass) &&
                     expectedNodes.every(id => libraryNodeIds.includes(id)) &&
                     plan.customNodes.length === 0 &&
                     plan.connections.length > 0;

    console.log(`\n${allPassed ? '✅' : '⚠️'} Overall Validation: ${allPassed ? 'PASSED' : 'NEEDS REVIEW'}`);

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
testNodeMatching()
  .then(() => {
    console.log('\n✨ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

