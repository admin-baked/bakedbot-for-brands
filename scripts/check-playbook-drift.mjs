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
 *   IDs, readiness, and cron coverage are read directly from source files rather
 *   than maintained as mirrored arrays. The only manual data here is
 *   KNOWN_REGISTRY_GAPS (intentional gaps) and EXECUTABLE_CRON_ROUTE_ALIASES
 *   for shared or legacy cron routes that do not self-declare a playbookId.
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
 * Read top-level quoted object keys from a TypeScript exported const.
 * Used for src/config/playbooks.ts (the main catalog).
 */
function readQuotedObjectKeys(filePath, exportName) {
    const src = fs.readFileSync(filePath, 'utf-8');
    const pattern = new RegExp(`${exportName}[^=]*=\\s*\\{([\\s\\S]*?)\\}\\s*(?:as const)?;`);
    const blockMatch = src.match(pattern);
    if (!blockMatch) return [];
    return [...blockMatch[1].matchAll(/^\s+'([a-z][a-z0-9-]+)':\s*\{/gm)].map(m => m[1]);
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
 * Read agent IDs declared in the canonical agent contract markdown table.
 * Matches backtick-wrapped IDs in the first column: | `agent_id` | ...
 */
function readContractAgentIdsFromMarkdown(filePath) {
    const src = fs.readFileSync(filePath, 'utf-8');
    // Match table rows where the first cell contains a backtick-wrapped identifier
    return [...src.matchAll(/^\|\s*`([a-z][a-z0-9_]+)`\s*\|/gm)].map(m => m[1]);
}

/**
 * Read IDs from the canonical agent contract. Prefer the machine-readable
 * TypeScript source when present; otherwise fall back to the human-readable
 * markdown companion during the migration window.
 */
function readContractAgentIds() {
    const tsPath = path.join(repoRoot, 'src/config/agent-contract.ts');
    if (fs.existsSync(tsPath)) {
        const src = fs.readFileSync(tsPath, 'utf-8');
        const ids = [...src.matchAll(/\bid:\s*'([a-z][a-z0-9_]+)'/g)].map(m => m[1]);
        if (ids.length === 0) {
            throw new Error('src/config/agent-contract.ts exists but no contract IDs were found');
        }
        return {
            ids: [...new Set(ids)],
            source: tsPath,
        };
    }

    const markdownPath = path.join(repoRoot, '.agent/refs/agent-contract.md');
    return {
        ids: readContractAgentIdsFromMarkdown(markdownPath),
        source: markdownPath,
    };
}

/**
 * Read top-level unquoted object keys from a TypeScript exported const.
 */
function readUnquotedObjectKeysFromSource(src, exportName) {
    const pattern = new RegExp(`${exportName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`);
    const blockMatch = src.match(pattern);
    if (!blockMatch) return [];
    return [...blockMatch[1].matchAll(/^ {4}([a-z][a-z0-9_]+):\s*\{/gm)].map(m => m[1]);
}

/**
 * Read registry agent IDs from the closest literal source available.
 * Prefers AGENT_REGISTRY keys, then AGENT_UI_DEFINITIONS keys for derived
 * registries, then falls back to literal union members if needed.
 */
function readRegistryAgentIds(filePath) {
    const src = fs.readFileSync(filePath, 'utf-8');

    const directRegistryIds = readUnquotedObjectKeysFromSource(src, 'AGENT_REGISTRY');
    if (directRegistryIds.length > 0) {
        return directRegistryIds;
    }

    const uiDefinitionIds = readUnquotedObjectKeysFromSource(src, 'AGENT_UI_DEFINITIONS');
    if (uiDefinitionIds.length > 0) {
        return uiDefinitionIds;
    }

    return [
        ...extractUnionMembers(src, 'AgentId'),
        ...extractUnionMembers(src, 'ExecutiveAgentId'),
    ];
}

/**
 * Read key/value pairs from PLAYBOOK_READINESS.
 * Matches `'playbook-id': 'readiness'` at the start of an entry.
 */
function readReadinessEntries(filePath) {
    const src = fs.readFileSync(filePath, 'utf-8');
    const blockMatch = src.match(/PLAYBOOK_READINESS[^=]*=\s*\{([\s\S]*?)\};/);
    if (!blockMatch) return [];
    return [...blockMatch[1].matchAll(/^\s+'([a-z][a-z0-9-]+)':\s*'([a-z_]+)'/gm)].map(m => [m[1], m[2]]);
}

/**
 * Scan cron route source files for self-declared playbook IDs.
 * Returns a map of playbookId → route directory names.
 */
function readCronDeclaredPlaybookRoutes(cronDir) {
    const declaredRoutes = new Map();

    if (!fs.existsSync(cronDir)) {
        return declaredRoutes;
    }

    for (const entry of fs.readdirSync(cronDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;

        const routeFile = path.join(cronDir, entry.name, 'route.ts');
        if (!fs.existsSync(routeFile)) continue;

        const src = fs.readFileSync(routeFile, 'utf-8');
        const playbookIds = [...src.matchAll(/\bplaybookId\s*:\s*'([^']+)'/g)].map(m => m[1]);
        for (const playbookId of new Set(playbookIds)) {
            const routeNames = declaredRoutes.get(playbookId) ?? new Set();
            routeNames.add(entry.name);
            declaredRoutes.set(playbookId, routeNames);
        }
    }

    return declaredRoutes;
}

// ---------------------------------------------------------------------------
// Load source data
// ---------------------------------------------------------------------------

const serverAgentIdsSrc = fs.readFileSync(
    path.join(repoRoot, 'src/server/agents/agent-definitions.ts'), 'utf-8'
);
const registryPath = path.join(repoRoot, 'src/lib/agents/registry.ts');

const SERVER_AGENT_IDS = extractUnionMembers(serverAgentIdsSrc, 'AgentId');

const REGISTRY_AGENT_IDS = readRegistryAgentIds(registryPath);

const CATALOG_PLAYBOOK_IDS = [
    ...readQuotedObjectKeys(path.join(repoRoot, 'src/config/playbooks.ts'), 'PLAYBOOKS'),
    ...readTierPlaybookIds(path.join(repoRoot, 'src/config/tier-playbook-templates.ts')),
];

const READINESS_ENTRIES = readReadinessEntries(
    path.join(repoRoot, 'src/config/playbook-readiness.ts')
);
const READINESS_KEYS = READINESS_ENTRIES.map(([id]) => id);
const EXECUTABLE_PLAYBOOK_IDS = READINESS_ENTRIES
    .filter(([, readiness]) => readiness === 'executable_now')
    .map(([id]) => id);

const { ids: CONTRACT_AGENT_IDS, source: CONTRACT_AGENT_SOURCE } = readContractAgentIds();

const CRON_DECLARED_PLAYBOOK_ROUTES = readCronDeclaredPlaybookRoutes(
    path.join(repoRoot, 'src/app/api/cron')
);

// ---------------------------------------------------------------------------
// Manual mappings (cross-file joins — cannot be source-derived without TS)
// ---------------------------------------------------------------------------

// Agents in server AgentId type but intentionally not yet in registry.
// Add here with justification rather than silently failing.
const KNOWN_REGISTRY_GAPS = new Set([
    'big_worm', // In AgentId type, no AGENT_CAPABILITY entry yet — orphaned type
]);

// Shared or legacy cron routes that back executable_now playbooks but do not
// self-declare a playbookId in source. Keep this list narrow and documented.
const EXECUTABLE_CRON_ROUTE_ALIASES = {
    'weekly-competitive-snapshot': ['competitive-intel'],
    'pro-competitive-brief': ['competitive-intel'],
    'weekly-loyalty-health': ['weekly-monday-command'],
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

function checkAgentContractCoverage() {
    const allTsAgents = new Set([...SERVER_AGENT_IDS, ...REGISTRY_AGENT_IDS]);
    const contractSet = new Set(CONTRACT_AGENT_IDS);

    // Agents in TypeScript but missing from the contract doc
    const missingFromContract = [...allTsAgents]
        .filter(id => !contractSet.has(id) && !KNOWN_REGISTRY_GAPS.has(id))
        .map(id => `  UNDOCUMENTED: "${id}" is in TypeScript but missing from agent-contract.md`);

    // Agents in the contract but not in any TypeScript file
    const contractOrphans = CONTRACT_AGENT_IDS
        .filter(id => !allTsAgents.has(id))
        .map(id => `  GHOST: "${id}" is in agent-contract.md but not in any TypeScript file`);

    const issues = [...missingFromContract, ...contractOrphans];
    return {
        name: 'Agent contract covers all TypeScript agents (and vice versa)',
        passed: issues.length === 0,
        issues,
    };
}

function checkExecutablePlaybooksHaveCronRoutes() {
    const cronDir = path.join(repoRoot, 'src/app/api/cron');
    if (!fs.existsSync(cronDir)) {
        return { name: 'executable_now playbooks have cron routes', passed: true, issues: ['  SKIP: cron directory not found'] };
    }
    const cronRoutes = new Set(
        fs.readdirSync(cronDir, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name)
    );

    const executableSet = new Set(EXECUTABLE_PLAYBOOK_IDS);
    const issues = Object.keys(EXECUTABLE_CRON_ROUTE_ALIASES)
        .filter(id => !executableSet.has(id))
        .map(id => `  STALE ALIAS: "${id}" is aliased in EXECUTABLE_CRON_ROUTE_ALIASES but is not executable_now`);

    for (const playbookId of EXECUTABLE_PLAYBOOK_IDS) {
        const expectedRoutes = new Set([
            ...(CRON_DECLARED_PLAYBOOK_ROUTES.get(playbookId) ?? []),
            ...(EXECUTABLE_CRON_ROUTE_ALIASES[playbookId] ?? []),
        ]);

        if (expectedRoutes.size === 0) {
            issues.push(`  UNMAPPED EXECUTABLE: "${playbookId}" is executable_now but no cron route declares it and no alias exists`);
            continue;
        }

        const missingRoutes = [...expectedRoutes].filter(route => !cronRoutes.has(route));
        if (missingRoutes.length === expectedRoutes.size) {
            issues.push(`  MISSING CRON: "${playbookId}" is executable_now but none of its expected cron routes exist (${[...expectedRoutes].join(', ')})`);
        } else if (missingRoutes.length > 0) {
            issues.push(`  STALE CRON ROUTE: "${playbookId}" points at missing route(s): ${missingRoutes.join(', ')}`);
        }
    }

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
console.log(`  Source: ${SERVER_AGENT_IDS.length} server agents, ${REGISTRY_AGENT_IDS.length} registry agents, ${CONTRACT_AGENT_IDS.length} contract agents (${path.relative(repoRoot, CONTRACT_AGENT_SOURCE)})`);
console.log(`  Source: ${CATALOG_PLAYBOOK_IDS.length} catalog playbooks, ${READINESS_KEYS.length} readiness keys, ${EXECUTABLE_PLAYBOOK_IDS.length} executable_now\n`);

const results = [
    checkAllPlaybooksClassified(),
    checkNoGhostReadinessEntries(),
    checkRegistryAgentsInServerDefinitions(),
    checkServerAgentsInRegistry(),
    checkAgentContractCoverage(),
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
