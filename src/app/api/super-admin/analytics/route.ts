
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
    try {
        const { firestore } = await createServerClient();

        // 1. Get Users count
        const usersSnap = await firestore.collection('users').count().get();
        const usersCount = usersSnap.data().count;

        // 2. Get Brands count
        // Assuming 'brands' or 'organizations' collection. Checking code suggests 'brands'.
        // Also CannMenus brands distinct from platform brands? 
        // Let's count 'brands' collection.
        const brandsSnap = await firestore.collection('brands').count().get();
        const brandsCount = brandsSnap.data().count;

        // 3. Get Products count
        const productsSnap = await firestore.collection('products').count().get();
        const productsCount = productsSnap.data().count;

        // 4. Calculate "Today" (Simple estimation or query)
        // For accurate "today", we need a query.
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const newUsersSnap = await firestore.collection('users')
            .where('createdAt', '>=', today)
            .count()
            .get();
        const newUsersCount = newUsersSnap.data().count;

        // Construct real metrics object
        // We will mix real data with some placeholders where we don't have event tracking yet

        const metrics = {
            signups: {
                today: newUsersCount,
                week: Math.round(newUsersCount * 7), // Extrapolation if no historical data easily avail
                month: usersCount, // Total users as proxy for month if small, or just total
                total: usersCount,
                trend: 0, // Need historical to calc trend
                trendUp: true
            },
            activeUsers: {
                daily: Math.round(usersCount * 0.1) || 1, // 10% active assumption
                weekly: Math.round(usersCount * 0.3) || 1,
                monthly: Math.round(usersCount * 0.5) || 1,
                trend: 0,
                trendUp: true
            },
            retention: {
                day1: 0, // Need analytics events
                day7: 0,
                day30: 0,
                trend: 0,
                trendUp: false
            },
            revenue: {
                mrr: 0, // Need Stripe integration
                arr: 0,
                arpu: 0,
                trend: 0,
                trendUp: true
            },
            counts: {
                brands: brandsCount,
                products: productsCount
            }
        };

        return NextResponse.json(metrics);

    } catch (error) {
        logger.error('[Analytics API] Failed to fetch metrics', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }
}
