/**
 * Customer Lifetime Value (CLV) Analytics
 * Calculates and tracks customer value metrics
 */

'use server';

import { createServerClient } from '@/firebase/server-client';

export interface CustomerMetrics {
    customerId: string;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    firstOrderDate: Date;
    lastOrderDate: Date;
    daysSinceFirstOrder: number;
    daysSinceLastOrder: number;
    orderFrequency: number; // orders per month
    predictedCLV: number;
    customerSegment: 'new' | 'active' | 'at-risk' | 'churned' | 'vip';
    lifetimeValue: number;
}

export interface CohortAnalysis {
    cohortMonth: string; // YYYY-MM
    customersCount: number;
    totalRevenue: number;
    averageCLV: number;
    retentionRate: Record<number, number>; // month -> retention %
}

interface Order {
    id: string;
    customerId: string;
    total: number;
    createdAt: any; // Firestore Timestamp
    [key: string]: any;
}

export class CLVService {
    /**
     * Calculate customer metrics
     */
    async calculateCustomerMetrics(customerId: string): Promise<CustomerMetrics> {
        const { firestore } = await createServerClient();

        // Get all orders for customer
        const ordersSnapshot = await firestore
            .collection('orders')
            .where('customerId', '==', customerId)
            .orderBy('createdAt', 'asc')
            .get();

        if (ordersSnapshot.empty) {
            throw new Error('No orders found for customer');
        }

        const orders = ordersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate(),
        })) as unknown as (Order & { createdAt: Date })[];

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const averageOrderValue = totalRevenue / totalOrders;

        const firstOrderDate = orders[0].createdAt;
        const lastOrderDate = orders[orders.length - 1].createdAt;

        const now = new Date();
        const daysSinceFirstOrder = Math.floor(
            (now.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysSinceLastOrder = Math.floor(
            (now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const monthsSinceFirstOrder = daysSinceFirstOrder / 30;
        const orderFrequency = totalOrders / Math.max(monthsSinceFirstOrder, 1);

        // Predict CLV using simple heuristic
        // Real implementation would use ML model
        const monthlyValue = orderFrequency * averageOrderValue;
        const predictedLifetimeMonths = 24; // Assume 2-year lifetime
        const predictedCLV = monthlyValue * predictedLifetimeMonths;

        // Determine customer segment
        let customerSegment: CustomerMetrics['customerSegment'] = 'active';
        if (daysSinceFirstOrder < 30) {
            customerSegment = 'new';
        } else if (daysSinceLastOrder > 90) {
            customerSegment = 'churned';
        } else if (daysSinceLastOrder > 60) {
            customerSegment = 'at-risk';
        } else if (totalRevenue > 1000 || totalOrders > 10) {
            customerSegment = 'vip';
        }

        return {
            customerId,
            totalOrders,
            totalRevenue,
            averageOrderValue,
            firstOrderDate,
            lastOrderDate,
            daysSinceFirstOrder,
            daysSinceLastOrder,
            orderFrequency,
            predictedCLV,
            customerSegment,
            lifetimeValue: totalRevenue,
        };
    }

    /**
     * Get cohort analysis
     */
    async getCohortAnalysis(brandId: string): Promise<CohortAnalysis[]> {
        const { firestore } = await createServerClient();

        // Get all customers for brand
        const customersSnapshot = await firestore
            .collection('customers')
            .where('brandId', '==', brandId)
            .get();

        // Group by cohort month (first order month)
        const cohorts: Record<string, {
            customers: Set<string>;
            revenue: number;
            retentionByMonth: Record<number, Set<string>>;
        }> = {};

        for (const customerDoc of customersSnapshot.docs) {
            const customerId = customerDoc.id;

            // Get customer's orders
            const ordersSnapshot = await firestore
                .collection('orders')
                .where('customerId', '==', customerId)
                .orderBy('createdAt', 'asc')
                .get();

            if (ordersSnapshot.empty) continue;

            const orders = ordersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt.toDate(),
            })) as unknown as (Order & { createdAt: Date })[];

            const firstOrder = orders[0];
            const cohortMonth = `${firstOrder.createdAt.getFullYear()}-${String(
                firstOrder.createdAt.getMonth() + 1
            ).padStart(2, '0')}`;

            if (!cohorts[cohortMonth]) {
                cohorts[cohortMonth] = {
                    customers: new Set(),
                    revenue: 0,
                    retentionByMonth: {},
                };
            }

            cohorts[cohortMonth].customers.add(customerId);
            cohorts[cohortMonth].revenue += orders.reduce((sum, o) => sum + (o.total || 0), 0);

            // Track retention by month
            orders.forEach(order => {
                const monthsSinceFirst = Math.floor(
                    (order.createdAt.getTime() - firstOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
                );

                if (!cohorts[cohortMonth].retentionByMonth[monthsSinceFirst]) {
                    cohorts[cohortMonth].retentionByMonth[monthsSinceFirst] = new Set();
                }
                cohorts[cohortMonth].retentionByMonth[monthsSinceFirst].add(customerId);
            });
        }

        // Convert to array and calculate metrics
        return Object.entries(cohorts).map(([cohortMonth, data]) => {
            const customersCount = data.customers.size;
            const totalRevenue = data.revenue;
            const averageCLV = totalRevenue / customersCount;

            // Calculate retention rates
            const retentionRate: Record<number, number> = {};
            Object.entries(data.retentionByMonth).forEach(([month, customers]) => {
                retentionRate[parseInt(month)] = (customers.size / customersCount) * 100;
            });

            return {
                cohortMonth,
                customersCount,
                totalRevenue,
                averageCLV,
                retentionRate,
            };
        }).sort((a, b) => a.cohortMonth.localeCompare(b.cohortMonth));
    }

    /**
     * Get customer segments distribution
     */
    async getCustomerSegments(brandId: string): Promise<Record<string, number>> {
        const { firestore } = await createServerClient();

        const customersSnapshot = await firestore
            .collection('customers')
            .where('brandId', '==', brandId)
            .get();

        const segments: Record<string, number> = {
            new: 0,
            active: 0,
            'at-risk': 0,
            churned: 0,
            vip: 0,
        };

        for (const customerDoc of customersSnapshot.docs) {
            try {
                const metrics = await this.calculateCustomerMetrics(customerDoc.id);
                segments[metrics.customerSegment]++;
            } catch (error) {
                // Skip customers with no orders
                continue;
            }
        }

        return segments;
    }
}

export const clvService = new CLVService();
