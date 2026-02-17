/**
 * Fix Competitive Intelligence Playbook
 *
 * Updates the Thrive Syracuse competitive intel playbook with proper steps
 * AND creates a reusable template for all future pilot customers.
 *
 * Run with: npx tsx scripts/fix-competitive-intel-playbook.ts
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
}

const firestore = getFirestore();

const THRIVE_PLAYBOOK_ID = 'c1boBTwmKyPo23Ib1C7o';
const THRIVE_ORG_ID = 'org_thrive_syracuse';
const REPORT_EMAIL = 'martez@bakedbot.ai';

// ============================================================================
// PLAYBOOK STEP DEFINITIONS (using executor-supported action types)
// ============================================================================

function buildCompetitiveIntelSteps(orgId: string, emailRecipient: string) {
    return [
        {
            id: 'step_scan',
            name: 'Scan Competitors',
            description: 'Capture latest competitor pricing and deals',
            action: 'scan_competitors',
            agent: 'ezal',
            params: {
                orgId,
                maxCompetitors: 10,
                captureDeals: true,
                captureProducts: true,
            },
            timeout: 120,
            retryOnFailure: true,
            maxRetries: 2,
        },
        {
            id: 'step_report',
            name: 'Generate Weekly Intelligence Report',
            description: 'Analyze competitor data and generate comprehensive report',
            action: 'generate_competitor_report',
            agent: 'ezal',
            params: {
                orgId,
                reportType: 'weekly',
                includeRecommendations: true,
                includeAlerts: true,
            },
            dependsOn: ['step_scan'],
            timeout: 120,
        },
        {
            id: 'step_drive',
            name: 'Save to BakedBot Drive',
            description: 'Store markdown report for AI access',
            action: 'save_to_drive',
            agent: 'ezal',
            params: {
                orgId,
                category: 'documents',
                tags: ['competitive-intel', 'automated', 'weekly'],
            },
            dependsOn: ['step_report'],
            timeout: 30,
        },
        {
            id: 'step_inbox',
            name: 'Create Inbox Notification',
            description: 'Notify user in BakedBot inbox',
            action: 'create_inbox_notification',
            agent: 'ezal',
            params: {
                orgId,
                type: 'market_intel',
                priority: 'high',
            },
            dependsOn: ['step_report'],
            timeout: 30,
        },
        {
            id: 'step_email',
            name: 'Send Email Report',
            description: 'Email formatted competitive intelligence report',
            action: 'send_email',
            agent: 'ezal',
            params: {
                orgId,
                to: emailRecipient,
                template: 'competitive_intel_weekly',
                fromName: 'Ezal — BakedBot Intelligence',
            },
            dependsOn: ['step_report'],
            timeout: 30,
        },
    ];
}

// ============================================================================
// FIX THRIVE SYRACUSE PLAYBOOK
// ============================================================================

async function fixThrivePlaybook() {
    console.log('\n[1/3] Fixing Thrive Syracuse playbook...');

    const playbookRef = firestore.collection('playbooks').doc(THRIVE_PLAYBOOK_ID);
    const existingDoc = await playbookRef.get();

    if (!existingDoc.exists) {
        console.error(`Playbook ${THRIVE_PLAYBOOK_ID} not found. Creating new one...`);
    } else {
        const existing = existingDoc.data();
        console.log(`Found playbook: "${existing?.name}" with ${existing?.steps?.length || 0} steps`);
    }

    const steps = buildCompetitiveIntelSteps(THRIVE_ORG_ID, REPORT_EMAIL);

    await playbookRef.set({
        name: 'Daily Competitive Intelligence — Thrive Syracuse',
        description: 'Automated daily competitive intel: scan competitors, generate report, save to Drive, send email',
        orgId: THRIVE_ORG_ID,
        agentId: 'ezal',
        trigger: 'scheduled',
        schedule: '0 14 * * *', // 9 AM EST = 14:00 UTC
        active: true,
        steps,
        version: 2,
        updatedAt: new Date(),
    }, { merge: true });

    console.log(`Updated playbook with ${steps.length} steps:`);
    steps.forEach((s, i) => console.log(`  ${i + 1}. ${s.action}: ${s.name}`));
}

// ============================================================================
// CREATE REUSABLE TEMPLATE FOR ALL PILOT CUSTOMERS
// ============================================================================

async function createPilotCustomerTemplate() {
    console.log('\n[2/3] Creating reusable template for pilot customers...');

    const template = {
        id: 'competitive_intel_daily',
        name: 'Daily Competitive Intelligence',
        description: 'Automated daily competitive intel: scan competitors, generate report, save to Drive, inbox notification + email',
        category: 'competitive_intelligence',
        agentId: 'ezal',
        trigger: 'scheduled',
        schedule: '0 14 * * *', // 9 AM EST
        tags: ['competitive-intel', 'daily', 'automated', 'ezal'],
        isTemplate: true,
        steps: buildCompetitiveIntelSteps('{orgId}', '{reportEmail}'), // Placeholders
        customizable: {
            schedule: 'Cron schedule (default: daily 9 AM EST)',
            reportEmail: 'Email address for reports',
            maxCompetitors: 'Max competitors to scan (default: 10)',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    await firestore
        .collection('playbook_templates')
        .doc('competitive_intel_daily')
        .set(template, { merge: true });

    console.log('Created template: competitive_intel_daily');
    console.log('Usage: Customize {orgId} and {reportEmail} when deploying for each pilot customer');
}

// ============================================================================
// VERIFY PLAYBOOK IS EXECUTABLE
// ============================================================================

async function verifyPlaybook() {
    console.log('\n[3/3] Verifying playbook...');

    const doc = await firestore.collection('playbooks').doc(THRIVE_PLAYBOOK_ID).get();
    const data = doc.data();

    if (!data) {
        console.error('Playbook not found after update!');
        return false;
    }

    const issues: string[] = [];

    if (!data.steps || data.steps.length === 0) {
        issues.push('No steps defined');
    }

    if (!data.active) {
        issues.push('Playbook is not active');
    }

    if (!data.orgId) {
        issues.push('Missing orgId');
    }

    if (issues.length > 0) {
        console.error('Playbook has issues:', issues);
        return false;
    }

    console.log(`Playbook OK:`);
    console.log(`  Name:    ${data.name}`);
    console.log(`  Steps:   ${data.steps.length}`);
    console.log(`  Active:  ${data.active}`);
    console.log(`  OrgId:   ${data.orgId}`);
    console.log(`  Version: ${data.version}`);

    return true;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('Fixing Competitive Intelligence Playbook...');
    console.log('='.repeat(50));

    await fixThrivePlaybook();
    await createPilotCustomerTemplate();
    const ok = await verifyPlaybook();

    console.log('\n' + '='.repeat(50));
    if (ok) {
        console.log('Done! Playbook is now ready.');
        console.log('');
        console.log('Test with:');
        console.log('  .\\scripts\\test-thrive-intel.ps1');
        console.log('');
        console.log('For new pilot customers, use template:');
        console.log('  playbook_templates/competitive_intel_daily');
    } else {
        console.error('Playbook has issues. Check output above.');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
});
