'use server';

import { getAdminFirestore, getAdminAuth } from '@/firebase/admin';
import { FieldValue, Query } from 'firebase-admin/firestore';
import type { CRMLifecycleStage, CRMUser } from './crm-types';

export interface CRMBrand {
    id: string;
    name: string;
    slug: string;
    email?: string | null;
    website?: string | null;
    logoUrl?: string | null;
    description?: string | null;
    source: 'discovery' | 'claim' | 'import' | 'system';
    discoveredFrom?: string[]; // Array of dispensary IDs where found
    states: string[];
    isNational: boolean;
    city?: string | null;
    state?: string | null;
    seoPageId?: string | null;
    claimedOrgId?: string | null;
    claimStatus: 'unclaimed' | 'invited' | 'pending' | 'claimed';
    discoveredAt: Date;
    updatedAt: Date;
    claimedBy?: string | null;
    claimedAt?: Date | null;
}

export interface CRMDispensary {
    id: string;
    name: string;
    slug: string;
    email?: string | null;
    address: string;
    city: string;
    state: string;
    zip: string;
    website?: string | null;
    phone?: string | null;
    description?: string | null;
    source: 'discovery' | 'claim' | 'import' | 'system';
    seoPageId?: string | null;
    claimedOrgId?: string | null;
    claimStatus: 'unclaimed' | 'invited' | 'pending' | 'claimed';
    invitationSentAt?: Date | null;
    discoveredAt: Date;
    updatedAt: Date;
    retailerId?: string | null;
    claimedBy?: string | null;
    claimedAt?: Date | null;
}

export interface CRMFilters {
    state?: string;
    claimStatus?: 'unclaimed' | 'invited' | 'pending' | 'claimed';
    isNational?: boolean;
    search?: string;
    limit?: number;
    lifecycleStage?: CRMLifecycleStage;
}

// NOTE: LIFECYCLE_STAGE_CONFIG, CRMLifecycleStage, and CRMUser are in crm-types.ts
// Import them directly from '@/server/services/crm-types' - cannot re-export from 'use server' file

/**
 * Create a URL-safe slug from a name
 */
function createSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Upsert a brand - adds state to existing brand or creates new
 */
export async function upsertBrand(
    name: string,
    state: string,
    data: Partial<Pick<CRMBrand, 'logoUrl' | 'website' | 'description' | 'source' | 'discoveredFrom' | 'seoPageId'>> = {}
): Promise<string> {
    const firestore = getAdminFirestore();
    const slug = createSlug(name);

    // Use top-level collection as per approved plan
    const collection = firestore.collection('crm_brands');

    // Check for existing brand by slug
    const existingQuery = await collection
        .where('slug', '==', slug)
        .limit(1)
        .get();

    if (!existingQuery.empty) {
        // Update existing brand - add state if not present
        const doc = existingQuery.docs[0];
        const existing = doc.data() as CRMBrand;
        const states = existing.states || [];

        if (!states.includes(state)) {
            states.push(state);
        }

        const discoveredFrom = existing.discoveredFrom || [];
        if (data.discoveredFrom) {
            data.discoveredFrom.forEach(id => {
                if (!discoveredFrom.includes(id)) {
                    discoveredFrom.push(id);
                }
            });
        }

        await doc.ref.update({
            states,
            discoveredFrom,
            isNational: states.length >= 3,
            updatedAt: new Date(),
            ...(data.logoUrl && { logoUrl: data.logoUrl }),
            ...(data.website && { website: data.website }),
            ...(data.description && { description: data.description }),
            ...(data.seoPageId && { seoPageId: data.seoPageId }),
        });

        return doc.id;
    } else {
        // Create new brand
        const brandRef = collection.doc();

        const brand: CRMBrand = {
            id: brandRef.id,
            name,
            slug,
            states: [state],
            isNational: false,
            claimStatus: 'unclaimed',
            source: data.source || 'discovery',
            logoUrl: data.logoUrl || null,
            website: data.website || null,
            description: data.description || null,
            discoveredFrom: data.discoveredFrom || [],
            seoPageId: data.seoPageId || null,
            discoveredAt: new Date(),
            updatedAt: new Date(),
        };

        await brandRef.set(brand);

        return brandRef.id;
    }
}

