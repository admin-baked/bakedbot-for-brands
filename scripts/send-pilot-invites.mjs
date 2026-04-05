#!/usr/bin/env node
/**
 * send-pilot-invites.mjs — Send onboarding invitations to pilot dispensary owners
 *
 * Bypasses the auth-gated server action and writes directly to Firestore,
 * then sends the invite email via Mailjet.
 *
 * Usage:
 *   node scripts/send-pilot-invites.mjs              # dry-run
 *   node scripts/send-pilot-invites.mjs --apply      # write + send email
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Mailjet from 'node-mailjet';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// =============================================================================
// ENV
// =============================================================================

const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split(/\r?\n/).forEach((line) => {
        if (line && !line.startsWith('#') && line.includes('=')) {
            const eqIdx = line.indexOf('=');
            const key = line.slice(0, eqIdx).trim();
            const val = line.slice(eqIdx + 1).trim();
            if (key && !process.env[key]) process.env[key] = val;
        }
    });
}

// =============================================================================
// FIREBASE
// =============================================================================

if (getApps().length === 0) {
    const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8'));
    initializeApp({ credential: cert(sa) });
}
const db = getFirestore();

// =============================================================================
// MAILJET
// =============================================================================

function getMailjet() {
    const key = process.env.MAILJET_API_KEY?.trim();
    const secret = process.env.MAILJET_SECRET_KEY?.trim();
    if (!key || !secret) throw new Error('MAILJET_API_KEY / MAILJET_SECRET_KEY not configured');
    return new Mailjet({ apiKey: key, apiSecret: secret });
}

// =============================================================================
// INVITE DEFINITIONS
// =============================================================================

const INVITES = [
    {
        email: 'ceo@simplypuretrenton.com',
        name: 'Tahir Johnson',
        role: 'dispensary_admin',
        orgId: 'org_simplypuretrenton',
        orgName: 'Simply Pure Trenton',
    },
    {
        email: 'lakeshorecannabis@bakedbot.ai',
        name: 'Lakeshore Cannabis Club',
        role: 'dispensary_admin',
        orgId: 'org_lakeshorecannabis',
        orgName: 'Lakeshore Cannabis Club',
    },
];

// =============================================================================
// ARGS
// =============================================================================

const DRY_RUN = !process.argv.includes('--apply');
const BASE_URL = process.env.NEXT_PUBLIC_CANONICAL_URL || 'https://bakedbot.ai';

// =============================================================================
// MAIN
// =============================================================================

async function main() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  BakedBot Pilot Invite Sender`);
    console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🚀 LIVE — writing + sending email'}`);
    console.log(`${'='.repeat(60)}\n`);

    for (const invite of INVITES) {
        await sendInvite(invite);
    }

    if (DRY_RUN) {
        console.log('\n⚠️  DRY RUN — no data written. Run with --apply to send.\n');
    }
}

async function sendInvite({ email, name, role, orgId, orgName }) {
    const token = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
    const inviteLink = `${BASE_URL}/invite/${token}`;
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    console.log(`📧 ${name} <${email}>`);
    console.log(`   Org: ${orgName} (${orgId}) | Role: ${role}`);
    console.log(`   Link: ${inviteLink}`);

    if (DRY_RUN) {
        console.log(`   [DRY RUN] Would create invitations/${id} + send email\n`);
        return;
    }

    // 1. Write invitation doc
    await db.collection('invitations').doc(id).set({
        id,
        email: email.toLowerCase(),
        role,
        targetOrgId: orgId,
        organizationName: orgName,
        organizationType: 'dispensary',
        invitedBy: 'system_admin',
        status: 'pending',
        token,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt,
    });
    console.log(`   ✅ invitations/${id} created`);

    // 2. Send email via Mailjet
    const mj = getMailjet();
    const result = await mj.post('send', { version: 'v3.1' }).request({
        Messages: [{
            From: { Email: 'hello@bakedbot.ai', Name: 'BakedBot Team' },
            To: [{ Email: email, Name: name }],
            Subject: `You're invited to BakedBot — ${orgName}`,
            HTMLPart: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <img src="https://bakedbot.ai/logo.png" alt="BakedBot" style="height:40px;margin-bottom:24px;" />
  <h1 style="color:#16a34a;margin-bottom:8px;">Welcome to BakedBot, ${name}!</h1>
  <p style="color:#374151;font-size:16px;line-height:1.6;">
    Your BakedBot account for <strong>${orgName}</strong> is ready. You've been set up as a
    <strong>${role.replace(/_/g, ' ')}</strong> — your AI-powered command center for competitive
    pricing intelligence, inbox, check-in, creative center, and menu pages.
  </p>
  <p style="margin:28px 0;">
    <a href="${inviteLink}"
       style="background:#16a34a;color:white;padding:14px 28px;text-decoration:none;
              border-radius:8px;display:inline-block;font-weight:600;font-size:15px;">
      Accept Invitation &amp; Get Started
    </a>
  </p>
  <p style="color:#6b7280;font-size:14px;">Or copy this link:<br/>
    <span style="background:#f3f4f6;padding:8px 12px;border-radius:4px;
                 font-family:monospace;font-size:13px;word-break:break-all;display:inline-block;margin-top:6px;">
      ${inviteLink}
    </span>
  </p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />
  <p style="color:#9ca3af;font-size:12px;">
    This link expires in 7 days. If you didn't expect this invitation, you can ignore this email.<br/>
    Questions? Reply to this email or reach us at hello@bakedbot.ai.
  </p>
</div>`,
            TextPart: `Welcome to BakedBot, ${name}!\n\nYour account for ${orgName} is ready.\n\nAccept your invitation:\n${inviteLink}\n\nThis link expires in 7 days.\n\nQuestions? Email hello@bakedbot.ai`,
        }],
    });

    const status = result.response?.status;
    if (status === 200) {
        console.log(`   ✅ Email sent to ${email}\n`);
    } else {
        console.error(`   ❌ Email failed (status ${status})\n`, result.body);
    }
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
