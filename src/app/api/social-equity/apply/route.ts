/**
 * Social Equity Application API
 * POST /api/social-equity/apply
 *
 * Accepts a social equity license application, stores it in Firestore,
 * and notifies the BakedBot admin team for manual verification.
 *
 * On approval (manual, via dashboard): generate SOCIALEQUITY-{id} promo code → 50% off forever.
 * On rejection: email customer with reason.
 *
 * License types accepted:
 *   social_equity      → State-designated social equity license
 *   equity_applicant   → Social equity applicant with pending designation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

const ApplicationSchema = z.object({
    dispensaryName: z.string().min(2, 'Dispensary name required'),
    contactName: z.string().min(2, 'Contact name required'),
    contactEmail: z.string().email('Valid email required'),
    licenseNumber: z.string().min(3, 'License number required'),
    licenseType: z.enum(['social_equity', 'equity_applicant'], {
        errorMap: () => ({ message: 'License type must be social_equity or equity_applicant' }),
    }),
    state: z.string().length(2, 'Two-letter state code required').toUpperCase(),
    licenseImageUrl: z.string().url('License image URL required'),
});

export async function POST(req: NextRequest) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const result = ApplicationSchema.safeParse(body);
    if (!result.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: result.error.flatten() },
            { status: 422 }
        );
    }

    const data = result.data;

    try {
        const firestore = getAdminFirestore();

        // Check for duplicate application by license number + state
        const existing = await firestore
            .collection('se_applications')
            .where('licenseNumber', '==', data.licenseNumber)
            .where('state', '==', data.state)
            .where('status', 'in', ['pending', 'approved'])
            .limit(1)
            .get();

        if (!existing.empty) {
            return NextResponse.json(
                { error: 'An application for this license is already on file.' },
                { status: 409 }
            );
        }

        // Create application record
        const docRef = await firestore.collection('se_applications').add({
            dispensaryName: data.dispensaryName,
            contactName: data.contactName,
            contactEmail: data.contactEmail,
            licenseNumber: data.licenseNumber,
            licenseType: data.licenseType,
            state: data.state,
            licenseImageUrl: data.licenseImageUrl,
            status: 'pending',
            reviewedBy: null,
            reviewedAt: null,
            promoCode: null,
            createdAt: Timestamp.now(),
        });

        // Notify admin team via Firestore inbox (super users pick it up)
        await firestore.collection('inbox_notifications').add({
            type: 'se_application_received',
            title: 'New Social Equity Application',
            body: `${data.dispensaryName} (${data.state}) applied for SE pricing — ${data.licenseType.replace('_', ' ')}.`,
            applicationId: docRef.id,
            severity: 'info',
            read: false,
            createdAt: Timestamp.now(),
        });

        logger.info('[SE Application] New application received', {
            applicationId: docRef.id,
            dispensary: data.dispensaryName,
            state: data.state,
            licenseType: data.licenseType,
        });

        return NextResponse.json({
            success: true,
            applicationId: docRef.id,
            message: 'Application received. We\'ll review it and email you within 2-3 business days.',
        });
    } catch (err) {
        logger.error('[SE Application] Failed to save application', err as Record<string, unknown>);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
