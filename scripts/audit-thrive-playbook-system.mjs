#!/usr/bin/env node

/**
 * Read-only Thrive Syracuse playbook audit.
 *
 * Checks the stores that currently affect the Thrive playbook page and runtime:
 * - playbook_assignments: managed catalog and dispatcher assignments
 * - playbooks: custom org playbooks and legacy global blueprints
 * - playbook_executions / playbook_runs: delivery evidence
 * - inbox_notifications / inbox_threads: app-facing output evidence
 * - customer_communications / scheduled_emails / campaigns: email evidence
 */

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const ORG_ID = process.argv.find((arg) => arg.startsWith('--org='))?.slice('--org='.length) || 'org_thrive_syracuse';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8';
const SINCE_DAYS = Number(process.argv.find((arg) => arg.startsWith('--days='))?.slice('--days='.length) || 90);
const LIMIT = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length) || 1000);

const CATALOG_PLAYBOOK_IDS = [
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
];

const EXECUTABLE_HANDLERS = new Set([
  'daily-recap',
  'revenue-pace-alert',
  'checkin-digest',
  'competitive-snapshot',
  'weekly-loyalty-health',
  'custom-report',
  'slack-post',
]);

function loadEnv() {
  const envPath = path.resolve('.env.local');
  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of envContent.split(/\r?\n/)) {
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
  if (!encodedKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable not found');
  }

  const serviceAccount = JSON.parse(Buffer.from(encodedKey, 'base64').toString('utf-8'));
  return initializeApp({
    credential: cert(serviceAccount),
    projectId: PROJECT_ID,
  });
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function fmtDate(value) {
  const date = toDate(value);
  return date ? date.toISOString() : 'n/a';
}

function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return email || 'n/a';
  const [name, domain] = email.toLowerCase().split('@');
  const visible = name.length <= 2 ? `${name[0] || ''}*` : `${name.slice(0, 2)}***${name.slice(-1)}`;
  return `${visible}@${domain}`;
}

function countBy(items, getKey) {
  const out = new Map();
  for (const item of items) {
    const key = getKey(item) || 'unknown';
    out.set(key, (out.get(key) || 0) + 1);
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function printSection(title) {
  console.log(`\n## ${title}`);
}

function printTable(headers, rows) {
  console.log(headers.join(' | '));
  console.log(headers.map(() => '---').join(' | '));
  for (const row of rows) {
    console.log(row.map((cell) => String(cell ?? '')).join(' | '));
  }
}

async function getCollectionDocs(query) {
  const snap = await query.limit(LIMIT).get();
  return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id, docId: doc.id }));
}

async function getAllCollectionDocs(query) {
  const snap = await query.get();
  return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id, docId: doc.id }));
}

async function countQuery(query) {
  const snap = await query.count().get();
  return snap.data().count;
}

