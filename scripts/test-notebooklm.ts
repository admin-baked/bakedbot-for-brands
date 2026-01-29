#!/usr/bin/env tsx
/**
 * Test NotebookLM MCP Integration
 *
 * Simple script to verify the NotebookLM integration works from Node.js
 *
 * Usage:
 *   npx tsx scripts/test-notebooklm.ts
 */

import { notebookLM, askNotebookLM, isNotebookLMReady, batchQuery } from '@/server/services/notebooklm-client';

async function main() {
  console.log('🧪 Testing NotebookLM MCP Integration\n');

  // Test 1: Health Check
  console.log('1️⃣  Health Check...');
  try {
    const health = await notebookLM.healthCheck();
    console.log('   ✅ Service healthy:', health.healthy);
    console.log('   🔐 Authenticated:', health.authenticated);
    console.log('   📊 Status:', health.status);

    if (!health.authenticated) {
      console.log('\n   ⚠️  Warning: Not authenticated with Google');
      console.log('   Run: cd python-sidecar && .\\auth-setup.ps1');
    }
  } catch (error) {
    console.error('   ❌ Health check failed:', error);
    process.exit(1);
  }

  console.log();

  // Test 2: Simple Question
  console.log('2️⃣  Simple Question...');
  try {
    const answer = await askNotebookLM('What is this notebook about?');
    console.log('   ✅ Response received');
    console.log('   📝 Preview:', answer.substring(0, 100) + '...');
  } catch (error) {
    console.error('   ⚠️  Query failed:', error instanceof Error ? error.message : String(error));
  }

  console.log();

  // Test 3: Full Chat with Options
  console.log('3️⃣  Full Chat Query...');
  try {
    const response = await notebookLM.chat({
      message: 'What are the key insights from this research?',
      timeout: 30
    });

    if (response.error) {
      console.log('   ⚠️  Error:', response.error);
    } else {
      console.log('   ✅ Success');
      console.log('   🔐 Authenticated:', response.authenticated);
      console.log('   📝 Response length:', response.response.length, 'chars');

      if (response.sources && response.sources.length > 0) {
        console.log('   📚 Sources:', response.sources.length);
      }
    }
  } catch (error) {
    console.error('   ❌ Chat failed:', error);
  }

  console.log();

  // Test 4: Batch Queries
  console.log('4️⃣  Batch Queries...');
  try {
    const queries = [
      'What are the main topics covered?',
      'What are the key takeaways?',
      'What recommendations are made?'
    ];

    console.log(`   Running ${queries.length} queries with rate limiting...`);

    const results = await batchQuery(queries, 1000); // 1 second delay

    console.log('   ✅ Batch complete');
    console.log(`   📊 Results: ${results.size} / ${queries.length}`);

    // Show first result preview
    const firstResult = results.values().next().value;
    if (firstResult) {
      console.log('   📝 Sample:', firstResult.substring(0, 80) + '...');
    }
  } catch (error) {
    console.error('   ❌ Batch failed:', error);
  }

  console.log();

  // Test 5: Multi-step Research
  console.log('5️⃣  Multi-step Research (send + receive)...');
  try {
    // Send message without waiting
    await notebookLM.sendMessage({
      message: 'Summarize the most important findings',
      waitForResponse: false
    });

    console.log('   ✅ Message sent');
    console.log('   ⏳ Waiting for response...');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get response
    const response = await notebookLM.getResponse(30);

    if (response.error) {
      console.log('   ⚠️  Error:', response.error);
    } else {
      console.log('   ✅ Response received');
      console.log('   📝 Length:', response.response.length, 'chars');
    }
  } catch (error) {
    console.error('   ❌ Multi-step failed:', error);
  }

  console.log();

  // Test 6: Notebook Management
  console.log('6️⃣  Notebook Management...');
  try {
    const currentNotebook = await notebookLM.getDefaultNotebook();

    if (currentNotebook) {
      console.log('   ✅ Current notebook:', currentNotebook);
    } else {
      console.log('   ℹ️  No default notebook set');
    }
  } catch (error) {
    console.error('   ⚠️  Management check failed:', error);
  }

  console.log();

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Integration Test Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();

  // Check readiness
  const ready = await isNotebookLMReady();
  if (ready) {
    console.log('🎉 NotebookLM is READY for use!');
    console.log();
    console.log('Next steps:');
    console.log('  1. Integrate into agents (see python-sidecar/USAGE-EXAMPLES.md)');
    console.log('  2. Test with real queries');
    console.log('  3. Monitor performance');
  } else {
    console.log('⚠️  NotebookLM needs authentication');
    console.log();
    console.log('Complete setup:');
    console.log('  cd python-sidecar');
    console.log('  .\\auth-setup.ps1');
  }

  console.log();
}

// Run tests
main().catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
