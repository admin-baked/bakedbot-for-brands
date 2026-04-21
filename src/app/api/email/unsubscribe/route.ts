export const dynamic = 'force-dynamic';
/**
 * GET /api/email/unsubscribe?token=<base64>
 * POST /api/email/unsubscribe  (body: { token })
 *
 * One-click unsubscribe per RFC 8058 / AWS SES List-Unsubscribe requirements.
 *
 * Token = base64url(`${email}|${orgId}`)
 * - Sets customer.emailConsent = false
 * - Creates customer_unsubscribes record for audit
 * - Returns a plain confirmation page (no JS required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { decodeUnsubscribeToken } from '@/lib/email/unsubscribe-token';

async function processUnsubscribe(token: string): Promise<{ success: boolean; email?: string }> {
    const payload = decodeUnsubscribeToken(token);
    if (!payload) return { success: false };

    const { email, orgId } = payload;
    const db = getAdminFirestore();

    // Find customer by email in this org
    const snap = await db.collection('customers')
        .where('orgId', '==', orgId)
        .where('email', '==', email)
        .limit(1)
        .get();

    const now = new Date().toISOString();

    if (!snap.empty) {
        await snap.docs[0].ref.update({
            emailConsent: false,
            emailUnsubscribedAt: now,
            updatedAt: now,
        });
    }

    // Always create an audit record (even if customer not found — email might not be in our DB)
    await db.collection('customer_unsubscribes').add({
        email,
        orgId,
        channel: 'email',
        source: 'one_click_link',
        unsubscribedAt: now,
        customerId: snap.empty ? null : snap.docs[0].id,
    });

    await logger.info('[Unsubscribe] Email unsubscribed', { email, orgId });

    return { success: true, email };
}

const CONFIRMATION_HTML = (email?: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed | BakedBot</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: white; border-radius: 12px; padding: 40px; max-width: 420px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    h1 { font-size: 24px; color: #1e293b; margin: 0 0 12px; }
    p { color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 20px; }
    a { color: #059669; text-decoration: none; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:40px;margin-bottom:16px">✅</div>
    <h1>You're unsubscribed</h1>
    <p>${email ? `<strong>${email}</strong> has been` : 'You have been'} removed from our marketing emails. You won't hear from us again.</p>
    <p>If this was a mistake, contact us at <a href="mailto:support@bakedbot.ai">support@bakedbot.ai</a>.</p>
  </div>
</body>
</html>`;

// GET: one-click link from email
export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token') || '';
    const result = await processUnsubscribe(token);
    return new NextResponse(CONFIRMATION_HTML(result.email), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

// POST: RFC 8058 machine-readable one-click (SES List-Unsubscribe-Post)
export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const params = new URLSearchParams(body);
        const token = params.get('token') || req.nextUrl.searchParams.get('token') || '';
        await processUnsubscribe(token);
        return new NextResponse('', { status: 200 });
    } catch {
        return new NextResponse('', { status: 200 }); // Always 200 per RFC 8058
    }
}
