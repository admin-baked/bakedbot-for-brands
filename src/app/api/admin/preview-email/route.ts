/**
 * Email Preview API
 * Returns raw HTML for any email template — open in browser, nothing sent.
 *
 * GET /api/admin/preview-email?type=welcome&orgId=org_thrive_syracuse
 * GET /api/admin/preview-email?type=returning&orgId=org_thrive_syracuse
 * GET /api/admin/preview-email?type=nudge&orgId=org_thrive_syracuse
 * GET /api/admin/preview-email?type=welcome&orgId=brand_ecstatic_edibles
 *
 * Secured with CRON_SECRET header (x-cron-secret) or session cookie (super user).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { thriveEmail, thriveCard, thriveCta, thriveLoyaltyBlock, THRIVE } from '@/lib/email/thrive-template';

export const dynamic = 'force-dynamic';

const ECSTATIC_LOGO = 'https://storage.googleapis.com/bakedbot-global-assets/brands/brand_ecstatic_edibles/logo/ecstatic_logo.png';
const ECSTATIC_RED = '#e11d48';

// ---------------------------------------------------------------------------
// Template builders (sample data — nothing real is used)
// ---------------------------------------------------------------------------

function buildThriveWelcome(): string {
    const unsub = 'https://bakedbot.ai/api/email/unsubscribe?token=PREVIEW';
    return thriveEmail({
        title: 'Welcome to Thrive VIP Rewards',
        badgeText: '🌿 VIP Rewards',
        unsubscribeUrl: unsub,
        bodyRows: thriveCard(`
            <p style="margin:0 0 4px;font-size:11px;color:#999;text-align:right;">[Preview — welcome email]</p>
            <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:${THRIVE.BODY_HEADING};line-height:1.3;">
                Welcome to Thrive VIP, Alex! 🌿
            </p>
            <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
                Thanks for visiting Thrive Cannabis Marketplace — you're now part of our VIP Rewards program!
            </p>
            ${thriveLoyaltyBlock(50)}
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                Based on your visit, we think you'll love our <strong>relaxing indica</strong> selection.
            </p>
            ${thriveCta({ label: 'Pre-Check In for Your Next Visit', url: 'https://bakedbot.ai/thrivesyracuse' })}
        `),
    });
}

function buildThriveReturning(): string {
    const unsub = 'https://bakedbot.ai/api/email/unsubscribe?token=PREVIEW';
    return thriveEmail({
        title: 'Great seeing you today!',
        badgeText: '🌿 VIP Rewards',
        unsubscribeUrl: unsub,
        bodyRows: thriveCard(`
            <p style="margin:0 0 4px;font-size:11px;color:#999;text-align:right;">[Preview — returning customer email]</p>
            <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:${THRIVE.BODY_HEADING};line-height:1.3;">
                Great seeing you today, Alex! 🌿
            </p>
            <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
                Thanks for stopping by! Jamie was on duty today — ask for them next time!
            </p>
            ${thriveLoyaltyBlock(340)}
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                How was your experience today? A quick rating helps our team — takes 5 seconds.
            </p>
            ${thriveCta({ label: 'Rate Your Visit ⭐', url: 'https://bakedbot.ai/thrivesyracuse?review=1' })}
            <p style="margin:16px 0 0;font-size:14px;color:#6b7280;text-align:center;">
                Questions? Reply to this email — we're here to help!
            </p>
        `),
    });
}

function buildThriveNudge(): string {
    const unsub = 'https://bakedbot.ai/api/email/unsubscribe?token=PREVIEW';
    return thriveEmail({
        title: "We miss you, Alex! 🌿",
        badgeText: '🌿 We Miss You',
        unsubscribeUrl: unsub,
        bodyRows: thriveCard(`
            <p style="margin:0 0 4px;font-size:11px;color:#999;text-align:right;">[Preview — 7-day retention nudge]</p>
            <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:${THRIVE.BODY_HEADING};line-height:1.3;">
                We miss you, Alex! 🌿
            </p>
            <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
                It's been about a week since your last visit, and we wanted to check in.
            </p>
            <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
                Based on your last visit, we think you'd love our <strong>relaxing indica</strong> selection.
            </p>
            <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Here's what's new this week:</p>
            <ul style="margin:0 0 28px;padding-left:20px;color:#374151;font-size:15px;line-height:2.0;">
                <li>New arrivals — fresh strains just in</li>
                <li>Weekly deals — member pricing</li>
                <li>Exclusive rewards points double</li>
            </ul>
            ${thriveCta({ label: "See What's New", url: 'https://bakedbot.ai/thrivesyracuse' })}
        `),
    });
}

function buildEcstaticWelcome(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Welcome to the Ecstatic Family!</title></head>
<body style="margin:0;padding:0;background:#fff5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#4a0416;">
  <p style="margin:8px auto;font-size:11px;color:#999;text-align:center;">[Preview — welcome email]</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 12px;background:#fff5f7;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(225,29,72,0.1);">
        <tr><td style="padding:40px;text-align:center;background:linear-gradient(135deg,${ECSTATIC_RED} 0%,#be123c 100%);">
          <img src="${ECSTATIC_LOGO}" alt="Melanie's Ecstatic Edibles" width="200" style="display:block;margin:0 auto 16px;">
          <h1 style="margin:0;font-size:32px;color:#fff;letter-spacing:-0.02em;">Welcome, Honey! 🍪</h1>
          <p style="margin:12px 0 0;font-size:16px;color:rgba(255,255,255,0.9);font-weight:500;">From Los Angeles with Love · Founded by Melanie Comarcho</p>
        </td></tr>
        <tr><td style="padding:48px 40px;">
          <p style="margin:0 0 20px;font-size:20px;line-height:1.5;font-weight:600;">Hi Alex,</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">
            We are so thrilled to have you in our inner circle! Ecstatic Edibles is all about bringing pure joy and premium flavor to your day — straight from the heart of LA.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="background:${ECSTATIC_RED};border-radius:12px;padding:16px 36px;">
              <a href="https://bakedbot.ai/ecstaticedibles" style="color:#fff;font-size:16px;font-weight:700;text-decoration:none;">Shop Ecstatic Edibles →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#fff5f7;border-top:1px solid #fecdd3;">
          <p style="margin:0;font-size:12px;color:#999;text-align:center;">© ${new Date().getFullYear()} Ecstatic Edibles · <a href="#" style="color:${ECSTATIC_RED};">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

async function handler(request: NextRequest) {
    const authError = await requireCronSecret(request, 'preview-email');
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') ?? 'returning';
    const orgId = searchParams.get('orgId') ?? 'org_thrive_syracuse';

    let html: string;

    if (orgId === 'brand_ecstatic_edibles') {
        html = buildEcstaticWelcome();
    } else {
        switch (type) {
            case 'welcome':   html = buildThriveWelcome();   break;
            case 'nudge':     html = buildThriveNudge();     break;
            case 'returning':
            default:          html = buildThriveReturning(); break;
        }
    }

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

export async function GET(request: NextRequest) { return handler(request); }
