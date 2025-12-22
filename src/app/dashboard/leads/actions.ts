'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// ==========================================
// Types
// ==========================================

export type LeadType =
    | 'customer_inquiry'      // Traditional customer lead
    | 'brand_request'         // Dispensary requesting a brand
    | 'vendor_inquiry'        // Vendor/supplier inquiry
    | 'partnership'           // Partnership request
    | 'wholesale';            // Wholesale inquiry

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'closed';

export interface Lead {
    id: string;
    orgId: string;           // Brand or Dispensary ID
    orgType: 'brand' | 'dispensary';

    // Contact info
    email: string;
    name?: string;
    company?: string;
    phone?: string;

    // Lead details
    type: LeadType;
    source: string;          // Where the lead came from
    message?: string;        // Optional message/notes

    // Status tracking
    status: LeadStatus;
    assignedTo?: string;     // User ID if assigned

    // Metadata
    createdAt: Date;
    updatedAt: Date;
}

export interface LeadsData {
    leads: Lead[];
    stats: {
        total: number;
        new: number;
        qualified: number;
        converted: number;
        byType: Record<LeadType, number>;
    };
}

// ==========================================
// Get Leads
// ==========================================

export async function getLeads(orgId?: string): Promise<LeadsData> {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const targetOrgId = orgId || user.brandId || user.uid;
    const orgType = user.role === 'dispensary' ? 'dispensary' : 'brand';

    const { firestore } = await createServerClient();

    const snap = await firestore.collection('leads')
        .where('orgId', '==', targetOrgId)
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

    const leads: Lead[] = [];
    const stats = {
        total: 0,
        new: 0,
        qualified: 0,
        converted: 0,
        byType: {
            customer_inquiry: 0,
            brand_request: 0,
            vendor_inquiry: 0,
            partnership: 0,
            wholesale: 0,
        } as Record<LeadType, number>,
    };

    snap.forEach(doc => {
        const data = doc.data();
        const lead: Lead = {
            id: doc.id,
            orgId: data.orgId || data.brandId, // Backward compat
            orgType: data.orgType || orgType,
            email: data.email,
            name: data.name,
            company: data.company,
            phone: data.phone,
            type: data.type || 'customer_inquiry',
            source: data.source || 'web',
            message: data.message,
            status: data.status || 'new',
            assignedTo: data.assignedTo,
            createdAt: (data.createdAt as Timestamp)?.toDate?.() || new Date(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate?.() || new Date(),
        };

        leads.push(lead);

        // Update stats
        stats.total++;
        if (lead.status === 'new') stats.new++;
        if (lead.status === 'qualified') stats.qualified++;
        if (lead.status === 'converted') stats.converted++;
        stats.byType[lead.type] = (stats.byType[lead.type] || 0) + 1;
    });

    return { leads, stats };
}

// ==========================================
// Capture Lead
// ==========================================

export async function captureLead(
    orgId: string,
    data: {
        email: string;
        name?: string;
        company?: string;
        phone?: string;
        type?: LeadType;
        source?: string;
        message?: string;
    }
): Promise<{ success: boolean; id: string }> {
    const { firestore } = await createServerClient();

    // Basic validation
    if (!data.email || !data.email.includes('@')) {
        throw new Error('Invalid email address');
    }

    // Determine org type from context or default
    const orgType = 'brand'; // Default, could be passed in

    const leadData = {
        orgId,
        orgType,
        email: data.email.toLowerCase(),
        name: data.name || null,
        company: data.company || null,
        phone: data.phone || null,
        type: data.type || 'customer_inquiry',
        source: data.source || 'web',
        message: data.message || null,
        status: 'new',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await firestore.collection('leads').add(leadData);
    return { success: true, id: docRef.id };
}

// ==========================================
// Update Lead
// ==========================================

export async function updateLead(
    leadId: string,
    updates: Partial<Pick<Lead, 'status' | 'assignedTo' | 'message'>>
): Promise<void> {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const { firestore } = await createServerClient();

    // Verify ownership
    const doc = await firestore.collection('leads').doc(leadId).get();
    if (!doc.exists) {
        throw new Error('Lead not found');
    }

    const data = doc.data()!;
    const orgId = user.brandId || user.uid;
    if (data.orgId !== orgId && data.brandId !== orgId) {
        throw new Error('Access denied');
    }

    await firestore.collection('leads').doc(leadId).update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

// ==========================================
// Delete Lead
// ==========================================

export async function deleteLead(leadId: string): Promise<void> {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const { firestore } = await createServerClient();

    const doc = await firestore.collection('leads').doc(leadId).get();
    if (!doc.exists) {
        throw new Error('Lead not found');
    }

    const data = doc.data()!;
    const orgId = user.brandId || user.uid;
    if (data.orgId !== orgId && data.brandId !== orgId) {
        throw new Error('Access denied');
    }

    await firestore.collection('leads').doc(leadId).delete();
}

