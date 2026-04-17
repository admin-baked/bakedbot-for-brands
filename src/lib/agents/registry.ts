/**
 * Canonical Agent Registry
 *
 * Core identity and capability metadata comes from `src/config/agent-contract.ts`.
 * This file owns UI-specific registry fields derived from that contract.
 */

import type { LucideIcon } from 'lucide-react';
import {
    Bot,
    BookOpen,
    Briefcase,
    Calendar,
    Crown,
    DollarSign,
    Heart,
    LineChart,
    MessageCircle,
    Radar,
    Rocket,
    Search,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    Wrench,
    Zap,
} from 'lucide-react';
import {
    AGENT_CONTRACT,
    EXECUTIVE_AGENT_IDS as CANONICAL_EXECUTIVE_AGENT_IDS,
    FIELD_AGENT_IDS,
    VISIBLE_AGENT_IDS,
    type AgentContractId,
    type AgentDomain as ContractAgentDomain,
    type AgentSupportedRole,
    type ExecutiveAgentId as CanonicalExecutiveAgentId,
    type FieldAgentId,
    type SystemAgentId,
} from '@/config/agent-contract';

export type AgentId = FieldAgentId | SystemAgentId;
export type ExecutiveAgentId = CanonicalExecutiveAgentId;
export type AnyAgentId = AgentContractId;
export type AgentDomain = ContractAgentDomain;

export type AgentStatus = 'online' | 'thinking' | 'working' | 'offline';

export interface AgentVisual {
    /** Emoji avatar for compact displays */
    emoji: string;
    /** Tailwind color class (e.g. 'emerald-500') - used as base for bg-*, text-*, border-* */
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
    supportedRoles: AgentSupportedRole[];
    /** Dashboard link */
    href: string;
    /** Category tag for grid display */
    tag: string;
    /** Label for the primary metric (e.g., "Chats last 24h") */
    primaryMetricLabel: string;
    /** Static placeholder value - TODO: fetch from real data source */
    primaryMetricValue: string;
}

interface AgentUiDefinition {
    image: string;
    visual: AgentVisual;
    icon: LucideIcon;
    defaultStatus: AgentStatus;
    href: string;
    tag: string;
    primaryMetricLabel: string;
    primaryMetricValue: string;
}

