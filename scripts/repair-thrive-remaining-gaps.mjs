#!/usr/bin/env node

/**
 * One-time repair for the remaining Thrive playbook audit gaps.
 *
 * Dry-run by default. Pass --write to apply:
 * - archive stale paused duplicate playbook assignments into playbook_assignment_archive
 * - hydrate tenants/{orgId}/customer_spending contact fields from canonical customers
 * - mark historical sent campaigns with aggregate-only delivery evidence when
 *   per-recipient rows were never written
 */

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const ORG_ID = process.argv.find((arg) => arg.startsWith('--org='))?.slice('--org='.length) || 'org_thrive_syracuse';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8';
const WRITE = process.argv.includes('--write');
const REPAIR_ID = 'repair-thrive-remaining-gaps';

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

function chooseCanonical(docs) {
  return [...docs].sort((a, b) => {
    const aActive = a.data().status === 'active' ? 1 : 0;
    const bActive = b.data().status === 'active' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    const updatedDelta = updatedAtMs(b) - updatedAtMs(a);
    return updatedDelta || a.id.localeCompare(b.id);
  })[0];
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized && !normalized.endsWith('@alleaves.local') ? normalized : null;
}

function normalizePhone(value) {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
}

function cleanString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function reportedCampaignSendCount(campaign) {
  const candidates = [
    campaign.performance?.sent,
    campaign.performance?.totalRecipients,
    campaign.totalRecipients,
    campaign.recipientCount,
    campaign.audience?.estimatedCount,
  ];
  const value = candidates.find((candidate) => Number.isFinite(Number(candidate)) && Number(candidate) > 0);
  return value === undefined ? 0 : Number(value);
}

async function commitBatches(db, operations) {
  if (!WRITE || operations.length === 0) return;
  for (let index = 0; index < operations.length; index += 400) {
    const batch = db.batch();
    for (const operation of operations.slice(index, index + 400)) {
      if (operation.type === 'set') batch.set(operation.ref, operation.payload, operation.options);
      if (operation.type === 'update') batch.update(operation.ref, operation.payload);
      if (operation.type === 'delete') batch.delete(operation.ref);
    }
    await batch.commit();
  }
}

async function planAssignmentArchives(db, now) {
  const snap = await db.collection('playbook_assignments').where('orgId', '==', ORG_ID).get();
  const groups = new Map();
  for (const doc of snap.docs) {
    const playbookId = doc.data().playbookId || 'missing';
    const group = groups.get(playbookId) || [];
    group.push(doc);
    groups.set(playbookId, group);
  }

  const operations = [];
  const changes = [];
  for (const [playbookId, docs] of groups.entries()) {
    if (docs.length <= 1) continue;

    const canonical = chooseCanonical(docs);
    const hasActive = docs.some((doc) => doc.data().status === 'active');
    const staleDocs = hasActive
      ? docs.filter((doc) => doc.id !== canonical.id && doc.data().status !== 'active')
      : docs.filter((doc) => doc.data().status !== 'active');

    for (const doc of staleDocs) {
      const archiveRef = db.collection('playbook_assignment_archive').doc(doc.id);
      operations.push({
        type: 'set',
        ref: archiveRef,
        payload: {
          ...doc.data(),
          archivedAt: now,
          archivedBy: REPAIR_ID,
          archiveReason: hasActive
            ? `stale duplicate of active ${playbookId} assignment`
            : `paused duplicate group with no active ${playbookId} assignment`,
          originalId: doc.id,
          originalPath: doc.ref.path,
        },
        options: { merge: true },
      });
      operations.push({ type: 'delete', ref: doc.ref });
      changes.push(`archive stale assignment ${doc.id} (${playbookId})`);
    }
  }

  return { operations, changes };
}

