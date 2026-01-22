/**
 * Agent Definitions & Capabilities
 * Shared configuration used by both Client and Server code.
 */

export type AgentId = 'craig' | 'pops' | 'ezal' | 'smokey' | 'money_mike' | 'mike_exec' | 'mrs_parker' | 'day_day' | 'felisha' | 'general' | 'puff' | 'deebo' | 'leo' | 'linus' | 'roach' | 'big_worm' | 'jack' | 'glenda';

export interface AgentCapability {
    id: AgentId;
    name: string;
    specialty: string;
    keywords: string[];
    description: string;
    responseFormat?: string; // Hint for ideal response structure
    roleRestrictions?: string[]; // Roles that CANNOT access this agent
}

export const AGENT_CAPABILITIES: AgentCapability[] = [
    {
        id: 'craig',
        name: 'Craig',
        specialty: 'Content & Campaigns',
        keywords: ['sms', 'email', 'copy', 'campaign', 'message', 'content', 'write', 'draft', 'newsletter', 'promotional', 'video', 'image', 'create', 'generate', 'animation', 'cartoon', 'visual', 'creative', 'ad', 'commercial', 'promo'],
        description: 'Generates marketing copy, videos, images, SMS campaigns, and email content with compliance checking.',
        responseFormat: 'Provide 3 variations (Professional, Hype, Educational) for copy. Include compliance notes.',
        roleRestrictions: ['guest']
    },
    {
        id: 'pops',
        name: 'Pops',
        specialty: 'Analytics & Strategy',
        keywords: ['report', 'analytics', 'data', 'metrics', 'kpi', 'trend', 'analyze', 'insight', 'hypothesis', 'performance', 'revenue', 'sales', 'mrr', 'churn'],
        description: 'Analyzes business data, validates hypotheses, and provides strategic insights.',
        responseFormat: 'Use tables for comparisons. Include trend indicators (↑↓). Provide actionable recommendations.',
        roleRestrictions: ['guest']
    },
    {
        id: 'ezal',
        name: 'Ezal',
        specialty: 'Research & Intelligence',
        keywords: ['competitor', 'research', 'discovery', 'pricing', 'market', 'intelligence', 'spy', 'compare', 'aiq', 'dutchie', 'gap', 'opportunity'],
        description: 'Researches competitors, performs market discovery, and provides competitive intelligence.',
        responseFormat: '🔥 Emoji headers. Strict format: PRICE GAP, TOP MOVERS, MARKET OPPORTUNITIES. No fluff.',
        roleRestrictions: ['guest', 'customer']
    },
    {
        id: 'smokey',
        name: 'Smokey',
        specialty: 'Products & Recommendations',
        keywords: ['product', 'recommend', 'menu', 'strain', 'indica', 'sativa', 'effect', 'thc', 'cbd', 'inventory', 'buy', 'shop', 'terpene', 'anxiety', 'sleep', 'energy'],
        description: 'Manages product recommendations, menu optimization, and cannabis education.',
        responseFormat: '[Emoji] [Name] ([Type]) + Terpene focus + Match confidence (%) + Stock status. No medical claims.',
        roleRestrictions: []
    },
    {
        id: 'money_mike',
        name: 'Money Mike',
        specialty: 'Pricing & Revenue',
        keywords: ['price', 'pricing', 'discount', 'margin', 'revenue', 'forecast', 'profit', 'deal', 'promotion', 'cost', 'spend', 'roi', 'billing', 'subscription'],
        description: 'Optimizes pricing strategies, forecasts revenue impact, and validates margins.',
        responseFormat: 'Precise numbers. Currency formatting. Include margin impact. Use tables for comparisons.',
        roleRestrictions: ['guest', 'customer']
    },
    {
        id: 'mrs_parker',
        name: 'Mrs. Parker',
        specialty: 'Customer Journeys',
        keywords: ['customer', 'loyalty', 'churn', 'segment', 'journey', 'retention', 'engagement', 'welcome', 'at-risk', 'springbig', 'alpine iq', 'alpineiq', 'vip', 'win-back'],
        description: 'Manages customer segments, predicts churn, and orchestrates loyalty programs.',
        responseFormat: 'Segment customers by value/risk. Provide specific counts. Suggest actionable next steps.',
        roleRestrictions: ['guest']
    },
    {
        id: 'day_day',
        name: 'Day Day',
        specialty: 'SEO & Growth',
        keywords: ['seo', 'growth', 'traffic', 'rank', 'keywords', 'audit', 'meta', 'title', 'description', 'google', 'search', 'organic', 'visibility', 'index'],
        description: 'Audits pages for SEO, generates meta tags, and monitors search rankings.',
        responseFormat: 'SEO Score: [X/100]. List Critical/Warning/Info issues. Provide optimized meta tags in code blocks.',
        roleRestrictions: ['guest']
    },
    {
        id: 'felisha',
        name: 'Felisha',
        specialty: 'Meetings & Operations',
        keywords: ['meeting', 'calendar', 'schedule', 'notes', 'transcript', 'summary', 'action items', 'triage', 'error', 'ticket', 'support', 'ops', 'operations'],
        description: 'Coordinates meetings, takes structured notes, and triages operational issues.',
        responseFormat: 'Structured Meeting Notes: Attendees, Summary, Action Items (Assignee/Deadline). Sentiment analysis.',
        roleRestrictions: ['guest']
    },
    {
        id: 'general',
        name: 'Assistant',
        specialty: 'General research and task automation',
        keywords: ['help', 'info', 'research', 'search', 'find', 'dispensary', 'dispensaries', 'location', 'near me', 'hello', 'hi', 'hey'],
        description: 'Handles greetings, general questions, store locations, and broad research tasks.',
        responseFormat: 'For location: Ask ZIP/City if missing. For dispensaries: List top 5 with ratings/distance.',
        roleRestrictions: []
    },
    {
        id: 'puff',
        name: 'Puff',
        specialty: 'Executive Assistant & Orchestration',
        keywords: ['schedule', 'meeting', 'calendar', 'email', 'drive', 'sheets', 'document', 'task', 'organize', 'plan'],
        description: 'Lead executive assistant for complex task orchestration across Work OS.',
        responseFormat: 'Outcome-focused. Confirm actions taken. Provide next steps. No fluff.',
        roleRestrictions: ['guest', 'customer']
    },
    {
        id: 'deebo',
        name: 'Deebo',
        specialty: 'Compliance & Regulations',
        keywords: ['compliance', 'legal', 'regulation', 'audit', 'license', 'packaging', 'label', 'warning'],
        description: 'Ensures all content and operations are compliant with state cannabis regulations.',
        responseFormat: '✅/⚠️/❌ status indicators. Reference specific regulations. Provide remediation steps.',
        roleRestrictions: ['guest', 'customer']
    },
    {
        id: 'leo',
        name: 'Leo',
        specialty: 'Operations & Orchestration',
        keywords: ['orchestrate', 'delegate', 'coordinate', 'multi-agent', 'workflow'],
        description: 'COO-level orchestration across multiple agents for complex multi-step tasks.',
        responseFormat: 'Step-by-step execution log. Summarize results from each agent involved.',
        roleRestrictions: ['guest', 'customer', 'dispensary', 'brand']
    },
    {
        id: 'linus',
        name: 'Linus',
        specialty: 'Technical & Infrastructure (AI CTO)',
        keywords: [
            'health check', 'integration', 'api', 'debug', 'system', 'infrastructure', 'codebase',
            'code eval', 'deployment', 'build', 'test', 'architecture', 'mission ready',
            'layer 1', 'layer 7', 'deploy approval', 'push code', 'git', 'commit'
        ],
        description: 'AI CTO with exclusive Claude API access. Synthesizes 7-layer code evaluations, makes deployment decisions, and can push code updates. Bridge between codebase and Executive Boardroom.',
        responseFormat: 'Use ✅/⚠️/❌ for status. MISSION_READY/NEEDS_REVIEW/BLOCKED for deployment decisions. Include layer-by-layer scorecard.',
        roleRestrictions: ['guest', 'customer', 'dispensary', 'brand'],
        // Special config: Uses Claude API exclusively for agentic coding tasks
        // See: src/server/agents/linus.ts for implementation
    },
    {
        id: 'mike_exec',
        name: 'Mike',
        specialty: 'CFO (Corporate & Strategy)',
        keywords: ['audit', 'finance', 'investor', 'treasury', 'cfo', 'bank', 'compliance', 'budget', 'burn rate', 'ebitda'],
        description: 'Corporate CFO handling high-level financial strategy, audits, and investor relations. Distinct from Money Mike (Sales).',
        responseFormat: 'Formal, precise financial language. Focus on strategic ROI and capital efficiency.',
        roleRestrictions: ['guest', 'customer', 'dispensary', 'brand']
    },
    {
        id: 'roach',
        name: 'Roach',
        specialty: 'Academic Research & Compliance Knowledge (Librarian)',
        keywords: ['research', 'paper', 'academic', 'study', 'compliance', 'regulation', 'audit', 'deep dive', 'scholar', 'knowledge base', 'citation'],
        description: 'Maintains the Compliance Knowledge Base, conducts academic research, and assists executives with deep dives. The "Hive Mind" Librarian.',
        responseFormat: 'Academic citation style (APA). Structured summaries: "Key Findings", "Methodology", "Relevance". Tagged for archival.',
        roleRestrictions: ['guest', 'customer', 'dispensary', 'brand']
    },
    {
        id: 'jack',
        name: 'Jack',
        specialty: 'CRO (Revenue & Sales)',
        keywords: ['revenue', 'sales', 'cro', 'growth', 'scale', 'deal', 'close', 'pipeline', 'hubspot'],
        description: 'Chief Revenue Officer focused on MRR, sales pipeline, and closing high-value deals.',
        responseFormat: 'Aggressive, revenue-focused. "Show me the money." precise metrics.',
        roleRestrictions: ['guest', 'customer', 'dispensary', 'brand']
    },
    {
        id: 'glenda',
        name: 'Glenda',
        specialty: 'CMO (Marketing & Brand)',
        keywords: ['brand', 'marketing', 'cmo', 'awareness', 'traffic', 'social', 'campaign', 'pr', 'comms'],
        description: 'Chief Marketing Officer focused on brand awareness, organic traffic, and national campaigns.',
        responseFormat: 'Polished, on-brand, creative. Focus on engagement and reach.',
        roleRestrictions: ['guest', 'customer', 'dispensary', 'brand']
    }
];

