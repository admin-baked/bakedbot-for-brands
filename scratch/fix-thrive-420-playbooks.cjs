/**
 * Fix Thrive Syracuse 4/20 Playbooks
 * 1. Unpause Welcome Email + update wave dates
 * 2. Approve both playbooks (split test deals)
 * 3. Add deals reminder to 4/20 playbook
 * 4. Fix Weekly Emails with educational content
 * 5. Trigger test runs
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match && !match[1].startsWith('#')) {
            process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
    }
}

// Init Firebase
const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
const serviceAccount = fs.existsSync(serviceAccountPath)
    ? JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
    : {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
    console.log('🔧 Thrive Syracuse — Fixing 4/20 Playbooks');
    console.log('============================================\n');

    const now = new Date().toISOString();

    // ═══════════════════════════════════════════════════════
    // 1. UNPAUSE Welcome Email + Update Wave Dates
    // ═══════════════════════════════════════════════════════
    console.log('📋 1. Unpausing Welcome Email playbook...');
    const welcomeRef = db.collection('playbooks').doc('thrive_welcome_420_2026');
    await welcomeRef.update({
        status: 'active',
        'triggers.0.cron': '0 10 15 4 *',  // Wave 1: Apr 15
        'triggers.1.cron': '0 10 16 4 *',  // Wave 2: Apr 16
        'triggers.2.cron': '0 10 17 4 *',  // Wave 3: Apr 17
        'metadata.wave1Date': '2026-04-15',
        'metadata.wave2Date': '2026-04-16',
        'metadata.wave3Date': '2026-04-17',
        'metadata.approvalStatus': 'approved',
        'metadata.approvedBy': 'admin',
        'metadata.approvedAt': now,
        updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('   ✅ Unpaused + wave dates shifted to Apr 15/16/17\n');

    // ═══════════════════════════════════════════════════════
    // 2. APPROVE 4/20 Campaign + Split Test Deals
    // ═══════════════════════════════════════════════════════
    console.log('📋 2. Approving 4/20 Campaign with split test deals...');
    const campaignRef = db.collection('playbooks').doc('thrive_420_campaign_2026');
    await campaignRef.update({
        'metadata.approvalStatus': 'approved',
        'metadata.approvedBy': 'admin',
        'metadata.approvedAt': now,
        'metadata.dealsNote': 'Split test: Group A gets % off deals, Group B gets bundle/BOGO deals. Final deals from Archie/Ade by Apr 15.',
        'metadata.splitTest': {
            enabled: true,
            groups: [
                { name: 'A', strategy: 'percentage_off', description: '% off top sellers' },
                { name: 'B', strategy: 'bundle_bogo', description: 'Bundle deals + BOGO on pre-rolls' },
            ],
            splitRatio: '50/50',
        },
        updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('   ✅ Approved with split test config (A: % off, B: bundle/BOGO)\n');

    // ═══════════════════════════════════════════════════════
    // 3. ADD DEALS REMINDER to 4/20 Campaign
    // ═══════════════════════════════════════════════════════
    console.log('📋 3. Adding deals reminder step to 4/20 Campaign...');
    await campaignRef.update({
        steps: [
            {
                label: 'Deals deadline check',
                action: 'check',
                params: {
                    type: 'reminder',
                    message: '⏰ DEALS REMINDER: Final 4/20 deals needed from Archie/Ade by end of day Apr 15. Split test requires both % off and BOGO deals.',
                    notifyIf: 'dealsNotProvided',
                    recipients: ['adggiles@aol.com', 'halysaleis@gmail.com'],
                },
                condition: 'now < 2026-04-15T23:59:59Z',
                order: 0,
            },
            {
                label: 'Resolve audience — all active subscribers',
                action: 'query',
                params: {
                    orgId: 'org_thrive_syracuse',
                    source: 'customers',
                    filterNoEmail: true,
                    filterTest: true,
                    excludeUnsubscribed: true,
                    splitTest: { enabled: true, groups: ['A', 'B'], ratio: [50, 50] },
                },
                order: 1,
            },
            {
                label: 'Generate 4/20 promo email with deals (Split A: % off)',
                action: 'synthesize',
                params: {
                    template: 'thrive_420_pct_off',
                    tone: 'celebratory',
                    fromEmail: 'hello@thrive.bakedbot.ai',
                    fromName: 'Thrive Syracuse',
                    includeDeals: true,
                    splitGroup: 'A',
                },
                order: 2,
            },
            {
                label: 'Generate 4/20 promo email with deals (Split B: BOGO)',
                action: 'synthesize',
                params: {
                    template: 'thrive_420_bogo',
                    tone: 'celebratory',
                    fromEmail: 'hello@thrive.bakedbot.ai',
                    fromName: 'Thrive Syracuse',
                    includeDeals: true,
                    splitGroup: 'B',
                },
                order: 3,
            },
            {
                label: 'Deebo compliance check',
                action: 'compliance',
                params: { agent: 'deebo', checkType: 'cannabis_marketing' },
                order: 4,
            },
            {
                label: 'Send 4/20 campaign via SES',
                action: 'notify',
                params: {
                    channels: ['email'],
                    communicationType: 'campaign',
                    agentName: 'craig',
                },
                order: 5,
            },
        ],
        updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('   ✅ Added deals reminder + split test steps\n');

    // ═══════════════════════════════════════════════════════
    // 4. FIX Weekly Emails — add real steps + educational content
    // ═══════════════════════════════════════════════════════
    console.log('📋 4. Fixing Weekly Emails with campaigns + educational content...');
    const weeklyRef = db.collection('playbooks').doc('T5czmjxuvO3MOQTxL9aA');
    await weeklyRef.update({
        name: 'Weekly Campaign + Education Email',
        description: 'Weekly campaign email featuring deals, offers, and educational cannabis/terpene content from bakedbot.ai/explore. Keeps Thrive Syracuse top-of-mind with value-driven content.',
        triggers: [
            {
                type: 'schedule',
                cron: '0 10 * * 2',  // Every Tuesday at 10am ET
                timezone: 'America/New_York',
                enabled: true,
            },
            {
                type: 'manual',
                enabled: true,
            },
        ],
        steps: [
            {
                label: 'Resolve audience — active subscribers',
                action: 'query',
                params: {
                    orgId: 'org_thrive_syracuse',
                    source: 'customers',
                    filterNoEmail: true,
                    excludeUnsubscribed: true,
                    filterTest: true,
                },
                order: 0,
            },
            {
                label: 'Fetch weekly deals from POS menu',
                action: 'query',
                params: {
                    orgId: 'org_thrive_syracuse',
                    source: 'products',
                    filter: 'onSale',
                    limit: 5,
                },
                order: 1,
            },
            {
                label: 'Fetch educational content from terpene database',
                action: 'fetch',
                params: {
                    url: 'https://bakedbot.ai/explore',
                    section: 'terpenes',
                    extractType: 'featured_terpene',
                    fallbackContent: {
                        terpene: 'Myrcene',
                        description: 'The most common terpene in cannabis. Known for its sedative, relaxing effects and found in mangoes, hops, and thyme.',
                        strains: ['Granddaddy Purple', 'Blue Dream', 'OG Kush'],
                    },
                },
                order: 2,
            },
            {
                label: 'Generate weekly email — deals + education',
                action: 'synthesize',
                params: {
                    template: 'thrive_weekly',
                    tone: 'friendly_educational',
                    fromEmail: 'hello@thrive.bakedbot.ai',
                    fromName: 'Thrive Syracuse',
                    includeDeals: true,
                    includeEducation: true,
                    educationSource: 'bakedbot.ai/explore',
                    sections: ['deals', 'featured_terpene', 'strain_spotlight', 'pro_tip'],
                },
                order: 3,
            },
            {
                label: 'Deebo compliance check',
                action: 'compliance',
                params: { agent: 'deebo', checkType: 'cannabis_marketing' },
                order: 4,
            },
            {
                label: 'Send weekly campaign email',
                action: 'notify',
                params: {
                    channels: ['email'],
                    communicationType: 'weekly_campaign',
                    agentName: 'craig',
                },
                order: 5,
            },
        ],
        updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('   ✅ Updated with 6 steps: deals + educational content + compliance\n');

    // ═══════════════════════════════════════════════════════
    // 5. TRIGGER TEST RUNS
    // ═══════════════════════════════════════════════════════
    console.log('📋 5. Triggering test runs for both 4/20 playbooks...');

    // Test Welcome Email
    const welcomeRunRef = db.collection('playbookRuns').doc();
    await welcomeRunRef.set({
        playbookId: 'thrive_welcome_420_2026',
        orgId: 'org_thrive_syracuse',
        status: 'pending',
        runStatus: 'test',
        triggerType: 'manual',
        triggeredBy: 'admin_audit',
        startedAt: FieldValue.serverTimestamp(),
        steps: [
            { action: 'query', label: 'Resolve audience by spending tier', status: 'pending' },
            { action: 'synthesize', label: 'Generate welcome email content', status: 'pending' },
            { action: 'notify', label: 'Send welcome email via SES', status: 'pending' },
        ],
        testMode: true,
        testRecipient: 'martez@bakedbot.ai',
        createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`   ✅ Welcome Email test run created: ${welcomeRunRef.id}`);

    // Test 4/20 Campaign
    const campaignRunRef = db.collection('playbookRuns').doc();
    await campaignRunRef.set({
        playbookId: 'thrive_420_campaign_2026',
        orgId: 'org_thrive_syracuse',
        status: 'pending',
        runStatus: 'test',
        triggerType: 'manual',
        triggeredBy: 'admin_audit',
        startedAt: FieldValue.serverTimestamp(),
        steps: [
            { action: 'check', label: 'Deals deadline check', status: 'pending' },
            { action: 'query', label: 'Resolve audience', status: 'pending' },
            { action: 'synthesize', label: 'Generate Split A (% off)', status: 'pending' },
            { action: 'synthesize', label: 'Generate Split B (BOGO)', status: 'pending' },
            { action: 'compliance', label: 'Deebo compliance check', status: 'pending' },
            { action: 'notify', label: 'Send campaign', status: 'pending' },
        ],
        testMode: true,
        testRecipient: 'martez@bakedbot.ai',
        createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`   ✅ 4/20 Campaign test run created: ${campaignRunRef.id}\n`);

    // ═══════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ ALL UPDATES COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('  1. ✅ Welcome Email: UNPAUSED, waves rescheduled Apr 15/16/17');
    console.log('  2. ✅ Both playbooks: APPROVED (split test A/B configured)');
    console.log('  3. ✅ Deals reminder: Added as step 0 in 4/20 campaign');
    console.log('  4. ✅ Weekly Emails: Rebuilt with deals + bakedbot.ai/explore education');
    console.log('  5. ✅ Test runs: Triggered for both playbooks');
    console.log('');
    console.log('  ⏰ NEXT: Archie/Ade must submit final deals by Apr 15 EOD');
    console.log('  📧 Test emails will go to: martez@bakedbot.ai');
    console.log('');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });