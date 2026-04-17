#!/usr/bin/env node
/**
 * Smoke Test — Marty Board Tools
 *
 * Tests createAgentBoardTask + getAgentBoardSummary logic directly
 * against Firestore (same path the new Marty tools use).
 *
 * Usage: node scripts/smoke-marty-board-tools.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  envVars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
}

const serviceAccount = JSON.parse(
  Buffer.from(envVars.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const COLLECTION = 'agent_tasks';

async function smokeTest() {
  console.log('\n🔬 Marty Board Tools — Smoke Test\n');

  // --- Test 1: createAgentBoardTask ---
  console.log('1️⃣  createAgentBoardTask → create a test task for leo...');
  const now = new Date().toISOString();
  const task = {
    title: '[Leo] SMOKE TEST — Revenue Board Activation',
    body: '**Smoke test task** created by `smoke-marty-board-tools.mjs`. Delete after verification.\n\nVerifies Marty can create board tasks from Slack.',
    status: 'open',
    stoplight: 'gray',
    priority: 'normal',
    category: 'other',
    reportedBy: 'marty',
    assignedTo: 'leo',
    triggeredBy: 'agent',
    steps: [],
    createdAt: now,
    updatedAt: now,
  };
  const ref = await db.collection(COLLECTION).add(task);
  console.log(`   ✅ Task created: ${ref.id}`);

  // --- Test 2: getAgentBoardSummary ---
  console.log('\n2️⃣  getAgentBoardSummary → query board state...');
  const [active, recent] = await Promise.all([
    db.collection(COLLECTION)
      .where('status', 'in', ['open', 'claimed', 'in_progress', 'escalated'])
      .limit(100)
      .get(),
    db.collection(COLLECTION)
      .where('status', 'in', ['done', 'wont_fix'])
      .limit(10)
      .get(),
  ]);
  console.log(`   ✅ Active tasks: ${active.size}`);
  console.log(`   ✅ Recent completed: ${recent.size}`);

  // Group by assignee
  const byAgent = {};
  active.docs.forEach(doc => {
    const d = doc.data();
    const agent = d.assignedTo || 'unassigned';
    byAgent[agent] = (byAgent[agent] || 0) + 1;
  });
  console.log('\n   Board by agent:');
  Object.entries(byAgent).sort((a, b) => b[1] - a[1]).forEach(([agent, count]) => {
    console.log(`     ${agent}: ${count} open task(s)`);
  });

  // --- Test 3: Clean up smoke task ---
  console.log(`\n3️⃣  Cleaning up smoke test task ${ref.id}...`);
  await db.collection(COLLECTION).doc(ref.id).delete();
  console.log('   ✅ Smoke task deleted');

  console.log('\n✅ All smoke tests passed. Marty board tools are ready.\n');
  console.log('Board URL: https://bakedbot.ai/dashboard/admin/agent-board\n');
}

smokeTest().catch(err => {
  console.error('❌ Smoke test failed:', err.message);
  process.exit(1);
});