// Helper to get agent by ID
export function getAgent(id: AgentId): AgentCapability | undefined {
    return AGENT_CAPABILITIES.find(a => a.id === id);
}

// Helper to check if role can access agent
export function canRoleAccessAgent(role: string, agentId: AgentId): boolean {
    const agent = getAgent(agentId);
    if (!agent) return false;
    if (!agent.roleRestrictions || agent.roleRestrictions.length === 0) return true;
    return !agent.roleRestrictions.includes(role);
}

/**
 * Build a formatted squad roster string for system prompts.
 * This ensures agents always have accurate, up-to-date squad information.
 *
 * @param excludeAgentId - Optionally exclude an agent (e.g., exclude 'leo' when building Leo's roster)
 * @returns Formatted string listing all agents and their specialties
 */
export function buildSquadRoster(excludeAgentId?: AgentId): string {
    const roster = AGENT_CAPABILITIES
        .filter(agent => agent.id !== excludeAgentId && agent.id !== 'general')
        .map(agent => `- **${agent.name}** (${agent.specialty}): ${agent.description.split('.')[0]}.`)
        .join('\n');

    return roster;
}

/**
 * Get a list of valid agent IDs for delegation (used in tool schemas).
 * Excludes 'general' and the calling agent.
 */
export function getDelegatableAgentIds(excludeAgentId?: AgentId): AgentId[] {
    return AGENT_CAPABILITIES
        .filter(agent => agent.id !== excludeAgentId && agent.id !== 'general')
        .map(agent => agent.id);
}

