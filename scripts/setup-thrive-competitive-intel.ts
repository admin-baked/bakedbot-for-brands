/**
 * Setup Daily Competitive Intelligence Playbook for Thrive Syracuse
 *
 * This script creates a daily automated playbook that:
 * 1. Scans 3-4 nearest competitors in Syracuse, NY
 * 2. Generates competitive intelligence report using Claude
 * 3. Saves report to BakedBot Drive
 * 4. Emails daily summary to martez@bakedbot.ai
 *
 * Run with: npx tsx scripts/setup-thrive-competitive-intel.ts
 */

import { getAdminFirestore } from '../src/firebase/admin';
import { logger } from '../src/lib/logger';

const THRIVE_ORG_ID = 'org_thrive_syracuse';
const REPORT_EMAIL = 'martez@bakedbot.ai';

// Syracuse, NY Competitors (nearest to Thrive Syracuse at 3065 Erie Blvd E)
const SYRACUSE_COMPETITORS = [
    {
        name: 'Finger Lakes Cannabis',
        url: 'https://www.fingerlakescannabis.com',
        state: 'NY',
        city: 'Syracuse',
        distance: '2.1 miles',
        notes: 'Major competitor on East Side',
    },
    {
        name: 'Vibe by California',
        url: 'https://www.vibebycalifornia.com/syracuse',
        state: 'NY',
        city: 'Syracuse',
        distance: '3.5 miles',
        notes: 'Premium brand, downtown location',
    },
    {
        name: 'Higher Level Syracuse',
        url: 'https://www.higherlevel.com/syracuse',
        state: 'NY',
        city: 'Syracuse',
        distance: '4.2 miles',
        notes: 'Chain dispensary, competitive pricing',
    },
    {
        name: 'Remedy Dispensary',
        url: 'https://www.remedydispensary.com',
        state: 'NY',
        city: 'Syracuse',
        distance: '5.8 miles',
        notes: 'Medical focus, expanding adult-use',
    },
];

