#!/usr/bin/env node
/**
 * Seed Super User Playbooks
 *
 * Creates/updates internal BakedBot playbooks in the `playbooks/` Firestore collection
 * with orgId = 'bakedbot-internal'.
 *
 * Includes:
 *   - NY Biz Dev Outreach Pipeline (weekday 8 AM, draft-first, CEO approval required)
 *
 * Usage: node scripts/seed-super-user-playbooks.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- Firebase Admin Init ---
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

const serviceAccountKey = envVars.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}

const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// --- Playbook definitions ---

const SUPER_USER_ORG = 'bakedbot-internal';

const SUPER_USER_PLAYBOOKS = [
  {
    name: 'NY Biz Dev Outreach Pipeline',
    description:
      'Daily NY dispensary outreach — researches new leads, generates email drafts for CEO review, tracks CRM contacts. Runs weekdays at 8 AM. CEO reviews and approves drafts before Gmail sends.',
    agent: 'jack',
    agentId: 'jack',
    category: 'business_development',
    status: 'active',
    active: true,
    requiresApproval: true,
    triggers: [
      { id: 'trigger-schedule', type: 'schedule', name: 'Weekday Morning', cron: '0 8 * * 1-5', enabled: true },
      { id: 'trigger-manual', type: 'manual', name: 'Manual Run', enabled: true },
    ],
    steps: [
      {
        action: 'run_cron',
        params: {
          endpoint: '/api/cron/ny-outreach-runner',
          description: 'Research new leads + generate email drafts for review',
        },
        retryOnFailure: true,
      },
      {
        action: 'notify',
        params: {
          channel: 'inbox',
          description: 'Post pending draft count to CEO inbox for approval',
        },
      },
    ],
  },
  {
    name: 'Executive Morning Intelligence Brief',
    description:
      'Daily 9 AM executive intelligence check — Leo, Jack, Glenda, Linus, and Mike each scan their domain (calendar, email, web) and post a consolidated brief to the CEO inbox. Weekdays only.',
    agent: 'leo',
    agentId: 'leo',
    category: 'executive_intelligence',
    status: 'active',
    active: true,
    requiresApproval: false,
    triggers: [
      { id: 'trigger-schedule', type: 'schedule', name: 'Weekday 9 AM EST', cron: '0 14 * * 1-5', enabled: true },
      { id: 'trigger-manual', type: 'manual', name: 'Manual Run', enabled: true },
    ],
    steps: [
      {
        action: 'run_cron',
        params: {
          endpoint: '/api/cron/executive-proactive-check',
          description: 'All 5 exec agents scan domains and post consolidated brief',
        },
        retryOnFailure: false,
      },
    ],
  },
];

// --- Upsert logic ---

async function upsertPlaybook(data) {
  const now = new Date();

  // Check if a playbook with this name + orgId already exists
  const existing = await db
    .collection('playbooks')
    .where('name', '==', data.name)
    .where('orgId', '==', SUPER_USER_ORG)
    .limit(1)
    .get();

  if (!existing.empty) {
    const docRef = existing.docs[0].ref;
    await docRef.update({
      ...data,
      updatedAt: now,
      orgId: SUPER_USER_ORG,
    });
    console.log(`✅ Updated: "${data.name}" (${docRef.id})`);
    return docRef.id;
  }

  // Create new
  const newDocRef = db.collection('playbooks').doc();
  const playbookData = {
    id: newDocRef.id,
    ...data,
    orgId: SUPER_USER_ORG,
    ownerId: 'system',
    ownerName: 'BakedBot Platform',
    isCustom: false,
    createdAt: now,
    updatedAt: now,
    createdBy: 'seed-script',
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    version: 1,
  };

  await newDocRef.set(playbookData);
  console.log(`✅ Created: "${data.name}" (${newDocRef.id})`);
  return newDocRef.id;
}

async function main() {
  console.log(`\n🌱 Seeding ${SUPER_USER_PLAYBOOKS.length} super user playbooks into 'bakedbot-internal'...\n`);

  for (const playbook of SUPER_USER_PLAYBOOKS) {
    try {
      await upsertPlaybook(playbook);
    } catch (err) {
      console.error(`❌ Failed to upsert "${playbook.name}":`, err.message);
    }
  }

  console.log('\n✅ Done. View at /dashboard/ceo?tab=playbooks\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
