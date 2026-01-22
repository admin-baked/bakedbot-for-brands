'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import {
    hasGroundTruth,
    getGroundTruthStats,
    listGroundedBrands,
} from '@/server/grounding';

export interface PilotSetupResult {
    success: boolean;
    message: string;
    data?: {
        userId: string;
        brandId: string;
        orgId: string;
        locationId?: string;
        menuUrl: string;
        groundTruth?: {
            configured: boolean;
            totalQAPairs?: number;
            criticalCount?: number;
            categories?: string[];
        };
    };
    error?: string;
}

export interface BrandPilotConfig {
    type: 'brand';
    email: string;
    password: string;
    brandName: string;
    brandSlug: string;
    tagline?: string;
    description?: string;
    website?: string;
    // Theme
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    // Purchase model
    purchaseModel: 'online_only' | 'local_pickup' | 'hybrid';
    shipsNationwide: boolean;
    // Shipping address (for online_only)
    shippingAddress?: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };
    contactEmail?: string;
    contactPhone?: string;
    // Chatbot
    chatbotEnabled: boolean;
    chatbotName?: string;
    chatbotWelcome?: string;
    // Ground truth QA set (for Smokey AI training)
    // If not provided, uses brandSlug as the brandId to look up ground truth
    groundTruthBrandId?: string;
}

export interface DispensaryPilotConfig {
    type: 'dispensary';
    email: string;
    password: string;
    dispensaryName: string;
    dispensarySlug: string;
    tagline?: string;
    description?: string;
    website?: string;
    // Theme
    primaryColor: string;
    secondaryColor: string;
    // Location
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    licenseNumber?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    // Hours
    hours?: {
        monday?: string;
        tuesday?: string;
        wednesday?: string;
        thursday?: string;
        friday?: string;
        saturday?: string;
        sunday?: string;
    };
    // Chatbot
    chatbotEnabled: boolean;
    chatbotName?: string;
    chatbotWelcome?: string;
    // ZIP codes for SEO pages
    zipCodes?: string[];
    // Ground truth QA set (for Smokey AI training)
    // If not provided, uses dispensarySlug as the brandId to look up ground truth
    groundTruthBrandId?: string;
}

export type PilotConfig = BrandPilotConfig | DispensaryPilotConfig;

/**
 * Setup a pilot customer (brand or dispensary)
 */
