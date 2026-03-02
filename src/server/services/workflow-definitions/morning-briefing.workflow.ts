/**
 * Morning Briefing Workflow Definition
 *
 * Formalizes the pattern in morning-briefing.ts:
 * - Discover active organizations
 * - Parallel data fetches (customers, orders, loyalty, campaigns, GreenLedger)
 * - Per-org batch processing (10 at a time)
 * - Post briefing artifacts to inbox
 * - Email super users
 */

import type { WorkflowDefinition } from '@/types/workflow';

export const morningBriefingWorkflow: WorkflowDefinition = {
    id: 'morning-briefing',
    name: 'Daily Morning Briefing',
    description: 'Generate analytics briefing for each active org, post to inbox, email super users',
    version: 1,
    source: 'typescript',

    trigger: { type: 'cron', schedule: '0 13 * * *', timezone: 'UTC' },

    agent: 'pops',
    category: 'reporting',
    tags: ['daily', 'analytics', 'inbox', 'email'],

    timeoutMs: 300_000,

    steps: [
        {
            id: 'discover_orgs',
            action: 'load_org_data',
            label: 'Discover active organizations',
            params: { query: 'active_orgs', limit: 50 },
            outputs: {
                orgIds: { type: 'array', description: 'Active organization IDs' },
                count: { type: 'number', description: 'Number of active orgs' },
            },
        },
        {
            id: 'generate_briefings',
            action: 'delegate',
            label: 'Generate and post briefings per org',
            agent: 'pops',
            forEach: {
                source: 'orgIds',
                as: 'currentOrgId',
                batchSize: 10,
                concurrency: 'parallel',
            },
            params: {
                task: 'generate_morning_briefing',
                orgId: '{{currentOrgId}}',
            },
            outputs: {
                briefingResults: { type: 'array', description: 'Per-org briefing results' },
            },
            retryOnFailure: false,
            timeoutMs: 30_000,
        },
        {
            id: 'fetch_industry_news',
            action: 'delegate',
            label: 'Fetch cannabis industry news digest',
            agent: 'ezal',
            params: {
                task: 'search_cannabis_news',
                query: 'cannabis dispensary industry news regulation 2026',
            },
            timeoutMs: 15_000,
            retryOnFailure: false,
            onFailure: 'continue',
        },
        {
            id: 'send_super_user_digest',
            action: 'send_email',
            label: 'Email briefing summary to super users',
            condition: '{{superUserEmails.length > 0}}',
            params: {
                to: '{{superUserEmails}}',
                subject: 'Daily Briefing - {{today}}',
                template: 'morning_briefing',
                data: {
                    orgCount: '{{count}}',
                    newsDigest: '{{ezal}}',
                },
            },
        },
    ],
};
