/**
 * Test script for Code Generation Step
 * Run with: npx tsx src/lib/ai/pipeline/steps/__test-code-generation.ts
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
import { getSimplifiedNodeList } from '../../workflow-generator';
import type { PipelineContext } from '../types';
import type { AIGeneratedWorkflow } from '@/lib/ai/types';

async function testCodeGeneration() {
  console.log('🧪 Testing Code Generation Step...\n');

  // Test case that requires custom nodes (from the guide)
  const testPrompt = "Create a workflow that fetches Bitcoin price from CoinGecko API";

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

  // Check if there are custom nodes
  const customNodes = workflowResult.data.nodes.filter(n => (n.data as any)?.nodeId === 'CUSTOM_GENERATED');
  console.log(`📊 Custom nodes found: ${customNodes.length}\n`);

  if (customNodes.length === 0) {
    console.log('⚠️  No custom nodes found in workflow. Testing with workflow that has no custom nodes...');
    // Test with workflow that has no custom nodes (should return unchanged)
    const codeResult = await generateCustomCode({
      ...workflowContext,
      workflow: workflowResult.data,
    });

    if (codeResult.success) {
      console.log('✅ Test Passed: Workflow returned unchanged (as expected)\n');
      console.log(`💵 Token Usage: ${codeResult.tokenUsage?.inputTokens || 0} input, ${codeResult.tokenUsage?.outputTokens || 0} output`);
    } else {
      console.error('❌ Test Failed:', codeResult.error);
    }
    return;
  }

  // Step 4: Test code generation
  console.log('📝 Step 4: Testing Code Generation with custom nodes...\n');

  // Remove customCode from custom nodes to test generation
  const workflowWithoutCode: AIGeneratedWorkflow = {
    ...workflowResult.data,
    nodes: workflowResult.data.nodes.map(node => {
      const nodeData = node.data as any;
      if (nodeData?.nodeId === 'CUSTOM_GENERATED') {
        return {
          ...node,
          data: {
            ...nodeData,
            customCode: undefined, // Remove customCode to force generation
            configSchema: undefined, // Remove configSchema to force generation
          },
        };
      }
      return node;
    }),
  };

  const codeContext: PipelineContext & { workflow: AIGeneratedWorkflow } = {
    userPrompt: testPrompt,
    availableNodes: availableNodes,
    workflow: workflowWithoutCode,
  };

  try {
    console.log('⏳ Calling generateCustomCode...\n');
    const result = await generateCustomCode(codeContext);

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
    console.log('🔍 Validation:');
    const workflow = result.data!;

    // Find custom nodes with generated code
    const customNodesWithCode = workflow.nodes.filter(n => {
      const nodeData = n.data as any;
      return nodeData?.nodeId === 'CUSTOM_GENERATED' && nodeData?.customCode;
    });

    console.log(`\n📦 Custom Nodes with Code: ${customNodesWithCode.length}`);

    // Validate each custom node
    customNodesWithCode.forEach((node, idx) => {
      const nodeData = node.data as any;
      console.log(`\n   Node ${idx + 1}: "${nodeData?.label || 'unnamed'}"`);
      
      // Check customCode
      const hasCustomCode = !!nodeData?.customCode && typeof nodeData.customCode === 'string';
      const codeLength = nodeData?.customCode?.length || 0;
      console.log(`      ${hasCustomCode ? '✅' : '❌'} Custom Code: ${hasCustomCode ? 'PRESENT' : 'MISSING'} (${codeLength} chars)`);
      
      // Check configSchema
      const hasConfigSchema = !!nodeData?.configSchema && typeof nodeData.configSchema === 'object';
      const schemaFields = hasConfigSchema ? Object.keys(nodeData.configSchema) : [];
      console.log(`      ${hasConfigSchema ? '✅' : '❌'} Config Schema: ${hasConfigSchema ? 'PRESENT' : 'MISSING'} (${schemaFields.length} fields)`);

      // Validate JavaScript syntax
      if (hasCustomCode) {
        try {
          // Try to parse as a function expression
          const codeStr = nodeData.customCode.trim();
          // Check if it looks like an async function
          const isAsyncFunction = codeStr.includes('async') && codeStr.includes('=>');
          const hasTryCatch = codeStr.includes('try') && codeStr.includes('catch');
          
          console.log(`      ${isAsyncFunction ? '✅' : '❌'} JavaScript Format: ${isAsyncFunction ? 'ASYNC FUNCTION' : 'INVALID FORMAT'}`);
          console.log(`      ${hasTryCatch ? '✅' : '⚠️'} Error Handling: ${hasTryCatch ? 'PRESENT' : 'MISSING'}`);
          
          // Try basic syntax validation (check for balanced brackets)
          const openBraces = (codeStr.match(/\{/g) || []).length;
          const closeBraces = (codeStr.match(/\}/g) || []).length;
          const openParens = (codeStr.match(/\(/g) || []).length;
          const closeParens = (codeStr.match(/\)/g) || []).length;
          
          const syntaxValid = openBraces === closeBraces && openParens === closeParens;
          console.log(`      ${syntaxValid ? '✅' : '❌'} Basic Syntax: ${syntaxValid ? 'VALID' : 'INVALID'}`);
          
        } catch (error: any) {
          console.log(`      ❌ Syntax Validation Error: ${error.message}`);
        }
      }

      // Validate configSchema matches code
      if (hasCustomCode && hasConfigSchema) {
        const codeStr = nodeData.customCode;
        const configRefs = extractConfigReferences(codeStr);
        const schemaFields = Object.keys(nodeData.configSchema);
        
        console.log(`\n      🔤 Config Schema Validation:`);
        console.log(`         Config references in code: ${configRefs.length} (${configRefs.join(', ') || 'none'})`);
        console.log(`         Schema fields: ${schemaFields.length} (${schemaFields.join(', ') || 'none'})`);
        
        const missingInSchema = configRefs.filter(ref => !schemaFields.includes(ref));
        const extraInSchema = schemaFields.filter(field => !configRefs.includes(field));
        
        if (missingInSchema.length > 0) {
          console.log(`         ❌ Missing in schema: ${missingInSchema.join(', ')}`);
        } else {
          console.log(`         ✅ All config references have schema fields`);
        }
        
        if (extraInSchema.length > 0) {
          console.log(`         ⚠️  Extra schema fields (may be optional): ${extraInSchema.join(', ')}`);
        }
        
        const allRefsInSchema = configRefs.every(ref => schemaFields.includes(ref));
        console.log(`         ${allRefsInSchema ? '✅' : '❌'} Schema matches code: ${allRefsInSchema ? 'YES' : 'NO'}`);
      }
    });

    // Test with workflow that has no custom nodes (should return unchanged)
    console.log('\n\n🧪 Test 2: Workflow with no custom nodes...');
    const simpleWorkflow: AIGeneratedWorkflow = {
      nodes: [
        {
          id: 'node-1',
          type: 'workflow-node',
          position: { x: 0, y: 0 },
          data: {
            nodeId: 'new-row-in-google-sheet',
            config: {},
          },
        },
      ],
      edges: [],
      reasoning: 'Test workflow',
      workflowName: 'Test',
    };

    const noCustomResult = await generateCustomCode({
      userPrompt: 'test',
      availableNodes: [],
      workflow: simpleWorkflow,
    });

    if (noCustomResult.success && noCustomResult.tokenUsage) {
      console.log('✅ Test Passed: Workflow with no custom nodes returned unchanged');
      console.log(`   Token Usage: ${noCustomResult.tokenUsage.inputTokens} input, ${noCustomResult.tokenUsage.outputTokens} output (should be 0)`);
    } else {
      console.log('⚠️  Workflow with no custom nodes: ', noCustomResult.success ? 'OK' : noCustomResult.error);
    }

    // Overall validation
    const allHaveCode = customNodesWithCode.every(n => {
      const nodeData = n.data as any;
      return !!nodeData?.customCode && !!nodeData?.configSchema;
    });

    console.log(`\n${allHaveCode ? '✅' : '⚠️'} Overall Validation: ${allHaveCode ? 'PASSED' : 'NEEDS REVIEW'}`);

  } catch (error: any) {
    console.error('❌ Test Error:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

/**
 * Extract config references from custom code (helper function)
 */
function extractConfigReferences(customCode: string): string[] {
  const configRefs = new Set<string>();

  // Pattern 1: config.fieldName
  const dotNotationRegex = /config\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = dotNotationRegex.exec(customCode)) !== null) {
    configRefs.add(match[1]);
  }

  // Pattern 2: config['fieldName'] or config["fieldName"]
  const bracketNotationRegex = /config\[['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\]/g;
  while ((match = bracketNotationRegex.exec(customCode)) !== null) {
    configRefs.add(match[1]);
  }

  return Array.from(configRefs);
}

// Run test
testCodeGeneration()
  .then(() => {
    console.log('\n✨ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

