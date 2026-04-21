#!/usr/bin/env node

/**
 * One-time Thrive Syracuse playbook data repair.
 *
 * Dry-run by default. Pass --write to apply:
 * - canonicalize duplicate catalog assignments to the active subscription doc
 * - pause unknown assignment IDs that cannot run
 * - create dispatcher-ready assignments for active scheduled custom playbooks
 */

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { CronExpressionParser } from 'cron-parser';
import fs from 'fs';
import path from 'path';

const ORG_ID = process.argv.find((arg) => arg.startsWith('--org='))?.slice('--org='.length) || 'org_thrive_syracuse';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8';
const WRITE = process.argv.includes('--write');

const CATALOG_PLAYBOOK_IDS = new Set([
  'welcome-sequence',
  'owner-quickstart-guide',
  'menu-health-scan',
  'white-glove-onboarding',
  'post-purchase-thank-you',
  'birthday-loyalty-reminder',
  'win-back-sequence',
  'new-product-launch',
  'vip-customer-identification',
  'weekly-competitive-snapshot',
  'pro-competitive-brief',
  'daily-competitive-intel',
  'real-time-price-alerts',
  'weekly-compliance-digest',
  'pre-send-campaign-check',
  'jurisdiction-change-alert',
  'audit-prep-automation',
  'weekly-performance-snapshot',
  'campaign-roi-report',
  'executive-daily-digest',
  'multi-location-rollup',
  'seasonal-template-pack',
  'usage-alert',
  'tier-upgrade-nudge',
  'flnnstoned-competitive-deep-dive',
  'daily-sales-highlights',
  'revenue-pace-alert',
  'weekly-loyalty-health',
  'daily-checkin-digest',
]);

function loadEnv() {
  const envPath = path.resolve('.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const eqIdx = line.indexOf('=');
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  }
}

function initializeFirebase() {
  if (getApps().length > 0) return getApps()[0];
  const encodedKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!encodedKey) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable not found');
  const serviceAccount = JSON.parse(Buffer.from(encodedKey, 'base64').toString('utf-8'));
  return initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID });
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  return null;
}

function updatedAtMs(doc) {
  const data = doc.data();
  return (toDate(data.updatedAt) || toDate(data.createdAt) || new Date(0)).getTime();
}

function chooseCanonical(docs, activeSubscriptionId) {
  return [...docs].sort((a, b) => {
    const aData = a.data();
    const bData = b.data();
    const aSub = aData.subscriptionId === activeSubscriptionId ? 1 : 0;
    const bSub = bData.subscriptionId === activeSubscriptionId ? 1 : 0;
    if (aSub !== bSub) return bSub - aSub;
    const aActive = aData.status === 'active' ? 1 : 0;
    const bActive = bData.status === 'active' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    const updatedDelta = updatedAtMs(b) - updatedAtMs(a);
    return updatedDelta || a.id.localeCompare(b.id);
  })[0];
}

function nextRunAt(cron, timezone) {
  return CronExpressionParser.parse(cron, {
    currentDate: new Date(),
    tz: timezone || 'America/New_York',
  }).next().toDate();
}

async function resolveActiveSubscriptionId(db) {
  const byOrg = await db.collection('subscriptions').where('orgId', '==', ORG_ID).limit(10).get();
  const orgSub = byOrg.docs.find((doc) => ['active', 'trialing'].includes(doc.data().status));
  if (orgSub) return orgSub.id;

  const byCustomer = await db.collection('subscriptions').where('customerId', '==', ORG_ID).limit(10).get();
  const customerSub = byCustomer.docs.find((doc) => ['active', 'trialing'].includes(doc.data().status));
  if (customerSub) return customerSub.id;

  return ORG_ID;
}

function getScheduleTriggers(playbook) {
  return Array.isArray(playbook.triggers)
    ? playbook.triggers.filter((trigger) => trigger?.type === 'schedule' && typeof trigger.cron === 'string')
    : [];
}

