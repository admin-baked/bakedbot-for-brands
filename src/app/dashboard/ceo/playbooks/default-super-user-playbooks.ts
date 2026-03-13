import type { PlaybookCategory, PlaybookStep, PlaybookTrigger } from '@/types/playbook';

export interface DefaultSuperUserPlaybookTemplate {
    id: string;
    name: string;
    description: string;
    category: PlaybookCategory;
    agent: string;
    agents: string[];
    triggers: PlaybookTrigger[];
    steps: PlaybookStep[];
    metadata?: Record<string, unknown>;
}

export const DEFAULT_SUPER_USER_PLAYBOOKS: DefaultSuperUserPlaybookTemplate[] = [
    {
        id: 'welcome-emails',
        name: 'Welcome Email Automation',
        description: 'Draft personalized onboarding emails for new BakedBot signups and route them for approval.',
        category: 'marketing',
        agent: 'jack',
        agents: ['Craig', 'Smokey'],
        triggers: [
            { type: 'schedule', cron: '*/30 * * * *', timezone: 'America/Chicago' },
        ],
        steps: [
            {
                action: 'query',
                agent: 'smokey',
                label: 'Find new signups',
                params: {
                    task: 'Find new BakedBot signups from the last 24 hours and summarize their company context, role, and signup source.',
                },
            },
            {
                action: 'generate',
                agent: 'craig',
                label: 'Draft welcome sequence',
                params: {
                    type: 'welcome_email_sequence',
                    task: 'Write approval-ready onboarding emails for new BakedBot users with cannabis tech startup positioning and a clear product activation CTA.',
                },
            },
            {
                action: 'notify',
                label: 'Send approval-ready summary',
                params: {
                    channel: 'inbox',
                    description: 'Welcome email drafts are ready for review in Super User mode.',
                },
            },
        ],
        metadata: {
            useCase: 'crm_onboarding',
        },
    },
    {
        id: 'dayday-seo-discovery',
        name: 'Day Day SEO Discovery',
        description: 'Identify high-opportunity cannabis tech search markets and queue discovery pages for review.',
        category: 'seo',
        agent: 'jack',
        agents: ['Day Day', 'Ezal', 'Craig'],
        triggers: [
            { type: 'schedule', cron: '0 5 * * *', timezone: 'America/Chicago' },
        ],
        steps: [
            {
                action: 'query',
                agent: 'ezal',
                label: 'Find opportunities',
                params: {
                    task: 'Find 5 to 10 high-opportunity cannabis technology SEO opportunities using CRM leads, Search Console, and low-competition market gaps.',
                },
            },
            {
                action: 'generate',
                agent: 'craig',
                label: 'Draft page briefs',
                params: {
                    type: 'seo_brief',
                    task: 'Prepare page briefs for location, dispensary, and brand pages aligned to BakedBot and Super Users positioning.',
                },
            },
            {
                action: 'notify',
                label: 'Post discovery summary',
                params: {
                    channel: 'inbox',
                    description: 'Day Day SEO discovery briefs are ready for review.',
                },
            },
        ],
        metadata: {
            useCase: 'discovery_hub',
        },
    },
    {
        id: 'competitor-scan',
        name: 'Competitor Price Monitor',
        description: 'Monitor AIpine IQ and adjacent cannabis technology competitors for positioning, pricing, and messaging shifts.',
        category: 'intel',
        agent: 'ezal',
        agents: ['Ezal', 'Pops'],
        triggers: [
            { type: 'schedule', cron: '0 6 * * *', timezone: 'America/Chicago' },
        ],
        steps: [
            {
                action: 'query',
                agent: 'ezal',
                label: 'Monitor AIQ',
                params: {
                    task: 'Scan AIpine IQ, cannabis retail marketing automation vendors, and cannabis data platforms for pricing, product, and messaging changes.',
                },
            },
            {
                action: 'generate',
                agent: 'pops',
                label: 'Summarize the gap',
                params: {
                    type: 'competitor_brief',
                    task: 'Summarize the most important competitive shifts for BakedBot leadership, highlight threats, and recommend response actions.',
                },
            },
            {
                action: 'notify',
                label: 'Deliver briefing',
                params: {
                    channel: 'inbox',
                    description: 'AIQ competitor monitoring brief is ready in Super User mode.',
                },
            },
        ],
        metadata: {
            primaryCompetitor: 'AIpine IQ',
        },
    },
];

export function getDefaultSuperUserPlaybookTemplate(
    playbookId: string,
): DefaultSuperUserPlaybookTemplate | null {
    return DEFAULT_SUPER_USER_PLAYBOOKS.find((playbook) => playbook.id === playbookId) || null;
}