/**
 * Known integrations and their implementation status.
 * Used to ground agents on what's actually available vs. what needs setup.
 */
export interface IntegrationStatus {
    id: string;
    name: string;
    status: 'active' | 'configured' | 'not_configured' | 'coming_soon';
    description: string;
    setupRequired?: string;
}

export const KNOWN_INTEGRATIONS: IntegrationStatus[] = [
    // Implemented & Active
    { id: 'firebase_auth', name: 'Firebase Auth', status: 'active', description: 'User authentication' },
    { id: 'firestore', name: 'Firestore', status: 'active', description: 'Database and persistence' },
    { id: 'letta', name: 'Letta Memory', status: 'active', description: 'Agent memory and Hive Mind' },
    { id: 'claude_api', name: 'Claude API', status: 'active', description: 'AI synthesis (Anthropic)' },
    { id: 'gemini_api', name: 'Gemini API', status: 'active', description: 'AI planning (Google)' },

    // Configured but may need brand setup
    { id: 'blackleaf_sms', name: 'Blackleaf SMS', status: 'configured', description: 'SMS campaigns', setupRequired: 'Brand API key required' },
    { id: 'mailjet_email', name: 'Mailjet Email', status: 'configured', description: 'Email campaigns', setupRequired: 'Brand API key required' },

    // Not yet implemented
    { id: 'gmail', name: 'Gmail', status: 'not_configured', description: 'Email inbox monitoring', setupRequired: 'OAuth integration needed' },
    { id: 'google_calendar', name: 'Google Calendar', status: 'not_configured', description: 'Calendar sync', setupRequired: 'OAuth integration needed' },
    { id: 'google_drive', name: 'Google Drive', status: 'not_configured', description: 'Document storage', setupRequired: 'OAuth integration needed' },
    { id: 'hubspot', name: 'HubSpot CRM', status: 'not_configured', description: 'Sales pipeline', setupRequired: 'API key and OAuth setup' },
    { id: 'alpineiq', name: 'Alpine IQ', status: 'not_configured', description: 'Customer loyalty data', setupRequired: 'Brand integration required' },
    { id: 'springbig', name: 'Springbig', status: 'not_configured', description: 'Loyalty program', setupRequired: 'Brand integration required' },
    { id: 'dutchie', name: 'Dutchie POS', status: 'not_configured', description: 'POS integration', setupRequired: 'Brand POS setup required' },
];

/**
 * Get integration status for grounding responses.
 */
export function getIntegrationStatus(integrationId: string): IntegrationStatus | undefined {
    return KNOWN_INTEGRATIONS.find(i => i.id === integrationId);
}

/**
 * Build a status summary of all integrations for system prompts.
 */
export function buildIntegrationStatusSummary(): string {
    const active = KNOWN_INTEGRATIONS.filter(i => i.status === 'active');
    const configured = KNOWN_INTEGRATIONS.filter(i => i.status === 'configured');
    const notConfigured = KNOWN_INTEGRATIONS.filter(i => i.status === 'not_configured');

    let summary = '**ACTIVE INTEGRATIONS:**\n';
    summary += active.map(i => `✅ ${i.name}: ${i.description}`).join('\n');

    summary += '\n\n**CONFIGURED (May need brand setup):**\n';
    summary += configured.map(i => `⚙️ ${i.name}: ${i.description}`).join('\n');

    summary += '\n\n**NOT YET INTEGRATED:**\n';
    summary += notConfigured.map(i => `❌ ${i.name}: ${i.description} — ${i.setupRequired}`).join('\n');

    return summary;
}
