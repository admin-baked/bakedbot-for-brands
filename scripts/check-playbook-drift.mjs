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
 *
 * Source derivation:
 *   IDs are read directly from source files rather than maintained as mirrored
 *   arrays. The only manual data here is KNOWN_REGISTRY_GAPS (intentional gaps)
 *   and EXECUTABLE_CRON_MAP (cross-file join: readiness → cron route name).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

// ---------------------------------------------------------------------------
// Source readers — parse IDs directly from TypeScript source files
// ---------------------------------------------------------------------------

/**
 * Extract all quoted string literals from a TypeScript union type declaration.
 * Handles both single-line (`type X = 'a' | 'b';`) and multi-line formats.
 *
 * @param {string} src - Full file content
 * @param {string} typeName - e.g. 'AgentId'
 * @returns {string[]}
 */
function extractUnionMembers(src, typeName) {
    // Match from `export type <name> =` to the first `;` that ends the declaration
    const pattern = new RegExp(`export type ${typeName}\\s*=[\\s\\S]*?;`, 'g');
    const match = src.match(pattern);
    if (!match) return [];
    return [...match[0].matchAll(/'([^']+)'/g)].map(m => m[1]);
}

/**
 * Read all playbook IDs that appear as `id: 'some-id'` in a TypeScript file.
 * Used for src/config/playbooks.ts (the main catalog).
 */
function readIdProperties(filePath) {
    const src = fs.readFileSync(filePath, 'utf-8');
    return [...src.matchAll(/\bid:\s*'([^']+)'/g)].map(m => m[1]);
}

/**
 * Read tier playbook template IDs from TIER_PLAYBOOK_TEMPLATES arrays.
 * Matches string literals that follow a `[` or `,` and precede `,` or `]`.
 * Filters to known tier prefixes to avoid matching other string literals.
 */
function readTierPlaybookIds(filePath) {
    const src = fs.readFileSync(filePath, 'utf-8');
    // Extract the TIER_PLAYBOOK_TEMPLATES object body (from `{` to `} as const`)
    const blockMatch = src.match(/TIER_PLAYBOOK_TEMPLATES\s*=\s*\{([\s\S]*?)\}\s*as const/);
    if (!blockMatch) return [];
    return [...blockMatch[1].matchAll(/'([a-z][a-z0-9-]+)'/g)].map(m => m[1]);
}

/**
 * Read keys from PLAYBOOK_READINESS record.
 * Matches `'playbook-id':` at the start of an entry.
 */
function readReadinessKeys(filePath) {
    const src = fs.readFileSync(filePath, 'utf-8');
    // Extract the PLAYBOOK_READINESS object body
    const blockMatch = src.match(/PLAYBOOK_READINESS[^=]*=\s*\{([\s\S]*?)\};/);
    if (!blockMatch) return [];
    return [...blockMatch[1].matchAll(/^\s+'([a-z][a-z0-9-]+)':/gm)].map(m => m[1]);
}

// ---------------------------------------------------------------------------
// Load source data
// ---------------------------------------------------------------------------

const serverAgentIdsSrc = fs.readFileSync(
    path.join(repoRoot, 'src/server/agents/agent-definitions.ts'), 'utf-8'
);
const registrySrc = fs.readFileSync(
    path.join(repoRoot, 'src/lib/agents/registry.ts'), 'utf-8'
);

const SERVER_AGENT_IDS = extractUnionMembers(serverAgentIdsSrc, 'AgentId');

const REGISTRY_AGENT_IDS = [
    ...extractUnionMembers(registrySrc, 'AgentId'),
    ...extractUnionMembers(registrySrc, 'ExecutiveAgentId'),
];

const CATALOG_PLAYBOOK_IDS = [
    ...readIdProperties(path.join(repoRoot, 'src/config/playbooks.ts')),
    ...readTierPlaybookIds(path.join(repoRoot, 'src/config/tier-playbook-templates.ts')),
];

const READINESS_KEYS = readReadinessKeys(
    path.join(repoRoot, 'src/config/playbook-readiness.ts')
);

// ---------------------------------------------------------------------------
// Manual mappings (cross-file joins — cannot be source-derived without TS)
// ---------------------------------------------------------------------------

// Agents in server AgentId type but intentionally not yet in registry.
// Add here with justification rather than silently failing.
const KNOWN_REGISTRY_GAPS = new Set([
    'big_worm', // In AgentId type, no AGENT_CAPABILITY entry yet — orphaned type
]);

// executable_now playbooks → expected cron route directory name.
// This is a cross-file join (readiness label + cron filesystem path) that
// cannot be derived from a single source file without a TypeScript compiler.
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
console.log(`  Source: ${SERVER_AGENT_IDS.length} server agents, ${REGISTRY_AGENT_IDS.length} registry agents`);
console.log(`  Source: ${CATALOG_PLAYBOOK_IDS.length} catalog playbooks, ${READINESS_KEYS.length} readiness keys\n`);

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
