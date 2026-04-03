/**
 * Canonical Agent Registry
 *
 * Single source of truth for all BakedBot agents.
 * All hooks, configs, and UI layers should derive from this file.
 */

export type AgentId =
    | 'smokey'
    | 'craig'
    | 'pops'
    | 'ezal'
    | 'money_mike'
    | 'mrs_parker'
    | 'deebo'
    | 'puff';

export type AgentDomain =
    | 'commerce'
    | 'marketing'
    | 'analytics'
    | 'competitive_intel'
    | 'pricing'
    | 'loyalty'
    | 'compliance'
    | 'system';

export type AgentStatus = 'online' | 'thinking' | 'working' | 'offline';

export interface AgentVisual {
    /** Emoji avatar for compact displays */
    emoji: string;
    /** Tailwind color class (e.g. 'emerald-500') — used as base for bg-*, text-*, border-* */
    color: string;
}

export interface AgentDefinition {
    id: AgentId;
    name: string;
    title: string;
    domains: AgentDomain[];
    description: string;
    /** Avatar URL used in dashboard UI */
    image: string;
    /** Consistent visual identity (emoji + color) across all UI surfaces */
    visual: AgentVisual;
    defaultStatus: AgentStatus;
    /** Whether this agent appears in the visible squad panel */
    visibleInSquad: boolean;
    /** Which user roles can interact with this agent */
    supportedRoles: Array<'brand' | 'dispensary' | 'owner' | 'admin' | 'super_admin' | 'customer' | 'editor' | 'concierge'>;
}

export const AGENT_REGISTRY: Record<AgentId, AgentDefinition> = {
    smokey: {
        id: 'smokey',
        name: 'Smokey',
        title: 'The Budtender',
        domains: ['commerce'],
        description: 'Product discovery, menu guidance, recommendations, and cart conversion.',
        image: 'https://i.pravatar.cc/150?u=Smokey',
        visual: { emoji: '🌿', color: 'emerald-500' },
        defaultStatus: 'online',
        visibleInSquad: true,
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin', 'customer', 'concierge'],
    },
    craig: {
        id: 'craig',
        name: 'Craig',
        title: 'The Marketer',
        domains: ['marketing'],
        description: 'Campaign drafting, creative execution, playbooks, and lifecycle marketing.',
        image: 'https://i.pravatar.cc/150?u=Craig',
        visual: { emoji: '📣', color: 'blue-500' },
        defaultStatus: 'online',
        visibleInSquad: true,
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin', 'editor'],
    },
    pops: {
        id: 'pops',
        name: 'Pops',
        title: 'The Analyst',
        domains: ['analytics'],
        description: 'Revenue reporting, funnel metrics, goals tracking, and executive summaries.',
        image: 'https://i.pravatar.cc/150?u=Pops',
        visual: { emoji: '📊', color: 'orange-500' },
        defaultStatus: 'online',
        visibleInSquad: true,
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin', 'super_admin'],
    },
    ezal: {
        id: 'ezal',
        name: 'Ezal',
        title: 'The Lookout',
        domains: ['competitive_intel'],
        description: 'Competitive intelligence, market scans, pricing surveillance, and deep research.',
        image: 'https://i.pravatar.cc/150?u=Ezal',
        visual: { emoji: '🔍', color: 'purple-500' },
        defaultStatus: 'online',
        visibleInSquad: true,
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin'],
    },
    money_mike: {
        id: 'money_mike',
        name: 'Money Mike',
        title: 'The Banker',
        domains: ['pricing'],
        description: 'Pricing strategy, margin analysis, bundles, upsells, and profitability optimization.',
        image: 'https://i.pravatar.cc/150?u=MoneyMike',
        visual: { emoji: '💰', color: 'amber-500' },
        defaultStatus: 'online',
        visibleInSquad: true,
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin'],
    },
    mrs_parker: {
        id: 'mrs_parker',
        name: 'Mrs. Parker',
        title: 'The Retention Agent',
        domains: ['loyalty'],
        description: 'Loyalty programs, CRM, VIP segmentation, reactivation workflows, and churn prevention.',
        image: 'https://i.pravatar.cc/150?u=MrsParker',
        visual: { emoji: '💜', color: 'pink-500' },
        defaultStatus: 'online',
        visibleInSquad: true,
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin'],
    },
    deebo: {
        id: 'deebo',
        name: 'Deebo',
        title: 'The Enforcer',
        domains: ['compliance'],
        description: 'Compliance review, policy guardrails, regulated content checks, and audit prep.',
        image: 'https://i.pravatar.cc/150?u=Deebo',
        visual: { emoji: '🛡️', color: 'red-500' },
        defaultStatus: 'working',
        visibleInSquad: true,
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin', 'editor', 'super_admin'],
    },
    puff: {
        id: 'puff',
        name: 'Puff',
        title: 'System Agent',
        domains: ['system'],
        description: 'Platform-wide meta agent for super admin and system orchestration.',
        image: 'https://i.pravatar.cc/150?u=Puff',
        visual: { emoji: '🤖', color: 'slate-500' },
        defaultStatus: 'online',
        visibleInSquad: false,
        supportedRoles: ['super_admin'],
    },
};

/** All 7 business-facing agents (excludes puff) */
export const BUSINESS_AGENT_IDS: AgentId[] = [
    'smokey',
    'craig',
    'pops',
    'ezal',
    'money_mike',
    'mrs_parker',
    'deebo',
];

/** Agents that should appear in the dashboard squad panel */
export const VISIBLE_AGENT_SQUAD = BUSINESS_AGENT_IDS.map(id => AGENT_REGISTRY[id]);

export function getAgentById(id: AgentId): AgentDefinition {
    return AGENT_REGISTRY[id];
}

export function getAgentsForRole(
    role: AgentDefinition['supportedRoles'][number]
): AgentDefinition[] {
    return VISIBLE_AGENT_SQUAD.filter(a => a.supportedRoles.includes(role));
}
