/**
 * OpenClaw - Autonomous AI Agent
 *
 * Inspired by OpenClaw.ai - a personal AI assistant that gets work done.
 *
 * Core Capabilities:
 * - Multi-channel communication (WhatsApp, Email, SMS, Slack)
 * - Browser automation and web scraping
 * - File operations and document processing
 * - Task automation across platforms
 * - Persistent memory and context
 * - Integration with external services
 *
 * Unlike other specialized agents, OpenClaw is designed for
 * autonomous task execution - tell it what you need done, and it does it.
 */

import { executeWithTools, isClaudeAvailable, ClaudeTool, ClaudeResult } from '@/ai/claude';
import { z } from 'zod';
import { AgentMemory } from './schemas';
import { logger } from '@/lib/logger';
import { browserService } from '../services/browser-service';
import { browserToolDefs } from '../tools/browser-tools';
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

const openclawTools: ClaudeTool[] = [
    // --- Communication Tools ---
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
        name: 'send_email',
        description: 'Send an email via the configured email provider.',
        input_schema: {
            type: 'object' as const,
            properties: {
                to: { type: 'string', description: 'Recipient email address' },
                subject: { type: 'string', description: 'Email subject line' },
                body: { type: 'string', description: 'Email body (HTML supported)' },
                attachments: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional array of attachment URLs'
                }
            },
            required: ['to', 'subject', 'body']
        }
    },
    {
        name: 'send_sms',
        description: 'Send an SMS/MMS text message via BakedBot SMS. Can include images for MMS.',
        input_schema: {
            type: 'object' as const,
            properties: {
                to: { type: 'string', description: 'Phone number to send to (with or without country code)' },
                message: { type: 'string', description: 'SMS message (160 char limit recommended for SMS, longer for MMS)' },
                imageUrl: { type: 'string', description: 'Optional URL to image for MMS' }
            },
            required: ['to', 'message']
        }
    },
    {
        name: 'send_gmail',
        description: 'Send an email from user\'s connected Gmail account. Emails come from their personal Gmail address. Requires Gmail to be connected in Settings.',
        input_schema: {
            type: 'object' as const,
            properties: {
                to: { type: 'string', description: 'Recipient email address' },
                subject: { type: 'string', description: 'Email subject line' },
                body: { type: 'string', description: 'Email body (plain text)' }
            },
            required: ['to', 'subject', 'body']
        }
    },
    {
        name: 'list_gmail',
        description: 'List recent emails from user\'s Gmail inbox. Can filter by query.',
        input_schema: {
            type: 'object' as const,
            properties: {
                query: { type: 'string', description: 'Gmail search query (e.g., "from:boss is:unread", "subject:invoice")' }
            },
            required: []
        }
    },
    {
        name: 'read_gmail',
        description: 'Read the full content of a specific email by message ID.',
        input_schema: {
            type: 'object' as const,
            properties: {
                messageId: { type: 'string', description: 'Gmail message ID to read' }
            },
            required: ['messageId']
        }
    },
    // --- Browser Automation Tools ---
    {
        name: 'browse_url',
        description: 'Navigate to a URL and extract content. Use for web research, data extraction, checking websites.',
        input_schema: {
            type: 'object' as const,
            properties: {
                url: { type: 'string', description: 'URL to navigate to' },
                extractSelector: { type: 'string', description: 'CSS selector to extract specific content' },
                screenshot: { type: 'boolean', description: 'Take a screenshot of the page' },
                waitFor: { type: 'string', description: 'CSS selector to wait for before extracting' }
            },
            required: ['url']
        }
    },
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
    {
        name: 'web_search',
        description: 'Search the web for information.',
        input_schema: {
            type: 'object' as const,
            properties: {
                query: { type: 'string', description: 'Search query' },
                numResults: { type: 'number', description: 'Number of results (default 5)' }
            },
            required: ['query']
        }
    },
    // --- Task & Integration Tools ---
    {
        name: 'create_calendar_event',
        description: 'Create a calendar event in Google Calendar.',
        input_schema: {
            type: 'object' as const,
            properties: {
                title: { type: 'string', description: 'Event title' },
                startTime: { type: 'string', description: 'ISO datetime for start' },
                endTime: { type: 'string', description: 'ISO datetime for end' },
                description: { type: 'string', description: 'Event description' },
                attendees: { type: 'array', items: { type: 'string' }, description: 'Email addresses' }
            },
            required: ['title', 'startTime', 'endTime']
        }
    },
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
    {
        name: 'get_whatsapp_status',
        description: 'Check if WhatsApp is connected and ready to send messages.',
        input_schema: {
            type: 'object' as const,
            properties: {}
        }
    }
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

            case 'send_email': {
                const { sendGenericEmail } = await import('@/lib/email/dispatcher');

                const result = await sendGenericEmail({
                    to: toolInput.to as string,
                    subject: toolInput.subject as string,
                    htmlBody: toolInput.body as string,
                    textBody: (toolInput.body as string).replace(/<[^>]*>/g, ''),
                    fromName: 'OpenClaw Agent'
                });

                return JSON.stringify(result);
            }

            case 'send_sms': {
                const { blackleafService } = await import('@/lib/notifications/blackleaf-service');

                const success = await blackleafService.sendCustomMessage(
                    toolInput.to as string,
                    toolInput.message as string,
                    toolInput.imageUrl as string | undefined
                );

                if (success) {
                    return JSON.stringify({
                        success: true,
                        message: `SMS sent to ${toolInput.to}`
                    });
                } else {
                    return JSON.stringify({
                        success: false,
                        error: 'Failed to send SMS. Check BakedBot SMS configuration in Settings.'
                    });
                }
            }

            case 'send_gmail': {
                const { gmailAction } = await import('@/server/tools/gmail');

                if (!context.userId) {
                    return JSON.stringify({
                        success: false,
                        error: 'Gmail requires authenticated user. Please log in.'
                    });
                }

                const result = await gmailAction({
                    action: 'send',
                    to: toolInput.to as string,
                    subject: toolInput.subject as string,
                    body: toolInput.body as string
                });

                if (result.success) {
                    return JSON.stringify({
                        success: true,
                        message: `Email sent from your Gmail to ${toolInput.to}`,
                        messageId: result.data?.id
                    });
                } else {
                    return JSON.stringify({
                        success: false,
                        error: result.error || 'Failed to send Gmail'
                    });
                }
            }

            case 'list_gmail': {
                const { gmailAction } = await import('@/server/tools/gmail');

                if (!context.userId) {
                    return JSON.stringify({
                        success: false,
                        error: 'Gmail requires authenticated user. Please log in.'
                    });
                }

                const result = await gmailAction({
                    action: 'list',
                    query: toolInput.query as string || ''
                });

                if (result.success) {
                    return JSON.stringify({
                        success: true,
                        emails: result.data,
                        count: result.data?.length || 0
                    });
                } else {
                    return JSON.stringify({
                        success: false,
                        error: result.error || 'Failed to list emails'
                    });
                }
            }

            case 'read_gmail': {
                const { gmailAction } = await import('@/server/tools/gmail');

                if (!context.userId) {
                    return JSON.stringify({
                        success: false,
                        error: 'Gmail requires authenticated user. Please log in.'
                    });
                }

                const result = await gmailAction({
                    action: 'read',
                    messageId: toolInput.messageId as string
                });

                if (result.success) {
                    return JSON.stringify({
                        success: true,
                        email: result.data
                    });
                } else {
                    return JSON.stringify({
                        success: false,
                        error: result.error || 'Failed to read email'
                    });
                }
            }

            case 'browse_url': {
                const { isRTRVRAvailable, summarizeUrl } = await import('@/server/services/rtrvr');

                if (!isRTRVRAvailable()) {
                    // Fallback to simple fetch
                    const response = await fetch(toolInput.url as string);
                    const text = await response.text();
                    return JSON.stringify({
                        success: true,
                        url: toolInput.url,
                        content: text.slice(0, 5000) + (text.length > 5000 ? '...[truncated]' : ''),
                        method: 'fetch'
                    });
                }

                // Use RTRVR to summarize the URL
                const rtrvrResult = await summarizeUrl(toolInput.url as string);

                if (!rtrvrResult.success || !rtrvrResult.data) {
                    return JSON.stringify({
                        success: false,
                        url: toolInput.url,
                        error: rtrvrResult.error || 'Failed to fetch URL'
                    });
                }

                // Extract content from AgentResult
                const agentResult = rtrvrResult.data;
                const textOutput = agentResult.output?.find(o => o.type === 'text');

                return JSON.stringify({
                    success: true,
                    url: toolInput.url,
                    content: textOutput?.content || JSON.stringify(agentResult.result) || 'No content extracted',
                    method: 'rtrvr'
                });
            }

            case 'web_search': {
                const { searchWeb } = await import('@/server/tools/web-search');
                const results = await searchWeb(
                    toolInput.query as string,
                    (toolInput.numResults as number) || 5
                );
                return JSON.stringify(results);
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

            case 'create_calendar_event': {
                const { calendarAction } = await import('@/server/tools/calendar');

                // Calendar requires user context for OAuth tokens
                if (!context.userId) {
                    return JSON.stringify({
                        success: false,
                        error: 'Calendar requires authenticated user. Please log in.'
                    });
                }

                const result = await calendarAction({
                    action: 'create',
                    summary: toolInput.title as string,
                    startTime: toolInput.startTime as string,
                    endTime: toolInput.endTime as string,
                    description: toolInput.description as string
                });

                if (result.success) {
                    return JSON.stringify({
                        success: true,
                        message: `Created calendar event: ${toolInput.title}`,
                        eventId: result.data?.id,
                        htmlLink: result.data?.htmlLink
                    });
                } else {
                    return JSON.stringify({
                        success: false,
                        error: result.error || 'Failed to create calendar event'
                    });
                }
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

const OPENCLAW_SYSTEM_PROMPT = `You are OpenClaw, an autonomous AI agent that gets work done.

## Your Core Identity
You are a personal AI assistant inspired by OpenClaw.ai. Unlike chatbots that just talk, you EXECUTE tasks. You have real capabilities:

- **WhatsApp messaging** - Send messages to any phone number
- **SMS/MMS** - Send text messages with optional images
- **Email (System)** - Send emails via BakedBot Mail (from noreply@bakedbot.ai)
- **Gmail** - Send emails from user's personal Gmail, list and read inbox
- **Google Calendar** - Create calendar events and reminders
- **Web browsing** - Navigate websites, extract data, research topics
- **Web search** - Find current information
- **Persistent memory** - Remember user preferences and important facts
- **Task tracking** - Create and manage tasks with priorities and due dates

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

## Current Capabilities Status
- WhatsApp: Check status with get_whatsapp_status tool
- Email (System): Ready (BakedBot Mail) - sends from noreply@bakedbot.ai
- Gmail: Ready - requires user to connect Gmail in Settings > Integrations
- SMS: Ready (BakedBot SMS) - supports MMS with images
- Calendar: Ready (Google Calendar) - requires user to connect in Settings
- Tasks: Ready (Firestore) - create and track tasks
- Browser automation: Available via RTRVR
- Memory: Operational

## Email Options
- Use **send_email** for system/automated emails (from BakedBot)
- Use **send_gmail** to send from user's personal Gmail address (more personal, shows their name)

You are the agent that actually DOES things. When users say "send a message" or "check this website" or "remind me about X" - you make it happen.`;

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
            { maxIterations: 10 }
        );

        logger.info('[OpenClaw] Request completed', {
            toolExecutions: result.toolExecutions?.length || 0
        });

        return result;
    }
};

export default openclawAgent;
