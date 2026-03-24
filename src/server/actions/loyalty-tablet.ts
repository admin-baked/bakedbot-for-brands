'use server';

/**
 * Loyalty Tablet Server Actions
 *
 * Handles email/phone capture from the in-store loyalty tablet at Thrive Syracuse.
 * Extended with mood-based Smokey recommendations and visit/review sequence tracking.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { callClaude } from '@/ai/claude';
import { fetchMenuProducts } from '@/server/agents/adapters/consumer-adapter';
import { z } from 'zod';

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

export interface TabletProduct {
    productId: string;
    name: string;
    price: number;
    category: string;
    brandName?: string;
    imageUrl?: string;
    reason: string;
}

export interface TabletBundle {
    name: string;
    tagline: string;
    products: TabletProduct[];
    totalPrice: number;
}

export interface MoodRecommendationsResult {
    success: boolean;
    products?: TabletProduct[];
    bundle?: TabletBundle;
    error?: string;
}

// ============================================================
// Mood definitions — maps UI selection to Smokey context
// ============================================================

export const TABLET_MOODS = [
    { id: 'relaxed',   emoji: '😌', label: 'Relaxed & Calm',      context: 'indica dominant, CBD-heavy, body relaxation, stress relief, couch-friendly' },
    { id: 'energized', emoji: '⚡', label: 'Energized & Creative', context: 'sativa dominant, uplifting, creative boost, clear-headed, daytime use' },
    { id: 'sleep',     emoji: '😴', label: 'Need Sleep',           context: 'high indica, heavy sedation, sleep aid, nighttime, body high' },
    { id: 'anxious',   emoji: '😰', label: 'Stressed / Anxious',   context: 'high CBD low THC, calming, anxiety relief, gentle, non-intoxicating' },
    { id: 'social',    emoji: '🎉', label: 'Social & Happy',       context: 'hybrid balanced, euphoric, mood-lift, social, giggly, fun' },
    { id: 'pain',      emoji: '😣', label: 'Pain / Discomfort',    context: 'high THC, topicals, pain relief, anti-inflammatory, muscle soreness' },
    { id: 'new',       emoji: '🌱', label: 'New to Cannabis',      context: 'low dose, microdose, beginner friendly, CBD dominant, gentle onset, forgiving' },
] as const;

export type TabletMoodId = typeof TABLET_MOODS[number]['id'];

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
        const mood = TABLET_MOODS.find(m => m.id === moodId);
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
            maxTokens: 800,
            model: 'claude-haiku-4-5-20251001',
            autoRouteModel: false,
        });

        // Parse JSON — strip any accidental markdown fences
        const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(json);

        if (!Array.isArray(parsed.products) || parsed.products.length !== 3) {
            throw new Error('Invalid recommendation response structure');
        }

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

        if (!email && !phone) {
            return { success: false, isNewLead: false, error: 'Email or phone required' };
        }

        const db = getAdminFirestore();
        const now = new Date();
        let isNewLead = false;

        // 1. Create or update email_leads
        if (email) {
            const leadsRef = db.collection('email_leads');
            const existingSnap = await leadsRef
                .where('email', '==', email.toLowerCase())
                .where('brandId', '==', orgId)
                .limit(1)
                .get();

            if (existingSnap.empty) {
                isNewLead = true;
                await leadsRef.add({
                    email: email.toLowerCase(),
                    firstName,
                    phone: phone || null,
                    emailConsent,
                    smsConsent,
                    brandId: orgId,
                    dispensaryId: orgId,
                    source: 'loyalty_tablet',
                    ageVerified: true,
                    capturedAt: Date.now(),
                    welcomeEmailSent: false,
                    tags: [
                        'in_store',
                        'loyalty_tablet',
                        emailConsent ? 'email_opt_in' : 'email_opt_out',
                        ...(mood ? [`mood_${mood}`] : []),
                    ],
                });
            } else {
                const existingDoc = existingSnap.docs[0];
                const updates: Record<string, unknown> = { updatedAt: now };
                if (emailConsent && !existingDoc.data().emailConsent) updates.emailConsent = true;
                if (smsConsent && !existingDoc.data().smsConsent) updates.smsConsent = true;
                if (phone && !existingDoc.data().phone) updates.phone = phone;
                await existingDoc.ref.update(updates);
            }
        }

        // 2. Upsert customer profile
        const customerId = email
            ? `${orgId}_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
            : `${orgId}_phone_${(phone || '').replace(/[^0-9]/g, '')}`;

        const customerRef = db.collection('customers').doc(customerId);
        const existingCustomer = await customerRef.get();

        if (!existingCustomer.exists) {
            await customerRef.set({
                id: customerId,
                orgId,
                email: email || null,
                phone: phone || null,
                firstName,
                totalSpent: 0,
                orderCount: 0,
                avgOrderValue: 0,
                segment: 'new',
                tier: 'bronze',
                points: 0,
                lifetimeValue: 0,
                emailConsent,
                smsConsent,
                source: 'loyalty_tablet',
                // TODO(Sprint 2): Wire to Welcome Playbook trigger once cron + playbook runner connected
                welcomePlaybookEnrolledAt: now,
                firstCheckinMood: mood || null,
                createdAt: now,
                updatedAt: now,
            });
            logger.info('[LoyaltyTablet] New customer created', { customerId, orgId });
        } else {
            const existing = existingCustomer.data() || {};
            const updates: Record<string, unknown> = { updatedAt: now };
            if (!existing.firstName && firstName) updates.firstName = firstName;
            if (!existing.email && email) updates.email = email;
            if (!existing.phone && phone) updates.phone = phone;
            if (emailConsent) updates.emailConsent = true;
            if (smsConsent) updates.smsConsent = true;
            if (mood && !existing.firstCheckinMood) updates.firstCheckinMood = mood;
            if (!existing.welcomePlaybookEnrolledAt) updates.welcomePlaybookEnrolledAt = now;
            await customerRef.update(updates);
        }

        // 3. Create visit record — used for review sequence + Welcome Playbook
        // TODO(Sprint 2): Add cron /api/cron/review-sequence to process checkoutEmailScheduledAt
        // and reviewNudgeScheduledAt — send checkout email Day 0, review nudge Day 3 via Craig
        const visitId = `${customerId}_visit_${Date.now()}`;
        await db.collection('checkin_visits').doc(visitId).set({
            visitId,
            customerId,
            orgId,
            firstName,
            email: email || null,
            phone: phone || null,
            mood: mood || null,
            cartProductIds: cartProductIds || [],
            bundleAdded: bundleAdded || false,
            emailConsent,
            smsConsent,
            visitedAt: now,
            // Review sequence: send checkout email same day, review nudge at day 3 if no review
            reviewSequence: {
                status: 'pending',
                checkoutEmailScheduledAt: now,
                reviewNudgeScheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
                reviewLeft: false,
            },
        });

        // Use already-fetched data — no second read needed
        const loyaltyPoints = existingCustomer.exists ? ((existingCustomer.data()?.points) ?? 0) : 0;

        logger.info('[LoyaltyTablet] Visit captured', {
            orgId,
            customerId,
            visitId,
            isNewLead,
            mood,
            cartProductIds,
        });

        return {
            success: true,
            isNewLead,
            customerId,
            visitId,
            loyaltyPoints,
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
