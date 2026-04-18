#!/usr/bin/env node
/**
 * Bulk Thrive + Ecstatic wake-up email sender
 *
 * - Reads customers from Firestore `customers` collection per org
 * - Skips anyone already sent (tracked in Firestore `email_campaigns/wakeup_2026`)
 * - Sends 1 email every DELAY_MS (default 8s) for easy monitoring
 * - Ctrl+C safe: progress is saved after every send, resume anytime
 *
 * Usage:
 *   node scripts/bulk-wakeup-send.mjs                        # both orgs, 8s delay
 *   node scripts/bulk-wakeup-send.mjs --org thrive           # Thrive only
 *   node scripts/bulk-wakeup-send.mjs --org ecstatic         # Ecstatic only
 *   node scripts/bulk-wakeup-send.mjs --delay 15             # 15s between sends
 *   node scripts/bulk-wakeup-send.mjs --dry-run              # preview only, no sends
 *   node scripts/bulk-wakeup-send.mjs --status               # show progress report
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const STATUS_ONLY = process.argv.includes('--status');
const orgFilter = process.argv.find(a => a.startsWith('--org='))?.split('=')[1]
    ?? (process.argv.includes('--org') ? process.argv[process.argv.indexOf('--org') + 1] : null);
const delayArg = process.argv.find(a => a.startsWith('--delay='))?.split('=')[1]
    ?? (process.argv.includes('--delay') ? process.argv[process.argv.indexOf('--delay') + 1] : null);

const DELAY_MS = parseInt(delayArg ?? '8') * 1000;
const CAMPAIGN_ID = 'wakeup_2026';

// ── Org config ────────────────────────────────────────────────────────────────
const ORGS = [
    {
        key: 'thrive',
        orgId: 'org_thrive_syracuse',
        fromEmail: 'hello@thrive.bakedbot.ai',
        fromName: 'Thrive Cannabis Marketplace',
        menuUrl: 'https://thrivecannabis.com/menu',
        unsubscribeUrl: 'https://thrivecannabis.com/unsubscribe',
        logoUrl: 'https://storage.googleapis.com/bakedbot-global-assets/brands/brand_thrivesyracuse/logo/thrive_logo.png',
        teal: '#27c0dd',
        gold: '#f1b200',
        dark: '#0d2b31',
        heading: '#1a8fa3',
        location: 'Cannabis Dispensary &middot; Syracuse, NY',
        address: '3065 Erie Blvd E, Syracuse, NY 13224 &middot; 315-207-7935',
        hours: 'Mon–Sat 10:30 AM–8 PM &middot; Sun 11 AM–6 PM',
    },
    {
        key: 'ecstatic',
        orgId: 'org_ecstatic_edibles',
        fromEmail: 'hello@ecstatic.bakedbot.ai',
        fromName: 'Ecstatic Edibles',
        menuUrl: 'https://ecstaticedibles.com/menu',
        unsubscribeUrl: 'https://ecstaticedibles.com/unsubscribe',
        logoUrl: 'https://storage.googleapis.com/bakedbot-global-assets/brands/brand_ecstatic/logo/ecstatic_logo.png',
        teal: '#6c3fc5',
        gold: '#f1b200',
        dark: '#1a0a2e',
        heading: '#6c3fc5',
        location: 'Cannabis Edibles &middot; New York',
        address: 'Ecstatic Edibles &middot; New York, NY',
        hours: 'Available online & at select dispensaries',
    },
];

// ── Firebase init ─────────────────────────────────────────────────────────────
if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ?? '';
    const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf-8');
    initializeApp({ credential: cert(JSON.parse(json)) });
}
const db = getFirestore();

// ── SES client ────────────────────────────────────────────────────────────────
const ses = new SESClient({
    region: process.env.AWS_SES_REGION ?? 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
    },
});

// ── Email builder ─────────────────────────────────────────────────────────────
function buildEmail(org, firstName) {
    const name = firstName || 'there';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Hey ${name} — you're already part of ${org.fromName}</title>
</head>
<body style="margin:0;padding:0;background-color:${org.dark};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${org.dark};">
    <tr><td align="center" style="padding:24px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        <!-- Header -->
        <tr>
          <td style="background-color:${org.teal};padding:24px 32px 20px;text-align:center;border-radius:12px 12px 0 0;">
            <img src="${org.logoUrl}" alt="${org.fromName}" width="160" style="display:block;margin:0 auto 12px;max-width:160px;height:auto;">
            <p style="margin:0 0 10px;font-size:12px;color:${org.dark};letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:600;">${org.location}</p>
            <span style="display:inline-block;background-color:${org.gold};color:${org.dark};font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:5px 14px;border-radius:20px;font-family:Arial,sans-serif;">VIP Rewards</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background-color:#ffffff;padding:36px 32px;">
            <h2 style="color:${org.heading};font-size:22px;font-family:Arial,sans-serif;margin:0 0 16px;">
              Hey ${name} — you're already part of ${org.fromName}.
            </h2>
            <p style="color:#333333;font-size:15px;line-height:1.7;font-family:Arial,sans-serif;margin:0 0 16px;">
              We noticed you've visited us before, and we just wanted to say — we remember you, and we appreciate it.
            </p>
            <p style="color:#333333;font-size:15px;line-height:1.7;font-family:Arial,sans-serif;margin:0 0 12px;">
              Going forward, here's what you can expect from us:
            </p>
            <ul style="color:#333333;font-size:15px;line-height:1.9;font-family:Arial,sans-serif;margin:0 0 20px;padding-left:20px;">
              <li>The occasional deal or new product drop — no noise, just the good stuff</li>
              <li>A faster experience next time you visit</li>
              <li>Recommendations based on what you actually like</li>
            </ul>
            <p style="color:#333333;font-size:15px;line-height:1.7;font-family:Arial,sans-serif;margin:0 0 28px;">
              That's it. Nothing pushy. You can reply to this email anytime with questions, or stop in and see us.
            </p>
            <div style="text-align:center;">
              <a href="${org.menuUrl}" style="display:inline-block;background-color:${org.teal};color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;font-family:Arial,sans-serif;">
                Browse Today's Menu →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:${org.dark};padding:24px 32px;text-align:center;border-radius:0 0 12px 12px;">
            <img src="${org.logoUrl}" alt="${org.fromName}" width="100" style="display:block;margin:0 auto 10px;opacity:0.85;">
            <p style="margin:0 0 4px;font-size:12px;color:#a0d4de;font-family:Arial,sans-serif;">${org.address}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#5a8f9a;font-family:Arial,sans-serif;">${org.hours}</p>
            <p style="margin:14px 0 0;font-size:11px;color:#5a8f9a;font-family:Arial,sans-serif;">
              You're receiving this because you visited ${org.fromName}.
              <a href="${org.unsubscribeUrl}" style="color:${org.teal};text-decoration:underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildText(org, firstName) {
    const name = firstName || 'there';
    return `Hey ${name} — you're already part of ${org.fromName}.

We noticed you've visited us before, and we just wanted to say — we remember you, and we appreciate it.

Going forward, here's what you can expect from us:
• The occasional deal or new product drop — no noise, just the good stuff
• A faster experience next time you visit
• Recommendations based on what you actually like

That's it. Nothing pushy. You can reply to this email anytime with questions, or stop in and see us.

Browse Today's Menu → ${org.menuUrl}

—
${org.fromName}
${org.address.replace(/&middot;/g, '·')}
${org.hours}

Unsubscribe: ${org.unsubscribeUrl}`;
}

// ── Campaign tracking ─────────────────────────────────────────────────────────
async function getSentSet(orgId) {
    const snap = await db.collection('email_campaigns').doc(`${CAMPAIGN_ID}_${orgId}`).get();
    return new Set((snap.data()?.sent ?? []) );
}

async function markSent(orgId, email) {
    await db.collection('email_campaigns').doc(`${CAMPAIGN_ID}_${orgId}`).set({
        sent: db.FieldValue ? db.FieldValue.arrayUnion(email) : [email],
        updatedAt: new Date(),
    }, { merge: true });
}

// Use Firestore FieldValue for arrayUnion
import { FieldValue } from 'firebase-admin/firestore';

async function recordSent(orgId, email, messageId) {
    await db.collection('email_campaigns').doc(`${CAMPAIGN_ID}_${orgId}`).set({
        sent: FieldValue.arrayUnion(email),
        lastMessageId: messageId,
        updatedAt: new Date(),
    }, { merge: true });
}

// ── Fetch customers ───────────────────────────────────────────────────────────
async function getCustomers(orgId) {
    const snap = await db.collection('customers')
        .where('orgId', '==', orgId)
        .get();

    return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.email && typeof c.email === 'string' && c.email.includes('@'));
}

// ── Status report ─────────────────────────────────────────────────────────────
async function printStatus() {
    console.log('\n📊 Campaign Status Report\n');
    for (const org of ORGS) {
        const customers = await getCustomers(org.orgId);
        const sentSet = await getSentSet(org.orgId);
        const remaining = customers.filter(c => !sentSet.has(c.email)).length;
        console.log(`${org.key.toUpperCase()} (${org.orgId})`);
        console.log(`  Total customers with email: ${customers.length}`);
        console.log(`  Sent: ${sentSet.size}`);
        console.log(`  Remaining: ${remaining}`);
        console.log(`  ETA at ${DELAY_MS/1000}s/email: ~${Math.ceil(remaining * DELAY_MS / 1000 / 60)} min\n`);
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    const orgs = orgFilter
        ? ORGS.filter(o => o.key === orgFilter)
        : ORGS;

    if (!orgs.length) {
        console.error(`Unknown org: ${orgFilter}. Use "thrive" or "ecstatic".`);
        process.exit(1);
    }

    if (STATUS_ONLY) { await printStatus(); return; }

    console.log(`\n🚀 BakedBot Wake-Up Email Sender`);
    console.log(`   Campaign: ${CAMPAIGN_ID}`);
    console.log(`   Orgs: ${orgs.map(o => o.key).join(', ')}`);
    console.log(`   Delay: ${DELAY_MS / 1000}s between sends`);
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no emails sent)' : 'LIVE'}\n`);

    let totalSent = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const org of orgs) {
        console.log(`\n── ${org.key.toUpperCase()} ──────────────────────────────────────`);

        const customers = await getCustomers(org.orgId);
        const sentSet = await getSentSet(org.orgId);
        const queue = customers.filter(c => !sentSet.has(c.email));

        console.log(`   ${customers.length} customers | ${sentSet.size} already sent | ${queue.length} to send`);
        if (!queue.length) { console.log('   ✓ All done for this org.'); continue; }

        for (let i = 0; i < queue.length; i++) {
            const customer = queue[i];
            const firstName = customer.firstName || customer.first_name || '';
            const subject = `Hey ${firstName || 'there'} — you're already part of ${org.fromName}`;
            const pct = `[${i + 1}/${queue.length}]`;

            if (DRY_RUN) {
                console.log(`   ${pct} DRY RUN → ${customer.email} (${firstName || 'no name'})`);
                totalSent++;
                continue;
            }

            try {
                const result = await ses.send(new SendEmailCommand({
                    Source: `${org.fromName} <${org.fromEmail}>`,
                    ReplyToAddresses: [org.fromEmail],
                    Destination: { ToAddresses: [customer.email] },
                    Message: {
                        Subject: { Data: subject, Charset: 'UTF-8' },
                        Body: {
                            Html: { Data: buildEmail(org, firstName), Charset: 'UTF-8' },
                            Text: { Data: buildText(org, firstName), Charset: 'UTF-8' },
                        },
                    },
                }));

                await recordSent(org.orgId, customer.email, result.MessageId);
                console.log(`   ${pct} ✅ ${customer.email} (${firstName || 'no name'}) — ${result.MessageId?.slice(-8)}`);
                totalSent++;

                if (i < queue.length - 1) {
                    await new Promise(r => setTimeout(r, DELAY_MS));
                }
            } catch (e) {
                console.error(`   ${pct} ❌ ${customer.email} — ${e.message}`);
                totalErrors++;
                // Short pause on error before continuing
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }

    console.log(`\n──────────────────────────────────────────────────`);
    console.log(`✅ Done. Sent: ${totalSent} | Skipped: ${totalSkipped} | Errors: ${totalErrors}`);
    if (totalErrors) console.log(`   Re-run the same command to retry failed addresses.`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
