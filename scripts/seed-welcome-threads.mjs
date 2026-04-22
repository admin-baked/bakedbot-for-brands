#!/usr/bin/env node

/**
 * Seed welcome threads for existing pilot customers.
 *
 * Usage:
 *   node scripts/seed-welcome-threads.mjs            # dry run
 *   node scripts/seed-welcome-threads.mjs --apply     # write to Firestore
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';

// ── Config ───────────────────────────────────────────────────────────────────

const PILOT_ORGS = [
  {
    orgId: 'org_thrive_syracuse',
    name: 'Thrive Syracuse',
    role: 'dispensary',
  },
  {
    orgId: 'org_simplypuretrenton',
    name: 'Simply Pure Trenton',
    role: 'dispensary',
  },
  {
    orgId: 'org_ecstatic_edibles',
    name: 'Ecstatic Edibles',
    role: 'brand',
  },
];

const WELCOME_TAG = 'system:welcome';
const INBOX_THREADS_COLLECTION = 'inbox_threads';
const dryRun = !process.argv.includes('--apply');

// ── Firebase init ────────────────────────────────────────────────────────────

let app;
try {
  const sa = await import('../service-account.json', { assert: { type: 'json' } });
  app = initializeApp({ credential: cert(sa.default) });
} catch {
  app = initializeApp();
}
const db = getFirestore(app);

// ── Message builder ──────────────────────────────────────────────────────────

function buildMessage(orgName, role) {
  const isDispensary = role === 'dispensary';

  const steps = isDispensary
    ? [
        '1. **Build your Brand Guide** — Set your voice, colors, and assets so every agent stays on-brand. (Settings > Brand Guide)',
        '2. **Link your dispensary** — Confirm your retail location so check-in and reporting work correctly.',
        '3. **Connect your menu** — Import inventory so Smokey can recommend real products at check-in.',
        '4. **Set up Check-In** — Configure the check-in flow so customers can start checking in.',
      ]
    : [
        '1. **Build your Brand Guide** — Set your voice, colors, and assets so every agent stays on-brand. (Settings > Brand Guide)',
        '2. **Create your first social draft** — Use Creative Center to generate a post with your brand voice.',
        "3. **Launch Competitive Intelligence** — Turn on Ezal's daily reports to track your market.",
        '4. **Activate a Welcome Playbook** — Automate follow-up for new contacts.',
      ];

  const checkinNote = isDispensary
    ? [
        '',
        '**Two ways to check customers in:**',
        '- **Self-Service Tablet** — Put a tablet at your door. Customers enter their name, phone, and mood. Smokey recommends products from your real menu.',
        '- **Staff Check-In** — Open any laptop or computer at the register. Staff looks up the customer by name or phone — 30 seconds flat.',
        '',
        'Both modes work right away once you finish step 4. No special hardware needed — any tablet, laptop, or desktop works.',
      ]
    : [];

  return [
    `Welcome to BakedBot! I'm Marty, your AI strategist. I'll help ${orgName} get up and running.`,
    '',
    "Here's your setup roadmap — each step takes a few minutes and unlocks more of the platform:",
    '',
    ...steps,
    ...checkinNote,
    '',
    'The **setup checklist above** tracks your progress. Start with the Brand Guide — everything else builds on it.',
    '',
    "Ask me anything in this thread. I'm here to help.",
  ].join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(dryRun ? '🔍 DRY RUN (pass --apply to write)\n' : '🚀 APPLYING to Firestore\n');

  for (const org of PILOT_ORGS) {
    // Check for existing welcome thread in this org
    const existing = await db
      .collection(INBOX_THREADS_COLLECTION)
      .where('orgId', '==', org.orgId)
      .where('tags', 'array-contains', WELCOME_TAG)
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log(`  ⏭  ${org.name} (${org.orgId}) — already has welcome thread, skipping`);
      continue;
    }

    // Find the owner user for this org
    const usersSnap = await db
      .collection('users')
      .where('orgId', '==', org.orgId)
      .limit(1)
      .get();

    let userId = 'system';
    if (!usersSnap.empty) {
      userId = usersSnap.docs[0].id;
    } else {
      // Try orgMemberships pattern
      const membersSnap = await db
        .collection('users')
        .where(`orgMemberships.${org.orgId}`, '!=', null)
        .limit(1)
        .get();
      if (!membersSnap.empty) {
        userId = membersSnap.docs[0].id;
      }
    }

    const threadId = `thread_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const now = new Date();

    const thread = {
      id: threadId,
      orgId: org.orgId,
      userId,
      type: 'general',
      status: 'active',
      title: 'Welcome to BakedBot — Start Here',
      preview: 'Your setup roadmap',
      primaryAgent: 'auto',
      assignedAgents: ['auto'],
      artifactIds: [],
      messages: [
        {
          id: `welcome-msg-${Date.now()}`,
          type: 'agent',
          content: buildMessage(org.name, org.role),
          timestamp: now,
        },
      ],
      tags: [WELCOME_TAG],
      isPinned: true,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };

    if (dryRun) {
      console.log(`  ✅ ${org.name} (${org.orgId}) — would create thread ${threadId} for user ${userId}`);
      console.log(`     Preview: "${thread.messages[0].content.slice(0, 80)}..."\n`);
    } else {
      await db.collection(INBOX_THREADS_COLLECTION).doc(threadId).set(thread);
      console.log(`  ✅ ${org.name} (${org.orgId}) — created thread ${threadId} for user ${userId}`);
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
