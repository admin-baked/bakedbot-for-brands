'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

export interface DispensaryDashboardData {
    stats: {
        ordersToday: { value: number; trend: string; label: string };
        revenueToday: { value: string; trend: string; label: string };
        conversion: { value: string; trend: string; label: string };
        compliance: { status: 'ok' | 'warning' | 'critical'; warnings: number; lastScan: string };
    };
    alerts: {
        productsNearOOS: number;
        promosBlocked: number;
        menuSyncDelayed: boolean;
        criticalErrors: number;
    };
    operations: {
        openOrders: number;
        criticalAlerts: number;
        avgFulfillmentMinutes: number;
    };
    location: {
        name: string;
        type: 'delivery' | 'pickup' | 'both';
    };
}

export async function getDispensaryDashboardData(dispensaryId: string): Promise<DispensaryDashboardData | null> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser();

        // Fetch dispensary document
        const dispensaryDoc = await firestore.collection('dispensaries').doc(dispensaryId).get();
        const dispensaryData = dispensaryDoc.data() || {};

        // Fetch today's orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const ordersSnap = await firestore.collection('orders')
            .where('dispensaryId', '==', dispensaryId)
            .where('createdAt', '>=', today)
            .get();
        
        const ordersToday = ordersSnap.size;
        
        // Calculate revenue from orders
        let revenueToday = 0;
        ordersSnap.forEach(doc => {
            const order = doc.data();
            revenueToday += order.total || 0;
        });

        // Count open orders (pending, processing status)
        const openOrdersSnap = await firestore.collection('orders')
            .where('dispensaryId', '==', dispensaryId)
            .where('status', 'in', ['pending', 'processing', 'ready'])
            .get();
        const openOrders = openOrdersSnap.size;

        // Fetch compliance alerts (using compliance_events collection if exists)
        let complianceWarnings = 0;
        try {
            const complianceSnap = await firestore.collection('compliance_events')
                .where('dispensaryId', '==', dispensaryId)
                .where('severity', '==', 'warning')
                .where('resolved', '==', false)
                .get();
            complianceWarnings = complianceSnap.size;
        } catch {
            // Collection may not exist yet
        }

        // Fetch products for inventory alerts
        let productsNearOOS = 0;
        try {
            const productsSnap = await firestore.collection('products')
                .where('dispensaryId', '==', dispensaryId)
                .where('inventory', '<', 5) // Near out of stock
                .get();
            productsNearOOS = productsSnap.size;
        } catch {
            // Query may fail without proper index
        }

        // Calculate average fulfillment time from recent completed orders
        let avgFulfillmentMinutes = 0;
        try {
            const completedOrdersSnap = await firestore.collection('orders')
                .where('dispensaryId', '==', dispensaryId)
                .where('status', '==', 'completed')
                .orderBy('completedAt', 'desc')
                .limit(20)
                .get();
            
            if (completedOrdersSnap.size > 0) {
                let totalMinutes = 0;
                completedOrdersSnap.forEach(doc => {
                    const order = doc.data();
                    if (order.createdAt && order.completedAt) {
                        const diff = (order.completedAt.toMillis() - order.createdAt.toMillis()) / 60000;
                        totalMinutes += diff;
                    }
                });
                avgFulfillmentMinutes = Math.round(totalMinutes / completedOrdersSnap.size);
            }
        } catch {
            // Fallback if query fails
            avgFulfillmentMinutes = 0;
        }

        // Location info
        const locationName = dispensaryData.name || dispensaryData.locationName || 'Main Location';
        const locationType = dispensaryData.fulfillmentType || 'both';

        return {
            stats: {
                ordersToday: { 
                    value: ordersToday, 
                    trend: '+0%', // Would need historical data for real trend
                    label: 'vs. yesterday' 
                },
                revenueToday: { 
                    value: `$${revenueToday.toLocaleString()}`, 
                    trend: '+0%', 
                    label: 'Gross Sales' 
                },
                conversion: { 
                    value: '—', // Would need analytics data
                    trend: '—', 
                    label: 'Menu to Checkout' 
                },
                compliance: { 
                    status: complianceWarnings > 0 ? 'warning' : 'ok', 
                    warnings: complianceWarnings, 
                    lastScan: 'Live' 
                }
            },
            alerts: {
                productsNearOOS,
                promosBlocked: 0, // Would need promo tracking
                menuSyncDelayed: false, // Would need POS sync status
                criticalErrors: 0
            },
            operations: {
                openOrders,
                criticalAlerts: complianceWarnings,
                avgFulfillmentMinutes
            },
            location: {
                name: locationName,
                type: locationType as 'delivery' | 'pickup' | 'both'
            }
        };
    } catch (error) {
        console.error('Failed to fetch dispensary dashboard data:', error);
        return null;
    }
}
