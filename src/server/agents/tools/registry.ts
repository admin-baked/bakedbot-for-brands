
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
        description: 'Discovers configured competitors for pricing and promotions.',
        inputSchema: {
            type: 'object',
            properties: {
                competitors: { type: 'array', items: { type: 'string' } }
            }
        },
        category: 'read', // External read
        requiredPermission: 'read:analytics', // Strategic intel usually falls under analytics/management
    },
    'intel.generateCompetitiveReport': {
        name: 'intel.generateCompetitiveReport',
        description: 'Generates a detailed markdown report comparing competitor pricing, stock, and trends against our catalog.',
        inputSchema: {
            type: 'object',
            properties: {
                period: { type: 'string', enum: ['24h', '7d'], default: '24h' }
            }
        },
        category: 'read',
        requiredPermission: 'read:analytics'
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
    'communications.sendNotification': {
        name: 'communications.sendNotification',
        description: 'Sends an internal notification or report email (e.g. Competitive Snapshot) from the BakedBot Team.',
        inputSchema: {
            type: 'object',
            properties: {
                to: { type: 'string', description: 'Recipient email address' },
                subject: { type: 'string', description: 'Email subject' },
                content: { type: 'string', description: 'Email body content (supports HTML)' }
            },
            required: ['to', 'subject', 'content']
        },
        category: 'write',
        requiredPermission: 'read:analytics' // Accessible to Dispensary/Brand/Admin
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
    'agent.delegate': {
        name: 'agent.delegate',
        description: 'Delegates a specialized task to another agent. Use this to spawn sub-tasks or cross-delegate to specialists.',
        inputSchema: {
            type: 'object',
            properties: {
                personaId: { 
                    type: 'string', 
                    enum: ['smokey', 'craig', 'pops', 'ezal', 'money_mike', 'mrs_parker', 'deebo', 'leo', 'jack', 'linus', 'glenda', 'mike_exec'],
                    description: 'The ID of the agent to delegate to.' 
                },
                task: { type: 'string', description: 'Detailed instructions for the sub-agent.' },
                context: { type: 'object', description: 'Optional structured data context for the task.' }
            },
            required: ['personaId', 'task']
        },
        category: 'write',
        requiredPermission: 'read:analytics'
    },
    'agent.broadcast': {
        name: 'agent.broadcast',
        description: 'Broadcasts a status update or critical finding across multiple channels (Slack, Email).',
        inputSchema: {
            type: 'object',
            properties: {
                message: { type: 'string', description: 'The stylized update message.' },
                channels: { type: 'array', items: { type: 'string', enum: ['slack', 'email'] } },
                recipients: { type: 'array', items: { type: 'string' }, description: 'Target emails or slack channels.' }
            },
            required: ['message', 'channels']
        },
        category: 'side-effect',
        requiredPermission: 'manage:campaigns'
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
    },

    // ===================================
    // 8. Creative Tools (All Roles)
    // ===================================
    'creative.generateImage': {
        name: 'creative.generateImage',
        description: 'Generates a marketing image from a text prompt using Nano Banana Pro (Gemini 3 Pro Image).',
        inputSchema: {
            type: 'object',
            properties: {
                prompt: { type: 'string', description: 'Detailed description of the image to generate' },
                aspectRatio: { type: 'string', enum: ['1:1', '16:9', '9:16', '4:3'], description: 'Image aspect ratio' },
                brandName: { type: 'string', description: 'Optional brand name for context' }
            },
            required: ['prompt']
        },
        category: 'write',
        requiredPermission: 'read:analytics', // All roles can use this
    },
    'creative.generateVideo': {
        name: 'creative.generateVideo',
        description: 'Generates a short marketing video (5-10 seconds) from a text prompt using Veo 3.1.',
        inputSchema: {
            type: 'object',
            properties: {
                prompt: { type: 'string', description: 'Detailed description of the video to generate' },
                duration: { type: 'string', enum: ['5', '10'], description: 'Video duration in seconds' },
                aspectRatio: { type: 'string', enum: ['16:9', '9:16', '1:1'], description: 'Video aspect ratio' },
                brandName: { type: 'string', description: 'Optional brand name for watermark/context' }
            },
            required: ['prompt']
        },
        category: 'write',
        requiredPermission: 'read:analytics', // All roles can use this
    },
    'dev.readCodebase': {
        name: 'dev.readCodebase',
        description: 'Enables Super Users to inspect the application codebase for context or debugging.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Relative path to file or directory (e.g. "src/app/page.tsx")' },
                mode: { type: 'string', enum: ['read', 'list'], default: 'read' }
            },
            required: ['path']
        },
        category: 'read',
        requiredPermission: 'admin:all',
    },
    'sheets.createSpreadsheet': {
        name: 'sheets.createSpreadsheet',
        description: 'Creates a new Google Spreadsheet and optional sheets. Useful for exporting reports.',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Title of the spreadsheet' },
                sheets: { type: 'array', items: { type: 'string' }, description: 'Names of sheets to create' }
            },
            required: ['title']
        },
        category: 'write',
        requiredPermission: 'manage:campaigns',
    },
    'drive.uploadFile': {
        name: 'drive.uploadFile',
        description: 'Uploads a file or document to Google Drive.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Name of the file' },
                content: { type: 'string', description: 'Content of the file (text or base64)' },
                mimeType: { type: 'string', description: 'Mime type of the file' },
                folderId: { type: 'string', description: 'Optional folder ID to upload to' }
            },
            required: ['name', 'content']
        },
        category: 'write',
        requiredPermission: 'manage:campaigns',
    },
    'slack.postMessage': {
        name: 'slack.postMessage',
        description: 'Posts a message to a Slack channel or DM.',
        inputSchema: {
            type: 'object',
            properties: {
                channel: { type: 'string', description: 'Channel name or ID' },
                text: { type: 'string', description: 'Message text' },
                blocks: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Framer/Slack blocks for rich content' }
            },
            required: ['channel', 'text']
        },
        category: 'write',
        requiredPermission: 'manage:campaigns',
    },
    // ===================================
    // 9. Internal CRM Tools (Jack/Admin)
    // ===================================
    'crm.getInternalLeads': {
        name: 'crm.getInternalLeads',
        description: 'Retrieves raw platform leads (B2B) for sales outreach. (Internal Use Only).',
        inputSchema: {
            type: 'object',
            properties: {
                limit: { type: 'number', default: 20 },
                search: { type: 'string', description: 'Search by company or email' }
            }
        },
        category: 'read',
        requiredPermission: 'read:analytics' // Assuming Executives have this
    },
    'crm.getInternalBrands': {
        name: 'crm.getInternalBrands',
        description: 'Retrieves platform brand organizations and their statuses.',
        inputSchema: {
            type: 'object',
            properties: {
                state: { type: 'string', description: 'Filter by state (e.g. "MI")' },
                status: { type: 'string', enum: ['unclaimed', 'claimed', 'invited'] }
            }
        },
        category: 'read',
        requiredPermission: 'read:analytics'
    },
    
    // ===================================
    // 10. System Navigation (Inline Connections)
    // ===================================
    'system.generateConnectionLink': {
        name: 'system.generateConnectionLink',
        description: 'Generates a deep link to connect a third-party tool (Stripe, GitHub, etc).',
        inputSchema: {
            type: 'object',
            properties: {
                tool: { 
                    type: 'string', 
                    enum: ['stripe', 'github', 'salesforce', 'hubspot', 'linear', 'jira', 'google_analytics', 'search_console'],
                    description: 'The tool to connect.'
                }
            },
            required: ['tool']
        },
        category: 'read', // Just generating a link
        requiredPermission: 'read:analytics'
    },

    // ===================================
    // 11. Intention OS (Architecture V2)
    // ===================================
    'intention.askClarification': {
        name: 'intention.askClarification',
        description: 'Asks the user a clarifying question when intent is ambiguous. STOPS execution until answered.',
        inputSchema: {
            type: 'object',
            properties: {
                question: { type: 'string', description: 'The question to ask the user.' },
                context: { type: 'array', items: { type: 'string' }, description: 'Why this is ambiguous.' }
            },
            required: ['question']
        },
        category: 'read',
        requiredPermission: undefined // System tool, available to all agents
    },
    'intention.createCommit': {
        name: 'intention.createCommit',
        description: 'Commits to a structured plan before taking action. Required for high-stakes tasks.',
        inputSchema: {
            type: 'object',
            properties: {
                goal: { type: 'string' },
                assumptions: { type: 'array', items: { type: 'string' } },
                constraints: { type: 'array', items: { type: 'string' } },
                plan: { 
                    type: 'array', 
                    items: { 
                        type: 'object', 
                        properties: { tool: { type: 'string' }, reason: { type: 'string' } } 
                    } 
                }
            },
            required: ['goal', 'plan']
        },
        category: 'write',
        requiredPermission: undefined
    },

    // ===================================
    // 12. Discovery Browser Tools (Executive Only)
    // ===================================
    'discovery.browserAutomate': {
        name: 'discovery.browserAutomate',
        description: 'Execute a browser automation task. Can navigate pages, fill forms, click buttons, and extract data. (Executive Boardroom + Super Users only)',
        inputSchema: {
            type: 'object',
            properties: {
                input: { type: 'string', description: 'Detailed instruction for the browser agent' },
                urls: { type: 'array', items: { type: 'string' }, description: 'URLs to open' },
                verbosity: { type: 'string', enum: ['final', 'steps', 'debug'], default: 'final' }
            },
            required: ['input']
        },
        category: 'side-effect',
        requiredPermission: 'admin:all',
    },
    'discovery.summarizePage': {
        name: 'discovery.summarizePage',
        description: 'Summarize the main content of a webpage in bullet points. (Executive Boardroom + Super Users only)',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to summarize' }
            },
            required: ['url']
        },
        category: 'read',
        requiredPermission: 'admin:all',
    },
    'discovery.extractData': {
        name: 'discovery.extractData',
        description: 'Extract structured data from a webpage based on instructions. (Executive Boardroom + Super Users only)',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to extract from' },
                instruction: { type: 'string', description: 'What data to extract' },
                schema: { type: 'object', description: 'Expected JSON schema for output' }
            },
            required: ['url', 'instruction']
        },
        category: 'read',
        requiredPermission: 'admin:all',
    },
    'discovery.fillForm': {
        name: 'discovery.fillForm',
        description: 'Fill a form on a webpage and optionally submit it. (Executive Boardroom + Super Users only)',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL of the form' },
                formData: { type: 'object', description: 'Field name to value mapping' },
                submitButtonText: { type: 'string', description: 'Text of submit button to click' }
            },
            required: ['url', 'formData']
        },
        category: 'side-effect',
        requiredPermission: 'admin:all',
    },
    'discovery.createRedditAd': {
        name: 'discovery.createRedditAd',
        description: 'Create a Reddit advertising campaign targeting specific subreddits. (Executive Boardroom + Super Users only)',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Campaign name' },
                objective: { type: 'string', enum: ['traffic', 'conversions', 'awareness'] },
                targetSubreddits: { type: 'array', items: { type: 'string' }, description: 'Subreddits to target' },
                budget: { type: 'number', description: 'Daily budget in USD' },
                headline: { type: 'string', description: 'Ad headline' },
                body: { type: 'string', description: 'Ad body text' }
            },
            required: ['name', 'objective', 'targetSubreddits', 'budget']
        },
        category: 'side-effect',
        requiredPermission: 'admin:all',
    },

    // ===================================
    // 13. Letta Memory System (Universal)
    // ===================================
    'letta.saveFact': {
        name: 'letta.saveFact',
        description: 'Save a persistent fact or finding into long-term memory via Letta.',
        inputSchema: {
            type: 'object',
            properties: {
                fact: { type: 'string' },
                category: { type: 'string' }
            },
            required: ['fact']
        },
        category: 'write',
        requiredPermission: 'read:analytics', // Broad access
    },
    'letta.searchMemory': {
        name: 'letta.searchMemory',
        description: 'Semantically search long-term memory for facts.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string' }
            },
            required: ['query']
        },
        category: 'read',
        requiredPermission: 'read:analytics',
    },
    'letta.updateCoreMemory': {
        name: 'letta.updateCoreMemory',
        description: 'Update your own Core Memory (Persona).',
        inputSchema: {
            type: 'object',
            properties: {
                section: { type: 'string', enum: ['persona', 'human'] },
                content: { type: 'string' }
            },
            required: ['section', 'content']
        },
        category: 'write',
        requiredPermission: 'read:analytics',
    },
    'letta.messageAgent': {
        name: 'letta.messageAgent',
        description: 'Send a message to another agent.',
        inputSchema: {
            type: 'object',
            properties: {
                toAgent: { type: 'string' },
                message: { type: 'string' }
            },
            required: ['toAgent', 'message']
        },
        category: 'write',
        requiredPermission: 'read:analytics',
    },

    // ===================================
    // 14. Firecrawl Deep Discovery (Universal)
    // ===================================
    'discovery.mapSite': {
        name: 'discovery.mapSite',
        description: 'Map all URLs on a website. Returns a sitemap of discoverable pages.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'Root URL to map' }
            },
            required: ['url']
        },
        category: 'read',
        requiredPermission: 'read:analytics', // Universal access
    },
    'discovery.crawl': {
        name: 'discovery.crawl',
        description: 'Crawl multiple pages and extract structured data.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'Starting URL' },
                limit: { type: 'number', description: 'Max pages to crawl (default: 10)' },
                schema: { type: 'object', description: 'JSON schema for data extraction' }
            },
            required: ['url']
        },
        category: 'read',
        requiredPermission: 'read:analytics',
    },

    // ===================================
    // 15. Firecrawl MCP Tools (Universal)
    // ===================================
    'firecrawl.search': {
        name: 'firecrawl.search',
        description: 'Search the web and extract content from results.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
                limit: { type: 'number', description: 'Max results (default: 5)' },
                scrapeContent: { type: 'boolean', description: 'Extract full content' }
            },
            required: ['query']
        },
        category: 'read',
        requiredPermission: 'read:analytics',
    },
    'firecrawl.batchScrape': {
        name: 'firecrawl.batchScrape',
        description: 'Scrape multiple URLs efficiently.',
        inputSchema: {
            type: 'object',
            properties: {
                urls: { type: 'array', items: { type: 'string' }, description: 'URLs to scrape' },
                format: { type: 'string', enum: ['markdown', 'html'] }
            },
            required: ['urls']
        },
        category: 'read',
        requiredPermission: 'read:analytics',
    },
    'firecrawl.map': {
        name: 'firecrawl.map',
        description: 'Discover all URLs on a website.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'Root URL to map' }
            },
            required: ['url']
        },
        category: 'read',
        requiredPermission: 'read:analytics',
    },
    'firecrawl.extract': {
        name: 'firecrawl.extract',
        description: 'Extract structured data from a page using LLM.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to extract from' },
                fields: { type: 'array', items: { type: 'string' }, description: 'Fields to extract' }
            },
            required: ['url', 'fields']
        },
        category: 'read',
        requiredPermission: 'read:analytics',
    },

    // ===================================
    // 16. Scouts (Competitive Monitoring)
    // ===================================
    'scout.create': {
        name: 'scout.create',
        description: 'Create a monitoring scout that automatically watches for web changes.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'What to monitor (e.g., "competitor product launches")' },
                frequency: { type: 'string', enum: ['hourly', 'daily', 'weekly'] },
                targetUrls: { type: 'array', items: { type: 'string' }, description: 'Specific URLs to watch' }
            },
            required: ['query']
        },
        category: 'write',
        requiredPermission: 'read:analytics',
    },
    'scout.run': {
        name: 'scout.run',
        description: 'Manually trigger a scout to run now.',
        inputSchema: {
            type: 'object',
            properties: {
                scoutId: { type: 'string', description: 'ID of the scout to run' }
            },
            required: ['scoutId']
        },
        category: 'read',
        requiredPermission: 'read:analytics',
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
