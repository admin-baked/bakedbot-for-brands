#!/usr/bin/env node
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
dotenv.config({ path: '.env.local' });

const key = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(key)), projectId: 'studio-567050101-bc6e8' });
const db = admin.firestore();

const EMAIL    = 'seuss312@gmail.com';
const NAME     = 'Jehreal Webster';
const ORG_ID   = 'org_lakeshorecannabis';
const ORG_NAME = 'Lakeshore Cannabis Club';
const ROLE     = 'dispensary_admin';
const BASE_URL = 'https://bakedbot.ai';

const token      = randomUUID().replace(/-/g,'') + randomUUID().replace(/-/g,'');
const inviteLink = `${BASE_URL}/invite/${token}`;
const now        = new Date();
const expiresAt  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const id         = randomUUID();

await db.collection('invitations').doc(id).set({
  id, email: EMAIL.toLowerCase(), role: ROLE,
  targetOrgId: ORG_ID, organizationName: ORG_NAME, organizationType: 'dispensary',
  invitedBy: 'system', status: 'pending', token,
  createdAt: now, expiresAt,
});
console.log('Invitation created:', id);
console.log('Link:', inviteLink);

const apiKey    = process.env.MAILJET_API_KEY;
const secretKey = process.env.MAILJET_SECRET_KEY || process.env.MAILJET_API_SECRET;
if (!apiKey || !secretKey) {
  console.log('No Mailjet keys — invite link saved to Firestore. Share manually:\n' + inviteLink);
  process.exit(0);
}

const htmlBody = [
  '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">',
  `<h1 style="color:#16a34a;">Welcome to BakedBot, ${NAME}!</h1>`,
  `<p>You have been invited to manage <strong>${ORG_NAME}</strong> on BakedBot AI as a <strong>Dispensary Admin</strong>.</p>`,
  '<p>BakedBot is your AI-powered commerce OS — loyalty check-in kiosk, automated campaigns, competitive intel, and more.</p>',
  '<p style="margin:24px 0;">',
  `<a href="${inviteLink}" style="background-color:#16a34a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">`,
  'Accept Invitation &amp; Set Up Your Account',
  '</a></p>',
  `<p style="color:#666;font-size:13px;">Or copy this link:<br><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px;word-break:break-all;">${inviteLink}</code></p>`,
  '<p style="font-size:12px;color:#999;margin-top:32px;">This link expires in 7 days. Questions? Reply to this email.</p>',
  '</div>',
].join('');

const textBody = [
  `Welcome ${NAME}!`,
  '',
  `You have been invited to manage ${ORG_NAME} on BakedBot AI as a Dispensary Admin.`,
  '',
  'Accept your invitation:',
  inviteLink,
  '',
  'This link expires in 7 days.',
].join('\n');

const body = {
  Messages: [{
    From: { Email: 'hello@bakedbot.ai', Name: 'BakedBot Team' },
    To:   [{ Email: EMAIL, Name: NAME }],
    Subject: `You're invited to manage ${ORG_NAME} on BakedBot`,
    HTMLPart: htmlBody,
    TextPart: textBody,
  }],
};

const creds = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
const res   = await fetch('https://api.mailjet.com/v3.1/send', {
  method:  'POST',
  headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/json' },
  body:    JSON.stringify(body),
});
const json = await res.json();
if (res.ok && json.Messages?.[0]?.Status === 'success') {
  console.log(`Email sent to ${EMAIL} (${NAME})`);
} else {
  console.error('Email error:', JSON.stringify(json));
  process.exit(1);
}
process.exit(0);