async function planSpendingContactHydration(db, now) {
  const [customersSnap, spendingSnap] = await Promise.all([
    db.collection('customers').where('orgId', '==', ORG_ID).get(),
    db.collection('tenants').doc(ORG_ID).collection('customer_spending').limit(5000).get(),
  ]);

  const contactsBySpendingKey = new Map();
  for (const doc of customersSnap.docs) {
    const data = doc.data();
    const email = normalizeEmail(data.email);
    const phone = normalizePhone(data.phone);
    if (!email && !phone) continue;

    const keys = new Set();
    const alleavesCustomerId = cleanString(data.alleavesCustomerId);
    if (alleavesCustomerId) keys.add(alleavesCustomerId);
    if (email) keys.add(email);
    const docAlleavesMatch = doc.id.match(/_alleaves_(\d+)$/);
    if (docAlleavesMatch?.[1]) keys.add(`cid_${docAlleavesMatch[1]}`);

    const contact = {
      customerProfileId: doc.id,
      contactKey: email || `phone:${phone}`,
      contactSource: 'customers',
    };
    if (email) {
      contact.email = email;
      contact.customerEmail = email;
    }
    if (phone) {
      contact.phone = data.phone || phone;
      contact.customerPhone = data.phone || phone;
      contact.phoneLast4 = phone.slice(-4);
    }
    for (const field of ['firstName', 'lastName', 'displayName']) {
      const value = cleanString(data[field]);
      if (value) contact[field] = value;
    }

    keys.forEach((key) => contactsBySpendingKey.set(key, contact));
  }

  const operations = [];
  const changes = [];
  let withEmail = 0;
  let withPhone = 0;
  for (const doc of spendingSnap.docs) {
    const contact = contactsBySpendingKey.get(doc.id);
    if (!contact) continue;
    if (contact.email) withEmail++;
    if (contact.phone) withPhone++;
    operations.push({
      type: 'set',
      ref: doc.ref,
      payload: {
        ...contact,
        contactHydratedAt: now,
        contactHydratedBy: REPAIR_ID,
      },
      options: { merge: true },
    });
    changes.push(`hydrate contact fields for spending doc ${doc.id}`);
  }

  return {
    operations,
    changes,
    stats: {
      customers: customersSnap.size,
      spendingDocs: spendingSnap.size,
      matched: operations.length,
      withEmail,
      withPhone,
    },
  };
}

async function planCampaignEvidenceMarkers(db, now) {
  const snap = await db.collection('campaigns').where('orgId', '==', ORG_ID).get();
  const operations = [];
  const changes = [];

  for (const campaignDoc of snap.docs) {
    const campaign = campaignDoc.data();
    const sentCount = reportedCampaignSendCount(campaign);
    if (campaign.status !== 'sent' || sentCount <= 0) continue;

    const recipientsSnap = await campaignDoc.ref.collection('recipients').limit(1).get();
    if (!recipientsSnap.empty) continue;
    if (campaign.deliveryEvidence?.status === 'aggregate_only') continue;

    operations.push({
      type: 'set',
      ref: campaignDoc.ref,
      payload: {
        deliveryEvidence: {
          status: 'aggregate_only',
          reportedSent: sentCount,
          recipientRows: 0,
          recordedAt: now,
          recordedBy: REPAIR_ID,
          note: 'This campaign was marked sent before per-recipient recipient rows/provider message ids were available. Treat as aggregate send evidence only; future sends write recipient rows.',
        },
        updatedAt: now,
      },
      options: { merge: true },
    });
    changes.push(`mark campaign ${campaignDoc.id} as aggregate-only evidence (${sentCount} reported sends)`);
  }

  return { operations, changes };
}

async function main() {
  loadEnv();
  const app = initializeFirebase();
  const db = getFirestore(app);
  const now = Timestamp.now();

  const assignmentPlan = await planAssignmentArchives(db, now);
  const contactPlan = await planSpendingContactHydration(db, now);
  const campaignPlan = await planCampaignEvidenceMarkers(db, now);
  const operations = [
    ...assignmentPlan.operations,
    ...contactPlan.operations,
    ...campaignPlan.operations,
  ];
  const changes = [
    ...assignmentPlan.changes,
    ...contactPlan.changes,
    ...campaignPlan.changes,
  ];

  console.log(`# Thrive Remaining Gap Repair ${WRITE ? 'WRITE' : 'DRY RUN'}`);
  console.log(`Org: ${ORG_ID}`);
  console.log(`Planned writes: ${operations.length}`);
  console.log(`Assignment archive changes: ${assignmentPlan.changes.length}`);
  console.log(`Spending contact matches: ${contactPlan.stats.matched}/${contactPlan.stats.spendingDocs} (email=${contactPlan.stats.withEmail}, phone=${contactPlan.stats.withPhone})`);
  console.log(`Campaign evidence markers: ${campaignPlan.changes.length}`);
  changes.slice(0, 250).forEach((change) => console.log(`- ${change}`));
  if (changes.length > 250) console.log(`... ${changes.length - 250} more changes`);

  await commitBatches(db, operations);
  if (WRITE) {
    console.log(`Applied writes: ${operations.length}`);
  } else {
    console.log('Dry run only. Re-run with --write to apply.');
  }

  await app.delete();
}

main().catch((error) => {
  console.error('REPAIR_FAILED:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