async function main() {
    logger.info('[Setup] Starting Thrive Syracuse Competitive Intelligence setup...');

    const firestore = getAdminFirestore();

    try {
        // 1. Create the playbook in tenants/{orgId}/playbooks collection
        const playbookData = {
            name: 'Daily Competitive Intelligence Report',
            description: `Automated daily monitoring of ${SYRACUSE_COMPETITORS.length} nearest competitors. Tracks pricing, promotions, and product mix to identify opportunities and threats.`,
            status: 'active',
            agent: 'ezal',
            category: 'intelligence',
            icon: 'target',

            // YAML representation (for advanced users)
            yaml: `name: Daily Competitive Intelligence Report
description: Monitor Syracuse competitors and generate actionable intelligence
agent: ezal
category: intelligence

triggers:
  - type: schedule
    cron: "0 9 * * *"  # Daily at 9 AM EST
    timezone: "America/New_York"

steps:
  - action: scan_competitors
    label: "Scan Competitor Websites"
    params:
      competitors:
${SYRACUSE_COMPETITORS.map(c => `        - name: "${c.name}"
          url: "${c.url}"
          state: "${c.state}"
          city: "${c.city}"`).join('\n')}
    retryOnFailure: true
    maxRetries: 2

  - action: generate_competitor_report
    label: "Generate Intelligence Report"
    params:
      format: "markdown"
      dispensaryName: "Thrive Syracuse"
    retryOnFailure: true

  - action: save_to_drive
    label: "Save Report to Drive"
    params:
      category: "documents"
      filename: "competitive-intel-{{date}}.md"

  - action: send_email
    label: "Email Daily Summary"
    params:
      to: "${REPORT_EMAIL}"
      subject: "🔍 Daily Competitive Intel: {{date}}"
      body: "{{competitorReport}}"
`,

            triggers: [
                {
                    type: 'schedule',
                    cron: '0 9 * * *', // 9 AM daily
                    timezone: 'America/New_York',
                },
            ],

            steps: [
                {
                    id: 'step-1',
                    action: 'scan_competitors',
                    label: 'Scan Competitor Websites',
                    params: {
                        competitors: SYRACUSE_COMPETITORS.map(c => ({
                            name: c.name,
                            url: c.url,
                            state: c.state,
                            city: c.city,
                        })),
                    },
                    retryOnFailure: true,
                    maxRetries: 2,
                },
                {
                    id: 'step-2',
                    action: 'generate_competitor_report',
                    label: 'Generate Intelligence Report',
                    params: {
                        format: 'markdown',
                        dispensaryName: 'Thrive Syracuse',
                    },
                    retryOnFailure: true,
                    maxRetries: 1,
                },
                {
                    id: 'step-3',
                    action: 'save_to_drive',
                    label: 'Save Report to Drive',
                    params: {
                        category: 'documents',
                        filename: `competitive-intel-${new Date().toISOString().split('T')[0]}.md`,
                    },
                },
                {
                    id: 'step-4',
                    action: 'send_email',
                    label: 'Email Daily Summary',
                    params: {
                        to: REPORT_EMAIL,
                        subject: `🔍 Daily Competitive Intel: Syracuse - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
                    },
                },
            ],

            ownerId: 'system',
            ownerName: 'BakedBot AI',
            isCustom: false,
            requiresApproval: false,
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            runCount: 0,
            successCount: 0,
            failureCount: 0,
            version: 1,
            orgId: THRIVE_ORG_ID,

            metadata: {
                competitors: SYRACUSE_COMPETITORS,
                reportRecipient: REPORT_EMAIL,
                scheduleDescription: 'Daily at 9 AM EST',
                automationType: 'competitive_intelligence',
            },
        };

        const playbookRef = await firestore
            .collection('tenants')
            .doc(THRIVE_ORG_ID)
            .collection('playbooks')
            .add(playbookData);

        logger.info('[Setup] ✅ Playbook created:', {
            playbookId: playbookRef.id,
            orgId: THRIVE_ORG_ID,
        });

        // 2. Add competitors to ezal_competitors collection
        for (const competitor of SYRACUSE_COMPETITORS) {
            const competitorId = competitor.url
                .replace(/https?:\/\//, '')
                .replace(/[^a-z0-9]/gi, '_')
                .toLowerCase()
                .slice(0, 50);

            const competitorData = {
                id: competitorId,
                name: competitor.name,
                url: competitor.url,
                state: competitor.state,
                city: competitor.city,
                needsResidentialProxy: false,
                consecutiveFailures: 0,
                addedBy: 'system',
                tier: 'paid', // Thrive Syracuse is on Empire plan
                createdAt: new Date(),
                metadata: {
                    distance: competitor.distance,
                    notes: competitor.notes,
                    tenantId: THRIVE_ORG_ID,
                },
            };

            await firestore
                .collection('ezal_competitors')
                .doc(competitorId)
                .set(competitorData, { merge: true });

            logger.info('[Setup] ✅ Competitor added:', { name: competitor.name, id: competitorId });
        }

        // 3. Create a welcome notification in the inbox
        await firestore.collection('notifications').add({
            tenantId: THRIVE_ORG_ID,
            recipientId: THRIVE_ORG_ID,
            type: 'system',
            title: '🔍 Daily Competitive Intelligence Active',
            message: `Your automated competitive intelligence playbook is now active! Every morning at 9 AM EST, Ezal will scan ${SYRACUSE_COMPETITORS.length} competitors and email a detailed report to ${REPORT_EMAIL}.`,
            priority: 'normal',
            read: false,
            createdAt: new Date(),
            metadata: {
                playbookId: playbookRef.id,
                competitors: SYRACUSE_COMPETITORS.map(c => c.name),
            },
        });

        logger.info('[Setup] ✅ Notification created');

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('✅ DAILY COMPETITIVE INTELLIGENCE SETUP COMPLETE');
        console.log('='.repeat(70));
        console.log(`\nPlaybook ID: ${playbookRef.id}`);
        console.log(`Organization: ${THRIVE_ORG_ID} (Thrive Syracuse)`);
        console.log(`Schedule: Daily at 9 AM EST`);
        console.log(`Report Email: ${REPORT_EMAIL}`);
        console.log(`\nCompetitors Monitored (${SYRACUSE_COMPETITORS.length}):`);
        SYRACUSE_COMPETITORS.forEach((c, i) => {
            console.log(`  ${i + 1}. ${c.name} (${c.distance})`);
            console.log(`     ${c.url}`);
            console.log(`     ${c.notes}`);
        });
        console.log('\nNext Steps:');
        console.log('  1. Set up Cloud Scheduler cron job to trigger playbook daily');
        console.log('  2. Test playbook: POST /api/playbooks/{playbookId}/execute');
        console.log('  3. View reports in BakedBot Drive → Documents folder');
        console.log('  4. Monitor execution logs in playbook_executions collection');
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        logger.error('[Setup] Failed to setup playbook:', { error });
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

main().catch(console.error);