const AGENT_UI_DEFINITIONS: Record<AnyAgentId, AgentUiDefinition> = {
    smokey: {
        image: 'https://i.pravatar.cc/150?u=Smokey',
        visual: { emoji: '🌿', color: 'emerald-500' },
        icon: Bot,
        defaultStatus: 'online',
        href: '/dashboard/agents/smokey',
        tag: 'Customer-facing',
        primaryMetricLabel: 'Chats last 24h',
        primaryMetricValue: '128',
    },
    craig: {
        image: 'https://i.pravatar.cc/150?u=Craig',
        visual: { emoji: '📣', color: 'blue-500' },
        icon: MessageCircle,
        defaultStatus: 'online',
        href: '/dashboard/agents/craig',
        tag: 'Lifecycle',
        primaryMetricLabel: 'Campaigns running',
        primaryMetricValue: '3',
    },
    pops: {
        image: 'https://i.pravatar.cc/150?u=Pops',
        visual: { emoji: '📊', color: 'orange-500' },
        icon: LineChart,
        defaultStatus: 'online',
        href: '/dashboard/agents/pops',
        tag: 'Analytics',
        primaryMetricLabel: 'Forecast horizon',
        primaryMetricValue: '90 days',
    },
    ezal: {
        image: 'https://i.pravatar.cc/150?u=Ezal',
        visual: { emoji: '🔍', color: 'purple-500' },
        icon: Radar,
        defaultStatus: 'online',
        href: '/dashboard/agents/ezal',
        tag: 'Monitoring',
        primaryMetricLabel: 'Competitors tracked',
        primaryMetricValue: '7',
    },
    money_mike: {
        image: 'https://i.pravatar.cc/150?u=MoneyMike',
        visual: { emoji: '💰', color: 'amber-500' },
        icon: DollarSign,
        defaultStatus: 'online',
        href: '/dashboard/agents/money_mike',
        tag: 'Pricing',
        primaryMetricLabel: 'Margins watched',
        primaryMetricValue: '12 SKUs',
    },
    mrs_parker: {
        image: 'https://i.pravatar.cc/150?u=MrsParker',
        visual: { emoji: '💖', color: 'pink-500' },
        icon: Heart,
        defaultStatus: 'online',
        href: '/dashboard/agents/mrs_parker',
        tag: 'Customer',
        primaryMetricLabel: 'Retention rate',
        primaryMetricValue: '—',
    },
    deebo: {
        image: 'https://i.pravatar.cc/150?u=Deebo',
        visual: { emoji: '🛡️', color: 'red-500' },
        icon: ShieldCheck,
        defaultStatus: 'working',
        href: '/dashboard/agents/deebo',
        tag: 'Compliance',
        primaryMetricLabel: 'Checks last 24h',
        primaryMetricValue: '412',
    },
    day_day: {
        image: 'https://i.pravatar.cc/150?u=DayDay',
        visual: { emoji: '📦', color: 'cyan-500' },
        icon: TrendingUp,
        defaultStatus: 'online',
        href: '/dashboard/agents/day_day',
        tag: 'Growth',
        primaryMetricLabel: 'Pages Optimized',
        primaryMetricValue: '85',
    },
    puff: {
        image: 'https://i.pravatar.cc/150?u=Puff',
        visual: { emoji: '🤖', color: 'slate-500' },
        icon: Bot,
        defaultStatus: 'online',
        href: '/dashboard/agents/puff',
        tag: 'System',
        primaryMetricLabel: 'Status',
        primaryMetricValue: '—',
    },
    general: {
        image: 'https://i.pravatar.cc/150?u=General',
        visual: { emoji: '💬', color: 'gray-400' },
        icon: Search,
        defaultStatus: 'online',
        href: '/dashboard/agents',
        tag: 'System',
        primaryMetricLabel: 'Status',
        primaryMetricValue: '—',
    },
    leo: {
        image: 'https://i.pravatar.cc/150?u=Leo',
        visual: { emoji: '⚙️', color: 'slate-500' },
        icon: Briefcase,
        defaultStatus: 'online',
        href: '/dashboard/ceo?tab=boardroom&agent=leo',
        tag: 'Executive',
        primaryMetricLabel: 'Tasks delegated',
        primaryMetricValue: '—',
    },
    jack: {
        image: 'https://i.pravatar.cc/150?u=Jack',
        visual: { emoji: '📈', color: 'violet-500' },
        icon: Rocket,
        defaultStatus: 'online',
        href: '/dashboard/ceo?tab=boardroom&agent=jack',
        tag: 'Executive',
        primaryMetricLabel: 'Pipeline value',
        primaryMetricValue: '—',
    },
    linus: {
        image: 'https://i.pravatar.cc/150?u=Linus',
        visual: { emoji: '🖥️', color: 'sky-500' },
        icon: Wrench,
        defaultStatus: 'online',
        href: '/dashboard/ceo?tab=boardroom&agent=linus',
        tag: 'Executive',
        primaryMetricLabel: 'Build status',
        primaryMetricValue: '—',
    },
    glenda: {
        image: 'https://i.pravatar.cc/150?u=Glenda',
        visual: { emoji: '✨', color: 'rose-500' },
        icon: Sparkles,
        defaultStatus: 'online',
        href: '/dashboard/ceo?tab=boardroom&agent=glenda',
        tag: 'Executive',
        primaryMetricLabel: 'Traffic growth',
        primaryMetricValue: '—',
    },
    mike_exec: {
        image: 'https://i.pravatar.cc/150?u=MikeExec',
        visual: { emoji: '💵', color: 'lime-500' },
        icon: DollarSign,
        defaultStatus: 'online',
        href: '/dashboard/ceo?tab=boardroom&agent=mike-exec',
        tag: 'Executive',
        primaryMetricLabel: 'Burn rate',
        primaryMetricValue: '—',
    },
    roach: {
        image: 'https://i.pravatar.cc/150?u=Roach',
        visual: { emoji: '📚', color: 'teal-500' },
        icon: BookOpen,
        defaultStatus: 'online',
        href: '/dashboard/knowledge-base',
        tag: 'Research',
        primaryMetricLabel: 'Docs indexed',
        primaryMetricValue: '—',
    },
    marty: {
        image: 'https://i.pravatar.cc/150?u=Marty',
        visual: { emoji: '👑', color: 'yellow-500' },
        icon: Crown,
        defaultStatus: 'online',
        href: '/dashboard/ceo?tab=boardroom&agent=marty',
        tag: 'Executive',
        primaryMetricLabel: 'ARR progress',
        primaryMetricValue: '—',
    },
    felisha: {
        image: 'https://i.pravatar.cc/150?u=Felisha',
        visual: { emoji: '📋', color: 'indigo-400' },
        icon: Calendar,
        defaultStatus: 'online',
        href: '/dashboard/ceo?tab=boardroom&agent=felisha',
        tag: 'Executive',
        primaryMetricLabel: 'Open loops',
        primaryMetricValue: '—',
    },
    uncle_elroy: {
        image: 'https://i.pravatar.cc/150?u=UncleElroy',
        visual: { emoji: '🔎', color: 'orange-700' },
        icon: ShieldCheck,
        defaultStatus: 'online',
        href: '/dashboard/ceo?tab=boardroom&agent=uncle_elroy',
        tag: 'Executive',
        primaryMetricLabel: 'Audits run',
        primaryMetricValue: '—',
    },
    openclaw: {
        image: 'https://i.pravatar.cc/150?u=OpenClaw',
        visual: { emoji: '⚡', color: 'green-600' },
        icon: Zap,
        defaultStatus: 'online',
        href: '/dashboard/ceo?tab=boardroom&agent=openclaw',
        tag: 'Executive',
        primaryMetricLabel: 'Tasks automated',
        primaryMetricValue: '—',
    },
};