export async function setupPilotCustomer(config: PilotConfig): Promise<PilotSetupResult> {
    try {
        const { auth, firestore } = await createServerClient();

        // Generate IDs
        const slugSafe = config.type === 'brand'
            ? config.brandSlug.toLowerCase().replace(/[^a-z0-9]/g, '_')
            : config.dispensarySlug.toLowerCase().replace(/[^a-z0-9]/g, '_');

        const brandId = `brand_${slugSafe}`;
        const orgId = `org_${slugSafe}`;
        const locationId = config.type === 'dispensary' ? `loc_${slugSafe}` : undefined;

        // 1. Create or find user
        let user;
        try {
            user = await auth.getUserByEmail(config.email);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                user = await auth.createUser({
                    email: config.email,
                    password: config.password,
                    emailVerified: true,
                    displayName: config.type === 'brand' ? config.brandName : config.dispensaryName,
                });
            } else {
                throw error;
            }
        }

        const uid = user.uid;

        // 2. Create Brand document
        const brandData: Record<string, any> = {
            id: brandId,
            name: config.type === 'brand' ? config.brandName : config.dispensaryName,
            slug: config.type === 'brand' ? config.brandSlug : config.dispensarySlug,
            type: config.type,
            description: config.description || '',
            tagline: config.tagline || '',
            website: config.website || '',
            verified: true,
            verificationStatus: 'verified',
            claimStatus: 'claimed',
            ownerId: uid,
            theme: {
                primaryColor: config.primaryColor,
                secondaryColor: config.secondaryColor,
                accentColor: config.type === 'brand' ? (config.accentColor || '#FFFFFF') : '#FFFFFF',
            },
            chatbotConfig: {
                enabled: config.chatbotEnabled,
                botName: config.chatbotName || 'Smokey',
                welcomeMessage: config.chatbotWelcome || `Hey! I'm ${config.chatbotName || 'Smokey'}. How can I help you today?`,
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (config.type === 'brand') {
            brandData.purchaseModel = config.purchaseModel;
            brandData.shipsNationwide = config.shipsNationwide;
            brandData.menuDesign = 'brand';
            if (config.shippingAddress) {
                brandData.shippingAddress = config.shippingAddress;
            }
            brandData.contactEmail = config.contactEmail || config.email;
            brandData.contactPhone = config.contactPhone || '';
        } else {
            // Dispensary specific fields
            brandData.purchaseModel = 'local_pickup';
            brandData.shipsNationwide = false;
            brandData.menuDesign = 'dispensary';
            brandData.location = {
                address: config.address,
                city: config.city,
                state: config.state,
                zip: config.zip,
                phone: config.phone || '',
                coordinates: config.coordinates || null,
            };
            brandData.address = config.address;
            brandData.city = config.city;
            brandData.state = config.state;
            brandData.zip = config.zip;
            brandData.phone = config.phone || '';
            brandData.licenseNumber = config.licenseNumber || '';
            brandData.coordinates = config.coordinates || null;
            brandData.hours = config.hours || {};
            brandData.isRecreational = true;
            brandData.isMedical = false;
            brandData.acceptsCash = true;
            brandData.acceptsDebit = true;
        }

        await firestore.collection('brands').doc(brandId).set(brandData, { merge: true });

        // 3. Create Organization
        await firestore.collection('organizations').doc(orgId).set({
            id: orgId,
            name: config.type === 'brand' ? config.brandName : config.dispensaryName,
            type: config.type,
            ownerId: uid,
            brandId: brandId,
            settings: {
                policyPack: config.type === 'brand' ? 'permissive' : 'balanced',
                allowOverrides: true,
                purchaseModel: config.type === 'brand' ? config.purchaseModel : 'local_pickup',
            },
            billing: {
                subscriptionStatus: 'active',
                planId: 'empire',
                planName: 'Empire (Pilot)',
                monthlyPrice: 0,
                billingCycleStart: new Date().toISOString(),
                features: {
                    maxZips: 1000,
                    maxPlaybooks: 100,
                    maxProducts: 5000,
                    advancedReporting: true,
                    prioritySupport: true,
                    coveragePacksEnabled: true,
                    apiAccess: true,
                    whiteLabel: true,
                }
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        // 4. Create Location (for dispensaries)
        if (config.type === 'dispensary' && locationId) {
            await firestore.collection('locations').doc(locationId).set({
                id: locationId,
                orgId: orgId,
                brandId: brandId,
                name: 'Main Location',
                address: config.address,
                city: config.city,
                state: config.state,
                zip: config.zip,
                phone: config.phone || '',
                coordinates: config.coordinates || null,
                hours: config.hours || {},
                licenseNumber: config.licenseNumber || '',
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        // 5. Create User Profile
        await firestore.collection('users').doc(uid).set({
            uid: uid,
            email: config.email,
            displayName: config.type === 'brand' ? config.brandName : config.dispensaryName,
            role: config.type,
            approvalStatus: 'approved',
            isNewUser: false,
            onboardingCompletedAt: new Date().toISOString(),
            organizationIds: [orgId],
            currentOrgId: orgId,
            brandId: brandId,
            locationId: locationId || null,
            billing: {
                planId: 'empire',
                planName: 'Empire (Pilot)',
                status: 'active',
                monthlyPrice: 0
            },
            permissions: {
                canManageProducts: true,
                canManageOrders: true,
                canManageSettings: true,
                canViewAnalytics: true,
                canManageTeam: true,
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        // 6. Set Custom Claims
        await auth.setCustomUserClaims(uid, {
            role: config.type,
            orgId: orgId,
            brandId: brandId,
            locationId: locationId || null,
            planId: 'empire',
            approvalStatus: 'approved',
        });

        // 7. Revoke old tokens
        await auth.revokeRefreshTokens(uid);

        // 8. Create ZIP code pages for dispensaries
        if (config.type === 'dispensary' && config.zipCodes && config.zipCodes.length > 0) {
            for (const zip of config.zipCodes) {
                const pageId = `zip_${zip}_${slugSafe}`;
                await firestore.collection('zip_pages').doc(pageId).set({
                    id: pageId,
                    zip: zip,
                    brandId: brandId,
                    brandName: config.dispensaryName,
                    brandSlug: config.dispensarySlug,
                    dispensaryId: locationId,
                    title: `Cannabis Dispensary Near ${zip} | ${config.dispensaryName}`,
                    metaDescription: `Find legal cannabis at ${config.dispensaryName}, serving ZIP code ${zip}. Shop flower, edibles, vapes & more.`,
                    h1: `Cannabis Dispensary Serving ${zip}`,
                    city: config.city,
                    state: config.state,
                    address: config.address,
                    phone: config.phone || '',
                    coordinates: config.coordinates || null,
                    status: 'active',
                    verified: true,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });
            }
        }

        const menuUrl = `https://bakedbot.ai/${config.type === 'brand' ? config.brandSlug : config.dispensarySlug}`;

        // Check for ground truth configuration
        // Use groundTruthBrandId if provided, otherwise try the slug
        const groundTruthId = config.groundTruthBrandId ||
            (config.type === 'brand' ? config.brandSlug : config.dispensarySlug);
        const groundTruthConfigured = hasGroundTruth(groundTruthId);
        const groundTruthData = groundTruthConfigured ? getGroundTruthStats(groundTruthId) : null;

        return {
            success: true,
            message: `Pilot customer ${config.type === 'brand' ? config.brandName : config.dispensaryName} created successfully!`,
            data: {
                userId: uid,
                brandId,
                orgId,
                locationId,
                menuUrl,
                groundTruth: {
                    configured: groundTruthConfigured,
                    totalQAPairs: groundTruthData?.totalQAPairs,
                    criticalCount: groundTruthData?.criticalCount,
                    categories: groundTruthData?.categories,
                },
            }
        };

    } catch (error) {
        console.error('Pilot setup error:', error);
        return {
            success: false,
            message: 'Failed to create pilot customer',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Add sample products to a pilot brand/dispensary
 */
export async function addPilotProducts(
    brandId: string,
    products: Array<{
        name: string;
        description?: string;
        category: string;
        price: number;
        brandName?: string;
        thcPercent?: number;
        cbdPercent?: number;
        weight?: string;
        imageUrl?: string;
        featured?: boolean;
    }>
): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        const { firestore } = await createServerClient();

        let count = 0;
        for (const product of products) {
            const productId = `prod_${brandId.replace('brand_', '')}_${product.name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)}_${count}`;

            await firestore.collection('products').doc(productId).set({
                id: productId,
                name: product.name,
                description: product.description || '',
                category: product.category,
                price: product.price,
                brandId: brandId,
                brandName: product.brandName || '',
                vendorBrand: product.brandName || '',
                weight: product.weight || '',
                thcPercent: product.thcPercent || null,
                cbdPercent: product.cbdPercent || null,
                imageUrl: product.imageUrl || '',
                featured: product.featured || false,
                sortOrder: count,
                inStock: true,
                source: 'pilot_setup',
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });

            count++;
        }

        return { success: true, count };
    } catch (error) {
        console.error('Add pilot products error:', error);
        return {
            success: false,
            count: 0,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

export interface ImportedMenuData {
    dispensary: {
        name: string;
        tagline?: string;
        description?: string;
        logoUrl?: string;
        primaryColor?: string;
        secondaryColor?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        hours?: string;
    };
    products: Array<{
        name: string;
        brand?: string;
        category: string;
        price: number | null;
        thcPercent?: number | null;
        cbdPercent?: number | null;
        strainType?: string;
        description?: string;
        imageUrl?: string;
        effects?: string[];
        weight?: string;
    }>;
    promotions?: Array<{
        title: string;
        subtitle?: string;
        description?: string;
    }>;
}

/**
 * Import menu data from a dispensary URL (Weedmaps, Dutchie, etc.)
 * Uses the existing menu import API with Firecrawl
 */
export async function importMenuFromUrl(url: string): Promise<{
    success: boolean;
    data?: ImportedMenuData;
    error?: string;
}> {
    try {
        // Call the internal menu import API
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bakedbot.ai';
        const response = await fetch(`${baseUrl}/api/demo/import-menu`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error || `Failed to import menu: ${response.status}`,
            };
        }

        const result = await response.json();

        if (!result.success || !result.data) {
            return {
                success: false,
                error: result.error || 'No data extracted from URL',
            };
        }

        return {
            success: true,
            data: result.data as ImportedMenuData,
        };
    } catch (error) {
        console.error('Import menu error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Check if a brand has ground truth QA configured for Smokey
 */
export async function checkGroundTruthStatus(brandId: string): Promise<{
    configured: boolean;
    stats?: {
        totalQAPairs: number;
        criticalCount: number;
        highCount: number;
        mediumCount: number;
        categories: string[];
    };
}> {
    if (!hasGroundTruth(brandId)) {
        return { configured: false };
    }

    const stats = getGroundTruthStats(brandId);
    return {
        configured: true,
        stats: stats || undefined,
    };
}

/**
 * List all brands with ground truth configured
 */
export async function listBrandsWithGroundTruth(): Promise<Array<{
    brandId: string;
    dispensary: string;
    version: string;
}>> {
    return listGroundedBrands();
}
