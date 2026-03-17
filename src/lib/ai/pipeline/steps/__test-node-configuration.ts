/**
 * Test script for Node Configuration Step
 * Run with: npx tsx src/lib/ai/pipeline/steps/__test-node-configuration.ts
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
import { configureNodes } from './node-configuration';
import { getSimplifiedNodeList } from '../../workflow-generator';
import type { PipelineContext } from '../types';
import type { AIGeneratedWorkflow } from '@/lib/ai/types';

async function testNodeConfiguration() {
  console.log('🧪 Testing Node Configuration Step...\n');

  // Test case with explicit values that should be filled
  const testPrompt = "Create a workflow that runs daily at 9 AM and sends an email to john@example.com with subject 'Daily Report'";

  // Step 1: Get intent
  console.log('📝 Step 1: Analyzing intent...');
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
  console.log('📝 Step 2: Matching nodes...');
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

  // Step 3: Generate workflow structure
  console.log('📝 Step 3: Generating workflow structure...');
  const workflowContext: PipelineContext & { plan: typeof planResult.data } = {
    userPrompt: testPrompt,
    availableNodes: availableNodes,
    intent: intentResult.data,
    plan: planResult.data,
  };

  const workflowResult = await generateWorkflowStructure(workflowContext);

  if (!workflowResult.success || !workflowResult.data) {
    console.error('❌ Workflow Generation Failed:');
    console.error(`   Error: ${workflowResult.error}`);
    return;
  }

  console.log('✅ Workflow Generation Complete\n');
  console.log(`   Generated ${workflowResult.data.nodes.length} nodes\n`);

  // Step 4: Configure nodes
  console.log('📝 Step 4: Configuring nodes...');
  const configContext: PipelineContext & { 
    workflow: AIGeneratedWorkflow; 
    intent: typeof intentResult.data 
  } = {
    userPrompt: testPrompt,
    availableNodes: availableNodes,
    intent: intentResult.data,
    workflow: workflowResult.data,
  };

  const configResult = await configureNodes(configContext);

  if (!configResult.success || !configResult.data) {
    console.error('❌ Node Configuration Failed:');
    console.error(`   Error: ${configResult.error}`);
    return;
  }

  console.log('✅ Node Configuration Complete\n');

  // Validate the configuration
  console.log('🔍 Validating Configuration...\n');

  let configuredCount = 0;
  let totalFields = 0;

  configResult.data.nodes.forEach((node) => {
    const nodeData = node.data as any;
    const config = nodeData.config || {};
    const nodeId = nodeData.nodeId;
    
    // Get configSchema (simplified check - would need full registry in real scenario)
    const hasConfig = Object.keys(config).length > 0;
    
    if (hasConfig) {
      configuredCount++;
      const fieldsCount = Object.keys(config).length;
      totalFields += fieldsCount;
      
      console.log(`   ✅ Node: ${nodeData.label || nodeId}`);
      console.log(`      Configured fields: ${fieldsCount}`);
      Object.entries(config).forEach(([key, value]) => {
        // Truncate long values for display
        const displayValue = typeof value === 'string' && value.length > 50 
          ? value.substring(0, 50) + '...' 
          : value;
        console.log(`      - ${key}: ${JSON.stringify(displayValue)}`);
      });
      console.log();
    } else {
      console.log(`   ⚠️  Node: ${nodeData.label || nodeId} - No config filled`);
    }
  });

  console.log(`\n📊 Configuration Summary:`);
  console.log(`   Nodes with config: ${configuredCount}/${configResult.data.nodes.length}`);
  console.log(`   Total fields filled: ${totalFields}`);

  // Check for expected values based on test prompt
  console.log(`\n🔍 Validating Expected Values...\n`);

  const scheduledNode = configResult.data.nodes.find((node) => {
    const nodeData = node.data as any;
    return nodeData.nodeId?.toLowerCase().includes('schedule') || 
           nodeData.nodeId?.toLowerCase().includes('time') ||
           nodeData.nodeId?.toLowerCase().includes('trigger');
  });

  if (scheduledNode) {
    const config = (scheduledNode.data as any).config || {};
    const hasTime = config.time || config.schedule || config.cron;
    const hasFrequency = config.frequency || config.interval || config.repeat;
    
    console.log(`   Scheduled Node (${(scheduledNode.data as any).label}):`);
    console.log(`      ${hasTime ? '✅' : '❌'} Time configured: ${hasTime ? JSON.stringify(hasTime) : 'MISSING'}`);
    console.log(`      ${hasFrequency ? '✅' : '❌'} Frequency configured: ${hasFrequency ? JSON.stringify(hasFrequency) : 'MISSING'}`);
  } else {
    console.log(`   ⚠️  No scheduled trigger node found`);
  }

  const emailNode = configResult.data.nodes.find((node) => {
    const nodeData = node.data as any;
    return nodeData.nodeId?.toLowerCase().includes('email') || 
           nodeData.nodeId?.toLowerCase().includes('send') ||
           nodeData.nodeId?.toLowerCase().includes('gmail');
  });

  if (emailNode) {
    const config = (emailNode.data as any).config || {};
    const hasTo = config.to || config.recipient || config.emailTo;
    const hasSubject = config.subject || config.emailSubject;
    
    console.log(`   Email Node (${(emailNode.data as any).label}):`);
    console.log(`      ${hasTo ? '✅' : '❌'} To configured: ${hasTo ? JSON.stringify(hasTo) : 'MISSING'}`);
    console.log(`      ${hasSubject ? '✅' : '❌'} Subject configured: ${hasSubject ? JSON.stringify(hasSubject) : 'MISSING'}`);
  } else {
    console.log(`   ⚠️  No email node found`);
  }

  console.log(`\n✅ Test Complete!\n`);
}

// Run the test
testNodeConfiguration().catch((error) => {
  console.error('\n❌ Test Failed with Error:');
  console.error(error);
  process.exit(1);
});

