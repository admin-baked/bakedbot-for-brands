import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';

/**
 * POST /api/drop-alerts
 * Save a drop alert subscription for email notifications
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, zipCode, brandName, createdAt } = body;

        // Validate required fields
        if (!email || !zipCode || !brandName) {
            return NextResponse.json(
                { error: 'Missing required fields: email, zipCode, brandName' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Validate ZIP code (5 digits)
        if (!/^\d{5}$/.test(zipCode)) {
            return NextResponse.json(
                { error: 'Invalid ZIP code format' },
                { status: 400 }
            );
        }

        const firestore = getAdminFirestore();

        // Check for existing subscription to avoid duplicates
        const existingQuery = await firestore
            .collection('drop_alerts')
            .where('email', '==', email.toLowerCase())
            .where('brandName', '==', brandName)
            .where('zipCode', '==', zipCode)
            .limit(1)
            .get();

        if (!existingQuery.empty) {
            // Already subscribed - return success anyway
            return NextResponse.json({
                success: true,
                message: 'Already subscribed to alerts for this brand in this area'
            });
        }

        // Save new drop alert
        const docRef = await firestore.collection('drop_alerts').add({
            email: email.toLowerCase(),
            zipCode,
            brandName,
            createdAt: createdAt || new Date().toISOString(),
            status: 'active',
            notificationsSent: 0
        });

        return NextResponse.json({
            success: true,
            id: docRef.id,
            message: 'Drop alert created successfully'
        });

    } catch (error) {
        console.error('[POST /api/drop-alerts] Error:', error);
        return NextResponse.json(
            { error: 'Failed to create drop alert' },
            { status: 500 }
        );
    }
}