function buildAgentDefinition(id: AnyAgentId): AgentDefinition {
    const contract = AGENT_CONTRACT[id];
    const uiDefinition = AGENT_UI_DEFINITIONS[id];

    return {
        id,
        name: contract.displayName,
        title: contract.title,
        domains: [...contract.domains],
        description: contract.description,
        image: uiDefinition.image,
        visual: uiDefinition.visual,
        icon: uiDefinition.icon,
        defaultStatus: uiDefinition.defaultStatus,
        visibleInSquad: contract.visibility === 'squad',
        supportedRoles: [...contract.supportedRoles],
        href: uiDefinition.href,
        tag: uiDefinition.tag,
        primaryMetricLabel: uiDefinition.primaryMetricLabel,
        primaryMetricValue: uiDefinition.primaryMetricValue,
    };
}

const ALL_AGENT_IDS = Object.keys(AGENT_CONTRACT) as AnyAgentId[];

export const AGENT_REGISTRY: Record<AnyAgentId, AgentDefinition> = Object.fromEntries(
    ALL_AGENT_IDS.map(agentId => [agentId, buildAgentDefinition(agentId)])
) as Record<AnyAgentId, AgentDefinition>;

/** Field agent IDs (business-facing, excludes puff + executives) */
export const BUSINESS_AGENT_IDS: FieldAgentId[] = [...FIELD_AGENT_IDS];

/** Executive agent IDs */
export const EXECUTIVE_AGENT_IDS: ExecutiveAgentId[] = [...CANONICAL_EXECUTIVE_AGENT_IDS];

/** Agents that should appear in the dashboard squad panel */
export const VISIBLE_AGENT_SQUAD = VISIBLE_AGENT_IDS.map(id => AGENT_REGISTRY[id]);

/** Field agents as array (replaces legacy config/agents.ts `agents` export) */
export const agents: AgentDefinition[] = BUSINESS_AGENT_IDS.map(id => AGENT_REGISTRY[id]);

/** Executive agents as array (replaces legacy config/agents.ts `executiveAgents` export) */
export const executiveAgents: AgentDefinition[] = EXECUTIVE_AGENT_IDS.map(id => AGENT_REGISTRY[id]);

/** All agents combined */
export const allAgents: AgentDefinition[] = [...agents, ...executiveAgents];

export function getAgentById(id: AnyAgentId): AgentDefinition {
    return AGENT_REGISTRY[id];
}

export function getAgentsForRole(role: AgentSupportedRole): AgentDefinition[] {
    return VISIBLE_AGENT_SQUAD.filter(agent => agent.supportedRoles.includes(role));
}
