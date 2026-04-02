'use server';

/**
 * Loyalty Tablet Server Actions
 *
 * Handles email/phone capture from the in-store loyalty tablet at Thrive Syracuse.
 * Extended with mood-based Smokey recommendations and visit/review sequence tracking.
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';
import { callClaude } from '@/ai/claude';
import { fetchMenuProducts } from '@/server/agents/adapters/consumer-adapter';
import {
    getTabletMoodById,
    type MoodRecommendationsResult,
    type TabletBundle,
    type TabletProduct,
} from '@/lib/checkin/loyalty-tablet-shared';
import { captureVisitorCheckin } from './visitor-checkin';

// ============================================================
// Types
// ============================================================

export interface TabletLeadResult {
    success: boolean;
    isNewLead: boolean;
    customerId?: string;
    loyaltyPoints?: number;
    visitId?: string;
    error?: string;
}

// ============================================================
// Server Actions
// ============================================================

const captureSchema = z.object({
    orgId: z.string().min(1),
    firstName: z.string().min(1).max(100),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    emailConsent: z.boolean(),
    smsConsent: z.boolean(),
    mood: z.string().optional(),
    cartProductIds: z.array(z.string()).optional(),
    bundleAdded: z.boolean().optional(),
});

/**
 * Get mood-based product recommendations from Smokey.
 * Fetches live Thrive Syracuse inventory, then calls Claude Haiku for structured picks.
 */
export async function getMoodRecommendations(
    orgId: string,
    moodId: string,
): Promise<MoodRecommendationsResult> {
    try {
        const mood = getTabletMoodById(moodId);
        if (!mood) {
            return { success: false, error: 'Unknown mood' };
        }

        const products = await fetchMenuProducts(orgId);
        if (!products.length) {
            return { success: false, error: 'No products available' };
        }

        // Build compact product list for Claude (cap at 60 to stay within Haiku token limits)
        const productList = products.slice(0, 60).map((p: any, i: number) => {
            const name = p.name ?? p.productName ?? 'Unknown';
            const price = p.price ?? p.retailPrice ?? 0;
            const category = p.category ?? p.productType ?? 'Other';
            const brand = p.brandName ?? p.brand ?? '';
            const id = p.id ?? p.productId ?? String(i);
            return `[${i + 1}] id:${id} | ${name}${brand ? ` by ${brand}` : ''} | ${category} | $${Number(price).toFixed(2)}`;
        }).join('\n');

        const prompt = `You are Smokey, BakedBot's expert cannabis budtender at Thrive Syracuse dispensary.

A customer just walked in and selected their feeling: "${mood.label}"
Context for this feeling: ${mood.context}

Here is the current Thrive Syracuse menu:
${productList}

Pick exactly 3 individual products AND 1 bundle (2 complementary items) that best match how this customer feels.
- Individual picks: best single products for this mood
- Bundle: 2 products that work together synergistically for this mood, give it a creative name

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "products": [
    { "productId": "<id>", "name": "<name>", "price": <number>, "category": "<category>", "brandName": "<brand or empty>", "reason": "<one sentence why>" },
    { "productId": "<id>", "name": "<name>", "price": <number>, "category": "<category>", "brandName": "<brand or empty>", "reason": "<one sentence why>" },
    { "productId": "<id>", "name": "<name>", "price": <number>, "category": "<category>", "brandName": "<brand or empty>", "reason": "<one sentence why>" }
  ],
  "bundle": {
    "name": "<creative bundle name>",
    "tagline": "<short tagline>",
    "products": [
      { "productId": "<id>", "name": "<name>", "price": <number>, "category": "<category>", "brandName": "<brand or empty>", "reason": "<one sentence why>" },
      { "productId": "<id>", "name": "<name>", "price": <number>, "category": "<category>", "brandName": "<brand or empty>", "reason": "<one sentence why>" }
    ],
    "totalPrice": <sum of both product prices>
  }
}`;

        const raw = await callClaude({
            userMessage: prompt,
            maxTokens: 1200,
            temperature: 0.7,
            model: 'claude-haiku-4-5-20251001',
            autoRouteModel: false,
        });

        // Parse JSON - strip any accidental markdown fences
        const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(json);

        if (!Array.isArray(parsed.products) || parsed.products.length < 1) {
            throw new Error('Invalid recommendation response structure');
        }

        // Trim to 3 if Claude returned extra
        parsed.products = parsed.products.slice(0, 3);

        logger.info('[LoyaltyTablet] Mood recommendations generated', {
            orgId,
            moodId,
            productCount: parsed.products.length,
        });

        return {
            success: true,
            products: parsed.products as TabletProduct[],
            bundle: parsed.bundle as TabletBundle,
        };
    } catch (error) {
        logger.error('[LoyaltyTablet] getMoodRecommendations failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get recommendations',
        };
    }
}

/**
 * Capture lead from loyalty tablet (in-store kiosk).
 * Creates/updates email_leads + customer profile.
 * Stores mood, cart selections, and schedules review sequence.
 */
export async function captureTabletLead(params: {
    orgId: string;
    firstName: string;
    email?: string;
    phone?: string;
    emailConsent: boolean;
    smsConsent: boolean;
    mood?: string;
    cartProductIds?: string[];
    bundleAdded?: boolean;
}): Promise<TabletLeadResult> {
    try {
        const validated = captureSchema.parse(params);
        const { orgId, firstName, email, phone, emailConsent, smsConsent, mood, cartProductIds, bundleAdded } = validated;

        if (!phone) {
            return { success: false, isNewLead: false, error: 'Phone required' };
        }

        const result = await captureVisitorCheckin({
            orgId,
            firstName,
            email: email || undefined,
            phone,
            emailConsent,
            smsConsent,
            source: 'loyalty_tablet_checkin',
            ageVerifiedMethod: 'staff_visual_check',
            mood,
            cartProductIds,
            bundleAdded,
        });

        return {
            success: result.success,
            isNewLead: result.isNewLead,
            customerId: result.customerId,
            loyaltyPoints: result.loyaltyPoints,
            visitId: result.visitId,
            error: result.error,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, isNewLead: false, error: error.errors[0].message };
        }

        logger.error('[LoyaltyTablet] Capture failed', { error });
        return {
            success: false,
            isNewLead: false,
            error: error instanceof Error ? error.message : 'Failed to capture lead',
        };
    }
}