/**
 * Upsert a dispensary - creates if not exists for the given state
 */
export async function upsertDispensary(
    name: string,
    state: string,
    city: string,
    data: Partial<Pick<CRMDispensary, 'address' | 'zip' | 'website' | 'phone' | 'retailerId' | 'source' | 'seoPageId'>> = {}
): Promise<string> {
    const firestore = getAdminFirestore();
    const slug = createSlug(name);

    // Use top-level collection as per approved plan
    const collection = firestore.collection('crm_dispensaries');

    // Check for existing dispensary by slug + state + city (allow same name in different locations)
    const existingQuery = await collection
        .where('slug', '==', slug)
        .where('state', '==', state)
        .where('city', '==', city)
        .limit(1)
        .get();

    if (!existingQuery.empty) {
        // Already exists for this location, just return the ID
        const doc = existingQuery.docs[0];
        return doc.id;
    } else {
        // Create new dispensary
        const dispRef = collection.doc();

        const dispensary: CRMDispensary = {
            id: dispRef.id,
            name,
            slug,
            address: data.address || '',
            city,
            state,
            zip: data.zip || '',
            website: data.website || null,
            phone: data.phone || null,
            source: data.source || 'discovery',
            claimStatus: 'unclaimed',
            retailerId: data.retailerId || null,
            seoPageId: data.seoPageId || null,
            discoveredAt: new Date(),
            updatedAt: new Date(),
        };

        await dispRef.set(dispensary);

        return dispRef.id;
    }
}

/**
 * Get brands with optional filtering
 */
export async function getBrands(filters: CRMFilters = {}): Promise<CRMBrand[]> {
    const firestore = getAdminFirestore();
    let query = firestore
        .collection('crm_brands')
        .orderBy('name', 'asc');

    if (filters.claimStatus) {
        query = query.where('claimStatus', '==', filters.claimStatus);
    }

    if (filters.isNational !== undefined) {
        query = query.where('isNational', '==', filters.isNational);
    }

    const snapshot = await query.limit(filters.limit || 100).get();

    let brands = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            discoveredAt: data.discoveredAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            claimedAt: data.claimedAt?.toDate?.() || null,
        } as CRMBrand;
    });

    // Filter by state (client-side since Firestore can't do array-contains with other filters easily)
    if (filters.state) {
        brands = brands.filter(b => b.states.includes(filters.state!));
    }

    // Filter by search
    if (filters.search) {
        const search = filters.search.toLowerCase();
        brands = brands.filter(b => b.name.toLowerCase().includes(search));
    }

    return brands;
}

/**
 * Get dispensaries with optional filtering
 */
export async function getDispensaries(filters: CRMFilters = {}): Promise<CRMDispensary[]> {
    const firestore = getAdminFirestore();
    let query = firestore
        .collection('crm_dispensaries')
        .orderBy('name', 'asc');

    if (filters.state) {
        query = query.where('state', '==', filters.state);
    }

    if (filters.claimStatus) {
        query = query.where('claimStatus', '==', filters.claimStatus);
    }

    const snapshot = await query.limit(filters.limit || 100).get();

    let dispensaries = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            discoveredAt: data.discoveredAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            claimedAt: data.claimedAt?.toDate?.() || null,
            invitationSentAt: data.invitationSentAt?.toDate?.() || null,
        } as CRMDispensary;
    });

    // Filter by search
    if (filters.search) {
        const search = filters.search.toLowerCase();
        dispensaries = dispensaries.filter(d =>
            d.name.toLowerCase().includes(search) ||
            d.city.toLowerCase().includes(search)
        );
    }

    return dispensaries;
}

/**
 * Get CRM stats
 */
export async function getCRMStats(): Promise<{
    totalBrands: number;
    nationalBrands: number;
    claimedBrands: number;
    totalDispensaries: number;
    claimedDispensaries: number;
    totalPlatformLeads: number;
}> {
    const firestore = getAdminFirestore();

    const brandsSnap = await firestore
        .collection('crm_brands')
        .get();

    const dispensariesSnap = await firestore
        .collection('crm_dispensaries')
        .get();

    const leadsSnap = await firestore
        .collection('leads')
        .get();

    const brands = brandsSnap.docs.map(d => d.data());
    const dispensaries = dispensariesSnap.docs.map(d => d.data());

    return {
        totalBrands: brands.length,
        nationalBrands: brands.filter(b => b.isNational).length,
        claimedBrands: brands.filter(b => b.claimStatus === 'claimed').length,
        totalDispensaries: dispensaries.length,
        claimedDispensaries: dispensaries.filter(d => d.claimStatus === 'claimed').length,
        totalPlatformLeads: leadsSnap.size,
    };
}

