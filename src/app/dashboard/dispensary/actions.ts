'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { FieldValue } from 'firebase-admin/firestore';

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
        state?: string;
    };
    sync?: {
        products: number;
        competitors: number;
        lastSynced: string;
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
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

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

        // Yesterday's stats for trends
        const yesterdaySnap = await firestore.collection('orders')
            .where('dispensaryId', '==', dispensaryId)
            .where('createdAt', '>=', yesterday)
            .where('createdAt', '<', today)
            .get();
        
        const ordersYesterday = yesterdaySnap.size;
        let revenueYesterday = 0;
        yesterdaySnap.forEach(doc => {
            const order = doc.data();
            revenueYesterday += order.total || 0;
        });

        // Calculate trends
        const ordersTrend = ordersYesterday > 0 
            ? `${(((ordersToday - ordersYesterday) / ordersYesterday) * 100).toFixed(0)}%`
            : '+0%';
        
        const revenueTrend = revenueYesterday > 0
            ? `${(((revenueToday - revenueYesterday) / revenueYesterday) * 100).toFixed(0)}%`
            : '+0%';

        // Count open orders (pending, processing status)
        const openOrdersSnap = await firestore.collection('orders')
            .where('dispensaryId', '==', dispensaryId)
            .where('status', 'in', ['pending', 'processing', 'ready', 'submitted', 'confirmed', 'preparing'])
            .get();
        const openOrders = openOrdersSnap.size;

        // Fetch compliance alerts (using compliance_events collection if exists)
        let complianceWarnings = 0;
        try {
            const complianceSnap = await firestore.collection('compliance_events')
                .where('dispensaryId', '==', dispensaryId)
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
                let validOrders = 0;
                completedOrdersSnap.forEach(doc => {
                    const order = doc.data();
                    if (order.createdAt && order.completedAt) {
                        const diff = (order.completedAt.toMillis() - order.createdAt.toMillis()) / 60000;
                        totalMinutes += diff;
                        validOrders++;
                    }
                });
                avgFulfillmentMinutes = validOrders > 0 ? Math.round(totalMinutes / validOrders) : 0;
            }
        } catch {
            avgFulfillmentMinutes = 0;
        }

        // Location & Org info
        const userProfile = (await firestore.collection('users').doc(user.uid).get()).data();
        const currentOrgId = userProfile?.currentOrgId;
        
        // Get canonical org name & state
        let canonicalName = dispensaryData.name || 'My Dispensary';
        let state = dispensaryData.state || dispensaryData.marketState;

        if (currentOrgId) {
             const orgDoc = await firestore.collection('organizations').doc(currentOrgId).get();
             if (orgDoc.exists) {
                 const orgData = orgDoc.data();
                 canonicalName = orgData?.name || canonicalName;
                 state = orgData?.marketState || orgData?.state || state;
             }
        }

        const locationName = canonicalName;
        const locationType = dispensaryData.fulfillmentType || 'both';

        // Check data sync status
        let productsCount = 0;
        let competitorsCount = 0;
        
        try {
            // Count products
            const productsQuery = await firestore.collection('products')
                .where('dispensaryId', '==', dispensaryId) 
                .count()
                .get();
            productsCount = productsQuery.data().count;

            // Count competitors
            if (currentOrgId) {
                const competitorsQuery = await firestore
                    .collection('organizations')
                    .doc(currentOrgId)
                    .collection('competitors')
                    .count()
                    .get();
                competitorsCount = competitorsQuery.data().count;
            }
        } catch (e) {
            console.warn('Failed to count sync stats', e);
        }

        return {
            stats: {
                ordersToday: { 
                    value: ordersToday, 
                    trend: (parseInt(ordersTrend) >= 0 ? '+' : '') + ordersTrend, 
                    label: 'vs. yesterday' 
                },
                revenueToday: { 
                    value: `$${revenueToday.toLocaleString()}`, 
                    trend: (parseInt(revenueTrend) >= 0 ? '+' : '') + revenueTrend, 
                    label: 'Gross Sales' 
                },
                conversion: { 
                    value: '3.2%', // Placeholder for now
                    trend: '+0.4%', 
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
                promosBlocked: 0,
                menuSyncDelayed: false,
                criticalErrors: 0
            },
            operations: {
                openOrders,
                criticalAlerts: complianceWarnings,
                avgFulfillmentMinutes
            },
            location: {
                name: locationName,
                type: locationType as 'delivery' | 'pickup' | 'both',
                state: state || 'Michigan'
            },
            // NEW: Sync Data
            sync: {
                products: productsCount,
                competitors: competitorsCount,
                lastSynced: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error('Failed to fetch dispensary dashboard data:', error);
        return null;
    }
}

// ============================================================================
// SYSTEM PLAYBOOK ACTIONS (Dispensary Scoped)
// ============================================================================

export interface DispensaryPlaybook {
    id: string;
    name: string;
    description: string;
    category: 'menu' | 'compliance' | 'marketing' | 'inventory' | 'reporting' | 'loyalty';
    agents: string[];
    active: boolean;
    runsToday: number;
    lastRun?: string;
}

export async function getDispensaryPlaybooks(dispensaryId: string): Promise<DispensaryPlaybook[]> {
    try {
        const { firestore } = await createServerClient();
        const snap = await firestore.collection('system_playbooks')
            .where('type', '==', 'dispensary')
            .get();

        const playbooks = snap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                description: data.description,
                category: data.category,
                agents: data.agents || [],
                active: data.statusMap?.[dispensaryId] ?? data.active ?? false,
                runsToday: data.runsTodayMap?.[dispensaryId] ?? 0,
                lastRun: data.lastRunMap?.[dispensaryId] ?? 'Never'
            } as DispensaryPlaybook;
        });

        return playbooks;
    } catch (error) {
        console.error('Failed to fetch dispensary playbooks:', error);
        return [];
    }
}

export async function toggleDispensaryPlaybook(dispensaryId: string, playbookId: string, active: boolean) {
    try {
        const { firestore } = await createServerClient();
        await firestore.collection('system_playbooks').doc(playbookId).update({
            [`statusMap.${dispensaryId}`]: active
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to toggle dispensary playbook:', error);
        return { success: false };
    }
}
