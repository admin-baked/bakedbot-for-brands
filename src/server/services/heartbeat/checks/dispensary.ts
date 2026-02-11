'use server';

/**
 * Dispensary Heartbeat Checks
 *
 * Monitors inventory, customers, compliance, and sales for dispensary operators.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { HeartbeatCheckRegistry, HeartbeatCheckContext } from '../types';
import { createCheckResult, createOkResult } from '../types';

// =============================================================================
// LOW STOCK ALERTS (Smokey)
// =============================================================================

async function checkLowStock(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const LOW_STOCK_THRESHOLD = 10;

    try {
        // Check products with low inventory
        const productsSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .where('quantity', '<=', LOW_STOCK_THRESHOLD)
            .where('quantity', '>', 0)
            .where('isActive', '==', true)
            .limit(20)
            .get();

        if (productsSnap.empty) {
            return createOkResult('low_stock_alerts', 'smokey', 'All products well-stocked');
        }

        const lowStockProducts = productsSnap.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            quantity: doc.data().quantity,
            category: doc.data().category,
        }));

        // Check for critical items (top sellers with very low stock)
        const critical = lowStockProducts.filter((p: any) => p.quantity <= 3);

        return createCheckResult('low_stock_alerts', 'smokey', {
            status: critical.length > 0 ? 'alert' : 'warning',
            priority: critical.length > 0 ? 'high' : 'medium',
            title: `${lowStockProducts.length} Product${lowStockProducts.length > 1 ? 's' : ''} Low on Stock`,
            message: critical.length > 0
                ? `${critical.length} items critically low (≤3 units)`
                : `Products with ≤${LOW_STOCK_THRESHOLD} units remaining`,
            data: {
                products: lowStockProducts,
                criticalCount: critical.length,
            },
            actionUrl: '/dashboard/inventory',
            actionLabel: 'View Inventory',
        });
    } catch (error) {
        logger.error('[Heartbeat] Low stock check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// EXPIRING BATCHES (Smokey)
// =============================================================================

async function checkExpiringBatches(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    try {
        const batchesSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('inventory_batches')
            .where('expirationDate', '<=', thirtyDaysFromNow)
            .where('quantity', '>', 0)
            .orderBy('expirationDate', 'asc')
            .limit(20)
            .get();

        if (batchesSnap.empty) {
            return createOkResult('expiring_batches', 'smokey', 'No batches expiring soon');
        }

        const expiringBatches = batchesSnap.docs.map(doc => {
            const data = doc.data();
            const expDate = data.expirationDate?.toDate?.() || new Date(data.expirationDate);
            const daysUntilExpiry = Math.ceil((expDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

            return {
                id: doc.id,
                productName: data.productName,
                quantity: data.quantity,
                expirationDate: expDate,
                daysUntilExpiry,
            };
        });

        const urgent = expiringBatches.filter((b: any) => b.daysUntilExpiry <= 7);
        const totalValue = expiringBatches.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0);

        return createCheckResult('expiring_batches', 'smokey', {
            status: urgent.length > 0 ? 'alert' : 'warning',
            priority: urgent.length > 0 ? 'urgent' : 'high',
            title: `${expiringBatches.length} Batch${expiringBatches.length > 1 ? 'es' : ''} Expiring Soon`,
            message: urgent.length > 0
                ? `${urgent.length} batch(es) expire within 7 days!`
                : `${totalValue} units expiring within 30 days`,
            data: {
                batches: expiringBatches,
                urgentCount: urgent.length,
                totalUnits: totalValue,
            },
            actionUrl: '/dashboard/inventory?tab=expiring',
            actionLabel: 'View Expiring',
        });
    } catch (error) {
        logger.error('[Heartbeat] Expiring batches check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// MARGIN ALERTS (Money Mike)
// =============================================================================

async function checkMarginAlerts(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const MARGIN_THRESHOLD = 0.25; // 25%

    try {
        const productsSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .where('isActive', '==', true)
            .get();

        const lowMarginProducts = productsSnap.docs
            .map(doc => {
                const data = doc.data();
                const cost = data.cost || data.wholesalePrice || 0;
                const price = data.price || 0;
                const margin = price > 0 ? (price - cost) / price : 0;

                return {
                    id: doc.id,
                    name: data.name,
                    cost,
                    price,
                    margin,
                    marginPercent: Math.round(margin * 100),
                };
            })
            .filter((p: any) => p.margin > 0 && p.margin < MARGIN_THRESHOLD);

        if (lowMarginProducts.length === 0) {
            return createOkResult('margin_alerts', 'money_mike', 'All margins healthy');
        }

        // Sort by lowest margin first
        lowMarginProducts.sort((a, b) => a.margin - b.margin);

        const veryLow = lowMarginProducts.filter((p: any) => p.margin < 0.15);

        return createCheckResult('margin_alerts', 'money_mike', {
            status: veryLow.length > 0 ? 'alert' : 'warning',
            priority: veryLow.length > 0 ? 'high' : 'medium',
            title: `${lowMarginProducts.length} Product${lowMarginProducts.length > 1 ? 's' : ''} with Low Margins`,
            message: veryLow.length > 0
                ? `${veryLow.length} products have margins under 15%`
                : `Products with margins below 25%`,
            data: {
                products: lowMarginProducts.slice(0, 10),
                veryLowCount: veryLow.length,
            },
            actionUrl: '/dashboard/profitability',
            actionLabel: 'View Margins',
        });
    } catch (error) {
        logger.error('[Heartbeat] Margin alerts check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// PRICING OPPORTUNITIES (Money Mike)
// =============================================================================

async function checkPricingOpportunities(ctx: HeartbeatCheckContext) {
    // This would integrate with Ezal's competitor data
    // For now, check if there are pricing rules that could be applied

    const db = getAdminFirestore();

    try {
        const rulesSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('dynamic_pricing')
            .where('status', '==', 'draft')
            .get();

        if (rulesSnap.empty) {
            return null; // No pending opportunities
        }

        const draftRules = rulesSnap.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            expectedImpact: doc.data().expectedRevenueImpact,
        }));

        return createCheckResult('pricing_opportunities', 'money_mike', {
            status: 'ok',
            priority: 'low',
            title: `${draftRules.length} Pricing Opportunit${draftRules.length > 1 ? 'ies' : 'y'} Pending`,
            message: 'Draft pricing rules ready for activation',
            data: { rules: draftRules },
            actionUrl: '/dashboard/pricing',
            actionLabel: 'Review Rules',
        });
    } catch (error) {
        logger.error('[Heartbeat] Pricing opportunities check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// COMPETITOR PRICE CHANGES (Ezal)
// =============================================================================

async function checkCompetitorPriceChanges(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        const changesSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('competitor_price_changes')
            .where('detectedAt', '>=', oneDayAgo)
            .orderBy('detectedAt', 'desc')
            .limit(20)
            .get();

        if (changesSnap.empty) {
            return null; // No changes is fine
        }

        const changes = changesSnap.docs.map(doc => doc.data());
        const significant = changes.filter((c: any) => Math.abs(c.percentChange || 0) >= 10);

        if (significant.length === 0) {
            return null; // Minor changes, don't alert
        }

        return createCheckResult('competitor_price_changes', 'ezal', {
            status: 'warning',
            priority: 'medium',
            title: `${significant.length} Significant Competitor Price Change${significant.length > 1 ? 's' : ''}`,
            message: 'Competitors adjusted prices by 10% or more',
            data: { changes: significant.slice(0, 10) },
            actionUrl: '/dashboard/competitive-intel',
            actionLabel: 'View Intel',
        });
    } catch (error) {
        logger.error('[Heartbeat] Competitor price changes check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// COMPETITOR STOCKOUTS (Ezal)
// =============================================================================

async function checkCompetitorStockouts(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        const stockoutsSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('competitor_stockouts')
            .where('detectedAt', '>=', oneDayAgo)
            .orderBy('detectedAt', 'desc')
            .limit(10)
            .get();

        if (stockoutsSnap.empty) {
            return null;
        }

        const stockouts = stockoutsSnap.docs.map(doc => doc.data());

        return createCheckResult('competitor_stockouts', 'ezal', {
            status: 'ok', // Opportunity!
            priority: 'low',
            title: `${stockouts.length} Competitor Stockout${stockouts.length > 1 ? 's' : ''} Detected`,
            message: 'Opportunity to capture market share',
            data: { stockouts },
            actionUrl: '/dashboard/competitive-intel',
            actionLabel: 'View Opportunities',
        });
    } catch (error) {
        logger.error('[Heartbeat] Competitor stockouts check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// AT-RISK CUSTOMERS (Mrs. Parker)
// =============================================================================

async function checkAtRiskCustomers(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
        // Find VIP customers who haven't visited
        const customersSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('customers')
            .where('segment', 'in', ['vip', 'gold', 'platinum'])
            .where('lastVisit', '<=', thirtyDaysAgo)
            .orderBy('lastVisit', 'asc')
            .limit(20)
            .get();

        if (customersSnap.empty) {
            return createOkResult('at_risk_customers', 'mrs_parker', 'All VIPs engaged');
        }

        const atRiskCustomers = customersSnap.docs.map(doc => {
            const data = doc.data();
            const lastVisit = data.lastVisit?.toDate?.() || new Date(data.lastVisit);
            const daysSinceVisit = Math.floor((Date.now() - lastVisit.getTime()) / (24 * 60 * 60 * 1000));

            return {
                id: doc.id,
                name: data.name || data.firstName,
                segment: data.segment,
                lifetimeValue: data.lifetimeValue || 0,
                lastVisit,
                daysSinceVisit,
            };
        });

        const highValue = atRiskCustomers.filter((c: any) => c.lifetimeValue > 1000);
        const totalLTV = atRiskCustomers.reduce((sum: number, c: any) => sum + c.lifetimeValue, 0);

        return createCheckResult('at_risk_customers', 'mrs_parker', {
            status: highValue.length > 0 ? 'alert' : 'warning',
            priority: highValue.length > 0 ? 'high' : 'medium',
            title: `${atRiskCustomers.length} VIP Customer${atRiskCustomers.length > 1 ? 's' : ''} At Risk`,
            message: highValue.length > 0
                ? `${highValue.length} high-value VIPs ($${Math.round(totalLTV).toLocaleString()} LTV) need re-engagement`
                : `VIP customers haven't visited in 30+ days`,
            data: {
                customers: atRiskCustomers,
                highValueCount: highValue.length,
                totalLTV,
            },
            actionUrl: '/dashboard/customers?segment=at-risk',
            actionLabel: 'View At-Risk',
        });
    } catch (error) {
        logger.error('[Heartbeat] At-risk customers check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// CUSTOMER BIRTHDAYS (Mrs. Parker)
// =============================================================================

async function checkCustomerBirthdays(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    try {
        const customersSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('customers')
            .where('birthdayMonthDay', '==', monthDay)
            .where('segment', 'in', ['vip', 'gold', 'platinum', 'regular'])
            .limit(50)
            .get();

        if (customersSnap.empty) {
            return null; // No birthdays today
        }

        const birthdays = customersSnap.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || doc.data().firstName,
            segment: doc.data().segment,
            email: doc.data().email,
            phone: doc.data().phone,
        }));

        const vips = birthdays.filter((c: any) => ['vip', 'gold', 'platinum'].includes(c.segment));

        return createCheckResult('birthday_today', 'mrs_parker', {
            status: 'ok',
            priority: vips.length > 0 ? 'medium' : 'low',
            title: `${birthdays.length} Customer Birthday${birthdays.length > 1 ? 's' : ''} Today! 🎂`,
            message: vips.length > 0
                ? `${vips.length} VIP birthdays - consider special outreach`
                : `Send birthday wishes to retain customers`,
            data: { customers: birthdays, vipCount: vips.length },
            actionUrl: '/dashboard/customers?filter=birthday',
            actionLabel: 'Send Wishes',
        });
    } catch (error) {
        logger.error('[Heartbeat] Customer birthdays check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// LICENSE EXPIRY (Deebo)
// =============================================================================

async function checkLicenseExpiry(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    try {
        const licensesSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('licenses')
            .where('expirationDate', '<=', thirtyDaysFromNow)
            .where('status', '==', 'active')
            .orderBy('expirationDate', 'asc')
            .get();

        if (licensesSnap.empty) {
            return createOkResult('license_expiry', 'deebo', 'All licenses current');
        }

        const expiringLicenses = licensesSnap.docs.map(doc => {
            const data = doc.data();
            const expDate = data.expirationDate?.toDate?.() || new Date(data.expirationDate);
            const daysUntilExpiry = Math.ceil((expDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

            return {
                id: doc.id,
                type: data.type,
                licenseNumber: data.licenseNumber,
                expirationDate: expDate,
                daysUntilExpiry,
            };
        });

        const urgent = expiringLicenses.filter((l: any) => l.daysUntilExpiry <= 7);
        const expired = expiringLicenses.filter((l: any) => l.daysUntilExpiry <= 0);

        return createCheckResult('license_expiry', 'deebo', {
            status: expired.length > 0 ? 'alert' : urgent.length > 0 ? 'alert' : 'warning',
            priority: 'urgent',
            title: expired.length > 0
                ? `⚠️ ${expired.length} License${expired.length > 1 ? 's' : ''} EXPIRED`
                : `${expiringLicenses.length} License${expiringLicenses.length > 1 ? 's' : ''} Expiring Soon`,
            message: expired.length > 0
                ? 'IMMEDIATE ACTION REQUIRED - Operating with expired license'
                : urgent.length > 0
                    ? `${urgent.length} license(s) expire within 7 days`
                    : 'Licenses expiring within 30 days',
            data: {
                licenses: expiringLicenses,
                expiredCount: expired.length,
                urgentCount: urgent.length,
            },
            actionUrl: '/dashboard/compliance/licenses',
            actionLabel: 'Renew Licenses',
        });
    } catch (error) {
        logger.error('[Heartbeat] License expiry check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// CONTENT PENDING REVIEW (Deebo)
// =============================================================================

async function checkContentPendingReview(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();

    try {
        const contentSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('creative_content')
            .where('complianceStatus', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .limit(20)
            .get();

        if (contentSnap.empty) {
            return null; // No pending content is fine
        }

        const pendingContent = contentSnap.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
            const hoursWaiting = Math.floor((Date.now() - createdAt.getTime()) / (60 * 60 * 1000));

            return {
                id: doc.id,
                platform: data.platform,
                createdAt,
                hoursWaiting,
            };
        });

        const stale = pendingContent.filter((c: any) => c.hoursWaiting > 24);

        return createCheckResult('content_pending_review', 'deebo', {
            status: stale.length > 0 ? 'warning' : 'ok',
            priority: stale.length > 0 ? 'medium' : 'low',
            title: `${pendingContent.length} Content Item${pendingContent.length > 1 ? 's' : ''} Pending Review`,
            message: stale.length > 0
                ? `${stale.length} items waiting 24+ hours for compliance review`
                : 'Marketing content awaiting compliance check',
            data: { content: pendingContent, staleCount: stale.length },
            actionUrl: '/dashboard/content?status=pending',
            actionLabel: 'Review Content',
        });
    } catch (error) {
        logger.error('[Heartbeat] Content pending review check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// SALES VELOCITY (Pops)
// =============================================================================

async function checkSalesVelocity(ctx: HeartbeatCheckContext) {
    // Compare today's sales to historical average
    const db = getAdminFirestore();

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const ordersSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('orders')
            .where('createdAt', '>=', today)
            .get();

        const todayRevenue = ordersSnap.docs.reduce((sum, doc) => {
            return sum + (doc.data().total || 0);
        }, 0);

        // Get historical daily average (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const historicalSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('daily_stats')
            .where('date', '>=', thirtyDaysAgo)
            .get();

        if (historicalSnap.empty) {
            return null; // Not enough data
        }

        const historicalDays = historicalSnap.docs.map(doc => doc.data().revenue || 0);
        const avgDaily = historicalDays.reduce((a, b) => a + b, 0) / historicalDays.length;

        // Check current time to estimate expected revenue
        const hoursOpen = Math.min((new Date().getHours() - 9), 12); // Assume 9am open
        const expectedRevenue = (avgDaily / 12) * hoursOpen;

        const percentOfExpected = expectedRevenue > 0 ? (todayRevenue / expectedRevenue) * 100 : 100;

        if (percentOfExpected >= 80 && percentOfExpected <= 130) {
            return null; // Within normal range
        }

        const isSurge = percentOfExpected > 130;
        const isDrop = percentOfExpected < 80;

        return createCheckResult('sales_velocity', 'pops', {
            status: isDrop ? 'warning' : 'ok',
            priority: isDrop ? 'medium' : 'low',
            title: isSurge
                ? `📈 Sales Surge: ${Math.round(percentOfExpected)}% of Expected`
                : `📉 Sales Below Expected: ${Math.round(percentOfExpected)}%`,
            message: isSurge
                ? `Today's sales tracking ${Math.round(percentOfExpected - 100)}% above average`
                : `Today's sales tracking ${Math.round(100 - percentOfExpected)}% below average`,
            data: {
                todayRevenue,
                expectedRevenue,
                avgDaily,
                percentOfExpected,
            },
            actionUrl: '/dashboard/analytics',
            actionLabel: 'View Analytics',
        });
    } catch (error) {
        logger.error('[Heartbeat] Sales velocity check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// ORDER ANOMALIES (Pops)
// =============================================================================

async function checkOrderAnomalies(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    try {
        // Compare last hour to hour before
        const recentOrdersSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('orders')
            .where('createdAt', '>=', oneHourAgo)
            .get();

        const previousOrdersSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('orders')
            .where('createdAt', '>=', twoHoursAgo)
            .where('createdAt', '<', oneHourAgo)
            .get();

        const recentCount = recentOrdersSnap.size;
        const previousCount = previousOrdersSnap.size;

        if (previousCount === 0 && recentCount === 0) {
            return null; // No orders to compare
        }

        const changePercent = previousCount > 0
            ? ((recentCount - previousCount) / previousCount) * 100
            : recentCount > 0 ? 100 : 0;

        if (Math.abs(changePercent) < 50) {
            return null; // Normal variation
        }

        const isSpike = changePercent > 50;
        const isDrop = changePercent < -50;

        return createCheckResult('order_anomalies', 'pops', {
            status: isDrop ? 'warning' : 'ok',
            priority: isDrop ? 'high' : 'medium',
            title: isSpike
                ? `🚀 Order Spike: +${Math.round(changePercent)}% vs Previous Hour`
                : `⚠️ Order Drop: ${Math.round(changePercent)}% vs Previous Hour`,
            message: isSpike
                ? `${recentCount} orders this hour vs ${previousCount} last hour`
                : `${recentCount} orders this hour vs ${previousCount} last hour - investigate potential issues`,
            data: {
                recentCount,
                previousCount,
                changePercent,
            },
            actionUrl: '/dashboard/orders',
            actionLabel: 'View Orders',
        });
    } catch (error) {
        logger.error('[Heartbeat] Order anomalies check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// POS SYNC STATUS (Smokey)
// =============================================================================

async function checkPOSSyncStatus(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();

    try {
        const syncStatusSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('integrations')
            .doc('pos')
            .get();

        if (!syncStatusSnap.exists) {
            return null; // POS not configured
        }

        const syncData = syncStatusSnap.data();
        const lastSync = syncData?.lastSyncAt?.toDate?.() || null;
        const syncStatus = syncData?.status;

        if (!lastSync) {
            return createCheckResult('pos_sync_status', 'smokey', {
                status: 'warning',
                priority: 'high',
                title: 'POS Never Synced',
                message: 'Point of Sale integration has never completed a sync',
                data: { syncData },
                actionUrl: '/dashboard/integrations',
                actionLabel: 'Check Integration',
            });
        }

        const hoursSinceSync = (Date.now() - lastSync.getTime()) / (60 * 60 * 1000);

        if (syncStatus === 'error') {
            return createCheckResult('pos_sync_status', 'smokey', {
                status: 'alert',
                priority: 'high',
                title: 'POS Sync Error',
                message: syncData?.lastError || 'POS integration failed',
                data: { syncData, hoursSinceSync },
                actionUrl: '/dashboard/integrations',
                actionLabel: 'Fix Integration',
            });
        }

        if (hoursSinceSync > 2) {
            return createCheckResult('pos_sync_status', 'smokey', {
                status: 'warning',
                priority: 'medium',
                title: 'POS Sync Stale',
                message: `Last sync was ${Math.round(hoursSinceSync)} hours ago`,
                data: { lastSync, hoursSinceSync },
                actionUrl: '/dashboard/integrations',
                actionLabel: 'Check Sync',
            });
        }

        return createOkResult('pos_sync_status', 'smokey', `POS synced ${Math.round(hoursSinceSync * 60)} minutes ago`);
    } catch (error) {
        logger.error('[Heartbeat] POS sync status check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// REGISTRY EXPORT
// =============================================================================

export const DISPENSARY_CHECKS: HeartbeatCheckRegistry[] = [
    { checkId: 'low_stock_alerts', agent: 'smokey', execute: checkLowStock },
    { checkId: 'expiring_batches', agent: 'smokey', execute: checkExpiringBatches },
    { checkId: 'margin_alerts', agent: 'money_mike', execute: checkMarginAlerts },
    { checkId: 'pricing_opportunities', agent: 'money_mike', execute: checkPricingOpportunities },
    { checkId: 'competitor_price_changes', agent: 'ezal', execute: checkCompetitorPriceChanges },
    { checkId: 'competitor_stockouts', agent: 'ezal', execute: checkCompetitorStockouts },
    { checkId: 'at_risk_customers', agent: 'mrs_parker', execute: checkAtRiskCustomers },
    { checkId: 'birthday_today', agent: 'mrs_parker', execute: checkCustomerBirthdays },
    { checkId: 'license_expiry', agent: 'deebo', execute: checkLicenseExpiry },
    { checkId: 'content_pending_review', agent: 'deebo', execute: checkContentPendingReview },
    { checkId: 'sales_velocity', agent: 'pops', execute: checkSalesVelocity },
    { checkId: 'order_anomalies', agent: 'pops', execute: checkOrderAnomalies },
    { checkId: 'pos_sync_status', agent: 'smokey', execute: checkPOSSyncStatus },
];
