/**
 * Content Engine Workflow Definition
 *
 * Formalizes the content engine cron:
 * - Load content templates due today
 * - Generate blog posts from each template (sequential)
 * - Deebo compliance gate on each piece
 * - Publish or schedule for review
 */

import type { WorkflowDefinition } from '@/types/workflow';

export const contentEngineWorkflow: WorkflowDefinition = {
    id: 'content-engine',
    name: 'Daily Content Engine',
    description: 'Generate programmatic blog posts from content templates with compliance gating',
    version: 1,
    source: 'typescript',

    trigger: { type: 'cron', schedule: '0 6 * * *', timezone: 'UTC' },

    agent: 'craig',
    category: 'marketing',
    tags: ['daily', 'content', 'blog', 'seo'],

    timeoutMs: 300_000,

    steps: [
        {
            id: 'load_templates',
            action: 'query',
            label: 'Load enabled content templates due today',
            params: { task: 'get_due_templates' },
            outputs: {
                dueTemplates: { type: 'array', description: 'Templates scheduled for today' },
            },
        },
        {
            id: 'generate_posts',
            action: 'generate',
            label: 'Generate blog posts from each template',
            agent: 'craig',
            forEach: {
                source: 'dueTemplates',
                as: 'template',
                batchSize: 1,
                concurrency: 'sequential',
            },
            params: {
                task: 'generate_from_template',
                templateId: '{{template.id}}',
                templateName: '{{template.name}}',
                type: 'blog_post',
            },
            complianceGate: {
                agent: 'deebo',
                onFail: 'flag_and_continue',
            },
            timeoutMs: 60_000,
            retryOnFailure: true,
            maxRetries: 1,
        },
        {
            id: 'save_to_drive',
            action: 'save_to_drive',
            label: 'Save generated posts to Drive',
            condition: '{{processed > 0}}',
            params: {
                category: 'documents',
                title: 'Content Engine Output - {{today}}',
                content: '{{generatedContent}}',
            },
        },
        {
            id: 'notify_results',
            action: 'notify',
            label: 'Send content generation summary',
            condition: '{{processed > 0}}',
            params: {
                channels: ['dashboard'],
                subject: 'Content Engine: {{processed}} posts generated',
                body: '{{processed}} posts generated, {{failed}} failed compliance review',
            },
        },
    ],
};
