/**
 * Seed Operational Playbooks for Super Users
 *
 * Creates automated operational playbooks for platform monitoring and management:
 * - Daily System Health Check
 * - Weekly Growth Review
 * - Integration Health Monitor
 * - Customer Churn Prevention
 *
 * These playbooks orchestrate multi-agent workflows for BakedBot operations.
 *
 * Run with: npx tsx scripts/seed-operational-playbooks.ts
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
}

const firestore = getFirestore();

const logger = {
    info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
    error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
};

/**
 * Operational Playbooks Configuration
 */
const OPERATIONAL_PLAYBOOKS = [
    // === DAILY SYSTEM HEALTH CHECK ===
    {
        id: 'ops_daily_health_check',
        name: '🏥 Daily System Health Check',
        description: 'Automated system health monitoring for BakedBot platform',
        segment: 'super_user',
        triggerEvents: [],
        enabled: true,
        orgId: 'system',
        schedule: 'cron',
        cronExpression: '0 9 * * 1-5', // Every weekday at 9:00 AM EST
        agent: 'leo',
        steps: [
            {
                id: 'check_system_health',
                type: 'tool_call',
                name: 'Check System Health',
                tool: 'getSystemHealth',
                storeResultAs: 'health_status',
                config: {
                    checkIntegrations: true,
                    checkAgents: true,
                    checkFirestore: true,
                    checkAuth: true,
                },
            },
            {
                id: 'get_platform_stats',
                type: 'tool_call',
                name: 'Get Platform Statistics',
                tool: 'crmGetStats',
                storeResultAs: 'platform_stats',
                config: {
                    period: 'last_24_hours',
                    includeMetrics: ['signups', 'revenue', 'active_users', 'errors'],
                },
            },
            {
                id: 'synthesize_report',
                type: 'synthesize',
                name: 'Generate Daily Report',
                agent: 'leo',
                config: {
                    template: `**Daily System Health Report**
Date: {{today}}

**System Status:**
{{health_status}}

**Platform Metrics (Last 24 Hours):**
{{platform_stats}}

**Action Items:**
{{prioritize_issues}}`,
                    outputFormat: 'markdown',
                },
            },
            {
                id: 'notify_team',
                type: 'notify',
                name: 'Send Report to Team',
                config: {
                    channels: ['email', 'dashboard'],
                    recipients: ['martez@bakedbot.ai', 'rishabh@bakedbot.ai'],
                    priority: 'normal',
                    subject: 'Daily System Health Report - {{today}}',
                },
            },
        ],
    },

    // === WEEKLY GROWTH REVIEW ===
    {
        id: 'ops_weekly_growth_review',
        name: '📊 Weekly Growth Review',
        description: 'Automated weekly growth analytics and insights',
        segment: 'super_user',
        triggerEvents: [],
        enabled: true,
        orgId: 'system',
        schedule: 'cron',
        cronExpression: '0 8 * * 1', // Every Monday at 8:00 AM EST
        agent: 'leo',
        steps: [
            {
                id: 'delegate_signup_analytics',
                type: 'delegate',
                name: 'Generate Signup Analytics',
                agent: 'pops',
                task: 'Generate signup analytics for last 7 days with cohort breakdown by role',
                storeResultAs: 'signup_stats',
            },
            {
                id: 'delegate_revenue_analysis',
                type: 'delegate',
                name: 'Calculate Revenue Metrics',
                agent: 'jack',
                task: 'Calculate MRR growth, expansion revenue, and churn for last 7 days',
                storeResultAs: 'revenue_stats',
            },
            {
                id: 'delegate_churn_risk',
                type: 'delegate',
                name: 'Identify At-Risk Customers',
                agent: 'mrs_parker',
                task: 'Identify customers at risk of churning this week based on engagement signals',
                storeResultAs: 'churn_risk',
            },
            {
                id: 'synthesize_growth_report',
                type: 'synthesize',
                name: 'Create Growth Review Report',
                agent: 'leo',
                config: {
                    template: `**Weekly Growth Review**
Week of: {{week_start}}

**Signups:**
{{signup_stats}}

**Revenue:**
{{revenue_stats}}

**Churn Risk:**
{{churn_risk}}

**Recommendations:**
{{generate_recommendations}}`,
                    outputFormat: 'markdown',
                },
            },
            {
                id: 'create_growth_thread',
                type: 'create_thread',
                name: 'Create Growth Review Thread',
                config: {
                    threadType: 'growth_review',
                    title: 'Growth Review - Week {{week_number}}',
                    attachReport: true,
                    assignTo: ['martez@bakedbot.ai'],
                },
            },
        ],
    },

    // === INTEGRATION HEALTH MONITOR ===
    {
        id: 'ops_integration_monitor',
        name: '🔗 Integration Health Monitor',
        description: 'Hourly monitoring of external integrations and APIs',
        segment: 'super_user',
        triggerEvents: [],
        enabled: true,
        orgId: 'system',
        schedule: 'cron',
        cronExpression: '0 * * * *', // Every hour
        agent: 'leo',
        steps: [
            {
                id: 'check_integrations',
                type: 'tool_call',
                name: 'Check All Integrations',
                tool: 'getIntegrationStatus',
                storeResultAs: 'integration_status',
                config: {
                    integrations: [
                        'gmail',
                        'calendar',
                        'drive',
                        'sheets',
                        'hubspot',
                        'mailjet',
                        'blackleaf',
                        'alleaves',
                        'aeropay',
                        'cannpay',
                    ],
                    includeLatency: true,
                    includeLastPing: true,
                },
            },
            {
                id: 'check_for_failures',
                type: 'condition',
                name: 'Check for Offline Services',
                condition: 'any_offline',
                config: {
                    expression: 'integration_status.some(s => s.status === "offline")',
                },
            },
            {
                id: 'alert_on_failure',
                type: 'notify',
                name: 'Alert on Integration Failure',
                condition: 'any_offline',
                config: {
                    channels: ['slack', 'email'],
                    recipients: ['martez@bakedbot.ai'],
                    severity: 'high',
                    subject: '⚠️ Integration Offline: {{offline_services}}',
                    message: 'The following integrations are offline: {{offline_services}}',
                },
            },
            {
                id: 'delegate_investigation',
                type: 'delegate',
                name: 'Investigate Offline Integrations',
                agent: 'linus',
                task: 'Investigate offline integration: {{offline_services}}. Check logs, API status, and credentials.',
                condition: 'any_offline',
            },
        ],
    },

    // === CUSTOMER CHURN PREVENTION ===
    {
        id: 'ops_churn_prevention',
        name: '💬 Proactive Churn Prevention',
        description: 'Daily monitoring and automated re-engagement for inactive users',
        segment: 'super_user',
        triggerEvents: [],
        enabled: true,
        orgId: 'system',
        schedule: 'cron',
        cronExpression: '0 10 * * *', // Every day at 10:00 AM EST
        agent: 'leo',
        steps: [
            {
                id: 'find_inactive_customers',
                type: 'delegate',
                name: 'Find Inactive Customers',
                agent: 'mrs_parker',
                task: 'Find customers inactive for 7+ days with no orders or campaigns sent',
                storeResultAs: 'inactive_customers',
            },
            {
                id: 'check_if_any_inactive',
                type: 'condition',
                name: 'Check for Inactive Customers',
                condition: 'has_inactive_customers',
                config: {
                    expression: 'inactive_customers.length > 0',
                },
            },
            {
                id: 'create_reengagement_campaign',
                type: 'delegate',
                name: 'Create Re-engagement Campaign',
                agent: 'craig',
                task: 'Create personalized re-engagement campaign for {{inactive_customers.length}} inactive customers',
                condition: 'has_inactive_customers',
            },
            {
                id: 'create_campaign_thread',
                type: 'create_thread',
                name: 'Create Campaign Thread',
                condition: 'has_inactive_customers',
                config: {
                    threadType: 'campaign',
                    title: 'Re-engagement Campaign - {{date}}',
                    autoApprove: false,
                    assignTo: ['martez@bakedbot.ai'],
                },
            },
            {
                id: 'notify_no_issues',
                type: 'notify',
                name: 'Notify No Inactive Customers',
                condition: '!has_inactive_customers',
                config: {
                    channels: ['dashboard'],
                    recipients: ['martez@bakedbot.ai'],
                    severity: 'low',
                    message: '✅ All customers active - no re-engagement needed today',
                },
            },
        ],
    },
];

