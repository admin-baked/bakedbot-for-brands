#!/usr/bin/env node
/**
 * Provision Email Infrastructure for a New Pilot Customer
 *
 * Usage:
 *   node scripts/provision-org-email.mjs --org org_thrive_syracuse --subdomain thrive
 *   node scripts/provision-org-email.mjs --org org_new_pilot --subdomain newpilot --dry-run
 *
 * After running, update DOMAIN_ORG_MAP (or the Firestore orgs collection once migrated)
 * and the org's integrations/ses Firestore doc.
 */

import {
  SESClient,
  VerifyDomainIdentityCommand,
  GetIdentityVerificationAttributesCommand,
  CreateReceiptRuleCommand,
} from '@aws-sdk/client-ses';
import { log, step, ok, warn, dry, ensureMxRecord, awsCredentials } from './lib/script-utils.mjs';

const DRY_RUN = process.argv.includes('--dry-run');

const orgArg = process.argv.find(a => a.startsWith('--org='))?.split('=')[1]
  ?? process.argv[process.argv.indexOf('--org') + 1];
const subArg = process.argv.find(a => a.startsWith('--subdomain='))?.split('=')[1]
  ?? process.argv[process.argv.indexOf('--subdomain') + 1];

if (!orgArg || !subArg) {
  console.error('Usage: node scripts/provision-org-email.mjs --org <orgId> --subdomain <name>');
  process.exit(1);
}

const REGION = 'us-east-1';
const RULE_SET_NAME = 'bakedbot-inbound';
const SUBDOMAIN = `${subArg}.bakedbot.ai`;
const FROM_EMAIL = `hello@${SUBDOMAIN}`;
const SNS_TOPIC_ARN = `arn:aws:sns:us-east-1:493652701435:bakedbot-inbound-email`;

const sesClient = new SESClient({ region: REGION, credentials: awsCredentials() });

async function verifySendingDomain() {
  step(`SES domain identity: ${SUBDOMAIN}`);
  if (DRY_RUN) { dry(`Would initiate SES domain verification for ${SUBDOMAIN}`); return null; }

  const attrs = await sesClient.send(new GetIdentityVerificationAttributesCommand({ Identities: [SUBDOMAIN] }));
  if (attrs.VerificationAttributes?.[SUBDOMAIN]?.VerificationStatus === 'Success') {
    ok('Already verified');
    return null;
  }

  const result = await sesClient.send(new VerifyDomainIdentityCommand({ Domain: SUBDOMAIN }));
  ok(`Verification initiated — TXT token: ${result.VerificationToken}`);
  return result.VerificationToken;
}

async function addSesReceiptRule() {
  step(`SES receipt rule: ${SUBDOMAIN}`);
  if (DRY_RUN) { dry(`Would create receipt rule ${FROM_EMAIL} → SNS`); return; }

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
    if (e.name === 'AlreadyExistsException') { ok('Receipt rule already exists'); } else throw e;
  }
}

async function main() {
  log(`\n🚀 Provisioning email for: ${orgArg}`);
  log(`   Subdomain: ${SUBDOMAIN} | From: ${FROM_EMAIL}${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  const [verifyToken] = await Promise.all([
    verifySendingDomain(),
    addSesReceiptRule(),
    ensureMxRecord(SUBDOMAIN),
  ]);

  log('\n──────────────────────────────────────────────────');
  log('📋 REMAINING STEPS\n');

  if (verifyToken) {
    log(`1. SES verification TXT record (Cloudflare auto-created above):`);
    log(`   Type: TXT | Name: _amazonses.${SUBDOMAIN} | Value: "${verifyToken}"\n`);
  }

  log(`${verifyToken ? 2 : 1}. Update DOMAIN_ORG_MAP in src/app/api/webhooks/ses-inbound/route.ts:`);
  log(`   '${SUBDOMAIN}': '${orgArg}',\n`);

  log(`${verifyToken ? 3 : 2}. Create Firestore integrations/ses doc for ${orgArg}:`);
  log(`   { fromEmail: '${FROM_EMAIL}', fromName: '<Display Name>', enabled: true }\n`);

  log('✅ Infrastructure provisioned.');
}

main().catch(e => { console.error('❌ Failed:', e.message); process.exit(1); });
