/**
 * Loyalty Card Message Service
 * Craig sends a branded loyalty card image via SMS (MMS) or email on enrollment.
 */
import { BlackleafService } from '@/lib/notifications/blackleaf-service';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { logger } from '@/lib/logger';

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot.ai';

interface LoyaltyCardMessageParams {
  customerId: string;
  orgId: string;
  brandName: string;
  brandSlug: string;
  customerName: string;
  points: number;
  tier: string;
  primaryColor: string;
  phone?: string;
  email?: string;
}

function buildCardImageUrl(params: LoyaltyCardMessageParams): string {
  const color = encodeURIComponent(params.primaryColor.replace('#', '%23'));
  return (
    `${APP_BASE_URL}/api/og/loyalty-card` +
    `?name=${encodeURIComponent(params.customerName)}` +
    `&points=${params.points}` +
    `&tier=${encodeURIComponent(params.tier)}` +
    `&brand=${encodeURIComponent(params.brandName)}` +
    `&color=${encodeURIComponent(params.primaryColor)}` +
    `&id=${encodeURIComponent(params.customerId)}`
  );
}

/**
 * Send loyalty card via MMS (Blackleaf).
 * Fire-and-forget — never throws.
 */
export async function sendLoyaltyCardSMS(params: LoyaltyCardMessageParams): Promise<void> {
  if (!params.phone) return;
  try {
    const cardUrl = buildCardImageUrl(params);
    const rewardsUrl = `${APP_BASE_URL}/${params.brandSlug}/rewards`;
    const body =
      `Welcome to ${params.brandName} Rewards, ${params.customerName}! 🎉\n` +
      `You have ${params.points.toLocaleString()} points (${params.tier} tier).\n` +
      `View your card anytime: ${rewardsUrl}`;

    const sms = new BlackleafService();
    await sms.sendCustomMessage(params.phone, body, cardUrl);
    logger.info('[LoyaltyCard] SMS card sent', { customerId: params.customerId, orgId: params.orgId });
  } catch (error) {
    logger.warn('[LoyaltyCard] SMS send failed', { customerId: params.customerId, error: String(error) });
  }
}

/**
 * Send loyalty card via email (Mailjet).
 * Fire-and-forget — never throws.
 */
export async function sendLoyaltyCardEmail(params: LoyaltyCardMessageParams): Promise<void> {
  if (!params.email) return;
  try {
    const cardUrl = buildCardImageUrl(params);
    const rewardsUrl = `${APP_BASE_URL}/${params.brandSlug}/rewards`;

    await sendGenericEmail({
      to: params.email,
      subject: `Your ${params.brandName} Rewards Card`,
      htmlBody: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#1a1a1a">Welcome to ${params.brandName} Rewards!</h2>
          <p>Hi ${params.customerName},</p>
          <p>Your loyalty account is active. You have <strong>${params.points.toLocaleString()} points</strong> (${params.tier} tier).</p>
          <img src="${cardUrl}" alt="Your ${params.brandName} Loyalty Card" style="width:100%;max-width:500px;border-radius:12px;margin:16px 0;" />
          <p>
            <a href="${rewardsUrl}" style="display:inline-block;background:${params.primaryColor};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              View Your Rewards
            </a>
          </p>
          <p style="color:#666;font-size:12px;margin-top:24px;">Powered by BakedBot AI</p>
        </div>
      `,
      fromName: params.brandName,
      communicationType: 'loyalty',
    });
    logger.info('[LoyaltyCard] Email card sent', { customerId: params.customerId, orgId: params.orgId });
  } catch (error) {
    logger.warn('[LoyaltyCard] Email send failed', { customerId: params.customerId, error: String(error) });
  }
}

/**
 * Send loyalty card via best available channel (SMS preferred, email fallback).
 */
export async function sendLoyaltyCardOnEnrollment(params: LoyaltyCardMessageParams): Promise<void> {
  if (params.phone) {
    await sendLoyaltyCardSMS(params);
  } else if (params.email) {
    await sendLoyaltyCardEmail(params);
  }
}
