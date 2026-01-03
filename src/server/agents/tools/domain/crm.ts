/**
 * CRM Agent Tools
 * 
 * Tools for agents (Mrs. Parker, Craig, Pops) to query customer CRM data.
 * These enable personalized recommendations and marketing automation.
 */

import { createServerClient } from '@/firebase/server-client';
import { CustomerSegment, getSegmentInfo } from '@/types/customers';

// ==========================================
// Types
// ==========================================

export interface CRMCustomerSummary {
    email: string;
    displayName?: string;
    segment: string;
    totalSpent: number;
    orderCount: number;
    tier: string;
}

export interface CustomerCountResult {
    count: number;
    segment?: string;
    message: string;
}

export interface FindCustomersResult {
    customers: CRMCustomerSummary[];
    totalFound: number;
}

export interface TopCustomersResult {
    customers: CRMCustomerSummary[];
    insight: string;
}

export interface AtRiskCustomersResult {
    customers: {
        email: string;
        displayName?: string;
        daysSinceLastOrder?: number;
        totalSpent: number;
    }[];
    recommendation: string;
}

export interface CustomerInsightResult {
    customer: {
        email: string;
        displayName?: string;
        segment: string;
        totalSpent: number;
        orderCount: number;
        avgOrderValue: number;
        tier: string;
        preferredCategories: string[];
    } | null;
    insight: string;
    suggestedAction: string;
}

// ==========================================
// Tool Functions
// ==========================================

/**
 * Get the count of customers, optionally filtered by segment.
 * Use to answer questions like "How many VIP customers do I have?"
 */
export async function getCustomerCount(
    orgId: string,
    segment?: string
): Promise<CustomerCountResult> {
    const { firestore } = await createServerClient();

    let query = firestore.collection('customers').where('orgId', '==', orgId);

    if (segment) {
        query = query.where('segment', '==', segment);
    }

    const snap = await query.count().get();
    const count = snap.data().count;

    const segmentLabel = segment ? getSegmentInfo(segment as CustomerSegment).label : 'total';

    return {
        count,
        segment,
        message: `You have ${count} ${segmentLabel} customers.`,
    };
}

/**
 * Search for customers by name, email, or filter by segment.
 */
export async function findCustomers(
    orgId: string,
    params: {
        query?: string;
        segment?: string;
        limit?: number;
    }
): Promise<FindCustomersResult> {
    const { firestore } = await createServerClient();
    const limit = params.limit || 10;

    let query = firestore.collection('customers')
        .where('orgId', '==', orgId)
        .limit(limit);

    if (params.segment) {
        query = query.where('segment', '==', params.segment);
    }

    const snap = await query.get();
    let customers: CRMCustomerSummary[] = [];

    snap.forEach(doc => {
        const data = doc.data();
        customers.push({
            email: data.email,
            displayName: data.displayName || data.email,
            segment: data.segment,
            totalSpent: data.totalSpent || 0,
            orderCount: data.orderCount || 0,
            tier: data.tier || 'bronze',
        });
    });

    // Client-side search if query provided
    if (params.query) {
        const q = params.query.toLowerCase();
        customers = customers.filter(c =>
            c.email.toLowerCase().includes(q) ||
            c.displayName?.toLowerCase().includes(q)
        );
    }

    return {
        customers: customers.slice(0, limit),
        totalFound: customers.length,
    };
}

/**
 * Get the top customers by spend, order count, or lifetime value.
 */
export async function getTopCustomers(
    orgId: string,
    params?: {
        sortBy?: 'totalSpent' | 'orderCount' | 'lifetimeValue';
        limit?: number;
    }
): Promise<TopCustomersResult> {
    const { firestore } = await createServerClient();
    const limit = params?.limit || 5;
    const sortBy = params?.sortBy || 'totalSpent';

    const snap = await firestore.collection('customers')
        .where('orgId', '==', orgId)
        .orderBy(sortBy, 'desc')
        .limit(limit)
        .get();

    const customers: CRMCustomerSummary[] = [];
    snap.forEach(doc => {
        const data = doc.data();
        customers.push({
            email: data.email,
            displayName: data.displayName || data.email,
            segment: data.segment,
            totalSpent: data.totalSpent || 0,
            orderCount: data.orderCount || 0,
            tier: data.tier || 'bronze',
        });
    });

    const totalSpend = customers.reduce((sum, c) => sum + c.totalSpent, 0);

    return {
        customers,
        insight: `Your top ${customers.length} customers have spent a combined $${totalSpend.toFixed(2)}. Consider exclusive perks for these VIPs.`,
    };
}

