/**
 * Test script: what does thrivesyracuse.com actually return?
 * Tests Firecrawl, RTRVR, and direct HTTP fetch (final fallback path)
 * Usage: node scripts/test-brand-scrape.mjs [url]
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local');
try {
  const envLines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of envLines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
} catch {}

const url = process.argv[2] || 'https://thrivesyracuse.com';
const firecrawlKey = process.env.FIRECRAWL_API_KEY;
const rtrvrKey = process.env.RTRVR_API_KEY;

console.log(`\n=== Brand Scrape Diagnostic ===`);
console.log(`URL: ${url}`);
console.log(`Firecrawl: ${firecrawlKey ? '✅ configured' : '❌ missing'}`);
console.log(`RTRVR:     ${rtrvrKey     ? '✅ configured' : '❌ missing (only in GCP at runtime)'}`);

// ── 1. Firecrawl (if available) ─────────────────────────────────────────────
if (firecrawlKey) {
  console.log('\n--- [1/3] Firecrawl scrape...');
  try {
    const { default: FirecrawlApp } = await import('@mendable/firecrawl-js');
    const app = new FirecrawlApp({ apiKey: firecrawlKey });
    const r = await app.scrape(url, { formats: ['markdown'] });
    if (r.success) {
      console.log('✅ Firecrawl succeeded');
      console.log('  title:      ', r.metadata?.title || '(empty)');
      console.log('  description:', r.metadata?.description || '(empty)');
      console.log(`  markdown:   ${(r.markdown || '').length} chars`);
      console.log('  preview:   ', (r.markdown || '').substring(0, 300));
    } else {
      console.log('❌ Firecrawl failed:', r.error);
    }
  } catch (e) {
    console.log('❌ Firecrawl error:', e.message);
  }
}

// ── 2. RTRVR (if available) ──────────────────────────────────────────────────
if (rtrvrKey) {
  console.log('\n--- [2/3] RTRVR scrape...');
  try {
    const res = await fetch('https://api.rtrvr.ai/agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${rtrvrKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: 'Extract the full page content as clean readable markdown text. Also extract the page title and meta description.',
        urls: [url],
        schema: {
          type: 'object',
          properties: {
            markdown:    { type: 'string', description: 'Full page content as markdown' },
            title:       { type: 'string', description: 'Page <title> or main heading' },
            description: { type: 'string', description: 'Meta description or first paragraph summary' },
          }
        },
        response: { verbosity: 'final' },
      }),
    });
    const data = await res.json();
    if (data.success) {
      const result = data.data?.result;
      console.log('✅ RTRVR succeeded');
      console.log('  title:      ', result?.title || '(empty)');
      console.log('  description:', result?.description || '(empty)');
      console.log(`  markdown:   ${(result?.markdown || '').length} chars`);
      console.log('  preview:   ', (result?.markdown || '').substring(0, 300));
    } else {
      console.log('❌ RTRVR failed:', data.error);
      console.log('  raw:', JSON.stringify(data).substring(0, 300));
    }
  } catch (e) {
    console.log('❌ RTRVR error:', e.message);
  }
} else {
  console.log('\n--- [2/3] RTRVR — skipped (no local key; works in production via GCP secrets)');
}

// ── 3. Direct HTTP fetch (final fallback) ────────────────────────────────────
console.log('\n--- [3/3] Direct HTTP fetch (final fallback)...');
try {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BakedBot/1.0)',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(10000),
  });
  const html = await res.text();
  const titleMatch    = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descMatch     = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
                     || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const ogTitleMatch  = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const ogDescMatch   = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  console.log(`✅ HTTP ${res.status} — ${html.length} chars`);
  console.log('  <title>:        ', titleMatch?.[1]   || '(missing)');
  console.log('  meta description:', descMatch?.[1]    || '(missing)');
  console.log('  og:title:       ', ogTitleMatch?.[1]  || '(missing)');
  console.log('  og:description: ', ogDescMatch?.[1]   || '(missing)');
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log('  text preview:   ', stripped.substring(0, 400));
} catch (e) {
  console.log('❌ Direct fetch error:', e.message);
}
