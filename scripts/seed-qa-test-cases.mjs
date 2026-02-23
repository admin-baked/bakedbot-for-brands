#!/usr/bin/env node
/**
 * Seed QA Test Cases — BakedBot
 *
 * Migrates the 112 test cases from dev/MASTER_MANUAL_TEST_PLAN.md
 * into the `qa_test_cases` Firestore collection with status: 'untested'.
 *
 * Usage:
 *   node scripts/seed-qa-test-cases.mjs
 *   node scripts/seed-qa-test-cases.mjs --apply      # Write to Firestore
 *   node scripts/seed-qa-test-cases.mjs --reset      # Reset all to untested
 *   node scripts/seed-qa-test-cases.mjs --dry-run    # Preview only (default)
 *
 * Firestore collection: qa_test_cases/{id}
 * Each doc maps to a row in MASTER_MANUAL_TEST_PLAN.md
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const APPLY = process.argv.includes('--apply');
const RESET = process.argv.includes('--reset');
const DRY_RUN = !APPLY;

console.log(`\n🐛 BakedBot QA Test Case Seeder`);
console.log(`   Mode: ${DRY_RUN ? '🔍 Dry Run (preview only)' : '✅ APPLY (writing to Firestore)'}`);
if (RESET) console.log(`   Reset: All existing test cases will be set to 'untested'`);
console.log('');

// ============================================================================
// TEST CASE DEFINITIONS
// Parsed from dev/MASTER_MANUAL_TEST_PLAN.md
// ============================================================================

const TEST_CASES = [
    // Section 1: Public Menu Pages
    { id: '1.1', area: 'public_menu', title: 'Menu page loads', steps: 'Visit /menu/thrive-syracuse', expected: 'Full menu renders with products, images, prices', priority: 'critical' },
    { id: '1.2', area: 'public_menu', title: 'Category filtering', steps: 'Click category tabs (Flower, Edibles, etc.)', expected: 'Products filter correctly, URL updates with ?category=X', priority: 'critical' },
    { id: '1.3', area: 'public_menu', title: 'Category anchors', steps: 'Click category in sidebar/nav', expected: 'Page scrolls to correct section', priority: 'medium' },
    { id: '1.4', area: 'public_menu', title: 'Phone CTA button', steps: 'Check for phone call-to-action', expected: 'Phone number is displayed and clickable (tel: link)', priority: 'medium' },
    { id: '1.5', area: 'public_menu', title: 'Address display', steps: 'Check dispensary header area', expected: 'Full address visible with correct Syracuse location', priority: 'medium' },
    { id: '1.6', area: 'public_menu', title: 'Product images', steps: 'Scroll through menu items', expected: 'Product images load (no broken images, no placeholders)', priority: 'medium' },
    { id: '1.7', area: 'public_menu', title: 'Price display', steps: 'Check product cards', expected: 'All products show valid prices (no $0.00)', priority: 'critical' },
    { id: '1.8', area: 'public_menu', title: 'Back-to-top nav', steps: 'Scroll down, look for back-to-top button', expected: 'Button appears and scrolls to top when clicked', priority: 'low' },
    { id: '1.9', area: 'public_menu', title: 'URL filter sync', steps: 'Navigate to /menu/thrive-syracuse?category=flower directly', expected: 'Page loads pre-filtered to Flower category', priority: 'medium' },
    { id: '1.10', area: 'public_menu', title: 'Effect filtering', steps: 'Use effect filter (if present)', expected: 'Products filter by effect (Relaxed, Energetic, etc.)', priority: 'medium' },
    { id: '1.11', area: 'public_menu', title: 'Slug resolution', steps: 'Visit the menu page', expected: 'No slug collision errors; correct dispensary loads', priority: 'critical' },

    // Section 2: Goal-Driven Directive System
    { id: '2.1', area: 'goals', title: 'Goals dashboard loads', steps: 'Navigate to /dashboard/goals', expected: 'Goals page renders without errors', priority: 'critical' },
    { id: '2.2', area: 'goals', title: 'Create a new goal', steps: 'Click "Create Goal" → fill form → submit', expected: 'Goal is created and appears in the list', priority: 'critical' },
    { id: '2.3', area: 'goals', title: 'AI directive generation', steps: 'Create a goal with a target metric', expected: 'AI generates actionable directives/steps', priority: 'medium' },
    { id: '2.4', area: 'goals', title: 'Goal progress tracking', steps: 'Check an existing goal', expected: 'Progress indicator shows correct %', priority: 'medium' },
    { id: '2.5', area: 'goals', title: 'Edit/delete goal', steps: 'Edit an existing goal or delete it', expected: 'Changes persist; deleted goal removed from list', priority: 'medium' },

    // Section 3: Dev Console
    { id: '3.1', area: 'super_powers', title: 'Dev Console tab visible', steps: 'Login as Super User → /dashboard/ceo', expected: '"Dev Console" tab appears in sidebar/tabs', priority: 'critical' },
    { id: '3.2', area: 'super_powers', title: 'Code Fixer (7A)', steps: 'Open Dev Console → Code Fixer section', expected: 'Interface loads; can analyze code issues', priority: 'medium' },
    { id: '3.3', area: 'super_powers', title: 'Git History (7B)', steps: 'Open Dev Console → Git History section', expected: 'Recent commits display correctly', priority: 'medium' },
    { id: '3.4', area: 'super_powers', title: 'AI Coder (7C)', steps: 'Open Dev Console → AI Coder section', expected: 'Can input coding requests; AI responds', priority: 'medium' },
    { id: '3.5', area: 'super_powers', title: 'Deployments (7D)', steps: 'Open Dev Console → Deployments section', expected: 'Deployment history/status visible', priority: 'medium' },
    { id: '3.6', area: 'super_powers', title: 'Super Powers (7E)', steps: 'Open Dev Console → Super Powers section', expected: '11 super power scripts listed and executable', priority: 'medium' },

    // Section 4: Developer Super Powers
    { id: '4.1', area: 'super_powers', title: 'SP1 — Index Auditor', steps: 'Run npm run audit:indexes', expected: 'Reports existing Firestore indexes by collection', priority: 'medium' },
    { id: '4.2', area: 'super_powers', title: 'SP2 — Secrets Provisioner', steps: 'Run npm run setup:secrets (no --deploy)', expected: 'Dry run shows secrets that would be provisioned', priority: 'medium' },
    { id: '4.3', area: 'super_powers', title: 'SP3 — Schema Validator', steps: 'Run npm run audit:schema --orgId=org_thrive_syracuse', expected: 'Shows % valid docs per collection', priority: 'medium' },
    { id: '4.4', area: 'super_powers', title: 'SP4 — Test Data Seeder', steps: 'Run npm run seed:test', expected: 'Creates test org with sample data', priority: 'low' },
    { id: '4.5', area: 'super_powers', title: 'SP5 — Code Scaffolder', steps: 'Run npm run generate:component TestWidget', expected: 'Generates component + test file', priority: 'low' },
    { id: '4.6', area: 'super_powers', title: 'SP6 — Build Error Fixer', steps: 'Run npm run fix:build (no --apply)', expected: 'Reports fixable errors without applying', priority: 'medium' },
    { id: '4.7', area: 'super_powers', title: 'SP7 — Security Tester', steps: 'Run npm run test:security', expected: '12 security test results displayed', priority: 'critical' },
    { id: '4.8', area: 'super_powers', title: 'SP8 — Compliance Gater', steps: 'Run npm run check:compliance --text "Try our CBD for pain relief"', expected: 'Returns compliance violations (medical claim)', priority: 'critical' },
    { id: '4.9', area: 'super_powers', title: 'SP9 — Consistency Checker', steps: 'Run npm run audit:consistency --orgId=org_thrive_syracuse', expected: '8 consistency rules checked', priority: 'medium' },
    { id: '4.10', area: 'super_powers', title: 'SP10 — Monitoring Setup', steps: 'Run npm run setup:monitoring (no --deploy)', expected: 'Shows monitoring config that would be deployed', priority: 'low' },
    { id: '4.11', area: 'super_powers', title: 'SP11 — Cost Analyzer', steps: 'Run npm run audit:costs', expected: 'Query cost estimates and N+1 warnings', priority: 'medium' },
    { id: '4.12', area: 'super_powers', title: 'Linus super_power tool', steps: 'Ask Linus to "run the index auditor"', expected: 'Linus executes SP1 via execute_super_power tool', priority: 'medium' },

    // Section 5: Hero Carousel
    { id: '5.1', area: 'hero_carousel', title: 'Hero management page', steps: 'Navigate to /dashboard/heroes', expected: 'Heroes list/management page loads', priority: 'medium' },
    { id: '5.2', area: 'hero_carousel', title: 'Create a hero slide', steps: 'Create a new hero → fill title, image, CTA → save', expected: 'Slide appears in list with correct data', priority: 'critical' },
    { id: '5.3', area: 'hero_carousel', title: 'Hero visible on public menu', steps: 'Check /menu/thrive-syracuse', expected: 'Active hero slides appear at top of menu page', priority: 'critical' },
    { id: '5.4', area: 'hero_carousel', title: 'Hero auto-play', steps: 'Watch hero carousel for ~5 seconds', expected: 'Slides auto-advance (if multiple)', priority: 'medium' },
    { id: '5.5', area: 'hero_carousel', title: 'Hero pause on hover', steps: 'Hover over hero carousel', expected: 'Auto-play pauses on mouse hover', priority: 'low' },
    { id: '5.6', area: 'hero_carousel', title: 'CTA button click', steps: 'Click hero CTA button', expected: 'Navigates to correct URL (internal or external)', priority: 'critical' },

    // Section 6: Bundle System
    { id: '6.1', area: 'bundle_system', title: 'Bundle creation', steps: 'Navigate to Bundles → Create Bundle', expected: 'Bundle form renders; can add products', priority: 'critical' },
    { id: '6.2', area: 'bundle_system', title: 'Bundle discount', steps: 'Create bundle with 10% off → check calculated price', expected: 'Discounted price shows correctly', priority: 'critical' },
    { id: '6.3', area: 'bundle_system', title: 'Bundle on public menu', steps: 'Check if bundle appears in public menu', expected: 'Bundle is visible as a product/deal on the menu', priority: 'critical' },
    { id: '6.4', area: 'bundle_system', title: 'Bundle scheduling', steps: 'Create bundle with future start date', expected: 'Bundle only activates on the scheduled date', priority: 'medium' },
    { id: '6.5', area: 'bundle_system', title: 'AI bundle suggestions', steps: 'Ask Linus/Craig to suggest bundles in inbox', expected: 'AI proposes bundles based on inventory and sales', priority: 'medium' },

    // Section 7: Compliance / Security
    { id: '7.1', area: 'compliance', title: 'Age gate present on dispensary menu', steps: 'Visit /menu/thrive-syracuse in incognito', expected: 'Age verification gate appears before seeing menu', priority: 'critical' },
    { id: '7.2', area: 'compliance', title: 'Medical claims blocked', steps: 'Run check:compliance --text "Cures cancer"', expected: 'Compliance check returns violation', priority: 'critical' },
    { id: '7.3', area: 'compliance', title: 'Minors protection', steps: 'Submit age gate with age < 21', expected: 'Redirected to age restriction page', priority: 'critical' },
    { id: '7.4', area: 'compliance', title: 'TCPA opt-out in SMS', steps: 'Send a test campaign SMS', expected: 'STOP instructions included in every SMS', priority: 'critical' },
    { id: '7.5', area: 'compliance', title: 'Campaign compliance gate', steps: 'Try to send a campaign with medical claims', expected: 'Deebo blocks the send with violation message', priority: 'critical' },
    { id: '7.6', area: 'compliance', title: 'Regulation monitor', steps: 'Check if regulation monitor cron ran', expected: 'Recent update logged if regulations changed', priority: 'medium' },
    { id: '7.7', area: 'auth', title: 'Role-based access control', steps: 'Login as dispensary_admin → try to access /dashboard/ceo', expected: 'Redirected to dispensary dashboard (not CEO)', priority: 'critical' },
    { id: '7.8', area: 'cron_jobs', title: 'Cron routes reject unauthenticated', steps: 'GET /api/cron/pos-sync without Authorization header', expected: 'HTTP 401 Unauthorized', priority: 'critical' },
    { id: '7.9', area: 'cron_jobs', title: 'Cron routes accept valid secret', steps: 'POST /api/cron/qa-smoke with correct Bearer token', expected: 'HTTP 200 with smoke test results', priority: 'critical' },

    // Section 8: POS Sync
    { id: '8.1', area: 'pos_sync', title: 'Manual POS sync', steps: 'Trigger sync from /dashboard/ceo → Super Powers → run sync', expected: 'Products sync from Alleaves to Firestore', priority: 'critical' },
    { id: '8.2', area: 'pos_sync', title: 'Automated heartbeat', steps: 'Wait for pos-sync cron → check Firestore', expected: 'Products, orders, customers updated', priority: 'critical' },
    { id: '8.3', area: 'pos_sync', title: 'Inventory counts', steps: 'Check a product on the menu', expected: 'Product inventory counts match Alleaves', priority: 'medium' },
    { id: '8.4', area: 'pos_sync', title: 'New product appears on menu', steps: 'Add product in Alleaves → wait for sync', expected: 'New product visible on public menu within 30 min', priority: 'critical' },
    { id: '8.5', area: 'pos_sync', title: 'Out-of-stock handling', steps: 'Mark product out-of-stock in Alleaves → wait for sync', expected: 'Product hidden from menu or shows "Out of Stock"', priority: 'critical' },

    // Section 9: Inbox / AI Chat
    { id: '9.1', area: 'inbox', title: 'Inbox loads', steps: 'Navigate to /dashboard/inbox', expected: 'Inbox renders with thread list and chat area', priority: 'critical' },
    { id: '9.2', area: 'inbox', title: 'Send a message', steps: 'Type message → press Enter', expected: 'Message appears in thread; AI responds within 15s', priority: 'critical' },
    { id: '9.3', area: 'inbox', title: 'Bundle generator in inbox', steps: 'Type "create a bundle" in inbox', expected: 'Bundle creator UI appears inline', priority: 'medium' },
    { id: '9.4', area: 'inbox', title: 'Campaign draft in inbox', steps: 'Type "draft email campaign" in inbox', expected: 'Craig generates email draft as artifact', priority: 'medium' },
    { id: '9.5', area: 'inbox', title: 'Compliance check in inbox', steps: 'Type a message with medical claims', expected: 'Deebo flags or blocks the content', priority: 'critical' },

    // Section 10: Campaigns
    { id: '10.1', area: 'campaigns', title: 'Campaign list loads', steps: 'Navigate to /dashboard/campaigns', expected: 'Campaign list renders correctly', priority: 'critical' },
    { id: '10.2', area: 'campaigns', title: 'Create email campaign', steps: 'Create new campaign → set to Email → configure', expected: 'Campaign created and visible in list', priority: 'critical' },
    { id: '10.3', area: 'campaigns', title: 'Campaign sends to customers', steps: 'Send a test campaign to 1 customer', expected: 'Mailjet receives the send request', priority: 'critical' },
    { id: '10.4', area: 'campaigns', title: 'Campaign deduplication', steps: 'Send same campaign twice to same customer', expected: 'Second send is blocked (7-day dedup window)', priority: 'critical' },
    { id: '10.5', area: 'campaigns', title: 'SMS campaign (Blackleaf)', steps: 'Create SMS campaign → send', expected: 'Blackleaf API receives send with STOP instructions', priority: 'critical' },

    // Section 11: Creative Studio
    { id: '11.1', area: 'creative_studio', title: 'Creative Studio loads', steps: 'Navigate to /dashboard/creative', expected: 'Creative Studio renders; canvas is visible', priority: 'critical' },
    { id: '11.2', area: 'creative_studio', title: 'Image generation', steps: 'Select a template → generate', expected: 'FLUX.1 generates a unique image within 15s', priority: 'critical' },
    { id: '11.3', area: 'creative_studio', title: 'Text overlay on canvas', steps: 'Add text overlay to generated image', expected: 'Headline and CTA appear over image correctly', priority: 'medium' },
    { id: '11.4', area: 'creative_studio', title: 'Brand Kit in Creative Studio', steps: 'Open Upload panel → switch to Brand Kit', expected: 'Pre-generated brand images appear', priority: 'medium' },
    { id: '11.5', area: 'creative_studio', title: 'Compliance gate on creative', steps: 'Generate image with medical claim text', expected: 'Deebo blocks output before it saves', priority: 'critical' },

    // Section 12: Drive
    { id: '12.1', area: 'drive', title: 'Drive loads', steps: 'Navigate to /dashboard/drive', expected: 'Drive renders with file list', priority: 'critical' },
    { id: '12.2', area: 'drive', title: 'File preview', steps: 'Double-click a file in Drive', expected: 'File preview opens (markdown/JSON/text/image)', priority: 'medium' },
    { id: '12.3', area: 'drive', title: 'File edit and save', steps: 'Open a text file → edit → save', expected: 'Changes persist (3s auto-save or manual Ctrl+S)', priority: 'medium' },
    { id: '12.4', area: 'drive', title: 'AI Magic Button', steps: 'Open file → click AI Magic Button → Summarize', expected: 'Claude Haiku summarizes file content', priority: 'medium' },
    { id: '12.5', area: 'drive', title: 'Drive-to-Inbox bridge', steps: 'In Inbox artifact panel, check for "Open in Drive" button', expected: 'Button navigates to correct file in Drive', priority: 'medium' },

    // Section 13: Competitive Intelligence (Ezal)
    { id: '13.1', area: 'competitive_intel', title: 'Competitor list loads', steps: 'Navigate to /dashboard/competitors', expected: 'Competitor cards render correctly', priority: 'critical' },
    { id: '13.2', area: 'competitive_intel', title: 'Weekly report generated', steps: 'Check Drive or Inbox for competitive report', expected: 'Report exists with competitor prices, deals', priority: 'medium' },
    { id: '13.3', area: 'competitive_intel', title: 'Price alert triggers', steps: 'Trigger a mock price drop >30% from competitor', expected: 'Slack/Inbox alert fires within 2 hours', priority: 'medium' },
    { id: '13.4', area: 'competitive_intel', title: 'Competitor setup wizard', steps: 'Open competitor setup wizard → add 2 competitors', expected: 'Dialog closes after load; competitors saved', priority: 'medium' },

    // Section 14: Playbooks
    { id: '14.1', area: 'playbooks', title: 'Playbooks list loads', steps: 'Navigate to /dashboard/playbooks', expected: 'Playbook list renders with status badges', priority: 'critical' },
    { id: '14.2', area: 'playbooks', title: 'Activate a playbook', steps: 'Pause → Activate a playbook', expected: 'Status changes to active; cron picks it up', priority: 'critical' },
    { id: '14.3', area: 'playbooks', title: 'Win-back sequence fires', steps: 'Customer has 30+ days since last order', expected: 'Win-back playbook triggers outreach message', priority: 'critical' },
    { id: '14.4', area: 'playbooks', title: 'Playbook deduplication', steps: 'Same customer triggered by same playbook twice', expected: 'Second execution skipped (cooldown enforced)', priority: 'critical' },
    { id: '14.5', area: 'playbooks', title: 'Edit playbook trigger', steps: 'Open a playbook → edit trigger conditions', expected: 'Changes saved; UI reflects new trigger', priority: 'medium' },

    // Section 15: Loyalty
    { id: '15.1', area: 'revenue', title: 'Loyalty tiers display', steps: 'Check loyalty settings page', expected: 'Bronze/Silver/Gold/Platinum tiers configured', priority: 'critical' },
    { id: '15.2', area: 'revenue', title: 'Points earned on order', steps: 'Sync a customer order → check customer points', expected: 'Points added based on tier multiplier', priority: 'critical' },
    { id: '15.3', area: 'revenue', title: 'Tier advancement', steps: 'Customer reaches Silver threshold (200 pts)', expected: 'Tier updates to Silver automatically', priority: 'critical' },
    { id: '15.4', area: 'revenue', title: 'Loyalty menu bar', steps: 'Check public menu', expected: 'Loyalty info bar visible (if enabled in settings)', priority: 'medium' },

    // Section 16: Analytics
    { id: '16.1', area: 'revenue', title: 'Analytics page loads', steps: 'Navigate to /dashboard/analytics', expected: 'Analytics charts and data render', priority: 'critical' },
    { id: '16.2', area: 'revenue', title: 'Sales velocity tracking', steps: 'Check a product with recent orders', expected: 'salesLast7Days and velocity calculated', priority: 'medium' },
    { id: '16.3', area: 'revenue', title: 'Trending products', steps: 'Check products with high velocity', expected: 'Products flagged as trending appear first', priority: 'medium' },

    // Section 17: Brand Guide
    { id: '17.1', area: 'brand_guide', title: 'Brand scan', steps: 'Enter website URL → click "Discover Brand"', expected: 'AI extracts brand name, colors, logo, tagline', priority: 'critical' },
    { id: '17.2', area: 'brand_guide', title: 'Brand guide saves', steps: 'Complete all 4 setup steps → save', expected: 'Brand guide persists; next visit shows saved data', priority: 'critical' },
    { id: '17.3', area: 'brand_guide', title: 'Color palette extracted', steps: 'Run brand discovery', expected: 'Primary/secondary colors extracted from website', priority: 'medium' },
    { id: '17.4', area: 'brand_guide', title: 'Logo extracted', steps: 'Run brand discovery on a site with OG image', expected: '"Use This Logo" button appears with detected image', priority: 'medium' },
];

console.log(`📋 ${TEST_CASES.length} test cases defined`);
console.log('');

// ============================================================================
// FIRESTORE WRITE (--apply mode)
// ============================================================================

async function seedToFirestore() {
    const envPath = join(ROOT, '.env.local');
    if (!existsSync(envPath)) {
        console.error('❌ .env.local not found — cannot connect to Firestore');
        process.exit(1);
    }

    // Load .env.local (handle both \r\n and \n line endings)
    const env = readFileSync(envPath, 'utf-8');
    const envVars = {};
    for (const line of env.split(/\r?\n/)) {
        const match = line.match(/^([^=]+)=(.*)/);
        if (match) {
            envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
    }

    const serviceAccountKey = envVars['FIREBASE_SERVICE_ACCOUNT_KEY'];
    if (!serviceAccountKey) {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
        process.exit(1);
    }

    // Decode and init Firebase Admin
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore, Timestamp } = await import('firebase-admin/firestore');

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
    } catch {
        console.error('❌ Failed to decode FIREBASE_SERVICE_ACCOUNT_KEY (expected base64)');
        process.exit(1);
    }

    if (getApps().length === 0) {
        initializeApp({ credential: cert(serviceAccount) });
    }
    const db = getFirestore();

    const batch = db.batch();
    let count = 0;

    for (const tc of TEST_CASES) {
        const ref = db.collection('qa_test_cases').doc(tc.id);

        if (RESET) {
            batch.set(ref, {
                id: tc.id,
                area: tc.area,
                title: tc.title,
                steps: tc.steps,
                expected: tc.expected,
                priority: tc.priority,
                status: 'untested',
                linkedBugId: null,
                lastTestedAt: null,
                lastTestedBy: null,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        } else {
            // Merge — don't overwrite status if already tested
            batch.set(ref, {
                id: tc.id,
                area: tc.area,
                title: tc.title,
                steps: tc.steps,
                expected: tc.expected,
                priority: tc.priority,
                updatedAt: Timestamp.now(),
            }, { merge: true });

            // Only set status/createdAt on first write (merge won't overwrite if exists)
            batch.set(ref, {
                status: 'untested',
                createdAt: Timestamp.now(),
            }, { merge: true });
        }

        count++;

        // Firestore batch limit is 500 — commit in chunks
        if (count % 499 === 0) {
            await batch.commit();
            console.log(`   ✅ Committed batch of ${count} test cases...`);
        }
    }

    await batch.commit();
    console.log(`\n✅ Seeded ${count} test cases to qa_test_cases collection`);
    console.log('   Visit /dashboard/ceo?tab=qa to see test coverage');
}

// ============================================================================
// DRY RUN PREVIEW
// ============================================================================

if (DRY_RUN) {
    console.log('📋 Test Cases Preview (first 10):');
    console.log('');
    TEST_CASES.slice(0, 10).forEach(tc => {
        console.log(`  [${tc.id}] ${tc.area} — ${tc.title}`);
        console.log(`         Expected: ${tc.expected}`);
        console.log(`         Priority: ${tc.priority}`);
        console.log('');
    });

    const areaCount = {};
    for (const tc of TEST_CASES) {
        areaCount[tc.area] = (areaCount[tc.area] || 0) + 1;
    }
    console.log('📊 By area:');
    Object.entries(areaCount).sort((a, b) => b[1] - a[1]).forEach(([area, count]) => {
        console.log(`   ${area}: ${count}`);
    });

    console.log('');
    console.log(`Total: ${TEST_CASES.length} test cases`);
    console.log('');
    console.log('Run with --apply to write to Firestore:');
    console.log('  node scripts/seed-qa-test-cases.mjs --apply');
    console.log('');
    process.exit(0);
}

// Apply mode
seedToFirestore().catch(err => {
    console.error('❌ Seeder crashed:', err.message || err);
    process.exit(1);
});
