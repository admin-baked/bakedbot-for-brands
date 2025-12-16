'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';

export interface ManualPageInput {
    entityType: 'brand' | 'dispensary';
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    website?: string;
    cities: string[];  // Format: "Detroit, MI"
    zipCodes: string[];
    createGlobalPage: boolean;
}

export interface ManualPageResult {
    success: boolean;
    pagesCreated: number;
    error?: string;
}

export async function createManualPages(input: ManualPageInput): Promise<ManualPageResult> {
    const { firestore } = await createServerClient();

    try {
        const batch = firestore.batch();
        let pagesCreated = 0;
        const now = new Date();

        if (input.entityType === 'brand') {
            // Create brand document
            const brandId = input.slug;
            const brandRef = firestore.collection('brands').doc(brandId);

            const brandData = {
                id: brandId,
                name: input.name,
                slug: input.slug,
                description: input.description || `${input.name} is a cannabis brand.`,
                logoUrl: input.logoUrl || null,
                website: input.website || null,
                verificationStatus: 'unverified',
                dispensaryCount: 0,
                source: 'manual',
                createdAt: now,
                updatedAt: now,
            };

            // Create global brand page
            if (input.createGlobalPage) {
                batch.set(brandRef, brandData);
                pagesCreated++;
            }

            // Create brand SEO pages for each city
            for (const cityLine of input.cities) {
                const [city, state] = cityLine.split(',').map(s => s.trim());
                if (!city) continue;

                const citySlug = `${input.slug}_${city.toLowerCase().replace(/\s+/g, '-')}_${state?.toLowerCase() || 'us'}`;
                const cityPageRef = firestore.collection('foot_traffic').doc('config').collection('brand_pages').doc(citySlug);

                batch.set(cityPageRef, {
                    id: citySlug,
                    brandId: brandId,
                    brandName: input.name,
                    brandSlug: input.slug,
                    logoUrl: input.logoUrl || null,
                    city: city,
                    state: state || 'US',
                    zipCodes: [],
                    ctaType: 'view_products',
                    ctaUrl: input.website || `https://bakedbot.ai/brands/${input.slug}`,
                    published: true,
                    priority: 5,
                    source: 'manual',
                    metrics: { pageViews: 0, ctaClicks: 0, claimAttempts: 0 },
                    createdAt: now,
                    updatedAt: now,
                });
                pagesCreated++;
            }

            // Create brand pages for each ZIP code
            for (const zip of input.zipCodes) {
                if (!zip || zip.length !== 5) continue;

                const zipPageId = `${input.slug}_${zip}`;
                const zipPageRef = firestore.collection('foot_traffic').doc('config').collection('brand_pages').doc(zipPageId);

                batch.set(zipPageRef, {
                    id: zipPageId,
                    brandId: brandId,
                    brandName: input.name,
                    brandSlug: input.slug,
                    logoUrl: input.logoUrl || null,
                    city: 'ZIP ' + zip,
                    state: 'US',
                    zipCodes: [zip],
                    ctaType: 'view_products',
                    ctaUrl: input.website || `https://bakedbot.ai/brands/${input.slug}/near/${zip}`,
                    published: true,
                    priority: 5,
                    source: 'manual',
                    metrics: { pageViews: 0, ctaClicks: 0, claimAttempts: 0 },
                    createdAt: now,
                    updatedAt: now,
                });
                pagesCreated++;
            }

        } else {
            // Create dispensary/retailer document
            const dispensaryId = input.slug;
            const dispensaryRef = firestore.collection('retailers').doc(dispensaryId);

            const dispensaryData = {
                id: dispensaryId,
                name: input.name,
                slug: input.slug,
                description: input.description || `${input.name} is a cannabis dispensary.`,
                logoUrl: input.logoUrl || null,
                website: input.website || null,
                type: 'dispensary',
                source: 'manual',
                createdAt: now,
                updatedAt: now,
            };

            // Create global dispensary page
            if (input.createGlobalPage) {
                batch.set(dispensaryRef, dispensaryData);
                pagesCreated++;
            }

            // Create dispensary SEO pages for each city
            for (const cityLine of input.cities) {
                const [city, state] = cityLine.split(',').map(s => s.trim());
                if (!city) continue;

                const citySlug = `${input.slug}_${city.toLowerCase().replace(/\s+/g, '-')}_${state?.toLowerCase() || 'us'}`;
                const cityPageRef = firestore.collection('foot_traffic').doc('config').collection('dispensary_pages').doc(citySlug);

                batch.set(cityPageRef, {
                    id: citySlug,
                    dispensaryId: dispensaryId,
                    dispensaryName: input.name,
                    dispensarySlug: input.slug,
                    logoUrl: input.logoUrl || null,
                    city: city,
                    state: state || 'US',
                    zipCode: '',
                    featured: false,
                    published: true,
                    source: 'manual',
                    metrics: { pageViews: 0, ctaClicks: 0 },
                    createdAt: now,
                    updatedAt: now,
                });
                pagesCreated++;
            }

            // Create dispensary pages for each ZIP code
            for (const zip of input.zipCodes) {
                if (!zip || zip.length !== 5) continue;

                const zipPageId = `${input.slug}_${zip}`;
                const zipPageRef = firestore.collection('foot_traffic').doc('config').collection('dispensary_pages').doc(zipPageId);

                batch.set(zipPageRef, {
                    id: zipPageId,
                    dispensaryId: dispensaryId,
                    dispensaryName: input.name,
                    dispensarySlug: input.slug,
                    logoUrl: input.logoUrl || null,
                    city: '',
                    state: 'US',
                    zipCode: zip,
                    featured: false,
                    published: true,
                    source: 'manual',
                    metrics: { pageViews: 0, ctaClicks: 0 },
                    createdAt: now,
                    updatedAt: now,
                });
                pagesCreated++;
            }
        }

        await batch.commit();

        return { success: true, pagesCreated };
    } catch (error: any) {
        console.error('Failed to create manual pages:', error);
        return { success: false, pagesCreated: 0, error: error.message };
    }
}
