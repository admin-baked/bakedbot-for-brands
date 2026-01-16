/**
 * CRM Types and Constants
 * This file contains non-async exports that cannot be in a 'use server' file
 */

// ============================================================================
// Cannabis Lifecycle Stages
// ============================================================================
export type CRMLifecycleStage = 
    | 'prospect'       // Discovered via Discovery Hub, not contacted
    | 'contacted'      // Reached out via email/playbook
    | 'demo_scheduled' // Booked a demo or trial
    | 'trial'          // Active trial period
    | 'customer'       // Paying customer
    | 'vip'            // High-value customer (top tier)
    | 'churned'        // Canceled subscription
    | 'winback';       // Re-engagement in progress

export const LIFECYCLE_STAGE_CONFIG: Record<CRMLifecycleStage, { label: string; color: string; order: number }> = {
    prospect: { label: 'Prospect', color: 'bg-gray-100 text-gray-700', order: 1 },
    contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-700', order: 2 },
    demo_scheduled: { label: 'Demo Scheduled', color: 'bg-purple-100 text-purple-700', order: 3 },
    trial: { label: 'Trial', color: 'bg-yellow-100 text-yellow-700', order: 4 },
    customer: { label: 'Customer', color: 'bg-green-100 text-green-700', order: 5 },
    vip: { label: 'VIP', color: 'bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900', order: 6 },
    churned: { label: 'Churned', color: 'bg-red-100 text-red-700', order: 7 },
    winback: { label: 'Win-Back', color: 'bg-orange-100 text-orange-700', order: 8 },
};

// ============================================================================
// CRM User (Platform Users)
// ============================================================================
export interface CRMUser {
    id: string;
    email: string;
    displayName: string;
    photoUrl?: string | null;
    accountType: 'brand' | 'dispensary' | 'superuser' | 'customer';
    lifecycleStage: CRMLifecycleStage;
    signupAt: Date;
    lastLoginAt?: Date | null;
    plan: string;
    mrr: number;  // From Authorize.net
    orgId?: string | null;
    orgName?: string | null;
    notes?: string | null;
    approvalStatus?: 'pending' | 'approved' | 'rejected' | 'disabled';
}