export interface CRMLead {
    id: string;
    email: string;
    company: string;
    source: string;
    status: string;
    demoCount: number;
    createdAt: Date;
}

/**
 * Get platform leads (inbound B2B)
 */
export async function getPlatformLeads(filters: CRMFilters = {}): Promise<CRMLead[]> {
    const firestore = getAdminFirestore();
    let query = firestore
        .collection('leads')
        .orderBy('createdAt', 'desc');

    if (filters.limit) {
        query = query.limit(filters.limit);
    } else {
        query = query.limit(100);
    }

    const snapshot = await query.get();

    let leads = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            email: data.email,
            company: data.company,
            source: data.source || 'unknown',
            status: data.status || 'new',
            demoCount: data.demoCount || 0,
            createdAt: data.createdAt?.toDate?.() || new Date(),
        } as CRMLead;
    });

    // Filter by search (client-side)
    if (filters.search) {
        const search = filters.search.toLowerCase();
        leads = leads.filter(l =>
            l.email.toLowerCase().includes(search) ||
            l.company.toLowerCase().includes(search)
        );
    }

    return leads;
}

// ============================================================================
// Platform Users (Full CRM)
// ============================================================================

/**
 * Get all platform users with lifecycle tracking and MRR
 */
export async function getPlatformUsers(filters: CRMFilters = {}): Promise<CRMUser[]> {
    const firestore = getAdminFirestore();
    let query: Query = firestore
        .collection('users');
        // .orderBy('createdAt', 'desc'); // REMOVED: Excludes users without createdAt

    if (filters.limit) {
        query = query.limit(filters.limit);
    } else {
        query = query.limit(200);
    }

    const snapshot = await query.get();

    let users = snapshot.docs.map(doc => {
        const data = doc.data();

        // Determine account type from role
        let accountType: CRMUser['accountType'] = 'customer';
        if (data.role === 'superuser' || data.role === 'admin') accountType = 'superuser';
        else if (data.orgType === 'brand') accountType = 'brand';
        else if (data.orgType === 'dispensary') accountType = 'dispensary';

        // Determine lifecycle stage
        let lifecycleStage: CRMLifecycleStage = data.lifecycleStage || 'prospect';

        // Auto-detect based on data if not set
        if (!data.lifecycleStage) {
            if (data.subscription?.status === 'active') {
                lifecycleStage = data.plan === 'scale' ? 'vip' : 'customer';
            } else if (data.claimedAt || data.orgId) {
                lifecycleStage = 'trial';
            } else if (data.createdAt) {
                lifecycleStage = 'prospect';
            }
        }

        return {
            id: doc.id,
            email: data.email || '',
            displayName: data.displayName || data.name || 'Unknown',
            photoUrl: data.photoURL || data.photoUrl || null,
            accountType,
            lifecycleStage,
            signupAt: data.createdAt?.toDate?.() || new Date(0), // Default to old date if missing
            lastLoginAt: data.lastLoginAt?.toDate?.() || null,
            plan: data.plan || data.subscription?.plan || 'free',
            mrr: data.mrr || 0, // Will be enriched from Authorize.net
            orgId: data.orgId || data.tenantId || null,
            orgName: data.orgName || null,
            notes: data.crmNotes || null,
            approvalStatus: data.approvalStatus || 'approved', // Default to approved for legacy/existing
        } as CRMUser;
    });

    // Filter by lifecycle stage
    if (filters.lifecycleStage) {
        users = users.filter(u => u.lifecycleStage === filters.lifecycleStage);
    }

    // Filter by search
    if (filters.search) {
        const search = filters.search.toLowerCase();
        users = users.filter(u =>
            u.email.toLowerCase().includes(search) ||
            u.displayName.toLowerCase().includes(search) ||
            (u.orgName?.toLowerCase().includes(search) ?? false)
        );
    }

    // Sort by signupAt desc (Newest first)
    // Handle nulls by pushing them to the end or treating as old
    users.sort((a, b) => {
        const timeA = a.signupAt ? new Date(a.signupAt).getTime() : 0;
        const timeB = b.signupAt ? new Date(b.signupAt).getTime() : 0;
        return timeB - timeA;
    });

    return users;
}