async function main() {
    logger.info('[Seed] Starting operational playbooks import...\n');

    try {
        let created = 0;
        let updated = 0;

        for (const playbook of OPERATIONAL_PLAYBOOKS) {
            const docRef = firestore
                .collection('playbooks_internal')
                .doc(playbook.id);

            const existing = await docRef.get();

            const playbookData = {
                ...playbook,
                category: 'operational',
                visibility: 'super_user_only',
                createdAt: existing.exists ? existing.data()?.createdAt : new Date(),
                updatedAt: new Date(),
                version: (existing.data()?.version || 0) + 1,
            };

            await docRef.set(playbookData, { merge: true });

            if (existing.exists) {
                updated++;
                logger.info(`[Seed] ✅ Updated: ${playbook.name}`);
            } else {
                created++;
                logger.info(`[Seed] ✨ Created: ${playbook.name}`);
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('✅ OPERATIONAL PLAYBOOKS SEEDED');
        console.log('='.repeat(70));
        console.log(`\nCreated: ${created} playbooks`);
        console.log(`Updated: ${updated} playbooks`);
        console.log(`Total: ${OPERATIONAL_PLAYBOOKS.length} playbooks`);
        console.log('\nPlaybooks by Type:');
        console.log('  🏥 Daily System Health Check - 4 steps (Mon-Fri 9:00 AM)');
        console.log('  📊 Weekly Growth Review - 5 steps (Monday 8:00 AM)');
        console.log('  🔗 Integration Health Monitor - 4 steps (Every hour)');
        console.log('  💬 Proactive Churn Prevention - 5 steps (Daily 10:00 AM)');
        console.log('\nStep Types Used:');
        console.log('  - tool_call: Direct agent tool execution');
        console.log('  - delegate: Task delegation to specialized agents');
        console.log('  - synthesize: AI-powered report generation');
        console.log('  - notify: Multi-channel notifications');
        console.log('  - create_thread: Inbox thread creation');
        console.log('  - condition: Conditional execution branching');
        console.log('\nAgent Orchestration:');
        console.log('  - Leo (COO): Primary orchestrator + synthesis');
        console.log('  - Pops (Analytics): Signup stats, cohort analysis');
        console.log('  - Jack (Revenue): MRR, expansion, churn metrics');
        console.log('  - Mrs. Parker (Churn): At-risk identification');
        console.log('  - Craig (Marketing): Re-engagement campaigns');
        console.log('  - Linus (CTO): Integration troubleshooting');
        console.log('\nScheduling:');
        console.log('  - Daily System Health: 9:00 AM EST (Mon-Fri)');
        console.log('  - Weekly Growth Review: 8:00 AM EST (Monday)');
        console.log('  - Integration Monitor: Every hour');
        console.log('  - Churn Prevention: 10:00 AM EST (Daily)');
        console.log('\nNext Steps:');
        console.log('  1. Verify in Firestore: playbooks_internal collection');
        console.log('  2. Set up Cloud Scheduler cron jobs:');
        console.log('     gcloud scheduler jobs create http ops-daily-health \\');
        console.log('       --schedule="0 9 * * 1-5" \\');
        console.log('       --uri="https://bakedbot.ai/api/cron/playbook-runner?playbookId=ops_daily_health_check" \\');
        console.log('       --http-method=POST \\');
        console.log('       --headers="Authorization=Bearer ${CRON_SECRET}"');
        console.log('  3. Create playbook executor endpoint: /api/cron/playbook-runner');
        console.log('  4. Test each playbook manually before enabling cron');
        console.log('  5. Monitor execution logs in heartbeat_executions collection');
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        logger.error('[Seed] Failed to seed playbooks:', { error });
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

main().catch(console.error);
