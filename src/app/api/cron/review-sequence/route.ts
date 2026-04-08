export const dynamic = 'force-dynamic';
/**
 * Review Sequence Cron
 *
 * Processes checkin_visits for post-visit email sequences:
 *   Day 0 — Checkout/thank-you email (sent same day as visit)
 *   Day 3 — Review nudge (only if no review yet)
 *
 * Recommended schedule: every 4 hours via Cloud Scheduler
 * POST /api/cron/review-sequence
 */

import { NextRequest, NextResponse } from 'next/server';
import { firestoreTimestampToDate } from '@/lib/firestore-utils';
import { getAdminFirestore } from '@/firebase/admin';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';

export const maxDuration = 120;

type ReviewSequenceStatus = 'pending' | 'complete' | 'skipped_no_email';

interface ReviewSequence {
    status: ReviewSequenceStatus;
    checkoutEmailScheduledAt: FirebaseFirestore.Timestamp | Date;
    reviewNudgeScheduledAt: FirebaseFirestore.Timestamp | Date;
    checkoutEmailSentAt?: FirebaseFirestore.Timestamp | Date;
    reviewNudgeSentAt?: FirebaseFirestore.Timestamp | Date;
    reviewLeft: boolean;
}

interface CheckinVisit {
    visitId: string;
    customerId: string;
    orgId: string;
    firstName: string;
    email: string | null;
    phone: string | null;
    mood: string | null;
    cartProductIds: string[];
    emailConsent: boolean;
    reviewSequence: ReviewSequence;
}


// Maps orgId → display name for email copy
function getDispensaryName(orgId: string): string {
    const NAMES: Record<string, string> = {
        org_thrive_syracuse: 'Thrive Syracuse',
    };
    return NAMES[orgId] ?? orgId;
}

