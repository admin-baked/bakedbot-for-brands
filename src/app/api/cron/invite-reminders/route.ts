/**
 * Weekly Invite Reminder Cron
 *
 * Cloud Scheduler job:
 *   Name:     invite-reminders
 *   Schedule: 0 15 * * 3  (11 AM EST = 3 PM UTC, every Wednesday — mid-week open rates peak)
 *   URL:      https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/invite-reminders
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 *
 * For every pending invitation not yet accepted:
 *   - Skips if a reminder was sent within the last 7 days
 *   - Pulls competitive intel for the org's market (real data or GLM-generated)
 *   - Rotates 4 A/B subject line variants by reminderCount so we can compare acceptance rates
 *   - Sends via sendGenericEmail, logs to invite_reminder_log for A/B analysis
 *   - Updates invitation with reminderCount++ and lastReminderAt
 *   - Extends expiresAt by 7 more days so the link stays live
 *
 * Setup (run once):
 *   gcloud scheduler jobs create http invite-reminders \
 *     --schedule="0 15 * * 3" \
 *     --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/invite-reminders" \
 *     --message-body='{}' \
 *     --headers="Authorization=Bearer ${CRON_SECRET},Content-Type=application/json" \
 *     --time-zone="UTC" --location=us-central1 --attempt-deadline=300s
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { requireCronSecret } from '@/server/auth/cron';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { callGLM, GLM_MODELS } from '@/ai/glm';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BASE_URL = process.env.NEXT_PUBLIC_CANONICAL_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://bakedbot.ai';
const REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// A/B subject line variants
// Variant is chosen by reminderCount % 4 so the same invite cycles through
// all variants. invite_reminder_log tracks which variant was sent each time.
// ---------------------------------------------------------------------------

interface SubjectVariant {
  id: 'A' | 'B' | 'C' | 'D';
  build: (ctx: { orgName: string; city: string; state: string }) => string;
}

const SUBJECT_VARIANTS: SubjectVariant[] = [
  {
    id: 'A',
    build: ({ orgName }) => `Your invitation to ${orgName} on BakedBot is still waiting`,
  },
  {
    id: 'B',
    build: ({ city, state }) => `What's happening in ${city}, ${state} cannabis right now`,
  },
  {
    id: 'C',
    build: ({ orgName }) => `${orgName}: your platform is live — here's what competitors are doing`,
  },
  {
    id: 'D',
    build: ({ state }) => `This week's ${state} cannabis market intel (+ your invite)`,
  },
];

// ---------------------------------------------------------------------------
// Competitive intel tidbit
// ---------------------------------------------------------------------------

async function getCompetitiveIntelTidbit(
  db: FirebaseFirestore.Firestore,
  orgId: string,
  city: string,
  state: string,
): Promise<string> {
  // Try real competitor snapshot data first
  try {
    const snap = await db
      .collection('tenants').doc(orgId)
      .collection('competitor_snapshots')
      .orderBy('scrapedAt', 'desc')
      .limit(3)
      .get();

    if (!snap.empty) {
      const snapshots = snap.docs.map(d => d.data());
      const dealCounts = snapshots.map(s => `${s.competitorName}: ${s.dealCount ?? 0} deals`).join(', ');
      const topDeals   = snapshots.flatMap(s => (s.deals ?? []).slice(0, 2))
        .map((d: { category?: string; discount?: number }) => d.discount ? `${d.category} at ${d.discount}% off` : null)
        .filter(Boolean)
        .slice(0, 2);
      if (topDeals.length > 0) {
        return `Local competitors are currently running: ${topDeals.join(' and ')}. (${dealCounts})`;
      }
    }
  } catch {
    // No snapshots yet — fall through to GLM
  }

  // Generate with GLM based on state/market context
  try {
    const prompt = `Generate ONE specific, factual-sounding competitive intelligence insight for a cannabis dispensary in ${city}, ${state}.
2-3 sentences max. Focus on: pricing trends, consumer behavior, or regulatory changes relevant to ${state}.
Be specific and actionable — something a dispensary owner would find valuable. No fluff, no disclaimers.`;

    const raw = await callGLM({
      systemPrompt: 'You are a cannabis market analyst. Respond with a single sharp insight. No preamble.',
      userMessage: prompt,
      model: GLM_MODELS.STANDARD,
      maxTokens: 150,
      temperature: 0.7,
    });
    return raw.trim();
  } catch {
    return `The ${state} cannabis market is seeing increased competition in the edibles and vape categories. Dispensaries with loyalty programs are retaining 2–3× more customers than those without.`;
  }
}

// ---------------------------------------------------------------------------
// Email builder
// ---------------------------------------------------------------------------

function buildReminderEmail(opts: {
  recipientName: string;
  orgName: string;
  inviteLink: string;
  intelTidbit: string;
  reminderCount: number;
}): { html: string; text: string } {
  const { recipientName, orgName, inviteLink, intelTidbit, reminderCount } = opts;

  const isFirstReminder = reminderCount === 0;
  const greeting = isFirstReminder
    ? `Just a friendly reminder — your invitation is still open.`
    : `We're still holding a spot for you.`;

  const html = [
    '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">',

    `<h2 style="color:#16a34a;margin-bottom:4px;">Hey ${recipientName},</h2>`,
    `<p style="color:#555;margin-top:0;">${greeting}</p>`,

    `<p>Your invitation to manage <strong>${orgName}</strong> on BakedBot AI is still waiting. `,
    `BakedBot gives your dispensary a loyalty check-in kiosk, AI-powered customer campaigns, `,
    `competitive pricing intel, and automated outreach — all in one platform.</p>`,

    '<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;margin:24px 0;border-radius:4px;">',
    '<p style="margin:0 0 8px;font-weight:600;color:#15803d;">📊 This Week\'s Market Intel</p>',
    `<p style="margin:0;color:#374151;line-height:1.6;">${intelTidbit}</p>`,
    '</div>',

    '<p style="margin:24px 0;">',
    `<a href="${inviteLink}" style="background-color:#16a34a;color:white;padding:12px 28px;`,
    `text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;font-size:15px;">`,
    'Set Up Your Account →',
    '</a></p>',

    `<p style="color:#6b7280;font-size:13px;">Or copy this link:<br>`,
    `<code style="background:#f5f5f5;padding:4px 8px;border-radius:4px;`,
    `word-break:break-all;font-size:12px;">${inviteLink}</code></p>`,

    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">',
    '<p style="font-size:12px;color:#9ca3af;">',
    `You're receiving this because someone invited you to ${orgName} on BakedBot. `,
    'If you\'re not interested, simply ignore this email.',
    '</p>',
    '</div>',
  ].join('');

  const text = [
    `Hey ${recipientName},`,
    '',
    greeting,
    '',
    `Your invitation to manage ${orgName} on BakedBot AI is still open.`,
    '',
    '📊 This Week\'s Market Intel:',
    intelTidbit,
    '',
    'Accept your invitation:',
    inviteLink,
    '',
    'Questions? Reply to this email.',
  ].join('\n');

  return { html, text };
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

interface InviteReminderResult {
  sent: number;
  skipped: number;
  errors: number;
  details: { email: string; orgName: string; variant: string; action: string }[];
}

async function runInviteReminders(): Promise<InviteReminderResult> {
  const db = getAdminFirestore();
  const now = new Date();
  const result: InviteReminderResult = { sent: 0, skipped: 0, errors: 0, details: [] };

  // All pending invitations that haven't expired
  const snap = await db.collection('invitations')
    .where('status', '==', 'pending')
    .where('expiresAt', '>', now)
    .limit(100)
    .get();

  if (snap.empty) {
    logger.info('[InviteReminders] No pending invitations');
    return result;
  }

  // Get org details for all unique orgs in parallel
  const orgIds = [...new Set(snap.docs.map(d => d.data().targetOrgId).filter(Boolean) as string[])];
  const orgDocs = await Promise.all(orgIds.map(id => db.collection('organizations').doc(id).get()));
  const orgMap = new Map(orgDocs.filter(d => d.exists).map(d => [d.id, d.data()!]));

  for (const doc of snap.docs) {
    const inv = doc.data();
    const invId = doc.id;

    try {
      // Skip if reminded within the last 7 days
      const lastReminder = inv.lastReminderAt?.toDate?.() ?? inv.lastReminderAt;
      if (lastReminder && (now.getTime() - new Date(lastReminder).getTime()) < REMINDER_INTERVAL_MS) {
        result.skipped++;
        result.details.push({ email: inv.email, orgName: inv.organizationName ?? '', variant: '-', action: 'skipped (too recent)' });
        continue;
      }

      const orgData  = inv.targetOrgId ? orgMap.get(inv.targetOrgId) : null;
      const city     = orgData?.city  ?? 'your city';
      const state    = orgData?.state ?? 'your state';
      const orgName  = inv.organizationName ?? orgData?.name ?? 'your dispensary';
      const token    = inv.token as string;
      const inviteLink = `${BASE_URL}/invite/${token}`;

      const reminderCount = typeof inv.reminderCount === 'number' ? inv.reminderCount : 0;
      const variantDef    = SUBJECT_VARIANTS[reminderCount % SUBJECT_VARIANTS.length];
      const subject       = variantDef.build({ orgName, city, state });

      const intelTidbit = await getCompetitiveIntelTidbit(db, inv.targetOrgId ?? '', city, state);

      // Derive recipient name from email (best-effort until they have a profile)
      const recipientName = inv.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

      const { html, text } = buildReminderEmail({ recipientName, orgName, inviteLink, intelTidbit, reminderCount });

      const emailResult = await sendGenericEmail({
        to:               inv.email,
        name:             recipientName,
        fromEmail:        'hello@bakedbot.ai',
        fromName:         'BakedBot Team',
        subject,
        htmlBody:         html,
        textBody:         text,
        communicationType: 'transactional',
        orgId:            inv.targetOrgId,
      });

      if (!emailResult.success) {
        throw new Error(emailResult.error ?? 'sendGenericEmail failed');
      }

      // Update invitation
      const newExpiresAt = new Date(Math.max(
        new Date(inv.expiresAt?.toDate?.() ?? inv.expiresAt).getTime(),
        now.getTime() + REMINDER_INTERVAL_MS,
      ));
      await db.collection('invitations').doc(invId).update({
        reminderCount:  reminderCount + 1,
        lastReminderAt: now,
        expiresAt:      newExpiresAt,
      });

      // A/B log — used to compare acceptance rates by subject variant
      await db.collection('invite_reminder_log').add({
        invitationId:  invId,
        email:         inv.email,
        orgId:         inv.targetOrgId ?? null,
        orgName,
        subjectVariant: variantDef.id,
        subjectLine:   subject,
        reminderNumber: reminderCount + 1,
        intelTidbit,
        sentAt:        now,
      });

      result.sent++;
      result.details.push({ email: inv.email, orgName, variant: variantDef.id, action: `sent (reminder #${reminderCount + 1})` });
      logger.info('[InviteReminders] Sent', { email: inv.email, orgName, variant: variantDef.id, reminderNumber: reminderCount + 1 });

    } catch (err) {
      result.errors++;
      result.details.push({ email: inv.email, orgName: inv.organizationName ?? '', variant: '-', action: `error: ${err instanceof Error ? err.message : String(err)}` });
      logger.error('[InviteReminders] Failed for invite', { invId, email: inv.email, err: String(err) });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireCronSecret(request, 'invite-reminders');
  if (authError) return authError;

  logger.info('[InviteReminders] Starting weekly invite reminder run');

  try {
    const result = await runInviteReminders();

    logger.info('[InviteReminders] Complete', result);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error('[InviteReminders] Fatal error', { error: String(error) });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request);
}
