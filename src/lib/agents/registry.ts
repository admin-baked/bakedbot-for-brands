/**
 * Canonical Agent Registry
 *
 * Single source of truth for all BakedBot agents.
 * All hooks, configs, and UI layers should derive from this file.
 */

import type { LucideIcon } from 'lucide-react';
import {
    Bot, MessageCircle, LineChart, ShieldCheck, DollarSign,
    Radar, TrendingUp, Video, Briefcase, Rocket, Wrench,
    Sparkles, Heart, BookOpen,
} from 'lucide-react';

export type AgentId =
    | 'smokey'
    | 'craig'
    | 'pops'
    | 'ezal'
    | 'money_mike'
    | 'mrs_parker'
    | 'deebo'
    | 'day_day'
    | 'puff';

/** Executive agent IDs — super_admin only */
export type ExecutiveAgentId = 'leo' | 'jack' | 'linus' | 'glenda' | 'mike_exec' | 'roach';

/** All known agent IDs (field + executive) */
export type AnyAgentId = AgentId | ExecutiveAgentId;

export type AgentDomain =
    | 'commerce'
    | 'marketing'
    | 'analytics'
    | 'competitive_intel'
    | 'pricing'
    | 'loyalty'
    | 'compliance'
    | 'growth'
    | 'operations'
    | 'revenue'
    | 'technology'
    | 'research'
    | 'system';

export type AgentStatus = 'online' | 'thinking' | 'working' | 'offline';

export interface AgentVisual {
    /** Emoji avatar for compact displays */
    emoji: string;
    /** Tailwind color class (e.g. 'emerald-500') — used as base for bg-*, text-*, border-* */
    color: string;
}

export interface AgentDefinition {
    id: AnyAgentId;
    name: string;
    title: string;
    domains: AgentDomain[];
    description: string;
    /** Avatar URL used in dashboard UI */
    image: string;
    /** Consistent visual identity (emoji + color) across all UI surfaces */
    visual: AgentVisual;
    /** Lucide icon component for grid/detail pages */
    icon: LucideIcon;
    defaultStatus: AgentStatus;
    /** Whether this agent appears in the visible squad panel */
    visibleInSquad: boolean;
    /** Which user roles can interact with this agent */
    supportedRoles: Array<'brand' | 'dispensary' | 'owner' | 'admin' | 'super_admin' | 'customer' | 'editor' | 'concierge'>;
    /** Dashboard link */
    href: string;
    /** Category tag for grid display */
    tag: string;
    /** Label for the primary metric (e.g., "Chats last 24h") */
    primaryMetricLabel: string;
    /** Static placeholder value — TODO: fetch from real data source */
    primaryMetricValue: string;
}

