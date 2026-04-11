#!/usr/bin/env node
/**
 * qa-coverage-map.mjs — Route Coverage Mapper
 *
 * Globs src/app/ for all page.tsx and route.ts files, cross-references against
 * existing test files in tests/e2e/ and tests/, and outputs a gap report.
 *
 * Usage:
 *   node scripts/qa-coverage-map.mjs
 *   node scripts/qa-coverage-map.mjs --json           Output JSON
 *   node scripts/qa-coverage-map.mjs --untested-only   Only show untested routes
 *
 * Designed to be called by Linus or AI test generator to decide what to test next.
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, relative, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const JSON_OUTPUT = process.argv.includes('--json');
const UNTESTED_ONLY = process.argv.includes('--untested-only');

// ============================================================================
// 1. DISCOVER ALL ROUTES
// ============================================================================

function walkDir(dir, files = []) {
    if (!existsSync(dir)) return files;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            // Skip node_modules, hidden dirs
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
            walkDir(full, files);
        } else {
            files.push(full);
        }
    }
    return files;
}

function extractRoutes() {
    const appDir = join(PROJECT_ROOT, 'src', 'app');
    const allFiles = walkDir(appDir);

    const routes = [];
    for (const file of allFiles) {
        const base = basename(file);
        const rel = relative(appDir, file).replace(/\\/g, '/');

        // Next.js pages
        if (base === 'page.tsx' || base === 'page.ts') {
            const routePath = '/' + dirname(rel).replace(/\\/g, '/').replace(/^\.$/, '');
            routes.push({ path: routePath || '/', type: 'page', file: rel });
        }

        // API routes
        if (base === 'route.ts' || base === 'route.tsx') {
            const routePath = '/' + dirname(rel).replace(/\\/g, '/');
            const isApi = routePath.includes('/api/');
            routes.push({ path: routePath, type: isApi ? 'api' : 'route', file: rel });
        }
    }

    return routes.sort((a, b) => a.path.localeCompare(b.path));
}

// ============================================================================
// 2. DISCOVER ALL TESTS
// ============================================================================

function extractTests() {
    const testsDir = join(PROJECT_ROOT, 'tests');
    const e2eDir = join(PROJECT_ROOT, 'tests', 'e2e');
    const legacyE2e = join(PROJECT_ROOT, 'e2e');

    const tests = { e2e: [], unit: [], integration: [] };

    // E2E tests
    for (const dir of [e2eDir, legacyE2e]) {
        if (!existsSync(dir)) continue;
        const files = walkDir(dir).filter(f => f.endsWith('.spec.ts') || f.endsWith('.e2e.test.ts'));
        for (const f of files) {
            const content = readFileSync(f, 'utf-8');
            const routes = [];
            // Extract route references from test content
            const urlMatches = content.matchAll(/(?:goto|navigate|visit|fetch|url)\s*\(\s*['"`]([^'"`]+)['"`]/gi);
            for (const m of urlMatches) routes.push(m[1]);
            // Also check for route patterns in strings
            const routeMatches = content.matchAll(/['"`](\/(?:api\/|dashboard\/|menu\/|signin|customer|brand|tablet)[^'"`]*)['"`]/g);
            for (const m of routeMatches) routes.push(m[1]);

            tests.e2e.push({
                file: relative(PROJECT_ROOT, f).replace(/\\/g, '/'),
                routesCovered: [...new Set(routes)],
            });
        }
    }

    // Unit/integration tests
    if (existsSync(testsDir)) {
        const files = walkDir(testsDir).filter(f =>
            (f.endsWith('.test.ts') || f.endsWith('.test.tsx')) && !f.includes('e2e')
        );
        for (const f of files) {
            const rel = relative(PROJECT_ROOT, f).replace(/\\/g, '/');
            const isIntegration = rel.includes('integration') || rel.includes('.integration.');
            (isIntegration ? tests.integration : tests.unit).push({ file: rel });
        }
    }

    return tests;
}

// ============================================================================
// 3. COMPUTE COVERAGE
// ============================================================================

function computeCoverage(routes, tests) {
    const allTestedRoutes = new Set();

    // Collect all routes referenced in E2E tests
    for (const test of tests.e2e) {
        for (const route of test.routesCovered) {
            // Normalize: strip query params, trailing slashes
            const normalized = route.split('?')[0].replace(/\/$/, '') || '/';
            allTestedRoutes.add(normalized);
        }
    }

    // Match routes to tests
    const coverage = routes.map(route => {
        const normalizedPath = route.path.replace(/\/$/, '') || '/';

        // Direct match
        const directMatch = allTestedRoutes.has(normalizedPath);

        // Partial match (e.g., /dashboard matches /dashboard/products)
        const partialMatch = [...allTestedRoutes].some(tested =>
            normalizedPath.startsWith(tested) || tested.startsWith(normalizedPath)
        );

        // Check if route segment appears in any test filename
        const segments = normalizedPath.split('/').filter(Boolean);
        const lastSegment = segments[segments.length - 1] || '';
        const fileMatch = tests.e2e.some(t =>
            t.file.toLowerCase().includes(lastSegment.toLowerCase().replace(/[[\]]/g, ''))
        );

        const tested = directMatch || fileMatch;
        const partial = !tested && partialMatch;

        return {
            ...route,
            tested,
            partial,
            status: tested ? 'covered' : partial ? 'partial' : 'untested',
        };
    });

    return coverage;
}

// ============================================================================
// 4. OUTPUT
// ============================================================================

function main() {
    const routes = extractRoutes();
    const tests = extractTests();
    const coverage = computeCoverage(routes, tests);

    const covered = coverage.filter(c => c.status === 'covered').length;
    const partial = coverage.filter(c => c.status === 'partial').length;
    const untested = coverage.filter(c => c.status === 'untested').length;
    const total = coverage.length;
    const pct = total > 0 ? Math.round((covered / total) * 100) : 0;

    const report = {
        summary: {
            totalRoutes: total,
            covered,
            partial,
            untested,
            coveragePct: pct,
            pages: routes.filter(r => r.type === 'page').length,
            apiRoutes: routes.filter(r => r.type === 'api').length,
            e2eTests: tests.e2e.length,
            unitTests: tests.unit.length,
            integrationTests: tests.integration.length,
        },
        routes: UNTESTED_ONLY ? coverage.filter(c => c.status === 'untested') : coverage,
    };

    if (JSON_OUTPUT) {
        console.log(JSON.stringify(report, null, 2));
        return;
    }

    // Pretty print
    console.log('\n=== BakedBot QA Coverage Map ===\n');
    console.log(`Routes: ${total} total (${routes.filter(r => r.type === 'page').length} pages, ${routes.filter(r => r.type === 'api').length} API)`);
    console.log(`Tests:  ${tests.e2e.length} E2E | ${tests.unit.length} unit | ${tests.integration.length} integration`);
    console.log(`Coverage: ${covered}/${total} (${pct}%) | Partial: ${partial} | Untested: ${untested}\n`);

    const display = UNTESTED_ONLY ? coverage.filter(c => c.status === 'untested') : coverage;

    const statusIcon = { covered: '\u2705', partial: '\u26A0\uFE0F ', untested: '\u274C' };
    for (const route of display) {
        const icon = statusIcon[route.status];
        const type = route.type === 'api' ? '[API]' : route.type === 'route' ? '[RTE]' : '[PG] ';
        console.log(`  ${icon} ${type} ${route.path}`);
    }

    if (untested > 0) {
        console.log(`\n--- Top priority untested routes (P0/P1) ---`);
        const p0Routes = coverage
            .filter(c => c.status === 'untested' && c.type === 'page')
            .filter(c => !c.path.includes('(') && !c.path.includes('['))  // Skip dynamic/grouped
            .slice(0, 10);
        for (const r of p0Routes) {
            console.log(`  -> ${r.path}`);
        }
    }

    console.log('');
}

main();
