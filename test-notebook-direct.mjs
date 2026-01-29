// Direct test of NotebookLM MCP service
// This bypasses the Next.js app and calls the VM directly

const SIDECAR_URL = 'http://34.121.173.152:8080';

async function testNotebookLM() {
  console.log('🧪 Testing NotebookLM MCP (Direct Connection)\n');

  try {
    // 1. Health check
    console.log('1️⃣  Health Check...');
    const healthRes = await fetch(`${SIDECAR_URL}/health`);
    const health = await healthRes.json();
    console.log('   ✅ Service Status:', health.status);
    console.log('   🔐 Authenticated:', health.notebooklm_mcp?.process_running || false);
    console.log('   📊 Session ID:', health.notebooklm_mcp?.session_id || 'null (will be created)');

    // 2. Make an MCP call
    console.log('\n2️⃣  Calling chat_with_notebook...');
    const chatRes = await fetch(`${SIDECAR_URL}/mcp/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool_name: 'chat_with_notebook',
        arguments: {
          message: 'What is this notebook about?'
        }
      })
    });

    const chatResult = await chatRes.json();

    if (chatResult.type === 'text') {
      const text = chatResult.text;

      // Check if it's an error
      if (text.includes('Error calling tool')) {
        console.log('   ❌ Error:', text);
      } else {
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(text);
          console.log('   ✅ Success!');
          console.log('   📝 Response:', parsed.response?.substring(0, 200) + '...');
        } catch {
          console.log('   ✅ Success!');
          console.log('   📝 Response:', text.substring(0, 200) + '...');
        }
      }
    } else {
      console.log('   📊 Result:', JSON.stringify(chatResult, null, 2));
    }

    // 3. Check health again
    console.log('\n3️⃣  Final Health Check...');
    const finalHealthRes = await fetch(`${SIDECAR_URL}/health`);
    const finalHealth = await finalHealthRes.json();
    console.log('   📊 Session ID:', finalHealth.notebooklm_mcp?.session_id || 'null');
    console.log('   ✅ Process Running:', finalHealth.notebooklm_mcp?.process_running || false);

    console.log('\n✅ Test Complete!');

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
  }
}

testNotebookLM();
