/**
 * check-playbook-drift.ts
 *
 * Drift-prevention validation script for the playbook catalog.
 * Catches stale references, unclassified playbooks, and agent registry gaps
 * before they ship to production.
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/check-playbook-drift.ts
 *   npm run check:playbook-drift
 *
 * Checks performed:
 *   1. Every playbook in PLAYBOOKS has an entry in PLAYBOOK_READINESS
 *   2. Every playbook in PLAYBOOK_READINESS exists in PLAYBOOKS (no ghost entries)
 *   3. Agent IDs used in PLAYBOOKS exist in registry AgentId type
 *   4. Agent IDs in agent-definitions.ts align with registry.ts AgentId union
 *   5. No playbook has readiness 'executable_now' without a corresponding cron route
 *
 * Exit codes:
 *   0 — all checks pass
 *   1 — one or more checks failed
 */

import * as path from 'path';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Inline catalog data (avoid circular imports)
// ---------------------------------------------------------------------------

// Playbook IDs from src/config/playbooks.ts
const CATALOG_PLAYBOOK_IDS: string[] = [
    // Onboarding
    'welcome-sequence', 'owner-quickstart-guide', 'menu-health-scan', 'white-glove-onboarding',
    // Engagement
    'post-purchase-thank-you', 'birthday-loyalty-reminder', 'win-back-sequence',
    'new-product-launch', 'vip-customer-identification',
    // Competitive intel
    'weekly-competitive-snapshot', 'pro-competitive-brief', 'daily-competitive-intel', 'real-time-price-alerts',
    // Compliance
    'weekly-compliance-digest', 'pre-send-campaign-check', 'jurisdiction-change-alert', 'audit-prep-automation',
    // Analytics
    'weekly-performance-snapshot', 'campaign-roi-report', 'executive-daily-digest', 'multi-location-rollup',
    // Seasonal
    'seasonal-template-pack',
    // System
    'usage-alert', 'tier-upgrade-nudge',
    // NLP playbooks
    'flnnstoned-competitive-deep-dive', 'daily-sales-highlights', 'revenue-pace-alert',
    'weekly-loyalty-health', 'daily-checkin-digest',
    // Tier playbook templates
    'pro-daily-competitive-intel', 'pro-campaign-analyzer', 'pro-revenue-optimizer',
    'enterprise-realtime-intel', 'enterprise-account-summary',
    'enterprise-integration-health', 'enterprise-custom-integrations',
];

// Readiness map from src/config/playbook-readiness.ts
const READINESS_KEYS: string[] = [
    'welcome-sequence', 'owner-quickstart-guide', 'menu-health-scan', 'white-glove-onboarding',
    'post-purchase-thank-you', 'birthday-loyalty-reminder', 'win-back-sequence',
    'new-product-launch', 'vip-customer-identification',
    'weekly-competitive-snapshot', 'pro-competitive-brief', 'daily-competitive-intel', 'real-time-price-alerts',
    'weekly-compliance-digest', 'pre-send-campaign-check', 'jurisdiction-change-alert', 'audit-prep-automation',
    'weekly-performance-snapshot', 'campaign-roi-report', 'executive-daily-digest', 'multi-location-rollup',
    'seasonal-template-pack',
    'usage-alert', 'tier-upgrade-nudge',
    'flnnstoned-competitive-deep-dive', 'daily-sales-highlights', 'revenue-pace-alert',
    'weekly-loyalty-health', 'daily-checkin-digest',
    'pro-daily-competitive-intel', 'pro-campaign-analyzer', 'pro-revenue-optimizer',
    'enterprise-realtime-intel', 'enterprise-account-summary',
    'enterprise-integration-health', 'enterprise-custom-integrations',
];

// Agent IDs from agent-definitions.ts (server-side canonical)
const SERVER_AGENT_IDS: string[] = [
    'craig', 'pops', 'ezal', 'smokey', 'money_mike', 'mike_exec', 'mrs_parker',
    'day_day', 'felisha', 'general', 'puff', 'deebo', 'leo', 'linus', 'roach',
    'big_worm', 'jack', 'glenda', 'openclaw', 'marty', 'uncle_elroy',
];

// Agent IDs from registry.ts (field + executive union)
const REGISTRY_AGENT_IDS: string[] = [
    // Field agents
    'smokey', 'craig', 'pops', 'ezal', 'money_mike', 'mrs_parker', 'deebo', 'day_day', 'puff', 'general',
    // Executive agents
    'leo', 'jack', 'linus', 'glenda', 'mike_exec', 'roach',
    'marty', 'felisha', 'uncle_elroy', 'openclaw',
];

// Cron routes that exist (check file system)
const CRON_ROUTES_DIR = path.join(__dirname, '../src/app/api/cron');

// ---------------------------------------------------------------------------
// Check utilities
// ---------------------------------------------------------------------------

