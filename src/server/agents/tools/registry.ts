
import { ToolDefinition } from '@/types/agent-toolkit';
import { UserRole, hasRolePermission } from '@/server/auth/rbac';

/**
 * The Central Registry of all available tools for BakedBot Agents.
 * This is the source of truth for the Tool Router.
 */
export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
    // ===================================
    // 1. Universal Tools
    // ===================================
    'context.getTenantProfile': {
        name: 'context.getTenantProfile',
        description: 'Retrieves the complete profile of the current tenant, including locations, plan tier, and enabled channels.',
        inputSchema: {},
        category: 'read',
        requiredPermission: 'read:analytics', // Basic read access
    },
    'audit.log': {
        name: 'audit.log',
        description: 'Explicitly logs an important event or decision to the audit trail.',
        inputSchema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                level: { type: 'string', enum: ['info', 'warn', 'error'] },
                metadata: { type: 'object' }
            },
            required: ['message']
        },
        category: 'write',
        requiredPermission: 'read:analytics', // Accessible to anyone who can read analytics/use system
        isSystemInternal: true,
    },
    'docs.search': {
        name: 'docs.search',
        description: 'Searches the tenant\'s internal documentation (SOPs, Brand Guidelines, Past Campaigns).',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string' },
                limit: { type: 'number' }
            },
            required: ['query']
        },
        category: 'read',
        requiredPermission: 'read:analytics',
    },

    // ===================================
    // 2. Catalog & Menu Tools (Smokey)
    // ===================================
    'catalog.searchProducts': {
        name: 'catalog.searchProducts',
        description: 'Searches the product catalog with filtering.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string' },
                category: { type: 'string' },
                minPrice: { type: 'number' },
                maxPrice: { type: 'number' },
                effects: { type: 'array', items: { type: 'string' } },
            }
        },
        category: 'read',
        requiredPermission: 'read:products',
    },
    'catalog.getProduct': {
        name: 'catalog.getProduct',
        description: 'Retrieves full details for a specific product.',
        inputSchema: {
            type: 'object',
            properties: {
                productId: { type: 'string' }
            },
            required: ['productId']
        },
        category: 'read',
        requiredPermission: 'read:products',
    },

    // ===================================
    // 3. Marketing Tools (Craig)
    // ===================================
    'marketing.createCampaignDraft': {
        name: 'marketing.createCampaignDraft',
        description: 'Creates a draft campaign for email or SMS.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                channel: { type: 'string', enum: ['email', 'sms'] },
                audienceSegmentId: { type: 'string' },
                content: { type: 'string' },
                scheduledTime: { type: 'number' }
            },
            required: ['name', 'channel', 'content']
        },
        category: 'write',
        requiredPermission: 'manage:campaigns',
    },
    'marketing.segmentBuilder': {
        name: 'marketing.segmentBuilder',
        description: 'Builds or estimates a customer segment based on criteria.',
        inputSchema: {
            type: 'object',
            properties: {
                criteria: {
                    type: 'object',
                    properties: {
                        minSpends: { type: 'number' },
                        lastVisitDays: { type: 'number' },
                        purchasedCategory: { type: 'string' }
                    }
                }
            },
            required: ['criteria']
        },
        category: 'read', // or write if persisting
        requiredPermission: 'manage:campaigns',
    },
    'marketing.send': {
        name: 'marketing.send',
        description: 'Executes a marketing campaign (side effect). Requires Approval.',
        inputSchema: {
            type: 'object',
            properties: {
                campaignId: { type: 'string' },
                dryRun: { type: 'boolean' }
            },
            required: ['campaignId']
        },
        category: 'side-effect',
        requiredPermission: 'manage:campaigns',
    },
    'marketing.sendEmail': {
        name: 'marketing.sendEmail',
        description: 'Sends an email via the active provider (Mailjet/SendGrid). Used by playbooks for automated email dispatch.',
        inputSchema: {
            type: 'object',
            properties: {
                to: { type: 'string', description: 'Recipient email address' },
                subject: { type: 'string', description: 'Email subject line' },
                content: { type: 'string', description: 'Email body content' },
                recipientName: { type: 'string', description: 'Recipient display name' },
                brandName: { type: 'string', description: 'Sender brand name' }
            },
            required: ['to', 'subject', 'content']
        },
        category: 'write',
        requiredPermission: 'manage:campaigns',
    },



    // ===================================
    // 5. BI & Intel Tools (Pops & Ezal)
    // ===================================
    'analytics.getKPIs': {
        name: 'analytics.getKPIs',
        description: 'Retrieves key performance indicators (revenue, orders, etc) for a given period.',
        inputSchema: {
            type: 'object',
            properties: {
                period: { type: 'string', enum: ['day', 'week', 'month'] }
            },
            required: ['period']
        },
        category: 'read',
        requiredPermission: 'read:analytics',
    },
    'intel.scanCompetitors': {
        name: 'intel.scanCompetitors',
        description: 'Scans configured competitors for pricing and promotions.',
        inputSchema: {
            type: 'object',
            properties: {
                competitors: { type: 'array', items: { type: 'string' } }
            }
        },
        category: 'read', // External read
        requiredPermission: 'read:analytics', // Strategic intel usually falls under analytics/management
    },

    // ===================================
    // 6. Compliance Tools (Deebo)
    // ===================================
    'deebo.checkContent': {
        name: 'deebo.checkContent',
        description: 'Validates content against compliance rules for a specific channel and jurisdiction.',
        inputSchema: {
            type: 'object',
            properties: {
                content: { type: 'string' },
                channel: { type: 'string' },
                jurisdictions: { type: 'array', items: { type: 'string' } }
            },
            required: ['content', 'channel']
        },
        category: 'policy',
        requiredPermission: 'manage:brand', // usually a brand manager task
    },
    // ===================================
    // 7. Sandbox & Experimental Tools
    // ===================================
    'web.search': {
        name: 'web.search',
        description: 'Performs a live web search using Serper (Google).',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string' }
            },
            required: ['query']
        },
        category: 'read',
        requiredPermission: 'read:analytics'
    },
    'communications.sendTestEmail': {
        name: 'communications.sendTestEmail',
        description: 'Sends a test email via the active provider (Mailjet/SendGrid).',
        inputSchema: {
            type: 'object',
            properties: {
                to: { type: 'string' }
            },
            required: ['to']
        },
        category: 'write',
        requiredPermission: 'read:analytics'
    },
    'os.simulator': {
        name: 'os.simulator',
        description: 'Simulates computer interaction (placeholder for Computer Use API).',
        inputSchema: {
            type: 'object',
            properties: {
                action: { type: 'string' }
            },
            required: ['action']
        },
        category: 'read',
        requiredPermission: 'read:analytics'
    },
    'agent.executePlaybook': {
        name: 'agent.executePlaybook',
        description: 'Executes a predefined playbook for an agent.',
        inputSchema: {
            type: 'object',
            properties: {
                playbookId: { type: 'string' },
                agentId: { type: 'string' }
            },
            required: ['playbookId']
        },
        category: 'write',
        requiredPermission: 'read:analytics'
    }
};

/**
 * Helper to look up a tool definition.
 */
export function getToolDefinition(name: string): ToolDefinition | undefined {
    return TOOL_REGISTRY[name];
}

/**
 * Helper to get all tools available to a specific role.
 * Uses the centralized RBAC logic.
 */
export function getToolsForRole(role: UserRole): ToolDefinition[] {
    return Object.values(TOOL_REGISTRY).filter(tool => {
        if (!tool.requiredPermission) return true; // Public/System tools without specific permission?
        return hasRolePermission(role, tool.requiredPermission);
    });
}
