/**
 * Insight Cards Types
 *
 * Type definitions for role-based insight cards in the inbox.
 * Each card is agent-branded and displays actionable data.
 */

import type { InboxThreadType, InboxAgentPersona } from './inbox';

// ============ Severity & Status ============

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'success';
export type InsightTrend = 'up' | 'down' | 'stable';

// ============ Agent Categories ============

/** Dispensary agent categories (mapped to personas) */
export type DispensaryInsightCategory =
    | 'velocity'      // Money Mike - inventory velocity, top sellers, expiring
    | 'efficiency'    // Pops - basket size, order flow, peak hours
    | 'customer'      // Smokey & Mrs. Parker - new vs returning, loyalty
    | 'compliance'    // Deebo - Metrc sync, compliance flags
    | 'market';       // Ezal - competitor pricing, promos

/** Brand agent categories */
export type BrandInsightCategory =
    | 'performance'   // Pops - product performance across retailers
    | 'campaign'      // Craig - campaign ROI, engagement
    | 'distribution'  // Leo - retail partner coverage
    | 'content'       // Craig - content performance
    | 'competitive';  // Ezal - competitive positioning

/** Super User agent categories (Platform Operations) */
export type SuperUserInsightCategory =
    | 'platform'      // Leo - System health, uptime, errors
    | 'growth'        // Jack - New signups, MRR, churn
    | 'deployment'    // Linus - Build status, deployment health
    | 'support'       // Mrs. Parker - Open tickets, response times
    | 'intelligence'; // Big Worm - Research queue, insights

export type InsightCategory = DispensaryInsightCategory | BrandInsightCategory | SuperUserInsightCategory;

// ============ Core Insight Interface ============

export interface InsightCard {
    id: string;
    category: InsightCategory;
    agentId: string;
    agentName: string;

    // Display
    title: string;
    headline: string;         // Primary metric or statement
    subtext?: string;         // Supporting detail

    // Metrics
    value?: number | string;
    unit?: string;
    trend?: InsightTrend;
    trendValue?: string;      // e.g., "+12%"

    // Status
    severity: InsightSeverity;
    actionable: boolean;

    // Action
    ctaLabel?: string;        // "View Details", "Fix Now"
    threadType?: InboxThreadType;
    threadPrompt?: string;    // Initial prompt for thread

    // Meta
    lastUpdated: Date;
    dataSource: string;       // For debugging/transparency
}

// ============ Aggregated Response ============

export interface DispensaryInsights {
    velocity: InsightCard[];      // Money Mike
    efficiency: InsightCard[];    // Pops
    customer: InsightCard[];      // Smokey + Mrs. Parker
    compliance: InsightCard[];    // Deebo
    market: InsightCard[];        // Ezal
    lastFetched: Date;
}

export interface BrandInsights {
    performance: InsightCard[];   // Pops
    campaign: InsightCard[];      // Craig
    distribution: InsightCard[];  // Leo
    content: InsightCard[];       // Craig
    competitive: InsightCard[];   // Ezal
    lastFetched: Date;
}

export interface SuperUserInsights {
    platform: InsightCard[];      // Leo - System health
    growth: InsightCard[];        // Jack - User growth, MRR
    deployment: InsightCard[];    // Linus - Build/deploy status
    support: InsightCard[];       // Mrs. Parker - Support queue
    intelligence: InsightCard[];  // Big Worm - Research insights
    lastFetched: Date;
}

export type InsightsResponse =
    | { role: 'dispensary'; data: DispensaryInsights }
    | { role: 'brand'; data: BrandInsights }
    | { role: 'super_user'; data: SuperUserInsights };

// ============ Agent Color Mapping ============

export interface AgentColorScheme {
    bg: string;
    text: string;
    border: string;
}

export const AGENT_COLORS: Record<string, AgentColorScheme> = {
    'smokey': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    'craig': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    'pops': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'deebo': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    'money_mike': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'ezal': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'mrs_parker': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    'leo': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    'jack': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    'linus': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    'glenda': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    'mike': { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' },
    'day_day': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    'big_worm': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    'roach': { bg: 'bg-stone-50', text: 'text-stone-700', border: 'border-stone-200' },
    // Fallback
    'auto': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

// ============ Severity Colors ============

export const SEVERITY_COLORS: Record<InsightSeverity, AgentColorScheme> = {
    critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
    info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

// ============ Helper Functions ============

/**
 * Get color scheme for an agent, with fallback
 */
export function getAgentColors(agentId: string): AgentColorScheme {
    return AGENT_COLORS[agentId] || AGENT_COLORS['auto'];
}

/**
 * Get color scheme for a severity level
 */
export function getSeverityColors(severity: InsightSeverity): AgentColorScheme {
    return SEVERITY_COLORS[severity];
}

/**
 * Convert agent persona to display name
 */
export function getAgentDisplayName(agentId: string): string {
    const names: Record<string, string> = {
        'smokey': 'Smokey',
        'craig': 'Craig',
        'pops': 'Pops',
        'deebo': 'Deebo',
        'money_mike': 'Money Mike',
        'ezal': 'Ezal',
        'mrs_parker': 'Mrs. Parker',
        'leo': 'Leo',
        'jack': 'Jack',
        'linus': 'Linus',
        'glenda': 'Glenda',
        'mike': 'Mike',
        'day_day': 'Day-Day',
        'big_worm': 'Big Worm',
        'roach': 'Roach',
    };
    return names[agentId] || agentId;
}
