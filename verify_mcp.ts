
import { registerMcpServer, getMcpClient } from '@/server/services/mcp/client';

async function verifyMcp() {
    console.log('--- Verifying MCP Bridge ---');
    
    // 1. Simulate Registering a Server
    // We'll use a simple Python script that acts as an MCP server (stdin/stdout)
    // This script mirrors the JSON-RPC messages.
    console.log('Step 1: Registering "test-mcp" server...');
    registerMcpServer({
        id: 'test-mcp',
        command: 'python',
        args: ['python/mcp_echo.py']
    });

    const client = getMcpClient('test-mcp');
    if (!client) {
        console.error('FAIL: Client not registered.');
        return;
    }

    // 2. Connect
    console.log('Step 2: Connecting...');
    await client.connect();

    // 3. List Tools
    console.log('Step 3: Listing Tools...');
    // We expect the mcp_echo.py to respond to 'tools/list'
    try {
        const tools = await client.listTools();
        console.log('Tools:', tools);
        
        if (tools.some(t => t.name === 'echo')) {
            console.log('PASS: Tool list received.');
        } else {
            console.error('FAIL: Echo tool not found.');
        }

        // 4. Call Tool
        console.log('Step 4: Calling Tool "echo"...');
        const result = await client.callTool('echo', { message: 'Hello MCP' });
        console.log('Result:', result);

        if (result === 'Echo: Hello MCP') {
            console.log('PASS: Tool execution successful.');
        } else {
            console.error('FAIL: Unexpected result.');
        }

    } catch (e) {
        console.error('Exception during MCP test:', e);
    } finally {
        await client.disconnect();
    }
}

verifyMcp().catch(console.error);
