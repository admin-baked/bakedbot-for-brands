#!/usr/bin/env node

/**
 * Query Linus's Letta Memory
 *
 * Inspect what Linus has stored in Letta archival memory after
 * the linus-sleep cron runs.
 *
 * Usage:
 *   LETTA_API_KEY=xxx node scripts/query-linus-letta.mjs
 *   LETTA_API_KEY=xxx node scripts/query-linus-letta.mjs --search "auth middleware"
 *   LETTA_API_KEY=xxx node scripts/query-linus-letta.mjs --stats
 */

const LETTA_BASE_URL = 'https://api.letta.com/v1';
const AGENT_NAME = 'linus-cto';

const args = process.argv.slice(2);
const searchQuery = args.includes('--search') ? args[args.indexOf('--search') + 1] : null;
const statsOnly = args.includes('--stats');

async function lettaRequest(endpoint, options = {}) {
  const apiKey = process.env.LETTA_API_KEY;
  if (!apiKey) {
    // Try fetching from GCP
    try {
      const { execSync } = await import('child_process');
      const key = execSync(
        'gcloud secrets versions access latest --secret=LETTA_API_KEY --project=studio-567050101-bc6e8',
        { encoding: 'utf8' }
      ).trim();
      process.env.LETTA_API_KEY = key;
    } catch {
      console.error('❌ LETTA_API_KEY not set and gcloud fetch failed');
      process.exit(1);
    }
  }

  const res = await fetch(`${LETTA_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LETTA_API_KEY}`,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Letta ${res.status}: ${body}`);
  }
  return res.json();
}

async function main() {
  console.log('🧠 Querying Linus Letta Memory\n');

  // Find the agent
  const agents = await lettaRequest('/agents');
  const linus = agents.find(a => a.name === AGENT_NAME);

  if (!linus) {
    console.log(`❌ Agent "${AGENT_NAME}" not found.`);
    console.log('   Run: node scripts/setup-linus-letta-agent.mjs');
    process.exit(1);
  }

  console.log(`Agent: ${linus.name} (${linus.id})`);
  console.log(`Created: ${linus.created_at}\n`);

  // Fetch archival memory
  const passages = await lettaRequest(`/agents/${linus.id}/archival-memory?limit=500`);
  const codePassages = passages.filter(p =>
    p.text?.includes('linus:code') || p.content?.includes('linus:code')
  );

  if (statsOnly || !searchQuery) {
    console.log(`📊 Memory Stats`);
    console.log(`   Total archival passages: ${passages.length}`);
    console.log(`   Code summaries (linus:code): ${codePassages.length}`);

    if (codePassages.length > 0) {
      console.log(`\n📁 Indexed Files (most recent 10):`);
      codePassages.slice(-10).forEach((p, i) => {
        const text = p.text || p.content || '';
        const pathMatch = text.match(/Path: (src\/[^\s]+)/);
        const dateMatch = text.match(/Indexed: (\d{4}-\d{2}-\d{2})/);
        const path = pathMatch?.[1] || 'unknown path';
        const date = dateMatch?.[1] || 'unknown date';
        console.log(`   ${i + 1}. ${path} (${date})`);
      });
    } else {
      console.log('\n   No code passages yet — waiting for first linus-sleep run.');
      console.log('   Trigger manually: gcloud scheduler jobs run linus-sleep --location=us-central1 --project=studio-567050101-bc6e8');
    }

    // Also check Firestore fallback
    console.log(`\n💾 Firestore linus_code_index:`);
    console.log(`   Check at: https://console.firebase.google.com/project/studio-567050101-bc6e8/firestore/data/linus_code_index`);
  }

  if (searchQuery) {
    console.log(`🔍 Searching for: "${searchQuery}"\n`);
    const results = await lettaRequest(
      `/agents/${linus.id}/archival-memory?query=${encodeURIComponent(searchQuery)}&limit=5`
    );
    if (!results.length) {
      console.log('   No results found.');
    } else {
      results.forEach((r, i) => {
        const text = r.text || r.content || '';
        console.log(`--- Result ${i + 1} ---`);
        console.log(text.slice(0, 600));
        console.log('');
      });
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
