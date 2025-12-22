
'use server';

import { createServerClient } from '@/firebase/server-client';
import { DeeboGuardrails } from '@/server/services/deebo-guardrails';
import { revalidatePath } from 'next/cache';

export async function updateBrandProfile(brandId: string, formData: FormData) {
    const { firestore } = await createServerClient();

    const description = formData.get('description') as string;
    const websiteUrl = formData.get('websiteUrl') as string;
    const logoUrl = formData.get('logoUrl') as string;
    const coverImageUrl = formData.get('coverImageUrl') as string;
    const name = formData.get('name') as string | null;
    const isInitialNameSet = formData.get('isInitialNameSet') === 'true';
    const marketState = formData.get('marketState') as string | null;

    // 1. Run Deebo Guardrails on description
    const compliance = DeeboGuardrails.validateContent(description || '');

    if (!compliance.isValid) {
        return {
            success: false,
            error: `Content contains prohibited terms: ${compliance.violations.join(', ')}`
        };
    }

    // 2. Also validate name if provided
    if (name) {
        const nameCompliance = DeeboGuardrails.validateContent(name);
        if (!nameCompliance.isValid) {
            return {
                success: false,
                error: `Brand name contains prohibited terms: ${nameCompliance.violations.join(', ')}`
            };
        }
    }

    // 3. Build update payload
    const updateData: Record<string, any> = {
        description,
        websiteUrl,
        logoUrl,
        coverImageUrl,
        updatedAt: new Date()
    };

    // 4. Handle name update - only allowed for initial set
    if (name && isInitialNameSet) {
        updateData.name = name.trim();
        updateData.nameSetByUser = true;
        updateData.slug = createSlug(name);
    }

    // 4b. Handle marketState update
    if (marketState) {
        updateData.marketState = marketState;
    }

    // 5. Update Firestore (use set with merge to handle creation if missing)
    await firestore.collection('brands').doc(brandId).set(updateData, { merge: true });

    // 6. Revalidate
    const slug = updateData.slug || brandId;
    revalidatePath(`/brands/${slug}`);
    revalidatePath('/dashboard/content/brand-page');

    // 7. Trigger async dispensary sync if brand has a name (non-blocking)
    const brandName = updateData.name || name;
    if (brandName || marketState) {
        syncDispensariesForBrand(brandId, brandName || '', marketState || undefined).catch(err => {
            console.error('Background dispensary sync failed:', err);
        });
    }

    return { success: true, nameUpdated: !!name && isInitialNameSet };
}

/**
 * Sync dispensaries carrying this brand into Firestore partners collection (async, non-blocking)
 */
async function syncDispensariesForBrand(brandId: string, brandName: string, marketState?: string) {
    try {
        const { CannMenusService } = await import('@/server/services/cannmenus');
        const { createServerClient } = await import('@/firebase/server-client');

        const cms = new CannMenusService();
        const { firestore } = await createServerClient();

        // Skip if no brand name and no market state
        if (!brandName && !marketState) {
            console.log('No brand name or market state provided, skipping dispensary sync');
            return;
        }

        // Use 5-second timeout to prevent long waits
        const timeoutPromise = new Promise<any[]>((_, reject) =>
            setTimeout(() => reject(new Error('Sync timeout')), 5000)
        );

        const retailers = await Promise.race([
            cms.findRetailersCarryingBrand(brandName, 20),
            timeoutPromise
        ]);

        // Store as automated partners (filter by marketState if provided)
        const partnersRef = firestore.collection('organizations').doc(brandId).collection('partners');
        const batch = firestore.batch();
        let addedCount = 0;

        for (const r of retailers) {
            // Filter by marketState if provided
            if (marketState && r.state?.toUpperCase() !== marketState.toUpperCase()) {
                continue;
            }

            const partnerRef = partnersRef.doc(r.id);
            batch.set(partnerRef, {
                id: r.id,
                name: r.name,
                address: r.street_address,
                city: r.city,
                state: r.state,
                zip: r.postal_code,
                source: 'automated',
                status: 'active',
                syncedAt: new Date()
            }, { merge: true });
            addedCount++;
        }

        await batch.commit();
        console.log(`Synced ${addedCount} dispensaries for brand ${brandName}${marketState ? ` in ${marketState}` : ''}`);
    } catch (err) {
        console.error('Dispensary sync error:', err);
        // Non-fatal, don't throw
    }
}

/**
 * Create a URL-safe slug from a brand name
 */
function createSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Request a brand name change (for brands that already have a name set)
 */
export async function requestBrandNameChange(
    brandId: string,
    currentName: string,
    requestedName: string,
    reason: string
) {
    const { firestore } = await createServerClient();

    // Create a name change request document
    await firestore.collection('brandNameChangeRequests').add({
        brandId,
        currentName,
        requestedName,
        reason,
        status: 'pending',
        createdAt: new Date()
    });

    return { success: true, message: 'Name change request submitted for review.' };
}
