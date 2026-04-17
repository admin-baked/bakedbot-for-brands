/**
 * Canonical agent identity and capability metadata.
 *
 * UI-specific presentation details live in `src/lib/agents/registry.ts`.
 * Core identity, role access, and visibility rules should be defined here first.
 */

export const AGENT_DOMAINS = [
    'commerce',
    'marketing',
    'analytics',
    'competitive_intel',
    'pricing',
    'loyalty',
    'compliance',
    'growth',
    'operations',
    'revenue',
    'technology',
    'research',
    'system',
] as const;

export type AgentDomain = typeof AGENT_DOMAINS[number];

export const AGENT_KINDS = ['field', 'executive', 'system'] as const;
export type AgentKind = typeof AGENT_KINDS[number];

export const AGENT_VISIBILITIES = ['squad', 'internal', 'hidden'] as const;
export type AgentVisibility = typeof AGENT_VISIBILITIES[number];

export const AGENT_MATURITIES = ['active', 'experimental', 'legacy'] as const;
export type AgentMaturity = typeof AGENT_MATURITIES[number];

export const AGENT_SUPPORTED_ROLES = [
    'brand',
    'dispensary',
    'owner',
    'admin',
    'super_admin',
    'customer',
    'editor',
    'concierge',
] as const;

export type AgentSupportedRole = typeof AGENT_SUPPORTED_ROLES[number];

export interface AgentContractEntry {
    id: string;
    displayName: string;
    title: string;
    kind: AgentKind;
    domains: readonly AgentDomain[];
    supportedRoles: readonly AgentSupportedRole[];
    visibility: AgentVisibility;
    maturity: AgentMaturity;
    description: string;
    aliases?: readonly string[];
    notes?: string;
}

export const AGENT_CONTRACT = {
    smokey: {
        id: 'smokey',
        displayName: 'Smokey',
        title: 'AI Budtender & Headless Menu',
        kind: 'field',
        domains: ['commerce'],
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin', 'customer', 'concierge'],
        visibility: 'squad',
        maturity: 'active',
        description: 'Answers product questions, drives SEO traffic, and routes baskets to your retail partners.',
    },
    craig: {
        id: 'craig',
        displayName: 'Craig',
        title: 'Email & SMS Hustler',
        kind: 'field',
        domains: ['marketing'],
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin', 'editor'],
        visibility: 'squad',
        maturity: 'active',
        description: 'Runs lifecycle campaigns, sends drops, and keeps your list warm without sounding spammy.',
    },
    pops: {
        id: 'pops',
        displayName: 'Pops',
        title: 'Analytics & Forecasting',
        kind: 'field',
        domains: ['analytics'],
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin', 'super_admin'],
        visibility: 'squad',
        maturity: 'active',
        description: 'Turns messy sales data into cohort reports, lift tests, and "are we winning?" dashboards.',
    },
    ezal: {
        id: 'ezal',
        displayName: 'Ezal',
        title: 'Competitive Monitoring',
        kind: 'field',
        domains: ['competitive_intel'],
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin'],
        visibility: 'squad',
        maturity: 'active',
        description: "Watches menus, promos, and SEO footprints so you're never surprised by a rival's move.",
    },
    money_mike: {
        id: 'money_mike',
        displayName: 'Money Mike',
        title: 'Pricing & Margin Brain',
        kind: 'field',
        domains: ['pricing'],
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin'],
        visibility: 'squad',
        maturity: 'active',
        description: "Monitors competitors and suggests price moves that won't accidentally nuke your margins.",
        notes: 'Distinct from mike_exec, which is the executive CFO persona for company-level finance.',
    },
    mrs_parker: {
        id: 'mrs_parker',
        displayName: 'Mrs. Parker',
        title: 'Customer Success',
        kind: 'field',
        domains: ['loyalty'],
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin'],
        visibility: 'squad',
        maturity: 'active',
        description: 'Manages customer journeys, predicts churn, and orchestrates loyalty programs.',
    },
    deebo: {
        id: 'deebo',
        displayName: 'Deebo',
        title: 'Regulation OS',
        kind: 'field',
        domains: ['compliance'],
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin', 'editor', 'super_admin'],
        visibility: 'squad',
        maturity: 'active',
        description: 'Pre-flight checks, compliance audits, and state rule enforcement.',
    },
    day_day: {
        id: 'day_day',
        displayName: 'Day Day',
        title: 'SEO & Growth Manager',
        kind: 'field',
        domains: ['growth'],
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin'],
        visibility: 'squad',
        maturity: 'active',
        description: 'Audits pages, builds backlinks, and ensures you dominate local search results.',
    },
    puff: {
        id: 'puff',
        displayName: 'Puff',
        title: 'System Agent',
        kind: 'system',
        domains: ['system'],
        supportedRoles: ['super_admin'],
        visibility: 'internal',
        maturity: 'active',
        description: 'Platform-wide meta agent for super admin and system orchestration.',
        notes: 'Canonical system agent, but intentionally excluded from the standard business-facing squad.',
    },
    general: {
        id: 'general',
        displayName: 'Assistant',
        title: 'General Assistant',
        kind: 'system',
        domains: ['system'],
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin', 'super_admin', 'customer', 'editor', 'concierge'],
        visibility: 'hidden',
        maturity: 'active',
        description: 'Handles greetings, general questions, store locations, and broad research tasks.',
        aliases: ['assistant'],
        notes: 'Canonical fallback assistant that is intentionally not listed in the standard squad surfaces.',
    },
    leo: {
        id: 'leo',
        displayName: 'Leo',
        title: 'COO - Operations Chief',
        kind: 'executive',
        domains: ['operations'],
        supportedRoles: ['super_admin'],
        visibility: 'internal',
        maturity: 'active',
        description: 'Orchestrates multi-agent workflows, coordinates the executive team, and manages operational priorities.',
    },
    jack: {
        id: 'jack',
        displayName: 'Jack',
        title: 'CRO - Revenue Chief',
        kind: 'executive',
        domains: ['revenue'],
        supportedRoles: ['super_admin'],
        visibility: 'internal',
        maturity: 'active',
        description: 'Drives MRR growth, manages the sales pipeline, and closes high-value deals.',
    },
    linus: {
        id: 'linus',
        displayName: 'Linus',
        title: 'CTO - Technical Chief',
        kind: 'executive',
        domains: ['technology'],
        supportedRoles: ['super_admin'],
        visibility: 'internal',
        maturity: 'active',
        description: 'AI CTO with Claude API access. Evaluates code, manages deployments, and maintains infrastructure.',
    },
    glenda: {
        id: 'glenda',
        displayName: 'Glenda',
        title: 'CMO - Marketing Chief',
        kind: 'executive',
        domains: ['marketing'],
        supportedRoles: ['super_admin'],
        visibility: 'internal',
        maturity: 'active',
        description: 'Leads brand awareness, organic traffic growth, and national marketing campaigns.',
    },
    mike_exec: {
        id: 'mike_exec',
        displayName: 'Mike',
        title: 'CFO - Finance Chief',
        kind: 'executive',
        domains: ['pricing'],
        supportedRoles: ['super_admin'],
        visibility: 'internal',
        maturity: 'active',
        description: 'Corporate CFO handling financial strategy, audits, treasury, and investor relations.',
        notes: 'Distinct from money_mike, which is the field pricing agent operating in customer-org contexts.',
    },
    roach: {
        id: 'roach',
        displayName: 'Roach',
        title: 'Research Librarian',
        kind: 'executive',
        domains: ['research'],
        supportedRoles: ['super_admin'],
        visibility: 'internal',
        maturity: 'active',
        description: 'Maintains Knowledge Base, conducts academic research, and assists with deep dives.',
    },
    marty: {
        id: 'marty',
        displayName: 'Marty Benjamins',
        title: 'CEO - Growth, Strategy & Company Operations',
        kind: 'executive',
        domains: ['operations', 'revenue'],
        supportedRoles: ['super_admin'],
        visibility: 'internal',
        maturity: 'active',
        description: 'AI CEO of BakedBot AI. Manages the company toward $1M ARR. Oversees all executives, sets strategic direction, and ensures everything is working.',
    },
    felisha: {
        id: 'felisha',
        displayName: 'Felisha',
        title: 'Meetings & Operations',
        kind: 'executive',
        domains: ['operations'],
        supportedRoles: ['super_admin'],
        visibility: 'internal',
        maturity: 'active',
        description: 'Coordinates meetings, takes structured notes, triages operational issues, and tracks weekly open loops.',
    },
    uncle_elroy: {
        id: 'uncle_elroy',
        displayName: 'Uncle Elroy',
        title: 'Adversarial Data Auditor',
        kind: 'executive',
        domains: ['analytics'],
        supportedRoles: ['super_admin'],
        visibility: 'internal',
        maturity: 'active',
        description: 'Challenges every financial claim with raw data verification. Runs the deliberative pipeline to ensure inventory valuations, COGS, and revenue numbers are grounded in truth.',
    },
    openclaw: {
        id: 'openclaw',
        displayName: 'OpenClaw',
        title: 'WhatsApp & Task Automation',
        kind: 'executive',
        domains: ['operations'],
        supportedRoles: ['super_admin'],
        visibility: 'internal',
        maturity: 'active',
        description: 'Executes WhatsApp messaging, task management, memory, and web-form automation workflows.',
    },
} as const satisfies Record<string, AgentContractEntry>;

