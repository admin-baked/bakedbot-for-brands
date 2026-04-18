#!/usr/bin/env node
/**
 * Setup SES Inbound Email Receiving
 *
 * Creates AWS + Cloudflare infrastructure for receiving email replies:
 *   1. SNS topic: bakedbot-inbound-email
 *   2. SES receipt rule set + rules for configured domains
 *   3. SNS → HTTPS webhook subscription
 *   4. Cloudflare MX records (auto-created via API)
 *
 * Usage:
 *   node scripts/setup-ses-inbound.mjs
 *   node scripts/setup-ses-inbound.mjs --dry-run
 *   node scripts/setup-ses-inbound.mjs --status
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
import { log, step, ok, warn, dry, cfFetch, ensureMxRecord, awsCredentials } from './lib/script-utils.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const STATUS_ONLY = process.argv.includes('--status');

const REGION = 'us-east-1';
const RULE_SET_NAME = 'bakedbot-inbound';
const SNS_TOPIC_NAME = 'bakedbot-inbound-email';
const WEBHOOK_URL = 'https://bakedbot.ai/api/webhooks/ses-inbound';

const INBOUND_DOMAINS = [
  { domain: 'outreach.bakedbot.ai', label: 'BakedBot Outreach (super user)' },
  { domain: 'thrive.bakedbot.ai', label: 'Thrive Syracuse' },
  { domain: 'ecstatic.bakedbot.ai', label: 'Ecstatic Edibles' },
];

const creds = awsCredentials();
const sesClient = new SESClient({ region: REGION, credentials: creds });
const snsClient = new SNSClient({ region: REGION, credentials: creds });

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
  if (subs.Subscriptions?.find(s => s.Endpoint === WEBHOOK_URL)) { ok('Already subscribed'); return; }
  await snsClient.send(new SubscribeCommand({ TopicArn: topicArn, Protocol: 'https', Endpoint: WEBHOOK_URL }));
  ok('Subscribed — webhook will auto-confirm on first request');
}

async function ensureRuleSet() {
  step(`SES Receipt Rule Set: ${RULE_SET_NAME}`);
  if (DRY_RUN) { dry('Would create rule set'); return; }
  try {
    await sesClient.send(new CreateReceiptRuleSetCommand({ RuleSetName: RULE_SET_NAME }));
    ok(`Created: ${RULE_SET_NAME}`);
  } catch (e) {
    if (e.name === 'AlreadyExistsException') { ok(`Already exists`); } else throw e;
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
    if (e.name === 'AlreadyExistsException') { ok(`Already exists`); } else throw e;
  }
}

async function activateRuleSet() {
  step(`Activating rule set: ${RULE_SET_NAME}`);
  if (DRY_RUN) { dry('Would activate'); return; }
  try {
    const active = await sesClient.send(new DescribeActiveReceiptRuleSetCommand({}));
    if (active.Metadata?.Name === RULE_SET_NAME) { ok('Already active'); return; }
  } catch { /* none active */ }
  await sesClient.send(new SetActiveReceiptRuleSetCommand({ RuleSetName: RULE_SET_NAME }));
  ok('Activated');
}

async function checkStatus() {
  step('SES active rule set...');
  try {
    const active = await sesClient.send(new DescribeActiveReceiptRuleSetCommand({}));
    ok(`Active: ${active.Metadata?.Name ?? 'none'}`);
    active.Rules?.forEach(r => log(`  • ${r.Name} (${r.Enabled ? 'on' : 'off'}) → ${r.Recipients?.join(', ')}`));
  } catch (e) { warn(`Error: ${e.message}`); }

  step('Cloudflare MX records...');
  await Promise.all(INBOUND_DOMAINS.map(async ({ domain }) => {
    try {
      const list = await cfFetch(`/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records?type=MX&name=${domain}`);
      list.result?.find(r => r.content === 'inbound-smtp.us-east-1.amazonaws.com')
        ? ok(`${domain} ✓`) : warn(`MISSING: ${domain}`);
    } catch (e) { warn(`${domain}: ${e.message}`); }
  }));
}

async function main() {
  log(`\n🚀 BakedBot SES Inbound Setup${DRY_RUN ? ' [DRY RUN]' : ''}`);
  log(`   Region: ${REGION} | Webhook: ${WEBHOOK_URL}\n`);

  if (STATUS_ONLY) { await checkStatus(); return; }

  const topicArn = await ensureSnsTopic();
  await ensureSnsSubscription(topicArn);
  await ensureRuleSet();

  // Parallelize per-domain AWS + DNS operations
  await Promise.all(INBOUND_DOMAINS.map(({ domain }) => ensureReceiptRule(domain, topicArn)));
  await activateRuleSet();

  step('Cloudflare MX records');
  if (DRY_RUN) {
    INBOUND_DOMAINS.forEach(({ domain }) => dry(`Would create MX ${domain}`));
  } else {
    await Promise.all(INBOUND_DOMAINS.map(({ domain }) => ensureMxRecord(domain)));
  }

  log('\n✅ Done. DNS propagation takes 5–15 min.\n');
}

main().catch(e => { console.error('❌ Failed:', e.message); process.exit(1); });
