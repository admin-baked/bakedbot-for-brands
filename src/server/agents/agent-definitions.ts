/**
 * Agent Definitions & Capabilities
 * Shared configuration used by both Client and Server code.
 */

export type AgentId = 'craig' | 'pops' | 'ezal' | 'smokey' | 'money_mike' | 'mrs_parker' | 'general' | 'puff';

export interface AgentCapability {
    id: AgentId;
    name: string;
    specialty: string;
    keywords: string[];
    description: string;
}

export const AGENT_CAPABILITIES: AgentCapability[] = [
    {
        id: 'craig',
        name: 'Craig',
        specialty: 'Content & Campaigns',
        keywords: ['sms', 'email', 'copy', 'campaign', 'message', 'content', 'write', 'draft', 'newsletter', 'promotional', 'video', 'image', 'create', 'generate', 'animation', 'cartoon', 'visual', 'creative', 'ad', 'commercial', 'promo'],
        description: 'Generates marketing copy, videos, images, SMS campaigns, and email content with compliance checking.'
    },
    {
        id: 'pops',
        name: 'Pops',
        specialty: 'Analytics & Strategy',
        keywords: ['report', 'analytics', 'data', 'metrics', 'kpi', 'trend', 'analyze', 'insight', 'hypothesis', 'performance', 'revenue', 'sales'],
        description: 'Analyzes business data, validates hypotheses, and provides strategic insights.'
    },
    {
        id: 'ezal',
        name: 'Ezal',
        specialty: 'Research & Intelligence',
        keywords: ['competitor', 'research', 'discovery', 'pricing', 'market', 'intelligence', 'spy', 'compare', 'aiq', 'dutchie'],
        description: 'Researches competitors, performs market discovery, and provides competitive intelligence.'
    },
    {
        id: 'smokey',
        name: 'Smokey',
        specialty: 'Products & Recommendations',
        keywords: ['product', 'recommend', 'menu', 'strain', 'indica', 'sativa', 'effect', 'thc', 'cbd', 'inventory', 'buy', 'shop'],
        description: 'Manages product recommendations, menu optimization, and education.'
    },
    {
        id: 'money_mike',
        name: 'Money Mike',
        specialty: 'Pricing & Revenue',
        keywords: ['price', 'pricing', 'discount', 'margin', 'revenue', 'forecast', 'profit', 'deal', 'promotion', 'cost', 'spend', 'roi'],
        description: 'Optimizes pricing strategies, forecasts revenue impact, and validates margins.'
    },
    {
        id: 'mrs_parker',
        name: 'Mrs. Parker',
        specialty: 'Customer Journeys',
        keywords: ['customer', 'loyalty', 'churn', 'segment', 'journey', 'retention', 'engagement', 'welcome', 'at-risk', 'springbig', 'alpine iq', 'alpineiq', 'vip'],
        description: 'Manages customer segments, predicts churn, and orchestrates loyalty programs.'
    },
    {
        id: 'general',
        name: 'Assistant',
        specialty: 'General research and task automation',
        keywords: ['help', 'info', 'research', 'search', 'find', 'dispensary', 'dispensaries', 'location', 'near me'],
        description: 'Handles greetings, general questions, store locations, and broad research tasks.'
    },
];