export const AGENT_REGISTRY: Record<AnyAgentId, AgentDefinition> = {
    // ── Field agents (customer-facing) ──────────────────────────
    smokey: {
        id: 'smokey',
        name: 'Smokey',
        title: 'AI Budtender & Headless Menu',
        domains: ['commerce'],
        description: 'Answers product questions, drives SEO traffic, and routes baskets to your retail partners.',
        image: 'https://i.pravatar.cc/150?u=Smokey',
        visual: { emoji: '🌿', color: 'emerald-500' },
        icon: Bot,
        defaultStatus: 'online',
        visibleInSquad: true,
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin', 'customer', 'concierge'],
        href: '/dashboard/agents/smokey',
        tag: 'Customer-facing',
        primaryMetricLabel: 'Chats last 24h',
        primaryMetricValue: '128',
    },
    craig: {
        id: 'craig',
        name: 'Craig',
        title: 'Email & SMS Hustler',
        domains: ['marketing'],
        description: 'Runs lifecycle campaigns, sends drops, and keeps your list warm without sounding spammy.',
        image: 'https://i.pravatar.cc/150?u=Craig',
        visual: { emoji: '📣', color: 'blue-500' },
        icon: MessageCircle,
        defaultStatus: 'online',
        visibleInSquad: true,
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin', 'editor'],
        href: '/dashboard/agents/craig',
        tag: 'Lifecycle',
        primaryMetricLabel: 'Campaigns running',
        primaryMetricValue: '3',
    },
    pops: {
        id: 'pops',
        name: 'Pops',
        title: 'Analytics & Forecasting',
        domains: ['analytics'],
        description: 'Turns messy sales data into cohort reports, lift tests, and "are we winning?" dashboards.',
        image: 'https://i.pravatar.cc/150?u=Pops',
        visual: { emoji: '📊', color: 'orange-500' },
        icon: LineChart,
        defaultStatus: 'online',
        visibleInSquad: true,
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin', 'super_admin'],
        href: '/dashboard/agents/pops',
        tag: 'Analytics',
        primaryMetricLabel: 'Forecast horizon',
        primaryMetricValue: '90 days',
    },
    ezal: {
        id: 'ezal',
        name: 'Ezal',
        title: 'Competitive Monitoring',
        domains: ['competitive_intel'],
        description: "Watches menus, promos, and SEO footprints so you're never surprised by a rival's move.",
        image: 'https://i.pravatar.cc/150?u=Ezal',
        visual: { emoji: '🔍', color: 'purple-500' },
        icon: Radar,
        defaultStatus: 'online',
        visibleInSquad: true,
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin'],
        href: '/dashboard/agents/ezal',
        tag: 'Monitoring',
        primaryMetricLabel: 'Competitors tracked',
        primaryMetricValue: '7',
    },
    money_mike: {
        id: 'money_mike',
        name: 'Money Mike',
        title: 'Pricing & Margin Brain',
        domains: ['pricing'],
        description: "Monitors competitors and suggests price moves that won't accidentally nuke your margins.",
        image: 'https://i.pravatar.cc/150?u=MoneyMike',
        visual: { emoji: '💰', color: 'amber-500' },
        icon: DollarSign,
        defaultStatus: 'online',
        visibleInSquad: true,
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin'],
        href: '/dashboard/agents/money_mike',
        tag: 'Pricing',
        primaryMetricLabel: 'Margins watched',
        primaryMetricValue: '12 SKUs',
    },
    mrs_parker: {
        id: 'mrs_parker',
        name: 'Mrs. Parker',
        title: 'Customer Success',
        domains: ['loyalty'],
        description: 'Manages customer journeys, predicts churn, and orchestrates loyalty programs.',
        image: 'https://i.pravatar.cc/150?u=MrsParker',
        visual: { emoji: '💜', color: 'pink-500' },
        icon: Heart,
        defaultStatus: 'online',
        visibleInSquad: true,
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin'],
        href: '/dashboard/agents/mrs_parker',
        tag: 'Customer',
        primaryMetricLabel: 'Retention rate',
        primaryMetricValue: '—',
    },
    deebo: {
        id: 'deebo',
        name: 'Deebo',
        title: 'Regulation OS',
        domains: ['compliance'],
        description: 'Pre-flight checks, compliance audits, and state rule enforcement.',
        image: 'https://i.pravatar.cc/150?u=Deebo',
        visual: { emoji: '🛡️', color: 'red-500' },
        icon: ShieldCheck,
        defaultStatus: 'working',
        visibleInSquad: true,
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin', 'editor', 'super_admin'],
        href: '/dashboard/agents/deebo',
        tag: 'Compliance',
        primaryMetricLabel: 'Checks last 24h',
        primaryMetricValue: '412',
    },
    day_day: {
        id: 'day_day',
        name: 'Day Day',
        title: 'SEO & Growth Manager',
        domains: ['growth'],
        description: 'Audits pages, builds backlinks, and ensures you dominate local search results.',
        image: 'https://i.pravatar.cc/150?u=DayDay',
        visual: { emoji: '📦', color: 'cyan-500' },
        icon: TrendingUp,
        defaultStatus: 'online',
        visibleInSquad: true,
        supportedRoles: ['brand', 'dispensary', 'owner', 'admin'],
        href: '/dashboard/agents/day_day',
        tag: 'Growth',
        primaryMetricLabel: 'Pages Optimized',
        primaryMetricValue: '85',
    },
    puff: {
        id: 'puff',
        name: 'Puff',
        title: 'System Agent',
        domains: ['system'],
        description: 'Platform-wide meta agent for super admin and system orchestration.',
        image: 'https://i.pravatar.cc/150?u=Puff',
        visual: { emoji: '🤖', color: 'slate-500' },
        icon: Bot,
        defaultStatus: 'online',
        visibleInSquad: false,
        supportedRoles: ['super_admin'],
        href: '/dashboard/agents/puff',
        tag: 'System',
        primaryMetricLabel: 'Status',
        primaryMetricValue: '—',
    },

    // ── Executive agents (super_admin only) ─────────────────────
    leo: {
        id: 'leo',
        name: 'Leo',
        title: 'COO - Operations Chief',
        domains: ['operations'],
        description: 'Orchestrates multi-agent workflows, coordinates executive team, and manages operational priorities.',
        image: 'https://i.pravatar.cc/150?u=Leo',
        visual: { emoji: '⚙️', color: 'slate-500' },
        icon: Briefcase,
        defaultStatus: 'online',
        visibleInSquad: false,
        supportedRoles: ['super_admin'],
        href: '/dashboard/ceo?tab=boardroom&agent=leo',
        tag: 'Executive',
        primaryMetricLabel: 'Tasks delegated',
        primaryMetricValue: '—',
    },
    jack: {
        id: 'jack',
        name: 'Jack',
        title: 'CRO - Revenue Chief',
        domains: ['revenue'],
        description: 'Drives MRR growth, manages sales pipeline, and closes high-value deals.',
        image: 'https://i.pravatar.cc/150?u=Jack',
        visual: { emoji: '📈', color: 'violet-500' },
        icon: Rocket,
        defaultStatus: 'online',
        visibleInSquad: false,
        supportedRoles: ['super_admin'],
        href: '/dashboard/ceo?tab=boardroom&agent=jack',
        tag: 'Executive',
        primaryMetricLabel: 'Pipeline value',
        primaryMetricValue: '—',
    },
    linus: {
        id: 'linus',
        name: 'Linus',
        title: 'CTO - Technical Chief',
        domains: ['technology'],
        description: 'AI CTO with Claude API access. Evaluates code, manages deployments, and maintains infrastructure.',
        image: 'https://i.pravatar.cc/150?u=Linus',
        visual: { emoji: '🖥️', color: 'sky-500' },
        icon: Wrench,
        defaultStatus: 'online',
        visibleInSquad: false,
        supportedRoles: ['super_admin'],
        href: '/dashboard/ceo?tab=boardroom&agent=linus',
        tag: 'Executive',
        primaryMetricLabel: 'Build status',
        primaryMetricValue: '—',
    },
    glenda: {
        id: 'glenda',
        name: 'Glenda',
        title: 'CMO - Marketing Chief',
        domains: ['marketing'],
        description: 'Leads brand awareness, organic traffic growth, and national marketing campaigns.',
        image: 'https://i.pravatar.cc/150?u=Glenda',
        visual: { emoji: '✨', color: 'rose-500' },
        icon: Sparkles,
        defaultStatus: 'online',
        visibleInSquad: false,
        supportedRoles: ['super_admin'],
        href: '/dashboard/ceo?tab=boardroom&agent=glenda',
        tag: 'Executive',
        primaryMetricLabel: 'Traffic growth',
        primaryMetricValue: '—',
    },
    mike_exec: {
        id: 'mike_exec',
        name: 'Mike',
        title: 'CFO - Finance Chief',
        domains: ['pricing'],
        description: 'Corporate CFO handling financial strategy, audits, treasury, and investor relations.',
        image: 'https://i.pravatar.cc/150?u=MikeExec',
        visual: { emoji: '💵', color: 'lime-500' },
        icon: DollarSign,
        defaultStatus: 'online',
        visibleInSquad: false,
        supportedRoles: ['super_admin'],
        href: '/dashboard/ceo?tab=boardroom&agent=mike-exec',
        tag: 'Executive',
        primaryMetricLabel: 'Burn rate',
        primaryMetricValue: '—',
    },
    roach: {
        id: 'roach',
        name: 'Roach',
        title: 'Research Librarian',
        domains: ['research'],
        description: 'Maintains Knowledge Base, conducts academic research, and assists with deep dives.',
        image: 'https://i.pravatar.cc/150?u=Roach',
        visual: { emoji: '📚', color: 'teal-500' },
        icon: BookOpen,
        defaultStatus: 'online',
        visibleInSquad: false,
        supportedRoles: ['super_admin'],
        href: '/dashboard/knowledge-base',
        tag: 'Research',
        primaryMetricLabel: 'Docs indexed',
        primaryMetricValue: '—',
    },
};

