'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import {
    hasGroundTruth,
    getGroundTruthStats,
    listGroundedBrands,
} from '@/server/grounding';
import { PILOT_CUSTOMER_SEGMENTS, THRIVE_SAMPLE_PRODUCTS } from './pilot-setup-constants';

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

        // Use dispensary_ prefix for dispensaries, brand_ for brands
        const orgId = config.type === 'dispensary'
            ? `dispensary_${slugSafe}`
            : `brand_${slugSafe}`;
        const brandId = orgId; // orgId and brandId are now the same
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

// ============================================================================
// PILOT TEST DATA GENERATION
// ============================================================================

import type { CustomerSegment, CustomerProfile } from '@/types/customers';
import type { POSProvider } from '@/lib/pos/types';
import type { Playbook, PlaybookTrigger, PlaybookStep } from '@/types/playbook';
import { logger } from '@/lib/logger';

/**
 * POS Configuration for pilot setup
 */
export interface PilotPOSConfig {
    provider: POSProvider;
    apiKey?: string;
    storeId: string;
    locationId?: string;  // For ALLeaves
    partnerId?: string;   // For ALLeaves
    environment?: 'sandbox' | 'production';
    // ALLeaves JWT authentication fields
    username?: string;    // ALLeaves username (email)
    password?: string;    // ALLeaves password
    pin?: string;         // ALLeaves PIN (may be required)
}

/**
 * Email Marketing Configuration for pilot setup
 */
export interface PilotEmailConfig {
    provider: 'mailjet';
    senderEmail: string;
    senderName: string;
    replyToEmail?: string;
    enableWelcomePlaybook: boolean;
    enableWinbackPlaybook: boolean;
    enableVIPPlaybook: boolean;
}

/**
 * Result type for test customer creation
 */
export interface CreateTestCustomersResult {
    success: boolean;
    created: number;
    customers: Array<{
        id: string;
        email: string;
        segment: CustomerSegment;
        firstName: string;
        lastName: string;
    }>;
    error?: string;
}

/**
 * Create test customers for each segment
 */
