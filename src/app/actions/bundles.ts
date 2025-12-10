'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { BundleDeal } from '@/types/bundles';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const BUNDLES_COLLECTION = 'bundles';

// Schema for creation validation
const CreateBundleSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string(),
    type: z.enum(['bogo', 'mix_match', 'percentage', 'fixed_price', 'tiered']),
    dispensaryId: z.string().optional(),
    orgId: z.string(),
    status: z.enum(['draft', 'active', 'scheduled', 'paused']).default('draft'),
    // Simplified for MVP - add other fields as needed
});

export async function getBundles(orgId: string): Promise<{ success: boolean; data?: BundleDeal[]; error?: string }> {
    try {
        if (!orgId) throw new Error('Organization ID is required');

        const db = getAdminFirestore();
        const snapshot = await db.collection(BUNDLES_COLLECTION)
            .where('orgId', '==', orgId)
            .orderBy('createdAt', 'desc')
            .get();

        const bundles = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            // Convert timestamps to Date objects if needed, or keeping them as Firestore Timestamps which might fail serialization
            // Admin SDK returns Timestamps. Client needs JSON serializable.
            createdAt: (doc.data().createdAt as any).toDate ? (doc.data().createdAt as any).toDate() : new Date(doc.data().createdAt),
            updatedAt: (doc.data().updatedAt as any).toDate ? (doc.data().updatedAt as any).toDate() : new Date(doc.data().updatedAt),
            // Handle optional dates
            startDate: doc.data().startDate ? ((doc.data().startDate as any).toDate?.() || new Date(doc.data().startDate)) : undefined,
            endDate: doc.data().endDate ? ((doc.data().endDate as any).toDate?.() || new Date(doc.data().endDate)) : undefined,
        })) as BundleDeal[];

        return { success: true, data: bundles };
    } catch (error) {
        console.error('Error fetching bundles:', error);
        return { success: false, error: 'Failed to fetch bundles' };
    }
}

export async function createBundle(data: Partial<BundleDeal>): Promise<{ success: boolean; data?: BundleDeal; error?: string }> {
    try {
        // Validate required minimal fields (or use Zod)
        if (!data.name || !data.orgId) {
            throw new Error('Name and Organization ID are required');
        }

        const id = uuidv4();
        const db = getAdminFirestore();
        const now = new Date(); // Firestore Admin SDK supports Date objects directly usually, or use Timestamp

        const newBundle: BundleDeal = {
            // Defaults
            type: 'mix_match',
            status: 'draft',
            createdBy: 'dispensary',
            products: [],
            currentRedemptions: 0,
            savingsAmount: 0,
            savingsPercent: 0,
            featured: false,
            originalTotal: 0,
            bundlePrice: 0,

            // Override with provided data
            ...data,

            // System fields
            id,
            createdAt: now,
            updatedAt: now,
        } as BundleDeal;

        await db.collection(BUNDLES_COLLECTION).doc(id).set(newBundle);

        revalidatePath('/dashboard/bundles');
        return { success: true, data: newBundle };
    } catch (error) {
        console.error('Error creating bundle:', error);
        return { success: false, error: 'Failed to create bundle' };
    }
}

export async function updateBundle(id: string, data: Partial<BundleDeal>): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) throw new Error('Bundle ID is required');

        const db = getAdminFirestore();
        await db.collection(BUNDLES_COLLECTION).doc(id).update({
            ...data,
            updatedAt: new Date(),
        });

        revalidatePath('/dashboard/bundles');
        return { success: true };
    } catch (error) {
        console.error('Error updating bundle:', error);
        return { success: false, error: 'Failed to update bundle' };
    }
}

export async function deleteBundle(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) throw new Error('Bundle ID is required');

        const db = getAdminFirestore();
        await db.collection(BUNDLES_COLLECTION).doc(id).delete();

        revalidatePath('/dashboard/bundles');
        return { success: true };
    } catch (error) {
        console.error('Error deleting bundle:', error);
        return { success: false, error: 'Failed to delete bundle' };
    }
}
