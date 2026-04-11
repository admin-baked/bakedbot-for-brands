#!/usr/bin/env node
/**
 * generate-e2e-tests.mjs — AI-Powered E2E Test Generator (Phase 2)
 *
 * Uses the coverage map to find untested routes, reads their page components,
 * and generates Playwright specs using Groq (free) or Opencode (Zen, free).
 *
 * Usage:
 *   node scripts/generate-e2e-tests.mjs                           # Generate for top 5 untested pages
 *   node scripts/generate-e2e-tests.mjs --route=/pricing          # Generate for specific route
 *   node scripts/generate-e2e-tests.mjs --batch=10                # Generate 10 specs
 *   node scripts/generate-e2e-tests.mjs --dry-run                 # Preview without writing files
 *   node scripts/generate-e2e-tests.mjs --model=groq              # Force Groq (default)
 *   node scripts/generate-e2e-tests.mjs --model=opencode          # Use Opencode Zen (Cloud Run)
 *
 * Output: tests/e2e/generated/<route-slug>.spec.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const ROUTE = args.find(a => a.startsWith('--route='))?.split('=')[1];
const BATCH = parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '5');
const DRY_RUN = args.includes('--dry-run');
const MODEL = args.find(a => a.startsWith('--model='))?.split('=')[1] || 'groq';

// ── Load env ────────────────────────────────────────────────────────────────

function loadEnv() {
    const envPath = join(PROJECT_ROOT, '.env.local');
    if (!existsSync(envPath)) return;
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
}
loadEnv();

// ── Reference spec (few-shot example) ───────────────────────────────────────

const REFERENCE_SPEC = readFileSync(
    join(PROJECT_ROOT, 'tests/e2e/ci-smoke/current-public-flows.spec.ts'),
    'utf-8'
);

// ── Route discovery ─────────────────────────────────────────────────────────

function walkDir(dir, files = []) {
    if (!existsSync(dir)) return files;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
            walkDir(full, files);
        } else {
            files.push(full);
        }
    }
    return files;
}

function findUntestedRoutes() {
    const appDir = join(PROJECT_ROOT, 'src', 'app');
    const allFiles = walkDir(appDir);
    const e2eDir = join(PROJECT_ROOT, 'tests', 'e2e');
    const existingSpecs = existsSync(e2eDir)
        ? walkDir(e2eDir).map(f => readFileSync(f, 'utf-8')).join('\n')
        : '';

    const routes = [];
    for (const file of allFiles) {
        const base = basename(file);
        if (base !== 'page.tsx' && base !== 'page.ts') continue;

        const rel = relative(appDir, file).replace(/\\/g, '/');
        const routePath = '/' + dirname(rel).replace(/\\/g, '/').replace(/^\.$/, '');

        // Skip dynamic/grouped routes, dashboard (needs auth), and API routes
        if (routePath.includes('[') || routePath.includes('(')) continue;
        if (routePath.startsWith('/dashboard')) continue;
        if (routePath.startsWith('/admin')) continue;

        // Check if already tested
        const slug = routePath.replace(/\//g, '-').replace(/^-/, '') || 'home';
        const isTested = existingSpecs.includes(routePath) ||
            existsSync(join(e2eDir, 'generated', `${slug}.spec.ts`));

        if (!isTested) {
            routes.push({ path: routePath || '/', file: file, slug });
        }
    }

    return routes;
}

// ── Read page component source ──────────────────────────────────────────────

function readPageSource(filePath) {
    try {
        const content = readFileSync(filePath, 'utf-8');
        // Truncate to ~3000 chars to stay within token budget
        return content.slice(0, 3000);
    } catch {
        return '// Could not read page source';
    }
}

// ── AI: Generate spec via Groq ──────────────────────────────────────────────

async function generateViaGroq(routePath, pageSource, slug) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY not set');

    const prompt = buildPrompt(routePath, pageSource, slug);

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'You are an expert Playwright test writer for Next.js applications. Output ONLY the TypeScript test file content, no markdown fences, no explanation.' },
                { role: 'user', content: prompt },
            ],
            max_tokens: 2048,
            temperature: 0.3,
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
}

// ── AI: Generate spec via Opencode (Cloud Run) ──────────────────────────────

async function generateViaOpencode(routePath, pageSource, slug) {
    const url = process.env.OPENCODE_AGENT_URL;
    const password = process.env.OPENCODE_SERVER_PASSWORD;
    if (!url) throw new Error('OPENCODE_AGENT_URL not set');

    const prompt = buildPrompt(routePath, pageSource, slug);

    const res = await fetch(`${url}/run`, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`opencode:${password}`).toString('base64'),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: `Write a Playwright E2E test for this Next.js page. Output ONLY TypeScript code.\n\n${prompt}`,
            model: 'zen/deepseek-r1',
        }),
    });

    if (!res.ok) throw new Error(`Opencode error ${res.status}`);
    const data = await res.json();
    return data.output || data.result || '';
}

// ── Build the generation prompt ─────────────────────────────────────────────

function buildPrompt(routePath, pageSource, slug) {
    return `Generate a Playwright E2E test for the Next.js page at route "${routePath}".

## Reference spec (follow this exact style):
\`\`\`typescript
${REFERENCE_SPEC}
\`\`\`

## Page source code (${routePath}):
\`\`\`tsx
${pageSource}
\`\`\`

## Requirements:
1. Import from '@playwright/test' (expect, test, type Page)
2. Use test.describe with a descriptive group name
3. Test that the page loads (HTTP 200, no error state)
4. Test key visible elements (headings, buttons, links, forms)
5. Test any interactive elements (clicks, navigation)
6. If the page has an age gate, use the grantAgeAccess() helper from the reference
7. Use page.getByRole(), page.getByText(), page.getByTestId() — never raw CSS selectors
8. Set reasonable timeouts (60s for page load, 10s for elements)
9. File name will be: tests/e2e/generated/${slug}.spec.ts
10. Do NOT mock any APIs — test against the real local dev server
11. Keep it simple — 3-5 test cases max
12. Output ONLY the TypeScript code, no markdown, no explanation`;
}

// ── Clean AI output ─────────────────────────────────────────────────────────

function cleanOutput(raw) {
    let code = raw.trim();
    // Strip markdown fences if the model added them anyway
    code = code.replace(/^```(?:typescript|ts)?\n?/m, '').replace(/\n?```$/m, '');
    // Ensure it starts with an import
    if (!code.startsWith('import')) {
        const importIdx = code.indexOf('import');
        if (importIdx > 0) code = code.slice(importIdx);
    }
    return code;
}

// ── AI: Generate spec via Gemini Flash (fallback — near-free) ───────────

async function generateViaGemini(routePath, pageSource, slug) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    const prompt = buildPrompt(routePath, pageSource, slug);

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `You are an expert Playwright test writer for Next.js applications. Output ONLY the TypeScript test file content, no markdown fences, no explanation.\n\n${prompt}` }] }],
            generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── AI: Tier chain (Groq free → Gemini Flash → fail) ───────────────────

async function generateWithFallback(routePath, pageSource, slug) {
    // Try Groq first (free)
    if (process.env.GROQ_API_KEY) {
        try {
            return await generateViaGroq(routePath, pageSource, slug);
        } catch (err) {
            if (err.message.includes('429') || err.message.includes('rate_limit')) {
                console.log('    Groq rate limited, falling back to Gemini Flash...');
            } else {
                throw err;
            }
        }
    }

    // Fallback: Gemini Flash
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) {
        return await generateViaGemini(routePath, pageSource, slug);
    }

    // Fallback: Opencode
    if (process.env.OPENCODE_AGENT_URL) {
        return await generateViaOpencode(routePath, pageSource, slug);
    }

    throw new Error('No AI provider available (set GROQ_API_KEY, GEMINI_API_KEY, or OPENCODE_AGENT_URL)');
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n=== BakedBot AI E2E Test Generator ===\n');
    console.log(`Model: ${MODEL} | Batch: ${BATCH} | Dry run: ${DRY_RUN}\n`);

    // Find routes to test
    let targets;
    if (ROUTE) {
        // Normalize: Git Bash on Windows may expand /pricing to C:/Program Files/Git/pricing
        const cleanRoute = ROUTE.replace(/^[A-Z]:.*\/Git\//i, '/').replace(/\\/g, '/');
        const appDir = join(PROJECT_ROOT, 'src', 'app');
        const routeDir = cleanRoute === '/' ? appDir : join(appDir, cleanRoute.replace(/^\//, ''));
        const pageFile = existsSync(join(routeDir, 'page.tsx'))
            ? join(routeDir, 'page.tsx')
            : join(routeDir, 'page.ts');
        const slug = cleanRoute.replace(/\//g, '-').replace(/^-/, '') || 'home';
        targets = [{ path: cleanRoute, file: pageFile, slug }];
    } else {
        targets = findUntestedRoutes().slice(0, BATCH);
    }

    if (targets.length === 0) {
        console.log('No untested routes found! Coverage is complete.');
        return;
    }

    console.log(`Found ${targets.length} routes to generate tests for:\n`);
    for (const t of targets) {
        console.log(`  ${t.path} → tests/e2e/generated/${t.slug}.spec.ts`);
    }
    console.log('');

    // Ensure output directory
    const outDir = join(PROJECT_ROOT, 'tests', 'e2e', 'generated');
    if (!DRY_RUN && !existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
    }

    // Generate tests
    const generate = MODEL === 'opencode' ? generateViaOpencode : MODEL === 'gemini' ? generateViaGemini : generateWithFallback;
    let generated = 0;
    let failed = 0;

    for (const target of targets) {
        console.log(`Generating: ${target.path}...`);
        const pageSource = readPageSource(target.file);

        try {
            const raw = await generate(target.path, pageSource, target.slug);
            const code = cleanOutput(raw);

            if (!code.includes('import') || !code.includes('test')) {
                console.log(`  SKIP — AI output didn't look like a valid test`);
                failed++;
                continue;
            }

            if (DRY_RUN) {
                console.log(`  [DRY RUN] Would write ${code.split('\n').length} lines`);
                console.log(`  Preview: ${code.split('\n')[0]}...`);
            } else {
                const outPath = join(outDir, `${target.slug}.spec.ts`);
                writeFileSync(outPath, code);
                console.log(`  DONE → ${relative(PROJECT_ROOT, outPath)} (${code.split('\n').length} lines)`);
            }
            generated++;
        } catch (err) {
            console.error(`  FAIL — ${err.message}`);
            failed++;
        }
    }

    console.log(`\n=== Results: ${generated} generated, ${failed} failed ===\n`);

    if (!DRY_RUN && generated > 0) {
        console.log('Next steps:');
        console.log('  1. Review generated specs: tests/e2e/generated/');
        console.log('  2. Run them: npx playwright test tests/e2e/generated/');
        console.log('  3. Fix any flaky selectors');
        console.log('  4. Move stable specs to tests/e2e/ and commit');
    }
}

main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
