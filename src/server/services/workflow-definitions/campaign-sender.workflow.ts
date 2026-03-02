/**
 * Campaign Sender Workflow Definition
 *
 * Formalizes the campaign sender multi-gate pattern:
 * - Query scheduled campaigns that are due
 * - Per-campaign compliance check via Deebo
 * - Warmup limit enforcement
 * - Send via Blackleaf (SMS) / Mailjet (Email)
 * - 7-day deduplication
 * - Notify results
 */

import type { WorkflowDefinition } from '@/types/workflow';

export const campaignSenderWorkflow: WorkflowDefinition = {
    id: 'campaign-sender',
    name: 'Campaign Sender',
    description: 'Process scheduled campaigns with warmup limits, compliance gates, and 7-day dedup',
    version: 1,
    source: 'typescript',

    trigger: { type: 'cron', schedule: '*/5 * * * *' },

    agent: 'craig',
    category: 'marketing',
    tags: ['campaigns', 'email', 'sms', 'compliance'],

    timeoutMs: 120_000,

    steps: [
        {
            id: 'query_due_campaigns',
            action: 'query',
            label: 'Find scheduled campaigns that are due',
            params: {
                task: 'query_due_campaigns',
                status: 'scheduled',
                limit: 10,
            },
            outputs: {
                dueCampaigns: { type: 'array', description: 'Campaigns ready to send' },
            },
        },
        {
            id: 'process_campaigns',
            action: 'delegate',
            label: 'Execute each campaign with compliance + warmup gates',
            agent: 'craig',
            forEach: {
                source: 'dueCampaigns',
                as: 'campaign',
                batchSize: 1,
                concurrency: 'sequential',
            },
            params: {
                task: 'execute_campaign',
                campaignId: '{{campaign.id}}',
                orgId: '{{campaign.orgId}}',
                channels: '{{campaign.channels}}',
            },
            complianceGate: {
                agent: 'deebo',
                rulePack: '{{campaign.state}}-retail',
                onFail: 'abort',
            },
            timeoutMs: 30_000,
        },
        {
            id: 'notify_results',
            action: 'notify',
            label: 'Send campaign batch results',
            condition: '{{processed > 0}}',
            params: {
                channels: ['dashboard'],
                subject: 'Campaign batch processed',
                body: '{{processed}} campaigns sent, {{failed}} failed',
            },
        },
    ],
};