/**
 * Get CRM user stats for dashboard
 */
export async function getCRMUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalMRR: number;
    byLifecycle: Record<CRMLifecycleStage, number>;
}> {
    const firestore = getAdminFirestore();
    const snapshot = await firestore.collection('users').get();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let totalMRR = 0;
    let activeUsers = 0;
    const byLifecycle: Record<CRMLifecycleStage, number> = {
        prospect: 0,
        contacted: 0,
        demo_scheduled: 0,
        trial: 0,
        customer: 0,
        vip: 0,
        churned: 0,
        winback: 0,
    };

    snapshot.docs.forEach(doc => {
        const data = doc.data();

        // Count active users
        const lastLogin = data.lastLoginAt?.toDate?.();
        if (lastLogin && lastLogin >= sevenDaysAgo) {
            activeUsers++;
        }

        // Sum MRR
        totalMRR += data.mrr || 0;

        // Count by lifecycle
        const stage = (data.lifecycleStage || 'prospect') as CRMLifecycleStage;
        if (byLifecycle[stage] !== undefined) {
            byLifecycle[stage]++;
        }
    });

    return {
        totalUsers: snapshot.size,
        activeUsers,
        totalMRR,
        byLifecycle,
    };
}

/**
 * Update user lifecycle stage
 */
export async function updateUserLifecycle(
    userId: string,
    stage: CRMLifecycleStage,
    note?: string
): Promise<void> {
    const firestore = getAdminFirestore();

    const updateData: any = {
        lifecycleStage: stage,
        lifecycleUpdatedAt: new Date(),
    };

    if (note) {
        updateData.crmNotes = note;
    }

    await firestore.collection('users').doc(userId).update(updateData);
}

/**
 * Add CRM note to user
 */
export async function addCRMNote(
    userId: string,
    note: string,
    authorId: string
): Promise<void> {
    const firestore = getAdminFirestore();

    await firestore.collection('users').doc(userId).collection('crm_notes').add({
        note,
        authorId,
        createdAt: new Date(),
    });
}

/**
 * Delete a CRM entity (Brand or Dispensary)
 * Only for admin cleanup
 */
export async function deleteCrmEntity(
    id: string,
    type: 'brand' | 'dispensary' | 'user'
): Promise<void> {
    const firestore = getAdminFirestore();

    if (type === 'user') {
        const auth = getAdminAuth();
        try {
            await auth.deleteUser(id);
        } catch (error: any) {
            // Ignore if user not found (already deleted or ghost)
            if (error.code !== 'auth/user-not-found') {
                console.error('Error deleting user from Auth:', error);
            }
        }
        await firestore.collection('users').doc(id).delete();
        return;
    }

    const collection = type === 'brand' ? 'crm_brands' : 'crm_dispensaries';
    await firestore.collection(collection).doc(id).delete();
}

/**
 * Force delete a user by email (useful for cleanup of zombie users)
 */
export async function deleteUserByEmail(email: string): Promise<string> {
    const auth = getAdminAuth();
    const firestore = getAdminFirestore();
    let result = '';

    try {
        // 1. Delete from Auth
        try {
            const user = await auth.getUserByEmail(email);
            if (user) {
                await auth.deleteUser(user.uid);
                // 2. Delete main doc
                await firestore.collection('users').doc(user.uid).delete();
                result += `Deleted Auth user ${user.uid}. `;
            }
        } catch (e: any) {
             if (e.code === 'auth/user-not-found') {
                 result += 'User not found in Auth. ';
             } else {
                 throw e;
             }
        }

        // 3. Delete any orphaned docs with this email
        const snap = await firestore.collection('users').where('email', '==', email).get();
        if (!snap.empty) {
            const batch = firestore.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            result += `Deleted ${snap.size} orphaned Firestore documents.`;
        } else {
            result += 'No orphaned documents found.';
        }

    } catch (e: any) {
        console.error('Error in deleteUserByEmail:', e);
        throw new Error(e.message);
    }
    
    return result;
}


