/**
 * OpenClaw - Autonomous Task Execution Agent
 *
 * Scoped to capabilities NOT covered by other agents:
 * - WhatsApp messaging (unique to OpenClaw)
 * - Task/reminder management (unique to OpenClaw)
 * - Persistent personal memory (unique to OpenClaw)
 * - Browser form filling (unique to OpenClaw)
 *
 * Communication tools that overlap with Craig (SMS/Email), the agent-runner
 * (Gmail/Calendar), or web search have been removed to follow the "sniper
 * agent" pattern and prevent context bloat.
 *
 * Architecture note: Other agents handle these domains:
 * - Craig: SMS campaigns (Blackleaf), Email campaigns (Mailjet)
 * - Agent Runner: Gmail, Google Calendar, Web Search
 * - Ezal: Web research and competitive intelligence
 * - RTRVR: General browser automation
 */

import { executeWithTools, isClaudeAvailable, ClaudeTool, ClaudeResult } from '@/ai/claude';
import { AgentMemory } from './schemas';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';

/**
 * OpenClaw Agent Interface
 * Different from harness AgentImplementation - this is a standalone agent
 */
interface OpenClawAgent {
    id: string;
    name: string;
    description: string;
    icon: string;
    process(input: string, context: {
        tenantId?: string;
        userId?: string;
        memory?: AgentMemory;
    }): Promise<ClaudeResult>;
}

// ============================================================================
// OPENCLAW TOOLS
// ============================================================================

// Scoped tool set: only capabilities unique to OpenClaw (not handled by other agents)
// Removed: send_email (Craig), send_sms (Craig), send_gmail (agent-runner),
//          list_gmail (agent-runner), read_gmail (agent-runner), browse_url (RTRVR/Ezal),
//          web_search (agent-runner), create_calendar_event (agent-runner)
const openclawTools: ClaudeTool[] = [
    // --- WhatsApp (Unique to OpenClaw) ---
    {
        name: 'send_whatsapp',
        description: 'Send a WhatsApp message to a phone number. Requires WhatsApp session to be connected.',
        input_schema: {
            type: 'object' as const,
            properties: {
                to: { type: 'string', description: 'Phone number with country code (e.g., 13155551234)' },
                message: { type: 'string', description: 'Message content' },
                mediaUrl: { type: 'string', description: 'Optional URL to image/document to attach' }
            },
            required: ['to', 'message']
        }
    },
    {
        name: 'get_whatsapp_status',
        description: 'Check if WhatsApp is connected and ready to send messages.',
        input_schema: {
            type: 'object' as const,
            properties: {}
        }
    },
    // --- Browser Form Filling (Unique to OpenClaw) ---
    {
        name: 'fill_form',
        description: 'Fill out a web form with provided data.',
        input_schema: {
            type: 'object' as const,
            properties: {
                url: { type: 'string', description: 'URL of the page with the form' },
                fields: {
                    type: 'object',
                    description: 'Object mapping field selectors to values'
                },
                submitSelector: { type: 'string', description: 'Selector for submit button' }
            },
            required: ['url', 'fields']
        }
    },
    // --- Task Management (Unique to OpenClaw) ---
    {
        name: 'create_task',
        description: 'Create a task/reminder for follow-up.',
        input_schema: {
            type: 'object' as const,
            properties: {
                title: { type: 'string', description: 'Task title' },
                dueDate: { type: 'string', description: 'Due date (ISO format)' },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                notes: { type: 'string', description: 'Additional notes' }
            },
            required: ['title']
        }
    },
    // --- Personal Memory (Unique to OpenClaw) ---
    {
        name: 'save_to_memory',
        description: 'Save important information to persistent memory for future reference.',
        input_schema: {
            type: 'object' as const,
            properties: {
                key: { type: 'string', description: 'Memory key/identifier' },
                value: { type: 'string', description: 'Information to remember' },
                category: { type: 'string', enum: ['preference', 'fact', 'task', 'contact', 'other'] }
            },
            required: ['key', 'value']
        }
    },
    {
        name: 'recall_memory',
        description: 'Retrieve information from persistent memory.',
        input_schema: {
            type: 'object' as const,
            properties: {
                query: { type: 'string', description: 'What to search for in memory' }
            },
            required: ['query']
        }
    },
];

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

