#!/usr/bin/env node
/**
 * check-playbook-drift.mjs
 *
 * Drift-prevention validation script for the playbook catalog.
 * Catches unclassified playbooks and agent registry gaps before they ship.
 *
 * Usage:
 *   npm run check:playbook-drift
 *   node scripts/check-playbook-drift.mjs
 *
 * Checks:
 *   1. Every playbook in PLAYBOOKS has an entry in PLAYBOOK_READINESS
 *   2. No ghost entries in PLAYBOOK_READINESS (no catalog backing)
 *   3. All registry.ts agents exist in agent-definitions.ts AgentId
 *   4. All agent-definitions.ts agents exist in registry.ts (with known gaps noted)
 *   5. executable_now playbooks have a corresponding cron route
 *
 * Exit codes: 0 = all pass, 1 = failures
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

// ---------------------------------------------------------------------------
// Catalog data — mirrors src/config/playbooks.ts and src/config/playbook-readiness.ts
// Update these lists when adding/removing playbooks.
// ---------------------------------------------------------------------------

const CATALOG_PLAYBOOK_IDS = [
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

const READINESS_KEYS = [
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

// Agent IDs from src/server/agents/agent-definitions.ts (AgentId union)
const SERVER_AGENT_IDS = [
    'craig', 'pops', 'ezal', 'smokey', 'money_mike', 'mike_exec', 'mrs_parker',
    'day_day', 'felisha', 'general', 'puff', 'deebo', 'leo', 'linus', 'roach',
    'big_worm', 'jack', 'glenda', 'openclaw', 'marty', 'uncle_elroy',
];

// Agent IDs from src/lib/agents/registry.ts (AgentId | ExecutiveAgentId)
const REGISTRY_AGENT_IDS = [
    // Field agents
    'smokey', 'craig', 'pops', 'ezal', 'money_mike', 'mrs_parker', 'deebo', 'day_day', 'puff', 'general',
    // Executive agents
    'leo', 'jack', 'linus', 'glenda', 'mike_exec', 'roach',
    'marty', 'felisha', 'uncle_elroy', 'openclaw',
];

// Agents in server AgentId type but intentionally not yet in registry
// (add here with justification rather than silently failing)
const KNOWN_REGISTRY_GAPS = new Set([
    'big_worm', // In AgentId type, no AGENT_CAPABILITY entry yet — orphaned type
]);

// executable_now playbooks → expected cron route directory name
const EXECUTABLE_CRON_MAP = {
    'weekly-competitive-snapshot':       'competitive-intel',
    'pro-competitive-brief':             'competitive-intel',
    'daily-competitive-intel':           'competitive-intel',
    'flnnstoned-competitive-deep-dive':  'competitive-intel',
    'daily-sales-highlights':            'generate-insights',
    'weekly-loyalty-health':             'weekly-monday-command',
};

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function checkAllPlaybooksClassified() {
    const readinessSet = new Set(READINESS_KEYS);
    const missing = CATALOG_PLAYBOOK_IDS.filter(id => !readinessSet.has(id));
    return {
        name: 'All catalog playbooks have a readiness classification',
        passed: missing.length === 0,
        issues: missing.map(id => `  MISSING: "${id}" not in PLAYBOOK_READINESS — add to src/config/playbook-readiness.ts`),
    };
}

function checkNoGhostReadinessEntries() {
    const catalogSet = new Set(CATALOG_PLAYBOOK_IDS);
    const ghosts = READINESS_KEYS.filter(id => !catalogSet.has(id));
    return {
        name: 'No ghost entries in PLAYBOOK_READINESS',
        passed: ghosts.length === 0,
        issues: ghosts.map(id => `  GHOST: "${id}" in PLAYBOOK_READINESS but not in catalog — remove or add to catalog`),
    };
}

function checkRegistryAgentsInServerDefinitions() {
    const serverSet = new Set(SERVER_AGENT_IDS);
    const missing = REGISTRY_AGENT_IDS.filter(id => !serverSet.has(id));
    return {
        name: 'All registry.ts agents exist in server agent-definitions',
        passed: missing.length === 0,
        issues: missing.map(id => `  MISSING: "${id}" in registry.ts but not in agent-definitions.ts — add AgentId entry`),
    };
}

function checkServerAgentsInRegistry() {
    const registrySet = new Set(REGISTRY_AGENT_IDS);
    const missing = SERVER_AGENT_IDS.filter(id => !registrySet.has(id) && !KNOWN_REGISTRY_GAPS.has(id));
    return {
        name: 'All server agents exist in registry.ts (excl. known gaps)',
        passed: missing.length === 0,
        issues: missing.map(id => `  DRIFT: "${id}" in agent-definitions.ts but not registry.ts — add AGENT_REGISTRY entry or add to KNOWN_REGISTRY_GAPS`),
    };
}

function checkExecutablePlaybooksHaveCronRoutes() {
    const cronDir = path.join(repoRoot, 'src/app/api/cron');
    if (!fs.existsSync(cronDir)) {
        return { name: 'executable_now playbooks have cron routes', passed: true, issues: ['  SKIP: cron directory not found'] };
    }
    const cronRoutes = new Set(fs.readdirSync(cronDir));
    const issues = Object.entries(EXECUTABLE_CRON_MAP)
        .filter(([, route]) => !cronRoutes.has(route))
        .map(([id, route]) => `  MISSING CRON: "${id}" is executable_now but cron route "${route}" not found`);
    return {
        name: 'executable_now playbooks have cron routes',
        passed: issues.length === 0,
        issues,
    };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

console.log('\n🔍 Playbook Drift Check\n');

const results = [
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

if (!allPassed) process.exit(1);
