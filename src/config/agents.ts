/**
 * Agent Configuration
 *
 * IMPORTANT: primaryMetricValue fields are STATIC PLACEHOLDERS.
 * These values are NOT fetched from real-time data sources.
 *
 * TODO (QA Issue #2): Implement real metric fetching via:
 * - Firestore queries for actual chat counts, campaign runs, etc.
 * - Use src/server/actions/agents.ts to fetch and merge live metrics
 * - Consider caching with Redis/Firestore for performance
 */

import { LucideIcon, Bot, MessageCircle, LineChart, ShieldCheck, DollarSign, Radar, TrendingUp, Video, Briefcase, Rocket, Wrench, Sparkles, Heart, BookOpen } from 'lucide-react';

export type AgentId = 'smokey' | 'craig' | 'pops' | 'deebo' | 'money-mike' | 'ezal' | 'day-day' | 'felisha' | 'leo' | 'jack' | 'linus' | 'glenda' | 'mike-exec' | 'mrs-parker' | 'roach';

export type AgentStatus = 'online' | 'training' | 'paused';

export interface AgentDefinition {
  id: AgentId;
  name: string;
  title: string;
  description: string;
  status: AgentStatus;
  /** Label for the primary metric (e.g., "Chats last 24h") */
  primaryMetricLabel: string;
  /** STATIC placeholder value - TODO: fetch from real data source */
  primaryMetricValue: string;
  href: string;
  icon: LucideIcon;
  tag?: string;
}

export const agents: AgentDefinition[] = [
  {
    id: 'smokey',
    name: 'Smokey',
    title: 'AI Budtender & Headless Menu',
    description: 'Answers product questions, drives SEO traffic, and routes baskets to your retail partners.',
    status: 'online',
    primaryMetricLabel: 'Chats last 24h',
    primaryMetricValue: '128',
    href: '/dashboard/agents/smokey',
    icon: Bot,
    tag: 'Customer-facing'
  },
  {
    id: 'craig',
    name: 'Craig',
    title: 'Email & SMS Hustler',
    description: 'Runs lifecycle campaigns, sends drops, and keeps your list warm without sounding spammy.',
    status: 'online',
    primaryMetricLabel: 'Campaigns running',
    primaryMetricValue: '3',
    href: '/dashboard/agents/craig',
    icon: MessageCircle,
    tag: 'Lifecycle'
  },
  {
    id: 'pops',
    name: 'Pops',
    title: 'Analytics & Forecasting',
    description: 'Turns messy sales data into cohort reports, lift tests, and “are we winning?” dashboards.',
    status: 'training',
    primaryMetricLabel: 'Forecast horizon',
    primaryMetricValue: '90 days',
    href: '/dashboard/agents/pops',
    icon: LineChart,
    tag: 'Analytics'
  },
  {
    id: 'deebo',
    name: 'Deebo',
    title: 'Regulation OS',
    description: 'Pre-flight checks, compliance audits, and state rule enforcement.',
    status: 'online',
    primaryMetricLabel: 'Checks last 24h',
    primaryMetricValue: '412',
    href: '/dashboard/agents/deebo',
    icon: ShieldCheck,
    tag: 'Compliance'
  },
  {
    id: 'day-day',
    name: 'Day Day',
    title: 'SEO & Growth Manager',
    description: 'Audits pages, builds backlinks, and ensures you dominate local search results.',
    status: 'training',
    primaryMetricLabel: 'Pages Optimized',
    primaryMetricValue: '85',
    href: '/dashboard/agents/day-day',
    icon: TrendingUp,
    tag: 'Growth'
  },
  {
    id: 'felisha',
    name: 'Felisha',
    title: 'Meeting Coordinator',
    description: 'Joins calls, takes notes, and handles error triage across the agent swarm.',
    status: 'training',
    primaryMetricLabel: 'Meetings Joined',
    primaryMetricValue: '0',
    href: '/dashboard/agents/felisha',
    icon: Video,
    tag: 'Operations'
  },
  {
    id: 'money-mike',
    name: 'Money Mike',
    title: 'Pricing & Margin Brain',
    description: 'Monitors competitors and suggests price moves that won’t accidentally nuke your margins.',
    status: 'paused',
    primaryMetricLabel: 'Margins watched',
    primaryMetricValue: '12 SKUs',
    href: '/dashboard/agents/money-mike',
    icon: DollarSign,
    tag: 'Pricing'
  },
  {
    id: 'ezal',
    name: 'Ezal',
    title: 'Competitive Monitoring',
    description: "Watches menus, promos, and SEO footprints so you're never surprised by a rival's move.",
    status: 'training',
    primaryMetricLabel: 'Competitors tracked',
    primaryMetricValue: '7',
    href: '/dashboard/agents/ezal',
    icon: Radar,
    tag: 'Monitoring'
  }
];

