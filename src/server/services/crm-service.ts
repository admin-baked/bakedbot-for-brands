'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

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
