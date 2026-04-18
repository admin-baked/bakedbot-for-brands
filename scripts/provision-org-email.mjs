#!/usr/bin/env node
/**
 * Provision Email Infrastructure for a New Pilot Customer
 *
 * One command to fully set up a new org's email subdomain:
 *   1. Verify SES sending identity for the subdomain
 *   2. Add SES receipt rule for inbound emails
 *   3. Create Cloudflare MX record (priority 10)
 *   4. Print any remaining manual steps (DKIM, SPF, etc.)
 *
 * Usage:
 *   node scripts/provision-org-email.mjs --org org_thrive_syracuse --subdomain thrive
 *   node scripts/provision-org-email.mjs --org org_new_pilot --subdomain newpilot --dry-run
 *
 * After running:
 *   - Update DOMAIN_ORG_MAP in src/app/api/webhooks/ses-inbound/route.ts
 *   - Update apphosting.yaml secrets if the org has a custom fromEmail
 */

import {
  SESClient,
  VerifyDomainIdentityCommand,
  GetIdentityVerificationAttributesCommand,
  CreateReceiptRuleCommand,
  GetSendQuotaCommand,
} from '@aws-sdk/client-ses';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

// Parse --org and --subdomain flags
const orgArg = process.argv.find(a => a.startsWith('--org='))?.split('=')[1]
  ?? process.argv[process.argv.indexOf('--org') + 1];
const subArg = process.argv.find(a => a.startsWith('--subdomain='))?.split('=')[1]
  ?? process.argv[process.argv.indexOf('--subdomain') + 1];

if (!orgArg || !subArg) {
  console.error('Usage: node scripts/provision-org-email.mjs --org <orgId> --subdomain <name>');
  console.error('Example: node scripts/provision-org-email.mjs --org org_thrive_syracuse --subdomain thrive');
  process.exit(1);
}

const REGION = 'us-east-1';
const RULE_SET_NAME = 'bakedbot-inbound';
const MX_VALUE = 'inbound-smtp.us-east-1.amazonaws.com';
const SUBDOMAIN = `${subArg}.bakedbot.ai`;
const FROM_EMAIL = `hello@${SUBDOMAIN}`;
const SNS_TOPIC_ARN = `arn:aws:sns:us-east-1:493652701435:bakedbot-inbound-email`;

const sesClient = new SESClient({
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

async function ensureMxRecord() {
  step(`Cloudflare MX: ${SUBDOMAIN}`);
  if (DRY_RUN) { dry(`Would create MX ${SUBDOMAIN} → ${MX_VALUE} (priority 10)`); return; }

  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const list = await cfFetch(`/zones/${zoneId}/dns_records?type=MX&name=${SUBDOMAIN}`);
  const existing = list.result?.find(r => r.content === MX_VALUE);
  if (existing) { ok(`MX already exists`); return; }

  await cfFetch(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: { type: 'MX', name: SUBDOMAIN, content: MX_VALUE, priority: 10, ttl: 1 },
  });
  ok(`MX created: ${SUBDOMAIN} → ${MX_VALUE}`);
}

async function ensureDkimTxtRecord(name, value) {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const fullName = `${name}.bakedbot.ai`;

  const list = await cfFetch(`/zones/${zoneId}/dns_records?type=CNAME&name=${fullName}`);
  if (list.result?.length) { ok(`DKIM CNAME already exists: ${fullName}`); return; }

  if (DRY_RUN) { dry(`Would create CNAME ${fullName} → ${value}`); return; }

  await cfFetch(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: { type: 'CNAME', name: fullName, content: value, ttl: 1, proxied: false },
  });
  ok(`DKIM CNAME created: ${fullName}`);
}

// ── SES ───────────────────────────────────────────────────────────────────────

async function verifySendingDomain() {
  step(`SES domain identity: ${SUBDOMAIN}`);
  if (DRY_RUN) { dry(`Would initiate SES domain verification for ${SUBDOMAIN}`); return null; }

  // Check existing verification
  const attrs = await sesClient.send(new GetIdentityVerificationAttributesCommand({
    Identities: [SUBDOMAIN],
  }));
  const existing = attrs.VerificationAttributes?.[SUBDOMAIN];
  if (existing?.VerificationStatus === 'Success') {
    ok(`Already verified`);
    return null;
  }

  // Initiate verification (returns a TXT token for DNS)
  const result = await sesClient.send(new VerifyDomainIdentityCommand({ Domain: SUBDOMAIN }));
  const token = result.VerificationToken;
  ok(`Verification initiated — TXT token: ${token}`);
  return token;
}

async function addSesReceiptRule() {
  step(`SES receipt rule: inbound for ${SUBDOMAIN}`);
  if (DRY_RUN) { dry(`Would create receipt rule hello@${SUBDOMAIN} → SNS`); return; }

  const ruleName = `inbound-${SUBDOMAIN.replace(/\./g, '-')}`;
  try {
    await sesClient.send(new CreateReceiptRuleCommand({
      RuleSetName: RULE_SET_NAME,
      Rule: {
        Name: ruleName,
        Enabled: true,
        TlsPolicy: 'Optional',
        Recipients: [FROM_EMAIL],
        Actions: [{ SNSAction: { TopicArn: SNS_TOPIC_ARN, Encoding: 'Base64' } }],
        ScanEnabled: true,
      },
    }));
    ok(`Receipt rule created: ${ruleName}`);
  } catch (e) {
    if (e.name === 'AlreadyExistsException') { ok(`Receipt rule already exists`); }
    else throw e;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log(`\n🚀 Provisioning email for: ${orgArg}`);
  log(`   Subdomain: ${SUBDOMAIN} | From: ${FROM_EMAIL}${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  const verifyToken = await verifySendingDomain();
  await addSesReceiptRule();
  await ensureMxRecord();

  // Print remaining manual steps
  log('\n──────────────────────────────────────────────────');
  log('📋 REMAINING STEPS\n');

  if (verifyToken) {
    log(`1. Add SES domain verification TXT record in Cloudflare:`);
    log(`   Type: TXT`);
    log(`   Name: _amazonses.${SUBDOMAIN}`);
    log(`   Value: "${verifyToken}"`);
    log(`   (SES will poll for this — verification takes ~15 min)\n`);
  }

  log(`2. Update DOMAIN_ORG_MAP in src/app/api/webhooks/ses-inbound/route.ts:`);
  log(`   '${SUBDOMAIN}': '${orgArg}',\n`);

  log(`3. Update org Firestore doc integrations/ses to enable SES sending:`);
  log(`   orgId: ${orgArg}`);
  log(`   fromEmail: ${FROM_EMAIL}`);
  log(`   fromName: <Org Display Name>\n`);

  log(`4. Wait for DNS propagation (5–15 min), then test:`);
  log(`   Send a test email to ${FROM_EMAIL} and check email_threads in Firestore.\n`);

  log('✅ Infrastructure provisioned. Complete the steps above to go live.');
}

main().catch(e => { console.error('❌ Failed:', e.message); process.exit(1); });