function checkoutEmailHtml(firstName: string, orgId: string): string {
    const dispensaryName = getDispensaryName(orgId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bakedbot.ai';
    const brandSlug = orgId.replace(/^org_/, '').replace(/_/g, '');
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
        <tr><td style="background:#1a472a;padding:32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">${dispensaryName}</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px">Your trusted cannabis dispensary</p>
        </td></tr>
        <tr><td style="padding:40px 32px">
          <h2 style="margin:0 0 12px;color:#1a1a1a;font-size:20px">Thanks for stopping by, ${firstName}! 🌿</h2>
          <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.6">
            It was great seeing you in-store today. We hope we found something perfect for you!
          </p>
          <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.6">
            As a loyalty member, you earn points on every purchase. Check your balance and explore
            exclusive member deals on your next visit.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:28px 0">
            <tr><td style="background:#1a472a;border-radius:8px;padding:14px 28px">
              <a href="${appUrl}/${brandSlug}/rewards" style="color:#fff;font-size:15px;font-weight:600;text-decoration:none">
                View Your Loyalty Rewards →
              </a>
            </td></tr>
          </table>
          <p style="margin:0;color:#888;font-size:13px">
            See you again soon! — The ${dispensaryName} team
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 32px;border-top:1px solid #eee">
          <p style="margin:0;color:#aaa;font-size:12px;line-height:1.5">
            You're receiving this because you checked in at ${dispensaryName}.
            Reply to unsubscribe at any time.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function reviewNudgeEmailHtml(
    firstName: string,
    orgId: string,
    visitId: string,
): string {
    const dispensaryName = getDispensaryName(orgId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bakedbot.ai';
    const reviewUrl = `${appUrl}/review?orgId=${encodeURIComponent(orgId)}&visitId=${encodeURIComponent(visitId)}`;

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
        <tr><td style="background:#1a472a;padding:32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">${dispensaryName}</h1>
        </td></tr>
        <tr><td style="padding:40px 32px">
          <h2 style="margin:0 0 12px;color:#1a1a1a;font-size:20px">How was your experience, ${firstName}? 🌟</h2>
          <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.6">
            We loved having you in-store a few days ago! Your feedback helps other customers
            shopping at ${dispensaryName} — and means the world to our team.
          </p>
          <p style="margin:0 0 4px;color:#555;font-size:15px;line-height:1.6">
            Could you spare 30 seconds to rate your visit?
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:28px 0">
            <tr><td style="background:#1a472a;border-radius:8px;padding:14px 28px">
              <a href="${reviewUrl}" style="color:#fff;font-size:15px;font-weight:600;text-decoration:none">
                ⭐ Rate Your Visit →
              </a>
            </td></tr>
          </table>
          <p style="margin:0;color:#888;font-size:13px">
            Thank you for your support! — The ${dispensaryName} team
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 32px;border-top:1px solid #eee">
          <p style="margin:0;color:#aaa;font-size:12px;line-height:1.5">
            You're receiving this because you checked in at ${dispensaryName}.
            Reply to unsubscribe at any time.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function processVisit(
    docRef: FirebaseFirestore.DocumentReference,
    visit: CheckinVisit,
    now: Date,
): Promise<{ checkoutSent: boolean; nudgeSent: boolean }> {
    const seq = visit.reviewSequence;
    const email = visit.email;
    const updates: Record<string, unknown> = {};
    let checkoutSent = false;
    let nudgeSent = false;

    if (!email || !visit.emailConsent) {
        await docRef.update({ 'reviewSequence.status': 'skipped_no_email' });
        return { checkoutSent, nudgeSent };
    }

    const dispensaryName = getDispensaryName(visit.orgId);
    const checkoutScheduled = firestoreTimestampToDate(seq.checkoutEmailScheduledAt);
    const nudgeScheduled = firestoreTimestampToDate(seq.reviewNudgeScheduledAt);

    // Build both email promises in parallel if both are due
    const emailTasks: Promise<void>[] = [];

    if (checkoutScheduled && checkoutScheduled <= now && !seq.checkoutEmailSentAt) {
        emailTasks.push(
            sendGenericEmail({
                to: email,
                name: visit.firstName,
                subject: `Thanks for visiting ${dispensaryName}! 🌿`,
                htmlBody: checkoutEmailHtml(visit.firstName, visit.orgId),
                orgId: visit.orgId,
                communicationType: 'transactional',
                agentName: 'loyalty-tablet',
            }).then(result => {
                if (result.success) {
                    updates['reviewSequence.checkoutEmailSentAt'] = now;
                    checkoutSent = true;
                } else {
                    logger.warn('[ReviewSequence] Checkout email failed', { visitId: visit.visitId, error: result.error });
                }
            }),
        );
    }

    if (nudgeScheduled && nudgeScheduled <= now && !seq.reviewNudgeSentAt && !seq.reviewLeft) {
        emailTasks.push(
            sendGenericEmail({
                to: email,
                name: visit.firstName,
                subject: `How was your visit to ${dispensaryName}? Rate your experience 🌟`,
                htmlBody: reviewNudgeEmailHtml(visit.firstName, visit.orgId, visit.visitId),
                orgId: visit.orgId,
                communicationType: 'transactional',
                agentName: 'loyalty-tablet',
            }).then(result => {
                if (result.success) {
                    updates['reviewSequence.reviewNudgeSentAt'] = now;
                    nudgeSent = true;
                } else {
                    logger.warn('[ReviewSequence] Review nudge failed', { visitId: visit.visitId, error: result.error });
                }
            }),
        );
    }

    if (emailTasks.length) {
        await Promise.all(emailTasks);
    }

    // Mark complete only when both emails have actually been sent (or were already sent/skipped)
    const checkoutDone = !!seq.checkoutEmailSentAt || checkoutSent;
    const nudgeDone = !!seq.reviewNudgeSentAt || nudgeSent || !!seq.reviewLeft;
    if (checkoutDone && nudgeDone) {
        updates['reviewSequence.status'] = 'complete';
    }

    if (Object.keys(updates).length) {
        await docRef.update(updates);
    }

    return { checkoutSent, nudgeSent };
}

async function handleReviewSequence() {
    const db = getAdminFirestore();
    const now = new Date();

    const snap = await db
        .collection('checkin_visits')
        .where('reviewSequence.status', '==', 'pending')
        .orderBy('visitedAt', 'asc')
        .limit(50)
        .get();

    let checkoutCount = 0;
    let nudgeCount = 0;
    let skippedCount = 0;

    // Process in parallel batches of 10 to balance speed vs. connection limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = snap.docs.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
            batch.map(doc =>
                processVisit(doc.ref, doc.data() as CheckinVisit, now).catch(err => {
                    skippedCount++;
                    logger.error('[ReviewSequence] Failed to process visit', {
                        visitId: (doc.data() as CheckinVisit).visitId,
                        error: String(err),
                    });
                    return { checkoutSent: false, nudgeSent: false };
                }),
            ),
        );
        for (const r of results) {
            if (r.checkoutSent) checkoutCount++;
            if (r.nudgeSent) nudgeCount++;
        }
    }

    logger.info('[ReviewSequence] Run complete', {
        processed: snap.size,
        checkoutEmailsSent: checkoutCount,
        reviewNudgesSent: nudgeCount,
        errors: skippedCount,
    });

    return {
        processed: snap.size,
        checkoutEmailsSent: checkoutCount,
        reviewNudgesSent: nudgeCount,
        errors: skippedCount,
    };
}

export async function POST(request: NextRequest) {
    const authError = await requireCronSecret(request, 'review-sequence');
    if (authError) return authError;

    try {
        const stats = await handleReviewSequence();
        return NextResponse.json({ success: true, ...stats });
    } catch (err) {
        logger.error('[CRON review-sequence] Error', { error: String(err) });
        return NextResponse.json({ error: 'Review sequence cron failed' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
