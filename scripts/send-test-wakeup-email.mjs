#!/usr/bin/env node
/**
 * Send a test Thrive re-engagement email to martez@bakedbot.ai
 * Uses the canonical thrive-template.ts design system (GCS logo, correct colors).
 *
 * Usage: node scripts/send-test-wakeup-email.mjs
 *        node scripts/send-test-wakeup-email.mjs --to someone@example.com --name Alex
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const toArg = process.argv.find(a => a.startsWith('--to='))?.split('=')[1]
    ?? process.argv[process.argv.indexOf('--to') + 1];
const nameArg = process.argv.find(a => a.startsWith('--name='))?.split('=')[1]
    ?? process.argv[process.argv.indexOf('--name') + 1];

const TO = toArg ?? 'martez@bakedbot.ai';
const FIRST_NAME = nameArg ?? 'Martez';

// ── Canonical Thrive design tokens (mirrors thrive-template.ts) ───────────────
const THRIVE = {
    TEAL: '#27c0dd',
    GOLD: '#f1b200',
    DARK: '#0d2b31',
    BODY_HEADING: '#1a8fa3',
    LOGO_URL: 'https://storage.googleapis.com/bakedbot-global-assets/brands/brand_thrivesyracuse/logo/thrive_logo.png',
    ADDRESS: '3065 Erie Blvd E, Syracuse, NY 13224',
    PHONE: '315-207-7935',
    HOURS: 'Mon–Sat 10:30 AM–8 PM · Sun 11 AM–6 PM',
};

function header() {
    return `
  <tr>
    <td style="background-color:${THRIVE.TEAL};padding:24px 32px 20px;text-align:center;border-radius:12px 12px 0 0;">
      <img src="${THRIVE.LOGO_URL}" alt="Thrive Cannabis Marketplace" width="160" style="display:block;margin:0 auto 12px;max-width:160px;height:auto;">
      <p style="margin:0 0 10px;font-size:12px;color:${THRIVE.DARK};letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:600;">
        Cannabis Dispensary &middot; Syracuse, NY
      </p>
      <span style="display:inline-block;background-color:${THRIVE.GOLD};color:${THRIVE.DARK};font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:5px 14px;border-radius:20px;font-family:Arial,sans-serif;">
        VIP Rewards
      </span>
    </td>
  </tr>`;
}

function body(firstName) {
    return `
  <tr>
    <td style="background-color:#ffffff;padding:36px 32px;">
      <h2 style="color:${THRIVE.BODY_HEADING};font-size:22px;font-family:Arial,sans-serif;margin:0 0 16px;">
        Hey ${firstName} — you're already part of Thrive.
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
        <a href="https://thrivecannabis.com/menu" style="display:inline-block;background-color:${THRIVE.TEAL};color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;font-family:Arial,sans-serif;">
          Browse Today's Menu →
        </a>
      </div>
    </td>
  </tr>`;
}

function footer() {
    return `
  <tr>
    <td style="background-color:${THRIVE.DARK};padding:24px 32px;text-align:center;border-radius:0 0 12px 12px;">
      <img src="${THRIVE.LOGO_URL}" alt="Thrive Cannabis Marketplace" width="100" style="display:block;margin:0 auto 10px;opacity:0.85;">
      <p style="margin:0 0 4px;font-size:12px;color:#a0d4de;font-family:Arial,sans-serif;">
        ${THRIVE.ADDRESS} &middot; ${THRIVE.PHONE}
      </p>
      <p style="margin:4px 0 0;font-size:11px;color:#5a8f9a;font-family:Arial,sans-serif;">
        ${THRIVE.HOURS}
      </p>
      <p style="margin:14px 0 0;font-size:11px;color:#5a8f9a;font-family:Arial,sans-serif;">
        You're receiving this because you visited Thrive Cannabis Marketplace.
        <a href="https://thrivecannabis.com/unsubscribe" style="color:${THRIVE.TEAL};text-decoration:underline;">Unsubscribe</a>
      </p>
    </td>
  </tr>`;
}

function buildHtml(firstName) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Hey ${firstName} — you're already part of Thrive</title>
</head>
<body style="margin:0;padding:0;background-color:${THRIVE.DARK};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${THRIVE.DARK};">
    <tr><td align="center" style="padding:24px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        ${header()}
        ${body(firstName)}
        ${footer()}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildText(firstName) {
    return `Hey ${firstName} — you're already part of Thrive.

We noticed you've visited us before, and we just wanted to say — we remember you, and we appreciate it.

Going forward, here's what you can expect from us:
• The occasional deal or new product drop — no noise, just the good stuff
• A faster experience next time you visit
• Recommendations based on what you actually like

That's it. Nothing pushy. You can reply to this email anytime with questions, or stop in and see us.

Browse Today's Menu → https://thrivecannabis.com/menu

—
Thrive Cannabis Marketplace
${THRIVE.ADDRESS} · ${THRIVE.PHONE}
${THRIVE.HOURS}

Unsubscribe: https://thrivecannabis.com/unsubscribe`;
}

async function main() {
    const FROM = 'Thrive Cannabis Marketplace <hello@thrive.bakedbot.ai>';
    const SUBJECT = `Hey ${FIRST_NAME} — you're already part of Thrive`;

    const client = new SESClient({
        region: process.env.AWS_SES_REGION ?? 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
        },
    });

    console.log(`\n📧 Sending Thrive wake-up email`);
    console.log(`   From:    ${FROM}`);
    console.log(`   To:      ${TO}`);
    console.log(`   Name:    ${FIRST_NAME}`);
    console.log(`   Subject: ${SUBJECT}\n`);

    const result = await client.send(new SendEmailCommand({
        Source: FROM,
        ReplyToAddresses: ['hello@thrive.bakedbot.ai'],
        Destination: { ToAddresses: [TO] },
        Message: {
            Subject: { Data: SUBJECT, Charset: 'UTF-8' },
            Body: {
                Html: { Data: buildHtml(FIRST_NAME), Charset: 'UTF-8' },
                Text: { Data: buildText(FIRST_NAME), Charset: 'UTF-8' },
            },
        },
    }));

    console.log(`✅ Sent! Message ID: ${result.MessageId}`);
}

main().catch(e => { console.error('❌ Failed:', e.message); process.exit(1); });
