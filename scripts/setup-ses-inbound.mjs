#!/usr/bin/env node
/**
 * Setup SES Inbound Email Receiving
 *
 * Creates the AWS infrastructure needed to receive email replies:
 *   1. SNS topic: bakedbot-inbound-email
 *   2. SES receipt rule set: bakedbot-inbound
 *   3. Receipt rules for configured domains
 *   4. SNS → HTTPS webhook subscription
 *   5. Cloudflare MX records (auto-created via API)
 *
 * Usage:
 *   node scripts/setup-ses-inbound.mjs
 *   node scripts/setup-ses-inbound.mjs --dry-run   (preview only)
 *   node scripts/setup-ses-inbound.mjs --status    (check current state)
 *
 * Prerequisites:
 *   AWS_SES_ACCESS_KEY_ID, AWS_SES_SECRET_ACCESS_KEY in .env.local
 *   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID in .env.local
 */

import {
  SESClient,
  CreateReceiptRuleSetCommand,
  CreateReceiptRuleCommand,
  SetActiveReceiptRuleSetCommand,
  DescribeActiveReceiptRuleSetCommand,
} from '@aws-sdk/client-ses';
import {
  SNSClient,
  CreateTopicCommand,
  SubscribeCommand,
  ListSubscriptionsByTopicCommand,
} from '@aws-sdk/client-sns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const STATUS_ONLY = process.argv.includes('--status');

const REGION = 'us-east-1';
const RULE_SET_NAME = 'bakedbot-inbound';
const SNS_TOPIC_NAME = 'bakedbot-inbound-email';
const WEBHOOK_URL = 'https://bakedbot.ai/api/webhooks/ses-inbound';
const MX_VALUE = 'inbound-smtp.us-east-1.amazonaws.com';

const INBOUND_DOMAINS = [
  { domain: 'outreach.bakedbot.ai', label: 'BakedBot Outreach (super user)' },
  { domain: 'thrive.bakedbot.ai', label: 'Thrive Syracuse' },
  { domain: 'ecstatic.bakedbot.ai', label: 'Ecstatic Edibles' },
];

const sesClient = new SESClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
  },
});

const snsClient = new SNSClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
  },
});

function log(msg) { console.log(msg); }
function step(msg) { console.log(`\n▶ ${msg}`); }
function ok(msg) { console.log(`  ✅ ${msg}`); }
function warn(msg) { console.log(`  ⚠️  ${msg}`); }
function dry(msg) { console.log(`  [DRY-RUN] ${msg}`); }

// ── Cloudflare DNS ────────────────────────────────────────────────────────────

async function cfFetch(path, opts = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.errors?.map(e => e.message).join(', ') || 'Cloudflare API error');
  return json;
}

async function ensureMxRecord(subdomain) {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  // Extract subdomain name (e.g. "thrive" from "thrive.bakedbot.ai")
  const name = subdomain.split('.bakedbot.ai')[0];

  // Check if MX record already exists
  const list = await cfFetch(`/zones/${zoneId}/dns_records?type=MX&name=${subdomain}`);
  const existing = list.result?.find(r => r.content === MX_VALUE);
  if (existing) {
    ok(`MX already exists: ${subdomain}`);
    return;
  }

  await cfFetch(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: {
      type: 'MX',
      name: subdomain,
      content: MX_VALUE,
      priority: 10,
      ttl: 1, // auto
    },
  });
  ok(`MX created: ${subdomain} → ${MX_VALUE}`);
}

// ── AWS ───────────────────────────────────────────────────────────────────────

async function ensureSnsTopic() {
  step('SNS Topic: bakedbot-inbound-email');
  if (DRY_RUN) { dry('Would create SNS topic'); return 'arn:dry-run'; }
  const result = await snsClient.send(new CreateTopicCommand({ Name: SNS_TOPIC_NAME }));
  ok(`Topic ARN: ${result.TopicArn}`);
  return result.TopicArn;
}

async function ensureSnsSubscription(topicArn) {
  step(`SNS Subscription: ${WEBHOOK_URL}`);
  if (DRY_RUN) { dry(`Would subscribe ${WEBHOOK_URL}`); return; }
  const subs = await snsClient.send(new ListSubscriptionsByTopicCommand({ TopicArn: topicArn }));
  const existing = subs.Subscriptions?.find(s => s.Endpoint === WEBHOOK_URL);
  if (existing) { ok(`Already subscribed`); return; }
  await snsClient.send(new SubscribeCommand({ TopicArn: topicArn, Protocol: 'https', Endpoint: WEBHOOK_URL }));
  ok('Subscribed — webhook will receive SubscriptionConfirmation (auto-confirmed on first request)');
}