/** Field agent IDs (business-facing, excludes puff + executives) */
export const BUSINESS_AGENT_IDS: AgentId[] = [
    'smokey',
    'craig',
    'pops',
    'ezal',
    'money_mike',
    'mrs_parker',
    'deebo',
    'day_day',
];

/** Executive agent IDs */
export const EXECUTIVE_AGENT_IDS: ExecutiveAgentId[] = [
    'leo', 'jack', 'linus', 'glenda', 'mike_exec', 'roach',
];

/** Agents that should appear in the dashboard squad panel */
export const VISIBLE_AGENT_SQUAD = BUSINESS_AGENT_IDS.map(id => AGENT_REGISTRY[id]);

/** Field agents as array (replaces legacy config/agents.ts `agents` export) */
export const agents: AgentDefinition[] = BUSINESS_AGENT_IDS.map(id => AGENT_REGISTRY[id]);

/** Executive agents as array (replaces legacy config/agents.ts `executiveAgents` export) */
export const executiveAgents: AgentDefinition[] = EXECUTIVE_AGENT_IDS.map(id => AGENT_REGISTRY[id]);

/** All agents combined */
export const allAgents: AgentDefinition[] = [...agents, ...executiveAgents];

export function getAgentById(id: AnyAgentId): AgentDefinition {
    return AGENT_REGISTRY[id];
}

export function getAgentsForRole(
    role: AgentDefinition['supportedRoles'][number]
): AgentDefinition[] {
    return VISIBLE_AGENT_SQUAD.filter(a => a.supportedRoles.includes(role));
}
