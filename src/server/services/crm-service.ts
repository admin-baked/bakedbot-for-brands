'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface CRMBrand {
    id: string;
    name: string;
    slug: string;
    states: string[];  // States where this brand is found
    isNational: boolean;  // Found in 3+ states
    claimStatus: 'unclaimed' | 'pending' | 'claimed';
    claimedBy: string | null;
    claimedAt: Date | null;
    logoUrl: string | null;
    website: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CRMDispensary {
    id: string;
    name: string;
    slug: string;
    state: string;
    city: string;
    claimStatus: 'unclaimed' | 'pending' | 'claimed';
    claimedBy: string | null;
    claimedAt: Date | null;
    retailerId: string | null;  // CannMenus retailer ID
    createdAt: Date;
    updatedAt: Date;
}

export interface CRMFilters {
    state?: string;
    claimStatus?: 'unclaimed' | 'pending' | 'claimed';
    isNational?: boolean;
    search?: string;
    limit?: number;
}

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
    data: Partial<Pick<CRMBrand, 'logoUrl' | 'website'>> = {}
): Promise<string> {
    const firestore = getAdminFirestore();
    const slug = createSlug(name);

    // Check for existing brand by slug
    const existingQuery = await firestore
        .collection('foot_traffic')
        .doc('crm')
        .collection('brands')
        .where('slug', '==', slug)
        .limit(1)
        .get();

    if (!existingQuery.empty) {
        // Update existing brand - add state if not present
        const doc = existingQuery.docs[0];
        const existing = doc.data();
        const states = existing.states || [];

        if (!states.includes(state)) {
            states.push(state);
        }

        await doc.ref.update({
            states,
            isNational: states.length >= 3,
            updatedAt: new Date(),
            ...(data.logoUrl && { logoUrl: data.logoUrl }),
            ...(data.website && { website: data.website }),
        });

        return doc.id;
    } else {
        // Create new brand
        const brandRef = firestore
            .collection('foot_traffic')
            .doc('crm')
            .collection('brands')
            .doc();

        await brandRef.set({
            id: brandRef.id,
            name,
            slug,
            states: [state],
            isNational: false,
            claimStatus: 'unclaimed',
            claimedBy: null,
            claimedAt: null,
            logoUrl: data.logoUrl || null,
            website: data.website || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

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
    data: Partial<Pick<CRMDispensary, 'retailerId'>> = {}
): Promise<string> {
    const firestore = getAdminFirestore();
    const slug = createSlug(name);

    // Check for existing dispensary by slug + state (allow same name in different states)
    const existingQuery = await firestore
        .collection('foot_traffic')
        .doc('crm')
        .collection('dispensaries')
        .where('slug', '==', slug)
        .where('state', '==', state)
        .limit(1)
        .get();

    if (!existingQuery.empty) {
        // Already exists for this state, just return the ID
        const doc = existingQuery.docs[0];
        return doc.id;
    } else {
        // Create new dispensary
        const dispRef = firestore
            .collection('foot_traffic')
            .doc('crm')
            .collection('dispensaries')
            .doc();

        await dispRef.set({
            id: dispRef.id,
            name,
            slug,
            state,
            city,
            claimStatus: 'unclaimed',
            claimedBy: null,
            claimedAt: null,
            retailerId: data.retailerId || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return dispRef.id;
    }
}

/**
 * Get brands with optional filtering
 */
export async function getBrands(filters: CRMFilters = {}): Promise<CRMBrand[]> {
    const firestore = getAdminFirestore();
    let query = firestore
        .collection('foot_traffic')
        .doc('crm')
        .collection('brands')
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
            id: doc.id,
            name: data.name,
            slug: data.slug,
            states: data.states || [],
            isNational: data.isNational || false,
            claimStatus: data.claimStatus || 'unclaimed',
            claimedBy: data.claimedBy || null,
            claimedAt: data.claimedAt?.toDate?.() || null,
            logoUrl: data.logoUrl || null,
            website: data.website || null,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
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
        .collection('foot_traffic')
        .doc('crm')
        .collection('dispensaries')
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
            id: doc.id,
            name: data.name,
            slug: data.slug,
            state: data.state,
            city: data.city,
            claimStatus: data.claimStatus || 'unclaimed',
            claimedBy: data.claimedBy || null,
            claimedAt: data.claimedAt?.toDate?.() || null,
            retailerId: data.retailerId || null,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
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
        .collection('foot_traffic')
        .doc('crm')
        .collection('brands')
        .get();

    const dispensariesSnap = await firestore
        .collection('foot_traffic')
        .doc('crm')
        .collection('dispensaries')
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
