
import { createServerClient } from '@/firebase/server-client';
// Use the type directly if defined in your project, or define a subset here.
// For now, assuming standard tenant profile structure.

export interface TenantProfile {
    id: string;
    name: string;
    plan: string;
    jurisdictions: string[];
    // Add other fields as needed
}

/**
 * Universal Tool: context.getTenantProfile
 * Fetches the tenant's profile from Firestore.
 */
export async function getTenantProfile(tenantId: string): Promise<TenantProfile> {
    if (!tenantId) throw new Error('Tenant ID is required for profile fetch.');

    const { firestore } = await createServerClient();
    const doc = await firestore.doc(`tenants/${tenantId}`).get();

    if (!doc.exists) {
        throw new Error(`Tenant '${tenantId}' not found.`);
    }

    const data = doc.data();
    return {
        id: doc.id,
        name: data?.name || 'Unknown Tenant',
        plan: data?.plan || 'free',
        jurisdictions: data?.jurisdictions || []
    };
}

/**
 * Universal Tool: audit.log
 * Explicitly logs an event (mostly redundant if Router logs implicitly, but useful for "Agent thoughts").
 */
export async function auditLog(tenantId: string, message: string, level: 'info' | 'warn' | 'error', metadata?: any) {
    // In strict mode, this would write to `tenants/{id}/audit`
    // For now, we can rely on standard logger or the firestoreMemoryAdapter log method if compliant
    console.log(`[AGENT AUDIT] [${tenantId}] ${level.toUpperCase()}: ${message}`, metadata);
    return { logged: true };
}
