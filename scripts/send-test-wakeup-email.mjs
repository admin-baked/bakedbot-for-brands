#!/usr/bin/env node
/**
 * Send a test re-engagement email to martez@bakedbot.ai
 * This is the email we'll send to Thrive + Ecstatic POS-synced customers.
 *
 * Usage: node scripts/send-test-wakeup-email.mjs
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const client = new SESClient({
    region: process.env.AWS_SES_REGION ?? 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
    },
});

// ── Thrive design tokens ──────────────────────────────────────────────────────
const DARK = '#0d2b31';
const TEAL = '#27c0dd';
const GOLD = '#f1b200';
const CARD = '#ffffff';
const HEADING = '#1a8fa3';
const LOGO_URL = 'https://bakedbot.ai/images/thrive-logo.png';

function header() {
    return `
    <tr>
      <td style="background:${DARK};padding:24px 32px;border-radius:12px 12px 0 0;text-align:center;">
        <img src="${LOGO_URL}" alt="Thrive Cannabis Marketplace" width="140" style="display:block;margin:0 auto 8px;" />
        <span style="display:inline-block;background:${GOLD};color:${DARK};font-size:11px;font-weight:700;letter-spacing:1px;padding:3px 10px;border-radius:20px;text-transform:uppercase;">VIP Rewards</span>
      </td>
    </tr>`;
}

function card(html) {
    return `
    <tr>
      <td style="background:${CARD};padding:36px 32px;">
        ${html}
      </td>
    </tr>`;
}

function cta(label, url) {
    return `<div style="text-align:center;margin-top:24px;">
      <a href="${url}" style="display:inline-block;background:${TEAL};color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">${label}</a>
    </div>`;
}

function footer() {
    return `
    <tr>
      <td style="background:${DARK};padding:20px 32px;border-radius:0 0 12px 12px;text-align:center;">
        <p style="color:#6b9ea8;font-size:11px;margin:0;">Thrive Cannabis Marketplace · Syracuse, NY</p>
        <p style="color:#6b9ea8;font-size:11px;margin:4px 0 0;">
          <a href="https://thrivecannabis.com/unsubscribe" style="color:#6b9ea8;">Unsubscribe</a>
        </p>
      </td>
    </tr>`;
}

function buildEmail(firstName = 'there') {
    const body = card(`
      <h2 style="color:${HEADING};font-size:22px;margin:0 0 12px;">Thanks for visiting Thrive 👋</h2>
      <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Hey ${firstName}, we noticed you stopped by recently and wanted to reach out.
      </p>
      <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
        We're building something special at Thrive — a rewards program that actually gives back.
        Every visit earns you points toward free products, exclusive deals, and early access to new drops.
      </p>
      <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 24px;">
        No pressure. Just wanted you to know you're already in the system and we'd love to see you back.
      </p>
      ${cta('See What\'s New at Thrive', 'https://thrivecannabis.com')}
    `);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Thanks for visiting Thrive</title>
</head>
<body style="margin:0;padding:0;background-color:${DARK};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${DARK};">
    <tr><td align="center" style="padding:24px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        ${header()}
        ${body}
        ${footer()}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function main() {
    const TO = 'martez@bakedbot.ai';
    const FROM = 'hello@thrive.bakedbot.ai';
    const SUBJECT = 'Thanks for stopping by Thrive 🌿';

    console.log(`\n📧 Sending test wake-up email`);
    console.log(`   From: ${FROM}`);
    console.log(`   To:   ${TO}`);
    console.log(`   Subject: ${SUBJECT}\n`);

    const result = await client.send(new SendEmailCommand({
        Source: `Thrive Cannabis Marketplace <${FROM}>`,
        ReplyToAddresses: [FROM],
        Destination: { ToAddresses: [TO] },
        Message: {
            Subject: { Data: SUBJECT, Charset: 'UTF-8' },
            Body: {
                Html: { Data: buildEmail('Martez'), Charset: 'UTF-8' },
                Text: {
                    Data: `Hey Martez,\n\nThanks for stopping by Thrive recently. We'd love to see you back — you're already in our rewards system.\n\nSee what's new: https://thrivecannabis.com\n\nThrive Cannabis Marketplace`,
                    Charset: 'UTF-8',
                },
            },
        },
    }));

    console.log(`✅ Sent! Message ID: ${result.MessageId}`);
    console.log(`   Check your inbox at ${TO}`);
}

main().catch(e => { console.error('❌ Failed:', e.message); process.exit(1); });
