#!/usr/bin/env node
/**
 * Test Marty's Gmail search tool by hitting the production pressure-test endpoint.
 *
 * Usage:
 *   node scripts/test-marty-gmail.mjs
 *   node scripts/test-marty-gmail.mjs --query "subject:bakedbot dispensary"
 *
 * This script runs 3 Gmail search questions through Marty:
 *   1. Check if Gmail is connected (check_connections)
 *   2. Search for dispensary prospect threads
 *   3. Search for Ultra Cannabis / Endo / Lucky Cannabis specifically
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_CANONICAL_URL
  || 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET not set in .env.local');
  process.exit(1);
}

const customQuery = process.argv.find(a => a.startsWith('--query='))?.split('=').slice(1).join('=');

async function askMarty(question, category = 'Tool Usage') {
  const res = await fetch(`${BASE_URL}/api/test/marty-pressure`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CRON_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, category, agent: 'marty', orgId: 'org_bakedbot_internal' }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function main() {
  console.log(`\n🤖 Marty Gmail Tool Test — ${new Date().toLocaleString()}`);
  console.log(`📡 Endpoint: ${BASE_URL}/api/test/marty-pressure\n`);

  const questions = customQuery
    ? [{ label: 'Custom search', q: customQuery }]
    : [
        {
          label: '1. Connection check',
          q: 'Run check_connections and tell me if Gmail is working. Just the Gmail status — one sentence.',
        },
        {
          label: '2. Dispensary prospect search',
          q: 'Search my Gmail inbox for emails from or about dispensaries — any threads mentioning cannabis, dispensary, Ultra Cannabis, Endo, Lucky Cannabis, or BakedBot outreach. List the thread subjects and sender emails you find. Be concise.',
        },
        {
          label: '3. Targeted search: Ultra / Endo / Lucky',
          q: 'Search Gmail for threads matching "Ultra Cannabis OR Endo dispensary OR Lucky Cannabis". List any email addresses, names, and subjects you find.',
        },
      ];

  const prospects = [];

  for (const { label, q } of questions) {
    console.log(`\n─── ${label} ─────────────────────────────`);
    console.log(`Q: ${q.slice(0, 100)}${q.length > 100 ? '...' : ''}\n`);

    try {
      const result = await askMarty(q);

      console.log(`Grade: ${result.grade} | Elapsed: ${result.elapsed}`);
      if (result.toolsUsed?.length > 0) {
        console.log(`Tools used: ${result.toolsUsed.map(t => t.name).join(', ')}`);
      } else {
        console.log('Tools used: (none)');
      }
      console.log(`\nMarty says:\n${result.response}`);

      // Extract any email addresses mentioned in response
      const emailMatches = result.response.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
      const filtered = emailMatches.filter(e => !e.includes('bakedbot') && !e.includes('martez'));
      if (filtered.length > 0) {
        prospects.push(...filtered);
        console.log(`\n📧 Emails found: ${filtered.join(', ')}`);
      }
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
    }
  }

  if (prospects.length > 0) {
    const unique = [...new Set(prospects)];
    console.log('\n\n══════════════════════════════════════════');
    console.log('📋 PROSPECT EMAIL ADDRESSES FOUND');
    console.log('══════════════════════════════════════════');
    unique.forEach(e => console.log(`  ${e}`));
    console.log('══════════════════════════════════════════\n');
  } else {
    console.log('\n\n📋 No external prospect emails extracted from responses.\n');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
