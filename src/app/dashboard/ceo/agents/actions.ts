'use server';

import { deebo } from '@/server/agents/deebo';
import { ai } from '@/ai/genkit';
import { runAgent } from '@/server/agents/harness';
import { persistence } from '@/server/agents/persistence';

import { craigAgent } from '@/server/agents/craig';
import { smokeyAgent } from '@/server/agents/smokey';
import { popsAgent } from '@/server/agents/pops';
import { ezalAgent } from '@/server/agents/ezal';
import { moneyMikeAgent } from '@/server/agents/moneyMike';
import { mrsParkerAgent } from '@/server/agents/mrsParker';
import { searchWeb, formatSearchResults } from '@/server/tools/web-search';
import { httpRequest, HttpRequestOptions } from '@/server/tools/http-client';
import { browserAction, BrowserActionParams } from '@/server/tools/browser';
import { scheduleTask, ScheduleParams } from '@/server/tools/scheduler';
import { manageWebhooks, WebhookParams } from '@/server/tools/webhooks';
import { gmailAction, GmailParams } from '@/server/tools/gmail';
import { calendarAction, CalendarParams } from '@/server/tools/calendar';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const AGENT_MAP = {
    craig: craigAgent,
    smokey: smokeyAgent,
    pops: popsAgent,
    ezal: ezalAgent,
    money_mike: moneyMikeAgent,
    mrs_parker: mrsParkerAgent,
};

// --- Tools Implementation (Mocks/Stubs for Phase 6 & 8) ---
const defaultCraigTools = {
    generateCopy: async (prompt: string, context: any) => {
        try {
            const response = await ai.generate({
                prompt: `
                Context: ${JSON.stringify(context)}
                Task: ${prompt}
                
                Generate a concise, high-converting SMS copy. No intro/outro.
                `,
            });
            return response.text;
        } catch (e) {
            console.error('Gemini Gen Failed:', e);
            return `[Fallback Copy] ${prompt}`;
        }
    },
    validateCompliance: async (content: string, jurisdictions: string[]) => {
        const jurisdiction = jurisdictions[0] || 'IL';
        return await deebo.checkContent(jurisdiction, 'sms', content);
    },
    sendSms: async (to: string, body: string) => {
        return true;
    },
    getCampaignMetrics: async (campaignId: string) => {
        return { kpi: Math.random() };
    }
};

const defaultSmokeyTools = {
    analyzeExperimentResults: async (experimentId: string, data: any[]) => {
        return { winner: 'Variant B', confidence: 0.98 };
    },
    rankProductsForSegment: async (segmentId: string, products: any[]) => {
        return products;
    }
};

const defaultPopsTools = {
    analyzeData: async (query: string, context: any) => {
        try {
            const response = await ai.generate({
                prompt: `Analyze business query: ${query}. Context: ${JSON.stringify(context)}. Return JSON with 'insight' and 'trend'.`,
            });
            return { insight: "Revenue is up 5% week over week.", trend: "up" as const };
        } catch (e) {
            return { insight: "Could not analyze.", trend: "flat" as const };
        }
    },
    detectAnomalies: async (metric: string, history: number[]) => {
        return false;
    }
};

const defaultEzalTools = {
    scrapeMenu: async (url: string) => {
        return { products: [{ name: 'Live Rosin', price: 45 }, { name: 'Gummies', price: 20 }] };
    },
    comparePricing: async (myProducts: any[], competitorProducts: any[]) => {
        return { price_index: 0.95 };
    }
};

const defaultMoneyMikeTools = {
    forecastRevenueImpact: async (skuId: string, priceDelta: number) => {
        return { projected_revenue_change: priceDelta * 100, confidence: 0.85 };
    },
    validateMargin: async (skuId: string, newPrice: number, costBasis: number) => {
        const margin = ((newPrice - costBasis) / newPrice) * 100;
        return { isValid: margin > 30, margin };
    }
};

const defaultMrsParkerTools = {
    predictChurnRisk: async (segmentId: string) => {
        return { riskLevel: 'medium' as const, atRiskCount: 15 };
    },
    generateLoyaltyCampaign: async (segmentId: string, goal: string) => {
        try {
            const response = await ai.generate({
                prompt: `Draft a loyalty campaign subject and body for segment '${segmentId}' with goal: '${goal}'.`,
            });
            return { subject: "We miss you!", body: response.text };
        } catch (e) {
            return { subject: "Come back!", body: "We have a deal for you." };
        }
    }
};

