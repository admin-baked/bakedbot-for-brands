
import { LucideIcon, Bot, MessageCircle, LineChart, ShieldCheck, DollarSign, Radar } from 'lucide-react';

export type AgentId = 'smokey' | 'craig' | 'pops' | 'deebo' | 'money-mike' | 'ezal';

export type AgentStatus = 'online' | 'training' | 'paused';

export interface AgentDefinition {
  id: AgentId;
  name: string;
  title: string;
  description: string;
  status: AgentStatus;
  primaryMetricLabel: string;
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
    description: 'Pre-flight checks every campaign, menu, and chat response for multi-state compliance.',
    status: 'online',
    primaryMetricLabel: 'Checks last 24h',
    primaryMetricValue: '412',
    href: '/dashboard/agents/deebo',
    icon: ShieldCheck,
    tag: 'Compliance'
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
    description: 'Watches menus, promos, and SEO footprints so you’re never surprised by a rival’s move.',
    status: 'training',
    primaryMetricLabel: 'Competitors tracked',
    primaryMetricValue: '7',
    href: '/dashboard/agents/ezal',
    icon: Radar,
    tag: 'Monitoring'
  }
];