async function executeOpenClawTool(
    toolName: string,
    toolInput: Record<string, unknown>,
    context: { tenantId?: string; userId?: string }
): Promise<string> {
    logger.info(`[OpenClaw] Executing tool: ${toolName}`, { input: toolInput });

    try {
        switch (toolName) {
            case 'send_whatsapp': {
                const { sendMessage, getSessionStatus, isOpenClawAvailable } = await import('@/server/services/openclaw');

                if (!isOpenClawAvailable()) {
                    return JSON.stringify({
                        success: false,
                        error: 'WhatsApp gateway not configured. Please set up OpenClaw in CEO Dashboard.'
                    });
                }

                const status = await getSessionStatus();
                if (!status.success || !status.data?.connected) {
                    return JSON.stringify({
                        success: false,
                        error: 'WhatsApp not connected. Please scan QR code in CEO Dashboard → WhatsApp tab.'
                    });
                }

                const result = await sendMessage({
                    to: toolInput.to as string,
                    message: toolInput.message as string,
                    mediaUrl: toolInput.mediaUrl as string | undefined
                });

                return JSON.stringify(result);
            }

            case 'get_whatsapp_status': {
                const { getSessionStatus, isOpenClawAvailable } = await import('@/server/services/openclaw');

                if (!isOpenClawAvailable()) {
                    return JSON.stringify({ available: false, connected: false, error: 'Not configured' });
                }

                const result = await getSessionStatus();
                return JSON.stringify({
                    available: true,
                    connected: result.data?.connected || false,
                    phoneNumber: result.data?.phoneNumber || null
                });
            }

            case 'save_to_memory': {
                const db = getAdminFirestore();
                const memoryRef = db.collection('openclaw_memory').doc();

                await memoryRef.set({
                    key: toolInput.key,
                    value: toolInput.value,
                    category: toolInput.category || 'other',
                    tenantId: context.tenantId,
                    userId: context.userId,
                    createdAt: new Date().toISOString()
                });

                return JSON.stringify({
                    success: true,
                    message: `Saved "${toolInput.key}" to memory`
                });
            }

            case 'recall_memory': {
                const db = getAdminFirestore();
                const query = toolInput.query as string;

                // Simple keyword search in memory
                const snapshot = await db.collection('openclaw_memory')
                    .where('tenantId', '==', context.tenantId)
                    .orderBy('createdAt', 'desc')
                    .limit(20)
                    .get();

                const memories = snapshot.docs
                    .map(doc => doc.data())
                    .filter(m =>
                        m.key?.toLowerCase().includes(query.toLowerCase()) ||
                        m.value?.toLowerCase().includes(query.toLowerCase())
                    );

                return JSON.stringify({
                    success: true,
                    memories: memories.slice(0, 5),
                    count: memories.length
                });
            }

            case 'create_task': {
                const db = getAdminFirestore();
                const taskRef = db.collection('openclaw_tasks').doc();

                const task = {
                    id: taskRef.id,
                    title: toolInput.title as string,
                    dueDate: toolInput.dueDate || null,
                    priority: toolInput.priority || 'medium',
                    notes: toolInput.notes || '',
                    status: 'pending',
                    tenantId: context.tenantId,
                    userId: context.userId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await taskRef.set(task);

                return JSON.stringify({
                    success: true,
                    message: `Created task: ${toolInput.title}`,
                    taskId: taskRef.id,
                    dueDate: task.dueDate
                });
            }

            case 'fill_form':
                return JSON.stringify({
                    success: false,
                    error: 'Form filling requires RTRVR browser automation. Please configure RTRVR.'
                });

            default:
                return JSON.stringify({ error: `Unknown tool: ${toolName}` });
        }
    } catch (error) {
        logger.error(`[OpenClaw] Tool execution failed: ${toolName}`, { error });
        return JSON.stringify({
            error: error instanceof Error ? error.message : 'Tool execution failed'
        });
    }
}

// ============================================================================
// OPENCLAW SYSTEM PROMPT
// ============================================================================

const OPENCLAW_SYSTEM_PROMPT = `You are OpenClaw, an autonomous task execution agent.

## Your Scope
You handle tasks that other BakedBot agents don't cover:
- **WhatsApp messaging** - Send messages to any phone number
- **Task & reminder management** - Create and track tasks with priorities
- **Personal memory** - Remember user preferences and important facts
- **Form filling** - Automate web form submissions

## Your Personality
- Proactive and action-oriented
- Concise but helpful
- You confirm what you're about to do, then DO IT
- You report back with results, not just promises

## How to Operate
1. **Understand the request** - What does the user actually want accomplished?
2. **Plan your approach** - What tools do you need?
3. **Execute** - Use your tools to complete the task
4. **Report results** - Tell the user what you did and the outcome

## Important Guidelines
- Always verify WhatsApp status before attempting to send messages
- For sensitive operations, confirm with the user first
- Save important user preferences to memory for future reference
- If something fails, explain why and suggest alternatives
- For email/SMS campaigns, suggest routing to Craig
- For web research, suggest routing to Ezal
- For Gmail/Calendar, these are handled by the main chat interface

You are the agent that actually DOES things. When users say "send a WhatsApp" or "remind me about X" - you make it happen.`;

// ============================================================================
// AGENT IMPLEMENTATION
// ============================================================================

export const openclawAgent: OpenClawAgent = {
    id: 'openclaw',
    name: 'OpenClaw',
    description: 'Autonomous AI agent that gets work done. Multi-channel communication, browser automation, task execution.',
    icon: '🦞',

    async process(input: string, context: {
        tenantId?: string;
        userId?: string;
        memory?: AgentMemory;
    }): Promise<ClaudeResult> {
        logger.info('[OpenClaw] Processing request', {
            inputLength: input.length,
            tenantId: context.tenantId
        });

        if (!isClaudeAvailable()) {
            return {
                content: "I'm OpenClaw, your autonomous AI agent. However, my AI backend (Claude) is not configured. Please set up the CLAUDE_API_KEY.",
                toolExecutions: [],
                model: 'unavailable',
                inputTokens: 0,
                outputTokens: 0
            };
        }

        // Build context-aware prompt
        const contextInfo = context.tenantId
            ? `\n\nCurrent context: Tenant ${context.tenantId}, User ${context.userId || 'unknown'}`
            : '';

        const fullPrompt = `${OPENCLAW_SYSTEM_PROMPT}${contextInfo}\n\nUser request: ${input}`;

        const result = await executeWithTools(
            fullPrompt,
            openclawTools,
            async (toolName: string, toolInput: Record<string, unknown>) => {
                return executeOpenClawTool(toolName, toolInput, context);
            },
            { maxIterations: 5, orgId: context.tenantId ?? undefined }
        );

        logger.info('[OpenClaw] Request completed', {
            toolExecutions: result.toolExecutions?.length || 0
        });

        return result;
    }
};

export default openclawAgent;
