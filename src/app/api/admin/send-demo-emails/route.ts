/**
 * One-shot demo email sender — sends two branded preview emails to martez@bakedbot.ai
 * via production SES so the design can be reviewed and approved.
 * Secured with CRON_SECRET. DELETE after sign-off.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const TO = 'martez@bakedbot.ai';
const THRIVE_LOGO = 'https://storage.googleapis.com/bakedbot-global-assets/logos/org_thrive_syracuse/thrive-logo.svg';
const THRIVE_TEAL = '#1CC0DD';
const THRIVE_DARK = '#0169A1';
const THRIVE_GOLD = '#FEBF10';

const b2bHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;background:#f0f4f0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px 40px;background:#0D211D;">
          <img src="https://bakedbot.ai/bakedbot-logo-horizontal.png" alt="BakedBot AI" height="36" style="display:block;">
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#1a1a1a;">Hi Taylor,</p>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#1a1a1a;">You completed our Fit/Function/Finance audit a few weeks back — and based on what you shared, BakedBot is a strong fit for Greenleaf Dispensary.</p>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#1a1a1a;">Here's what we're seeing at dispensaries our size running BakedBot:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:#f6fdf9;border-radius:10px;border:1px solid #d1fae5;">
            <tr><td style="padding:24px 28px;">
              <p style="margin:0 0 12px;font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0A803A;">Results at live dispensaries</p>
              <p style="margin:0 0 10px;font-size:15px;color:#1a1a1a;line-height:1.6;">📈 <strong>22% increase</strong> in repeat customer visits within 60 days</p>
              <p style="margin:0 0 10px;font-size:15px;color:#1a1a1a;line-height:1.6;">💬 <strong>3x faster</strong> product recommendations — Smokey handles it at check-in</p>
              <p style="margin:0 0 10px;font-size:15px;color:#1a1a1a;line-height:1.6;">📊 <strong>Daily competitive pricing</strong> — know what competitors changed overnight</p>
              <p style="margin:0;font-size:15px;color:#1a1a1a;line-height:1.6;">⚡ <strong>Zero additional staff time</strong> — runs on autopilot</p>
            </td></tr>
          </table>
          <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#1a1a1a;">I'd love to walk you through exactly how this would work at Greenleaf. 20 minutes — no pitch deck, just a live demo against your actual market.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="background:#22AD85;border-radius:8px;padding:14px 32px;">
              <a href="https://calendly.com/bakedbot/demo" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Book a 20-Minute Demo →</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#555;">— Martez<br><span style="color:#888;font-size:13px;">Founder, BakedBot AI | martez@bakedbot.ai</span></p>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#f8f8f8;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#aaa;text-align:center;">BakedBot AI · You received this because you completed a Fit/Function/Finance audit.<br><a href="#" style="color:#22AD85;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const thriveHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0fbfd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;background:#f0fbfd;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(28,192,221,0.15);">
        <tr><td style="padding:28px 40px 24px;background:${THRIVE_DARK};text-align:center;">
          <img src="${THRIVE_LOGO}" alt="Thrive Cannabis Marketplace" height="44" style="display:block;margin:0 auto 12px;">
          <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${THRIVE_GOLD};font-weight:600;">VIP Rewards</p>
        </td></tr>
        <tr><td style="height:4px;background:linear-gradient(90deg,${THRIVE_TEAL},${THRIVE_GOLD},${THRIVE_TEAL});"></td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;font-size:22px;color:#0169A1;line-height:1.3;">Great seeing you today, Alex!</h2>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">Thanks for stopping by. Jamie was on duty today — ask for them next time and they'll have your favorites pulled up before you walk in.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#f0fbfd;border-radius:10px;border-left:4px solid ${THRIVE_TEAL};">
            <tr><td style="padding:18px 22px;">
              <p style="margin:0;font-size:15px;color:#0169A1;line-height:1.6;">🎁 <strong>You now have 340 VIP points</strong> — 60 away from your next $5 reward.<br><span style="font-size:13px;color:#555;">1 point per $1 spent · 100 points = $5 off</span></p>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#333;">How was your experience today? A quick rating helps our team keep improving — takes 5 seconds.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="background:${THRIVE_TEAL};border-radius:8px;padding:14px 32px;">
              <a href="https://bakedbot.ai/thrivesyracuse?review=1" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Rate Your Visit ⭐</a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#555;">Coming back soon? Pre-check in from your phone and skip the wait.</p>
          <p style="margin:0;font-size:14px;"><a href="https://bakedbot.ai/loyalty-tablet?orgId=org_thrive_syracuse" style="color:${THRIVE_TEAL};font-weight:600;text-decoration:none;">Pre-Check In →</a></p>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#f0fbfd;border-top:1px solid #b2e8f2;">
          <p style="margin:0 0 4px;font-size:12px;color:#666;text-align:center;"><strong>Thrive Cannabis Marketplace</strong><br>3065 Erie Blvd E, Syracuse, NY 13224 · Mon–Sat 10:30 AM–8 PM · Sun 11 AM–6 PM</p>
          <p style="margin:8px 0 0;font-size:11px;color:#aaa;text-align:center;"><a href="https://bakedbot.ai/unsubscribe" style="color:${THRIVE_TEAL};">Unsubscribe</a> · <a href="https://bakedbot.ai/privacy" style="color:${THRIVE_TEAL};">Privacy</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

async function handler(request: NextRequest) {
    const authError = await requireCronSecret(request, 'send-demo-emails');
    if (authError) return authError;

    logger.info('[DemoEmails] Sending preview emails to', { to: TO });

    const [r1, r2] = await Promise.allSettled([
        sendGenericEmail({
            to: TO,
            name: 'Martez Benjamins',
            fromEmail: 'martez@bakedbot.ai',
            fromName: 'Martez Benjamins',
            subject: '[DEMO] B2B Lead Nurture — FFF Audit Follow-Up (BakedBot AI)',
            htmlBody: b2bHtml,
        }),
        sendGenericEmail({
            to: TO,
            name: 'Martez Benjamins',
            fromEmail: 'hello@bakedbot.ai',
            fromName: 'Thrive Cannabis Marketplace',
            subject: '[DEMO] Thrive VIP — Post-Visit Email with Logo + Brand Colors',
            htmlBody: thriveHtml,
            orgId: 'org_thrive_syracuse',
        }),
    ]);

    const b2bOk = r1.status === 'fulfilled' && r1.value.success;
    const thriveOk = r2.status === 'fulfilled' && r2.value.success;

    return NextResponse.json({
        success: b2bOk && thriveOk,
        b2b: b2bOk ? 'sent' : (r1.status === 'fulfilled' ? r1.value.error : String((r1 as PromiseRejectedResult).reason)),
        thrive: thriveOk ? 'sent' : (r2.status === 'fulfilled' ? r2.value.error : String((r2 as PromiseRejectedResult).reason)),
    });
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
