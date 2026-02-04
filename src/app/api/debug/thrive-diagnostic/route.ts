/**
 * Diagnostic endpoint for Thrive Syracuse integration
 *
 * Checks:
 * 1. User claims (orgId, brandId, locationId, role)
 * 2. Location document in Firestore
 * 3. Brand document in Firestore
 * 4. Tenant products in publicViews
 * 5. POS config and Alleaves connection
 *
 * Access: GET /api/debug/thrive-diagnostic
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';

export const maxDuration = 60;

interface DiagnosticResult {
    timestamp: string;
    user: {
        uid: string;
        email: string;
        role: string;
        orgId: string | null;
        currentOrgId: string | null;
        brandId: string | null;
        locationId: string | null;
        customClaims: Record<string, unknown>;
    };
    location: {
        found: boolean;
        docId: string | null;
        orgId: string | null;
        brandId: string | null;
        name: string | null;
        posConfig: {
            provider: string | null;
            status: string | null;
            hasUsername: boolean;
            hasPassword: boolean;
            hasPin: boolean;
            locationId: string | null;
            storeId: string | null;
        } | null;
    };
    brand: {
        found: boolean;
        docId: string | null;
        name: string | null;
        orgId: string | null;
        slug: string | null;
    };
    tenant: {
        productsCount: number;
        sampleProducts: Array<{ id: string; name: string; price: number }>;
    };
    alleaves: {
        connected: boolean;
        error: string | null;
        customersCount: number | null;
        productsCount: number | null;
    };
    issues: string[];
    recommendations: string[];
}

export async function GET(request: NextRequest) {
    const result: DiagnosticResult = {
        timestamp: new Date().toISOString(),
        user: {
            uid: '',
            email: '',
            role: '',
            orgId: null,
            currentOrgId: null,
            brandId: null,
            locationId: null,
            customClaims: {},
        },
        location: {
            found: false,
            docId: null,
            orgId: null,
            brandId: null,
            name: null,
            posConfig: null,
        },
        brand: {
            found: false,
            docId: null,
            name: null,
            orgId: null,
            slug: null,
        },
        tenant: {
            productsCount: 0,
            sampleProducts: [],
        },
        alleaves: {
            connected: false,
            error: null,
            customersCount: null,
            productsCount: null,
        },
        issues: [],
        recommendations: [],
    };

    try {
        // 1. Get current user
        const user = await requireUser(['dispensary', 'brand', 'super_user']);

        result.user = {
            uid: user.uid,
            email: user.email || '',
            role: (user.role as string) || '',
            orgId: (user as any).orgId || null,
            currentOrgId: user.currentOrgId || null,
            brandId: user.brandId || null,
            locationId: user.locationId || null,
            customClaims: {
                role: user.role,
                orgId: (user as any).orgId,
                currentOrgId: user.currentOrgId,
                brandId: user.brandId,
                locationId: user.locationId,
                approvalStatus: user.approvalStatus,
                planId: (user as any).planId,
            },
        };

        // Determine the effective orgId
        const effectiveOrgId = (user as any).orgId || user.currentOrgId || user.locationId || user.brandId;

        if (!effectiveOrgId) {
            result.issues.push('No orgId found in user claims (checked: orgId, currentOrgId, locationId, brandId)');
            result.recommendations.push('Run: npx tsx dev/fix-thrive-user-claims.ts');
            result.recommendations.push('Then LOG OUT and LOG BACK IN to refresh your auth token');
        }

        const { firestore } = await createServerClient();

        // 2. Check location document
        // Try orgId first, then brandId
        let locationSnap = await firestore.collection('locations')
            .where('orgId', '==', effectiveOrgId)
            .limit(1)
            .get();

        if (locationSnap.empty && effectiveOrgId) {
            // Fallback to brandId
            locationSnap = await firestore.collection('locations')
                .where('brandId', '==', effectiveOrgId)
                .limit(1)
                .get();

            if (!locationSnap.empty) {
                result.issues.push(`Location found by brandId but not orgId - location.orgId may not be set`);
                result.recommendations.push(`Update location document to include orgId: '${effectiveOrgId}'`);
            }
        }

        if (!locationSnap.empty) {
            const locDoc = locationSnap.docs[0];
            const locData = locDoc.data();

            result.location = {
                found: true,
                docId: locDoc.id,
                orgId: locData.orgId || null,
                brandId: locData.brandId || null,
                name: locData.name || null,
                posConfig: locData.posConfig ? {
                    provider: locData.posConfig.provider || null,
                    status: locData.posConfig.status || null,
                    hasUsername: !!locData.posConfig.username,
                    hasPassword: !!locData.posConfig.password,
                    hasPin: !!locData.posConfig.pin,
                    locationId: locData.posConfig.locationId || null,
                    storeId: locData.posConfig.storeId || null,
                } : null,
            };

            if (!locData.orgId) {
                result.issues.push('Location document missing orgId field');
            }

            // 5. Test Alleaves connection if configured
            const posConfig = locData.posConfig;
            if (posConfig && posConfig.provider === 'alleaves' && posConfig.status === 'active') {
                try {
                    const alleavesConfig: ALLeavesConfig = {
                        apiKey: posConfig.apiKey,
                        username: posConfig.username || process.env.ALLEAVES_USERNAME,
                        password: posConfig.password || process.env.ALLEAVES_PASSWORD,
                        pin: posConfig.pin || process.env.ALLEAVES_PIN,
                        storeId: posConfig.storeId,
                        locationId: posConfig.locationId || posConfig.storeId,
                        partnerId: posConfig.partnerId,
                        environment: posConfig.environment || 'production',
                    };

                    const client = new ALLeavesClient(alleavesConfig);

                    // Test customers fetch
                    const customers = await client.getAllCustomers(1, 5);
                    result.alleaves.customersCount = customers.length;

                    // Test products fetch
                    const products = await client.fetchMenu();
                    result.alleaves.productsCount = products.length;

                    result.alleaves.connected = true;
                } catch (e: any) {
                    result.alleaves.error = e.message;
                    result.issues.push(`Alleaves connection failed: ${e.message}`);
                    result.recommendations.push('Check Alleaves credentials in location.posConfig or environment variables');
                }
            } else if (!posConfig) {
                result.issues.push('No POS config found in location document');
            } else if (posConfig.provider !== 'alleaves') {
                result.issues.push(`POS provider is '${posConfig.provider}', not 'alleaves'`);
            } else if (posConfig.status !== 'active') {
                result.issues.push(`POS status is '${posConfig.status}', not 'active'`);
            }
        } else {
            result.issues.push(`No location found for orgId: ${effectiveOrgId}`);
            result.recommendations.push('Run: npx tsx dev/setup-thrive-pos-config.ts');
        }

        // 3. Check brand document
        if (effectiveOrgId) {
            // Try to find brand by ID or slug
            const brandIds = ['thrivesyracuse', 'brand_thrive_syracuse', effectiveOrgId];

            for (const brandId of brandIds) {
                const brandDoc = await firestore.collection('brands').doc(brandId).get();
                if (brandDoc.exists) {
                    const brandData = brandDoc.data()!;
                    result.brand = {
                        found: true,
                        docId: brandDoc.id,
                        name: brandData.name || null,
                        orgId: brandData.orgId || null,
                        slug: brandData.slug || null,
                    };

                    if (!brandData.orgId) {
                        result.issues.push('Brand document missing orgId field');
                        result.recommendations.push(`Update brand document to include orgId: 'org_thrive_syracuse'`);
                    }
                    break;
                }
            }

            if (!result.brand.found) {
                // Try query by slug
                const slugQuery = await firestore.collection('brands')
                    .where('slug', '==', 'thrivesyracuse')
                    .limit(1)
                    .get();

                if (!slugQuery.empty) {
                    const brandData = slugQuery.docs[0].data();
                    result.brand = {
                        found: true,
                        docId: slugQuery.docs[0].id,
                        name: brandData.name || null,
                        orgId: brandData.orgId || null,
                        slug: brandData.slug || null,
                    };
                }
            }
        }

        // 4. Check tenant products
        const tenantId = result.brand.orgId || effectiveOrgId;
        if (tenantId) {
            try {
                const productsSnap = await firestore
                    .collection('tenants')
                    .doc(tenantId)
                    .collection('publicViews')
                    .doc('products')
                    .collection('items')
                    .limit(5)
                    .get();

                result.tenant.productsCount = productsSnap.size;
                result.tenant.sampleProducts = productsSnap.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        name: data.name || 'Unknown',
                        price: data.price || 0,
                    };
                });

                // Get actual count
                const countSnap = await firestore
                    .collection('tenants')
                    .doc(tenantId)
                    .collection('publicViews')
                    .doc('products')
                    .collection('items')
                    .count()
                    .get();

                result.tenant.productsCount = countSnap.data().count;

                if (result.tenant.productsCount === 0) {
                    result.issues.push(`No products found in tenant catalog: tenants/${tenantId}/publicViews/products/items`);
                    result.recommendations.push('Run a POS sync to populate products');
                }
            } catch (e: any) {
                result.issues.push(`Failed to query tenant products: ${e.message}`);
            }
        }

        // Add summary recommendations
        if (result.issues.length === 0) {
            result.recommendations.push('All checks passed! If still seeing issues, try logging out and back in.');
        }

        return NextResponse.json(result, { status: 200 });

    } catch (error: any) {
        result.issues.push(`Diagnostic failed: ${error.message}`);
        return NextResponse.json(result, { status: 500 });
    }
}
