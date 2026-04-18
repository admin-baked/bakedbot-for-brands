#!/usr/bin/env node
/**
 * Setup SES Inbound Email Receiving
 *
 * Creates the AWS infrastructure needed to receive email replies:
 *   1. SNS topic: bakedbot-inbound-email
 *   2. SES receipt rule set: bakedbot-inbound
 *   3. Receipt rules for: outreach.bakedbot.ai, thrive.bakedbot.ai, ecstatic.bakedbot.ai
 *   4. SNS → HTTPS webhook subscription (your deployed URL)
 *   5. Outputs DNS MX records to add in Cloudflare
 *
 * Usage:
 *   node scripts/setup-ses-inbound.mjs
 *   node scripts/setup-ses-inbound.mjs --dry-run   (preview only)
 *   node scripts/setup-ses-inbound.mjs --status    (check current state)
 *
 * Prerequisites:
 *   AWS_SES_ACCESS_KEY_ID, AWS_SES_SECRET_ACCESS_KEY in .env.local
 *   SES must be in us-east-1 (email receiving only available there)
 */

import {
  SESClient,
  CreateReceiptRuleSetCommand,
  DescribeReceiptRuleSetCommand,
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

const REGION = 'us-east-1'; // SES email receiving only available in us-east-1
const RULE_SET_NAME = 'bakedbot-inbound';
const SNS_TOPIC_NAME = 'bakedbot-inbound-email';
const WEBHOOK_URL = 'https://bakedbot.ai/api/webhooks/ses-inbound';

// Domains + their orgIds (for reference)
const INBOUND_DOMAINS = [
  { domain: 'outreach.bakedbot.ai', label: 'BakedBot Outreach (super user)', recipients: ['hello@outreach.bakedbot.ai'] },
  { domain: 'thrive.bakedbot.ai', label: 'Thrive Syracuse', recipients: ['hello@thrive.bakedbot.ai'] },
  { domain: 'ecstatic.bakedbot.ai', label: 'Ecstatic Edibles', recipients: ['hello@ecstatic.bakedbot.ai'] },
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

// ── 1. Create or verify SNS topic ─────────────────────────────────────────────
async function ensureSnsTopic() {
  step('SNS Topic: bakedbot-inbound-email');
  if (DRY_RUN) { dry('Would create SNS topic bakedbot-inbound-email in us-east-1'); return 'arn:dry-run'; }

  const result = await snsClient.send(new CreateTopicCommand({ Name: SNS_TOPIC_NAME }));
  const topicArn = result.TopicArn;
  ok(`Topic ARN: ${topicArn}`);
  return topicArn;
}

// ── 2. Subscribe webhook to SNS topic ────────────────────────────────────────
async function ensureSnsSubscription(topicArn) {
  step(`SNS Subscription: ${WEBHOOK_URL}`);
  if (DRY_RUN) { dry(`Would subscribe ${WEBHOOK_URL} to ${topicArn}`); return; }

  // Check if already subscribed
  const subs = await snsClient.send(new ListSubscriptionsByTopicCommand({ TopicArn: topicArn }));
  const existing = subs.Subscriptions?.find(s => s.Endpoint === WEBHOOK_URL);
  if (existing) {
    ok(`Already subscribed (${existing.SubscriptionArn})`);
    return;
  }

  await snsClient.send(new SubscribeCommand({
    TopicArn: topicArn,
    Protocol: 'https',
    Endpoint: WEBHOOK_URL,
  }));
  ok('Subscribed — SNS will send a SubscriptionConfirmation POST to the webhook');
  warn('The webhook auto-logs the SubscribeURL. Copy it from Cloud Logging and open it to confirm the subscription.');
}

// ── 3. Create SES receipt rule set ───────────────────────────────────────────
async function ensureRuleSet() {
  step(`SES Receipt Rule Set: ${RULE_SET_NAME}`);
  if (DRY_RUN) { dry(`Would create rule set: ${RULE_SET_NAME}`); return; }

  try {
    await sesClient.send(new CreateReceiptRuleSetCommand({ RuleSetName: RULE_SET_NAME }));
    ok(`Rule set created: ${RULE_SET_NAME}`);
  } catch (e) {
    if (e.name === 'AlreadyExistsException') {
      ok(`Rule set already exists: ${RULE_SET_NAME}`);
    } else {
      throw e;
    }
  }
}

// ── 4. Create receipt rules for each domain ──────────────────────────────────
async function ensureReceiptRule(domain, recipients, topicArn) {
  const ruleName = `inbound-${domain.replace(/\./g, '-')}`;
  step(`SES Receipt Rule: ${ruleName}`);
  if (DRY_RUN) { dry(`Would create rule for ${domain} → SNS`); return; }

  try {
    await sesClient.send(new CreateReceiptRuleCommand({
      RuleSetName: RULE_SET_NAME,
      Rule: {
        Name: ruleName,
        Enabled: true,
        TlsPolicy: 'Optional',
        Recipients: recipients,
        Actions: [
          {
            SNSAction: {
              TopicArn: topicArn,
              Encoding: 'Base64',
            },
          },
        ],
        ScanEnabled: true,
      },
    }));
    ok(`Rule created: ${ruleName} → SNS`);
  } catch (e) {
    if (e.name === 'AlreadyExistsException') {
      ok(`Rule already exists: ${ruleName}`);
    } else {
      throw e;
    }
  }
}

// ── 5. Activate the rule set ─────────────────────────────────────────────────
async function activateRuleSet() {
  step(`Activating rule set: ${RULE_SET_NAME}`);
  if (DRY_RUN) { dry(`Would set ${RULE_SET_NAME} as active`); return; }

  try {
    const active = await sesClient.send(new DescribeActiveReceiptRuleSetCommand({}));
    if (active.Metadata?.Name === RULE_SET_NAME) {
      ok(`Already active: ${RULE_SET_NAME}`);
      return;
    }
  } catch { /* no active rule set */ }

  await sesClient.send(new SetActiveReceiptRuleSetCommand({ RuleSetName: RULE_SET_NAME }));
  ok(`Activated: ${RULE_SET_NAME}`);
}

// ── Status check ─────────────────────────────────────────────────────────────
async function checkStatus() {
  step('Checking current SES inbound configuration...');
  try {
    const active = await sesClient.send(new DescribeActiveReceiptRuleSetCommand({}));
    ok(`Active rule set: ${active.Metadata?.Name ?? 'none'}`);
    if (active.Rules?.length) {
      active.Rules.forEach(r => log(`  • ${r.Name} (${r.Enabled ? 'enabled' : 'disabled'}) — ${r.Recipients?.join(', ')}`));
    }
  } catch (e) {
    warn(`No active rule set or error: ${e.message}`);
  }
}

// ── DNS instructions ─────────────────────────────────────────────────────────
function printDnsInstructions() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║            DNS RECORDS TO ADD IN CLOUDFLARE                     ║
╠══════════════════════════════════════════════════════════════════╣
║ Add these MX records (priority 10) for each subdomain:          ║
╠══════════════════════════════════════════════════════════════════╣`);

  INBOUND_DOMAINS.forEach(({ domain, label }) => {
    console.log(`║                                                                  ║`);
    console.log(`║  ${label.padEnd(64)}║`);
    console.log(`║  Type: MX                                                        ║`);
    console.log(`║  Name: ${domain.padEnd(57)}║`);
    console.log(`║  Value: inbound-smtp.us-east-1.amazonaws.com                     ║`);
    console.log(`║  Priority: 10                                                    ║`);
  });

  console.log(`║                                                                  ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════╝`);
  console.log(`
After adding MX records:
  1. Wait 5-15 min for DNS propagation
  2. Test: send an email to hello@thrive.bakedbot.ai from any address
  3. Check Cloud Logging for: [SES-Inbound] Received email
  4. Verify the email_threads collection gets a new inbound doc

⚠️  Also add outreach.bakedbot.ai to your NAKED_DOMAINS allowlist in
    dispatcher.ts if you want SES to use it as a fallback from-address.
`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log(`\n🚀 BakedBot SES Inbound Setup${DRY_RUN ? ' [DRY RUN]' : ''}${STATUS_ONLY ? ' [STATUS]' : ''}`);
  log(`   Region: ${REGION} | Webhook: ${WEBHOOK_URL}\n`);

  if (STATUS_ONLY) {
    await checkStatus();
    return;
  }

  const topicArn = await ensureSnsTopic();
  await ensureSnsSubscription(topicArn);
  await ensureRuleSet();

  for (const { domain, recipients } of INBOUND_DOMAINS) {
    await ensureReceiptRule(domain, recipients, topicArn);
  }

  await activateRuleSet();
  printDnsInstructions();

  log('\n✅ SES inbound infrastructure ready.');
  log('   Next step: add the MX DNS records above in Cloudflare, then test a reply.');
}

main().catch(e => { console.error('❌ Setup failed:', e.message); process.exit(1); });