export type AgentContractId = keyof typeof AGENT_CONTRACT;

type AgentIdByKind<TKind extends AgentKind> = {
    [TId in AgentContractId]: typeof AGENT_CONTRACT[TId]['kind'] extends TKind ? TId : never;
}[AgentContractId];

type AgentIdByVisibility<TVisibility extends AgentVisibility> = {
    [TId in AgentContractId]: typeof AGENT_CONTRACT[TId]['visibility'] extends TVisibility ? TId : never;
}[AgentContractId];

export type FieldAgentId = AgentIdByKind<'field'>;
export type ExecutiveAgentId = AgentIdByKind<'executive'>;
export type SystemAgentId = AgentIdByKind<'system'>;
export type VisibleAgentId = AgentIdByVisibility<'squad'>;

const AGENT_IDS = Object.keys(AGENT_CONTRACT) as AgentContractId[];

function hasKind<TKind extends AgentKind>(kind: TKind) {
    return (agentId: AgentContractId): agentId is AgentIdByKind<TKind> =>
        AGENT_CONTRACT[agentId].kind === kind;
}

function hasVisibility<TVisibility extends AgentVisibility>(visibility: TVisibility) {
    return (agentId: AgentContractId): agentId is AgentIdByVisibility<TVisibility> =>
        AGENT_CONTRACT[agentId].visibility === visibility;
}

export const FIELD_AGENT_IDS = AGENT_IDS.filter(hasKind('field'));
export const EXECUTIVE_AGENT_IDS = AGENT_IDS.filter(hasKind('executive'));
export const SYSTEM_AGENT_IDS = AGENT_IDS.filter(hasKind('system'));
export const VISIBLE_AGENT_IDS = AGENT_IDS.filter(hasVisibility('squad'));