/**
 * Get customers who are at risk of churning (30-90 days inactive).
 */
export async function getAtRiskCustomers(
    orgId: string,
    limit: number = 10
): Promise<AtRiskCustomersResult> {
    const { firestore } = await createServerClient();

    const snap = await firestore.collection('customers')
        .where('orgId', '==', orgId)
        .where('segment', 'in', ['at_risk', 'slipping'])
        .limit(limit)
        .get();

    const customers: AtRiskCustomersResult['customers'] = [];
    snap.forEach(doc => {
        const data = doc.data();
        const lastOrder = data.lastOrderDate?.toDate?.();
        const daysSince = lastOrder
            ? Math.floor((Date.now() - lastOrder.getTime()) / (1000 * 60 * 60 * 24))
            : undefined;

        customers.push({
            email: data.email,
            displayName: data.displayName || data.email,
            daysSinceLastOrder: daysSince,
            totalSpent: data.totalSpent || 0,
        });
    });

    return {
        customers,
        recommendation: customers.length > 0
            ? `${customers.length} customers need a win-back campaign. Consider a personalized discount or "we miss you" message.`
            : 'Great news! No at-risk customers detected.',
    };
}

/**
 * Get detailed insight about a specific customer.
 */
export async function getCustomerInsight(
    orgId: string,
    customerId: string
): Promise<CustomerInsightResult> {
    const { firestore } = await createServerClient();

    // Try by ID first, then by email
    let doc = await firestore.collection('customers').doc(customerId).get();

    if (!doc.exists || doc.data()?.orgId !== orgId) {
        // Try email search
        const snap = await firestore.collection('customers')
            .where('orgId', '==', orgId)
            .where('email', '==', customerId.toLowerCase())
            .limit(1)
            .get();

        if (snap.empty) {
            return {
                customer: null,
                insight: 'Customer not found.',
                suggestedAction: 'Check the email or customer ID.',
            };
        }
        doc = snap.docs[0];
    }

    const data = doc.data()!;
    const segInfo = getSegmentInfo(data.segment as CustomerSegment);

    let suggestedAction = 'No specific action needed.';
    if (data.segment === 'at_risk' || data.segment === 'slipping') {
        suggestedAction = 'Send a win-back offer with personalized discount.';
    } else if (data.segment === 'vip') {
        suggestedAction = 'Consider exclusive early access or VIP perks.';
    } else if (data.segment === 'new') {
        suggestedAction = 'Send onboarding sequence and product recommendations.';
    }

    return {
        customer: {
            email: data.email,
            displayName: data.displayName || data.email,
            segment: data.segment,
            totalSpent: data.totalSpent || 0,
            orderCount: data.orderCount || 0,
            avgOrderValue: data.avgOrderValue || 0,
            tier: data.tier || 'bronze',
            preferredCategories: data.preferredCategories || [],
        },
        insight: `This is a ${segInfo.label} customer with ${data.orderCount || 0} orders totaling $${(data.totalSpent || 0).toFixed(2)}.`,
        suggestedAction,
    };
}

/**
 * Internal CRM Tools (For Jack/Executives)
 */
import { getPlatformLeads, getBrands } from '@/server/services/crm-service';

export async function getInternalLeads(
    limit: number = 20,
    search?: string
) {
    const leads = await getPlatformLeads({ limit, search });
    return {
        leads: leads.map(l => ({
            company: l.company,
            email: l.email,
            status: l.status,
            source: l.source,
            created: l.createdAt
        })),
        count: leads.length
    };
}

export async function getInternalBrands(
    state?: string,
    status?: 'unclaimed' | 'claimed' | 'invited'
) {
    const brands = await getBrands({ state, claimStatus: status, limit: 20 });
    return {
        brands: brands.map(b => ({
            name: b.name,
            state: b.states.join(', '),
            status: b.claimStatus,
            isNational: b.isNational
        })),
        count: brands.length
    };
}

/**
 * All CRM tools exported for agent registration
 */
export const crmTools = {
    'crm.getCustomerCount': getCustomerCount,
    'crm.findCustomers': findCustomers,
    'crm.getTopCustomers': getTopCustomers,
    'crm.getAtRiskCustomers': getAtRiskCustomers,
    'crm.getCustomerInsight': getCustomerInsight,
    // Internal Tools
    'crm.getInternalLeads': getInternalLeads,
    'crm.getInternalBrands': getInternalBrands,
};

export default crmTools;
