/**
 * Agent Definitions & Capabilities
 * Shared configuration used by both Client and Server code.
 */

export type AgentId = 'craig' | 'pops' | 'ezal' | 'smokey' | 'money_mike' | 'mrs_parker' | 'general' | 'puff' | 'deebo' | 'leo' | 'linus';

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
        roleRestrictions: ['guest', 'customer']
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
        specialty: 'Technical & Infrastructure',
        keywords: ['health check', 'integration', 'api', 'debug', 'system', 'infrastructure', 'codebase'],
        description: 'CTO-level technical oversight for platform health and integrations.',
        responseFormat: 'Use ✅/⚠️/❌ for status. Show latency metrics. List actionable issues.',
        roleRestrictions: ['guest', 'customer', 'dispensary', 'brand']
    },
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