export async function createPilotTestCustomers(
    orgId: string,
    brandId: string,
    options?: {
        emailDomain?: string;  // Override @bakedbot.ai with custom domain
    }
): Promise<CreateTestCustomersResult> {
    try {
        const { firestore } = await createServerClient();
        const customers: CreateTestCustomersResult['customers'] = [];
        const emailDomain = options?.emailDomain;

        for (const segmentData of PILOT_CUSTOMER_SEGMENTS) {
            const email = emailDomain
                ? segmentData.email.replace('@bakedbot.ai', `@${emailDomain}`)
                : segmentData.email;

            const customerId = `cust_${brandId.replace('brand_', '')}_${segmentData.segment}`;

            // Calculate dates based on behavior profile
            const now = new Date();
            const lastOrderDate = new Date(now.getTime() - segmentData.behaviorProfile.daysSinceLastOrder * 24 * 60 * 60 * 1000);
            const firstOrderDate = new Date(now.getTime() - segmentData.behaviorProfile.daysSinceFirstOrder * 24 * 60 * 60 * 1000);

            const customerDoc: Partial<CustomerProfile> = {
                id: customerId,
                orgId: orgId,
                email: email,
                firstName: segmentData.firstName,
                lastName: segmentData.lastName,
                displayName: `${segmentData.firstName} ${segmentData.lastName}`,
                segment: segmentData.segment,
                totalSpent: segmentData.behaviorProfile.totalSpent,
                orderCount: segmentData.behaviorProfile.orderCount,
                avgOrderValue: segmentData.behaviorProfile.avgOrderValue,
                lastOrderDate: lastOrderDate,
                firstOrderDate: firstOrderDate,
                daysSinceLastOrder: segmentData.behaviorProfile.daysSinceLastOrder,
                priceRange: segmentData.behaviorProfile.priceRange,
                lifetimeValue: segmentData.behaviorProfile.totalSpent,
                tier: segmentData.segment === 'vip' ? 'platinum' :
                      segmentData.segment === 'high_value' ? 'gold' :
                      segmentData.segment === 'loyal' ? 'silver' : 'bronze',
                points: Math.floor(segmentData.behaviorProfile.totalSpent * 10),  // 10 points per dollar
                source: 'manual',
                preferredCategories: [],
                preferredProducts: [],
                customTags: ['pilot_test', segmentData.segment],
                createdAt: firstOrderDate,
                updatedAt: now,
            };

            await firestore.collection('customers').doc(customerId).set({
                ...customerDoc,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });

            customers.push({
                id: customerId,
                email: email,
                segment: segmentData.segment,
                firstName: segmentData.firstName,
                lastName: segmentData.lastName,
            });

            logger.info(`[PILOT] Created test customer: ${email} (${segmentData.segment})`);
        }

        return {
            success: true,
            created: customers.length,
            customers,
        };
    } catch (error) {
        logger.error('[PILOT] Failed to create test customers', { error });
        return {
            success: false,
            created: 0,
            customers: [],
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Result type for sample orders creation
 */
export interface CreateSampleOrdersResult {
    success: boolean;
    created: number;
    orders: Array<{
        id: string;
        customerId: string;
        customerEmail: string;
        total: number;
        itemCount: number;
        createdAt: Date;
    }>;
    error?: string;
}

/**
 * Create sample orders for pilot test customers
 * Orders are generated based on customer segment behavior profiles
 */
export async function createPilotSampleOrders(
    orgId: string,
    brandId: string,
    options?: {
        useRealMenu?: boolean;  // Fetch from existing products instead of sample data
    }
): Promise<CreateSampleOrdersResult> {
    try {
        const { firestore } = await createServerClient();
        const orders: CreateSampleOrdersResult['orders'] = [];

        // Get products to use for orders
        let products = THRIVE_SAMPLE_PRODUCTS;
        if (options?.useRealMenu) {
            const productSnapshot = await firestore
                .collection('products')
                .where('brandId', '==', brandId)
                .limit(50)
                .get();

            if (!productSnapshot.empty) {
                products = productSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        name: data.name,
                        category: data.category,
                        price: data.price || 0,
                        brandName: data.brandName || data.vendorBrand || '',
                        thcPercent: data.thcPercent || null,
                        weight: data.weight || '',
                        strainType: data.strainType || 'hybrid',
                    };
                });
            }
        }

        // Get test customers
        const customersSnapshot = await firestore
            .collection('customers')
            .where('orgId', '==', orgId)
            .where('customTags', 'array-contains', 'pilot_test')
            .get();

        if (customersSnapshot.empty) {
            return {
                success: false,
                created: 0,
                orders: [],
                error: 'No pilot test customers found. Create test customers first.',
            };
        }

        // Create orders for each customer based on their behavior profile
        for (const customerDoc of customersSnapshot.docs) {
            const customer = customerDoc.data() as CustomerProfile;
            const segmentConfig = PILOT_CUSTOMER_SEGMENTS.find(s => s.segment === customer.segment);

            if (!segmentConfig) continue;

            const orderCount = segmentConfig.behaviorProfile.orderCount;
            const avgOrderValue = segmentConfig.behaviorProfile.avgOrderValue;
            const daysSinceFirst = segmentConfig.behaviorProfile.daysSinceFirstOrder;
            const daysSinceLast = segmentConfig.behaviorProfile.daysSinceLastOrder;

            // Generate orders spread across the customer's history
            for (let i = 0; i < Math.min(orderCount, 5); i++) { // Cap at 5 sample orders per customer
                // Calculate order date spread between first and last order
                const daysAgo = daysSinceLast + Math.floor((daysSinceFirst - daysSinceLast) * (i / Math.max(orderCount - 1, 1)));
                const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

                // Select random products to match approximate order value
                const orderItems: Array<{ product: typeof products[0]; quantity: number }> = [];
                let currentTotal = 0;
                const targetTotal = avgOrderValue * (0.8 + Math.random() * 0.4); // ±20% variance

                while (currentTotal < targetTotal && orderItems.length < 5) {
                    const product = products[Math.floor(Math.random() * products.length)];
                    const quantity = Math.ceil(Math.random() * 2);
                    orderItems.push({ product, quantity });
                    currentTotal += product.price * quantity;
                }

                const orderId = `order_${brandId.replace('brand_', '')}_${customer.segment}_${i}_${Date.now()}`;
                const subtotal = orderItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
                const tax = Math.round(subtotal * 0.08 * 100) / 100;  // 8% tax
                const total = subtotal + tax;

                const orderDoc = {
                    id: orderId,
                    orgId: orgId,
                    brandId: brandId,
                    customerId: customer.id,
                    customerEmail: customer.email,
                    customerName: `${customer.firstName} ${customer.lastName}`,
                    items: orderItems.map(item => ({
                        productName: item.product.name,
                        productCategory: item.product.category,
                        brandName: item.product.brandName,
                        quantity: item.quantity,
                        unitPrice: item.product.price,
                        total: item.product.price * item.quantity,
                    })),
                    subtotal: subtotal,
                    tax: tax,
                    discount: 0,
                    total: total,
                    status: 'completed',
                    paymentMethod: Math.random() > 0.3 ? 'debit' : 'cash',
                    source: 'pilot_test',
                    notes: `Pilot test order for ${customer.segment} segment`,
                    createdAt: orderDate,
                    updatedAt: orderDate,
                    completedAt: orderDate,
                };

                await firestore.collection('orders').doc(orderId).set(orderDoc);

                orders.push({
                    id: orderId,
                    customerId: customer.id,
                    customerEmail: customer.email,
                    total: total,
                    itemCount: orderItems.length,
                    createdAt: orderDate,
                });
            }

            logger.info(`[PILOT] Created sample orders for ${customer.email}`, {
                segment: customer.segment,
                orderCount: Math.min(orderCount, 5),
            });
        }

        return {
            success: true,
            created: orders.length,
            orders,
        };
    } catch (error) {
        logger.error('[PILOT] Failed to create sample orders', { error });
        return {
            success: false,
            created: 0,
            orders: [],
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Create welcome email playbook for Mrs. Parker
 */
export async function createWelcomeEmailPlaybook(
    orgId: string,
    brandId: string,
    config: PilotEmailConfig
): Promise<{ success: boolean; playbookId?: string; error?: string }> {
    try {
        const { firestore } = await createServerClient();

        const playbookId = `playbook_${brandId.replace('brand_', '')}_welcome`;

        const welcomePlaybook: Partial<Playbook> = {
            id: playbookId,
            name: 'Personalized Welcome Email',
            description: 'Send personalized welcome email to new customers via Mrs. Parker and Mailjet',
            status: 'active',
            agent: 'mrs_parker',
            category: 'marketing',
            icon: 'Mail',
            yaml: `name: Personalized Welcome Email
description: Send personalized welcome email when new customer is created

triggers:
  - type: event
    eventName: customer.created

steps:
  - action: generate
    agent: mrs_parker
    task: Generate personalized welcome email based on customer segment
    params:
      tone: friendly
      includeFirstPurchaseOffer: true

  - action: send_email
    provider: mailjet
    from:
      email: "${config.senderEmail}"
      name: "${config.senderName}"
    to: "{{customer.email}}"
    subject: "Welcome to the family, {{customer.firstName}}! 🌿"
    body: "{{mrs_parker.email_content}}"

  - action: log
    message: "Welcome email sent to {{customer.email}}"
`,
            triggers: [
                {
                    type: 'event',
                    eventName: 'customer.created',
                    enabled: true,
                } as PlaybookTrigger,
            ],
            steps: [
                {
                    action: 'generate',
                    params: {
                        agent: 'mrs_parker',
                        task: 'Generate personalized welcome email',
                        tone: 'friendly',
                        includeFirstPurchaseOffer: true,
                    },
                    label: 'Generate welcome content',
                } as PlaybookStep,
                {
                    action: 'send_email',
                    params: {
                        provider: 'mailjet',
                        from: {
                            email: config.senderEmail,
                            name: config.senderName,
                        },
                    },
                    label: 'Send welcome email',
                } as PlaybookStep,
            ],
            isCustom: false,
            templateId: 'welcome_email_template',
            requiresApproval: false,
            runCount: 0,
            successCount: 0,
            failureCount: 0,
            version: 1,
            ownerId: 'system',
            orgId: orgId,
            createdBy: 'pilot_setup',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await firestore.collection('playbooks').doc(playbookId).set(welcomePlaybook, { merge: true });

        logger.info(`[PILOT] Created welcome email playbook: ${playbookId}`);

        return { success: true, playbookId };
    } catch (error) {
        logger.error('[PILOT] Failed to create welcome playbook', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Create win-back email playbook for at-risk/churned customers
 */
export async function createWinbackEmailPlaybook(
    orgId: string,
    brandId: string,
    config: PilotEmailConfig
): Promise<{ success: boolean; playbookId?: string; error?: string }> {
    try {
        const { firestore } = await createServerClient();

        const playbookId = `playbook_${brandId.replace('brand_', '')}_winback`;

        const winbackPlaybook: Partial<Playbook> = {
            id: playbookId,
            name: 'Win-Back Campaign',
            description: 'Re-engage at-risk and churned customers with personalized offers',
            status: 'active',
            agent: 'craig',
            category: 'marketing',
            icon: 'Heart',
            yaml: `name: Win-Back Campaign
description: Re-engage customers who haven't ordered in 30+ days

triggers:
  - type: schedule
    cron: "0 10 * * 1"  # Every Monday at 10 AM
  - type: event
    eventName: customer.segment.changed
    condition: "segment in ['at_risk', 'slipping', 'churned']"

steps:
  - action: query
    agent: pops
    task: Get customers in at_risk, slipping, or churned segments

  - action: generate
    agent: craig
    input: "{{pops.customers}}"
    task: Generate personalized win-back emails with special offers
    params:
      offerType: discount
      discountPercent: 15

  - action: review
    agent: deebo
    input: "{{craig.emails}}"
    task: Check win-back content for compliance

  - action: send_email
    provider: mailjet
    from:
      email: "${config.senderEmail}"
      name: "${config.senderName}"
    batch: true
    emails: "{{craig.emails}}"

  - action: log
    message: "Win-back campaign sent to {{craig.emails.length}} customers"
`,
            triggers: [
                {
                    type: 'schedule',
                    cron: '0 10 * * 1',
                    timezone: 'America/New_York',
                    enabled: true,
                } as PlaybookTrigger,
                {
                    type: 'event',
                    eventName: 'customer.segment.changed',
                    enabled: true,
                } as PlaybookTrigger,
            ],
            steps: [
                {
                    action: 'query',
                    params: { agent: 'pops', segments: ['at_risk', 'slipping', 'churned'] },
                    label: 'Find at-risk customers',
                } as PlaybookStep,
                {
                    action: 'generate',
                    params: { agent: 'craig', offerType: 'discount', discountPercent: 15 },
                    label: 'Generate win-back content',
                } as PlaybookStep,
                {
                    action: 'review',
                    params: { agent: 'deebo' },
                    label: 'Compliance review',
                } as PlaybookStep,
                {
                    action: 'send_email',
                    params: { provider: 'mailjet', batch: true },
                    label: 'Send win-back emails',
                } as PlaybookStep,
            ],
            isCustom: false,
            templateId: 'winback_campaign_template',
            requiresApproval: true,  // Requires approval before sending
            runCount: 0,
            successCount: 0,
            failureCount: 0,
            version: 1,
            ownerId: 'system',
            orgId: orgId,
            createdBy: 'pilot_setup',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await firestore.collection('playbooks').doc(playbookId).set(winbackPlaybook, { merge: true });

        logger.info(`[PILOT] Created win-back email playbook: ${playbookId}`);

        return { success: true, playbookId };
    } catch (error) {
        logger.error('[PILOT] Failed to create win-back playbook', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Create VIP appreciation playbook
 */
export async function createVIPPlaybook(
    orgId: string,
    brandId: string,
    config: PilotEmailConfig
): Promise<{ success: boolean; playbookId?: string; error?: string }> {
    try {
        const { firestore } = await createServerClient();

        const playbookId = `playbook_${brandId.replace('brand_', '')}_vip`;

        const vipPlaybook: Partial<Playbook> = {
            id: playbookId,
            name: 'VIP Appreciation',
            description: 'Send exclusive offers and early access to VIP customers',
            status: 'active',
            agent: 'mrs_parker',
            category: 'marketing',
            icon: 'Crown',
            yaml: `name: VIP Appreciation
description: Reward VIP customers with exclusive offers

triggers:
  - type: event
    eventName: customer.became.vip
  - type: schedule
    cron: "0 9 1 * *"  # 1st of each month at 9 AM

steps:
  - action: query
    agent: pops
    task: Get VIP customers and their purchase history

  - action: generate
    agent: mrs_parker
    input: "{{pops.vip_customers}}"
    task: Generate personalized VIP appreciation emails with exclusive offers
    params:
      offerType: early_access
      includePersonalizedRecommendations: true

  - action: send_email
    provider: mailjet
    from:
      email: "${config.senderEmail}"
      name: "${config.senderName}"
    batch: true
    emails: "{{mrs_parker.emails}}"

  - action: log
    message: "VIP appreciation sent to {{mrs_parker.emails.length}} customers"
`,
            triggers: [
                {
                    type: 'event',
                    eventName: 'customer.became.vip',
                    enabled: true,
                } as PlaybookTrigger,
                {
                    type: 'schedule',
                    cron: '0 9 1 * *',
                    timezone: 'America/New_York',
                    enabled: true,
                } as PlaybookTrigger,
            ],
            steps: [
                {
                    action: 'query',
                    params: { agent: 'pops', segment: 'vip' },
                    label: 'Get VIP customers',
                } as PlaybookStep,
                {
                    action: 'generate',
                    params: {
                        agent: 'mrs_parker',
                        offerType: 'early_access',
                        includePersonalizedRecommendations: true,
                    },
                    label: 'Generate VIP content',
                } as PlaybookStep,
                {
                    action: 'send_email',
                    params: { provider: 'mailjet', batch: true },
                    label: 'Send VIP emails',
                } as PlaybookStep,
            ],
            isCustom: false,
            templateId: 'vip_appreciation_template',
            requiresApproval: false,
            runCount: 0,
            successCount: 0,
            failureCount: 0,
            version: 1,
            ownerId: 'system',
            orgId: orgId,
            createdBy: 'pilot_setup',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await firestore.collection('playbooks').doc(playbookId).set(vipPlaybook, { merge: true });

        logger.info(`[PILOT] Created VIP playbook: ${playbookId}`);

        return { success: true, playbookId };
    } catch (error) {
        logger.error('[PILOT] Failed to create VIP playbook', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Configure POS integration for pilot
 */
export async function configurePilotPOS(
    orgId: string,
    brandId: string,
    posConfig: PilotPOSConfig
): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();

        // Build posConfig data based on provider
        const posConfigData: Record<string, unknown> = {
            provider: posConfig.provider,
            storeId: posConfig.storeId,
            locationId: posConfig.locationId || posConfig.storeId,
            partnerId: posConfig.partnerId || null,
            environment: posConfig.environment || 'production',
            status: 'active',
            updatedAt: new Date(),
        };

        // Add Alleaves-specific JWT credentials
        if (posConfig.provider === 'alleaves') {
            posConfigData.username = posConfig.username || process.env.ALLEAVES_USERNAME || null;
            posConfigData.password = posConfig.password || process.env.ALLEAVES_PASSWORD || null;
            posConfigData.pin = posConfig.pin || process.env.ALLEAVES_PIN || null;
        }

        // Add API key for Dutchie/other providers
        if (posConfig.apiKey) {
            posConfigData.apiKey = posConfig.apiKey;
        }

        // Store POS configuration in integrations collection (legacy)
        await firestore.collection('integrations').doc(`pos_${orgId}`).set({
            orgId: orgId,
            brandId: brandId,
            type: 'pos',
            provider: posConfig.provider,
            config: posConfigData,
            status: 'configured',
            lastSyncAt: null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        // IMPORTANT: Also update the location's posConfig (source of truth for menu sync)
        const locationsSnap = await firestore.collection('locations')
            .where('orgId', '==', orgId)
            .limit(1)
            .get();

        if (!locationsSnap.empty) {
            const locationDoc = locationsSnap.docs[0];
            await locationDoc.ref.update({
                posConfig: posConfigData,
                updatedAt: FieldValue.serverTimestamp(),
            });
            logger.info(`[PILOT] Updated location posConfig: ${locationDoc.id}`);
        } else {
            // Create location if it doesn't exist (for dispensary pilots)
            const locationId = `loc_${brandId.replace('dispensary_', '').replace('brand_', '')}`;
            await firestore.collection('locations').doc(locationId).set({
                id: locationId,
                orgId: orgId,
                brandId: brandId,
                name: 'Main Location',
                posConfig: posConfigData,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            logger.info(`[PILOT] Created location with posConfig: ${locationId}`);
        }

        // Update brand with POS info
        await firestore.collection('brands').doc(brandId).update({
            posProvider: posConfig.provider,
            posStoreId: posConfig.storeId,
            posConfigured: true,
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info(`[PILOT] Configured POS for ${brandId}`, {
            provider: posConfig.provider,
            storeId: posConfig.storeId,
        });

        return { success: true };
    } catch (error) {
        logger.error('[PILOT] Failed to configure POS', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Flush all pilot test data for an organization
 * Use this before connecting live POS or going to production
 */
export interface FlushPilotDataResult {
    success: boolean;
    deleted: {
        customers: number;
        orders: number;
        playbooks: number;
        products: number;
    };
    error?: string;
}

export async function flushPilotData(
    orgId: string,
    brandId: string,
    options?: {
        deleteProducts?: boolean;     // Default: false (keep imported products)
        deletePlaybooks?: boolean;    // Default: false (keep playbooks)
        confirmPhrase?: string;       // Must match "FLUSH PILOT DATA" for safety
    }
): Promise<FlushPilotDataResult> {
    try {
        // Safety check
        if (options?.confirmPhrase !== 'FLUSH PILOT DATA') {
            return {
                success: false,
                deleted: { customers: 0, orders: 0, playbooks: 0, products: 0 },
                error: 'Safety confirmation phrase required. Pass confirmPhrase: "FLUSH PILOT DATA"',
            };
        }

        const { firestore } = await createServerClient();
        const deleted = { customers: 0, orders: 0, playbooks: 0, products: 0 };
        const batch = firestore.batch();

        // Delete pilot test customers
        const customersSnapshot = await firestore
            .collection('customers')
            .where('orgId', '==', orgId)
            .where('customTags', 'array-contains', 'pilot_test')
            .get();

        for (const doc of customersSnapshot.docs) {
            batch.delete(doc.ref);
            deleted.customers++;
        }

        // Delete pilot test orders
        const ordersSnapshot = await firestore
            .collection('orders')
            .where('orgId', '==', orgId)
            .where('source', '==', 'pilot_test')
            .get();

        for (const doc of ordersSnapshot.docs) {
            batch.delete(doc.ref);
            deleted.orders++;
        }

        // Optionally delete pilot playbooks
        if (options?.deletePlaybooks) {
            const playbooksSnapshot = await firestore
                .collection('playbooks')
                .where('orgId', '==', orgId)
                .where('createdBy', '==', 'pilot_setup')
                .get();

            for (const doc of playbooksSnapshot.docs) {
                batch.delete(doc.ref);
                deleted.playbooks++;
            }
        }

        // Optionally delete pilot products
        if (options?.deleteProducts) {
            const productsSnapshot = await firestore
                .collection('products')
                .where('brandId', '==', brandId)
                .where('source', '==', 'pilot_setup')
                .get();

            for (const doc of productsSnapshot.docs) {
                batch.delete(doc.ref);
                deleted.products++;
            }
        }

        await batch.commit();

        logger.info(`[PILOT] Flushed pilot data for ${orgId}`, deleted);

        return {
            success: true,
            deleted,
        };
    } catch (error) {
        logger.error('[PILOT] Failed to flush pilot data', { error });
        return {
            success: false,
            deleted: { customers: 0, orders: 0, playbooks: 0, products: 0 },
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Full pilot setup including customers, orders, email marketing, and POS
 * This is the main entry point for setting up a complete pilot environment
 */
export interface FullPilotSetupOptions {
    pilot: PilotConfig;
    pos?: PilotPOSConfig;
    email?: PilotEmailConfig;
    createTestCustomers?: boolean;
    createSampleOrders?: boolean;
    importProducts?: {
        url?: string;  // Import from URL
        useSampleProducts?: boolean;  // Use sample Thrive products
    };
    /** Enable Competitive Intelligence Playbook (auto-creates "their own Ezal") */
    enableCompetitiveIntel?: boolean;
    /** Competitive Intel configuration */
    competitiveIntel?: {
        scheduleFrequency?: 'daily' | 'weekly' | 'monthly';
        maxUrls?: number;
        watchlistUrls?: string[];  // Specific competitor URLs to always track
    };
}

export interface FullPilotSetupResult {
    success: boolean;
    pilot: PilotSetupResult;
    testCustomers?: CreateTestCustomersResult;
    sampleOrders?: CreateSampleOrdersResult;
    playbooks?: {
        welcome?: string;
        winback?: string;
        vip?: string;
        competitive_intel?: string;  // "Their own Ezal"
    };
    pos?: { configured: boolean };
    errors: string[];
}

export async function setupFullPilot(options: FullPilotSetupOptions): Promise<FullPilotSetupResult> {
    const result: FullPilotSetupResult = {
        success: false,
        pilot: { success: false, message: '' },
        errors: [],
    };

    try {
        // 1. Create pilot customer (brand/dispensary, user, org)
        logger.info('[PILOT] Starting full pilot setup...');
        result.pilot = await setupPilotCustomer(options.pilot);

        if (!result.pilot.success || !result.pilot.data) {
            result.errors.push(result.pilot.error || 'Failed to create pilot customer');
            return result;
        }

        const { orgId, brandId } = result.pilot.data;

        // 2. Import or create sample products
        if (options.importProducts?.url) {
            const importResult = await importMenuFromUrl(options.importProducts.url);
            if (importResult.success && importResult.data?.products) {
                await addPilotProducts(brandId, importResult.data.products.map(p => ({
                    name: p.name,
                    description: p.description,
                    category: p.category,
                    price: p.price || 0,
                    brandName: p.brand,
                    thcPercent: p.thcPercent || undefined,
                    weight: p.weight,
                })));
            } else {
                result.errors.push(`Product import failed: ${importResult.error}`);
            }
        } else if (options.importProducts?.useSampleProducts) {
            await addPilotProducts(brandId, THRIVE_SAMPLE_PRODUCTS.map(p => ({
                name: p.name,
                category: p.category,
                price: p.price,
                brandName: p.brandName,
                thcPercent: p.thcPercent || undefined,
                weight: p.weight,
            })));
        }

        // 3. Create test customers
        if (options.createTestCustomers) {
            result.testCustomers = await createPilotTestCustomers(orgId, brandId);
            if (!result.testCustomers.success) {
                result.errors.push(`Test customers: ${result.testCustomers.error}`);
            }
        }

        // 4. Create sample orders
        if (options.createSampleOrders && options.createTestCustomers) {
            result.sampleOrders = await createPilotSampleOrders(orgId, brandId);
            if (!result.sampleOrders.success) {
                result.errors.push(`Sample orders: ${result.sampleOrders.error}`);
            }
        }

        // 5. Setup email marketing playbooks
        if (options.email) {
            result.playbooks = {};

            if (options.email.enableWelcomePlaybook) {
                const welcomeResult = await createWelcomeEmailPlaybook(orgId, brandId, options.email);
                if (welcomeResult.success) {
                    result.playbooks.welcome = welcomeResult.playbookId;
                } else {
                    result.errors.push(`Welcome playbook: ${welcomeResult.error}`);
                }
            }

            if (options.email.enableWinbackPlaybook) {
                const winbackResult = await createWinbackEmailPlaybook(orgId, brandId, options.email);
                if (winbackResult.success) {
                    result.playbooks.winback = winbackResult.playbookId;
                } else {
                    result.errors.push(`Winback playbook: ${winbackResult.error}`);
                }
            }

            if (options.email.enableVIPPlaybook) {
                const vipResult = await createVIPPlaybook(orgId, brandId, options.email);
                if (vipResult.success) {
                    result.playbooks.vip = vipResult.playbookId;
                } else {
                    result.errors.push(`VIP playbook: ${vipResult.error}`);
                }
            }
        }

        // 6. Configure POS
        if (options.pos) {
            const posResult = await configurePilotPOS(orgId, brandId, options.pos);
            result.pos = { configured: posResult.success };
            if (!posResult.success) {
                result.errors.push(`POS config: ${posResult.error}`);
            }
        }

        // 7. Create Competitive Intelligence Playbook ("Their own Ezal")
        // Auto-enabled by default for all new signups
        if (options.enableCompetitiveIntel !== false) {
            if (!result.playbooks) result.playbooks = {};

            const ciConfig: CompetitiveIntelPlaybookConfig = {
                brandName: options.pilot.type === 'brand'
                    ? options.pilot.brandName
                    : options.pilot.dispensaryName,
                brandType: options.pilot.type,
                city: options.pilot.type === 'dispensary' ? options.pilot.city : undefined,
                state: options.pilot.type === 'dispensary' ? options.pilot.state : undefined,
                scheduleFrequency: options.competitiveIntel?.scheduleFrequency || 'weekly',
                maxUrls: options.competitiveIntel?.maxUrls || 10,
                watchlistUrls: options.competitiveIntel?.watchlistUrls,
                reportEmail: options.pilot.email,
            };

            const ciResult = await createCompetitiveIntelPlaybook(orgId, brandId, ciConfig);
            if (ciResult.success) {
                result.playbooks.competitive_intel = ciResult.playbookId;
                logger.info(`[PILOT] Created "their own Ezal" for ${ciConfig.brandName}`);
            } else {
                result.errors.push(`Competitive Intel playbook: ${ciResult.error}`);
            }
        }

        result.success = result.errors.length === 0;
        logger.info('[PILOT] Full pilot setup complete', {
            success: result.success,
            errorCount: result.errors.length,
        });

        return result;
    } catch (error) {
        logger.error('[PILOT] Full pilot setup failed', { error });
        result.errors.push(error instanceof Error ? error.message : String(error));
        return result;
    }
}

// ============================================================================
// COMPETITIVE INTELLIGENCE PLAYBOOK (AUTO-CREATED ON SIGNUP)
// ============================================================================

/**
 * Configuration for Competitive Intelligence Playbook
 */
export interface CompetitiveIntelPlaybookConfig {
    /** City for local competitor search (dispensaries) */
    city?: string;
    /** State for regional search */
    state?: string;
    /** Brand/dispensary name for the report */
    brandName: string;
    /** Brand type for tailoring search queries */
    brandType: 'brand' | 'dispensary';
    /** How often to run the scan */
    scheduleFrequency: 'daily' | 'weekly' | 'monthly';
    /** Max competitor URLs to scan per run */
    maxUrls?: number;
    /** Email to send reports to */
    reportEmail?: string;
    /** Additional competitor URLs to always include */
    watchlistUrls?: string[];
}

/**
 * Create Competitive Intelligence Playbook for a brand/dispensary
 *
 * This gives each customer "their own Ezal" - automated competitive intel
 * that runs on a schedule and delivers actionable insights.
 *
 * @example
 * ```typescript
 * await createCompetitiveIntelPlaybook(orgId, brandId, {
 *   brandName: 'Thrive Syracuse',
 *   brandType: 'dispensary',
 *   city: 'Syracuse',
 *   state: 'NY',
 *   scheduleFrequency: 'weekly',
 * });
 * ```
 */
export async function createCompetitiveIntelPlaybook(
    orgId: string,
    brandId: string,
    config: CompetitiveIntelPlaybookConfig
): Promise<{ success: boolean; playbookId?: string; error?: string }> {
    try {
        const { firestore } = await createServerClient();

        const playbookId = `playbook_${brandId.replace('brand_', '').replace('dispensary_', '')}_competitive_intel`;

        // Build search query based on brand type
        const searchQuery = config.brandType === 'dispensary'
            ? `${config.city || ''} ${config.state || ''} cannabis dispensary menu prices`.trim()
            : `${config.brandName} cannabis brand competitors ${config.state || ''}`.trim();

        // Schedule based on frequency
        const cronSchedule = {
            daily: '0 8 * * *',      // Every day at 8 AM
            weekly: '0 8 * * 1',      // Every Monday at 8 AM
            monthly: '0 8 1 * *',     // 1st of each month at 8 AM
        }[config.scheduleFrequency];

        const competitiveIntelPlaybook: Partial<Playbook> = {
            id: playbookId,
            name: 'Competitive Intelligence Report',
            description: `Automated competitor monitoring powered by Ezal. Your personal competitive intelligence agent tracks local competitors, monitors pricing, and delivers actionable insights.`,
            status: 'active',
            agent: 'ezal',
            category: 'intelligence',
            icon: 'Eye',
            yaml: `name: Competitive Intelligence Report
description: Automated competitor monitoring powered by Ezal

triggers:
  - type: schedule
    cron: "${cronSchedule}"
    timezone: America/New_York
  - type: event
    eventName: manual.competitive.scan

config:
  brandName: "${config.brandName}"
  brandType: "${config.brandType}"
  searchQuery: "${searchQuery}"
  maxUrls: ${config.maxUrls || 10}
  ${config.watchlistUrls?.length ? `watchlistUrls:\n${config.watchlistUrls.map(u => `    - ${u}`).join('\n')}` : ''}

steps:
  - action: ezal_pipeline
    agent: ezal
    task: Run competitive intelligence scan
    params:
      query: "${searchQuery}"
      maxUrls: ${config.maxUrls || 10}
      ${config.watchlistUrls?.length ? `manualUrls: ${JSON.stringify(config.watchlistUrls)}` : ''}

  - action: analyze
    agent: ezal
    task: Generate competitive intelligence report
    params:
      compareWithOwnPrices: true
      includeMarketTrends: true
      highlightOpportunities: true

  ${config.reportEmail ? `- action: send_email
    provider: mailjet
    to: "${config.reportEmail}"
    subject: "Weekly Competitive Intel: ${config.brandName}"
    template: competitive_intel_report` : ''}

  - action: save_to_dashboard
    task: Store report for dashboard viewing
    params:
      collection: competitive_intel_reports
      retention_days: 90
`,
            triggers: [
                {
                    type: 'schedule',
                    cron: cronSchedule,
                    timezone: 'America/New_York',
                    enabled: true,
                } as PlaybookTrigger,
                {
                    type: 'event',
                    eventName: 'manual.competitive.scan',
                    enabled: true,
                } as PlaybookTrigger,
            ],
            steps: [
                {
                    action: 'ezal_pipeline',
                    params: {
                        query: searchQuery,
                        maxUrls: config.maxUrls || 10,
                        manualUrls: config.watchlistUrls || [],
                    },
                    label: 'Run Ezal competitive scan',
                } as PlaybookStep,
                {
                    action: 'analyze',
                    params: {
                        agent: 'ezal',
                        compareWithOwnPrices: true,
                        includeMarketTrends: true,
                    },
                    label: 'Generate insights report',
                } as PlaybookStep,
                {
                    action: 'save_to_dashboard',
                    params: {
                        collection: 'competitive_intel_reports',
                        retentionDays: 90,
                    },
                    label: 'Save report to dashboard',
                } as PlaybookStep,
            ],
            isCustom: false,
            templateId: 'competitive_intel_template',
            requiresApproval: false,
            runCount: 0,
            successCount: 0,
            failureCount: 0,
            version: 1,
            ownerId: 'system',
            orgId: orgId,
            createdBy: 'pilot_setup',
            metadata: {
                brandName: config.brandName,
                brandType: config.brandType,
                city: config.city,
                state: config.state,
                searchQuery: searchQuery,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await firestore.collection('playbooks').doc(playbookId).set(competitiveIntelPlaybook, { merge: true });

        logger.info(`[PILOT] Created Competitive Intelligence playbook: ${playbookId}`, {
            brandName: config.brandName,
            schedule: config.scheduleFrequency,
        });

        return { success: true, playbookId };
    } catch (error) {
        logger.error('[PILOT] Failed to create Competitive Intelligence playbook', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Run a one-time competitive intelligence scan (manual trigger)
 */
export async function runCompetitiveIntelScan(
    orgId: string,
    brandId: string,
    options?: {
        query?: string;
        manualUrls?: string[];
        maxUrls?: number;
    }
): Promise<{
    success: boolean;
    requestId?: string;
    urlsFound?: number;
    productsScraped?: number;
    insightsGenerated?: number;
    error?: string;
}> {
    try {
        // Dynamic import to avoid circular deps
        const { runEzalPipeline } = await import('@/server/agents/ezal-team');

        const result = await runEzalPipeline({
            tenantId: brandId,
            query: options?.query || `cannabis dispensary competitor pricing`,
            manualUrls: options?.manualUrls,
            maxUrls: options?.maxUrls || 10,
        });

        if (result.errors.length > 0) {
            logger.warn('[CI_SCAN] Pipeline completed with errors', {
                requestId: result.requestId,
                errors: result.errors,
            });
        }

        return {
            success: result.stage === 'complete',
            requestId: result.requestId,
            urlsFound: result.finderResult?.urls.length || 0,
            productsScraped: result.scraperResult?.totalProducts || 0,
            insightsGenerated: result.analyzerResult?.insights.length || 0,
            error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
        };
    } catch (error) {
        logger.error('[CI_SCAN] Manual scan failed', { error, orgId, brandId });
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
