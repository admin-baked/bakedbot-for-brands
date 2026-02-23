/**
 * Jina AI Competitive Intelligence Integration Test
 *
 * Tests the full Jina-powered pipeline for Thrive Syracuse:
 *   1. Search  — discover dispensary competitors in Syracuse NY
 *   2. Rerank  — score results by menu-monitoring suitability
 *   3. Reader  — scrape top competitor pages for pricing/product data
 *
 * Usage:
 *   node scripts/test-jina-competitive-intel.mjs
 *   node scripts/test-jina-competitive-intel.mjs --verbose
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local');
try {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
} catch { /* no .env.local */ }

const JINA_KEY = process.env.JINA_API_KEY;
const VERBOSE  = process.argv.includes('--verbose');

if (!JINA_KEY) {
  console.error('❌ JINA_API_KEY missing from .env.local');
  process.exit(1);
}

const jinaHeaders = {
  'Accept': 'application/json',
  'Authorization': `Bearer ${JINA_KEY}`,
};

// ── helpers ──────────────────────────────────────────────────────────────────
function divider(title) {
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(55));
}

function elapsed(start) { return `${Date.now() - start}ms`; }

// =============================================================================
// STAGE 1 — Jina Search: discover competitors
// =============================================================================
divider('STAGE 1 — Jina Search: find Syracuse competitors');

const searchQuery = 'cannabis dispensary menu prices Syracuse NY';
console.log(`Query: "${searchQuery}"`);

const t1 = Date.now();
const sRes = await fetch(`https://s.jina.ai/${encodeURIComponent(searchQuery)}`, {
  headers: { ...jinaHeaders, 'X-With-Links-Summary': 'true' },
  signal: AbortSignal.timeout(30000),
});
const sData = await sRes.json();

if (sData.code !== 200 || !Array.isArray(sData.data)) {
  console.error('❌ Search failed:', JSON.stringify(sData).substring(0, 300));
  process.exit(1);
}

console.log(`✅ ${sData.data.length} results  (${elapsed(t1)})\n`);
const searchResults = sData.data.map((r, i) => ({
  index: i,
  title: r.title || '(no title)',
  url: r.url,
  snippet: (r.description || r.content || '').substring(0, 150).replace(/\n/g, ' '),
}));

searchResults.forEach(r => {
  console.log(`[${r.index + 1}] ${r.title}`);
  console.log(`    ${r.url}`);
  if (VERBOSE) console.log(`    ${r.snippet}`);
});

// =============================================================================
// STAGE 2 — Jina Reranker: score for menu-monitoring suitability
// =============================================================================
divider('STAGE 2 — Jina Reranker: score for price monitoring');

const rerankerQuery = 'cannabis dispensary product menu with prices and inventory for competitor price tracking';
console.log(`Rerank query: "${rerankerQuery}"\n`);

const t2 = Date.now();
const rrRes = await fetch('https://api.jina.ai/v1/rerank', {
  method: 'POST',
  headers: { ...jinaHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'jina-reranker-v2-base-multilingual',
    query: rerankerQuery,
    documents: searchResults.map(r => ({
      id: String(r.index),
      text: `${r.title}. ${r.snippet}. URL: ${r.url}`,
    })),
    top_n: 5,
    return_documents: true,
  }),
  signal: AbortSignal.timeout(20000),
});
const rrData = await rrRes.json();

if (!rrData.results) {
  console.error('❌ Reranker failed:', JSON.stringify(rrData).substring(0, 300));
  process.exit(1);
}

console.log(`✅ Reranked ${rrData.results.length} results  (${elapsed(t2)})`);
console.log(`   Model: ${rrData.model} | Tokens: ${rrData.usage?.total_tokens}\n`);

// Pick top 3 direct competitor pages (exclude aggregators as primary scrape targets)
const AGGREGATORS = ['yelp.com', 'leafly.com', 'weedmaps.com', 'reddit.com', 'google.com', 'syracuse.com', 'cnycentral.com'];
const isAggregator = url => AGGREGATORS.some(a => url.includes(a));

const ranked = rrData.results.map(r => {
  const orig = searchResults[parseInt(r.document?.id ?? r.index)];
  return { ...orig, score: r.relevance_score, isAggregator: isAggregator(orig?.url || '') };
});

console.log('Ranked results:');
ranked.forEach((r, i) => {
  const tag = r.isAggregator ? '[aggregator]' : '[direct]   ';
  console.log(`  ${i + 1}. ${tag}  score=${r.score.toFixed(4)}  ${r.title}`);
  console.log(`            ${r.url}`);
});

