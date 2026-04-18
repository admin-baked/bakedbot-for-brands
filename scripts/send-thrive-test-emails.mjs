#!/usr/bin/env node
/**
 * Send Thrive Syracuse test emails to martez@bakedbot.ai
 *
 * 1. VIP Check-In Welcome (Ade First)
 * 2. 4/20 Campaign (Ade First)
 *
 * Usage: node scripts/send-thrive-test-emails.mjs
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// ── Thrive design tokens (mirrors thrive-template.ts) ──────────────
const THRIVE = {
  TEAL: '#27c0dd',
  GOLD: '#f1b200',
  DARK: '#0d2b31',
  BODY_HEADING: '#1a8fa3',
  LOGO_URL: 'https://storage.googleapis.com/bakedbot-global-assets/brands/brand_thrivesyracuse/logo/thrive_logo.png',
  ADDRESS: '3065 Erie Blvd E, Syracuse, NY 13224',
  PHONE: '315-207-7935',
  HOURS: 'Mon–Sat 10:30 AM–8 PM · Sun 11 AM–6 PM',
  FROM: 'hello@thrive.bakedbot.ai',
  FROM_NAME: 'Thrive Cannabis Marketplace',
};

const UNSUBSCRIBE_URL = 'https://bakedbot.ai/unsubscribe?org=org_thrive_syracuse';

function header(badgeText = 'VIP Rewards') {
  return `
  <tr>
    <td style="background-color:${THRIVE.TEAL};padding:24px 32px 20px;text-align:center;border-radius:12px 12px 0 0;">
      <img src="${THRIVE.LOGO_URL}" alt="Thrive Cannabis Marketplace" width="160" style="display:block;margin:0 auto 12px;max-width:160px;height:auto;">
      <p style="margin:0 0 10px;font-size:12px;color:${THRIVE.DARK};letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:600;">
        Cannabis Dispensary &middot; Syracuse, NY
      </p>
      <span style="display:inline-block;background-color:${THRIVE.GOLD};color:${THRIVE.DARK};font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:5px 14px;border-radius:20px;font-family:Arial,sans-serif;">
        ${badgeText}
      </span>
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
        You're receiving this because you opted in at Thrive Cannabis Marketplace.
        <a href="${UNSUBSCRIBE_URL}" style="color:${THRIVE.TEAL};text-decoration:underline;">Unsubscribe</a>
      </p>
    </td>
  </tr>`;
}

function wrap(title, badgeText, bodyRows) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${THRIVE.DARK};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${THRIVE.DARK};">
    <tr><td align="center" style="padding:24px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        ${header(badgeText)}
        ${bodyRows}
        ${footer()}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Email 1: VIP Check-In Welcome ───────────────────────────────────
function buildCheckinEmail(firstName) {
  const bodyRows = `
  <tr>
    <td style="background-color:#ffffff;padding:36px 32px;">
      <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:${THRIVE.DARK};font-family:Arial,sans-serif;">
        Welcome to VIP Rewards
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;font-family:Arial,sans-serif;">
        Hi ${firstName},
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;font-family:Arial,sans-serif;">
        You are officially checked in with <strong>Thrive Syracuse VIP Rewards</strong>.
        We will use what you share with us to make recommendations faster, smarter,
        and more personal every time you come back.
      </p>

      <div style="border-left:4px solid ${THRIVE.TEAL};padding:16px 20px;margin:0 0 28px;background:#f0fbfe;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${THRIVE.BODY_HEADING};text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">
          Here is what you can expect:
        </p>
        <ul style="margin:8px 0 0;padding:0 0 0 18px;font-size:14px;color:#374151;line-height:1.9;font-family:Arial,sans-serif;">
          <li>Weekly deals from Thrive Syracuse</li>
          <li>Better budtender handoff before you shop</li>
          <li>Smokey-powered recommendations based on your feedback and favorites</li>
          <li>Pre-check-in from your phone before you visit — skip the wait</li>
        </ul>
      </div>

      <div style="text-align:center;margin:0 0 8px;">
        <a href="https://bakedbot.ai/thrive" style="display:inline-block;background-color:${THRIVE.TEAL};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
          View Your Profile &rarr;
        </a>
      </div>

      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;font-family:Arial,sans-serif;">
        Questions? Reply to this email or call us at ${THRIVE.PHONE}.
      </p>
    </td>
  </tr>`;

  return wrap('Welcome to Thrive VIP Rewards', 'VIP Rewards', bodyRows);
}

// ── Email 2: 4/20 Campaign ──────────────────────────────────────────
function build420Email(firstName) {
  const bodyRows = `
  <tr>
    <td style="background-color:#ffffff;padding:36px 32px 0;">
      <!-- Hero deal block -->
      <div style="background-color:${THRIVE.DARK};border-radius:10px;padding:22px 24px;margin:0 0 28px;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:${THRIVE.GOLD};text-transform:uppercase;letter-spacing:2px;font-family:Arial,sans-serif;">
          4/20 Celebration
        </p>
        <p style="margin:0 0 4px;font-size:42px;font-weight:900;color:#ffffff;font-family:Arial,sans-serif;">
          20% OFF
        </p>
        <p style="margin:0;font-size:14px;color:#a0d4de;font-family:Arial,sans-serif;">
          Storewide · Sunday, April 20 only
        </p>
      </div>
    </td>
  </tr>
  <tr>
    <td style="background-color:#ffffff;padding:0 32px 36px;">
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;font-family:Arial,sans-serif;">
        Hi ${firstName},
      </p>
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;font-family:Arial,sans-serif;">
        4/20 only comes once a year — and we are celebrating it right here at
        <strong>Thrive Syracuse</strong>. Stop in on Sunday, April 20 and get
        <strong>20% off your entire purchase</strong>, all day long.
      </p>

      <div style="border:2px solid ${THRIVE.GOLD};border-radius:8px;padding:18px 22px;margin:0 0 28px;text-align:center;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${THRIVE.GOLD};text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">
          VIP Bonus
        </p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;font-family:Arial,sans-serif;">
          As a VIP Rewards member, you also earn <strong>2× points</strong> on every dollar
          you spend on 4/20. Stack your rewards while you celebrate.
        </p>
      </div>

      <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.7;font-family:Arial,sans-serif;">
        <strong>📍</strong> ${THRIVE.ADDRESS}<br>
        <strong>⏰</strong> ${THRIVE.HOURS}
      </p>

      <div style="text-align:center;margin:24px 0 8px;">
        <a href="https://bakedbot.ai/thrive" style="display:inline-block;background-color:${THRIVE.TEAL};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
          Browse Today's Menu &rarr;
        </a>
      </div>

      <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;font-family:Arial,sans-serif;">
        Offer valid in-store only · April 20, 2026 · Cannot be combined with other discounts
      </p>
    </td>
  </tr>`;

  return wrap('Happy 4/20 — 20% Off Storewide at Thrive', '4/20 Celebration', bodyRows);
}

// ── SES sender ──────────────────────────────────────────────────────
async function sendViaSes({ to, subject, html }) {
  const client = new SESClient({
    region: process.env.AWS_SES_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
    },
  });

  const command = new SendEmailCommand({
    Source: `${THRIVE.FROM_NAME} <${THRIVE.FROM}>`,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: { Html: { Data: html, Charset: 'UTF-8' } },
    },
  });

  const result = await client.send(command);
  return result.MessageId;
}

// ── Main ────────────────────────────────────────────────────────────
const TO = 'martez@bakedbot.ai';
const FIRST_NAME = 'Ade';

async function main() {
  console.log('Sending Thrive test emails to', TO);

  const checkinHtml = buildCheckinEmail(FIRST_NAME);
  const id1 = await sendViaSes({
    to: TO,
    subject: 'Welcome to VIP Rewards — Thrive Syracuse',
    html: checkinHtml,
  });
  console.log('✅ Check-In Welcome sent  | MessageId:', id1);

  const campaignHtml = build420Email(FIRST_NAME);
  const id2 = await sendViaSes({
    to: TO,
    subject: '🌿 Happy 4/20 — 20% Off Storewide at Thrive',
    html: campaignHtml,
  });
  console.log('✅ 4/20 Campaign sent     | MessageId:', id2);

  console.log('\nDone. Check martez@bakedbot.ai inbox.');
}

main().catch((e) => { console.error('❌ Failed:', e.message); process.exit(1); });