async function main() {
  loadEnv();
  const app = initializeFirebase();
  const db = getFirestore(app);
  const activeSubscriptionId = await resolveActiveSubscriptionId(db);
  const now = Timestamp.now();

  const [assignmentsSnap, playbooksSnap] = await Promise.all([
    db.collection('playbook_assignments').where('orgId', '==', ORG_ID).get(),
    db.collection('playbooks').where('orgId', '==', ORG_ID).get(),
  ]);
  const listenersSnap = await db.collection('playbook_event_listeners').where('orgId', '==', ORG_ID).get();

  const playbooksById = new Map(playbooksSnap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }]));
  const assignmentGroups = new Map();
  for (const doc of assignmentsSnap.docs) {
    const id = doc.data().playbookId || 'missing';
    const group = assignmentGroups.get(id) || [];
    group.push(doc);
    assignmentGroups.set(id, group);
  }

  const batch = db.batch();
  const changes = [];

  function update(ref, patch, reason) {
    changes.push({ path: ref.path, reason, patch });
    if (WRITE) batch.update(ref, patch);
  }

  function set(ref, payload, reason) {
    changes.push({ path: ref.path, reason, patch: payload });
    if (WRITE) batch.set(ref, payload);
  }

  for (const [playbookId, docs] of assignmentGroups.entries()) {
    if (CATALOG_PLAYBOOK_IDS.has(playbookId)) {
      const canonical = chooseCanonical(docs, activeSubscriptionId);
      const shouldBeActive = docs.some((doc) => doc.data().status === 'active');
      if (shouldBeActive) {
        const canonicalPatch = {
          status: 'active',
          subscriptionId: activeSubscriptionId,
          updatedAt: now,
        };
        update(canonical.ref, canonicalPatch, `keep canonical active assignment for ${playbookId}`);
      }
      for (const doc of docs) {
        if (doc.id !== canonical.id && doc.data().status !== 'paused') {
          update(doc.ref, { status: 'paused', updatedAt: now }, `pause duplicate assignment for ${playbookId}`);
        }
      }
      continue;
    }

    if (!playbooksById.has(playbookId) && playbookId !== 'missing') {
      for (const doc of docs) {
        if (doc.data().status !== 'paused') {
          update(doc.ref, { status: 'paused', updatedAt: now }, `pause unknown playbook assignment ${playbookId}`);
        }
      }
    }
  }

  for (const playbook of playbooksById.values()) {
    if (playbook.status !== 'active' || playbook.isCustom !== true) continue;
    const scheduleTriggers = getScheduleTriggers(playbook);
    if (scheduleTriggers.length === 0) continue;

    const existingCustomAssignments = assignmentGroups.get(playbook.id) || [];
    for (const [index, trigger] of scheduleTriggers.entries()) {
      const existing = existingCustomAssignments.find((doc) => doc.data().source === 'custom_playbook' && doc.data().config?.triggerIndex === index);
      const schedule = trigger.cron.trim();
      const timezone = trigger.timezone || 'America/New_York';
      const payload = {
        orgId: ORG_ID,
        subscriptionId: activeSubscriptionId,
        playbookId: playbook.id,
        status: 'active',
        handler: 'custom-report',
        schedule,
        timezone,
        nextRunAt: Timestamp.fromDate(nextRunAt(schedule, timezone)),
        lastRunAt: null,
        lastRunStatus: null,
        source: 'custom_playbook',
        config: {
          customPlaybookId: playbook.id,
          playbookName: playbook.name || playbook.id,
          triggerIndex: index,
          prompt: playbook.metadata?.prompt || [playbook.name, playbook.description].filter(Boolean).join(': '),
          deliverTo: playbook.metadata?.deliverTo || null,
        },
        intentDescription: playbook.description || playbook.name || playbook.id,
        scheduleDescription: `Custom playbook schedule ${schedule}`,
        createdBy: playbook.createdBy || playbook.ownerId || 'repair-script',
        triggerCount: existing?.data().triggerCount || 0,
        lastTriggered: existing?.data().lastTriggered || null,
        updatedAt: now,
      };

      if (existing) {
        update(existing.ref, payload, `refresh dispatcher assignment for custom playbook ${playbook.id}`);
      } else {
        set(db.collection('playbook_assignments').doc(), { ...payload, createdAt: now }, `create dispatcher assignment for custom playbook ${playbook.id}`);
      }
    }
  }

  const thriveWelcomePlaybookId = 'playbook_org_thrive_syracuse_welcome';
  if (playbooksById.has(thriveWelcomePlaybookId)) {
    for (const listener of listenersSnap.docs) {
      const data = listener.data();
      if (
        data.status === 'active' &&
        data.playbookId === 'welcome-sequence' &&
        ['customer.created', 'customer.signup'].includes(data.eventName)
      ) {
        update(
          listener.ref,
          {
            playbookId: thriveWelcomePlaybookId,
            updatedAt: now,
            source: 'thrive_playbook_repair',
          },
          `retarget ${data.eventName} listener to existing Thrive welcome playbook`,
        );
      }
    }
  }

  console.log(`# Thrive Playbook Repair ${WRITE ? 'WRITE' : 'DRY RUN'}`);
  console.log(`Org: ${ORG_ID}`);
  console.log(`Active subscription: ${activeSubscriptionId}`);
  console.log(`Planned changes: ${changes.length}`);
  for (const change of changes) {
    console.log(`- ${change.reason}: ${change.path}`);
  }

  if (WRITE && changes.length > 0) {
    await batch.commit();
    console.log(`Applied changes: ${changes.length}`);
  } else if (!WRITE) {
    console.log('Dry run only. Re-run with --write to apply.');
  }

  await app.delete();
}

main().catch((error) => {
  console.error('REPAIR_FAILED:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