const directTargets = ranked.filter(r => !r.isAggregator).slice(0, 3);
const aggregatorTargets = ranked.filter(r => r.isAggregator).slice(0, 1);
const scrapeTargets = [...directTargets, ...aggregatorTargets];

console.log(`\n→ Selected ${directTargets.length} direct competitors + ${aggregatorTargets.length} aggregator for scraping`);

// =============================================================================
// STAGE 3 — Jina Reader: scrape competitor pages
// =============================================================================
divider('STAGE 3 — Jina Reader: scrape competitor pages');

const scrapeResults = [];

for (const target of scrapeTargets) {
  if (!target?.url) continue;
  console.log(`\nScraping: ${target.url}`);
  const t3 = Date.now();
  try {
    const rRes = await fetch(`https://r.jina.ai/${encodeURIComponent(target.url)}`, {
      headers: {
        ...jinaHeaders,
        'X-Return-Format': 'markdown',
        'X-Timeout': '20',
      },
      signal: AbortSignal.timeout(25000),
    });
    const rData = await rRes.json();

    if (rData.code !== 200 || !rData.data) {
      console.log(`  ⚠️  Reader returned code=${rData.code}: ${rData.status || 'unknown'}`);
      scrapeResults.push({ ...target, success: false, error: rData.status });
      continue;
    }

    const { title, description, content, url: finalUrl, usage } = rData.data;
    const chars = (content || '').length;
    const tokens = usage?.tokens || '?';

    console.log(`  ✅ ${elapsed(t3)}  |  ${chars} chars  |  ${tokens} tokens`);
    console.log(`  Title: ${title}`);
    console.log(`  Desc:  ${(description || '').substring(0, 120)}`);

    // Heuristic: look for price patterns in markdown
    const priceMatches = (content || '').match(/\$\d+(\.\d{2})?/g) || [];
    const uniquePrices = [...new Set(priceMatches)].slice(0, 10);
    console.log(`  Prices found: ${uniquePrices.length > 0 ? uniquePrices.join('  ') : '(none detected)'}`);

    // Look for product keywords
    const productKeywords = ['flower', 'vape', 'cartridge', 'edible', 'gummy', 'concentrate', 'preroll', 'pre-roll', 'tincture'];
    const foundKeywords = productKeywords.filter(k => (content || '').toLowerCase().includes(k));
    console.log(`  Product types: ${foundKeywords.length > 0 ? foundKeywords.join(', ') : '(none detected)'}`);

    if (VERBOSE) {
      console.log('\n  --- Content preview (first 500 chars) ---');
      console.log((content || '').substring(0, 500));
      console.log('  --- end preview ---');
    }

    scrapeResults.push({
      ...target,
      success: true,
      title: title || target.title,
      description,
      chars,
      tokens,
      priceCount: priceMatches.length,
      productTypes: foundKeywords,
      finalUrl: finalUrl || target.url,
    });
  } catch (e) {
    console.log(`  ❌ Failed: ${e.message}`);
    scrapeResults.push({ ...target, success: false, error: e.message });
  }
}

// =============================================================================
// SUMMARY
// =============================================================================
divider('SUMMARY');

const successful = scrapeResults.filter(r => r.success);
const failed     = scrapeResults.filter(r => !r.success);

console.log(`Scraped: ${successful.length} succeeded | ${failed.length} failed\n`);

if (successful.length > 0) {
  console.log('Competitors ready for price monitoring:');
  successful.forEach(r => {
    console.log(`\n  • ${r.title}`);
    console.log(`    URL:     ${r.finalUrl || r.url}`);
    console.log(`    Content: ${r.chars} chars / ${r.tokens} tokens`);
    console.log(`    Prices:  ${r.priceCount} price instances found`);
    console.log(`    Types:   ${r.productTypes?.join(', ') || 'unknown'}`);
    console.log(`    Rerank:  ${r.score?.toFixed(4)} / ${r.isAggregator ? 'aggregator' : 'direct'}`);
  });
}

if (failed.length > 0) {
  console.log('\nFailed (likely JS-only or age-gated):');
  failed.forEach(r => console.log(`  • ${r.url}  — ${r.error}`));
}

console.log('\n');
console.log('Next steps:');
console.log('  1. Register successful direct competitors via EzalAgent.trackCompetitor()');
console.log('  2. Use Jina Reader in discovery-fetcher.ts instead of raw fetch() + Cheerio');
console.log('  3. Use Jina Reranker to score insights by relevance before surfacing in dashboard');
console.log('  4. Use Jina Embeddings for semantic product matching in competitor-pricing.ts');
