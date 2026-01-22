import { NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * DEV ONLY: POST /api/dev/seed-test-pages
 *
 * Creates seed pages for testing in ZIPs 48201 (Detroit) and 60605 (Chicago)
 *
 * SECURITY: Blocked in production and requires Super User authentication.
 */
export async function POST() {
    // SECURITY: Block in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Dev route disabled in production' },
            { status: 403 }
        );
    }

    // SECURITY: Require Super User authentication
    try {
        await requireSuperUser();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { firestore } = await createServerClient();
        const configRef = firestore.collection('foot_traffic').doc('config');

        const now = new Date();

        // ============ ZIP Pages ============
        const zipPages = [
            {
                id: 'zip_48201',
                data: {
                    zipCode: '48201',
                    city: 'Detroit',
                    state: 'MI',
                    dispensaryCount: 5,
                    brandCount: 12,
                    createdAt: now,
                    updatedAt: now
                }
            },
            {
                id: 'zip_60605',
                data: {
                    zipCode: '60605',
                    city: 'Chicago',
                    state: 'IL',
                    dispensaryCount: 8,
                    brandCount: 20,
                    createdAt: now,
                    updatedAt: now
                }
            }
        ];

        // ============ Dispensary Pages ============
        const dispensaryPages = [
            // Detroit
            {
                id: 'house-of-dank-detroit',
                data: {
                    dispensaryName: 'House of Dank',
                    dispensarySlug: 'house-of-dank-detroit',
                    name: 'House of Dank', // Also set name for backward compatibility
                    city: 'Detroit',
                    state: 'MI',
                    zipCode: '48201',
                    address: '2048 E 8 Mile Rd',
                    lat: 42.4492,
                    lng: -83.0871,
                    featured: true,
                    published: true,
                    metrics: { pageViews: 120, ctaClicks: 15 },
                    createdAt: now,
                    updatedAt: now
                }
            },
            {
                id: 'greenhouse-detroit',
                data: {
                    dispensaryName: 'Greenhouse of Walled Lake',
                    dispensarySlug: 'greenhouse-detroit',
                    name: 'Greenhouse of Walled Lake',
                    city: 'Detroit',
                    state: 'MI',
                    zipCode: '48201',
                    address: '103 E Walled Lake Dr',
                    lat: 42.5376,
                    lng: -83.4811,
                    featured: false,
                    published: true,
                    metrics: { pageViews: 45, ctaClicks: 5 },
                    createdAt: now,
                    updatedAt: now
                }
            },
            // Chicago
            {
                id: 'sunnyside-chicago',
                data: {
                    dispensaryName: 'Sunnyside Cannabis',
                    dispensarySlug: 'sunnyside-chicago',
                    name: 'Sunnyside Cannabis',
                    city: 'Chicago',
                    state: 'IL',
                    zipCode: '60605',
                    address: '436 N Clark St',
                    lat: 41.8907,
                    lng: -87.6312,
                    featured: true,
                    published: true,
                    metrics: { pageViews: 200, ctaClicks: 25 },
                    createdAt: now,
                    updatedAt: now
                }
            },
            {
                id: 'dispensary-33-chicago',
                data: {
                    dispensaryName: 'Dispensary 33',
                    dispensarySlug: 'dispensary-33-chicago',
                    name: 'Dispensary 33',
                    city: 'Chicago',
                    state: 'IL',
                    zipCode: '60605',
                    address: '5001 N Clark St',
                    lat: 41.9732,
                    lng: -87.6684,
                    featured: false,
                    published: true,
                    metrics: { pageViews: 85, ctaClicks: 10 },
                    createdAt: now,
                    updatedAt: now
                }
            }
        ];

        // ============ Brand Pages ============
        const brandPages = [
            // Multi-state brands
            {
                id: 'cookies',
                data: {
                    brandName: 'Cookies',
                    brandSlug: 'cookies',
                    cities: ['Detroit, MI', 'Chicago, IL', 'Los Angeles, CA', 'Denver, CO'],
                    city: 'Detroit',
                    state: 'MI',
                    zipCodes: ['48201', '48202'],
                    ctaType: 'order_online',
                    ctaUrl: 'https://cookies.co',
                    published: true,
                    priority: 10,
                    metrics: { pageViews: 500, ctaClicks: 45, claimAttempts: 2 },
                    createdAt: now,
                    updatedAt: now
                }
            },
            {
                id: 'stiiizy',
                data: {
                    brandName: 'STIIIZY',
                    brandSlug: 'stiiizy',
                    cities: ['Detroit, MI', 'Chicago, IL', 'San Francisco, CA'],
                    city: 'Chicago',
                    state: 'IL',
                    zipCodes: ['60605', '60606'],
                    ctaType: 'view_products',
                    ctaUrl: 'https://stiiizy.com',
                    published: true,
                    priority: 9,
                    metrics: { pageViews: 350, ctaClicks: 30, claimAttempts: 1 },
                    createdAt: now,
                    updatedAt: now
                }
            },
            // Regional brands
            {
                id: 'pleasantrees',
                data: {
                    brandName: 'Pleasantrees',
                    brandSlug: 'pleasantrees',
                    cities: ['Detroit, MI', 'Ann Arbor, MI'],
                    city: 'Detroit',
                    state: 'MI',
                    zipCodes: ['48201'],
                    ctaType: 'in_store_pickup',
                    ctaUrl: 'https://pleasantrees.com',
                    published: false,
                    priority: 5,
                    metrics: { pageViews: 75, ctaClicks: 10, claimAttempts: 0 },
                    createdAt: now,
                    updatedAt: now
                }
            },
            {
                id: 'cresco-labs',
                data: {
                    brandName: 'Cresco Labs',
                    brandSlug: 'cresco-labs',
                    cities: ['Chicago, IL', 'Springfield, IL'],
                    city: 'Chicago',
                    state: 'IL',
                    zipCodes: ['60605'],
                    ctaType: 'learn_more',
                    ctaUrl: 'https://crescolabs.com',
                    published: true,
                    priority: 7,
                    metrics: { pageViews: 120, ctaClicks: 15, claimAttempts: 0 },
                    createdAt: now,
                    updatedAt: now
                }
            }
        ];

        // ============ City Pages ============
        const cityPages = [
            {
                id: 'detroit-mi',
                data: {
                    name: 'Detroit',
                    state: 'MI',
                    slug: 'detroit-mi',
                    dispensaryCount: 45,
                    topBrands: ['Cookies', 'STIIIZY', 'Pleasantrees'],
                    createdAt: now,
                    updatedAt: now
                }
            },
            {
                id: 'chicago-il',
                data: {
                    name: 'Chicago',
                    state: 'IL',
                    slug: 'chicago-il',
                    dispensaryCount: 55,
                    topBrands: ['Cookies', 'STIIIZY', 'Cresco Labs'],
                    createdAt: now,
                    updatedAt: now
                }
            }
        ];

        // ============ State Pages ============
        const statePages = [
            {
                id: 'michigan',
                data: {
                    name: 'Michigan',
                    abbreviation: 'MI',
                    slug: 'michigan',
                    dispensaryCount: 500,
                    cityCount: 45,
                    legalStatus: 'recreational',
                    createdAt: now,
                    updatedAt: now
                }
            },
            {
                id: 'illinois',
                data: {
                    name: 'Illinois',
                    abbreviation: 'IL',
                    slug: 'illinois',
                    dispensaryCount: 200,
                    cityCount: 30,
                    legalStatus: 'recreational',
                    createdAt: now,
                    updatedAt: now
                }
            }
        ];

        // Write all pages
        const batch = firestore.batch();

        for (const page of zipPages) {
            batch.set(configRef.collection('zip_pages').doc(page.id), page.data);
        }
        for (const page of dispensaryPages) {
            batch.set(configRef.collection('dispensary_pages').doc(page.id), page.data);
            // ALSO write to retailers collection so /dispensaries/[slug] pages work
            batch.set(firestore.collection('retailers').doc(page.id), {
                ...page.data,
                id: page.id,
                type: 'dispensary',
                zip: page.data.zipCode, // Match expected field names
            });
        }
        for (const page of brandPages) {
            batch.set(configRef.collection('brand_pages').doc(page.id), page.data);
        }
        for (const page of cityPages) {
            batch.set(configRef.collection('city_pages').doc(page.id), page.data);
        }
        for (const page of statePages) {
            batch.set(configRef.collection('state_pages').doc(page.id), page.data);
        }

        await batch.commit();

        return NextResponse.json({
            success: true,
            created: {
                zipPages: zipPages.length,
                dispensaryPages: dispensaryPages.length,
                brandPages: brandPages.length,
                cityPages: cityPages.length,
                statePages: statePages.length
            }
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error('Error seeding pages', { error: message });
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