async function ensureRuleSet() {
  step(`SES Receipt Rule Set: ${RULE_SET_NAME}`);
  if (DRY_RUN) { dry(`Would create rule set`); return; }
  try {
    await sesClient.send(new CreateReceiptRuleSetCommand({ RuleSetName: RULE_SET_NAME }));
    ok(`Created: ${RULE_SET_NAME}`);
  } catch (e) {
    if (e.name === 'AlreadyExistsException') { ok(`Already exists: ${RULE_SET_NAME}`); }
    else throw e;
  }
}

async function ensureReceiptRule(domain, topicArn) {
  const ruleName = `inbound-${domain.replace(/\./g, '-')}`;
  step(`SES Receipt Rule: ${ruleName}`);
  if (DRY_RUN) { dry(`Would create rule for ${domain}`); return; }
  try {
    await sesClient.send(new CreateReceiptRuleCommand({
      RuleSetName: RULE_SET_NAME,
      Rule: {
        Name: ruleName,
        Enabled: true,
        TlsPolicy: 'Optional',
        Recipients: [`hello@${domain}`],
        Actions: [{ SNSAction: { TopicArn: topicArn, Encoding: 'Base64' } }],
        ScanEnabled: true,
      },
    }));
    ok(`Rule created: ${ruleName}`);
  } catch (e) {
    if (e.name === 'AlreadyExistsException') { ok(`Already exists: ${ruleName}`); }
    else throw e;
  }
}

async function activateRuleSet() {
  step(`Activating rule set: ${RULE_SET_NAME}`);
  if (DRY_RUN) { dry(`Would activate`); return; }
  try {
    const active = await sesClient.send(new DescribeActiveReceiptRuleSetCommand({}));
    if (active.Metadata?.Name === RULE_SET_NAME) { ok(`Already active`); return; }
  } catch { /* none active */ }
  await sesClient.send(new SetActiveReceiptRuleSetCommand({ RuleSetName: RULE_SET_NAME }));
  ok(`Activated`);
}

async function checkStatus() {
  step('SES active rule set...');
  try {
    const active = await sesClient.send(new DescribeActiveReceiptRuleSetCommand({}));
    ok(`Active: ${active.Metadata?.Name ?? 'none'}`);
    active.Rules?.forEach(r => log(`  • ${r.Name} (${r.Enabled ? 'on' : 'off'}) → ${r.Recipients?.join(', ')}`));
  } catch (e) {
    warn(`Error: ${e.message}`);
  }

  step('Cloudflare MX records...');
  for (const { domain } of INBOUND_DOMAINS) {
    try {
      const list = await cfFetch(`/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records?type=MX&name=${domain}`);
      const rec = list.result?.find(r => r.content === MX_VALUE);
      rec ? ok(`${domain} → ${MX_VALUE}`) : warn(`MISSING: ${domain}`);
    } catch (e) {
      warn(`${domain}: ${e.message}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log(`\n🚀 BakedBot SES Inbound Setup${DRY_RUN ? ' [DRY RUN]' : ''}`);
  log(`   Region: ${REGION} | Webhook: ${WEBHOOK_URL}\n`);

  if (STATUS_ONLY) { await checkStatus(); return; }

  const topicArn = await ensureSnsTopic();
  await ensureSnsSubscription(topicArn);
  await ensureRuleSet();

  for (const { domain } of INBOUND_DOMAINS) {
    await ensureReceiptRule(domain, topicArn);
  }

  await activateRuleSet();

  step('Cloudflare MX records');
  if (DRY_RUN) {
    for (const { domain } of INBOUND_DOMAINS) dry(`Would create MX ${domain}`);
  } else {
    for (const { domain } of INBOUND_DOMAINS) {
      await ensureMxRecord(domain);
    }
  }

  log('\n✅ Done. DNS propagation takes 5–15 min.');
  log('   Test: send an email to hello@thrive.bakedbot.ai and watch email_threads in Firestore.\n');
}

main().catch(e => { console.error('❌ Failed:', e.message); process.exit(1); });
