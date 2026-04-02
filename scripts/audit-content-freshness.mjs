#!/usr/bin/env node
/**
 * Content Freshness Audit Script
 *
 * Scans all customer-facing content surfaces and reports staleness.
 * No Firestore dependency — reads the content registry and help article index
 * to produce a local freshness report. Fast enough to run in CI or ad-hoc.
 *
 * Usage:
 *   node scripts/audit-content-freshness.mjs               # Full report
 *   node scripts/audit-content-freshness.mjs --json         # JSON output
 *   node scripts/audit-content-freshness.mjs --stale-only   # Only stale + critical
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const staleOnly = args.includes('--stale-only');

// ---------------------------------------------------------------------------
// We can't import TS modules directly, so we parse the help index for dates
// and mirror the registry scoring logic here.
// ---------------------------------------------------------------------------

const THRESHOLDS = {
    default: { aging: 30, stale: 60, critical: 90 },
    highImpact: { aging: 14, stale: 30, critical: 45 },
    legal: { aging: 90, stale: 180, critical: 365 },
};

function daysBetween(dateStr, now) {
    const d = new Date(dateStr + 'T00:00:00Z');
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function scoreEntry(entry, now) {
    const days = daysBetween(entry.lastVerified, now);
    const t = entry.category === 'legal'
        ? THRESHOLDS.legal
        : entry.highImpact
            ? THRESHOLDS.highImpact
            : THRESHOLDS.default;

    let level;
    if (days >= t.critical) level = 'critical';
    else if (days >= t.stale) level = 'stale';
    else if (days >= t.aging) level = 'aging';
    else level = 'fresh';

    return { id: entry.id, title: entry.title, category: entry.category, level, days, owner: entry.owner || '—' };
}

// ---------------------------------------------------------------------------
// Parse help article index for lastUpdated dates
// ---------------------------------------------------------------------------

function parseHelpArticleDates() {
    const indexPath = path.join(ROOT, 'src/content/help/_index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');
    const dates = {};

    // Match patterns like: 'getting-started/welcome': { ... lastUpdated: '2026-02-05' ...
    const entryRegex = /['"]([^'"]+)['"]\s*:\s*\{[^}]*lastUpdated:\s*['"](\d{4}-\d{2}-\d{2})['"]/gs;
    let match;
    while ((match = entryRegex.exec(content)) !== null) {
        dates[match[1]] = match[2];
    }
    return dates;
}

// ---------------------------------------------------------------------------
// Static content registry (mirrors content-registry.ts — kept in sync)
// ---------------------------------------------------------------------------

const REGISTRY = [
    { id: '/', title: 'Homepage', category: 'homepage', lastVerified: '2026-02-05', highImpact: true, owner: 'marketing' },
    { id: '/pricing', title: 'Pricing Page', category: 'pricing', lastVerified: '2026-02-22', highImpact: true, owner: 'marketing' },
    { id: '/pricing/launch', title: 'Launch Pricing', category: 'pricing', lastVerified: '2026-02-05', owner: 'marketing' },
    { id: '/get-started', title: 'Get Started', category: 'onboarding', lastVerified: '2026-02-05', highImpact: true, owner: 'marketing' },
    { id: '/onboarding', title: 'Onboarding Flow', category: 'onboarding', lastVerified: '2026-02-05', highImpact: true, owner: 'product' },
    { id: '/onboarding/passport', title: 'Onboarding Passport', category: 'onboarding', lastVerified: '2026-02-05', owner: 'product' },
    { id: '/vs-leafly', title: 'BakedBot vs Leafly', category: 'comparison', lastVerified: '2026-02-05', highImpact: true, owner: 'marketing' },
    { id: '/vs-alpine-iq', title: 'BakedBot vs Alpine IQ', category: 'comparison', lastVerified: '2026-02-05', owner: 'marketing' },
    { id: '/vs-springbig', title: 'BakedBot vs Springbig', category: 'comparison', lastVerified: '2026-02-05', owner: 'marketing' },
    { id: '/vs-terpli', title: 'BakedBot vs Terpli', category: 'comparison', lastVerified: '2026-02-05', owner: 'marketing' },
    { id: '/case-studies', title: 'Case Studies Index', category: 'case-study', lastVerified: '2026-02-05', highImpact: true, owner: 'marketing' },
    { id: '/case-studies/ultra-cannabis', title: 'Ultra Cannabis', category: 'case-study', lastVerified: '2026-02-05', owner: 'marketing' },
    { id: '/case-studies/zaza-factory', title: 'Zaza Factory', category: 'case-study', lastVerified: '2026-02-05', owner: 'marketing' },
    { id: '/free-audit', title: 'Free Audit Tool', category: 'lead-magnet', lastVerified: '2026-02-05', owner: 'marketing' },
    { id: '/contact', title: 'Contact Page', category: 'marketing', lastVerified: '2026-02-05', owner: 'marketing' },
    { id: '/data', title: 'Data Hub', category: 'data', lastVerified: '2026-02-05', owner: 'product' },
    { id: '/privacy-policy', title: 'Privacy Policy', category: 'legal', lastVerified: '2026-02-05', owner: 'legal' },
    { id: '/terms', title: 'Terms of Service', category: 'legal', lastVerified: '2026-02-05', owner: 'legal' },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const now = new Date();
const scores = [];

// Score registry pages
for (const entry of REGISTRY) {
    scores.push(scoreEntry(entry, now));
}

// Score help articles
const helpDates = parseHelpArticleDates();
for (const [key, date] of Object.entries(helpDates)) {
    scores.push(scoreEntry({
        id: `/help/${key}`,
        title: `Help: ${key}`,
        category: 'help',
        lastVerified: date,
        owner: 'docs',
    }, now));
}

// Sort worst-first
scores.sort((a, b) => b.days - a.days);

const filtered = staleOnly ? scores.filter(s => s.level === 'stale' || s.level === 'critical') : scores;

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

if (jsonOutput) {
    const summary = { fresh: 0, aging: 0, stale: 0, critical: 0 };
    for (const s of scores) summary[s.level]++;
    console.log(JSON.stringify({ generatedAt: now.toISOString(), totalPages: scores.length, summary, scores: filtered }, null, 2));
    process.exit(0);
}

// Pretty print
const COLORS = {
    fresh: '\x1b[32m',     // green
    aging: '\x1b[33m',     // yellow
    stale: '\x1b[31m',     // red
    critical: '\x1b[35m',  // magenta
    reset: '\x1b[0m',
};

console.log('\n📋 Content Freshness Audit');
console.log(`   Generated: ${now.toLocaleDateString()}`);
console.log(`   Total pages tracked: ${scores.length}\n`);

const summary = { fresh: 0, aging: 0, stale: 0, critical: 0 };
for (const s of scores) summary[s.level]++;

console.log(`   ✅ Fresh: ${summary.fresh}  |  ⏳ Aging: ${summary.aging}  |  ⚠️  Stale: ${summary.stale}  |  🚨 Critical: ${summary.critical}\n`);

if (filtered.length === 0) {
    console.log('   🎉 All content is fresh!\n');
    process.exit(0);
}

// Table header
console.log('   ' + 'Level'.padEnd(10) + 'Days'.padEnd(8) + 'Category'.padEnd(14) + 'Owner'.padEnd(12) + 'Page');
console.log('   ' + '─'.repeat(80));

for (const s of filtered) {
    const color = COLORS[s.level] || '';
    const reset = COLORS.reset;
    console.log(
        `   ${color}${s.level.padEnd(10)}${reset}` +
        `${String(s.days).padEnd(8)}` +
        `${s.category.padEnd(14)}` +
        `${s.owner.padEnd(12)}` +
        `${s.id}`
    );
}

console.log('');

// Exit code: 1 if any critical items
if (summary.critical > 0) {
    console.log(`   ⛔ ${summary.critical} critical item(s) — content needs immediate attention.\n`);
    process.exit(1);
}

process.exit(0);