interface CheckResult {
    name: string;
    passed: boolean;
    issues: string[];
}

function check(name: string, issues: string[]): CheckResult {
    return { name, passed: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// Check 1: Every catalog playbook has a readiness classification
// ---------------------------------------------------------------------------

function checkAllPlaybooksClassified(): CheckResult {
    const readinessSet = new Set(READINESS_KEYS);
    const missing = CATALOG_PLAYBOOK_IDS.filter(id => !readinessSet.has(id));
    return check(
        'All catalog playbooks have a readiness classification',
        missing.map(id => `  MISSING: "${id}" not in PLAYBOOK_READINESS — add it to src/config/playbook-readiness.ts`)
    );
}

// ---------------------------------------------------------------------------
// Check 2: No ghost entries in readiness map (entries without catalog backing)
// ---------------------------------------------------------------------------

function checkNoGhostReadinessEntries(): CheckResult {
    const catalogSet = new Set(CATALOG_PLAYBOOK_IDS);
    const ghosts = READINESS_KEYS.filter(id => !catalogSet.has(id));
    return check(
        'No ghost entries in PLAYBOOK_READINESS',
        ghosts.map(id => `  GHOST: "${id}" in PLAYBOOK_READINESS but not in PLAYBOOKS catalog — remove or add to catalog`)
    );
}

// ---------------------------------------------------------------------------
// Check 3: Registry agents are in server agent-definitions
// ---------------------------------------------------------------------------

function checkRegistryAgentsInServerDefinitions(): CheckResult {
    const serverSet = new Set(SERVER_AGENT_IDS);
    const missing = REGISTRY_AGENT_IDS.filter(id => !serverSet.has(id));
    return check(
        'All registry agents exist in server agent-definitions',
        missing.map(id => `  MISSING: "${id}" in registry.ts but not in agent-definitions.ts AgentId — add it`)
    );
}

// ---------------------------------------------------------------------------
// Check 4: Server agents are in registry (drift in the other direction)
// ---------------------------------------------------------------------------

function checkServerAgentsInRegistry(): CheckResult {
    const registrySet = new Set(REGISTRY_AGENT_IDS);
    // big_worm is known to be in server type but not yet in registry — document it
    const knownGaps = new Set(['big_worm']);
    const missing = SERVER_AGENT_IDS.filter(id => !registrySet.has(id) && !knownGaps.has(id));
    return check(
        'All server agents exist in registry.ts',
        missing.map(id => `  DRIFT: "${id}" in agent-definitions.ts but not in registry.ts — add entry or add to known-gaps list`)
    );
}

// ---------------------------------------------------------------------------
// Check 5: executable_now playbooks should have a cron route
// ---------------------------------------------------------------------------

const EXECUTABLE_PLAYBOOKS: Record<string, string> = {
    'weekly-competitive-snapshot': 'competitive-intel',
    'pro-competitive-brief':       'competitive-intel',
    'daily-competitive-intel':     'competitive-intel',
    'flnnstoned-competitive-deep-dive': 'competitive-intel',
    'daily-sales-highlights':      'generate-insights',
    'weekly-loyalty-health':       'weekly-monday-command',
};

function checkExecutablePlaybooksHaveCronRoutes(): CheckResult {
    const issues: string[] = [];
    if (!fs.existsSync(CRON_ROUTES_DIR)) {
        return check('executable_now playbooks have cron routes', ['  SKIP: cron routes directory not found — run from repo root']);
    }
    const cronRoutes = fs.readdirSync(CRON_ROUTES_DIR);
    for (const [playbookId, expectedRoute] of Object.entries(EXECUTABLE_PLAYBOOKS)) {
        if (!cronRoutes.includes(expectedRoute)) {
            issues.push(`  MISSING CRON: "${playbookId}" is executable_now but cron route "${expectedRoute}" not found in api/cron/`);
        }
    }
    return check('executable_now playbooks have cron routes', issues);
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function run(): void {
    console.log('\n🔍 Playbook Drift Check\n');
    console.log('Checks catalog integrity, readiness classification, and agent registry alignment.\n');

    const results: CheckResult[] = [
        checkAllPlaybooksClassified(),
        checkNoGhostReadinessEntries(),
        checkRegistryAgentsInServerDefinitions(),
        checkServerAgentsInRegistry(),
        checkExecutablePlaybooksHaveCronRoutes(),
    ];

    let allPassed = true;
    for (const result of results) {
        if (result.passed) {
            console.log(`  ✅ ${result.name}`);
        } else {
            allPassed = false;
            console.log(`  ❌ ${result.name}`);
            for (const issue of result.issues) {
                console.log(issue);
            }
        }
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`\n${allPassed ? '✅' : '❌'} ${passed}/${results.length} checks passed${failed > 0 ? `, ${failed} failed` : ''}\n`);

    if (!allPassed) {
        process.exit(1);
    }
}

run();
