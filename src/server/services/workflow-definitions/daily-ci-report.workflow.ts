/**
 * Daily Competitive Intelligence Report — Workflow Definition
 *
 * First production vertical slice per Build Package §8.
 * Uses the new stage-based execution model from playbook-v2.ts.
 *
 * Trigger: Daily schedule
 * Stages: scope → questions → context → output → validation → delivery
 * Artifacts: resolved_scope, questions, research_pack, output, recommendations,
 *            validation_report, delivery_manifest
 */

import type { WorkflowDefinition } from '@/types/workflow';
import type { CompiledPlaybookSpec } from '@/types/playbook-v2';

// ---------------------------------------------------------------------------
// Workflow Definition (for the existing workflow-registry)
// ---------------------------------------------------------------------------

export const dailyCIReportWorkflow: WorkflowDefinition = {
    id: 'daily-ci-report',
    name: 'Daily Competitive Intelligence Report',
    description:
        'Daily comparison of competitor menu, pricing, promos, and assortment changes ' +
        'with structured recommendations for a dispensary.',
    version: 1,
    source: 'typescript',

    trigger: { type: 'cron', schedule: '0 12 * * *' }, // Noon UTC = 7 AM CT

    agent: 'ezal',
    category: 'intel',
    tags: ['competitive-intelligence', 'daily', 'report', 'dispensary'],

    timeoutMs: 300_000, // 5 min total

    steps: [
        {
            id: 'resolve_scope',
            action: 'delegate',
            label: 'Resolve scope: competitors, categories, thresholds',
            agent: 'ezal',
            params: {
                task: 'resolve_ci_scope',
                loadPolicy: true,
                loadCompetitors: true,
            },
            outputs: {
                resolvedScope: { type: 'object', description: 'Resolved competitor/category scope' },
                policyBundle: { type: 'object', description: 'Loaded policy bundle' },
            },
        },
        {
            id: 'extract_questions',
            action: 'query',
            label: 'Extract structured questions for context assembly',
            params: {
                task: 'extract_ci_questions',
                questions: [
                    'what_changed_vs_yesterday',
                    'which_categories_moved',
                    'which_price_changes_exceed_threshold',
                    'which_promos_are_new',
                    'which_changes_are_operationally_meaningful',
                ],
            },
            outputs: {
                questions: { type: 'array', description: 'Structured analysis questions' },
            },
        },
        {
            id: 'assemble_context',
            action: 'delegate',
            label: 'Fetch snapshots, compute diffs, build research pack',
            agent: 'ezal',
            params: {
                task: 'assemble_ci_context',
                fetchMenuSnapshots: true,
                computeDiffs: true,
                fetchPromoChanges: true,
                buildResearchPack: true,
            },
            outputs: {
                menuDiff: { type: 'object', description: 'Menu diff data' },
                promoDiff: { type: 'object', description: 'Promo diff data' },
                researchPack: { type: 'string', description: 'Compiled research pack markdown' },
            },
            timeoutMs: 120_000,
        },
        {
            id: 'generate_output',
            action: 'generate',
            label: 'Generate executive summary and recommendations',
            agent: 'ezal',
            params: {
                task: 'generate_ci_report',
                outputFormats: ['executive_summary', 'recommendations'],
                grounded: true, // Only use data from assembled context
            },
            outputs: {
                report: { type: 'string', description: 'Daily CI report markdown' },
                recommendations: { type: 'object', description: 'Ranked recommendations' },
            },
            timeoutMs: 60_000,
        },
        {
            id: 'validate',
            action: 'delegate',
            label: 'Run validation harness',
            agent: 'deebo',
            params: {
                task: 'run_validation_harness',
                validators: ['source_integrity', 'schema', 'policy', 'confidence', 'delivery'],
            },
            complianceGate: {
                agent: 'deebo',
                rulePack: '{{policyBundle.jurisdiction}}-retail',
                onFail: 'flag_and_continue',
            },
            outputs: {
                validationReport: { type: 'object', description: 'Structured validation results' },
            },
        },
        {
            id: 'deliver',
            action: 'notify',
            label: 'Deliver to dashboard and email',
            condition: '{{validationReport.overallStatus !== "fail"}}',
            params: {
                channels: ['dashboard', 'email'],
                subject: 'Daily Competitive Intelligence Report',
                body: '{{report}}',
                attachRecommendations: true,
            },
        },
    ],
};

// ---------------------------------------------------------------------------
// Compiled Spec Example (for the new stage-based runtime)
// ---------------------------------------------------------------------------

export const dailyCIExampleSpec: CompiledPlaybookSpec = {
    playbookId: 'pb_daily_ci_001',
    version: 1,
    playbookType: 'daily_competitive_intelligence',
    trigger: {
        type: 'schedule',
        schedule: {
            frequency: 'daily',
            timeLocal: '07:00',
            timezone: 'America/Chicago',
        },
    },
    scope: {
        storeId: 'store_thrive_syracuse',
        competitorIds: ['cmp_verilife_liverpool', 'cmp_rise_liverpool', 'cmp_flynnstoned'],
        categories: ['flower', 'vapes', 'gummies', 'prerolls', 'beverages'],
        thresholds: {
            priceChangePct: 8,
            promoSignificanceScore: 0.65,
        },
    },
    objectives: [
        'detect_price_changes',
        'detect_promo_changes',
        'detect_assortment_changes',
        'generate_recommendations',
    ],
    inputs: {
        sourceConnectors: ['normalized_menu_snapshots', 'promo_scraper'],
        customerContextRefs: ['store_profile', 'policy_bundle'],
    },
    outputs: {
        deliverables: ['email_summary', 'dashboard_report'],
        destinations: ['dashboard', 'email'],
    },
    approvalPolicy: {
        mode: 'escalate_on_low_confidence',
        confidenceThreshold: 0.78,
        requiredFor: ['source_conflict', 'policy_violation'],
    },
    policyBundleId: 'pol_thrive_default',
    telemetryProfile: 'default_ops',
};