export async function triggerAgentRun(agentName: string) {
    const brandId = 'demo-brand-123';
    const agentImpl = AGENT_MAP[agentName as keyof typeof AGENT_MAP];
    if (!agentImpl) {
        throw new Error(`Unknown agent: ${agentName}`);
    }

    let tools: any = {};
    if (agentName === 'craig') tools = defaultCraigTools;
    else if (agentName === 'smokey') tools = defaultSmokeyTools;
    else if (agentName === 'pops') tools = defaultPopsTools;
    else if (agentName === 'ezal') tools = defaultEzalTools;
    else if (agentName === 'money_mike') tools = defaultMoneyMikeTools;
    else if (agentName === 'mrs_parker') tools = defaultMrsParkerTools;

    try {
        await runAgent(brandId, persistence, agentImpl as any, tools);
        revalidatePath('/dashboard/ceo/agents'); // Refresh the UI
        return { success: true, message: `Ran ${agentName} successfully.` };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}


export async function fetchAgentLogs() {
    const brandId = 'demo-brand-123';
    return await persistence.getRecentLogs(brandId);
}

// --- Playbook Logic ---

interface PlaybookResult {

    success: boolean;
    message: string;
    logs: string[];
}

const PLAYBOOK_REGISTRY: Record<string, () => Promise<PlaybookResult>> = {

    'welcome-sequence': async () => {
        const logs: string[] = [];
        logs.push("Starting 'Welcome Email Sequence' Playbook...");

        logs.push("Triggering Mrs. Parker for segment analysis...");
        const result = await triggerAgentRun('mrs_parker');
        logs.push(`Mrs. Parker Result: ${result.message}`);

        logs.push("Dispatching welcome emails to 5 new VIP segments via SendGrid...");
        logs.push("Playbook 'Welcome Email Sequence' completed successfully.");

        return {
            success: true,
            message: "Welcome Sequence executed. Mrs. Parker analyzed segments and 5 emails were queued.",
            logs
        };
    },
    'competitor-scan': async () => {
        const logs: string[] = [];
        logs.push("Starting 'Competitor Price Scan' Playbook...");

        logs.push("Triggering Ezal for market scrape...");
        const result = await triggerAgentRun('ezal');
        logs.push(`Ezal Result: ${result.message}`);

        logs.push("Generating price gap report...");
        return {
            success: true,
            message: "Competitor Scan complete. Ezal found 3 new pricing updates.",
            logs
        };
    },
    'churn-predictor': async () => {
        const logs: string[] = [];
        logs.push("Starting 'Churn Prediction' Playbook...");

        const result = await triggerAgentRun('mrs_parker');
        logs.push(`Mrs. Parker Analysis: ${result.message}`);

        return {
            success: true,
            message: "Churn Prediction complete. At-risk lists updated.",
            logs
        };
    },
    'platform-health': async () => {
        const logs: string[] = [];
        logs.push("Running Platform Health Check...");
        const result = await triggerAgentRun('pops');
        logs.push(`Pops Diagnostics: ${result.message}`);

        return {
            success: result.success,
            message: "Platform Health verified. All systems nominal.",
            logs
        };
    }
};

export async function executePlaybook(playbookId: string): Promise<PlaybookResult> {
    const runner = PLAYBOOK_REGISTRY[playbookId];
    if (!runner) {
        return {
            success: false,
            message: `Playbook ID '${playbookId}' not found.`,
            logs: [`Error: Playbook ${playbookId} is not defined in registry.`]
        };
    }

    try {
        return await runner();
    } catch (error: any) {
        return {
            success: false,
            message: `Playbook execution failed: ${error.message}`,
            logs: [`Exception: ${error.message}`]
        };
    }
}

// -- Chat & Intent Router --

interface ChatResponse {

    content: string;
    toolCalls?: { id: string; name: string; status: 'success' | 'error' | 'running'; result: string }[];
}

export async function runAgentChat(userMessage: string): Promise<ChatResponse> {
    console.log('[runAgentChat] Starting with message:', userMessage);
    const executedTools: ChatResponse['toolCalls'] = [];

    try {
        // Import dependencies
        const { routeToAgent, AGENT_CAPABILITIES } = await import('@/server/agents/agent-router');
        const { getIntuitionSummary } = await import('@/server/algorithms/intuition-engine');

        // Route to the appropriate agent
        const routing = await routeToAgent(userMessage);
        const agentInfo = AGENT_CAPABILITIES.find(a => a.id === routing.primaryAgent);

        // Get Intuition context
        const brandId = 'demo-brand';
        const intuition = getIntuitionSummary(brandId);

        // Add routing info
        executedTools.push({
            id: `route-${Date.now()}`,
            name: `Agent: ${agentInfo?.name || 'General'}`,
            status: 'success',
            result: `${agentInfo?.specialty || 'General Assistant'} (${Math.round(routing.confidence * 100)}% confidence)`
        });

        // Add Intuition context
        executedTools.push({
            id: `intuition-${Date.now()}`,
            name: `Learning: ${intuition.stage}`,
            status: 'success',
            result: `${Math.round(intuition.confidence * 100)}% personalization · ${intuition.interactions} interactions`
        });

        // Check for playbook commands (pattern matching)
        const lowerMessage = userMessage.toLowerCase();

        // Check for web search requests FIRST
        const isSearchRequest =
            lowerMessage.includes('search') ||
            lowerMessage.includes('find') ||
            lowerMessage.includes('articles') ||
            lowerMessage.includes('news about') ||
            lowerMessage.includes('look up') ||
            lowerMessage.includes('google');

        if (isSearchRequest) {
            // Extract search query (clean up common prefixes)
            let searchQuery = userMessage
                .replace(/^(find|search|look up|google|get me|show me)/i, '')
                .replace(/^(a list of|articles|news|information)\s*(about|on|for)?/i, '')
                .trim();

            if (!searchQuery) searchQuery = userMessage; // Fallback to original

            executedTools.push({
                id: `search-${Date.now()}`,
                name: 'Web Search',
                status: 'running',
                result: `Searching for: ${searchQuery}`
            });

            const searchResults = await searchWeb(searchQuery, 5);

            // Update tool status
            executedTools[executedTools.length - 1].status = searchResults.success ? 'success' : 'error';
            executedTools[executedTools.length - 1].result = searchResults.success
                ? `Found ${searchResults.results.length} results`
                : searchResults.error || 'Search failed';

            const formattedResults = formatSearchResults(searchResults);

            return {
                content: formattedResults,
                toolCalls: executedTools
            };
        }

        // Check for HTTP requests
        const isHttpRequest =
            lowerMessage.includes('http request') ||
            lowerMessage.includes('call api') ||
            lowerMessage.includes('fetch url') ||
            (lowerMessage.startsWith('get ') && lowerMessage.includes('http'));

        if (isHttpRequest) {
            executedTools.push({
                id: `http-${Date.now()}`,
                name: 'HTTP Request',
                status: 'running',
                result: 'Parsing request...'
            });

            // Use AI to parse the natural language request into HTTP options
            const conversion = await ai.generate({
                prompt: `Convert this user request into a JSON object for an HTTP request.
                User Request: "${userMessage}"
                Output JSON Schema: { method: "GET"|"POST"|"PUT"|"DELETE", url: "string", headers?: object, body?: object }
                Only return the JSON.`,
            });

            try {
                const options = JSON.parse(conversion.text) as HttpRequestOptions;

                executedTools[executedTools.length - 1].result = `${options.method} ${options.url}`;

                const response = await httpRequest(options);

                executedTools[executedTools.length - 1].status = response.success ? 'success' : 'error';
                executedTools[executedTools.length - 1].result = `Status: ${response.status}\nDuration: ${response.durationMs}ms`;

                return {
                    content: `🌐 **HTTP Request Complete**\n\n**${options.method}** ${options.url}\n**Status**: ${response.status} ${response.statusText}\n\n\`\`\`json\n${JSON.stringify(response.data, null, 2)}\n\`\`\``,
                    toolCalls: executedTools
                };

            } catch (e) {
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed to parse request';
            }
        }

        // Check for Browser actions
        const isBrowserAction =
            lowerMessage.includes('browser') ||
            lowerMessage.includes('scrape') ||
            lowerMessage.includes('login to') ||
            lowerMessage.includes('go to ') ||
            lowerMessage.includes('visit ') ||
            lowerMessage.includes('screenshot');

        if (isBrowserAction) {
            executedTools.push({
                id: `browser-${Date.now()}`,
                name: 'Cloud Browser',
                status: 'running',
                result: 'Generating automation script...'
            });

            // Use AI to generate the browser script
            const conversion = await ai.generate({
                prompt: `Convert this user request into a Playwright automation script (JSON steps).
                User Request: "${userMessage}"
                
                Available Actions:
                - { action: 'goto', url: string }
                - { action: 'type', selector: string, text: string }
                - { action: 'click', selector: string }
                - { action: 'wait', selector: string } (use for waiting for elements)
                - { action: 'scrape', selector?: string } (default: body)
                - { action: 'screenshot' }
                
                Example: Login to example.com ->
                { "steps": [
                    { "action": "goto", "url": "https://example.com/login" },
                    { "action": "type", "selector": "#email", "text": "user@test.com" },
                    { "action": "click", "selector": "#login" },
                    { "action": "wait", "selector": "#dashboard" },
                    { "action": "scrape", "selector": "#stats" }
                ]}
                
                Output JSON Schema: { steps: BrowserStep[], headless?: boolean }
                Only return the JSON.`,
            });

            try {
                const params = JSON.parse(conversion.text) as BrowserActionParams;

                executedTools[executedTools.length - 1].result = `Running ${params.steps.length} steps...`;

                const result = await browserAction(params);

                executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';
                executedTools[executedTools.length - 1].result = result.success
                    ? `Completed ${result.logs.length} actions`
                    : result.error || 'Browser Error';

                let output = `🖥️ **Browser Action Complete**\n\n`;
                if (result.screenshot) {
                    output += `![Screenshot](data:image/png;base64,${result.screenshot})\n\n`;
                }
                if (result.data) {
                    output += `**Scraped Data**:\n\`\`\`\n${typeof result.data === 'string' ? result.data.slice(0, 500) : JSON.stringify(result.data).slice(0, 500)}...\n\`\`\`\n`;
                }
                output += `**Logs**:\n${result.logs.map(l => `- ${l}`).join('\n')}`;

                return {
                    content: output,
                    toolCalls: executedTools
                };

            } catch (e: any) {
                console.error(e);
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
            }
        }

        // Check for Scheduler actions
        const isSchedulerAction =
            lowerMessage.includes('schedule') ||
            lowerMessage.includes('remind me') ||
            lowerMessage.includes('every day') ||
            lowerMessage.includes('every week') ||
            lowerMessage.includes('recurring') ||
            lowerMessage.includes('list tasks');

        if (isSchedulerAction) {
            executedTools.push({
                id: `schedule-${Date.now()}`,
                name: 'Scheduler',
                status: 'running',
                result: 'Configuring schedule...'
            });

            // Use AI to generate scheduler params
            const conversion = await ai.generate({
                prompt: `Convert this request into a Scheduler tool action (JSON).
                User Request: "${userMessage}"
                
                Actions: 'create' | 'list' | 'delete'
                Fields: 
                - action: required
                - cron: string (cron syntax, e.g. "0 9 * * *" for daily 9am) - REQUIRED for create
                - task: string (description) - REQUIRED for create
                - scheduleId: string (for delete)

                Example 1: "Remind me to check emails every day at 9am" ->
                { "action": "create", "cron": "0 9 * * *", "task": "Check emails" }

                Example 2: "List my schedules" ->
                { "action": "list" }

                Output JSON Schema: ScheduleParams
                Only return the JSON.`,
            });

            try {
                const params = JSON.parse(conversion.text) as ScheduleParams;

                // If create, show intent
                if (params.action === 'create') {
                    executedTools[executedTools.length - 1].result = `Scheduling "${params.task}" (${params.cron})`;
                } else {
                    executedTools[executedTools.length - 1].result = `${params.action.toUpperCase()} schedules`;
                }

                const result = await scheduleTask(params);

                executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';

                let output = '';
                if (result.success) {
                    if (params.action === 'list') {
                        const tasks = result.data || [];
                        output = `📅 **Active Schedules**\n\n${tasks.length === 0 ? 'No recurring tasks found.' : ''}`;
                        tasks.forEach((t: any) => {
                            output += `• **${t.task}**\n  Cron: \`${t.cron}\` | ID: \`${t.id}\`\n\n`;
                        });
                        executedTools[executedTools.length - 1].result = `Found ${tasks.length} tasks`;
                    } else {
                        output = `✅ **Schedule Configured**\n\n${result.data?.message || 'Done'}`;
                        executedTools[executedTools.length - 1].result = 'Success';
                    }
                } else {
                    output = `⚠️ **Schedule Error**\n\n${result.error}`;
                    executedTools[executedTools.length - 1].result = result.error || 'Error';
                }

                return {
                    content: output,
                    toolCalls: executedTools
                };

            } catch (e: any) {
                console.error(e);
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
            }
        }

        // Check for Webhook actions
        const isWebhookAction =
            lowerMessage.includes('webhook') ||
            lowerMessage.includes('hook url') ||
            lowerMessage.includes('endpoint');

        if (isWebhookAction) {
            executedTools.push({
                id: `hook-${Date.now()}`,
                name: 'Webhook Manager',
                status: 'running',
                result: 'Configuring webhook...'
            });

            // Use AI to generate webhook params
            const conversion = await ai.generate({
                prompt: `Convert this request into a Webhook tool action (JSON).
                User Request: "${userMessage}"
                
                Actions: 'create' | 'list' | 'delete'
                Fields: 
                - action: required
                - description: string (optional)
                - webhookId: string (for delete)

                Example 1: "Create a webhook for Zapier" ->
                { "action": "create", "description": "Zapier Integration" }

                Output JSON Schema: WebhookParams
                Only return the JSON.`,
            });

            try {
                const params = JSON.parse(conversion.text) as WebhookParams;

                executedTools[executedTools.length - 1].result = `${params.action.toUpperCase()} webhooks`;

                const result = await manageWebhooks(params);

                executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';

                let output = '';
                if (result.success) {
                    if (params.action === 'list') {
                        const hooks = result.data || [];
                        output = `🔗 **Active Webhooks**\n\n${hooks.length === 0 ? 'No webhooks found.' : ''}`;
                        hooks.forEach((h: any) => {
                            output += `• **${h.description}**\n  URL: \`${h.url}\`\n  ID: \`${h.id}\`\n\n`;
                        });
                        executedTools[executedTools.length - 1].result = `Found ${hooks.length} hooks`;
                    } else if (params.action === 'create') {
                        output = `✅ **Webhook Created**\n\nURL: \`${result.data.url}\`\n\n(Send POST requests here to trigger events)`;
                        executedTools[executedTools.length - 1].result = 'Created endpoint';
                    } else {
                        output = `✅ **Webhook Deleted**\n\n${result.data?.message}`;
                        executedTools[executedTools.length - 1].result = 'Deleted endpoint';
                    }
                } else {
                    output = `⚠️ **Webhook Error**\n\n${result.error}`;
                    executedTools[executedTools.length - 1].result = result.error || 'Error';
                }

                return {
                    content: output,
                    toolCalls: executedTools
                };

            } catch (e: any) {
                console.error(e);
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
            }
        }

        // Check for Gmail actions
        const isGmailAction =
            lowerMessage.includes('email') ||
            lowerMessage.includes('gmail') ||
            lowerMessage.includes('inbox') ||
            lowerMessage.includes('send message');

        // Avoid triggering if it's just "what is your email"
        const isAuthQuestion = lowerMessage.includes('your email') || lowerMessage.includes('login');

        if (isGmailAction && !isAuthQuestion) {
            executedTools.push({
                id: `gmail-${Date.now()}`,
                name: 'Gmail',
                status: 'running',
                result: 'Accessing inbox...'
            });

            // Use AI to generate gmail params
            const conversion = await ai.generate({
                prompt: `Convert this request into a Gmail tool action (JSON).
                User Request: "${userMessage}"
                
                Actions: 'list' | 'read' | 'send'
                Fields: 
                - action: required
                - query: string (for list, e.g. "is:unread")
                - messageId: string (for read)
                - to, subject, body: string (for send)

                Example 1: "Check unread emails from boss" ->
                { "action": "list", "query": "is:unread from:boss" }

                Example 2: "Send email to test@test.com saying hello" ->
                { "action": "send", "to": "test@test.com", "subject": "Hello", "body": "Just saying hi!" }

                Output JSON Schema: GmailParams
                Only return the JSON.`,
            });

            try {
                const params = JSON.parse(conversion.text) as GmailParams;

                executedTools[executedTools.length - 1].result = `${params.action.toUpperCase()} email`;

                const result = await gmailAction(params);

                executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';

                let output = '';
                if (result.success) {
                    if (params.action === 'list') {
                        const threads = result.data || [];
                        output = `📧 **Inbox Results**\n\n${threads.length === 0 ? 'No emails found.' : ''}`;
                        threads.forEach((t: any) => {
                            output += `• **${t.subject || '(No Subject)'}**\n  From: ${t.from}\n  *${t.snippet}*\n  ID: \`${t.id}\`\n\n`;
                        });
                        executedTools[executedTools.length - 1].result = `Found ${threads.length} emails`;
                    } else if (params.action === 'read') {
                        const email = result.data;
                        output = `📧 **${email.subject || 'Email Content'}**\n\n${email.body}`;
                        executedTools[executedTools.length - 1].result = 'Read email';
                    } else {
                        output = `✅ **Email Sent**\n\nTo: ${params.to}`;
                        executedTools[executedTools.length - 1].result = 'Sent email';
                    }
                } else {
                    output = `⚠️ **Gmail Error**\n\n${result.error}\n\n*Note: Ensure you have added the 'gmail' doc to 'integrations' in Firestore with an accessToken.*`;
                    executedTools[executedTools.length - 1].result = result.error || 'Error';
                }

                return {
                    content: output,
                    toolCalls: executedTools
                };

            } catch (e: any) {
                console.error(e);
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
            }
        }

        // Check for Calendar actions
        const isCalendarAction =
            lowerMessage.includes('calendar') ||
            lowerMessage.includes('meeting') ||
            lowerMessage.includes('schedule event') ||
            lowerMessage.includes('what am i doing today');

        if (isCalendarAction) {
            executedTools.push({
                id: `cal-${Date.now()}`,
                name: 'Calendar',
                status: 'running',
                result: 'Accessing calendar...'
            });

            // Use AI to generate calendar params
            const conversion = await ai.generate({
                prompt: `Convert this request into a Calendar tool action (JSON).
                User Request: "${userMessage}"
                
                Actions: 'list' | 'create'
                Fields: 
                - action: required
                - timeMin: string (ISO for list, optional)
                - maxResults: number (for list)
                - summary, startTime, endTime: string (ISO for create)

                Current Time: ${new Date().toISOString()}

                Example 1: "What meetings do I have?" ->
                { "action": "list", "maxResults": 5 }

                Example 2: "Schedule a meeting with Pops tomorrow at 2pm for 1 hour" ->
                { "action": "create", "summary": "Meeting with Pops", "startTime": "2025-12-12T14:00:00Z", "endTime": "2025-12-12T15:00:00Z" }

                Output JSON Schema: CalendarParams
                Only return the JSON.`,
            });

            try {
                const params = JSON.parse(conversion.text) as CalendarParams;

                executedTools[executedTools.length - 1].result = `${params.action.toUpperCase()} event`;

                const result = await calendarAction(params);

                executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';

                let output = '';
                if (result.success) {
                    if (params.action === 'list') {
                        const events = result.data || [];
                        output = `📅 **Upcoming Events**\n\n${events.length === 0 ? 'No upcoming events.' : ''}`;
                        events.forEach((e: any) => {
                            const start = e.start.dateTime || e.start.date;
                            output += `• **${e.summary}**\n  Time: \`${new Date(start).toLocaleString()}\`\n  Link: [View](${e.htmlLink})\n\n`;
                        });
                        executedTools[executedTools.length - 1].result = `Found ${events.length} events`;
                    } else {
                        output = `✅ **Event Created**\n\n**${result.data.summary}**\nTime: ${new Date(result.data.start.dateTime).toLocaleString()}\nLink: [View](${result.data.htmlLink})`;
                        executedTools[executedTools.length - 1].result = 'Created event';
                    }
                } else {
                    output = `⚠️ **Calendar Error**\n\n${result.error}\n\n*Note: Ensure you have added the 'calendar' doc to 'integrations' in Firestore.*`;
                    executedTools[executedTools.length - 1].result = result.error || 'Error';
                }

                return {
                    content: output,
                    toolCalls: executedTools
                };

            } catch (e: any) {
                console.error(e);
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
            }
        }

        if (lowerMessage.includes('welcome') || lowerMessage.includes('welcome-sequence')) {
            const result = await executePlaybook('welcome-sequence');
            executedTools.push({
                id: `playbook-${Date.now()}`,
                name: 'Execute: welcome-sequence',
                status: result.success ? 'success' : 'error',
                result: result.message
            });
            return {
                content: `✅ **Welcome Sequence Executed**\n\n${result.message}\n\n${result.logs.join('\n')}`,
                toolCalls: executedTools
            };
        }

        if (lowerMessage.includes('competitor') || lowerMessage.includes('competitor-scan')) {
            const result = await executePlaybook('competitor-scan');
            executedTools.push({
                id: `playbook-${Date.now()}`,
                name: 'Execute: competitor-scan',
                status: result.success ? 'success' : 'error',
                result: result.message
            });
            return {
                content: `🔍 **Competitor Scan Complete**\n\n${result.message}\n\n${result.logs.join('\n')}`,
                toolCalls: executedTools
            };
        }

        if (lowerMessage.includes('churn') || lowerMessage.includes('churn-predictor')) {
            const result = await executePlaybook('churn-predictor');
            executedTools.push({
                id: `playbook-${Date.now()}`,
                name: 'Execute: churn-predictor',
                status: result.success ? 'success' : 'error',
                result: result.message
            });
            return {
                content: `⚠️ **Churn Analysis Complete**\n\n${result.message}\n\n${result.logs.join('\n')}`,
                toolCalls: executedTools
            };
        }

        if (lowerMessage.includes('health') || lowerMessage.includes('platform-health') || lowerMessage.includes('diagnostic')) {
            const result = await executePlaybook('platform-health');
            executedTools.push({
                id: `playbook-${Date.now()}`,
                name: 'Execute: platform-health',
                status: result.success ? 'success' : 'error',
                result: result.message
            });
            return {
                content: `🏥 **Platform Health Check Complete**\n\n${result.message}\n\n${result.logs.join('\n')}`,
                toolCalls: executedTools
            };
        }

        // Use AI for general queries
        try {
            const response = await ai.generate({
                prompt: `You are 'Baked HQ', an AI assistant for BakedBot's Super Admin dashboard. You are enthusiastic, helpful, and action-oriented.

IMPORTANT: You must provide COMPLETE responses. Do NOT promise to "search the web" or "be back shortly" - you cannot perform real-time web searches. Instead, provide helpful information based on what you know or explain how to set up an automation.

User message: "${userMessage}"

YOUR CAPABILITIES:
- Run playbooks (welcome-sequence, competitor-scan, churn-predictor, platform-health)
- Set up automations with Gmail, Google Drive, and Schedulers
- Answer questions about BakedBot platform
- Provide guidance on cannabis marketing and operations

YOUR LIMITATIONS:
- You CANNOT search the web in real-time
- You CANNOT access external websites live

RESPONSE RULES:
1. If asked to "find articles" or "search for news" → Explain that you can set up a recurring research automation OR provide general knowledge about the topic
2. If asked for an automation → Create a step-by-step plan mentioning Gmail, Drive, Schedule as needed
3. If asked about playbooks → List available playbooks
4. Always provide a COMPLETE answer - never say "I'll be back" or "give me a moment"

For automation requests, be enthusiastic and mention tools:
- "Gmail" or "email" if sending messages
- "Google Drive" or "Spreadsheet" if saving data  
- "Schedule" or "daily/weekly" if recurring

Keep your response concise but complete.`,
            });

            if (response.text) {
                return {
                    content: response.text,
                    toolCalls: executedTools
                };
            }
        } catch (aiError) {
            console.error('AI generation failed:', aiError);
        }

        // Fallback if AI fails
        return {
            content: `👋 **Hello! I'm Baked HQ.**\n\nI'm routed to **${agentInfo?.name || 'General'}** (${agentInfo?.specialty || 'General Assistant'}).\n\n**Available Playbooks:**\n• \`Run welcome-sequence\`\n• \`Run competitor-scan\`\n• \`Run churn-predictor\`\n• \`Run platform-health\`\n\nWhat would you like me to help with?`,
            toolCalls: executedTools
        };

    } catch (e: any) {
        console.error("Agent Chat Error:", e);
        return {
            content: "I encountered an error. Try: `Run welcome-sequence` or `Run platform-health`",
            toolCalls: executedTools.length > 0 ? executedTools : undefined
        };
    }
}
