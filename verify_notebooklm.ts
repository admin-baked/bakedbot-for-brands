
import { getMcpClient } from '@/server/services/mcp/client';

async function verifyNotebookLM() {
    console.log('--- Verifying NotebookLLM MCP Bridge ---');

    // 1. Get the auto-registered client
    const client = getMcpClient('notebooklm');

    if (!client) {
        console.error('FAIL: Client not registered. Check src/server/services/mcp/client.ts');
        return;
    }

    console.log('PASS: Client registered found.');

    // 2. Connect
    console.log('Step 2: Connecting to NotebookLLM MCP server...');
    try {
        await client.connect();
        console.log('PASS: Connected.');
    } catch (e: any) {
        console.error('FAIL: Connection failed.', e.message);
        console.log('\nTroubleshooting Tips:');
        console.log('1. Is "notebooklm-mcp" installed? Run: pip install -r python/requirements.txt');
        console.log('2. Is python in your PATH?');
        return;
    }

    // 3. List Tools
    console.log('Step 3: Listing Tools...');
    try {
        const tools = await client.listTools();
        console.log('Found Tools:', tools.map(t => t.name));

        if (tools.length > 0) {
            console.log('PASS: Tools listed successfully.');
        } else {
            console.warn('WARN: No tools found. This might be unexpected depending on the server.');
        }

    } catch (e: any) {
        console.error('FAIL: Listing tools failed.', e);
    } finally {
        await client.disconnect();
    }
}

verifyNotebookLM().catch(console.error);