async function audit() {
  loadEnv();
  const app = initializeFirebase();
  const db = getFirestore(app);
  const since = new Date(Date.now() - SINCE_DAYS * 24 * 60 * 60 * 1000);
  const sinceTs = Timestamp.fromDate(since);

  console.log(`# Thrive Playbook System Audit`);
  console.log(`Org: ${ORG_ID}`);
  console.log(`Since: ${since.toISOString()} (${SINCE_DAYS} days)`);
  console.log(`Generated: ${new Date().toISOString()}`);

  const [
    orgDoc,
    tenantDoc,
    allCustomerCount,
    customers,
    customerSpending,
    assignments,
    customPlaybooks,
    globalCustomByOrg,
    brandPlaybooksSnap,
    orgPlaybooksSnap,
    listeners,
    executions,
    runs,
    inboxNotifications,
    customerComms,
    scheduledEmails,
    campaigns,
    inboxThreads,
    emailThreads,
    playbookEnrollments,
    subscriptionsByOrg,
    subscriptionsByCustomer,
    usersByOrg,
    archivedAssignments,
  ] = await Promise.all([
    db.collection('organizations').doc(ORG_ID).get(),
    db.collection('tenants').doc(ORG_ID).get(),
    countQuery(db.collection('customers').where('orgId', '==', ORG_ID)),
    getAllCollectionDocs(db.collection('customers').where('orgId', '==', ORG_ID).select('email')),
    getAllCollectionDocs(db.collection('tenants').doc(ORG_ID).collection('customer_spending')),
    getCollectionDocs(db.collection('playbook_assignments').where('orgId', '==', ORG_ID)),
    getCollectionDocs(db.collection('playbooks').where('orgId', '==', ORG_ID).where('isCustom', '==', true)),
    getCollectionDocs(db.collection('playbooks').where('orgId', '==', ORG_ID)),
    db.collection('brands').doc(ORG_ID).collection('playbooks').limit(LIMIT).get(),
    db.collection('organizations').doc(ORG_ID).collection('playbooks').limit(LIMIT).get(),
    getCollectionDocs(db.collection('playbook_event_listeners').where('orgId', '==', ORG_ID)),
    getCollectionDocs(db.collection('playbook_executions').where('orgId', '==', ORG_ID)),
    getCollectionDocs(db.collection('playbook_runs').where('orgId', '==', ORG_ID)),
    getCollectionDocs(db.collection('inbox_notifications').where('orgId', '==', ORG_ID)),
    getCollectionDocs(db.collection('customer_communications').where('orgId', '==', ORG_ID)),
    getCollectionDocs(db.collection('scheduled_emails').where('orgId', '==', ORG_ID)),
    getCollectionDocs(db.collection('campaigns').where('orgId', '==', ORG_ID)),
    getCollectionDocs(db.collection('inbox_threads').where('orgId', '==', ORG_ID)),
    getCollectionDocs(db.collection('email_threads').where('orgId', '==', ORG_ID)),
    getCollectionDocs(db.collection('playbook_enrollments').where('orgId', '==', ORG_ID)),
    getCollectionDocs(db.collection('subscriptions').where('orgId', '==', ORG_ID)),
    getCollectionDocs(db.collection('subscriptions').where('customerId', '==', ORG_ID)),
    getCollectionDocs(db.collection('users').where('orgId', '==', ORG_ID)),
    getCollectionDocs(db.collection('playbook_assignment_archive').where('orgId', '==', ORG_ID)),
  ]);

  const orgData = orgDoc.data() || {};
  const tenantData = tenantDoc.data() || {};
  const customersWithEmailCount = customers.filter((customer) => (
    typeof customer.email === 'string' && customer.email.trim().length > 0
  )).length;
  const spendingWithContactCount = customerSpending.filter((customer) => {
    const id = typeof customer.id === 'string' ? customer.id : '';
    const email = typeof customer.email === 'string' ? customer.email : '';
    const customerEmail = typeof customer.customerEmail === 'string' ? customer.customerEmail : '';
    const contactKey = typeof customer.contactKey === 'string' ? customer.contactKey : '';
    const phone = typeof customer.phone === 'string' ? customer.phone : '';
    const customerPhone = typeof customer.customerPhone === 'string' ? customer.customerPhone : '';
    return id.includes('@') || email.includes('@') || customerEmail.includes('@') || contactKey.length > 0 || phone.length > 0 || customerPhone.length > 0;
  }).length;
  const subscriptions = [...subscriptionsByOrg, ...subscriptionsByCustomer].filter((sub, idx, arr) => (
    arr.findIndex((other) => other.id === sub.id) === idx
  ));

  printSection('Org Snapshot');
  printTable(
    ['Field', 'Value'],
    [
      ['organization.exists', orgDoc.exists],
      ['tenant.exists', tenantDoc.exists],
      ['org.name', orgData.name || orgData.businessName || tenantData.name || tenantData.businessName || 'n/a'],
      ['org.brandId', orgData.brandId || tenantData.brandId || 'n/a'],
      ['subscription docs', subscriptions.length],
      ['subscription ids', subscriptions.map((s) => `${s.id}:${s.status || 'unknown'}`).join(', ') || 'none'],
      ['customers', allCustomerCount],
      ['customers with email', customersWithEmailCount],
      ['customer_spending records', customerSpending.length],
      ['customer_spending with email/contact key', spendingWithContactCount],
      ['users on org', usersByOrg.map((u) => `${maskEmail(u.email)}:${u.role || 'unknown'}`).join(', ') || 'none'],
    ],
  );

  printSection('Assignment Summary');
  const byPlaybook = new Map();
  for (const assignment of assignments) {
    const playbookId = assignment.playbookId || 'missing';
    const group = byPlaybook.get(playbookId) || [];
    group.push(assignment);
    byPlaybook.set(playbookId, group);
  }

  const activeAssignments = assignments.filter((a) => a.status === 'active');
  const activeListenerPlaybookIds = new Set(
    listeners
      .filter((listener) => listener.status === 'active')
      .map((listener) => listener.playbookId)
      .filter(Boolean),
  );
  const dispatcherReady = assignments.filter((a) => (
    a.status === 'active' &&
    typeof a.handler === 'string' &&
    typeof a.schedule === 'string' &&
    a.nextRunAt &&
    EXECUTABLE_HANDLERS.has(a.handler)
  ));
  const catalogScheduledReady = assignments.filter((a) => a.status === 'active' && a.subscriptionId && CATALOG_PLAYBOOK_IDS.includes(a.playbookId));
  const duplicateGroups = [...byPlaybook.entries()].filter(([, docs]) => docs.length > 1);
  const activeDuplicateGroups = duplicateGroups.filter(([, docs]) => docs.filter((doc) => doc.status === 'active').length > 1);
  const missingSubscription = assignments.filter((a) => !a.subscriptionId);
  const activeMissingSubscription = activeAssignments.filter((a) => !a.subscriptionId);
  const missingDispatcherFields = activeAssignments.filter((a) => !a.handler || !a.schedule || !a.nextRunAt);
  const nonCatalogMissingDispatcherFields = missingDispatcherFields.filter((a) => (
    !CATALOG_PLAYBOOK_IDS.includes(a.playbookId) &&
    !activeListenerPlaybookIds.has(a.playbookId)
  ));
  const unknownPlaybooks = [...byPlaybook.keys()].filter((id) => !CATALOG_PLAYBOOK_IDS.includes(id) && !globalCustomByOrg.some((pb) => pb.id === id));
  const activeUnknownPlaybooks = unknownPlaybooks.filter((id) => byPlaybook.get(id)?.some((doc) => doc.status === 'active'));

  printTable(
    ['Metric', 'Count'],
    [
      ['assignment docs', assignments.length],
      ['active assignment docs', activeAssignments.length],
      ['unique playbook ids', byPlaybook.size],
      ['duplicate playbook ids', duplicateGroups.length],
      ['active duplicate playbook ids', activeDuplicateGroups.length],
      ['active dispatcher-ready docs', dispatcherReady.length],
      ['catalog docs with subscriptionId', catalogScheduledReady.length],
      ['assignments missing subscriptionId', missingSubscription.length],
      ['active assignments missing subscriptionId', activeMissingSubscription.length],
      ['active docs missing dispatcher fields', missingDispatcherFields.length],
      ['non-catalog active docs missing dispatcher fields', nonCatalogMissingDispatcherFields.length],
      ['unknown/missing registry playbook ids', unknownPlaybooks.length],
      ['active unknown/missing registry playbook ids', activeUnknownPlaybooks.length],
      ['archived assignment docs', archivedAssignments.length],
    ],
  );

  printSection('Assignments By Playbook');
  printTable(
    ['Playbook', 'Docs', 'Active', 'Paused', 'Subscription IDs', 'Dispatcher', 'Triggers', 'Last Run'],
    [...byPlaybook.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([playbookId, docs]) => {
        const active = docs.filter((doc) => doc.status === 'active').length;
        const paused = docs.filter((doc) => doc.status === 'paused').length;
        const subscriptionsForPlaybook = [...new Set(docs.map((doc) => doc.subscriptionId).filter(Boolean))];
        const dispatcherDocs = docs.filter((doc) => doc.handler && doc.schedule && doc.nextRunAt);
        const triggerCount = docs.reduce((sum, doc) => sum + (Number(doc.triggerCount) || 0), 0);
        const lastRun = docs
          .map((doc) => toDate(doc.lastRunAt) || toDate(doc.lastTriggered))
          .filter(Boolean)
          .sort((a, b) => b.getTime() - a.getTime())[0];
        return [
          playbookId,
          docs.length,
          active,
          paused,
          subscriptionsForPlaybook.join(', ') || 'none',
          dispatcherDocs.map((doc) => `${doc.handler}:${fmtDate(doc.nextRunAt)}`).join(', ') || 'no',
          triggerCount,
          fmtDate(lastRun),
        ];
      }),
  );

  if (duplicateGroups.length > 0) {
    printSection('Duplicate Assignment IDs');
    printTable(
      ['Playbook', 'Assignment IDs'],
      duplicateGroups.map(([playbookId, docs]) => [playbookId, docs.map((doc) => `${doc.id}:${doc.status}`).join(', ')]),
    );
  }

  if (unknownPlaybooks.length > 0) {
    printSection('Unknown Assignment Playbook IDs');
    printTable(['Playbook'], unknownPlaybooks.map((id) => [id]));
  }

  printSection('Custom And Legacy Playbook Stores');
  const brandPlaybooks = brandPlaybooksSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const orgPlaybooks = orgPlaybooksSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  printTable(
    ['Store', 'Count', 'Active', 'Scheduled', 'Notes'],
    [
      [
        'top-level playbooks where orgId',
        globalCustomByOrg.length,
        globalCustomByOrg.filter((pb) => pb.status === 'active').length,
        globalCustomByOrg.filter((pb) => Array.isArray(pb.triggers) && pb.triggers.some((t) => t.type === 'schedule')).length,
        `${customPlaybooks.length} marked isCustom=true`,
      ],
      [
        `brands/${ORG_ID}/playbooks`,
        brandPlaybooks.length,
        brandPlaybooks.filter((pb) => pb.status === 'active').length,
        brandPlaybooks.filter((pb) => Array.isArray(pb.triggers) && pb.triggers.some((t) => t.type === 'schedule')).length,
        'legacy brand path',
      ],
      [
        `organizations/${ORG_ID}/playbooks`,
        orgPlaybooks.length,
        orgPlaybooks.filter((pb) => pb.status === 'active').length,
        orgPlaybooks.filter((pb) => pb.schedule || pb.triggerEvent).length,
        'legacy onboarding path',
      ],
    ],
  );

  if (globalCustomByOrg.length > 0) {
    printTable(
      ['ID', 'Name', 'Status', 'Agent', 'Triggers', 'Steps'],
      globalCustomByOrg
        .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id))
        .map((pb) => {
          const triggers = Array.isArray(pb.triggers) ? pb.triggers : [];
          return [
            pb.id,
            pb.name || 'n/a',
            pb.status || 'unknown',
            pb.agent || 'n/a',
            triggers.map((t) => t.type === 'schedule' ? `${t.type}:${t.cron}` : `${t.type}:${t.eventName || ''}`).join(', ') || 'none',
            Array.isArray(pb.steps) ? pb.steps.length : 0,
          ];
        }),
    );
  }

  printSection('Listeners');
  printTable(
    ['Event', 'Playbook', 'Status'],
    listeners
      .sort((a, b) => String(a.eventName).localeCompare(String(b.eventName)))
      .map((listener) => [listener.eventName || 'n/a', listener.playbookId || 'n/a', listener.status || 'unknown']),
  );

  const recentExecutions = executions
    .filter((row) => (toDate(row.executedAt) || toDate(row.startedAt) || new Date(0)) >= since)
    .sort((a, b) => (toDate(b.executedAt)?.getTime() || 0) - (toDate(a.executedAt)?.getTime() || 0));
  const recentRuns = runs
    .filter((row) => (toDate(row.startedAt) || new Date(0)) >= since)
    .sort((a, b) => (toDate(b.startedAt)?.getTime() || 0) - (toDate(a.startedAt)?.getTime() || 0));

  printSection('Execution Evidence');
  printTable(
    ['Store', 'Recent Count', 'By Status'],
    [
      ['playbook_executions', recentExecutions.length, countBy(recentExecutions, (r) => r.status).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'],
      ['playbook_runs', recentRuns.length, countBy(recentRuns, (r) => r.status || r.runStatus).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'],
    ],
  );
  printTable(
    ['Playbook', 'Executions', 'Success', 'Failed', 'Last Evidence'],
    countBy(recentExecutions, (r) => r.playbookId).map(([playbookId, count]) => {
      const rows = recentExecutions.filter((r) => (r.playbookId || 'unknown') === playbookId);
      const success = rows.filter((r) => ['success', 'completed'].includes(r.status)).length;
      const failed = rows.filter((r) => ['failed', 'error'].includes(r.status)).length;
      const last = rows.map((r) => toDate(r.executedAt) || toDate(r.startedAt)).filter(Boolean).sort((a, b) => b - a)[0];
      return [playbookId, count, success, failed, fmtDate(last)];
    }),
  );

  const recentNotifications = inboxNotifications
    .filter((row) => (toDate(row.createdAt) || new Date(0)) >= since)
    .filter((row) => ['playbook_delivery', 'playbook_failure', 'revenue_alert'].includes(row.type));
  const recentComms = customerComms
    .filter((row) => (toDate(row.sentAt) || toDate(row.createdAt) || new Date(0)) >= since);
  const recentScheduledEmails = scheduledEmails
    .filter((row) => (toDate(row.scheduledFor) || toDate(row.sendAt) || toDate(row.createdAt) || new Date(0)) >= since);
  const recentCampaigns = campaigns
    .filter((row) => (toDate(row.sentAt) || toDate(row.createdAt) || new Date(0)) >= since);
  const recentThreads = inboxThreads
    .filter((row) => (toDate(row.createdAt) || toDate(row.updatedAt) || new Date(0)) >= since);
  const recentEmailThreads = emailThreads
    .filter((row) => (toDate(row.createdAt) || toDate(row.updatedAt) || new Date(0)) >= since);

  const campaignRecipientRows = [];
  for (const campaign of recentCampaigns) {
    const recipientSnap = await db.collection('campaigns').doc(campaign.id).collection('recipients').limit(LIMIT).get();
    for (const recipientDoc of recipientSnap.docs) {
      campaignRecipientRows.push({
        campaignId: campaign.id,
        campaignName: campaign.name || campaign.id,
        ...recipientDoc.data(),
      });
    }
  }
  const campaignRecipientCounts = new Map();
  campaignRecipientRows.forEach((row) => {
    campaignRecipientCounts.set(row.campaignId, (campaignRecipientCounts.get(row.campaignId) || 0) + 1);
  });
  const getCampaignReportedSendCount = (campaign) => {
    const candidates = [
      campaign.performance?.sent,
      campaign.performance?.totalRecipients,
      campaign.totalRecipients,
      campaign.recipientCount,
      campaign.audience?.estimatedCount,
    ];
    const value = candidates.find((candidate) => Number.isFinite(Number(candidate)) && Number(candidate) > 0);
    return value === undefined ? 0 : Number(value);
  };
  const sentCampaignsWithoutRecipientRows = recentCampaigns.filter((campaign) => (
    campaign.status === 'sent' &&
    getCampaignReportedSendCount(campaign) > 0 &&
    (campaignRecipientCounts.get(campaign.id) || 0) === 0 &&
    campaign.deliveryEvidence?.status !== 'aggregate_only'
  ));
  const aggregateOnlyCampaigns = recentCampaigns.filter((campaign) => (
    campaign.status === 'sent' &&
    getCampaignReportedSendCount(campaign) > 0 &&
    (campaignRecipientCounts.get(campaign.id) || 0) === 0 &&
    campaign.deliveryEvidence?.status === 'aggregate_only'
  ));

  printSection('Delivery Evidence');
  printTable(
    ['Store', 'Recent Count', 'By Type/Status'],
    [
      ['inbox_notifications', recentNotifications.length, countBy(recentNotifications, (r) => r.type).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'],
      ['customer_communications', recentComms.length, countBy(recentComms, (r) => `${r.type || 'unknown'}:${r.status || 'unknown'}`).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'],
      ['scheduled_emails', recentScheduledEmails.length, countBy(recentScheduledEmails, (r) => r.status).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'],
      ['campaigns', recentCampaigns.length, countBy(recentCampaigns, (r) => r.status).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'],
      ['inbox_threads', recentThreads.length, countBy(recentThreads, (r) => r.type || r.status).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'],
      ['email_threads', recentEmailThreads.length, countBy(recentEmailThreads, (r) => r.status).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'],
      ['campaign recipients', campaignRecipientRows.length, countBy(campaignRecipientRows, (r) => r.status).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'],
      ['aggregate-only campaign evidence', aggregateOnlyCampaigns.length, aggregateOnlyCampaigns.map((campaign) => campaign.name || campaign.id).join(', ') || 'none'],
    ],
  );

  printTable(
    ['Recent Email/Comm Type', 'Count'],
    countBy(recentComms, (r) => r.type).slice(0, 20),
  );

  printTable(
    ['Recent Campaign', 'Status', 'Sent', 'Recipients', 'Created'],
    recentCampaigns
      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
      .slice(0, 20)
      .map((campaign) => [
        campaign.name || campaign.id,
        campaign.status || 'unknown',
        fmtDate(campaign.sentAt || campaign.completedAt),
        campaign.performance?.sent ?? campaign.performance?.totalRecipients ?? campaign.audience?.estimatedCount ?? 'n/a',
        fmtDate(campaign.createdAt),
      ]),
  );

  printTable(
    ['Campaign Recipient Enrollment', 'Recipients', 'By Status'],
    countBy(campaignRecipientRows, (r) => r.campaignName).map(([campaignName, count]) => {
      const rows = campaignRecipientRows.filter((r) => (r.campaignName || 'unknown') === campaignName);
      return [
        campaignName,
        count,
        countBy(rows, (r) => r.status).map(([k, v]) => `${k}:${v}`).join(', ') || 'none',
      ];
    }),
  );

  printSection('Per-Customer Enrollment Evidence');
  printTable(
    ['Enrollment Store', 'Count', 'Notes'],
    [
      ['playbook_enrollments', playbookEnrollments.length, playbookEnrollments.length === 0 ? 'No explicit per-customer playbook enrollment docs found' : 'Explicit enrollment docs exist'],
      ['campaign recipient subcollections', campaignRecipientRows.length, 'Per-customer campaign enrollment/send evidence'],
      ['customer_communications', recentComms.length, 'Per-recipient outbound communication log'],
    ],
  );
  if (playbookEnrollments.length > 0) {
    printTable(
      ['Playbook', 'Customer', 'Email', 'Status', 'Enrolled', 'Last Activity'],
      playbookEnrollments
        .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
        .slice(0, 50)
        .map((enrollment) => [
          enrollment.playbookId || enrollment.playbookName || enrollment.assignmentId || 'unknown',
          enrollment.customerId || enrollment.profileId || enrollment.recipientId || 'unknown',
          maskEmail(enrollment.customerEmail || enrollment.email),
          enrollment.status || enrollment.state || 'unknown',
          fmtDate(enrollment.enrolledAt || enrollment.createdAt),
          fmtDate(enrollment.lastEmailAt || enrollment.lastActivityAt || enrollment.updatedAt),
        ]),
    );
  }

  printSection('Audit Findings');
  const findings = [];
  if (activeDuplicateGroups.length > 0) {
    findings.push(`${activeDuplicateGroups.length} playbooks have multiple active assignment docs; UI active counts and runtime checks can be inflated.`);
  } else if (duplicateGroups.length > 0) {
    findings.push(`${duplicateGroups.length} playbooks still have historical duplicate assignment docs, but no playbook has multiple active assignments.`);
  }
  if (nonCatalogMissingDispatcherFields.length > 0) findings.push(`${nonCatalogMissingDispatcherFields.length} active non-catalog assignments are not dispatcher-ready (missing handler/schedule/nextRunAt).`);
  if (activeMissingSubscription.length > 0) findings.push(`${activeMissingSubscription.length} active assignments are missing subscriptionId, so daily/weekly catalog crons will skip them.`);
  if (activeUnknownPlaybooks.length > 0) findings.push(`${activeUnknownPlaybooks.length} active assignment playbook IDs are not in the current catalog/custom store.`);
  const scheduledCustomWithoutDispatcher = customPlaybooks.filter((pb) => (
    pb.status === 'active' &&
    Array.isArray(pb.triggers) &&
    pb.triggers.some((t) => t.type === 'schedule') &&
    !dispatcherReady.some((assignment) => assignment.playbookId === pb.id)
  ));
  if (scheduledCustomWithoutDispatcher.length > 0) {
    findings.push('At least one active scheduled custom playbook exists in top-level playbooks, but custom playbook toggles do not create dispatcher assignments.');
  }
  if (customerSpending.length > allCustomerCount && spendingWithContactCount === 0) {
    findings.push(`The POS spending audience (${customerSpending.length}) is larger than the top-level campaign audience (${allCustomerCount}); customer_spending currently has ${spendingWithContactCount} email/contact keys, so campaign sends use the smaller customers collection.`);
  }
  if (campaignRecipientRows.some((row) => row.providerMessageId === undefined || row.providerMessageId === null)) {
    findings.push('Campaign recipient rows are missing providerMessageId, so SES delivery/open/bounce webhooks cannot prove receipt for those sends.');
  }
  if (sentCampaignsWithoutRecipientRows.length > 0) {
    findings.push(`${sentCampaignsWithoutRecipientRows.length} sent campaigns report recipient/send counts but have no campaign recipient rows, so historical receipt cannot be proven per recipient.`);
  }
  if (recentExecutions.length === 0) findings.push(`No playbook_executions found for the last ${SINCE_DAYS} days.`);
  if (recentComms.length === 0) findings.push(`No customer_communications email evidence found for the last ${SINCE_DAYS} days.`);
  if (findings.length === 0) findings.push('No high-confidence issues detected by this read-only audit.');

  findings.forEach((finding, index) => console.log(`${index + 1}. ${finding}`));

  await app.delete();
}

audit().catch((error) => {
  console.error('AUDIT_FAILED:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
