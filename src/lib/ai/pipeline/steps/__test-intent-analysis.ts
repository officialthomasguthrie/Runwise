/**
 * Test script for Intent Analysis Step
 * Run with: npx tsx src/lib/ai/pipeline/steps/__test-intent-analysis.ts
 * 
 * Note: Requires OPENAI_API_KEY environment variable
 * Load from .env.local: npx dotenv-cli -e .env.local -- npx tsx src/lib/ai/pipeline/steps/__test-intent-analysis.ts
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
import type { PipelineContext } from '../types';

async function testIntentAnalysis() {
  console.log('🧪 Testing Intent Analysis Step...\n');

  // Test case from the guide
  const testPrompt = "Create a workflow that sends me an email when a new row is added to my Google Sheet";

  const context: PipelineContext = {
    userPrompt: testPrompt,
    availableNodes: [], // Empty for this test - intent analysis doesn't need nodes
  };

  console.log('📝 Test Input:');
  console.log(`   Prompt: "${testPrompt}"\n`);

  try {
    console.log('⏳ Calling analyzeIntent...\n');
    const result = await analyzeIntent(context);

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
    const intent = result.data!;
    
    const checks = [
      { name: 'Goal extracted', pass: !!intent.goal && intent.goal.length > 0 },
      { name: 'Triggers array', pass: Array.isArray(intent.triggers) },
      { name: 'Actions array', pass: Array.isArray(intent.actions) },
      { name: 'Transforms array', pass: Array.isArray(intent.transforms) },
      { name: 'Custom requirements array', pass: Array.isArray(intent.customRequirements) },
      { name: 'isModification boolean', pass: typeof intent.isModification === 'boolean' },
      { name: 'Trigger contains sheet-related', pass: intent.triggers.some(t => t.toLowerCase().includes('sheet') || t.toLowerCase().includes('row')) },
      { name: 'Action contains email-related', pass: intent.actions.some(a => a.toLowerCase().includes('email')) },
      { name: 'No custom requirements (expected)', pass: intent.customRequirements.length === 0 },
      { name: 'Not a modification', pass: intent.isModification === false },
    ];

    checks.forEach(check => {
      console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}: ${check.pass ? 'PASS' : 'FAIL'}`);
    });

    const allPassed = checks.every(check => check.pass);
    console.log(`\n${allPassed ? '✅' : '❌'} All validations: ${allPassed ? 'PASSED' : 'FAILED'}`);

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
testIntentAnalysis()
  .then(() => {
    console.log('\n✨ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

