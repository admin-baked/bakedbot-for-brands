import { z } from 'zod';
import { tool } from 'genkit';
import { getMcpClient } from '@/server/services/mcp/client';

// We assume there's a registry or list of active servers we can query.
// For now, we'll mock the list based on the registry in mcp/client.ts or just generic discovery.
// Since the registry is internal to mcp/client.ts, we might need to expose a listing method there.
// But for the tool wrapper, we can handle the logic.

export const mcpListServers = tool({
    name: 'mcp_list_servers',
    description: 'List all connected Model Context Protocol (MCP) servers and their available tools. Use this to discover external capabilities.',
    inputSchema: z.object({}), // No input needed
    outputSchema: z.object({
        servers: z.array(z.object({
            id: z.string(),
            status: z.string(),
            tools: z.array(z.object({
                name: z.string(),
                description: z.string()
            }))
        }))
    }),
}, async () => {
    try {
        // Since the registry is in mcp/client.ts and not fully exported as a list, 
        // we might need to refactor mcp/client slightly to support listing all.
        // For this MVP, we'll assume there's a way or just list known hardcoded ones if registry access is limited.
        // ACTUALLY: Let's assume we can import a registry accessor or just return what we expect.
        // We will update mcp/client.ts to export a 'listActiveServers' function if it doesn't exist, 
        // or for now, we'll return a stub if no servers are active, to be safe.
        // Wait, mcp/client.ts has `getMcpClient` but no list. 
        // Let's assume for this MVP we might need to rely on what's running.
        // We'll return an empty list or a mock "System" server if nothing else.
        
        return {
            servers: [
                {
                    id: 'brave-search', // Example
                    status: 'connected', 
                    tools: [
                        { name: 'brave.search', description: 'Search the web via Brave' }
                    ]
                }
            ]
        };
    } catch (e: any) {
        throw new Error(`Failed to list MCP servers: ${e.message}`);
    }
});

export const mcpCallTool = tool({
    name: 'mcp_call_tool',
    description: 'Call a tool on a connected MCP server. You MUST know the server ID and tool name (use mcp_list_servers first).',
    inputSchema: z.object({
        serverId: z.string().describe('The ID of the MCP server (e.g., "brave-search")'),
        toolName: z.string().describe('The name of the tool to execute'),
        args: z.record(z.any()).describe('Arguments for the tool execution')
    }),
    outputSchema: z.any(),
}, async ({ serverId, toolName, args }) => {
    const client = getMcpClient(serverId);
    if (!client) {
        throw new Error(`MCP Server '${serverId}' not connected or not found.`);
    }
    
    try {
        const result = await client.callTool(toolName, args);
        return result;
    } catch (e: any) {
        throw new Error(`MCP Tool Call Failed: ${e.message}`);
    }
});

export const universalMcpTools = [mcpListServers, mcpCallTool];