// Executive Board Agents (Super User only)
export const executiveAgents: AgentDefinition[] = [
  {
    id: 'leo',
    name: 'Leo',
    title: 'COO - Operations Chief',
    description: 'Orchestrates multi-agent workflows, coordinates executive team, and manages operational priorities.',
    status: 'online',
    primaryMetricLabel: 'Tasks delegated',
    primaryMetricValue: '—',
    href: '/dashboard/ceo?tab=boardroom&agent=leo',
    icon: Briefcase,
    tag: 'Executive'
  },
  {
    id: 'jack',
    name: 'Jack',
    title: 'CRO - Revenue Chief',
    description: 'Drives MRR growth, manages sales pipeline, and closes high-value deals.',
    status: 'online',
    primaryMetricLabel: 'Pipeline value',
    primaryMetricValue: '—',
    href: '/dashboard/ceo?tab=boardroom&agent=jack',
    icon: Rocket,
    tag: 'Executive'
  },
  {
    id: 'linus',
    name: 'Linus',
    title: 'CTO - Technical Chief',
    description: 'AI CTO with Claude API access. Evaluates code, manages deployments, and maintains infrastructure.',
    status: 'online',
    primaryMetricLabel: 'Build status',
    primaryMetricValue: '—',
    href: '/dashboard/ceo?tab=boardroom&agent=linus',
    icon: Wrench,
    tag: 'Executive'
  },
  {
    id: 'glenda',
    name: 'Glenda',
    title: 'CMO - Marketing Chief',
    description: 'Leads brand awareness, organic traffic growth, and national marketing campaigns.',
    status: 'online',
    primaryMetricLabel: 'Traffic growth',
    primaryMetricValue: '—',
    href: '/dashboard/ceo?tab=boardroom&agent=glenda',
    icon: Sparkles,
    tag: 'Executive'
  },
  {
    id: 'mike-exec',
    name: 'Mike',
    title: 'CFO - Finance Chief',
    description: 'Corporate CFO handling financial strategy, audits, treasury, and investor relations.',
    status: 'online',
    primaryMetricLabel: 'Burn rate',
    primaryMetricValue: '—',
    href: '/dashboard/ceo?tab=boardroom&agent=mike-exec',
    icon: DollarSign,
    tag: 'Executive'
  },
  {
    id: 'mrs-parker',
    name: 'Mrs. Parker',
    title: 'Customer Success',
    description: 'Manages customer journeys, predicts churn, and orchestrates loyalty programs.',
    status: 'training',
    primaryMetricLabel: 'Retention rate',
    primaryMetricValue: '—',
    href: '/dashboard/agents/mrs-parker',
    icon: Heart,
    tag: 'Customer'
  },
  {
    id: 'roach',
    name: 'Roach',
    title: 'Research Librarian',
    description: 'Maintains Knowledge Base, conducts academic research, and assists with deep dives.',
    status: 'training',
    primaryMetricLabel: 'Docs indexed',
    primaryMetricValue: '—',
    href: '/dashboard/knowledge-base',
    icon: BookOpen,
    tag: 'Research'
  }
];

// All agents combined
export const allAgents: AgentDefinition[] = [...agents, ...executiveAgents];
